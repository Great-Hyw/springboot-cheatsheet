# interview

================================================================================
ID: interview-ioc-bean-lifecycle | IoC 和 Bean 生命周期怎么答？ | level=入门 | readingMinutes=3
SUMMARY: IoC 是把对象创建与依赖注入交给容器；Bean 经历实例化、注入、初始化回调、销毁回调，顺序固定。
TAGS: ["IoC","Bean 生命周期","依赖注入"]
SOURCES: [{"label":"Spring Framework 6.2 — Customizing the Nature of a Bean","url":"https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-nature.html"},{"label":"Spring Framework 6.2 — @PostConstruct and @PreDestroy","url":"https://docs.spring.io/spring-framework/reference/6.2/core/beans/annotation-config/postconstruct-and-predestroy-annotations.html"}]

## 一句话答案

IoC（控制反转）就是把「new 对象、找依赖、管生命周期」的控制权从业务代码交给 Spring 容器。Bean 的生命周期主线是：实例化 → 依赖注入 → 初始化回调 → 使用 → 销毁回调。初始化和销毁各有固定顺序：先注解（`@PostConstruct`/`@PreDestroy`），再接口（`afterPropertiesSet`/`destroy`），最后配置里指定的 init/destroy 方法。

## 展开讲

创建阶段：容器读 BeanDefinition，反射调用构造器创建对象，构造器注入的依赖在这一步传进去。正因为对象已经被完整构造出来了，构造器注入天然不支持循环依赖。

注入阶段：setter 注入、字段注入的 `@Autowired`、`@Value` 在这一步生效；同时会回调各种 Aware 接口（如 `BeanNameAware`、`ApplicationContextAware`），让 bean 拿到容器信息。

初始化阶段：`BeanPostProcessor` 的 `postProcessBeforeInitialization` → `@PostConstruct` → `afterPropertiesSet()` → 配置的 init 方法 → `BeanPostProcessor` 的 `postProcessAfterInitialization`。像事务、AOP 这些代理，通常就是在初始化阶段由 BeanPostProcessor 给原对象包一层。

销毁阶段：`@PreDestroy` → `destroy()` → 配置的 destroy 方法。只有容器管理的单例会在容器关闭时走这套；原型 bean 容器不管销毁。

```java
@Component
public class ReportService {

    private final DataSource dataSource;   // 构造器注入：对象创建时依赖就位

    public ReportService(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @PostConstruct
    void warmUp() {
        // 依赖已注入，可以预热缓存、校验配置
    }

    @PreDestroy
    void shutdown() {
        // 容器关闭时释放资源
    }
}
```

## 追问与加分点

- **为什么推荐构造器注入**：依赖可以加 `final`、不可能为空；缺依赖启动就报错，而不是运行到一半空指针；单元测试直接 new，不需要容器。
- **`@PostConstruct` 和 `InitializingBean` 的区别**：前者是 `jakarta.annotation` 的标准注解，不绑 Spring；后者是 Spring 接口，会让业务代码依赖框架。官方建议优先用注解或 `@Bean(initMethod = ...)`。
- **单例是启动时创建的吗**：默认非懒加载的单例在容器 refresh 阶段就创建并初始化完；加了 `@Lazy` 才等到第一次使用。原型 bean 是每次获取时创建。
- **BeanPostProcessor 是扩展点**：AOP 代理、`@Autowired` 注入、`@PostConstruct` 的识别都靠它。自己实现时要小心，它初始化得非常早，不要依赖普通业务 bean。
- **销毁只对单例保证**：`@PreDestroy` 在 `kill -9`、断电时不会执行；原型 bean 的销毁回调根本不会被调用。

## 别踩的坑

- 在构造器里读 `@Value` 注入的字段：字段注入发生在构造之后，这时读到的是 null，要用构造器参数接收。
- 在 `@PostConstruct` 里调用本 bean 的 `@Async`、`@Transactional` 方法：这时代理可能还没就绪，增强不生效；初始化要异步就另建一个 bean 去调。
- 以为 `@PreDestroy` 一定执行、拿它做关键的「落库」操作：进程被强杀时来不及执行。
- 把重活（远程调用、大文件加载）塞进构造器：创建失败时异常堆栈都指向 bean 初始化，难定位，放在 `@PostConstruct` 至少阶段清晰。

