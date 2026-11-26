
### bean-lifecycle | 一个 Bean 的生命周期：从创建到销毁 | principle
summary: Bean 从实例化、属性填充、初始化到销毁各发生了什么，@PostConstruct 和 afterPropertiesSet 谁先谁后。
tags: ["Bean 生命周期","@PostConstruct","InitializingBean","销毁回调"]
sources: https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-nature.html , https://docs.spring.io/spring-framework/reference/6.2/core/beans/annotation-config/postconstruct-and-predestroy-annotations.html
---content---
## 一句话结论

一个 Bean 的一生有四步：实例化（创建对象）→ 属性填充（把依赖注入进去）→ 初始化（执行你写的启动逻辑）→ 销毁（容器关闭前清理）。@PostConstruct 标在初始化阶段，@PreDestroy 标在销毁阶段，它们来自 jakarta.annotation，是 Boot 3.x 里的标准写法。

## 四个阶段里各发生了什么

1. **实例化**：容器调用构造器创建对象。构造器注入的依赖在这一步就传进来了。
2. **属性填充**：给 @Autowired 的字段、setter 赋值，同时执行 Aware 回调（让 Bean 拿到容器相关信息）和 BeanPostProcessor 的前置处理。
3. **初始化**：先执行 @PostConstruct 方法，再执行 InitializingBean.afterPropertiesSet()，最后执行 @Bean(initMethod) 指定的方法。几种机制都配了也不会跳过，Spring 按这个顺序依次调用。
4. **销毁**：容器关闭时，先执行 @PreDestroy，再执行 DisposableBean.destroy()，最后执行 @Bean(destroyMethod) 指定的方法。

官方文档明确建议：**别实现 InitializingBean / DisposableBean 接口**，因为业务代码会被 Spring 的接口绑死；用 @PostConstruct / @PreDestroy 或普通 POJO 方法更干净。

四个阶段中间还有几张「插件位」：Aware 系列接口让 Bean 拿到自己的名字、容器等基础设施；BeanPostProcessor 在初始化方法前后各插一脚，@Autowired 的注入、@PostConstruct 的识别、AOP 代理的创建，都是靠它完成的。理解这一点就能明白：初始化方法执行时，Bean 已经能拿到别的 Bean，但还没被 AOP 包起来。

## 代码：观察一次完整的生命周期

```java
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Component;

@Component
public class CacheWarmer {

    public CacheWarmer() {
        System.out.println("1. 构造器：对象被创建");
    }

    @PostConstruct
    public void warmUp() {
        // 此时依赖已经注入完成，可以放心调用别的 Bean
        System.out.println("2. @PostConstruct：初始化");
    }

    @PreDestroy
    public void shutdown() {
        System.out.println("3. @PreDestroy：清理资源");
    }
}
```

启动日志里会先打印 1、再打印 2；正常关停（例如 Ctrl+C 触发上下文关闭）时打印 3。

也顺带解释一个常见疑问：初始化逻辑为什么不写在构造器里？因为构造器执行时依赖注入还没完成，字段注入和 setter 注入的依赖此时还是 null；而 @PostConstruct 执行时依赖已经就绪，所以官方推荐把「需要用依赖的启动逻辑」放在这里。

## 踩坑提醒

- **@PostConstruct 里别依赖事务**：事务代理是在 Bean 初始化完成之后才包上去的，此时调用 @Transactional 方法不会开启事务。启动时要跑数据，用 ApplicationRunner 或 CommandLineRunner。
- **prototype 作用域的 Bean 不走销毁回调**：容器只负责创建，销毁得调用方自己做，官方作用域文档写得很清楚。
- **初始化方法别做重活**：@PostConstruct 会拖慢启动，还会让应用在「还没准备好」时就对外暴露；大批量预热适合放到启动完成后执行。
- **@PostConstruct 没执行**：确认方法不是 static、没有参数，类确实被扫描成 Bean；另外 Boot 3 用的是 jakarta.annotation，别从 javax 导包，导错了注解会被静默忽略。

