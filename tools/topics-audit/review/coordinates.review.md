# coordinates

================================================================================
ID: coordinates-web | Web 与参数校验依赖怎么引 | level=入门 | readingMinutes=4
SUMMARY: 讲清 Web、校验、接口文档和 devtools 该引哪个 starter，版本交给谁管
TAGS: ["Web","参数校验","springdoc","devtools"]
SOURCES: [{"label":"Spring Boot 参考文档：Web（Servlet）","url":"https://docs.spring.io/spring-boot/reference/web/servlet.html"},{"label":"Spring Boot 参考文档：Validation","url":"https://docs.spring.io/spring-boot/reference/io/validation.html"},{"label":"springdoc-openapi 项目主页","url":"https://github.com/springdoc/springdoc-openapi"}]
COORDINATES: [{"groupId":"org.springframework.boot","artifactId":"spring-boot-starter-web","version":null,"managed":true,"scope":null,"usage":"写 REST 接口、内嵌 Tomcat、Jackson 序列化"},{"groupId":"org.springframework.boot","artifactId":"spring-boot-starter-validation","version":null,"managed":true,"scope":null,"usage":"参数校验（Bean Validation 规范）"},{"groupId":"org.springdoc","artifactId":"springdoc-openapi-starter-webmvc-ui","version":"2.8.17","managed":false,"scope":null,"usage":"生成 OpenAPI 文档并提供 Swagger UI 页面"},{"groupId":"org.springframework.boot","artifactId":"spring-boot-devtools","version":null,"managed":true,"scope":null,"usage":"开发期热重启、关闭模板缓存"},{"groupId":"org.springframework.boot","artifactId":"spring-boot-starter-webflux","version":null,"managed":true,"scope":null,"usage":"用 WebClient 调第三方 HTTP 接口"}]

## 什么时候用

做 Spring Boot 的 Web 服务，第一件事就是选对 starter。写 REST 接口、返回 JSON、用内嵌 Tomcat，引 `spring-boot-starter-web` 就够了，它已经把 Spring MVC、Jackson 和内嵌容器带了进来。

请求参数要 `@NotNull`、`@Size` 这类校验时，再单独加 `spring-boot-starter-validation`。从 Boot 2.3 起它不再被 web starter 传递引入，不加就不会触发校验。要给前端或第三方提供 OpenAPI 文档和 Swagger 页面，加 springdoc 的 starter；开发期想改完代码自动重启，再加 devtools。要用 WebClient 调第三方接口又不想引入整套响应式栈，可以引 `spring-boot-starter-webflux`。

## 坐标清单

| 依赖 | 用途 | 版本 |
| --- | --- | --- |
| `spring-boot-starter-web` | MVC、内嵌 Tomcat、Jackson 序列化 | BOM 管理 |
| `spring-boot-starter-validation` | Bean Validation 参数校验 | BOM 管理 |
| `springdoc-openapi-starter-webmvc-ui` | 生成 OpenAPI 文档与 Swagger UI | 2.8.17 |
| `spring-boot-devtools` | 开发期热重启、关闭模板缓存 | BOM 管理 |
| `spring-boot-starter-webflux` | 提供 WebClient，调用外部 HTTP 接口 | BOM 管理 |

带 starter 的组都由 Spring Boot BOM 管版本，`pom.xml` 里不要写 `version`；springdoc 不在 Boot BOM 里，必须自己写版本，2.8.x 对应 Boot 3.x 线。

## 配置与坑

```yaml
spring:
  jackson:
    default-property-inclusion: non_null
  mvc:
    problemdetails:
      enabled: true
springdoc:
  api-docs:
    path: /v3/api-docs
  swagger-ui:
    path: /swagger-ui.html
```

