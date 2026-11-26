
### post-mapping | @PostMapping | web
tagline: POST 提交的快捷映射
plain: @PostMapping 是 @RequestMapping(method = POST) 的简写，用来处理创建资源、提交表单这类会改变服务端状态的请求。请求体通常配合 @RequestBody 解析 JSON。它本身不校验数据，记得再加 @Valid 和约束注解，否则脏数据会直接写进数据库。表单重复提交很常见，靠令牌或幂等键在服务端拦住。
since: Spring 4.3 | versionNote: undefined
keyPoints: ["等价于 @RequestMapping(method = RequestMethod.POST)，只匹配 POST。","表单和 JSON 都能收，但接收方式不同：表单用对象参数或 @ModelAttribute，JSON 用 @RequestBody。","创建资源想返回 201 + Location 时，用 ResponseEntity 或 @ResponseStatus(HttpStatus.CREATED)。","同一个路径可以和 GET 方法共存，Spring 按 HTTP 方法区分。"]
attrs: name:String=""; value:String[]="{}"; path:String[]="{}"; params:String[]="{}"; headers:String[]="{}"; consumes:String[]="{}"; produces:String[]="{}"
notes: ["POST 不幂等，客户端重试要靠幂等键或去重表，别指望框架兜底。","浏览器地址栏发不了请求体，GET 请求里拿不到 @RequestBody。","表单提交（application/x-www-form-urlencoded）用 @RequestBody 收不到，要用对象参数绑定。"]
docs: https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/web/bind/annotation/PostMapping.html , https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-requestmapping.html
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class OrderController {

    // POST /orders，请求体是 JSON
    @PostMapping("/orders")
    @ResponseStatus(HttpStatus.CREATED)
    public Order create(@RequestBody CreateOrder cmd) {
        return new Order(1001L, cmd.productId(), cmd.qty());
    }

    public record CreateOrder(Long productId, int qty) {
    }

    public record Order(Long id, Long productId, int qty) {
    }
}

### put-mapping | @PutMapping | web
tagline: 整体更新用 PUT 映射
plain: @PutMapping 对应 HTTP PUT，语义是整体替换一个资源：客户端要把完整对象传上来，服务端按 id 覆盖。它适合编辑表单的提交。相比 PATCH，PUT 要求字段全量，缺失字段会被当成要清空，所以只想改一两个字段时别硬套 PUT。编辑表单回填时，先把详情查出来再整体提交即可。
since: Spring 4.3 | versionNote: undefined
keyPoints: ["等价于 @RequestMapping(method = RequestMethod.PUT)，只匹配 PUT。","PUT 按规范是幂等的：同一个请求重复发送，结果应保持一致。","更新成功通常返回 200 或 204（无内容），不要默认依赖 302。","路径里的 id 用 @PathVariable 取，请求体用 @RequestBody 接。"]
attrs: name:String=""; value:String[]="{}"; path:String[]="{}"; params:String[]="{}"; headers:String[]="{}"; consumes:String[]="{}"; produces:String[]="{}"
notes: ["PUT 是整体替换：请求体没带的字段应当被清空，不想清空就改用 PATCH。","路径 id 与请求体 id 可能不一致，以路径为准并显式校验。","更新不存在的资源要返回 404，不要悄悄新建一条。"]
docs: https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/web/bind/annotation/PutMapping.html , https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-requestmapping.html
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserController {

    // PUT /users/7，整体替换
    @PutMapping("/users/{id}")
    public ResponseEntity<User> replace(@PathVariable Long id,
                                        @RequestBody User form) {
        return ResponseEntity.ok(new User(id, form.name(), form.email()));
    }

    public record User(Long id, String name, String email) {
    }
}

