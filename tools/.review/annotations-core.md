
### component | @Component | core
tagline: 把普通类交给 Spring 托管
plain: 在类上写 @Component，等于告诉 Spring：组件扫描扫到这个类时，就 new 一个实例放进容器，之后谁需要它，Spring 负责递过去。它只解决「对象从哪来」，不解决「依赖怎么给」。业务代码里更常用 @Service、@Repository、@Controller 这几个语义更明确的马甲。
since: Spring 2.5 | versionNote: null
keyPoints: ["只能标在类上（@Target 为 TYPE），并且必须被 @ComponentScan 或 @SpringBootApplication 扫到才会注册。","默认 Bean 名是类名首字母小写，如 userService；写 @Component(\"myBean\") 可以显式指定。","被扫描的类要能被实例化：抽象类、private 构造器、非静态内部类都不会成为 Bean。","@Component 只负责注册，不负责注入；依赖注入用构造器参数或 @Autowired。","@Service、@Repository、@Controller 都在这层元注解之上组合，行为一致、语义不同。"]
attrs: value:String=""""
notes: ["@Component 与 @Bean 分工不同：自己的类用 @Component 让扫描发现，改不了源码的第三方类用 @Bean 在配置类里手动注册。","启动类所在包是默认扫描根，类放到同级或子包之外不会被扫到，表现是「注入时找不到 Bean」。","不同包下同名类会撞 Bean 名，用 @Component(\"xxx\") 改名，或给其中一个候选加 @Primary。"]
docs: https://docs.spring.io/spring-framework/reference/6.2/core/beans/classpath-scanning.html#beans-stereotype-annotations
import org.springframework.stereotype.Component;

@Component
public class EmailSender {

    public void send(String to, String text) {
        System.out.println("mail to " + to + ": " + text);
    }
}

// 被扫描后，其他 Bean 可以直接注入它（推荐构造器注入）
// @Service
// public class UserService {
//     private final EmailSender emailSender;
//     public UserService(EmailSender emailSender) {
//         this.emailSender = emailSender;
//     }
// }

### service | @Service | core
tagline: 标记业务层组件，本质就是 @Component
plain: @Service 是 @Component 的语义化版本：它告诉读代码的人和工具「这一层是业务逻辑」。功能上二者完全等价，都会被组件扫描注册成 Bean。分层清楚的项目里用它比用 @Component 更容易一眼看出职责边界。
since: Spring 2.5 | versionNote: null
keyPoints: ["它是 @Component 的派生注解（元注解组合），扫描规则、Bean 命名规则一模一样。","业务逻辑与事务边界通常落在这一层，所以它经常和 @Transactional 一起出现。","不要为了凑分层在 DAO 或控制器上写它，语义会被后来维护的人误读。"]
attrs: value:String=""""
notes: ["名称只是语义，若用 @Component 代替 @Service，运行结果没有任何区别，区别只在可读性与工具识别。","同类型有多个实现时，注入不会自动挑 @Service，仍需 @Qualifier 或 @Primary 指定。"]
docs: https://docs.spring.io/spring-framework/reference/6.2/core/beans/classpath-scanning.html#beans-stereotype-annotations
import org.springframework.stereotype.Service;

import java.util.List;

interface OrderRepository {
    List<String> findAll();
}

@Service
public class OrderService {

    private final OrderRepository orderRepository;

    // 只有一个构造器时，Spring 会自动按类型注入，不需要 @Autowired
    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    public int countOrders() {
        return orderRepository.findAll().size();
    }
}