- validation starter 必须单独引，只引 web starter 时 `@Valid` 不会触发校验，接口照样返回 200。
- 想让 WebClient 和 MVC 共存就同时引 web 与 webflux，Boot 会按 MVC 启动；只引 webflux 时应用会按响应式 Web 应用启动，别引错栈。
- web starter 已经带了 Jackson，不要再单独引 `jackson-databind` 并写死版本，否则会覆盖 BOM 里的版本，升级 Boot 时容易冲突。
- devtools 只在开发期有用，建议标记 optional，生产打包不要依赖它。
- springdoc 的版本要和 Boot 大版本一起升级，升级 Boot 后先确认 swagger 页面还能打开。
- 接口文档上线前把 `/v3/api-docs` 的访问权限收紧，别把内部接口顺手暴露到外网。
================================================================================
ID: coordinates-test | 测试依赖：starter-test 与 Testcontainers | level=入门 | readingMinutes=4
SUMMARY: 单元测试、切片测试、容器化集成测试分别该引哪些坐标，版本从哪来
TAGS: ["测试","JUnit","容器测试","H2"]
SOURCES: [{"label":"Spring Boot 参考文档：Testcontainers","url":"https://docs.spring.io/spring-boot/reference/testing/testcontainers.html"},{"label":"Testcontainers 官方 MySQL 模块","url":"https://testcontainers.com/modules/mysql/"},{"label":"Spring Boot 参考文档：测试 Spring Boot 应用","url":"https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html"}]
COORDINATES: [{"groupId":"org.springframework.boot","artifactId":"spring-boot-starter-test","version":null,"managed":true,"scope":"test","usage":"JUnit 5、Mockito、AssertJ、Spring Test 一次带齐"},{"groupId":"org.springframework.boot","artifactId":"spring-boot-testcontainers","version":null,"managed":true,"scope":"test","usage":"把容器连接信息自动注入 Spring 环境"},{"groupId":"org.testcontainers","artifactId":"junit-jupiter","version":null,"managed":true,"scope":"test","usage":"提供 @Testcontainers 容器生命周期管理"},{"groupId":"org.testcontainers","artifactId":"mysql","version":null,"managed":true,"scope":"test","usage":"MySQL 容器，本地和 CI 跑真实数据库"},{"groupId":"com.h2database","artifactId":"h2","version":null,"managed":true,"scope":"test","usage":"内存数据库，冒烟测试的轻量替代"}]

## 什么时候用

写测试先引 `spring-boot-starter-test`，一次带齐 JUnit 5、Mockito、AssertJ、Spring Test 和 JSON 断言。需要真数据库做集成测试时，加 Testcontainers：`spring-boot-testcontainers` 负责把容器连接信息接进 Spring 环境，`org.testcontainers:mysql` 提供 MySQL 容器，`org.testcontainers:junit-jupiter` 提供 `@Testcontainers` 生命周期。

不想在每台机器装 Docker 的项目，可以用 H2 内存库做冒烟测试，但它和 MySQL 的方言、函数差异不小，关键 SQL 还是要用真库验证。

## 坐标清单

| 依赖 | 用途 | 版本 |
| --- | --- | --- |
| `spring-boot-starter-test` | JUnit 5、Mockito、AssertJ、Spring Test | BOM 管理 |
| `spring-boot-testcontainers` | 容器连接信息自动注入 Spring 环境 | BOM 管理 |
| `org.testcontainers:junit-jupiter` | `@Testcontainers` 容器生命周期 | BOM 管理 |
| `org.testcontainers:mysql` | MySQL 容器 | BOM 管理 |
| `com.h2database:h2` | 内存数据库，轻量冒烟测试 | BOM 管理 |

Testcontainers 各模块的版本由 Boot BOM 间接引入的 testcontainers-bom 管理，`pom.xml` 里同样不要手写版本。

## 配置与坑

```java
@SpringBootTest
@Testcontainers
class OrderRepositoryIT {

    @Container
    @ServiceConnection
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4");

    @Autowired
    OrderRepository repository;

    @Test
    void savesOrder() {
        // 用真实 MySQL 跑仓库层测试
    }
}
```