### delete-mapping | @DeleteMapping | web
tagline: 删除资源用 DELETE
plain: @DeleteMapping 对应 HTTP DELETE，标准语义是删除路径指定的资源。实际项目里很多团队改成逻辑删除（置 deleted 标记）后再用它。删除成功通常返回 204，不返回内容；批量删除时不要把大量 id 拼进查询串，超过长度限制会直接失败。删除接口要做好鉴权，别让普通用户删掉别人的数据。
since: Spring 4.3 | versionNote: undefined
keyPoints: ["等价于 @RequestMapping(method = RequestMethod.DELETE)，只匹配 DELETE。","成功且无响应体时返回 204 No Content，用 ResponseEntity.noContent() 最直接。","DELETE 也是幂等的：删不存在的资源返回 404 或 204 都行，但团队内要统一。","浏览器表单只支持 GET/POST，前端删除要用 fetch 或 axios 发 DELETE。"]
attrs: name:String=""; value:String[]="{}"; path:String[]="{}"; params:String[]="{}"; headers:String[]="{}"; consumes:String[]="{}"; produces:String[]="{}"
notes: ["路径变量类型不匹配（比如 id 传字母）时，Spring 直接返回 400，不是 404。","删除前要校验权限与数据归属，别仅凭 URL 里的 id 就删。","DELETE 带请求体不是普遍约定，部分代理会丢弃，尽量用路径或查询参数。"]
docs: https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/web/bind/annotation/DeleteMapping.html , https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-requestmapping.html
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class FileController {

    // DELETE /files/99
    @DeleteMapping("/files/{id}")
    public ResponseEntity<Void> remove(@PathVariable Long id) {
        return ResponseEntity.noContent().build();
    }

    // 批量删除：DELETE /files?ids=1,2,3
    @DeleteMapping("/files")
    public ResponseEntity<Void> removeBatch(@RequestParam List<Long> ids) {
        return ResponseEntity.noContent().build();
    }
}

### request-param | @RequestParam | web
tagline: 绑定查询参数和表单字段
plain: @RequestParam 把 URL 查询串（?page=2）或表单字段绑到方法参数上。查询参数是可选的，所以要么给 defaultValue，要么把 required 设成 false，否则参数一缺就返回 400。它不负责 JSON 请求体，JSON 请用 @RequestBody。名字对不上时用 name 或 value 指定。分页、排序、筛选这类查询条件都放在查询串里，不要塞进请求体。
since: Spring 2.5 | versionNote: undefined
keyPoints: ["name 和 value 互为别名；不写时按编译期参数名推断，需 -parameters 或显式指定。","required 默认 true，缺参数抛 MissingServletRequestParameterException 变成 400；设了 defaultValue 会自动变成 false。","defaultValue 是字符串，Spring 会按目标类型做类型转换。","它绑定查询参数与表单数据，不是 JSON 请求体。"]
attrs: name:String=""; value:String=""; defaultValue:String="ValueConstants.DEFAULT_NONE"; required:boolean="true"
notes: ["参数名依赖编译期 -parameters，没有该选项时请显式写 name，否则可能取到 arg0。","defaultValue 写字符串也一样会做类型转换，比如 defaultValue = \"1\"。","用 @RequestParam 收 JSON 一定拿不到值，那是 @RequestBody 的活。"]
docs: https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/web/bind/annotation/RequestParam.html , https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/requestparam.html
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SearchController {

    // GET /search?keyword=spring&page=1&size=20
    @GetMapping("/search")
    public String search(@RequestParam(name = "keyword") String keyword,
                         @RequestParam(defaultValue = "1") int page,
                         @RequestParam(defaultValue = "20") int size) {
        return "keyword=" + keyword + ", page=" + page + ", size=" + size;
    }

    // 可选参数：不传也能进方法
    @GetMapping("/filter")
    public String filter(@RequestParam(required = false) String category) {
        return "category=" + category;
    }
}

### response-body | @ResponseBody | web
tagline: 直接把返回值写进响应体
plain: @ResponseBody 放在方法或类上，表示返回值不再当视图名，而是由 HttpMessageConverter 序列化后写进 HTTP 响应体。@RestController 就是 @Controller 加类级 @ResponseBody。返回对象默认变 JSON；返回 String 时直接是文本，不会去找 JSP/Thymeleaf 模板。接口同时提供页面和 JSON 时，按方法分别控制返回值格式即可。
since: Spring 3.0 | versionNote: undefined
keyPoints: ["方法级优先，类级对该类所有方法生效。","序列化格式由 produces 和消息转换器决定，默认 JSON（有 Jackson 时）。","返回 String 时默认 text/plain，不是 HTML；要返回 HTML 得显式配 produces。","与 @ResponseStatus、ResponseEntity 搭配可以控制状态码和响应头。"]
attrs: 
notes: ["在 @RestController 类里再写 @ResponseBody 是多余的。","String 返回值容易被误认为页面名：想返回 HTML 要设置 produces 为 text/html。","返回值是 null 时默认 200 且响应体为空，不是 404。"]
docs: https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/web/bind/annotation/ResponseBody.html , https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/responsebody.html
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.Map;

