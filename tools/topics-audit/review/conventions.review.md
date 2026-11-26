# conventions

================================================================================
ID: conventions-dto-validation | DTO 与参数校验规范：边界校验、业务归位 | level=进阶 | readingMinutes=5
SUMMARY: 请求 DTO 不可变并声明校验注解，Controller 触发校验，业务规则留在 Service。
TAGS: ["DTO","参数校验","校验注解"]
SOURCES: [{"label":"Spring Boot 参考文档：校验","url":"https://docs.spring.io/spring-boot/3.5/reference/io/validation.html"},{"label":"Spring Framework 参考文档：Bean Validation","url":"https://docs.spring.io/spring-framework/reference/core/validation/beanvalidation.html"}]

## 推荐做法

每个对外入口定义独立的请求 DTO，优先用 record 保证不可变；字段上写 jakarta.validation 约束，例如 `@NotBlank`、`@Size`、`@Min`、`@Email`。Controller 参数加 `@Valid` 触发校验；嵌套对象字段也要加 `@Valid`，否则校验不会递归进去。

```java
public record CreateOrderRequest(
        @NotBlank String sku,
        @Min(1) @Max(99) int quantity,
        @Valid @NotNull AddressRequest address) {
}

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse create(@Valid @RequestBody CreateOrderRequest request) {
        return orderService.create(request);
    }
}
```

如果同一个 DTO 在新增和修改时需要不同约束，用校验分组：定义空接口作为标记，字段上写 `groups = Create.class`，Controller 参数改用 `@Validated(Create.class)`。库存是否充足、优惠券是否可用这类依赖数据库状态的规则，不要塞进注解，放在 Service 里显式判断。

方法级校验也常用：在 Service 类上标注 `@Validated`，方法参数或返回值上直接写约束注解，适合校验非请求体的入参，例如内部任务 ID 列表。这类异常与请求体校验抛出的类型不同，统一异常处理里要分别覆盖。

## 为什么

Spring Boot 在类路径存在 Bean Validation 实现时会自动配置校验支持，因此引入 `spring-boot-starter-validation` 后，`@Valid` 就能直接生效，不需要手写 Validator 工厂。官方文档还说明：在类型级别标注 `@Validated` 的类，其方法参数和返回值上的内联约束才会被搜索并校验——这也是方法级校验与请求体校验写法不同的原因。

官方校验章节特别提醒：目标类需要在类型级别标注 `@Validated`，其方法参数和返回值上的内联约束才会被搜索——只在方法参数上写注解而不加类级 `@Validated`，约束不会生效，这是“校验写了却没触发”的常见原因。

校验放在边界层，Service 就可以假设传入对象基本合法，专注业务规则；如果每个 Service 方法都重复写判空和格式判断，代码会迅速膨胀，而且难以保证各处规则一致。

校验失败必须转成 400 和结构化错误信息，而不是让异常堆栈直接透出。把这一步交给统一的异常处理，接口契约才稳定，前端也不需要为每个接口写不同的错误解析。

## 落地检查清单

- [ ] 每个写接口有独立请求 DTO，未直接接收实体
- [ ] 请求 DTO 字段声明了必要的校验注解
- [ ] 嵌套对象和集合元素使用 `@Valid` 触发级联校验
- [ ] 分组校验使用 `@Validated` 指定分组，未混用默认组
- [ ] 依赖数据库状态的规则在 Service 中校验，未写进注解
- [ ] 校验异常统一转换为 400 响应
================================================================================
ID: conventions-exception | 统一异常处理规范：错误码、状态码与 RFC 9457 | level=进阶 | readingMinutes=5
SUMMARY: 业务异常带错误码，@RestControllerAdvice 统一转换状态码与响应体。
TAGS: ["异常处理","错误码","RFC 9457"]
SOURCES: [{"label":"Spring Framework 参考文档：REST 异常处理","url":"https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-rest-exceptions.html"},{"label":"Spring Framework 参考文档：@ExceptionHandler","url":"https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-exceptionhandler.html"},{"label":"Spring Boot 参考文档：错误处理","url":"https://docs.spring.io/spring-boot/3.5/reference/web/servlet.html"}]

## 推荐做法

