
### spring-boot-configuration | @SpringBootConfiguration | boot
tagline: 标记应用主配置类
plain: 专门用来标记「应用主配置类」的 @Configuration，语义比普通 @Configuration 更明确。@SpringBootApplication 里已经包含了它，所以平时不会单独写。只有你想手拼启动类、或不想用自动配置时，才需要它配合 @EnableAutoConfiguration、@ComponentScan 自己组一个入口。
since: Spring Boot 1.4.0 | versionNote: null
keyPoints: ["@Configuration 的 Boot 专用版本，表示这是应用主配置类","测试时 @SpringBootTest 不指定 classes 会向上查找带它的类","@SpringBootApplication 的元注解，正常项目不需要单独使用"]
attrs: proxyBeanMethods:boolean="true"
notes: ["测试类上的 @SpringBootTest 找不到配置类时，就会按包结构向上找带 @SpringBootConfiguration 的类。","@SpringBootApplication 已经包含它，重复加没有意义也不报错。","它继承自 @Configuration，所以 @Bean、@Import 等用法完全一样。"]
docs: https://docs.spring.io/spring-boot/3.5/api/java/org/springframework/boot/SpringBootConfiguration.html , https://docs.spring.io/spring-boot/3.5/reference/using/using-the-springbootapplication-annotation.html
package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.annotation.ComponentScan;

// 等价于一个 @SpringBootApplication，只是把三个注解拆开写
@SpringBootConfiguration
@EnableAutoConfiguration
@ComponentScan
public class ManualApplication {

    public static void main(String[] args) {
        SpringApplication.run(ManualApplication.class, args);
    }
}

### configuration-properties | @ConfigurationProperties | boot
tagline: 按前缀把配置绑到对象
plain: 把 application.yml、application.properties 里某个前缀下的配置，批量绑定到一个 Java 对象上，字段名自动对应配置名。相比一堆散落的 @Value，它类型安全、可嵌套、能校验，IDE 还能提示。需要配合 @EnableConfigurationProperties 或 @ConfigurationPropertiesScan 注册成 bean。
since: Spring Boot 1.0.0 | versionNote: null
keyPoints: ["prefix 指定前缀，字段名与配置名按 relaxed binding 自动匹配","支持构造器绑定（record 天然不可变），也支持 setter 绑定","可加 jakarta.validation 约束注解做校验，配合 @Validated 生效","ignoreUnknownFields 控制配置里多余的键是否报错"]
attrs: prefix:String=""; value:String=""; ignoreUnknownFields:boolean="true"; ignoreInvalidFields:boolean="false"
notes: ["构造器绑定要求类只有一个带参构造器，record 刚好满足；写多个构造器会绑定失败。","直接标 @Component 也能注册，但构造器绑定推荐用 @EnableConfigurationProperties 或扫描。","JSR-303 校验要加 @Validated（或构造器参数上的约束注解），否则约束不生效。"]
docs: https://docs.spring.io/spring-boot/3.5/reference/features/external-config.html#features.external-config.typesafe-configuration-properties , https://docs.spring.io/spring-boot/3.5/api/java/org/springframework/boot/context/properties/ConfigurationProperties.html
package com.example.demo.config;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

// 前缀 app.mail 对应 app.mail.host 这类配置项
@ConfigurationProperties(prefix = "app.mail")
public record MailProperties(
        @NotBlank String host,
        int port,
        String from) {
}

@Configuration
@EnableConfigurationProperties(MailProperties.class)
class MailConfig {
}