@Controller
public class LegacyController {

    // 方法级 @ResponseBody：返回 Map 序列化成 JSON
    @GetMapping("/legacy/ping")
    @ResponseBody
    public Map<String, Object> ping() {
        return Map.of("ok", true, "msg", "pong");
    }

    // 同一个类里仍可返回视图名，走模板解析
    @GetMapping("/legacy/page")
    public String page() {
        return "legacy/page";
    }
}

### request-header | @RequestHeader | web
tagline: 读取请求头里的值
plain: @RequestHeader 把 HTTP 请求头（比如 Authorization、User-Agent）绑到方法参数。请求头并不都是必传的，默认 required=true 时缺失会 400，所以通常要配 defaultValue 或 required=false。做鉴权、幂等键、多租户标识时经常用它。网关转发的头可能被改写，关键信息最好在服务端重新获取。自定义头忘了配网关，线上就会被悄悄丢掉。
since: Spring 3.0 | versionNote: undefined
keyPoints: ["name/value 指定请求头名；required 默认 true；设了 defaultValue 会自动变成 false。","请求头名大小写不敏感（HTTP 规范），代码里建议统一写法。","参数类型也可以是 Map<String, String> 或 HttpHeaders，一次拿到全部请求头。","多值头请用 List 或 HttpHeaders 接收，别硬塞进单个 String。"]
attrs: name:String=""; value:String=""; defaultValue:String="ValueConstants.DEFAULT_NONE"; required:boolean="true"
notes: ["请求头名写错不会报找不到方法，而是 400 参数缺失，排查时容易懵。","自定义头要进网关和 CORS 白名单，否则浏览器端可能带不过来。","Authorization 头别直接打进日志，注意脱敏。"]
docs: https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/web/bind/annotation/RequestHeader.html , https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/requestheader.html
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HeaderController {

    // 必填头缺失 → 400
    @GetMapping("/tenant")
    public String tenant(@RequestHeader("X-Tenant-Id") String tenantId) {
        return "tenant=" + tenantId;
    }

    // 可选头，带默认值
    @GetMapping("/lang")
    public String lang(@RequestHeader(name = "Accept-Language", defaultValue = "zh-CN") String lang) {
        return "lang=" + lang;
    }

    // 一次拿全部请求头
    @GetMapping("/headers")
    public Map<String, String> all(@RequestHeader Map<String, String> headers) {
        return headers;
    }
}

### cookie-value | @CookieValue | web
tagline: 读取 Cookie 的值
plain: @CookieValue 从请求的 Cookie 里取出指定名字的值。会话 id、记住我 token 这类信息常用它读。Cookie 缺失时默认 400，所以一般要设 required=false 或 defaultValue。注意 Cookie 保存在用户浏览器里、可被篡改，别把它当可信凭证直接用。Cookie 有大小和数量限制，别把大对象塞进去。
since: Spring 3.0 | versionNote: undefined
keyPoints: ["name/value 指定 Cookie 名；required 默认 true；设了 defaultValue 会自动变成 false。","中文/特殊字符由容器按 Cookie 规范解码，复杂值建议自己编码后再存。","想一次拿所有 Cookie，可以注入 HttpServletRequest 后调用 getCookies()。","HttpOnly 的 Cookie 前端 JS 读不到，但服务端仍能通过它读到。"]
attrs: name:String=""; value:String=""; defaultValue:String="ValueConstants.DEFAULT_NONE"; required:boolean="true"
notes: ["Cookie 不存在又没设 defaultValue 时返回 400，这是最常见的坑。","前端 fetch 默认不带跨域 Cookie，需要 credentials 且后端 CORS 允许。","读到的值要校验，Cookie 内容用户可以随便改。"]
docs: https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/web/bind/annotation/CookieValue.html , https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/cookievalue.html
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SessionController {

    // 浏览器带 Cookie: SESSION=abc123
    @GetMapping("/profile")
    public String profile(@CookieValue("SESSION") String sessionId) {
        return "session=" + sessionId;
    }

    // Cookie 不存在时给默认值，避免 400
    @GetMapping("/theme")
    public String theme(@CookieValue(name = "theme", defaultValue = "light") String theme) {
        return "theme=" + theme;
    }
}