### import | @Import | core
tagline: 把别的配置类顺带装进容器
plain: @Import 写在配置类上，作用是「顺带把另一个配置类也装上」。被导入类里的 @Bean 定义会一起注册，常用于拼装模块配置或引入框架自带配置。被导入的类不需要在组件扫描范围内，这是它和 @Component 的关键区别。
since: Spring 3.0 | versionNote: null
keyPoints: ["value 是 Class 数组且没有默认值，必须显式写明要导入哪些类。","导入 @Configuration 类会展开它的 @Bean 定义；导入普通类则把这个类本身注册成 Bean。","被导入的类不受 @ComponentScan 范围限制，适合引入第三方或框架提供的配置。","Spring Boot 自动配置就是通过 @Import 选择一个 ImportSelector 来批量导入配置类的。"]
attrs: value:Class<?>[]="—"
notes: ["@Import 的类即使不在扫描路径下也会生效，这是它和 @Component 最重要的区别。","被导入的配置类若带 @Conditional，条件不满足时整体跳过，不会影响启动。","循环导入会让容器初始化失败，模块拆分时注意依赖方向保持单向。"]
docs: https://docs.spring.io/spring-framework/reference/6.2/core/beans/java/composing-configuration-classes.html#beans-java-using-import
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@Import(DataSourceConfig.class)
public class AppConfig {
    // 这里不用再写一遍 DataSource 的 @Bean
}

@Configuration
class DataSourceConfig {

    @Bean
    public String jdbcUrl() {
        return "jdbc:h2:mem:demo";
    }
}

// 启动后两个类里的 @Bean 都在同一个容器中

### property-source | @PropertySource | core
tagline: 把 properties 文件读进 Environment
plain: @PropertySource 把外部 .properties 文件读进 Spring 的 Environment，之后就能用 @Value("${key}") 或 environment.getProperty("key") 取值。它适合少量固定的配置文件；Spring Boot 项目通常由 application.properties 自动加载，不必手写。
since: Spring 3.1 | versionNote: null
keyPoints: ["value 是资源路径数组且必须写，如 classpath:app.properties。","同名 key 后加载的覆盖先加载的；系统属性和环境变量优先级更高。","ignoreResourceNotFound = true 时文件缺失不报错，适合可选配置。","中文内容建议显式设 encoding = \"UTF-8\"，否则按 Java properties 规范以 ISO-8859-1 解析。"]
attrs: value:String[]="—"; encoding:String=""""; ignoreResourceNotFound:boolean="false"; name:String=""""
notes: ["@PropertySource 只认 .properties 和 XML 形式的 properties，不认 YAML。","它不会覆盖已存在的系统属性或环境变量，值「没生效」时先查优先级，而不是怀疑注解没扫到。","配置项多起来之后改用 @ConfigurationProperties 绑定对象，比散落的 @Value 好维护。"]
docs: https://docs.spring.io/spring-framework/reference/6.2/core/beans/environment.html#beans-using-propertysource
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;

@Configuration
@PropertySource(value = "classpath:app.properties", encoding = "UTF-8")
public class AppProperties {

    @Value("${app.name}")
    private String appName;

    public String describe() {
        return "app = " + appName;
    }
}

// src/main/resources/app.properties:
// app.name=spring-demo

### value | @Value | core
tagline: 把配置值注入字段或参数
plain: @Value 用来把配置值塞进字段、方法参数或构造器参数。最常见是占位符写法 @Value("${app.name}")，从 properties、环境变量、命令行参数里取值；也支持 SpEL 表达式 #{}。适合零散的一两个配置，成组的配置项用 @ConfigurationProperties 绑定更省事。
since: Spring 3.0 | versionNote: null
keyPoints: ["占位符 ${key} 从 Environment 取值，没配又没写默认值，启动直接失败。","可以带默认值：@Value(\"${app.port:8080}\")，冒号后面就是兜底值。","支持 SpEL 表达式 #{...}，能调方法，但别把外部输入拼进表达式。","@Value 由 BeanPostProcessor 处理，在 BeanPostProcessor 自身里用它不生效。","优先写在构造器参数上，字段可以 final，对象创建完就是完整的。"]
attrs: value:String="—"
notes: ["配置缺失又没写默认值时，启动报 Could not resolve placeholder，尽早失败是好事，别用 try/catch 吞掉。","静态字段上标 @Value 不生效（容器注入不到 static 字段），需要的话用 setter 或构造器。","SpEL 能调用任意方法，拼接用户可控的字符串有风险，配置类里尤其注意。"]
docs: https://docs.spring.io/spring-framework/reference/6.2/core/beans/annotation-config/value-annotations.html
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class MailProperties {

    private final String host;
    private final int port;

    // ${mail.host} 必须在配置里存在；${mail.port:25} 缺省时用 25
    public MailProperties(@Value("${mail.host}") String host,
                          @Value("${mail.port:25}") int port) {
        this.host = host;
        this.port = port;
    }

    public String endpoint() {
        return host + ":" + port;
    }
}

