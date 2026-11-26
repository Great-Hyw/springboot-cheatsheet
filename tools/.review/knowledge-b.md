
### config-priority | 配置优先级：properties、环境变量、命令行谁说了算 | boot
summary: 配置后加入的覆盖先加入的；profile 再叠一层，命令行和环境变量的优先级很高。
tags: ["配置优先级","Profile","application.properties"]
sources: https://docs.spring.io/spring-boot/3.5/reference/features/external-config.html , https://docs.spring.io/spring-boot/3.5/reference/features/profiles.html
---content---
配置来源很多：application.properties、YAML、环境变量、命令行参数、测试注解……它们打架时谁赢？规则其实只有一句话。

## 一句话规则

后加入的覆盖先加入的。Boot 按固定顺序把各种属性源放进 `Environment`，越靠后优先级越高。同一个 key 出现在多处时，后面的值生效。

所以排查"配置怎么不生效"，本质就是看这个 key 被哪些来源写入了、谁排在最后。Boot 并没有"合并"这些值，而是按优先级取第一个命中的来源。

## 从低到高的大致顺序

1. jar 包里的 `application.properties` / `application.yml`；
2. jar 外面的 `application.properties`（比如同级目录或 `config/` 子目录）；
3. 操作系统环境变量；
4. Java 系统属性（`-Dkey=value`）；
5. 命令行参数（`--server.port=8081`）；
6. 测试里的 `properties` 属性、`@TestPropertySource` 等。

同一位置下，`.properties` 的优先级高于 `.yml`；而 `application-{profile}.properties` 一定覆盖 `application.properties`。配置文件内部的顺序则是：jar 内 < jar 外，非 profile < profile 专属。

顺序记不住也没关系，记住直觉就行：越"临时"、越"靠近运行现场"的来源优先级越高。改代码里的配置最不灵活，命令行参数最灵活，所以命令行排在前面。

## Profile：按环境叠一层

`spring.profiles.active=dev` 激活 dev 环境，Boot 会额外加载 `application-dev.properties`。用 `@Profile("dev")` 还能让某个 Bean 只在指定环境注册。

Profile 可以分组，省得每次写一长串：

```properties
spring.profiles.group.production=proddb,prodmq
```

这样写 `spring.profiles.active=production`，就等价于同时激活 proddb 和 prodmq 两个 profile。分组定义只能写在非 profile 专属的配置文件里，否则会失效。

## 常见踩坑

- 环境变量名要转成下划线加全大写：`server.port` 对应 `SERVER_PORT`。
- 命令行参数优先级很高，排查线上问题先看看启动命令里有没有多写一个 `--key`。
- 想让运维改配置，把 `application.properties` 放在 jar 同级目录或 `config/` 子目录，比重新打包省事得多。
- 配置值里有特殊字符（比如 `#`、`:`）时，记得按需加引号，否则可能被当成注释或分隔符。
- YAML 里缩进错了不会报错，只会"这个配置好像没生效"，写完建议看一眼解析结果。
- 排查顺序建议：先看启动日志里打印的配置文件位置，确认到底哪几份文件被读到了，再对着优先级表找"谁覆盖了谁"。盲改配置文件往往越改越乱。

最后提醒一句：profile 只是"把不同环境的配置分开"，不是安全机制。密码这类敏感信息不要直接提交到仓库，用环境变量或配置中心的加密能力。

### interceptor-filter-aop | 过滤器、拦截器、AOP 到底该用哪个 | web
summary: 过滤器在 Servlet 最外层，拦截器在 Spring MVC 中间，AOP 在方法调用处，按位置选。
tags: ["过滤器","拦截器","AOP"]
sources: https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-config/interceptors.html , https://docs.spring.io/spring-framework/reference/web/webmvc/filters.html , https://docs.spring.io/spring-boot/3.5/reference/features/aop.html
---content---
过滤器、拦截器、AOP 三个词都像"拦截"，但位置和粒度完全不同。先记一句话：过滤器在最外层（Servlet 容器），拦截器在中间（Spring MVC），AOP 在方法调用处（Spring 容器里的 Bean）。按需求选就行。

## 过滤器：最外层，拿到最原始的请求

过滤器是 Servlet 规范的东西，实现 `jakarta.servlet.Filter`。它包住整个请求，连静态资源、404、别的框架的 Servlet 都会经过它，适合做编码、跨域、请求日志、最前置的鉴权。在 Boot 里把 Filter 声明成 Bean，就会被自动注册。

