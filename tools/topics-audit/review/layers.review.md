# layers

================================================================================
ID: layers-architecture | 分层架构与依赖方向：把代码摆对位置 | level=入门 | readingMinutes=5
SUMMARY: 分层只回答一个问题：改需求要动几处代码；依赖只朝一个方向走，每层只做自己的事。
TAGS: ["分层架构","依赖方向","包结构"]
SOURCES: [{"label":"Martin Fowler：PresentationDomainDataLayering","url":"https://martinfowler.com/bliki/PresentationDomainDataLayering.html"},{"label":"Spring Boot 3.5 参考文档：组织代码结构","url":"https://docs.spring.io/spring-boot/3.5/reference/using/structuring-your-code.html"}]

分层架构不值得争论太多，它只回答一个问题：改一个需求时，你希望动几处代码。现代企业写法的共识是：按职责分层，依赖只朝一个方向走，每层只做自己的事。

## 这一层负责什么

典型四层：Controller 接协议，Service 放业务，Repository 管数据，Entity 表示持久化结构。另外还有 DTO/VO 负责出入参，异常处理负责兜底。

依赖方向只有一个：外层依赖内层。Controller 依赖 Service，Service 依赖 Repository，Repository 依赖数据库。反过来一律不允许——Repository 不能回头调 Service，Service 也不能拿到 HttpServletRequest。

这条规矩的价值在于可替换：换 Web 框架只动 Controller，换存储只动 Repository，业务逻辑不动。反过来，如果 Controller 里直接写 SQL，改表结构就要连接口层一起改，测试也没法单独跑业务。

## 怎么写

推荐按业务能力建包，每个业务包内部再分层，而不是全站按 controller/service 平铺：

```text
com.example.shop
├── order
│   ├── OrderController.java
│   ├── OrderService.java
│   ├── OrderRepository.java
│   └── Order.java
└── payment
    └── ...
```

依赖注入统一用构造器，字段声明 final，让依赖关系一眼可见：

```java
public interface OrderService {
    OrderResponse get(Long id);
}

@Service
public class OrderServiceImpl implements OrderService {
    private final OrderRepository orderRepository;

    public OrderServiceImpl(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }
}
```

Controller 只依赖 Service 接口，不依赖实现类，也不直接依赖 Repository。这样将来把 Service 换成远程调用或加缓存，Controller 完全不用改。

写代码时守住三条：每层只调用下一层；DTO 只出现在跨层边界；Entity 不出 Repository/Service 的边界。需要跨层传数据时，定义明确的请求和响应对象，而不是复用同一个大对象。

## 边界与常见错误

- Controller 直接注入 Repository 查数据。省了一时，业务规则就散在接口层了，后续改不动。
- Service 返回 Entity，Controller 直接序列化返回。Entity 的字段、懒加载、循环引用都会泄漏到 API，接口一改就是线上问题。
- 下层反调上层。比如 Repository 里调用 Service 发消息，看起来方便，实际上把依赖方向搞反了，测试和复用都会变难。
- 层内再分层套娃。Controller→Service→Manager→Helper→Util，每层只转发一句话，等于没有分层，还增加阅读成本。
- 业务判断写在工具类里。工具类应该无状态、可复用，一旦塞进业务规则，所有模块都被绑死。
- 为了"解耦"给每层都写接口，实现却只有一个且从不替换。接口是边界需要时才加，不是仪式。
- 没有集成测试兜底就大改分层。先保接口行为，再动结构，否则改完不知道坏在哪。
================================================================================
ID: layers-repository | Repository 层：数据访问只暴露必要操作 | level=入门 | readingMinutes=6
SUMMARY: Repository 只封装数据存取，方法名表达查询意图，复杂查询用 @Query，业务判断留在 Service。
TAGS: ["Repository","JPA","MyBatis"]
SOURCES: [{"label":"Spring Data JPA：查询方法","url":"https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html"},{"label":"MyBatis-Spring：Mapper 接口","url":"https://mybatis.org/spring/mappers.html"},{"label":"Spring Framework：DAO 支持与异常翻译","url":"https://docs.spring.io/spring-framework/reference/data-access/dao.html"}]

Repository 层只干一件事：把数据存取封装成方法。它不该知道业务规则，也不该知道 HTTP。用 JPA 还是 MyBatis 是团队选择，但边界要求一样。

## 这一层负责什么

Repository 负责：按业务需要提供查询和写入方法、把数据库异常翻译成统一的数据访问异常、隐藏 SQL/JPQL 细节。它对外返回 Entity 或明确的投影对象，不返回 `Map`、不返回 `Object[]` 让调用方猜。

不该做的事：写业务判断、调用远程服务、处理权限、拼装 HTTP 响应、在查询方法里做多步写操作。复杂查询可以放到 Repository 或专门的 Query 对象里，但不能回头依赖 Service。

## 怎么写

Spring Data JPA 只需要声明接口，方法名按约定派生查询，复杂查询用 `@Query`：