================================================================================
ID: interview-circular-dependency | Spring 循环依赖是怎么回事？ | level=进阶 | readingMinutes=3
SUMMARY: A、B 互相依赖时，单例可以靠三级缓存提前暴露半成品解决，构造器注入直接失败；Boot 默认禁止，应重构。
TAGS: ["循环依赖","三级缓存","Bean"]
SOURCES: [{"label":"Spring Framework 6.2 — Circular Dependencies","url":"https://docs.spring.io/spring-framework/reference/6.2/core/beans/dependencies/factory-collaborators.html"},{"label":"Spring Boot 3.5 — Common Application Properties","url":"https://docs.spring.io/spring-boot/3.5/appendix/application-properties/index.html"},{"label":"spring-framework 6.2.x — DefaultSingletonBeanRegistry 源码","url":"https://github.com/spring-projects/spring-framework/blob/6.2.x/spring-beans/src/main/java/org/springframework/beans/factory/support/DefaultSingletonBeanRegistry.java"}]

## 一句话答案

循环依赖是 A 依赖 B、B 又依赖 A。单例 + setter/字段注入时，Spring 用「三级缓存」提前暴露还没填充完属性的半成品来打破循环；构造器注入没有半成品可暴露，只能启动失败。Boot 2.6 起默认不允许循环依赖，正确做法是重构依赖关系，而不是打开开关。

## 展开讲

三级缓存都在 `DefaultSingletonBeanRegistry` 里：一级 `singletonObjects` 放成品 bean；二级 `earlySingletonObjects` 放提前暴露的半成品；三级 `singletonFactories` 放能生成早期引用的 ObjectFactory（如果这个 bean 会被 AOP 代理，工厂产出的就是代理）。

以 A、B 互相依赖为例：创建 A → 实例化后把 A 的工厂放进三级缓存 → 填充属性时发现要 B → 去创建 B → B 填充属性时发现要 A → 依次查一级、二级、三级，从三级工厂拿到 A 的早期引用（升级到二级）→ B 创建完成 → A 拿到 B 继续完成创建。

构造器注入为什么不行：调构造器之前对象还不存在，容器必须先完整创建 B，而 B 又在等 A，于是抛 `BeanCurrentlyInCreationException`。官方文档给的方案是改成 setter 注入（并说明这「不推荐但可行」），更好的方案是重新设计依赖。

Boot 3.5 的属性 `spring.main.allow-circular-references` 默认是 false，所以即使是 setter 循环，启动也会失败，需要显式打开才能让三级缓存发挥作用。临时解法是在注入点加 `@Lazy`，注入一个代理，真正用到时才去容器里取。

```java
@Service
public class OrderService {

    private final PayService payService;

    // 构造器注入形成循环：OrderService -> PayService -> OrderService，启动失败
    public OrderService(PayService payService) {
        this.payService = payService;
    }
}
```

```java
@Service
public class OrderService {

    private final PayService payService;

    public OrderService(@Lazy PayService payService) {   // 注入代理，延迟取真身
        this.payService = payService;
    }
}
```

## 追问与加分点

- **为什么三级缓存存工厂而不是实例**：提前暴露的引用可能要先经过 BeanPostProcessor 生成代理，存 ObjectFactory 可以把「要不要提前生成代理」推迟到真正发生循环时，避免所有 bean 都提前代理。
- **为什么说构造器注入能暴露设计问题**：能构造出循环依赖，通常说明两个类的职责边界不清，拆出第三个类或改成事件/回调往往更合理。
- **`@Lazy` 的原理**：注入的是延迟代理，第一次调用方法时才向容器要真实 bean，从而把「创建时机」错开。
- **prototype 循环依赖**：没有缓存可借，官方明确无法解决。
- **Boot 2.6 起默认禁止**：默认值就是 false（不允许），需要显式配成 true 才会尝试自动解析。

## 别踩的坑