```java
@Component
public class ReqLogFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        long start = System.currentTimeMillis();
        chain.doFilter(request, response);
        log.info("{} {} 用时 {}ms", request.getMethod(),
                request.getRequestURI(), System.currentTimeMillis() - start);
    }
}
```

用 `OncePerRequestFilter` 的好处是：一次请求只执行一次，转发、异步分派时不会重复。过滤器的缺点是它只知道"有个请求进来了"，不知道这个请求最终会落到哪个 Controller 方法上。

## 拦截器：知道你要进哪个 Controller 方法

拦截器属于 Spring MVC，通过 `WebMvcConfigurer.addInterceptors` 注册，分 `preHandle`、`postHandle`、`afterCompletion` 三个点。它拿得到 `HandlerMethod`，也就是"即将执行哪个类的哪个方法"，适合登录校验、权限注解、接口耗时统计。

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new LoginInterceptor())
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/login");
    }
}
```

`preHandle` 返回 false 就中断后续处理，适合做"没登录直接拦下"。`afterCompletion` 无论成功失败都会执行，适合清理 ThreadLocal、记录耗时。

注意：官方文档明确说拦截器不适合当安全边界，因为路径匹配和注解控制器的匹配方式可能对不上。真正鉴权建议用 Spring Security 或 Servlet 过滤器链，越早越好。

## AOP：按方法切，不限于 Web

AOP 切的是 Spring Bean 的方法调用，Controller、Service、定时任务都能切，适合事务、日志、埋点这类横切逻辑。

```java
@Aspect
@Component
public class CostAspect {
    @Around("@annotation(cost)")
    public Object around(ProceedingJoinPoint pjp, Cost cost) throws Throwable {
        long start = System.nanoTime();
        try {
            return pjp.proceed();
        } finally {
            System.out.println((System.nanoTime() - start) / 1_000_000 + "ms");
        }
    }
}
```

只要类路径上有 AspectJ（通常加 `spring-boot-starter-aop`），Boot 的自动配置会开启自动代理，不用再手写 `@EnableAspectJAutoProxy`。默认用 CGLib 代理；想换 JDK 代理可以设 `spring.aop.proxy-target-class=false`。也因为是代理，同一个类里"自己调自己"不会走切面。

## 怎么选

| 需求 | 选它 |
| --- | --- |
| 改编码、跨域、最前置的鉴权 | 过滤器 |
| 按 URL 做登录校验、接口计时 | 拦截器 |
| 按方法做事务、日志、埋点 | AOP |

写环绕通知时还有个新手坑：方法签名里要引入 `ProceedingJoinPoint`，并且必须调用 `proceed()`，否则原方法根本不会执行，表现为"业务逻辑莫名其妙没了"。

一句话总结：能改请求本身用过滤器，需要知道 Controller 方法用拦截器，只想管方法调用用 AOP。实际项目里三者经常一起用：过滤器处理编码和 CORS，拦截器做登录态校验，AOP 记业务日志，各管一段，互不越界。

### packaging-deploy | 打包部署：可执行 jar 和 war 怎么选 | engineering
summary: 可执行 jar 内置依赖和启动清单，java -jar 即可跑；只有外部容器场景才用 war。
tags: ["打包","可执行 jar","war"]
sources: https://docs.spring.io/spring-boot/3.5/maven-plugin/packaging.html , https://docs.spring.io/spring-boot/3.5/how-to/deployment/traditional-deployment.html , https://docs.spring.io/spring-boot/3.5/reference/web/graceful-shutdown.html
---content---
写完代码总要部署。现在的默认答案是：打成一个可执行 jar，`java -jar` 就跑。war 只在必须丢进外部容器时才用。

## 可执行 jar：推荐默认做法

加插件、执行打包，就得到一个包含所有依赖、可以直接运行的 jar：

```xml
<plugin>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-maven-plugin</artifactId>
</plugin>
```

```bash
mvn clean package
java -jar target/demo-0.0.1-SNAPSHOT.jar
```

插件里的 `repackage` 目标会重写 jar，把依赖和启动类信息打进去。直接运行 `mvn spring-boot:repackage` 不够，因为 jar 还没生成；正确姿势是先 `mvn package`，或者用 parent 里已经绑好的生命周期。打包后你会发现多了一个 `.original` 文件，那就是重写之前的原始 jar，出问题可以对照看。

jar 里的清单（MANIFEST）有两项关键信息：`Main-Class` 是 Boot 自己的启动器，`Start-Class` 才是你的 `main` 方法所在类。排查"jar 跑不起来"时先看这两行。

## jar 和 war 怎么选

| 场景 | 选择 |
| --- | --- |
| 常规微服务、容器部署 | 可执行 jar |
| 公司有统一的 Tomcat/WebLogic，必须丢 war | war |
| 需求把配置和代码分离到容器目录 | jar 也能做到，未必要 war |

war 的写法要改两处：`pom.xml` 里 `packaging` 改成 `war`，启动类继承 `SpringBootServletInitializer` 并覆写 `configure`。之外还要把内嵌容器依赖标记成 `provided`，否则和外部容器里的类打架。

注意：WebFlux 应用不支持打成 war，这是响应式栈的限制，只能跑 jar 或独立部署。

## 部署时的实用配置

Boot 3.5 默认已开启优雅停机：收到停止信号后先不放新请求进来，等手上的请求处理完再退出。等待上限默认 20 秒，可以调：

```properties
spring.lifecycle.timeout-per-shutdown-phase=30s
```

不建议关掉。Kubernetes 滚动发布时，正是靠它避免"请求打到正在退出的实例上"。如果确实要立刻停，再设 `server.shutdown=immediate`。

打包时记得跳过测试或者至少跑通测试再发：`mvn clean package -DskipTests` 适合本地快速验证，流水线里不要这么干。配置文件、启动参数和端口这些和环境相关的信息，尽量从外部传，不要把生产密码打进 jar。

## 几个容易踩的点

- 端口被占用：先看是不是上一个实例没退干净，再改 `server.port`。
- 时区不对：容器里默认 UTC 很常见，日志和定时任务都会差 8 小时，显式指定时区。
- 内存参数：`java -jar` 不会自动限制堆大小，容器里建议用 `-XX:MaxRAMPercentage=75` 这类参数。
- 日志落在容器里：容器重建就丢，生产上把日志输出到标准输出，交给平台收集。
- 打包后类找不到：多半是 `provided` 标记用错，或者依赖被 exclude 掉了，用 `mvn dependency:tree` 看依赖树。

记住一句话：可执行 jar 的优点是"一个文件带走所有东西"，代价是每次改依赖都要重新打包。部署方式跟着团队的基础设施走，不要为了炫技硬上。

### logging-config | 日志配置：从 logging.level 到 logback-spring.xml | engineering
summary: 默认 Logback 只打控制台；改级别、写文件用属性，按 profile 切换才需要自己写 xml。
tags: ["日志","Logback","配置文件"]
sources: https://docs.spring.io/spring-boot/3.5/reference/features/logging.html
---content---
日志是最便宜的排查工具，也是最容易被忽略的配置。Spring Boot 的默认日志已经够用，大多数需求用属性就能解决，只有"按环境切换格式"这类才需要自己写 xml。

## 默认长什么样

只要用了任何 starter，日志默认就是 Logback，输出到控制台，级别 INFO。所以你会看到启动横幅、Tomcat 端口、Spring 的启动日志，但看不到 DEBUG。

默认格式里包含时间、级别、线程名、logger 名和消息。开发时够用，上线后一般要改成 JSON 或者带链路 ID 的格式，方便日志平台检索。格式可以用 `logging.pattern.console` 和 `logging.pattern.file` 调整，比如把 traceId 拼进去，但字段别堆太多，日志本身的写入开销也要算成本。

## 调级别和写文件

最常用的两个属性：

```properties
logging.level.root=INFO
logging.level.com.example.order=DEBUG
logging.file.name=logs/app.log
```

第一行管全局，第二行只对指定包生效，粒度可以细到某个类。级别从低到高是 TRACE、DEBUG、INFO、WARN、ERROR、FATAL、OFF，设成 OFF 就是彻底关掉。线上排查临时打开某个包的 DEBUG，改完记得调回去，不然日志量会翻好几倍。

写文件有两种写法：`logging.file.name` 指定完整路径，`logging.file.path` 只指定目录（文件名固定为 `spring.log`）。两个都写时 `logging.file.path` 会被忽略，别同时配。

## 按环境切换：logback-spring.xml

如果只是想改级别、加个文件输出，属性就够了。但要做"开发环境彩色控制台、生产环境 JSON 文件"，就得自己写配置。文件名建议用 `logback-spring.xml`，不要用 `logback.xml`：

- `logback.xml` 加载得太早，里面的 Spring 扩展标签（比如 `<springProfile>`）不会被识别，会看到 "no applicable action for [springProfile]" 这类提示；
- `logback-spring.xml` 由 Boot 接管，才支持按 profile 切换。

```xml
<configuration>
  <springProfile name="dev">
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender"/>
  </springProfile>
  <springProfile name="prod">
    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender"/>
  </springProfile>