### auto-configuration | @AutoConfiguration | boot
tagline: 标注自动配置类的专用注解
plain: 写 starter 或公司内部组件时，把自动配置类标上它，Boot 才知道这是个自动配置。它等价于 @Configuration(proxyBeanMethods = false)，并且支持 before/after 控制与其他自动配置的先后顺序。类名还要登记到 AutoConfiguration.imports 清单里。
since: Spring Boot 2.7.0 | versionNote: @AutoConfiguration 是 Boot 2.7 新增的写法；官方迁移指南说明 Boot 3.0 起自动配置只能登记在 META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports，spring.factories 的注册方式已移除。
keyPoints: ["替代 @Configuration 标注自动配置类，默认不代理 @Bean 方法","before/after 指定必须早于或晚于哪些自动配置","注册清单在 META-INF/spring/...AutoConfiguration.imports","自动配置类内部通常叠加 @ConditionalOnClass 等条件注解"]
attrs: value:String=""; before:Class<?>[]="{}"; after:Class<?>[]="{}"; beforeName:String[]="{}"; afterName:String[]="{}"
notes: ["Boot 2.7 引入这个注解，Boot 3.0 起不再支持在 spring.factories 里注册自动配置，必须用 imports 清单。","多个自动配置之间的顺序按 before/after 做拓扑排序，写错会启动失败并提示循环依赖。","类本身不需要再标 @Configuration，标了也不会报错但重复。"]
docs: https://docs.spring.io/spring-boot/3.5/reference/features/developing-auto-configuration.html , https://docs.spring.io/spring-boot/3.5/api/java/org/springframework/boot/autoconfigure/AutoConfiguration.html
package com.example.demo.autoconfigure;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.context.annotation.Bean;

// 典型的自动配置类：条件满足才装配 bean
@AutoConfiguration(after = DataSourceAutoConfiguration.class)
@ConditionalOnClass(name = "com.example.demo.PayClient")
public class PayAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public PayTemplate payTemplate() {
        return new PayTemplate();
    }
}

class PayTemplate {
}

### conditional-on-missing-bean | @ConditionalOnMissingBean | boot
tagline: 没有这个 bean 才创建
plain: 自动配置里最常见的兜底注解：容器中不存在指定类型的 bean 时，才注册当前 @Bean。用户自己定义了同类型 bean，自动配置就让位，实现「默认配置可被覆盖」。官方建议只在自动配置类里使用，别在普通业务配置上滥用。
since: Spring Boot 1.0.0 | versionNote: null
keyPoints: ["按类型、名称或注解判断容器里是否已有 bean","search 控制搜索范围，默认 ALL","ignored 可以忽略某些 bean 类型","只在自动配置类里用，且要保证排在用户配置之后"]
attrs: value:Class<?>[]="{}"; name:String[]="{}"; type:String[]="{}"; annotation:Class<?>[]="{}"; search:SearchStrategy="ALL"; ignored:Class<?>[]="{}"
notes: ["判断发生在用户 bean 注册之后，所以自动配置类的位置要靠后（用 @AutoConfiguration 的 after）。","参数尽量用 Class，如果目标类可能不存在就用 name / type 写字符串。","与 @ConditionalOnBean 语义相反，一个要求有、一个要求没有。"]
docs: https://docs.spring.io/spring-boot/3.5/reference/features/developing-auto-configuration.html#features.developing-auto-configuration.condition-annotations , https://docs.spring.io/spring-boot/3.5/api/java/org/springframework/boot/autoconfigure/condition/ConditionalOnMissingBean.html
package com.example.demo.autoconfigure;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;

@AutoConfiguration
public class JsonAutoConfiguration {

    @Bean
    // 容器里还没有同名 bean 才创建，允许用户覆盖
    @ConditionalOnMissingBean
    public ObjectMapper objectMapper() {
        return new ObjectMapper();
    }
}

### conditional-on-bean | @ConditionalOnBean | boot
tagline: 有指定 bean 才生效
plain: 与 @ConditionalOnMissingBean 相反：容器中已经存在指定类型、名称或注解的 bean 时才注册当前 bean。适合「用户提供了某个组件，我再补上配套组件」的自动配置场景。官方同样建议只在自动配置类里使用。
since: Spring Boot 1.0.0 | versionNote: null
keyPoints: ["按类型、名称或注解匹配已有 bean","search 默认 ALL，可限制只查当前上下文","顺序敏感：判断时目标 bean 必须已经注册"]
attrs: value:Class<?>[]="{}"; name:String[]="{}"; type:String[]="{}"; annotation:Class<?>[]="{}"; search:SearchStrategy="ALL"
notes: ["它依赖 bean 已注册，自动配置类要用 after 排到提供该 bean 的配置后面。","只看已注册的 bean 定义，不触发初始化；不要拿它判断自己刚注册的 bean。","与 @ConditionalOnMissingBean 正好相反，按兜底还是按搭配选。"]
docs: https://docs.spring.io/spring-boot/3.5/reference/features/developing-auto-configuration.html#features.developing-auto-configuration.condition-annotations , https://docs.spring.io/spring-boot/3.5/api/java/org/springframework/boot/autoconfigure/condition/ConditionalOnBean.html
package com.example.demo.autoconfigure;