- 直接把 `allow-circular-references` 打开上线：依赖关系更乱，初始化顺序不可控，还可能出现「拿到的是半成品」的问题。
- 用字段注入「绕过」循环依赖就以为解决了：循环还在，只是被隐藏了，后面加 AOP、加事务时容易炸。
- 循环依赖叠加 AOP：早期暴露的可能是原始对象而不是最终代理，导致事务、异步等增强失效。
- 把 `@Lazy` 当银弹：它只是把创建时机延后，循环依赖没消失，滥用会让启动期错误变成运行期错误。

================================================================================
ID: interview-transaction-failure | 为什么 @Transactional 会失效？ | level=进阶 | readingMinutes=3
SUMMARY: 事务靠 AOP 代理生效，自调用、不可见方法会让它失效；默认只回滚 RuntimeException 和 Error。
TAGS: ["事务","事务失效","事务传播"]
SOURCES: [{"label":"Spring Framework 6.2 — Using @Transactional","url":"https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html"},{"label":"Spring Framework 6.2 — Rolling Back a Declarative Transaction","url":"https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/rolling-back.html"},{"label":"Spring Framework 6.2 — Transaction Propagation","url":"https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/tx-propagation.html"}]

## 一句话答案

`@Transactional` 不是魔法，是 Spring 用 AOP 代理在方法外面开事务、正常返回就提交、抛异常按规则回滚。失效基本都是两类原因：调用没经过代理（同类自调用、方法不可见、对象不是 Spring 管的），或者异常没触发回滚（被 catch 了、类型不对）。默认只对 `RuntimeException` 和 `Error` 回滚，受检异常要显式配 `rollbackFor`。

## 展开讲

拦截链路：调用方 → 代理 → `TransactionInterceptor` 向事务管理器要一个事务 → 执行目标方法 → 正常返回提交、抛异常回滚。这就解释了所有规则：

1. 只有从代理进来的外部调用才会被拦截，`this.method()` 不行。
2. bean 必须注册在容器里（`@Service`、`@Component`、`@Bean`），自己 new 出来的对象没有代理。
3. 方法可见性：通常要 public。Spring 6 起，class-based 代理默认也支持 protected 和包可见方法；interface-based 代理则必须 public 且在接口里声明。
4. 默认回滚规则：`RuntimeException` 及子类、`Error` 回滚；受检异常默认不回滚。

```java
@Service
public class PayService {

    private final JdbcTemplate jdbcTemplate;

    public PayService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(rollbackFor = Exception.class)   // 受检异常也回滚
    public void pay(long orderId) throws Exception {
        jdbcTemplate.update("update orders set status = ? where id = ?", "PAID", orderId);
        if (orderId <= 0) {
            throw new Exception("订单号非法");        // 不加 rollbackFor 时这里不会回滚
        }
    }
}
```

传播行为也常被追问：默认 `REQUIRED`，外层有事务就加入，任意一处标记回滚则整个事务回滚；`REQUIRES_NEW` 会挂起外层、开独立事务，内层失败不影响外层；`NESTED` 用保存点，可以只回滚内层这一段。

还有一个官方专门提醒过的点：不要在 `@PostConstruct` 里依赖 `@Transactional`，此时 bean 还没完全初始化，代理可能没就绪。

## 追问与加分点

- **REQUIRED 和 REQUIRES_NEW 的区别**：前者加入外层事务，一起提交一起回滚；后者是独立物理事务，需要自己的连接，用多了要小心连接池耗尽。
- **内层 catch 住异常会怎样**：事务管理器看不到异常，外层照常提交；如果内层已经把事务标成 rollback-only，外层提交时会抛 `UnexpectedRollbackException`。
- **readOnly、timeout、isolation**：`readOnly = true` 是给驱动/ORM 的优化提示，不是强制拒绝写；timeout 超时会回滚；隔离级别一般交给数据库默认值。
- **为什么建议加在 service 层**：事务边界应该包住一组完整业务操作，加在 controller 太粗、加在 repository 太细。
- **编程式事务**：需要精细控制提交时机时用 `TransactionTemplate`，比注解更直观。
- **多数据源**：有多个 `TransactionManager` 时要通过 `@Transactional(transactionManager = "...")` 指定。

## 别踩的坑