### aop-proxy | Spring AOP 是怎么实现的：代理与自调用 | principle
summary: 用代理、切点、通知三个词讲清 Spring AOP，以及自调用为什么会绕过增强。
tags: ["AOP","动态代理","切点","通知"]
sources: https://docs.spring.io/spring-framework/reference/6.2/core/aop/introduction-defn.html , https://docs.spring.io/spring-framework/reference/6.2/core/aop/proxying.html
---content---
## 一句话结论

Spring AOP 的本质是**给目标对象套一个代理**：调用先到代理，代理按切点判断要不要执行通知（比如记日志、开事务），再决定何时调用真正的方法。所以「AOP 不生效」十有八九是调用没走代理，最常见的就是类内部自调用。

## 五个词搞懂 AOP

- **切面（Aspect）**：横切关注点的模块化，比如「给所有 Service 方法记耗时」。
- **连接点（Join point）**：程序执行中的某个点。Spring AOP 里永远只指「方法执行」。
- **切点（Pointcut）**：匹配连接点的表达式，决定「哪些方法要被增强」。
- **通知（Advice）**：真正要执行的逻辑，分 before、after returning、after throwing、after finally、around 五种。
- **代理（Proxy）**：包在目标对象外面的那一层，调用先经过它。织入（weaving）就是把切面接进业务流程的动作，Spring AOP 在运行时织入。

代理用哪种由目标类决定：实现了至少一个接口，默认用 JDK 动态代理；没实现接口，用 CGLIB 生成子类。于是有几条硬限制（官方文档明说）：final 类不能被 CGLIB 代理，final 方法不能被增强，private 方法不能被增强（子类覆盖不了）。需要强制用 CGLIB 时设 proxyTargetClass = true。

五种通知里，around 最灵活（能决定调不调、能改返回值），也最容易写错；其余四种只是在固定时机插一段逻辑。切点表达式 `execution(* com.example.service..*(..))` 的读法是：任意返回类型、service 包及子包、任意方法名、任意参数。常用的切点可以用 @Pointcut 抽出来复用。

## 一个最小切面

```java
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class TimingAspect {

    // 切点：com.example.service 包及子包下的所有方法
    @Around("execution(* com.example.service..*(..))")
    public Object time(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.nanoTime();
        try {
            return pjp.proceed(); // 真正调用目标方法
        } finally {
            long cost = (System.nanoTime() - start) / 1_000_000;
            System.out.println(pjp.getSignature().toShortString() + " 耗时 " + cost + "ms");
        }
    }
}
```

@Around 里必须调用 pjp.proceed()，否则目标方法根本不会执行——这是新手最常见的 bug。

## 为什么自调用不生效

官方文档讲得很直接：调用一旦进入目标对象，方法内部再调用 `this.bar()`，走的是 this 引用而不是代理，通知没有机会执行。所以下面这种写法，事务和日志都会失效：

```java
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {

    public void outer() {
        this.inner(); // 直接调 this，绕过了代理
    }

    @Transactional
    public void inner() {
        // 事务注解不生效
    }
}
```

修法：把 inner 挪到另一个 Bean 里调用；或者在类里注入自己的代理（自注入）后通过它调用。AopContext.currentProxy() 也能用，但官方明确不推荐，因为它把业务代码和 Spring 绑在了一起。

还有一个隐蔽问题：同一个类里既写业务又写 @Transactional、@Cacheable 时，凡是「调用经过代理」这个前提被打破，增强就会失效。排查 AOP 问题时先问一句：这次调用到底走的是代理，还是 this？