</configuration>
```

自己写了 xml 之后，属性里的 `logging.file.*` 就不再起作用，两套机制不要混用，否则会出现"配了没反应"。

## 滚动和排错

日志文件必须滚动，否则迟早把磁盘写满。Boot 对 Logback 提供了几个现成属性：

```properties
logging.logback.rollingpolicy.max-file-size=100MB
logging.logback.rollingpolicy.max-history=30
logging.logback.rollingpolicy.total-size-cap=5GB
```

第一个是单文件上限，第二个保留多少天，第三个是总量上限。三个一起设比较稳。

排查"我的日志不输出"，按这个顺序看：包名写对没有、级别有没有被更具体的配置覆盖、日志是不是写进了文件而你在看控制台、以及有没有被 `logback-spring.xml` 里的规则过滤掉。日志配置的问题基本都是"生效顺序"问题，先确认哪份配置在起作用，比逐行读 xml 快。

### actuator-monitoring | Actuator：线上怎么看应用是否健康 | boot
summary: 加 starter 就有 /actuator/health，默认只暴露 health，其余端点按需开启并做好鉴权。
tags: ["Actuator","健康检查","监控"]
sources: https://docs.spring.io/spring-boot/3.5/reference/actuator/enabling.html , https://docs.spring.io/spring-boot/3.5/reference/actuator/endpoints.html
---content---
上线之后最怕两件事：服务挂了没人知道，或者以为活着其实已经不能干活。Actuator 就是 Spring Boot 自带的"体检和仪表盘"，加个依赖就能用。

## 加依赖就有 health

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

启动后访问 `http://localhost:8080/actuator/health`，会返回一个 JSON：`{"status":"UP"}`。这是它默认唯一通过 HTTP 暴露的端点，因为健康检查最常用，也最不敏感。