定义业务异常基类，携带错误码和对应的 HTTP 状态；具体异常继承它，例如订单不存在、库存不足。Controller 层不要写 try/catch 把异常吞掉再返回 200，让异常抛到统一处理层。

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(OrderNotFoundException.class)
    public ProblemDetail handleOrderNotFound(OrderNotFoundException ex) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        detail.setProperty("code", ex.getCode());
        return detail;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleInvalidArgument(MethodArgumentNotValidException ex) {
        ProblemDetail detail = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        detail.setProperty("code", "INVALID_ARGUMENT");
        detail.setProperty("errors", ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .toList());
        return detail;
    }
}
```

未知异常单独兜底：记录 ERROR 级别日志并带上请求标识，对外只返回 500 和通用错误码，不把堆栈和 SQL 语句返回给调用方。错误响应里至少包含 `code`、`message`、`traceId` 三个字段，方便用户报障时直接提供。

错误码按层设计：通用错误码（参数错误、未认证、无权限、系统错误）全站固定，业务错误码按领域分段，例如以 `ORDER_`、`PAY_` 开头。HTTP 状态码表达类别，业务错误码表达具体原因，两者不要互相替代。

## 为什么

Spring Framework 支持 RFC 9457 的 Problem Details 规范，官方文档明确：`@ExceptionHandler` 或 `@RequestMapping` 方法可以直接返回 `ProblemDetail` 或 `ErrorResponse`，框架会按其中状态渲染响应，并把内容类型切换为 `application/problem+json`。这意味着统一错误体不必自己发明一套格式。

Spring Boot 默认提供 `/error` 映射兜底，机器客户端会收到包含状态和异常信息的 JSON。它适合兜底，不适合作为业务错误契约：字段固定、无法携带业务错误码，也不方便前端做分支处理，所以要有自己的统一处理层。

把异常转换集中在一处，Controller 和 Service 可以只关心成功路径；错误码集中定义后，客户端、文档、监控告警能共享同一套语义，出问题时定位也更快。

并不是所有异常都值得告警：4xx 通常是调用方问题，记录 WARN 即可；5xx 和关键业务失败才触发告警，否则告警会迅速疲劳，真正的问题反而没人看。

统一处理层还要注意别把内部细节暴露出去：数据库约束名、类名、SQL 片段都可能帮助攻击者推断系统结构。对外只给稳定错误码和可读提示，详细信息写进日志，用 traceId 关联。

## 落地检查清单

- [ ] 存在业务异常基类，包含错误码与 HTTP 状态
- [ ] 所有 Controller 无吞异常后返回 200 的代码
- [ ] 统一异常处理覆盖业务异常、参数校验异常与未知异常
- [ ] 错误响应包含 code、message、traceId
- [ ] 未知异常记录 ERROR 日志，未把堆栈返回给调用方
- [ ] 错误码在单一位置定义，文档与客户端共用
================================================================================
ID: conventions-logging | 日志规范：接口、级别、上下文与脱敏 | level=入门 | readingMinutes=4
SUMMARY: 统一用 SLF4J 与参数化日志，规定级别语义，关键业务字段必须带上下文。
TAGS: ["日志","SLF4J","可观测性"]
SOURCES: [{"label":"Spring Boot 参考文档：日志","url":"https://docs.spring.io/spring-boot/3.5/reference/features/logging.html"},{"label":"Spring Boot How-to：日志","url":"https://docs.spring.io/spring-boot/3.5/how-to/logging.html"}]

## 推荐做法

业务代码统一使用 SLF4J 的 `LoggerFactory` 获取 logger，不直接依赖 Logback 或 Log4j2 的 API。日志内容用占位符参数化传入，不要在方法调用前拼字符串；异常对象作为最后一个参数传入，保留完整堆栈。

```java
private static final Logger log = LoggerFactory.getLogger(OrderService.class);