- `spring-boot-starter-test` 里已经是 JUnit 5，不要再引 `junit:junit` 的 4.x，混用会出现测试不被发现。
- 容器测试要求本机或 CI 有 Docker；没 Docker 的环境用 `@Testcontainers(disabledWithoutDocker = true)` 跳过，别让流水线一直红。
- `h2` 的 scope 用 `test`，写成 `runtime` 会被打进生产包。
- `@SpringBootTest` 默认从 `@SpringBootApplication` 往上找配置类，测试不在主类包下时要显式写 `classes`。
- `@ServiceConnection` 是 Boot 3.1 起的能力，配上之后不用再手写 `@DynamicPropertySource` 搬运连接地址。
- 测试分层要控制成本：Service 层尽量用 Mockito 隔离，只有仓库层和真实 SQL 才值得起容器，容器启动慢，全用它会把流水线拖长。
- 容器镜像版本要和线上一致，本地用 `mysql:8.4`、生产是 8.0 的话，方言差异会在集成测试里被漏掉。
================================================================================
ID: coordinates-ops | 监控与运维：Actuator、指标与打包插件 | level=入门 | readingMinutes=4
SUMMARY: 健康检查、Prometheus 指标和 Boot 打包插件的最小依赖组合
TAGS: ["Actuator","Micrometer","Prometheus","打包"]
SOURCES: [{"label":"Spring Boot 参考文档：Actuator","url":"https://docs.spring.io/spring-boot/reference/actuator/index.html"},{"label":"Spring Boot 参考文档：Actuator 指标","url":"https://docs.spring.io/spring-boot/reference/actuator/metrics.html"},{"label":"Micrometer 官方文档","url":"https://micrometer.io/docs"}]
COORDINATES: [{"groupId":"org.springframework.boot","artifactId":"spring-boot-starter-actuator","version":null,"managed":true,"scope":null,"usage":"健康检查、指标、环境等运维端点"},{"groupId":"io.micrometer","artifactId":"micrometer-registry-prometheus","version":null,"managed":true,"scope":null,"usage":"把指标暴露成 Prometheus 抓取格式"},{"groupId":"org.springframework.boot","artifactId":"spring-boot-maven-plugin","version":null,"managed":true,"scope":null,"usage":"repackage 成可执行 jar、mvn spring-boot:run"},{"groupId":"io.micrometer","artifactId":"micrometer-core","version":null,"managed":true,"scope":null,"usage":"代码里用 MeterRegistry 打自定义指标"}]

## 什么时候用

上线前至少要有健康检查和指标。`spring-boot-starter-actuator` 提供 `/actuator/health`、`/actuator/metrics` 这类端点；要接 Prometheus 抓取，再加 `micrometer-registry-prometheus`，它把 Micrometer 指标暴露成 Prometheus 格式；要在代码里自己打业务指标，会用到 `micrometer-core` 的 `MeterRegistry`。

`spring-boot-maven-plugin` 是构建期插件，负责把项目 repackage 成可执行 jar，以及 `mvn spring-boot:run` 启动应用，不是运行期依赖。

## 坐标清单

| 依赖 | 用途 | 版本 |
| --- | --- | --- |
| `spring-boot-starter-actuator` | 健康检查、指标、环境等运维端点 | BOM 管理 |
| `micrometer-registry-prometheus` | 指标暴露成 Prometheus 抓取格式 | BOM 管理 |
| `spring-boot-maven-plugin` | repackage 可执行 jar、本地运行 | BOM 管理 |
| `micrometer-core` | 代码里用 MeterRegistry 自定义指标 | BOM 管理 |

Actuator 和 Micrometer 的版本都由 Boot BOM 管（Micrometer 走 BOM 里的 micrometer-bom），插件版本跟随 `spring-boot-starter-parent`，都不要手写版本。

## 配置与坑

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: when_authorized
```

- Actuator 默认只暴露 `health`，不配 `exposure.include` 就看不到 metrics 和 prometheus，不是依赖没生效。
- 暴露 `env`、`heapdump`、`threaddump` 之前先确认鉴权，内网也不等于安全。
- 不引 `micrometer-registry-prometheus`，`/actuator/prometheus` 直接 404；这个 registry 不会随 actuator 自动带上。
- 插件版本跟着 Boot 走：用 `spring-boot-starter-parent` 时自动继承，手写版本升级时会漏改。
- 数据库、Redis 的健康探针是自动装配的，但明细要 `show-details` 才展示；上 K8s 时把探针指向 health 分组，别让滚动发布被完整检查拖慢。
- 指标标签的基数要提前控制：把用户 ID、订单号这类高基数字段当标签，会让 Prometheus 的时序数量爆炸，内存很快吃满。
- 端点路径可以用 `management.endpoints.web.base-path` 改，但改完监控脚本和 K8s 探针要一起改，别只改一半。