### primary | @Primary | core
tagline: 多个候选里指定默认那个
plain: 同类型有多个 Bean、注入点又没点名时，Spring 不知道给谁。给其中一个候选标 @Primary，它就是默认答案，所有没写 @Qualifier 的注入都用它。适合有明确主实现的场景，比如主数据源、主时钟、主序列化器；显式点名优先于它。
since: Spring 3.0 | versionNote: null
keyPoints: ["只能标在类或 @Bean 方法上，标在字段、参数上不生效。","多个 @Primary 同时存在等于没标，注入照样因候选不唯一而失败。","@Qualifier 显式点名优先，@Primary 只决定没点名时的默认值。","Boot 自动配置常用 @Primary 提供默认实现，覆盖时自己定义同类型 Bean 再加 @Primary。"]
attrs: 
notes: ["@Primary 是「默认」，不是「唯一」：别的候选仍然存在，@Qualifier 依然能拿到。","覆盖自动配置的默认 Bean 时，常见做法是自己定义同类型 Bean 并标 @Primary。","两个候选都标 @Primary 属于配置错误，启动或注入时才暴露，别这么写。"]
docs: https://docs.spring.io/spring-framework/reference/6.2/core/beans/annotation-config/autowired-primary.html
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.time.Clock;
import java.time.ZoneId;

@Configuration
public class ClockConfig {

    @Bean
    @Primary
    public Clock systemClock() {
        return Clock.systemUTC();
    }

    @Bean
    public Clock shanghaiClock() {
        return Clock.system(ZoneId.of("Asia/Shanghai"));
    }
}

// 注入 Clock 时默认拿到 systemClock；
// 要另一个就写 @Qualifier("shanghaiClock")

### lazy | @Lazy | core
tagline: 第一次用到时才创建 Bean
plain: @Lazy 让 Bean 别在启动时创建，等第一次被用到再初始化。启动慢、Bean 又重（连数据库、加载大文件）时能省时间；标在注入点上则注入一个代理，真正调用方法时才去容器取目标对象，也常用来打断循环依赖。
since: Spring 3.0 | versionNote: null
keyPoints: ["value 默认 true；写 @Lazy(false) 可显式关掉，例如覆盖全局懒加载。","可以标在类、@Bean 方法、构造器、字段、参数上，注入点上的 @Lazy 生成代理。","延迟初始化把「启动就失败」推迟到「首次调用才失败」，错误发现得更晚。","全局开关是 @ComponentScan(lazyInit = true)，Boot 里还有 spring.main.lazy-initialization。"]
attrs: value:boolean="true"
notes: ["全局懒加载能缩短启动时间，但配置错误会推迟到运行期才暴露，生产环境慎用。","注入点的 @Lazy 只是代理，别在构造器里调用目标方法，否则等于立刻初始化。","循环依赖优先改设计；@Lazy 只是让容器能启动，不是架构问题的解药。"]
docs: https://docs.spring.io/spring-framework/reference/6.2/core/beans/dependencies/factory-lazy-init.html#lazy
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;

@Component
@Lazy
public class HeavyReportGenerator {

    public HeavyReportGenerator() {
        System.out.println("这个初始化很重，启动时先不做");
    }

    public String generate() {
        return "report";
    }
}

@Service
class ReportService {

    private final HeavyReportGenerator generator;

    // 注入点再标 @Lazy：拿到代理，调用 generate() 时才真正创建
    public ReportService(@Lazy HeavyReportGenerator generator) {
        this.generator = generator;
    }