```java
public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByStatusOrderByCreatedAtDesc(OrderStatus status);

    @Query("select o from Order o where o.userId = :userId and o.status = :status")
    List<Order> findUserOrders(@Param("userId") Long userId,
                               @Param("status") OrderStatus status);
}
```

MyBatis 则用 `@Mapper` 加注解或 XML：

```java
@Mapper
public interface OrderMapper {

    @Select("select id, user_id, status, created_at from orders where id = #{id}")
    Order findById(@Param("id") Long id);

    @Insert("insert into orders(user_id, status, created_at) values(#{userId}, #{status}, #{createdAt})")
    int insert(Order order);
}
```

要点：方法名要表达查询意图；分页用 `Pageable` 让数据库分页，不要查全量再切；只 select 需要的列，避免大字段拖慢；写操作方法要明确返回影响行数或生成的 ID。

分页查询的标准写法是方法参数接收 `Pageable`，返回 `Page<T>`，调用方用 `PageRequest.of(page, size)` 构造分页参数。如果只需要列表里的一两个字段，可以定义只读的投影接口或返回 record，让 JPA 只查需要的列。MyBatis 侧则要注意 `#{}` 与 `${}` 的区别：前者是预编译占位符，能防注入；后者是字符串拼接，只在排序字段这类白名单场景使用，绝不能直接拼用户输入。写操作在 MyBatis 里要返回 `int`，调用方检查影响行数是否符合预期。

## 边界与常见错误

- Controller 直接调 Repository。跳过 Service 意味着业务规则和事务边界都丢了，这是分层里最常见的一刀切。
- Repository 里写业务判断。比如"库存不足就不插入"，这属于 Service，Repository 只负责存取。
- 自定义更新方法忘了事务。继承来的 `save` 有事务，自己写的 `@Modifying` 查询需要在调用方或方法上加 `@Transactional`，否则报错或不生效。
- 返回 Entity 后被上层随意修改。JPA 的托管对象在事务内改动会自动脏检查写回，意外改库很难排查。
- 滥用懒加载。循环里访问关联集合就是 N+1，应该用 `@EntityGraph` 或 join fetch 一次取回。
- 方法名派生查询写太长。`findByAAndBAndCAndDAndE` 可读性极差，超过三四个条件就改用 `@Query` 或 Specification。
- 把数据库异常原样抛给上层。应该让 Spring 的异常翻译机制处理，或者在边界处转成业务异常。
- 一个 Repository 塞进所有业务的查询。按聚合根拆分，跨聚合查询用专门的读模型，别让一个接口无限膨胀。
================================================================================
ID: layers-dto-conversion | DTO、Entity、VO 到底怎么转换 | level=进阶 | readingMinutes=6
SUMMARY: Entity 管持久化、DTO 管入参、VO 管出参；转换集中一处，别让数据库结构变成接口契约。
TAGS: ["DTO","VO","Entity"]
SOURCES: [{"label":"Spring Framework：Bean Validation","url":"https://docs.spring.io/spring-framework/reference/core/validation/beanvalidation.html"},{"label":"MapStruct 参考文档","url":"https://mapstruct.org/documentation/stable/reference/html/"}]

DTO、Entity、VO 混用是分层项目里最隐蔽的债。刚写完能跑，一旦接口要加字段、实体要改结构，就会发现三者被焊死在一起。现代做法的核心是：把"数据库长什么样"和"接口对外长什么样"分开。

## 这一层负责什么

Entity 对应数据库表，只服务持久化；请求 DTO 表示"客户端能传什么"；响应 VO（也常叫 Response DTO）表示"接口能返回什么"。三者职责不同，字段也允许不同。

转换逻辑集中放在一处，比如 Assembler/Mapper 类或 DTO 的静态工厂方法。不要在每个 Service 里手写一堆 setter，更不要用 `BeanUtils.copyProperties` 到处复制——字段改名时它不会报错，只会在运行期悄悄丢值。

## 怎么写

请求和响应都用 record，转换用静态方法显式写出每个字段：

```java
public record CreateOrderRequest(
        @NotNull Long productId,
        @Min(1) int quantity) {
}

public record OrderResponse(Long id, Long productId, int quantity,
                            String status, Instant createdAt) {

    public static OrderResponse from(Order order) {
        return new OrderResponse(order.getId(), order.getProductId(),
                order.getQuantity(), order.getStatus().name(), order.getCreatedAt());
    }
}
```

要点：入参和出参分开定义，不要一个类既接收又返回；校验注解放在请求 DTO 上，Entity 不承担接口校验；响应 DTO 只暴露前端需要的字段，内部主键、软删除标记、审计字段按需隐藏。

如果字段多、转换重复，可以用 MapStruct 生成映射代码，接口上标 `@Mapper(componentModel = "spring")`，编译期生成实现，字段改名会编译失败，比反射复制安全。但别为了省几行 setter 引入一整套映射框架，小项目手写更直白。