### controller-advice | @ControllerAdvice | web
tagline: 全局增强所有控制器
plain: @ControllerAdvice 标在类上，让这个类里的 @ExceptionHandler、@ModelAttribute、@InitBinder 方法对多个控制器生效，避免每个 Controller 重复写异常处理和公共数据。默认作用于所有控制器，也能按包、类型或注解缩小范围。它本身不返回数据。多个增强类同时存在时，用 @Order 明确谁先处理。
since: Spring 3.2 | versionNote: undefined
keyPoints: ["默认对所有控制器生效；用 basePackages、basePackageClasses、assignableTypes、annotations 精确限定范围。","name 是 Bean 名称别名（Spring 6.1+），value 是 basePackages 的别名，一般不用写。","里面的 @ExceptionHandler 优先级低于控制器本地的异常处理方法。","返回视图的全局处理用它；返回 JSON 用 @RestControllerAdvice 更省事。"]
attrs: annotations:Class<? extends Annotation>[]="{}"; name:String=""; value:String[]="{}"; basePackages:String[]="{}"; assignableTypes:Class<?>[]="{}"; basePackageClasses:Class<?>[]="{}"
notes: ["它不会自动处理异常，必须配合 @ExceptionHandler 才有行为。","本地控制器已有同类型 @ExceptionHandler 时，advice 里的不会生效。","范围写错（比如 basePackages 拼错）会导致完全不生效，启动日志里也不会报错。"]
docs: https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/web/bind/annotation/ControllerAdvice.html , https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-advice.html
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.servlet.ModelAndView;

// 对所有 @Controller 生效
@ControllerAdvice
public class GlobalControllerAdvice {

    // 每个控制器方法执行前都往模型里放站点信息
    @ModelAttribute("siteName")
    public String siteName() {
        return "小明的技术站";
    }

    // 未捕获的 IllegalStateException 统一渲染错误页
    @ExceptionHandler(IllegalStateException.class)
    public ModelAndView handleState(IllegalStateException ex) {
        ModelAndView mav = new ModelAndView("error/500");
        mav.addObject("message", ex.getMessage());
        return mav;
    }
}