- 同类自调用：A 方法调本类 B 方法，B 上的 `@Transactional` 无效。
- 方法里 catch 住异常、打条日志就完事，没有重新抛：事务不会回滚。
- 抛受检异常却没配 `rollbackFor`：事务照常提交，数据只改了一半。
- 方法本身是 private 或 final 的：private 代理碰不到，final 方法 CGLIB 覆盖不了。
- 以为事务能跨线程：事务上下文绑定在当前线程上，`@Async` 方法在新线程执行，不会共享调用方的事务。
- 把 `@Transactional` 打在 controller 上，中间调了远程接口：事务时间长、连接被占住，并发一高就连接池告急。

================================================================================
ID: interview-bean-scope | Bean 的作用域有哪些？ | level=入门 | readingMinutes=3
SUMMARY: 默认 singleton，prototype 每次新建；request/session 等只在 Web 环境有效，注入到单例要作用域代理。
TAGS: ["作用域","单例","线程安全"]
SOURCES: [{"label":"Spring Framework 6.2 — Bean Scopes","url":"https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-scopes.html"}]

## 一句话答案

默认是 singleton：每个容器、每个 bean 定义只有一个实例，启动时创建、全局共享。prototype：每次获取都创建新实例，容器创建后就不管了。Web 环境还有 request、session、application、websocket 四个作用域。单例 bean 必须无状态，否则会有线程安全问题。

## 展开讲

| 作用域 | 实例数 | 生命周期 | 典型用途 |
| --- | --- | --- | --- |
| singleton | 每容器 1 个 | 容器管理，启动创建、关闭销毁 | 无状态 service、dao、配置 |
| prototype | 每次获取 1 个 | 容器只负责创建，销毁不管 | 有状态、短生命周期对象 |
| request | 每个 HTTP 请求 1 个 | 请求结束销毁 | 当前请求上下文 |
| session | 每个会话 1 个 | 会话失效销毁 | 登录用户信息 |
| application | 每个 ServletContext 1 个 | 应用级共享 | 全局缓存、计数器 |
| websocket | 每个 WebSocket 会话 1 个 | 连接关闭销毁 | WebSocket 会话状态 |

request、session、application、websocket 只在 web-aware 的 ApplicationContext 里有效，普通环境里用了会抛 `IllegalStateException`。声明方式：`@Scope("prototype")`，或直接用 `@RequestScope`、`@SessionScope`、`@ApplicationScope`。

关键机制是作用域代理：把 request 作用域的 bean 注入到单例 bean 时，必须注入一个代理，由代理在每次调用时去当前请求里取真身，否则单例在创建时就把某个请求的对象固定下来了。`@RequestScope` 默认 `proxyMode = ScopedProxyMode.TARGET_CLASS`。

```java
@Component
@RequestScope
public class CurrentUser {

    private String name;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
```

```java
@Component
@Scope("prototype")
public class ReportBuilder {

    private final List<String> rows = new ArrayList<>();

    public void addRow(String row) {
        rows.add(row);
    }
}
```

## 追问与加分点

- **单例 bean 线程安全吗**：Spring 不保证。bean 本身无状态（只有方法、没有可变字段）才安全；有可变状态就要加锁、改成 prototype，或用 ThreadLocal。
- **单例里注入 prototype 会拿到同一个对象吗**：注入发生在创建单例时，容器给了它一个原型实例，之后一直用这个；想每次拿新的要用 `ObjectProvider`、`@Lookup` 或作用域代理。
- **`@Lookup` 方法注入**：在单例里声明一个抽象方法，容器每次调用时返回一个新实例，用来解决「单例依赖原型」。
- **原型 bean 的销毁**：容器不调用 `@PreDestroy`，谁创建谁负责清理，这也是它不适合管理重资源的原因。
- **什么时候用 prototype**：对象有状态、创建成本低、不希望被共享，比如一次请求内的构建器、命令对象。

## 别踩的坑

- 在单例 bean 里存请求级数据（当前用户、请求参数），并发下不同请求互相串数据。
- 单例注入 request 作用域 bean 却不加代理，拿到的是启动时那个请求的旧对象。
- 以为 prototype 注入到单例后每次调用都是新对象，实际只注入一次。
- 在非 Web 环境（比如定时任务、单元测试）里使用 request/session 作用域，启动或运行时报错。
- 把 `@Scope` 的值拼错（如 `"protoype"`），容器找不到对应作用域直接抛异常。