响应对象优先用 record 这类不可变结构，天然线程安全，也不会被谁顺手改字段；确实需要可变性时再用普通类，并克制 setter 的数量。校验提示语可以用注解的 `message` 属性写清楚，前端直接展示即可，不用再维护一份错误文案映射。最后，转换方法建议放在 DTO 自己身上或专门的 Assembler 里，保证全项目只有一处能回答"这个字段从哪来"。

## 边界与常见错误

- Entity 直接当接口返回。懒加载字段序列化报错、敏感字段泄漏、数据库结构被迫成为 API 契约。
- 请求 DTO 和 Entity 共用一个类。前端多传一个字段就可能改到不该改的列，批量赋值漏洞就是这么来的。
- 转换逻辑散落在 Controller、Service、Repository。同一份映射出现三份，改一处漏两处。
- 用 `BeanUtils.copyProperties` 做核心转换。同名不同义、类型静默转换、嵌套对象不复制，问题都在运行期才暴露。
- VO 里塞业务方法。响应对象应该只是数据载体，逻辑放 Service。
- DTO 之间互相继承形成层级。字段来源难追踪，序列化行为也不可控。
- 校验注解加在 Entity 上。持久化实体被接口规则绑死，换个入口调用就校验不到。
- 分页结果直接返回 `Page<Entity>`。前端会看到一堆框架字段，还泄漏了 Entity；应该映射成自定义分页响应。
================================================================================
ID: layers-modularization | 从单体到模块化：包结构怎么演进 | level=进阶 | readingMinutes=7
SUMMARY: 先按业务能力分包、只暴露 api，再用 Spring Modulith 验证边界，最后才考虑拆服务。
TAGS: ["模块化","包结构","模块边界"]
SOURCES: [{"label":"Spring Modulith：核心概念","url":"https://docs.spring.io/spring-modulith/reference/fundamentals.html"},{"label":"Spring Modulith 参考文档","url":"https://docs.spring.io/spring-modulith/reference/index.html"}]

项目初期按 controller/service/repository 平铺没问题，业务一多就会痛：改订单要翻三个包，模块之间随便互相注入。模块化不是一上来拆微服务，而是先在单体内把边界立起来。

## 这一层负责什么

模块化的目标是：每个业务能力是一个独立模块，模块内部可以分层，模块之间只能通过公开接口通信。包结构从"按技术分"演进为"按业务能力分"，再在外层保留少量共享代码。

依赖方向要求：模块之间单向依赖，允许 A→B、B→C，不允许 A→B→A。跨模块调用只走对方暴露的 api 包，内部实现（internal）对其他模块不可见。这样将来把某个模块拆成独立服务时，改动范围是可控的。

模块化不等于微服务。单体里先做到"代码边界清晰、依赖可验证"，再根据流量和组织需要决定要不要拆。顺序反了就是分布式单体，调试成本翻倍。

## 怎么写

先把包按业务能力分，再在模块内部保留分层：

```text
com.example.shop
├── order
│   ├── api
│   │   ├── OrderFacade.java
│   │   └── OrderView.java
│   └── internal
│       ├── OrderController.java
│       ├── OrderService.java
│       └── OrderRepository.java
├── payment
│   └── ...
└── common
    └── ...
```

对外只暴露 api 包里的接口和视图对象，实现类保持包私有：

```java
package com.example.shop.order.api;

public interface OrderFacade {
    OrderView getOrder(Long id);
}
```

```java
package com.example.shop.order.internal;

@Component
class OrderFacadeImpl implements OrderFacade {

    private final OrderRepository orderRepository;

    OrderFacadeImpl(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Override
    public OrderView getOrder(Long id) {
        return orderRepository.findById(id)
                .map(OrderView::from)
                .orElseThrow(() -> new OrderNotFoundException(id));
    }
}
```

要点：跨模块只注入 `OrderFacade`，不注入 `OrderService` 或 `OrderRepository`；模块间需要异步解耦时用 `ApplicationEventPublisher` 发领域事件；目录结构定下来后，可以用 Spring Modulith 的 `ApplicationModules.of(ShopApplication.class).verify()` 在构建时检查有没有非法跨模块依赖。

## 边界与常见错误

- 跨模块直接注入 internal 包里的类。编译能过，但边界已经破了，日后拆分时全是隐式依赖。
- 模块之间共享 Entity 和数据库表。表结构一成契约，模块就再也分不开。
- 出现循环依赖。A 调 B、B 回调 A，说明边界划错了，要么抽公共能力，要么改成事件。
- 只把包名改了，依赖方向没变。这是"模块化表演"，验证工具一跑就露馅。
- 过早拆微服务。团队、监控、发布流程都没准备好，拆完只会增加故障点。
- 模块划分按技术而不是业务。`util`、`base`、`core` 这种包会越来越大，实际边界依然模糊。
- 缺少自动化校验。边界靠自觉一定会退化，应该用模块测试或依赖检查工具放进流水线。
- 一步到位重构。先在新增功能上采用新结构，再逐步迁移老代码，避免一次性改到无法回归。