    public String run() {
        return generator.generate();
    }
}

### profile | @Profile | core
tagline: 按环境决定 Bean 是否注册
plain: @Profile 给 Bean 打环境标签：只有激活了对应 profile，它才会注册。比如 @Profile("dev") 的测试数据源只在开发环境生效。激活方式有 spring.profiles.active、命令行参数，测试里用 @ActiveProfiles。没激活任何 profile 时，带 @Profile("default") 的才生效。
since: Spring 3.1 | versionNote: null
keyPoints: ["value 是字符串数组，写多个时任意一个激活就注册（或的关系）。","支持表达式：! 取反、& 与、| 或，例如 @Profile(\"prod & !canary\")。","标在 @Configuration 类上控制整类，标在 @Bean 方法上只控一个。","没激活任何 profile 时只有 default profile 生效，别把关键 Bean 只挂在某个环境上。"]
attrs: value:String[]="—"
notes: ["profile 名拼错不报错，只是什么都不注册；排查时先打印 Environment.getActiveProfiles()。","生产环境用 spring.profiles.active 显式指定；多个 profile 同时激活时注意同类型 Bean 冲突。","测试用 @ActiveProfiles(\"test\") 固定环境，别依赖本机变量。"]
docs: https://docs.spring.io/spring-framework/reference/6.2/core/beans/environment.html#beans-definition-profiles
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.sql.DataSource;

@Configuration
public class DataSourceConfig {

    @Bean
    @Profile("dev")
    public DataSource devDataSource() {
        // 开发环境：内存库，随进程消失
        return new DriverManagerDataSource("jdbc:h2:mem:dev", "sa", "");
    }

    @Bean
    @Profile("prod")
    public DataSource prodDataSource() {
        // 生产环境：实际项目应换成连接池数据源
        return new DriverManagerDataSource("jdbc:mysql://db:3306/app", "app", "secret");
    }
}

### dependson | @DependsOn | core
tagline: 强制先创建指定 Bean
plain: 大多数先后关系靠构造器注入就能表达，但有些只是「必须先生效」，并不持有引用，比如先建表再预热缓存。@DependsOn 就是显式声明：创建我这个 Bean 之前，先把指定名字的 Bean 创建好。它只影响初始化顺序，不建立注入关系。
since: Spring 3.0 | versionNote: null
keyPoints: ["value 写 Bean 名数组，容器保证这些 Bean 先初始化。","只能标在类或 @Bean 方法上，写的是名字不是类型，改名后要同步改。","它只影响初始化顺序，不建立注入关系，需要引用还是得注入。","被依赖的 Bean 不存在时启动失败，没有「可选依赖」语义。"]
attrs: value:String[]="{}"
notes: ["Bean 名是字符串，重构改方法名时容易漏改，建议把名字定义成常量复用。","初始化顺序优先用构造器注入表达；@DependsOn 只用于「无引用但需前置」的少数场景。","被依赖 Bean 是懒加载时，@DependsOn 会强制把它提前创建，注意别破坏懒加载设计。"]
docs: https://docs.spring.io/spring-framework/reference/6.2/core/beans/dependencies/factory-dependson.html
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;

@Configuration
public class CacheConfig {

    @Bean
    public SchemaInitializer schemaInitializer() {
        return new SchemaInitializer();
    }

    @Bean
    @DependsOn("schemaInitializer")
    public CacheWarmer cacheWarmer() {
        return new CacheWarmer();
    }

    static class SchemaInitializer {
        SchemaInitializer() {
            System.out.println("1. schema ready");
        }
    }

    static class CacheWarmer {
        CacheWarmer() {
            System.out.println("2. cache warmed");
        }
    }
}