import javax.sql.DataSource;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.context.annotation.Bean;

@AutoConfiguration(after = DataSourceAutoConfiguration.class)
public class AuditAutoConfiguration {

    @Bean
    // 容器里有 DataSource 才装配
    @ConditionalOnBean(DataSource.class)
    public AuditRecorder auditRecorder(DataSource dataSource) {
        return new AuditRecorder(dataSource);
    }
}

class AuditRecorder {
    AuditRecorder(DataSource dataSource) {
    }
}

### conditional-on-resource | @ConditionalOnResource | boot
tagline: 资源存在才装配
plain: 检查某个资源是否存在，存在才让配置生效。资源用 Spring 的 Resource 写法，比如 classpath:app-feature.yml、file:/etc/app.conf。适合「有配置文件才启用」的场景，例如检测到某份配置才装配对应的加载器。
since: Spring Boot 1.0.0 | versionNote: null
keyPoints: ["resources 写 Spring Resource 位置（classpath: / file:）","多个资源写成数组","只判断存在性，不解析内容"]
attrs: resources:String[]="{}"
notes: ["通配符支持有限，建议写明确路径，避免判断结果和预期不一致。","资源判断发生在配置类解析阶段，此时依赖还没有完全初始化。","可以和 @ConditionalOnProperty 搭配，做更细的启用控制。"]
docs: https://docs.spring.io/spring-boot/3.5/reference/features/developing-auto-configuration.html#features.developing-auto-configuration.condition-annotations , https://docs.spring.io/spring-boot/3.5/api/java/org/springframework/boot/autoconfigure/condition/ConditionalOnResource.html
package com.example.demo.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnResource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
// 配置文件存在时才创建这个 bean
@ConditionalOnResource(resources = "classpath:app-feature.yml")
public class FeatureFileConfig {

    @Bean
    public FeatureLoader featureLoader() {
        return new FeatureLoader();
    }
}

class FeatureLoader {
}

### import-auto-configuration | @ImportAutoConfiguration | boot
tagline: 只导入指定的自动配置
plain: 手动导入若干个自动配置类，顺序规则和 @EnableAutoConfiguration 一样，但只装配你列出的那些，不会全量扫描。测试切片里特别有用：可以精确控制某个测试只加载需要的自动配置，既快又不会缺 bean。
since: Spring Boot 1.3.0 | versionNote: null
keyPoints: ["value / classes 列出要导入的自动配置类","exclude 排除其中一部分","测试切片常用，普通应用还是用 @EnableAutoConfiguration"]
attrs: value:Class<?>[]="{}"; classes:Class<?>[]="{}"; exclude:Class<?>[]="{}"
notes: ["排序规则与 @EnableAutoConfiguration 一致，仍受 @AutoConfiguration 的 before/after 影响。","普通应用直接 @SpringBootApplication 即可，不要用它替代自动配置全量扫描。","漏了某个自动配置就会缺 bean，排查时先看这里列了哪些。"]
docs: https://docs.spring.io/spring-boot/3.5/api/java/org/springframework/boot/autoconfigure/ImportAutoConfiguration.html , https://docs.spring.io/spring-boot/3.5/reference/features/developing-auto-configuration.html
package com.example.demo;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.autoconfigure.jackson.JacksonAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
// 测试里只导入需要的自动配置类
@ImportAutoConfiguration({
        DataSourceAutoConfiguration.class,
        JacksonAutoConfiguration.class
})
class RepositorySliceTest {

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Test
    void contextLoads() {
        assertThat(jdbcTemplate).isNotNull();
    }
}