默认的健康检查包括数据库、磁盘空间、Redis 等组件（取决于你引入了什么）。任何一个关键组件 DOWN，整体状态就会变成 DOWN。这个语义要清楚：它回答的是"应用还能不能正常干活"，不是"进程还在不在"。

## 暴露更多端点

Actuator 有一批端点：`health`（健康）、`info`（信息）、`metrics`（指标）、`env`（环境属性）、`loggers`（日志级别）、`beans`（Bean 列表）、`mappings`（请求映射）、`threaddump`（线程栈）等。默认只开 health，其余要显式打开：

```properties
management.endpoints.web.exposure.include=health,info,metrics,loggers
```

要看全部就写 `*`。反过来，用 `exclude` 可以排除，而且排除的优先级高于包含——即使写了 `*`，被 exclude 的也不会暴露。

`loggers` 端点很实用：线上不用重启就能临时把某个包的日志级别调到 DEBUG，排查完再调回来。`threaddump` 在 CPU 飙高时能直接看到线程都在干什么。

## health 端点怎么用

默认的健康详情只返回 UP/DOWN，看不到具体哪个组件挂了。需要排查时打开详情：

```properties
management.endpoint.health.show-details=always
```

可选值是 `never`、`when-authorized`、`always`，默认 `never`。`always` 会把数据库连接、磁盘路径这些信息也吐出来，所以只适合内网或调试环境，生产上更推荐 `when-authorized` 配合权限。

Kubernetes 场景下，健康检查还要分存活和就绪：存活探针问"要不要重启你"，就绪探针问"能不能接流量"。Actuator 已经提供了对应的两个路径 `/actuator/health/liveness` 和 `/actuator/health/readiness`，探针直接指过去就行，不用自己写 Controller。

还可以把若干检查组合成健康分组，比如只把数据库放进 `db` 组，让监控单独看：

```properties
management.endpoint.health.group.db.include=db
```

## 上线前必须做的一件事

Actuator 的端点信息量很大：`env` 能看到配置（可能含密码），`heapdump` 能导出内存快照，`threaddump` 能看到全部线程。这些绝不能裸奔在公网。

三件事至少做一件：只暴露必要端点；用 Spring Security 给 `/actuator/**` 加鉴权；或者把管理端口单独开到内网端口上。官方文档专门提醒过不要不加防护地暴露敏感端点，这不是危言耸听，是真实发生过的事故。