### mvc-request-flow | 一个请求在 Spring MVC 里经历了什么 | web
summary: 跟着一次请求走完 Spring MVC：DispatcherServlet、HandlerMapping、HandlerAdapter 各干什么。
tags: ["Spring MVC","DispatcherServlet","HandlerMapping","请求流程"]
sources: https://docs.spring.io/spring-framework/reference/6.2/web/webmvc/mvc-servlet/sequence.html , https://docs.spring.io/spring-framework/reference/6.2/web/webmvc/mvc-servlet/special-bean-types.html , https://docs.spring.io/spring-framework/reference/6.2/web/webmvc/mvc-controller/ann-methods/responsebody.html
---content---
## 一句话结论

请求先到 DispatcherServlet（前端控制器），由它问 HandlerMapping「这个 URL 该谁处理」，再用 HandlerAdapter 真正调用你的 @GetMapping 方法，最后把返回值通过 HttpMessageConverter 写成 JSON，或交给 ViewResolver 渲染页面。你的 Controller 只是整条流水线上的一站。

## 五步走完一个请求

1. **接单**：Tomcat 把请求交给 DispatcherServlet，它先把 WebApplicationContext 绑定到当前请求上，后续组件都能拿到。
2. **找 handler**：HandlerMapping 按 URL、HTTP 方法、请求头匹配；@RequestMapping 系列由 RequestMappingHandlerMapping 负责。返回的不只是方法，还有一串拦截器（HandlerExecutionChain）。
3. **执行**：HandlerAdapter 负责参数解析（@PathVariable、@RequestBody 等）、数据绑定、校验，再反射调用你的方法。它的作用是让 DispatcherServlet 不用关心「具体怎么调」。
4. **处理返回值**：标了 @ResponseBody（或类上是 @RestController）就走 HttpMessageConverter，把对象序列化成 JSON 写回响应，不再走视图；返回的是视图名则交给 ViewResolver 找模板渲染。
5. **异常兜底**：任何一步抛异常，都交给 HandlerExceptionResolver（@ExceptionHandler 属于这一层）。

DispatcherServlet 自己也是个 Servlet，启动时会初始化自己的 WebApplicationContext（可以有一个根上下文作为父上下文），所以 Controller 里能用 @Autowired 拿到 Service。第 3 步的细节值得单独记：参数解析靠 HandlerMethodArgumentResolver，返回值处理靠 HandlerMethodReturnValueHandler，@RequestBody 的 JSON 转换最终交给 Jackson。第 4 步用哪个 HttpMessageConverter，由请求头、返回类型和已注册的转换器共同决定。

## 代码：注解控制器落在哪一步

```java
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController   // = @Controller + @ResponseBody
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/users/{id}")
    public UserView get(@PathVariable long id) {
        return userService.view(id);
    }
}
```

这个类会被扫描成 Bean，@GetMapping 注册进 RequestMappingHandlerMapping 的映射表。请求进来后第 2 步查到它，第 3 步把路径里的 id 转成 long 传进来，第 4 步因为 @RestController 直接把 UserView 序列化成 JSON。返回 JSON 还是页面，就看有没有 @ResponseBody。

为什么中间要隔一层 HandlerAdapter？因为 Spring MVC 支持的 handler 不止注解方法一种（还有实现 Controller 接口的类、HttpRequestHandler 等），DispatcherServlet 只面向 HandlerAdapter 编程，新增一种 handler 类型时不需要改核心代码。另外，第 2 步查不到 handler 返回 404；查到了但 HTTP 方法不匹配（比如用 POST 调 @GetMapping）返回 405——这两个状态码能帮你快速区分是 URL 写错还是方法写错。

## 三个常见误解

- **「DispatcherServlet 就是 Spring MVC 全部」**：它只是调度中心，真正干活的是 HandlerMapping、HandlerAdapter、ViewResolver、HandlerExceptionResolver 这些策略组件，换一个实现行为就变。
- **「@ResponseBody 一定转成 JSON」**：返回 String 时默认由 StringHttpMessageConverter 按纯文本写出，不会加引号也不会转义；要 JSON 就返回对象，别自己拼 JSON 字符串。
- **「拦截器就是过滤器」**：Filter 属于 Servlet 规范，在 DispatcherServlet 之前执行；HandlerInterceptor 在 DispatcherServlet 内部，能拿到 handler 信息。请求体在参数解析时通常已被读走，拦截器里别再读一遍。