### postconstruct | @PostConstruct | core
tagline: 依赖注入完成后做初始化
plain: @PostConstruct 标在方法上，容器把依赖都注入完之后调用一次，适合做初始化：校验配置、预热缓存、准备连接。它来自 Jakarta Annotation 规范，Boot 3 起包名是 jakarta.annotation，老项目的 javax 要换掉。构造器里依赖还没注入，所以这类事放这里做。
since:  | versionNote: null
keyPoints: ["执行时机在依赖注入之后、Bean 对外可用之前，此时注入的依赖都已就绪。","方法要无参、非 static、返回 void；一个类里保持一个初始化点，别写多个。","构造器执行时依赖还没注入，所以「运行前必须准备好」的逻辑放 @PostConstruct。","命名空间用 jakarta.annotation.PostConstruct，Boot 3 不再有 javax 版本。"]
attrs: 
notes: ["别在 @PostConstruct 里做长耗时阻塞操作，它会拖慢启动；重活考虑异步或 ApplicationReadyEvent。","同时存在 @PostConstruct 和 InitializingBean.afterPropertiesSet 时，前者先执行。","它属于 Bean 生命周期回调，不是构造器替代品：对象已创建、依赖已注入，才是它的时间点。"]
docs: https://docs.spring.io/spring-framework/reference/6.2/core/beans/annotation-config/postconstruct-and-predestroy-annotations.html , https://jakarta.ee/specifications/annotations/2.1/apidocs/jakarta.annotation/jakarta/annotation/PostConstruct.html
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class PriceCache {

    private final Map<String, Integer> prices = new HashMap<>();

    @PostConstruct
    public void warmUp() {
        // 依赖注入完成后执行：把基础数据加载进内存
        prices.put("apple", 5);
        prices.put("pear", 8);
        System.out.println("cache warmed, size = " + prices.size());
    }

    public int priceOf(String name) {
        return prices.getOrDefault(name, -1);
    }
}