最后，想接 Prometheus 监控指标，需要额外加 `micrometer-registry-prometheus` 依赖，然后暴露 `prometheus` 端点，让采集器来抓。做完这一步，才算从"能看健康"升级到"能看趋势、能配告警"。

### version-migration | Spring Boot 2→3→4 升级要过哪三关 | migration
summary: Boot 3 要 Java 17 并迁到 jakarta 命名空间，Boot 4 要 Spring Framework 7 与 Servlet 6.1。
tags: ["版本升级","jakarta","Spring Boot 4"]
sources: https://docs.spring.io/spring-boot/3.5/system-requirements.html , https://docs.spring.io/spring-framework/reference/overview.html , https://docs.spring.io/spring-boot/4.0/system-requirements.html
---content---
Spring Boot 从 2 升到 4，不是换个版本号的事。中间经历了两次大版本，踩的坑集中在三关：Java 基线、命名空间、以及框架大版本。提前知道每一关要动什么，升级就不会变成通宵。

## 三关是什么

1. Java 和框架基线：Boot 3 起步就要 Java 17，Boot 4 又把 Spring Framework 拉到 7；
2. 命名空间迁移：`javax.*` 全部换成 `jakarta.*`，这是改动量最大的一关；
3. 依赖与测试 API 跟进：Servlet 容器、测试注解、第三方库都要跟着升。

顺序不能乱。先把 JDK 和编译级别升上去，再处理包名，最后才是升级 Boot 版本本身。

## 第一关：Java 版本和框架基线

Boot 3.5 的系统要求很明确：Java 17 起步（可兼容到 Java 25），Spring Framework 6.2 以上。Boot 4.0 的要求是 Java 17 起步（可兼容到 Java 27），Spring Framework 7.0 以上。

所以第一步不是改 Boot 版本，而是确认 JDK。项目如果还停在 Java 8 或 11，先升 JDK，把编译和测试跑通，再谈后面两步。很多"升级后各种报错"的根源其实在 JDK 层面，只是被 Boot 的报错挡住了。

## 第二关：javax 换成 jakarta

这是升级 Boot 3 绕不开的硬迁移。Spring Framework 官方文档写得很清楚：从 6.0 开始升级到 Jakarta EE 9 级别（Servlet 5.0+、JPA 3.0+），"based on the jakarta namespace instead of the javax namespace"。

落到代码上就是大量 import 替换：

```java
// 旧
import javax.servlet.http.HttpServletRequest;
import javax.persistence.Entity;
// 新
import jakarta.servlet.http.HttpServletRequest;
import jakarta.persistence.Entity;
```

推荐做法是全局搜索 `javax.` 和 `javax.servlet`，逐个确认是不是 Jakarta 相关的包。注意有些 `javax` 包属于 JDK 本身（比如 `javax.crypto`、`javax.sql`），这些不能换，换错了编译不过。依赖也要同步：Servlet API、JPA、Validation、注解库都要换成 Jakarta 版本，尤其是公司内部的老 jar。

Servlet 容器也变了：Boot 3.5 默认内嵌 Tomcat 10.1（Servlet 6.0），Boot 4 升到 Tomcat 11（Servlet 6.1）。如果还要部署到外部容器，容器版本必须跟得上。

## 第三关：Boot 4 和升级节奏

Boot 4 基于 Spring Framework 7，Servlet 6.1，要求 Tomcat 11 这一代容器。也就是说，前面的 JDK 17 和 jakarta 迁移都得先完成，Boot 4 只是最后一步。

升级前有一个很实用的官方工具：把 `spring-boot-properties-migrator` 加进依赖（runtime 范围），启动时会打印出哪些配置项被改名或废弃，甚至临时帮你兼容旧名字。升级完成后记得把它删掉，它只适合过渡期使用。

测试代码也别忘了：旧文档里的 `@MockBean` 已经由 `@MockitoBean` 取代，Boot 3.5 和 4.0 的文档里都只写新注解了。翻测试类时顺手一起改。

实际节奏建议：分两个大 PR。第一个只升 JDK 和做 javax→jakarta（配 Boot 3.x），跑通全量测试；第二个再升 Boot 4 并修依赖。混在一起做，出了问题根本分不清是哪一步引入的。

最后一句话：升级的本质是"按依赖顺序往上抬"，不是"改到不报错为止"。每关都留一次可回滚的提交，比什么技巧都管用。