### web-mvc-test | @WebMvcTest | test
tagline: 只测 MVC 层的切片测试
plain: 只装配 MVC 相关组件：控制器、@ControllerAdvice、过滤器、消息转换器等，不加载 Service 和 Repository。默认还会配好 MockMvc 和 Spring Security，适合快速测接口路由、参数校验、状态码。依赖的协作对象用 @MockitoBean 提供。
since: Spring Boot 1.4.0 | versionNote: null
keyPoints: ["只扫 @Controller、@ControllerAdvice 等 MVC 组件","默认装配 MockMvc 与 Spring Security","controllers 可限定只加载某几个控制器"]
attrs: value:Class<?>[]="{}"; controllers:Class<?>[]="{}"; properties:String[]="{}"; excludeAutoConfiguration:Class<?>[]="{}"; useDefaultFilters:boolean="true"
notes: ["报 404 时先看控制器是不是被切片的过滤规则排除了。","需要真实 Service 时用 @Import 引入，别指望切片测试自己扫。","Security 默认生效，测无权限接口记得加 @WithMockUser。"]
docs: https://docs.spring.io/spring-boot/3.5/reference/testing/spring-boot-applications.html , https://docs.spring.io/spring-boot/3.5/api/java/org/springframework/boot/test/autoconfigure/web/servlet/WebMvcTest.html
package com.example.demo.web;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
// 只加载 MVC 组件，Service 用 @MockitoBean 顶替
@WebMvcTest(OrderController.class)
class OrderControllerTest {
    @Autowired
    MockMvc mockMvc;
    @MockitoBean
    OrderService orderService;
    @Test
    void returnsOrder() throws Exception {
        given(orderService.findById(1L)).willReturn(new Order(1L, "book"));
        mockMvc.perform(get("/orders/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("book"));
    }
}
@RestController
class OrderController {
    private final OrderService orderService;
    OrderController(OrderService orderService) { this.orderService = orderService; }
    @GetMapping("/orders/{id}")
    Order get(@PathVariable Long id) {
        return orderService.findById(id);
    }
}
record Order(Long id, String name) {
}
interface OrderService {
    Order findById(Long id);
}

### data-jpa-test | @DataJpaTest | test
tagline: 只测 JPA 与仓储层
plain: 只装配 JPA 相关组件：实体、Repository、DataSource、EntityManager，不加载 Service 和 MVC。默认用内嵌内存数据库替换真实数据源，每个测试方法跑在事务里、结束后回滚，测试之间互不影响。showSql 默认开着，方便看生成的 SQL。
since: Spring Boot 1.4.0 | versionNote: null
keyPoints: ["默认内嵌数据库 + 事务回滚，测试间互不影响","可注入 TestEntityManager 造数据","bootstrapMode 控制 JPA 初始化时机，excludeAutoConfiguration 可排除自动配置"]
attrs: properties:String[]="{}"; showSql:boolean="true"; excludeAutoConfiguration:Class<?>[]="{}"; bootstrapMode:BootstrapMode="DEFAULT"; excludeFilters:Filter[]="{}"; useDefaultFilters:boolean="true"; includeFilters:Filter[]="{}"
notes: ["要连真实数据库时加 @AutoConfigureTestDatabase(replace = NONE)。","默认每个测试方法一个事务并回滚，别在测试里手动提交。","只扫 JPA 相关组件，Repository 里自定义的其它依赖要自己 @Import。"]
docs: https://docs.spring.io/spring-boot/3.5/reference/testing/spring-boot-applications.html , https://docs.spring.io/spring-boot/3.5/api/java/org/springframework/boot/test/autoconfigure/orm/jpa/DataJpaTest.html
package com.example.demo.repository;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import static org.assertj.core.api.Assertions.assertThat;
// 默认内存库 + 事务回滚，测试之间互不影响
@DataJpaTest
class OrderRepositoryTest {
    @Autowired
    TestEntityManager em;
    @Test
    void persistsOrder() {
        Order saved = em.persistAndFlush(new Order("PAID"));
        assertThat(saved.getId()).isNotNull();
        assertThat(em.find(Order.class, saved.getId()).getStatus()).isEqualTo("PAID");
    }
    @Entity
    static class Order {
        @Id
        @GeneratedValue
        private Long id;
        private String status;
        Order() {
        }
        Order(String status) {
            this.status = status;
        }
        Long getId() {
            return id;
        }
        String getStatus() {
            return status;
        }
    }
}

### json-test | @JsonTest | test
tagline: 只测 JSON 序列化
plain: 只装配 JSON 序列化相关组件（Jackson、Gson 或 Jsonb），并自动往测试类里注入对应的 Tester 字段，比如 JacksonTester。适合验证字段名、日期格式、忽略字段这些序列化规则。启动快，不碰数据库和 Web 层。
since: Spring Boot 1.4.0 | versionNote: null
keyPoints: ["自动配置 JacksonTester / GsonTester / JsonbTester 字段","只加载 JSON 序列化相关 bean","用 @JsonComponent 注册的自定义序列化器也会被装配"]
attrs: properties:String[]="{}"; excludeAutoConfiguration:Class<?>[]="{}"; excludeFilters:Filter[]="{}"; useDefaultFilters:boolean="true"; includeFilters:Filter[]="{}"
notes: ["不加载 @Component / @Service，需要它们参与序列化时用 @Import。","日期格式由 spring.jackson.* 控制，测试里可以用 properties 临时改。","想验证反序列化用 json.parse(...) 搭配断言即可。"]
docs: https://docs.spring.io/spring-boot/3.5/reference/testing/spring-boot-applications.html , https://docs.spring.io/spring-boot/3.5/api/java/org/springframework/boot/test/autoconfigure/json/JsonTest.html
package com.example.demo.json;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.json.JsonTest;
import org.springframework.boot.test.json.JacksonTester;

import static org.assertj.core.api.Assertions.assertThat;

@JsonTest
class BookJsonTest {

    @Autowired
    JacksonTester<Book> json;

    private final Book book = new Book("Spring 实战", "Craig Walls");

    @Test
    void serializesTitle() throws Exception {
        assertThat(json.write(book)).hasJsonPathStringValue("@.title");
        assertThat(json.write(book))
                .extractingJsonPathStringValue("@.title")
                .isEqualTo("Spring 实战");
    }
}

record Book(String title, String author) {
}

### mockito-spy-bean | @MockitoSpyBean | test
tagline: 包一层 spy，保留真实逻辑
plain: 把容器里的真实 bean 包成 Mockito spy：默认仍然执行真实方法，只在你打桩或 verify 的地方被拦下来。适合「大部分逻辑要真跑，只想验证某个方法有没有被调用」的场景，比全量 mock 更接近真实行为。
since: Spring Framework 6.2 | versionNote: @MockitoSpyBean 与 @MockitoBean 同为 Spring Framework 6.2 引入的 bean 覆盖注解，用于替代已废弃的 @MockBean（spy 场景）。
keyPoints: ["默认调用真实方法，可局部打桩","用 verify 检查方法被调用次数和参数","reset 默认 AFTER，测试方法执行后重置"]
attrs: name:String=""; reset:MockReset="AFTER"; value:String=""; types:Class<?>[]="{}"; contextName:String=""
notes: ["spy 会走真实逻辑，外部依赖（数据库、HTTP）仍然需要自己控制。","对 final 类和 final 方法无效，这是 Mockito 的限制。","只需要造桩、不关心真实逻辑时用 @MockitoBean 更直接。"]
docs: https://docs.spring.io/spring-framework/reference/testing/annotations/integration-spring/annotation-mockitobean.html , https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/test/context/bean/override/mockito/MockitoSpyBean.html
package com.example.demo;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
@SpringBootTest
class ReportServiceTest {
    // 真实 bean 包成 spy，默认仍执行真实逻辑
    @MockitoSpyBean
    ReportFormatter formatter;
    @Autowired
    ReportService service;
    @Test
    void formatsOnce() {
        service.render("q1");
        verify(formatter, times(1)).format("q1");
    }
}
@Component
class ReportFormatter {
    String format(String quarter) {
        return "report:" + quarter;
    }
}
@Service
class ReportService {
    private final ReportFormatter formatter;
    ReportService(ReportFormatter formatter) {
        this.formatter = formatter;
    }
    String render(String quarter) {
        return formatter.format(quarter);
    }
}

### auto-configure-mock-mvc | @AutoConfigureMockMvc | test
tagline: 给测试自动配好 MockMvc
plain: @SpringBootTest 默认不配 MockMvc；加上它就会按当前应用上下文自动配置 MockMvc，注入后可直接发模拟请求。addFilters 控制过滤器链（含 Security）是否生效，print 控制每次请求后是否打印请求响应细节，排查 403、404 很方便。
since: Spring Boot 1.4.0 | versionNote: null
keyPoints: ["不用起真实服务器就能发请求","addFilters = true 时 Security 过滤器链生效","print / printOnlyOnFailure 控制调试输出"]
attrs: print:MockMvcPrint="DEFAULT"; webDriverEnabled:boolean="true"; webClientEnabled:boolean="true"; printOnlyOnFailure:boolean="true"; addFilters:boolean="true"
notes: ["只测 MVC 层时 @WebMvcTest 更轻，它自带 MockMvc。","默认 webEnvironment = MOCK 才能用；起真实端口后应改用 TestRestTemplate。","想看请求响应细节可以设 print = MockMvcPrint.SYSTEM_OUT。"]
docs: https://docs.spring.io/spring-boot/3.5/reference/testing/spring-boot-applications.html , https://docs.spring.io/spring-boot/3.5/api/java/org/springframework/boot/test/autoconfigure/web/servlet/AutoConfigureMockMvc.html
package com.example.demo;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
// @SpringBootTest 默认不配 MockMvc，加它才有
@AutoConfigureMockMvc
class HelloApiTest {

    @Autowired
    MockMvc mockMvc;

    @Test
    void hello() throws Exception {
        mockMvc.perform(get("/hello"))
                .andExpect(status().isOk())
                .andExpect(content().string("hello"));
    }
}

### active-profiles | @ActiveProfiles | test
tagline: 指定测试激活的 profile
plain: 声明加载测试上下文时激活哪些 Spring profile，等价于设置 spring.profiles.active。常用来让测试读 application-test.yml、换测试数据源或关掉某些自动配置。写在测试类上只影响这个测试，不污染生产配置。
since: Spring Framework 3.1 | versionNote: null
keyPoints: ["等价于 spring.profiles.active，但只作用在测试上下文","profiles 是 value 的别名，可写多个","声明后 JVM 系统属性 spring.profiles.active 不再生效"]
attrs: value:String[]="{}"; profiles:String[]="{}"
notes: ["只在测试类上生效，不影响生产运行。","active profile 会参与测试上下文缓存 key，不同 profile 的上下文分开缓存。","声明后系统属性 spring.profiles.active 会被忽略，排查配置时留意。"]
docs: https://docs.spring.io/spring-framework/reference/testing/annotations/integration-spring/annotation-activeprofiles.html , https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/test/context/ActiveProfiles.html
package com.example.demo;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
// 激活 test profile，读取 application-test.yml
@ActiveProfiles("test")
class ProfileAwareTest {

    @Value("${app.name}")
    String appName;

    @Test
    void usesTestProfile() {
        assertThat(appName).isEqualTo("test-app");
    }
}

### enable-web-security | @EnableWebSecurity | security
tagline: 打开 Spring Security 的 Web 支持
plain: 加在 @Configuration 类上，开启 Spring Security 的 Web 安全支持：让安全过滤器链、登录登出、请求授权这些能力接入 MVC 请求。典型写法是再声明一个 SecurityFilterChain bean，用它定义哪些路径放行、哪些要登录，取代过去继承 WebSecurityConfigurerAdapter 的老写法。
since: Spring Security 3.2 | versionNote: null
keyPoints: ["开启 Web 安全，注册 springSecurityFilterChain 过滤器","配合 SecurityFilterChain bean 定义授权规则","非 Web 项目不需要它，方法级安全用 @EnableMethodSecurity"]
attrs: 
notes: ["Security 6 里没有 WebSecurityConfigurerAdapter 了，改成声明 SecurityFilterChain bean。","它只管 Web 请求；方法级注解要另外加 @EnableMethodSecurity。","一个应用只需一处 @EnableWebSecurity，重复加没有意义。"]
docs: https://docs.spring.io/spring-security/reference/servlet/configuration/java.html
package com.example.demo.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
// 自定义过滤链：公开路径放行，其余要登录
@EnableWebSecurity
class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/public/**").permitAll()
                        .anyRequest().authenticated())
                .formLogin(withDefaults())
                .httpBasic(withDefaults());
        return http.build();
    }
}

### enable-method-security | @EnableMethodSecurity | security
tagline: 开启方法级权限校验
plain: 加在 @Configuration 类上，开启方法级安全：@PreAuthorize、@PostAuthorize、@PreFilter、@PostFilter 才会生效。prePostEnabled 默认就是 true。注意 Spring Boot 的 Security starter 默认并不开启方法级授权，想用这些注解必须显式加它。
since: Spring Security 5.6 | versionNote: 官方文档：@EnableMethodSecurity 取代 @EnableGlobalMethodSecurity；且 Spring Boot Starter Security 默认不开启方法级授权，必须显式声明。
keyPoints: ["替代已废弃的 @EnableGlobalMethodSecurity","prePostEnabled 默认 true，@PreAuthorize 系列开箱可用","securedEnabled / jsr250Enabled 分别打开 @Secured 与 JSR-250"]
attrs: prePostEnabled:boolean="true"; securedEnabled:boolean="false"; jsr250Enabled:boolean="false"; mode:AdviceMode="PROXY"; offset:int="0"
notes: ["Boot 的 Security starter 默认不开方法级授权，只加注解不生效时先检查这里。","官方文档明确它取代 @EnableGlobalMethodSecurity，老项目可以照迁移小节改。","需要 @Secured 或 JSR-250 时分别设 securedEnabled / jsr250Enabled = true。"]
docs: https://docs.spring.io/spring-security/reference/servlet/authorization/method-security.html
package com.example.demo.security;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.stereotype.Service;

@Configuration
@EnableMethodSecurity
class MethodSecurityConfig {
    // prePostEnabled 默认就是 true，这里不用显式写
}

@Service
class DocumentService {

    @PreAuthorize("hasRole('ADMIN')")
    String adminOnly() {
        return "ok";
    }
}

### secured | @Secured | security
tagline: 老式角色校验注解
plain: 较老的方法级校验注解：属性里列一组角色名，当前用户至少有其中一个才能调用。需要 @EnableMethodSecurity(securedEnabled = true) 才会生效。官方已把它标为 legacy，推荐改用表达能力更强的 @PreAuthorize。
since:  | versionNote: Spring Security 官方文档已把 @Secured 标为 legacy 选项，并明确推荐改用 @PreAuthorize。
keyPoints: ["value 写完整权限名，如 ROLE_ADMIN","必须显式开启 securedEnabled = true","legacy 选项，新代码优先 @PreAuthorize"]
attrs: value:String[]="—"
notes: ["值要写完整权限名，官方示例是 ROLE_USER 这种带前缀的写法。","不开启 securedEnabled 时注解会被直接忽略，排查权限问题先看这里。","官方文档：@Secured is a legacy option，推荐用 @PreAuthorize 取代。"]
docs: https://docs.spring.io/spring-security/reference/servlet/authorization/method-security.html
package com.example.demo.security;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.annotation.Secured;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.stereotype.Service;

@Configuration
@EnableMethodSecurity(securedEnabled = true)
class SecuredConfig {
}

@Service
class ReportService {

    // 先开 securedEnabled，@Secured 才会生效
    @Secured("ROLE_ADMIN")
    String secretReport() {
        return "report";
    }
}

### roles-allowed | @RolesAllowed | security
tagline: JSR-250 标准角色注解
plain: JSR-250 标准注解，不属于 Spring 专有：列出允许调用方法的角色。需要 @EnableMethodSecurity(jsr250Enabled = true) 才会生效，而且默认会补 ROLE_ 前缀，所以写 ADMIN 实际比对 ROLE_ADMIN。同族的还有 @PermitAll 和 @DenyAll。
since:  | versionNote: JSR-250 标准注解；Boot 3 起 Jakarta EE 使用 jakarta 包（官方迁移指南：Jakarta EE now uses jakarta packages rather than javax），包名由 javax.annotation.security 变为 jakarta.annotation.security。
keyPoints: ["标准 JSR-250 注解，不绑定 Spring 实现","需要显式开启 jsr250Enabled = true","角色默认加 ROLE_ 前缀，ADMIN 即 ROLE_ADMIN"]
attrs: value:String[]="—"
notes: ["默认角色前缀是 ROLE_（见 Jsr250AuthorizationManager），所以 \"ADMIN\" 对应 ROLE_ADMIN。","类上也能标，表示该类所有方法都要求这些角色。","同族的 @PermitAll / @DenyAll 也在 jsr250Enabled 打开后生效。"]
docs: https://docs.spring.io/spring-security/reference/servlet/authorization/method-security.html , https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Migration-Guide
package com.example.demo.security;

import jakarta.annotation.security.RolesAllowed;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.stereotype.Service;

@Configuration
@EnableMethodSecurity(jsr250Enabled = true)
class Jsr250Config {
}

@Service
class BillingService {

    // 先开 jsr250Enabled，JSR-250 注解才会生效
    @RolesAllowed({"ADMIN", "BILLING"})
    String invoice() {
        return "invoice";
    }
}