### transactional-eventlistener | @TransactionalEventListener | core
tagline: 事务提交后才处理事件
plain: @TransactionalEventListener 是事务版的事件监听器：默认等发布事件的事务提交成功后才执行，事务回滚就不执行。适合「订单入库成功后发通知」这类必须跟事务同生共死的动作。用 phase 可以改成提交前、回滚后或完成时执行。
since: Spring 4.2 | versionNote: null
keyPoints: ["默认 phase = AFTER_COMMIT：事务提交后才调用；回滚则不调用。","phase 可选 BEFORE_COMMIT、AFTER_COMMIT、AFTER_ROLLBACK、AFTER_COMPLETION。","fallbackExecution = true 时没有事务也执行；默认 false，无事务就静默跳过。","只对事务中发布的事件生效，发布方通常要标 @Transactional。"]
attrs: phase:TransactionPhase="AFTER_COMMIT"; fallbackExecution:boolean="false"; condition:String=""""
notes: ["发布事件时没有事务，监听器默认什么都不做；排查「没反应」时先确认发布方法有没有 @Transactional。","AFTER_COMMIT 里监听器抛异常不会回滚已提交的数据，只能记日志或走补偿。","提交后才写库等于开启新事务，注意别在监听器里假设自己还处在原事务中。"]
docs: https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/event.html
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

class OrderPaidEvent {
    private final String orderId;

    OrderPaidEvent(String orderId) { this.orderId = orderId; }

    public String orderId() { return orderId; }
}

@Component
class PaidNotifier {

    // 事务提交成功后才执行；回滚则跳过
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPaid(OrderPaidEvent event) {
        System.out.println("notify buyer of " + event.orderId());
    }
}

@Service
public class PaymentService {

    private final ApplicationEventPublisher publisher;

    public PaymentService(ApplicationEventPublisher publisher) {
        this.publisher = publisher;
    }

    @Transactional
    public void pay(String orderId) {
        publisher.publishEvent(new OrderPaidEvent(orderId));
    }
}

### resource | @Resource | core
tagline: 按名字注入 Bean
plain: @Resource 是 Jakarta 规范的注入注解，Spring 支持它。默认按名字找 Bean：不写 name 时用字段名或 setter 对应的属性名；名字找不到再退回按类型匹配，此时和 @Autowired 接近。它来自 Java EE 时代，迁移老项目时很常见。
since:  | versionNote: null
keyPoints: ["默认按名字注入：name 不写时取字段名或 setter 对应的属性名。","名字匹配不到时回退按类型注入，有多个候选则仍可能失败。","只能标在字段或方法上，不支持构造器参数，所以用不了 final 字段。","lookup 用于 JNDI 场景，Spring 项目里很少用到。"]
attrs: name:String=""""; lookup:String=""""; authenticationType:AuthenticationType="CONTAINER"; shareable:boolean="true"
notes: ["改字段名会悄悄改变注入目标，最好显式写 @Resource(name = \"xxx\")，别依赖推断。","它不支持构造器注入，依赖不可变对象时还是用 @Autowired 的构造器注入。","Spring 项目内部优先用 @Autowired；@Resource 主要出现在 Java EE 迁移或标准注解风格代码里。"]
docs: https://docs.spring.io/spring-framework/reference/6.2/core/beans/annotation-config/resource.html , https://jakarta.ee/specifications/annotations/3.0/apidocs/jakarta.annotation/jakarta/annotation/Resource.html
import jakarta.annotation.Resource;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;

interface Notifier {
    void send(String msg);
}

@Component("smsNotifier")
class SmsNotifier implements Notifier {
    public void send(String msg) {
        System.out.println("sms: " + msg);
    }
}

@Service
public class AlertService {

    // 字段名 smsNotifier 就是 Bean 名，@Resource 默认按它找
    @Resource
    private Notifier smsNotifier;

    public void alert(String msg) {
        smsNotifier.send(msg);
    }
}

### before | @Before | aop
tagline: 方法执行前先跑一段
plain: @Before 是前置通知：匹配到切点的方法执行之前先跑一段逻辑。常用来做参数校验、打日志、设置上下文。它拿不到目标方法的返回值，但可以通过 JoinPoint 拿到方法名、参数和目标对象，比如 JoinPoint.getArgs()。
since:  | versionNote: null
keyPoints: ["value 写切点表达式，必填；也可以引用 @Pointcut 方法名。","方法可以声明 JoinPoint 参数，用来读方法名、参数、目标对象。","它改不了目标方法的返回值，也不能阻止方法执行，除非抛异常。","多个 @Before 的顺序由切面的 @Order 决定，别依赖声明顺序。"]
attrs: value:String="—"; argNames:String=""""
notes: ["在 @Before 里抛异常会阻止目标方法执行，可以做简易权限校验，但错误信息要写清楚原因。","想改入参得用 @Around 的 proceed(args)，@Before 只能读。","切点表达式直接写字符串最省事；多处复用时抽成 @Pointcut。"]
docs: https://docs.spring.io/spring-framework/reference/6.2/core/aop/ataspectj/advice.html#aop-advice-before
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class ParamCheckAspect {

    @Before("execution(* com.example.service.*.*(..))")
    public void check(JoinPoint joinPoint) {
        Object[] args = joinPoint.getArgs();
        String name = joinPoint.getSignature().getName();
        if (args.length == 0) {
            System.out.println("no args: " + name);
        }
    }
}