public OrderResponse create(CreateOrderRequest request) {
    log.info("创建订单开始 sku={} quantity={}", request.sku(), request.quantity());
    try {
        Order order = doCreate(request);
        log.info("创建订单成功 orderId={}", order.getId());
        return OrderResponse.from(order);
    } catch (RuntimeException ex) {
        log.error("创建订单失败 sku={} quantity={}", request.sku(), request.quantity(), ex);
        throw ex;
    }
}
```

级别语义要固定：ERROR 表示需要人处理、可能影响业务的失败；WARN 表示可恢复的异常或可疑状态；INFO 记录关键业务节点和状态变化；DEBUG 留给诊断细节，生产默认关闭。日志里带上订单号、用户号、请求标识等业务主键，脱敏手机号、身份证、令牌，禁止打印完整请求体和密码。

需要跨方法串联一次请求时，用 MDC 放 traceId，在过滤器或拦截器里写入、在 finally 里清理；异步线程不会自动继承 MDC，切换线程时要显式传递，否则日志会断链。

生产环境通过 `logging.file.name` 输出到文件，配合 `logging.level.<logger-name>` 按包临时调级别；需要结构化日志时再引入对应 encoder，不要在每个类里自己拼 JSON。

## 为什么

官方文档说明 Spring Boot 内部使用 Commons Logging，但对底层实现保持开放，starter 默认引入 Logback 并做好其他日志框架的路由。这意味着团队不需要替换日志依赖，直接用 SLF4J 门面就能和框架日志统一输出。

级别支持在 Environment 中配置，例如 `logging.level.root=warn`、`logging.level.org.springframework.web=debug`，改级别不用改代码、不用重新打包。参数化日志只在级别开启时才格式化参数，避免无谓的字符串拼接开销。

日志是排障时最便宜的输入。

日志量本身也有成本：把大对象、完整请求体、循环内的逐条记录都打成 INFO，磁盘和采集费用会迅速上升，真正有用的错误反而被淹没。级别和内容一起控制，日志才是资产而不是负担。只写“操作失败”而不带任何业务标识，等于把定位成本转移给值班同学；反过来，带上下文、级别正确、不泄密的日志，能让大多数问题在几分钟内定位。

## 落地检查清单

- [ ] 统一使用 SLF4J 门面，无直接依赖具体日志实现
- [ ] 日志使用 `{}` 占位符，无字符串拼接
- [ ] 异常日志传入异常对象，未只打印 `ex.getMessage()`
- [ ] 关键业务日志带订单号、用户号或 traceId
- [ ] 敏感字段已脱敏，未打印密码、令牌、完整请求体
- [ ] 生产级别通过配置调整，未硬编码在代码里
================================================================================
ID: conventions-dependency | 依赖与版本管理规范：用 BOM 管版本，用 starter 收敛 | level=入门 | readingMinutes=4
SUMMARY: 继承 parent 或导入 BOM 统一版本，优先 starter，不随手写依赖版本。
TAGS: ["Maven","依赖管理","BOM"]
SOURCES: [{"label":"Spring Boot 参考文档：构建系统","url":"https://docs.spring.io/spring-boot/3.5/reference/using/build-systems.html"},{"label":"Spring Boot 参考文档：starters","url":"https://docs.spring.io/spring-boot/3.5/reference/using/build-systems.html#using.build-systems.starters"}]

## 推荐做法

新项目继承 `spring-boot-starter-parent`，多模块项目则在父 POM 里导入 `spring-boot-dependencies` BOM。依赖优先选官方 starter，而不是逐个引 Spring 模块：starter 会把一组相互兼容的依赖和自动配置一起带进来。

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.5.0</version>
</parent>

<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
</dependencies>
```

业务模块里的依赖不写 `version`，版本由 BOM 统一管理；确实需要覆盖时，在 `properties` 里修改对应版本属性，而不是零散地给单个依赖写版本。测试依赖加 `<scope>test</scope>`，只在运行期需要的驱动放进 runtime scope；不需要的传递依赖用 `<exclusions>` 排除，并写清排除原因。

升级 Boot 时整包升级，不要只升其中某个 starter；多模块工程的第三方库版本统一收敛到父 POM 的 `dependencyManagement`，子模块只声明 groupId 和 artifactId。

插件版本同样交给 parent：`spring-boot-maven-plugin` 不单独写版本，多模块项目把插件配置放进父 POM 的 `pluginManagement`，子模块按需启用。

## 为什么

官方构建系统文档说明：每个 Spring Boot 版本都提供一份经过筛选的依赖清单，这些依赖不需要在构建配置里写版本，升级 Boot 时会以一致的方式一起升级；如果需要，也可以显式指定版本来覆盖官方建议。这正是团队不该随手写版本的原因——一旦分散指定，升级就变成逐个排查。

starter 的定位是“依赖描述符”，把快速启动一个类型应用所需的依赖以一致的、受支持的传递依赖集合打包进来。自己逐个拼 Spring 模块，很容易出现版本错配，或者漏掉某项自动配置需要的类。

starter 的命名约定 `spring-boot-starter-*` 也方便排查：看到这个前缀就知道它属于 Boot 官方生态，版本应当由 BOM 决定；第三方 starter 通常有自己的命名，需要单独确认兼容的 Boot 版本。定期运行 `mvn dependency:tree` 检查重复与冲突，是比出事后再排查更便宜的习惯。

版本冲突往往不是立刻报错，而是在运行期以 `NoSuchMethodError`、类加载失败的形式出现。把版本决策集中到 BOM，冲突面就从“每个模块各自猜”收敛到“一份清单”，排查成本下降一个量级。

## 落地检查清单

- [ ] 项目继承 `spring-boot-starter-parent` 或导入 `spring-boot-dependencies` BOM
- [ ] 业务依赖未写 `version`，覆盖版本时使用属性
- [ ] 优先使用官方 starter，而非逐个引用 Spring 模块
- [ ] 测试依赖已标注 `test` scope
- [ ] 排除传递依赖时写明原因
- [ ] 升级 Boot 时所有模块同步升级