================================================================================
ID: interview-graceful-shutdown | 优雅停机是怎么做的？ | level=进阶 | readingMinutes=3
SUMMARY: 停机时先停止接收新请求、在宽限期等存量请求跑完再销毁 bean；Boot 内嵌服务器默认开启，超时可配。
TAGS: ["优雅停机","发布","生命周期"]
SOURCES: [{"label":"Spring Boot 3.5 Reference — Graceful Shutdown","url":"https://docs.spring.io/spring-boot/3.5/reference/web/graceful-shutdown.html"},{"label":"Spring Boot 3.5 Reference — Actuator Endpoints","url":"https://docs.spring.io/spring-boot/3.5/reference/actuator/endpoints.html"}]

## 一句话答案

优雅停机就是应用关闭时不让正在处理的请求被硬切断：先停止接收新请求，给存量请求一个宽限期跑完，再执行 bean 的销毁回调。Boot 3.5 对 Jetty、Reactor Netty、Tomcat、Undertow 四种内嵌服务器默认开启，随 ApplicationContext 关闭触发，发生在 SmartLifecycle 停止的最早阶段。

## 展开讲

触发方式：进程收到 SIGTERM、调用 `SpringApplication.exit()`、或访问 Actuator 的 shutdown 端点（默认禁用）。流程大致是：

1. 关闭开始，Web 服务器进入优雅停机阶段。
2. 不再接受新请求：Jetty、Reactor Netty、Tomcat 在网络层拒绝；Undertow 会接受连接但立刻返回 503。
3. 宽限期内已有请求继续执行，直到完成或超时。
4. 超时后强制继续关闭，随后停止 SmartLifecycle bean、销毁单例 bean（`@PreDestroy` 在这里执行）。

```yaml
spring:
  lifecycle:
    timeout-per-shutdown-phase: 20s
# 默认已是优雅停机；要关闭（不推荐）：server.shutdown=immediate
```

注意：在 IDE 里点停止，往往不发 SIGTERM 而是直接杀进程，看起来就不优雅，别用这种方式验证。配置层面用 `server.shutdown=immediate` 才会关掉优雅停机。

## 追问与加分点

- **超时设多少**：要比编排系统给的终止宽限期短一点，留出销毁 bean 的时间；否则进程还没关完就被 SIGKILL，等于没优雅。
- **为什么发布瞬间还会 502**：流量入口摘除有延迟，请求还在路上打到已经停机的实例。除了停机配置，还要考虑入口摘流和实例下线的先后顺序。
- **除了 Web 请求还有谁要停**：MQ 消费者、定时任务、异步线程池不是内嵌 Web 服务器管的，需要在 SmartLifecycle 或 `@PreDestroy` 里主动停止拉取、等待处理完。
- **Actuator shutdown 端点**：默认禁用且只在 jar 打包时生效；Boot 3.5 要用 `management.endpoint.shutdown.access=unrestricted` 打开访问，默认安全配置下 POST 请求还会 403，等于多了一层保护。
- **为什么它和 SmartLifecycle 有关**：优雅停机是作为 SmartLifecycle 的最早停止阶段执行的，所以其他组件的 stop 会排在它后面，正好利用这个顺序做「先停流量、再停内部组件」。

## 别踩的坑

- 宽限期比编排系统给的时间还长：请求没跑完进程就被 SIGKILL，日志里出现一半的请求、一半的报错。
- 只处理 HTTP，忘了 MQ 消费者和定时任务，停机时任务被腰斩、消息重复消费。
- 停机时不关数据库连接池、线程池，日志刷一堆连接泄漏告警。
- 用 IDE 的停止按钮测试优雅停机，永远测不出真实效果。
- 打开 Actuator shutdown 端点又没做鉴权，等于给外部留了一个远程关机入口。
- 发布时先停实例再摘流量（或反过来），中间窗口的请求照样失败，优雅停机只能兜住一部分。