### after | @After | aop
tagline: 方法结束后一定执行
plain: @After 是最终通知：不管目标方法正常返回还是抛异常，只要执行过就会跑，类似 finally。适合释放资源、清理 ThreadLocal、还原上下文。它拿不到返回值；要拿返回值用 @AfterReturning，要处理异常用 @AfterThrowing。
since:  | versionNote: null
keyPoints: ["value 写切点表达式，必填，也可以引用 @Pointcut 方法。","正常返回和抛异常都会执行，相当于 finally 的时机。","拿不到返回值，也不能吞掉异常。","要按结果分流时，用 @AfterReturning 和 @AfterThrowing 更明确。"]
attrs: value:String="—"; argNames:String=""""
notes: ["finally 语义：目标方法抛异常时它照样执行，但异常会继续抛给调用方。","在 @After 里再抛异常会盖掉原来的异常，排查问题更难，清理逻辑本身要足够稳。","不同切面之间的执行顺序靠 @Order 决定，不要依赖「谁写在前面」。"]
docs: https://docs.spring.io/spring-framework/reference/6.2/core/aop/ataspectj/advice.html#aop-advice-after-finally
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.After;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class ContextCleanupAspect {

    @After("execution(* com.example.service.*.*(..))")
    public void cleanup(JoinPoint joinPoint) {
        // 无论目标方法成功还是抛异常都会走到这里
        String method = joinPoint.getSignature().toShortString();
        System.out.println("done: " + method);
    }
}

### afterthrowing | @AfterThrowing | aop
tagline: 抛异常后做记录或告警
plain: @AfterThrowing 在目标方法抛异常后执行，能拿到异常对象，适合统一记异常日志、发告警、做失败统计。它不能把异常变成正常返回：异常会继续抛给调用方，除非你在通知里显式处理掉。throwing 指定参数名接收异常。
since:  | versionNote: null
keyPoints: ["只有抛异常才执行；正常返回不触发。","throwing 指定接收异常的参数名，参数类型决定匹配哪类异常。","它不会改变异常流向，异常仍会抛给调用方。","value 写切点表达式，也可以用 pointcut 属性。"]
attrs: value:String=""""; throwing:String=""""; pointcut:String=""""; argNames:String=""""
notes: ["参数类型写 Exception 只接 Exception 及其子类；要连 Error 一起接就把类型写成 Throwable。","在通知里重新包装异常再抛出会覆盖原异常，调用方看到的是新异常，注意保留 cause。","它和 Spring MVC 的 @ExceptionHandler 不是一回事：一个在业务层兜，一个在控制层统一返回。"]
docs: https://docs.spring.io/spring-framework/reference/6.2/core/aop/ataspectj/advice.html#aop-advice-after-throwing
import org.aspectj.lang.annotation.AfterThrowing;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class ErrorLogAspect {

    @AfterThrowing(
            pointcut = "execution(* com.example.service.*.*(..))",
            throwing = "ex")
    public void logError(Exception ex) {
        System.err.println("service failed: " + ex.getMessage());
    }
}

### enable-aspectj-auto-proxy | @EnableAspectJAutoProxy | aop
tagline: 开启 @AspectJ 切面支持
plain: @EnableAspectJAutoProxy 开启 @AspectJ 风格的切面支持：让容器识别 @Aspect，并给目标 Bean 生成代理。Spring Boot 的自动配置已经默认开启，纯 Spring 项目才需要手写。proxyTargetClass 可强制 CGLIB 代理，exposeProxy 把当前代理暴露出来。
since: Spring 3.1 | versionNote: null
keyPoints: ["标在配置类上，等同于 XML 的 <aop:aspectj-autoproxy/>。","Spring Boot 由 AopAutoConfiguration 自动开启，不用手写；纯 Spring 项目才需要。","proxyTargetClass = true 强制 CGLIB 代理；默认有接口用 JDK 代理，没接口用 CGLIB。","exposeProxy = true 后可用 AopContext.currentProxy() 拿到当前代理。"]
attrs: proxyTargetClass:boolean="false"; exposeProxy:boolean="false"
notes: ["切面不生效时先确认代理是否生成：看注入的类型是不是代理对象，别急着怀疑切点表达式。","强制 CGLIB 后 final 类、final 方法依然不能被代理，报错时先检查类定义。","exposeProxy 依赖 AopContext 的 ThreadLocal，只在代理调用链里有效，不是通用方案。"]
docs: https://docs.spring.io/spring-framework/reference/6.2/core/aop/ataspectj/aspectj-support.html , https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/context/annotation/EnableAspectJAutoProxy.html
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.EnableAspectJAutoProxy;
import org.springframework.stereotype.Component;

@Configuration
@EnableAspectJAutoProxy
public class AopConfig {
    // 纯 Spring 项目在配置类上手动开启；
    // Spring Boot 自动配置已默认开启，不需要这行
}

@Aspect
@Component
class LogAspect {

    @Before("execution(* com.example.service.*.*(..))")
    public void log() {
        System.out.println("before service");
    }
}