### exception-handler | @ExceptionHandler | web
tagline: 把异常转成友好响应
plain: @ExceptionHandler 标在方法上，声明这个方法负责处理某类异常，可以写在 Controller 里只处理本控制器，也可以写在 @ControllerAdvice 里全局处理。它把异常从堆栈变成你设计的响应结构，避免客户端看到默认错误页。value 可以一次列多个异常类型，但一个方法只处理一种更清晰。
since: Spring 3.0 | versionNote: undefined
keyPoints: ["value 与 exception 互为别名（exception 为 Spring 6.2 新增），列出要处理的异常类型。","方法参数可注入异常对象、WebRequest、HttpServletRequest 等，返回值走正常的消息转换。","produces 可限制响应的 Content-Type（Spring 6.2 新增）。","按异常类型的精确程度匹配：先找最具体的类型，父类处理方法兜底。"]
attrs: value:Class<? extends Throwable>[]="{}"; exception:Class<? extends Throwable>[]="{}"; produces:String[]="{}"
notes: ["处理方法的返回类型若和 @ResponseStatus 冲突，状态码可能不符合预期，要测。","同一异常类型在本地和全局都有处理时，本地优先。","别捕获 Throwable 或 Exception 后返回 200，要给出对应状态码。"]
docs: https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/web/bind/annotation/ExceptionHandler.html , https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-exceptionhandler.html
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ItemController {

    @GetMapping("/items/{id}")
    public String item(@PathVariable Long id) {
        if (id > 100) {
            throw new ItemNotFoundException(id);
        }
        return "item-" + id;
    }

    // 只处理本控制器的 ItemNotFoundException
    @ExceptionHandler(ItemNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public String notFound(ItemNotFoundException ex) {
        return "找不到商品：" + ex.getId();
    }

    public static class ItemNotFoundException extends RuntimeException {
        private final Long id;
        public ItemNotFoundException(Long id) {
            super("item " + id);
            this.id = id;
        }
        public Long getId() { return id; }
    }
}

### response-status | @ResponseStatus | web
tagline: 声明响应状态码
plain: @ResponseStatus 用来固定一个方法或异常的 HTTP 状态码：方法上用它指定成功状态（比如创建资源返回 201），异常类上用它指定抛错时的状态（比如自定义 NotFoundException 返回 404）。code 和 value 互为别名，reason 会变成错误原因，但一旦写了 reason，返回值就不再被序列化。
since: Spring 3.0 | versionNote: undefined
keyPoints: ["标在方法上：成功时用该状态码；标在异常类上：该异常抛出时用该状态码。","value 与 code 互为别名，默认 INTERNAL_SERVER_ERROR。","reason 非空时容器直接渲染错误页，方法返回值被忽略，前后端分离项目通常不用它。","要动态决定状态码时用 ResponseEntity 代替它。"]
attrs: value:HttpStatus="500 INTERNAL_SERVER_ERROR"; code:HttpStatus="500 INTERNAL_SERVER_ERROR"; reason:String=""
notes: ["reason 一写，前端收到的就是容器错误页，JSON 返回值全没了。","方法上的 @ResponseStatus 和 ResponseEntity 同时存在时，以 ResponseEntity 为准。","404/500 这类语义状态不要乱标在业务成功方法上。"]
docs: https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/web/bind/annotation/ResponseStatus.html , https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-exceptionhandler.html
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ArticleController {

    // 创建成功返回 201 Created
    @PostMapping("/articles")
    @ResponseStatus(HttpStatus.CREATED)
    public String create() {
        return "created";
    }

    // GET /articles/999 抛异常后返回 404
    @GetMapping("/articles/{id}")
    public String detail(@PathVariable Long id) {
        if (id > 500) {
            throw new ArticleNotFoundException();
        }
        return "article-" + id;
    }

    // 异常类上声明状态码，抛出即生效
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public static class ArticleNotFoundException extends RuntimeException {
    }
}

### valid | @Valid | validation
tagline: 触发级联校验的标记
plain: @Valid 来自 Bean Validation 标准，本身不是约束注解，作用是告诉校验器：这个对象要级联校验，把里面字段上的 @NotNull、@Email 等约束一起检查。Controller 方法参数加了它，Spring MVC 才会在进方法前校验并抛出参数异常。嵌套对象上也必须加，否则内层规则不生效。
since: Jakarta Bean Validation 3.0 | versionNote: undefined
keyPoints: ["它是级联标记，不是约束；单独写它不会校验任何东西。","可标在参数、字段、方法、构造器和类型使用处；集合元素上写 @Valid 可逐个校验。","Spring MVC 中配合 @RequestBody、@ModelAttribute 使用，失败抛 MethodArgumentNotValidException。","默认只校验默认分组，需要分组校验时改用 Spring 的 @Validated。"]
attrs: 
notes: ["忘了加 @Valid，请求体里的约束一个都不会执行，脏数据会直接进业务层。","嵌套对象的字段要再校验，内层属性上也要标 @Valid。","@Valid 不能用在分组校验上，需要分组时用 @Validated。"]
docs: https://jakarta.ee/specifications/bean-validation/3.0/apidocs/jakarta/validation/Valid.html , https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-validation.html
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserController {

    // @Valid 让请求体里的约束生效；不通过时返回 400
    @PostMapping("/users")
    public String create(@Valid @RequestBody CreateUser form) {
        return "created " + form.name();
    }

    public record CreateUser(
            @NotBlank(message = "名字不能为空") String name,
            @Email(message = "邮箱格式不对") String email,
            @Min(value = 18, message = "年龄至少 18") int age) {
    }
}

### validated | @Validated | validation
tagline: Spring 的分组校验注解
plain: @Validated 是 Spring 对 @Valid 的增强：它多了 value 属性，可以指定校验分组，从而让同一个 DTO 在不同场景下校验不同规则。标在类上时，Spring 会对这个类的方法参数和返回值做校验。它属于 org.springframework.validation.annotation 包，别和 jakarta 的 @Valid 搞混。分组接口通常定义成空接口，只作为标记使用。
since: Spring 3.1 | versionNote: undefined
keyPoints: ["value 声明校验分组，如 @Validated(CreateGroup.class)；不写就是默认组。","类级 @Validated 会启用方法校验（基于 AOP 代理），方法参数上加约束注解才会被检查。","控制器方法参数上用它时，MVC 会按指定分组做数据绑定校验。","它是 Spring 专有注解，脱离 Spring 环境不生效；纯 Bean Validation 用 @Valid。"]
attrs: value:Class<?>[]="{}"
notes: ["@Validated 不写分组时等价于默认组，和 @Valid 效果接近，但包名完全不同。","类级 @Validated 依赖 AOP 代理，同类内部自调用不会触发校验。","方法校验失败抛 ConstraintViolationException，不是 MethodArgumentNotValidException，异常处理要分开写。"]
docs: https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/validation/annotation/Validated.html , https://docs.spring.io/spring-framework/reference/core/validation/beanvalidation.html
import jakarta.validation.constraints.NotBlank;

import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SignupController {

    // 只校验 CreateGroup 分组里的规则
    @PostMapping("/signup")
    public String signup(@Validated(CreateGroup.class) @RequestBody SignupForm form) {
        return "ok " + form.username();
    }

    public interface CreateGroup {
    }

    public record SignupForm(
            @NotBlank(groups = CreateGroup.class) String username,
            String inviteCode) {
    }

    // 类级 @Validated：Spring 对方法参数做校验
    @Service
    @Validated
    public static class NameService {
        public String hello(@NotBlank String name) {
            return "hello " + name;
        }
    }
}

### not-empty | @NotEmpty | validation
tagline: 集合/字符串不能为空
plain: @NotEmpty 要求字符串、集合、Map 或数组的 size 大于零：null 和空集合都会被拒。它和 @NotBlank 的区别是：@NotEmpty 只看长度，纯空格的字符串长度不为零依然通过；@NotBlank 会去空白再判断。想同时拒绝空白要两个一起用，或者对文本直接用 @NotBlank。批量接口尤其要防住空集合直接进循环。
since: Jakarta Bean Validation 3.0 | versionNote: undefined
keyPoints: ["适用于 CharSequence、Collection、Map 和数组，其他类型会抛 UnexpectedTypeException。","空集合不通过，但只含空白字符的字符串能通过（长度不为零）。","它不限制上限，想卡最大长度用 @Size。"]
attrs: message:String="{jakarta.validation.constraints.NotEmpty.message}"; groups:Class<?>[]="{}"; payload:Class<? extends Payload>[]="{}"
notes: ["@NotEmpty 不检查元素内容，ids 里放 null 它也不管。","给 String 用它挡不住全空格，文本场景应改用 @NotBlank。","集合元素自身的约束要用 List<@Valid Item> 这种方式级联。"]
docs: https://jakarta.ee/specifications/bean-validation/3.0/apidocs/jakarta/validation/constraints/NotEmpty.html , https://jakarta.ee/specifications/bean-validation/3.0/jakarta-bean-validation-spec-3.0.html
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class BatchController {

    @PostMapping("/batch/delete")
    public String delete(@Valid @RequestBody BatchCmd cmd) {
        return "delete " + cmd.ids().size() + " rows";
    }

    public record BatchCmd(
            // 空列表会被拒绝，null 也会被拒绝
            @NotEmpty(message = "至少选择一条记录") List<Long> ids) {
    }
}

### size | @Size | validation
tagline: 限制长度或数量范围
plain: @Size 同时限制最小值与最大值，适用于字符串长度、集合元素个数、Map 大小和数组长度。默认 min 是 0、max 是整数最大值，等于只写一个方向也合法。最常见的用法是卡标题 1 到 100 个字符、批量操作最多 500 条。注意它数的是长度，不是去空白后的字符数。
since: Jakarta Bean Validation 3.0 | versionNote: undefined
keyPoints: ["min 默认 0，max 默认 Integer.MAX_VALUE，可以只限制一端。","对 String 数的是字符数（按 String.length()），对集合数的是元素个数。","不支持基本类型和任意 POJO，用错类型会抛校验异常。"]
attrs: min:int="0"; max:int="2147483647"; message:String="{jakarta.validation.constraints.Size.message}"; groups:Class<?>[]="{}"; payload:Class<? extends Payload>[]="{}"
notes: ["@Size 在 String 上是 null 也算通过，必填要另加 @NotBlank。","emoji 等补充字符按 UTF-16 会计两个长度，需要精确按码点要自己实现。","只写 max 不写 min 时，空串也能通过，别误以为等于必填。"]
docs: https://jakarta.ee/specifications/bean-validation/3.0/apidocs/jakarta/validation/constraints/Size.html , https://jakarta.ee/specifications/bean-validation/3.0/jakarta-bean-validation-spec-3.0.html
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class PostController {

    @PostMapping("/posts")
    public String create(@Valid @RequestBody PostForm form) {
        return "title len " + form.title().length();
    }

    public record PostForm(
            @Size(min = 1, max = 100, message = "标题 1 到 100 个字") String title,
            @Size(max = 500, message = "一次最多 500 条") List<Long> tagIds) {
    }
}

### past | @Past | validation
tagline: 时间必须在过去
plain: @Past 要求日期或时间严格早于当前时刻，常用于生日、入职日期这类历史时间。它支持 java.util.Date、Calendar、java.time 里的 LocalDate、LocalDateTime、Instant 等类型。null 会直接放行，必填要配 @NotNull；今天当天是否算过去取决于具体类型和时区比较，边界要自己测。生日这类字段还要校验合理范围，别让 1800 年也通过。
since: Jakarta Bean Validation 3.0 | versionNote: undefined
keyPoints: ["支持 Date、Calendar、LocalDate、LocalDateTime、Instant 等时间类型。","较新版本支持以 ClockProvider 注入的时钟为基准判断，便于测试。","null 不校验，必填请叠加 @NotNull。"]
attrs: message:String="{jakarta.validation.constraints.Past.message}"; groups:Class<?>[]="{}"; payload:Class<? extends Payload>[]="{}"
notes: ["LocalDate 的“今天”与服务器时区有关，跨时区业务要统一时区。","null 会通过校验，不填生日时它不会报错。","需要“今天及以前”时用 @PastOrPresent，@Past 不含今天。"]
docs: https://jakarta.ee/specifications/bean-validation/3.0/apidocs/jakarta/validation/constraints/Past.html , https://jakarta.ee/specifications/bean-validation/3.0/jakarta-bean-validation-spec-3.0.html
import jakarta.validation.Valid;
import jakarta.validation.constraints.Past;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
public class BirthController {

    @PostMapping("/birthdays")
    public String save(@Valid @RequestBody BirthForm form) {
        return "birthday " + form.birthday();
    }

    public record BirthForm(
            // 必须是今天之前的日期
            @Past(message = "生日不能是未来时间") LocalDate birthday) {
    }
}

### future | @Future | validation
tagline: 时间必须在未来
plain: @Future 要求日期或时间严格晚于当前时刻，用到货时间、预约时间、活动开始时间这类场景。它支持 java.util.Date、Calendar 和 java.time 系列类型，null 会放行。和 @Past 一样，比较基准受服务器时区影响，测试时最好用固定时钟，避免跨天跑出不稳定用例。
since: Jakarta Bean Validation 3.0 | versionNote: undefined
keyPoints: ["支持 Date、Calendar、LocalDate、LocalDateTime、Instant 等时间类型。","判断基准来自 ClockProvider，可注入固定时钟做单元测试。","null 不校验，必填要配 @NotNull。"]
attrs: message:String="{jakarta.validation.constraints.Future.message}"; groups:Class<?>[]="{}"; payload:Class<? extends Payload>[]="{}"
notes: ["@Future 不含当前时刻，要求“现在起”需要用 @FutureOrPresent。","客户端与服务器时区不同时，用户以为的“明天”可能已经是过去。","定时任务补偿时，历史数据再走同一个接口会被 @Future 拦下。"]
docs: https://jakarta.ee/specifications/bean-validation/3.0/apidocs/jakarta/validation/constraints/Future.html , https://jakarta.ee/specifications/bean-validation/3.0/jakarta-bean-validation-spec-3.0.html
import jakarta.validation.Valid;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@RestController
public class BookingController {

    @PostMapping("/bookings")
    public String book(@Valid @RequestBody BookingForm form) {
        return "booked at " + form.startAt();
    }

    public record BookingForm(
            @NotNull(message = "预约时间不能为空")
            @Future(message = "预约时间必须在未来") LocalDateTime startAt) {
    }
}