另外两个排查技巧：接口 404 先确认 URL 有没有匹配到 HandlerMapping（打开 debug 日志能看到映射表），404 说明请求根本没找到方法，和方法体无关；接口 415/400 则多半是参数解析或消息转换器不匹配，比如请求头 Content-Type 写错了。

### global-exception | 全局异常处理：@ControllerAdvice 怎么用 | web
summary: 用 @RestControllerAdvice 集中处理异常：匹配规则、优先级，以及返回统一错误结构的写法。
tags: ["@ControllerAdvice","异常处理","REST","统一响应"]
sources: https://docs.spring.io/spring-framework/reference/6.2/web/webmvc/mvc-controller/ann-advice.html , https://docs.spring.io/spring-framework/reference/6.2/web/webmvc/mvc-controller/ann-exceptionhandler.html
---content---
## 一句话结论

把 @ExceptionHandler 写进一个 @RestControllerAdvice 类，就成了全局异常处理：所有 Controller 抛出的异常都能在这里统一转成 JSON。优先级记住一条：**本 Controller 内的 handler 先于全局；全局里再按「异常类型越接近越优先」匹配。**

## 三个关键规则

1. **作用范围不同**：@ExceptionHandler 写在某个 @Controller 里，只影响这个类（及子类）；写在 @ControllerAdvice / @RestControllerAdvice 里，影响所有 Controller。@RestControllerAdvice = @ControllerAdvice + @ResponseBody，返回对象会直接序列化成 JSON。
2. **匹配按继承距离**：抛出的异常会匹配它自己、它的父类，以及它的 cause（cause 可以是任意深度）。同一层级有多个候选时，根异常优先于 cause。@ExceptionHandler({A.class, B.class}) 能一次覆盖多个类型。
3. **全局后于局部**：局部 @ExceptionHandler 先被应用，全局兜底在后。所以「特殊 Controller 特殊处理，公共的交给全局」是可行的。

官方文档还提示：@ControllerAdvice 可以用 annotations、basePackages、assignableTypes 缩小作用范围，但每次请求都做运行时检查有成本，范围越小越好。

有了全局处理，Controller 里就不必到处 try-catch：业务代码只管抛出自定义异常，转成什么 HTTP 状态码、返回什么结构，统一在一个地方决定。这样改错误格式只需要动一个类。

## 代码：统一错误结构

```java
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    public record ErrorBody(String code, String message) {}

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorBody> handleBusiness(BusinessException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorBody("BIZ_ERROR", ex.getMessage()));
    }

    // 兜底：别把堆栈信息直接返回给前端
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorBody> handleOther(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorBody("INTERNAL", "服务器开小差了"));
    }
}

class BusinessException extends RuntimeException {
    public BusinessException(String message) {
        super(message);
    }
}
```

前端拿到统一的 { code, message } 结构，判断逻辑就不用在每个接口里再写一遍。

## 三个坑

- **异常被 catch 吞掉**：handler 只在异常抛到 DispatcherServlet 时才生效。方法里 try-catch 之后不重新抛出，全局处理永远不会触发。
- **@ExceptionHandler 方法里再次抛异常**：会落到容器默认的 500 处理，你写的返回结构失效；记日志就好，别再抛。
- **兜底方法忘了打日志**：一定要 log.error("...", ex)，否则线上只剩一句「服务器开小差了」，排查时无从下手。另外自定义错误体里不要放异常堆栈、SQL 或表名。
- **兜底写得太宽**：@ExceptionHandler(Exception.class) 会把参数校验失败之类的框架异常也一并吞掉，返回 500，掩盖真实原因。业务异常单独写方法，兜底只负责「真的没预料到」的那类。

最后补一句错误结构的设计：错误码最好分两类——业务错误（可预期，用 4xx 加明确 code，比如余额不足）和系统错误（不可预期，用 5xx，只给通用文案，细节进日志）。前端按 code 做分支，比解析 message 字符串可靠得多。

### transaction-failure | @Transactional 失效的六种情况 | data
summary: 自调用、非 public、异常被吞、受检异常、非 Bean、跨线程——六种让 @Transactional 失效的场景与修法。
tags: ["@Transactional","事务失效","事务传播","回滚"]
sources: https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html , https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/tx-propagation.html , https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/rolling-back.html
---content---
## 一句话结论

@Transactional 靠代理实现：只有**从外部、经过代理**调用方法，事务才生效。所以自调用、方法不是 public、异常被吞、抛了受检异常、对象不是 Spring Bean、换了线程，这六种情况都会让事务「看起来没生效」。先按清单排查，别一上来就怀疑数据库。

## 六个失效场景

| 场景 | 为什么失效 | 修法 |
| --- | --- | --- |
| 类内部 this.method() 自调用 | 没经过代理 | 拆到另一个 Bean，或自注入代理 |
| 方法不是 public | 接口代理只拦 public 方法 | 改 public；6.0+ 类代理支持 protected/包可见 |
| 异常被 try-catch 吞掉 | Spring 看不到异常，正常提交 | 重新抛出，或手动标记 rollback-only |
| 抛的是受检异常 | 默认只对 RuntimeException 和 Error 回滚 | 加 rollbackFor = Exception.class |
| 对象是 new 出来的 | 没有代理，注解等于注释 | 交给容器管理，注入使用 |
| 在新线程或 @Async 里执行 | 事务绑定线程，新线程没有事务上下文 | 事务方法放在最外层同步执行 |

默认回滚规则是官方文档写明的：**运行时异常和 Error 才回滚**，受检异常不回滚，想改就配 rollbackFor。另外，接口代理要求方法 public 且定义在接口里，类代理（proxyTargetClass=true）从 Spring 6.0 起才支持 protected 和包可见方法。

排查时按这个顺序走：先打开事务相关 DEBUG 日志，确认调用时到底有没有开启事务；再看调用是不是从另一个 Bean 经代理进来的；然后看异常有没有被吞、类型是受检还是运行时；最后确认数据库和表引擎本身支持事务（比如 MySQL 的 MyISAM 不支持事务，建表要用 InnoDB）。

## 传播行为：默认的 REQUIRED 通常够用

REQUIRED 是默认值：当前没有事务就新开一个物理事务，有就加入外层。同一线程里嵌套调用时，内外层其实是一个事务；内层失败会把事务标成 rollback-only，外层若继续走到提交，就会抛 UnexpectedRollbackException。

需要「内层失败不影响外层」时用 REQUIRES_NEW：它会挂起外层、另开一个独立物理事务，自己提交或回滚。代价是同时占用两条数据库连接，高并发下连接池可能被打满（官方文档提醒池大小至少要比并发线程数多 1）。典型用法是记操作日志：主业务回滚了，日志那条记录也要留下来。

## 一段能跑对的写法

```java
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final StockClient stockClient;

    public OrderService(OrderRepository orderRepository, StockClient stockClient) {
        this.orderRepository = orderRepository;
        this.stockClient = stockClient;
    }

    @Transactional(rollbackFor = Exception.class, propagation = Propagation.REQUIRED)
    public void placeOrder(long userId, long skuId) {
        orderRepository.insert(userId, skuId);
        stockClient.deduct(skuId); // 抛异常则整单回滚
    }
}
```

补一句：远程调用放在事务里会拉长事务时间，真实项目更推荐先扣库存再落库，或者把远程调用移到事务外，别让数据库连接陪着网络等待。
