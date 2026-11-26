
### table | @Table | data
tagline: 自定义表名、schema、索引和唯一约束
plain: 不写 @Table 时表名就按类名来，写 @Table(name = "t_user") 可以换成真实表名。它还能声明 schema、catalog，以及建表时用的唯一约束和索引。注意这些约束只在 Hibernate 帮你建表时生效，生产库的表结构一般由 Flyway 或 Liquibase 管理，这里写了也不会去改已有的表。所以它更像给自动建表用的说明书，不是数据库变更工具。
since: JPA 1.0 | versionNote: null
keyPoints: ["name 不写默认用实体名；分库分 schema 时用 schema 属性指定。","uniqueConstraints 定义联合唯一约束，indexes 定义普通索引。","只影响自动建表，已有表不会被它修改。","表名撞上数据库保留字（order、user 等）时必须显式改名。"]
attrs: name:String=""; schema:String=""; catalog:String=""; uniqueConstraints:UniqueConstraint[]="{}"; indexes:Index[]="{}"
notes: ["MySQL 里 order、user 这类词是保留字，直接当表名会报错，最好统一加前缀。","@Table 的 name 是表名，@Entity 的 name 是 JPQL 里的实体名，两个概念别混。"]
docs: https://jakarta.ee/specifications/persistence/3.1/apidocs/jakarta.persistence/jakarta/persistence/Table.html , https://jakarta.ee/specifications/persistence/3.1/jakarta-persistence-spec-3.1.html
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
    name = "sys_user",
    uniqueConstraints = @UniqueConstraint(name = "uk_user_email", columnNames = "email")
)
public class SysUser {

    @Id
    private Long id;

    @Column(name = "email", nullable = false, length = 128)
    private String email;
}

### id | @Id | data
tagline: 声明实体的主键字段
plain: @Id 标在哪个字段上，哪个字段就是这张表的主键，JPA 靠它区分不同行。主键值可以自己赋值，比如业务单号；也可以交给 @GeneratedValue 让数据库或 JPA 生成。每个实体必须有且只有一个 @Id，复合主键要用 @IdClass 或 @EmbeddedId，而不是标两个 @Id。没有主键的实体在启动时就会直接报错。
since: JPA 1.0 | versionNote: null
keyPoints: ["每个实体必须有主键，没有 @Id 启动就报错。","可以标在字段上，也可以标在 getter 上，整个项目最好统一一种。","主键类型建议用包装类型 Long 而不是 long，方便区分“还没保存”。","复合主键用 @IdClass 或 @EmbeddedId，不能标多个 @Id。"]
attrs: 
notes: ["用 long 做 id 时默认值是 0，判断“是不是新对象”会出错，用 Long 更稳。","主键一旦确定就不要改，很多 JPA 操作靠它定位某一行。"]
docs: https://jakarta.ee/specifications/persistence/3.1/apidocs/jakarta.persistence/jakarta/persistence/Id.html , https://jakarta.ee/specifications/persistence/3.1/jakarta-persistence-spec-3.1.html
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "t_book")
public class Book {

    // 主键由应用赋值，比如 ISBN
    @Id
    private Long id;

    private String title;

    protected Book() {
    }

    public Book(Long id, String title) {
        this.id = id;
        this.title = title;
    }

    public Long getId() { return id; }
}

### one-to-many | @OneToMany | data
tagline: 一条记录对应多行子表数据
plain: 用户有多个订单，就在 User 里放一个 List<Order> 并加 @OneToMany。双向关联时一定要用 mappedBy 指向多方的那个字段，否则 Hibernate 会以为这是两个独立关联，多建一张中间表。fetch 默认 LAZY，orphanRemoval = true 时把子对象从集合里移除，数据库里那行也会被删掉。删除父对象时子对象是否跟着删，由 cascade 和 orphanRemoval 一起决定。
since: JPA 1.0 | versionNote: null
keyPoints: ["双向关联必须写 mappedBy，指向 @ManyToOne 那一端的字段名。","默认 LAZY，遍历集合要在事务内完成。","cascade = ALL 时保存父对象会级联保存子对象。","orphanRemoval 与 cascade = REMOVE 不同：前者管从集合移除，后者管父对象删除。"]
attrs: mappedBy:String=""; fetch:FetchType="LAZY"; cascade:CascadeType[]="{}"; orphanRemoval:boolean="false"
notes: ["集合要初始化成 new ArrayList<>()，别留 null，否则 add 时报空指针。","一对多列表很大时不要一次查全，分页或单独查询更稳。"]
docs: https://jakarta.ee/specifications/persistence/3.1/apidocs/jakarta.persistence/jakarta/persistence/OneToMany.html
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import java.util.ArrayList;
import java.util.List;

@Entity
public class User {

    @Id
    private Long id;

    // mappedBy 指向 Order 里的 user 字段；不写会多出一张中间表
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Order> orders = new ArrayList<>();
}

### join-column | @JoinColumn | data
tagline: 指定外键列的名字和约束
plain: 它写在关联字段旁边，用来控制外键列：name 是子表里的列名，referencedColumnName 是父表被引用的列，nullable 和 unique 决定外键是否可空、是否唯一。不写 @JoinColumn 也能跑，但列名会按默认策略生成，和 DBA 约定不一致时就很难对上。即使数据库里没有物理外键，它仍然决定 SQL 关联条件用哪一列。
since: JPA 1.0 | versionNote: null
keyPoints: ["name 指定外键列名，不写时按默认命名策略生成。","referencedColumnName 指向父表列，默认是父表主键。","nullable = false 生成 not null 外键，避免脏数据。","外键约束名用 foreignKey = @ForeignKey(name = ...) 指定。","只写在拥有外键的一方，通常就是 @ManyToOne 那一端。"]
attrs: name:String=""; referencedColumnName:String=""; nullable:boolean="true"; unique:boolean="false"; insertable:boolean="true"; updatable:boolean="true"
notes: ["只有 @ManyToOne / @OneToOne 这一端拥有外键，@OneToMany 的 mappedBy 端不写 @JoinColumn。","跨库或分表时通常不建物理外键，但 @JoinColumn 仍然用来指定列名。"]
docs: https://jakarta.ee/specifications/persistence/3.1/apidocs/jakarta.persistence/jakarta/persistence/JoinColumn.html
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "t_order")
public class Order {

    @Id
    private Long id;

    // 外键列 user_id，引用 t_user 的主键，且不允许为空
    @ManyToOne
    @JoinColumn(name = "user_id", referencedColumnName = "id", nullable = false)
    private User user;
}

### version | @Version | data
tagline: 乐观锁：改之前先核对版本号
plain: 在实体里加一个 @Version 字段，每次更新 JPA 都会自动加一，并在 where 条件里带上旧版本号。两个请求同时改同一行时，后提交的那个影响行数是 0，Hibernate 抛 OptimisticLockException，你就能提示“数据已被别人修改”。适合读多写少、冲突不频繁的场景，比数据库行锁轻量。
since: JPA 1.0 | versionNote: null
keyPoints: ["一个实体只能有一个 @Version 字段，类型用 int/long 或对应包装类。","更新时自动带 WHERE version = 旧值，冲突时抛 OptimisticLockException。","只对 update 生效，insert 时从 0 开始。","高冲突场景用它重试成本高，应该考虑悲观锁。"]
attrs: 
notes: ["乐观锁异常要自己捕获，再决定重试还是提示用户。","带 @Version 的字段不要手动 set，交给 JPA 维护。"]
docs: https://jakarta.ee/specifications/persistence/3.1/apidocs/jakarta.persistence/jakarta/persistence/Version.html , https://jakarta.ee/specifications/persistence/3.1/jakarta-persistence-spec-3.1.html
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Version;

@Entity
public class Document {

    @Id
    private Long id;

    private String content;

    // 每次更新 JPA 自动加一，并带上 where version = ?
    @Version
    private Long version;
}

### modifying | @Modifying | data
tagline: 让 @Query 能执行 update 和 delete
plain: @Query 默认只当查询用，写 update 或 delete 会报错，必须加上 @Modifying。加上后返回值用 int 表示影响行数。它不会自动开事务，通常再给 Repository 方法加 @Transactional。flushAutomatically 会先刷掉待提交的改动，clearAutomatically 会清一级缓存，避免读到旧对象；方法里还操作了别的持久化对象时，执行后最好再清一次。
since: Spring Data JPA 1.0 | versionNote: null
keyPoints: ["只用于 update 和 delete，select 不需要。","返回值建议用 int 接收影响行数。","需要在事务中调用，否则抛 TransactionRequiredException。","clearAutomatically = true 清一级缓存，防止后续读到过期实体。","flushAutomatically = true 执行前先 flush，保证前面改的数据可见。"]
attrs: flushAutomatically:boolean="false"; clearAutomatically:boolean="false"
notes: ["批量更新绕过了一级缓存，更新完最好 clear 一下再重新查。","大批量更新用 @Modifying 加分页循环，别一次锁住太多行。"]
docs: https://docs.spring.io/spring-data/jpa/docs/3.5.13/api/org/springframework/data/jpa/repository/Modifying.html , https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface UserRepository extends JpaRepository<User, Long> {

    // 更新语句必须加 @Modifying，并且要在事务里调用
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("update User u set u.status = :status where u.id = :id")
    int updateStatus(@Param("id") Long id, @Param("status") String status);

    // 删除也是修改型查询，同样要 @Modifying
    @Modifying
    @Transactional
    @Query("delete from User u where u.id = :id")
    int deleteById(@Param("id") Long id);
}

### enable-jpa-repositories | @EnableJpaRepositories | data
tagline: 手动指定 JPA 仓库的扫描范围
plain: Spring Boot 自动配置默认扫描主类所在包及子包下的 Repository 接口。接口放在别的包，或要接多数据源、多套 JPA 工厂时，就得自己加 @EnableJpaRepositories。basePackages 指定包路径，entityManagerFactoryRef 和 transactionManagerRef 指定用哪套工厂和事务管理器。写了它，Boot 的自动配置就退让，每个数据源各配一套。
since: Spring Data JPA 1.0 | versionNote: null
keyPoints: ["默认扫描主类同包及子包，放在外面的 Repository 不会被注册。","多数据源时每个数据源配一个 @EnableJpaRepositories，各用各的工厂和事务管理器。","entityManagerFactoryRef 默认 entityManagerFactory，transactionManagerRef 默认 transactionManager。","指定了自定义 EntityManagerFactory 后，事务管理器通常也要一起指定。"]
attrs: value:String[]="{}"; basePackages:String[]="{}"; entityManagerFactoryRef:String="entityManagerFactory"; transactionManagerRef:String="transactionManager"; enableDefaultTransactions:boolean="true"; bootstrapMode:BootstrapMode="DEFAULT"
notes: ["多数据源场景下主数据源要加 @Primary，否则按类型注入会有歧义。","手动配置后 Boot 的自动配置会退让，别两边各配一半。"]
docs: https://docs.spring.io/spring-data/jpa/docs/3.5.13/api/org/springframework/data/jpa/repository/config/EnableJpaRepositories.html
import javax.sql.DataSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;

@Configuration
@EnableJpaRepositories(
    basePackages = "com.example.order.repository",
    entityManagerFactoryRef = "orderEntityManagerFactory",
    transactionManagerRef = "orderTransactionManager"
)
public class OrderDataConfig {

    @Bean
    public LocalContainerEntityManagerFactoryBean orderEntityManagerFactory(DataSource dataSource) {
        LocalContainerEntityManagerFactoryBean emf = new LocalContainerEntityManagerFactoryBean();
        emf.setDataSource(dataSource);
        emf.setPackagesToScan("com.example.order.entity");
        emf.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
        return emf;
    }

    @Bean
    public PlatformTransactionManager orderTransactionManager(
            LocalContainerEntityManagerFactoryBean orderEntityManagerFactory) {
        return new JpaTransactionManager(orderEntityManagerFactory.getObject());
    }
}

### select | @Select | data
tagline: 注解里直接写查询 SQL
plain: 直接在 Mapper 方法上写 select 语句，省掉 XML。value 是字符串数组，写多段时 MyBatis 会用空格拼起来，所以可以按行拆开提高可读性。参数用 #{} 占位，它会被编译成 PreparedStatement 的 ?，能防 SQL 注入；${} 是字符串直接拼接，只适合表名、排序字段这种可控内容。
since: MyBatis 3.0 | versionNote: null
keyPoints: ["数组形式会被空格拼接，适合把长 SQL 拆成多行。","#{} 走预编译参数，安全；${} 直接拼接，有注入风险。","复杂动态 SQL（if、foreach）建议放 XML。","databaseId 用于多数据库方言时区分语句。"]
attrs: value:String[]="—"; databaseId:String=""; affectData:boolean="false"
notes: ["结果列名和属性名对不上时，用 @Results 或开启驼峰映射。","注解 SQL 里没有 XML 的 <if>，条件多就换成 XML。"]
docs: https://mybatis.org/mybatis-3/java-api.html , https://mybatis.org/mybatis-3/apidocs/org/apache/ibatis/annotations/Select.html
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface BookMapper {

    // 多个字符串会用空格拼成一条 SQL，方便拆行
    @Select({
        "select id, title, author",
        "from t_book",
        "where title like concat('%', #{keyword}, '%')"
    })
    List<Book> search(@Param("keyword") String keyword);
}

### update | @Update | data
tagline: 注解里直接写更新语句
plain: 把 update 语句写在 Mapper 方法上，返回影响行数。返回 0 不一定代表失败：可能 id 不存在，也可能新值和旧值一样，MySQL 默认认为没有变化。Mapper 方法本身不会替你组合多条语句，多条更新要一起成功时，得在 Service 层加 @Transactional。语句里的 #{now} 这类占位符，名字要和 @Param 起的名字对得上。
since: MyBatis 3.0 | versionNote: null
keyPoints: ["返回影响行数，0 表示没匹配到或者值没变化。","多参数必须用 @Param 起名，否则只能写 param1、param2。","单条 update 自己提交，多条组合更新要外层事务。","databaseId 可区分不同数据库的写法。"]
attrs: value:String[]="—"; databaseId:String=""
notes: ["MySQL 连接串加 useAffectedRows 后返回的是真正改动的行数，和默认行为不同。","动态 set 条件建议放 XML，注解里硬写 <script> 可读性差。"]
docs: https://mybatis.org/mybatis-3/java-api.html
import java.time.LocalDateTime;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface UserMapper {

    // 返回影响行数：0 表示没有这个 id，或者值本来就没变
    @Update("update t_user set email = #{email}, updated_at = #{now} where id = #{id}")
    int updateEmail(@Param("id") Long id,
                    @Param("email") String email,
                    @Param("now") LocalDateTime now);

    @Update("update t_user set status = #{status} where id = #{id}")
    int updateStatus(@Param("id") Long id, @Param("status") String status);
}

### cache-put | @CachePut | data
tagline: 方法一定执行，结果写回缓存
plain: 和 @Cacheable 相反，@CachePut 每次都会真正执行方法，然后把返回值按 key 写进缓存。典型用法是更新数据后同步缓存：先改数据库，再把新对象放进缓存，保证下一次读能命中新值。key 要和查询时用的 key 一致，否则会写进另一个位置，读的时候照样不命中。
since: Spring 3.1 | versionNote: null
keyPoints: ["永远执行方法，不会因为缓存命中而跳过。","用返回值覆盖缓存，适合更新之后回写。","key 必须和 @Cacheable 的 key 规则一致。","返回值是 null 时，缓存里可能存进 null，要自己处理。"]
attrs: value:String[]="{}"; key:String=""; keyGenerator:String=""; cacheManager:String=""; cacheResolver:String=""; condition:String=""; unless:String=""; cacheNames:String[]="{}"
notes: ["更新抛异常时方法没有返回值，缓存不会被覆盖，靠事务回滚保证一致。","并发更新时 @CachePut 不保证顺序，强一致场景建议直接删缓存。"]
docs: https://docs.spring.io/spring-framework/reference/integration/cache/annotations.html , https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/cache/annotation/CachePut.html
import org.springframework.cache.annotation.CachePut;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // 方法一定执行，返回的 User 会写入 users 缓存
    @CachePut(cacheNames = "users", key = "#user.id")
    public User update(User user) {
        return userRepository.save(user);
    }
}

### cache-evict | @CacheEvict | data
tagline: 方法执行后清掉缓存
plain: 用来删缓存：方法执行完（默认）后，按 key 删除对应缓存项；allEntries = true 则清空整个 cache，适合列表缓存这种没法精确定位 key 的场景。beforeInvocation = true 改成方法执行前删，方法抛异常也照样删。缓存删除和数据库写入不在一个事务里，极端情况下会有短暂不一致。
since: Spring 3.1 | versionNote: null
keyPoints: ["默认方法成功返回后才删除，抛异常就不删。","allEntries = true 清空整个 cache，慎用于大缓存。","beforeInvocation = true 在方法执行前就删。","缓存删除与数据库事务不同步，允许最终一致即可。"]
attrs: value:String[]="{}"; key:String=""; keyGenerator:String=""; cacheManager:String=""; cacheResolver:String=""; condition:String=""; allEntries:boolean="false"; beforeInvocation:boolean="false"
notes: ["先更新库再删缓存，比先删缓存再更新库更常用，出错概率更小。","要同时清多个 cache 时，用 @Caching 组合多个 @CacheEvict。"]
docs: https://docs.spring.io/spring-framework/reference/integration/cache/annotations.html , https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/cache/annotation/CacheEvict.html
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // 删除后清掉对应 key
    @CacheEvict(cacheNames = "users", key = "#id")
    public void deleteById(Long id) {
        userRepository.deleteById(id);
    }

    // 列表缓存没法精确定位 key，直接清空整个 cache
    @CacheEvict(cacheNames = "userList", allEntries = true)
    public void refreshList() {
    }
}

### cache-config | @CacheConfig | data
tagline: 类级共享缓存配置
plain: 一个 Service 里十几个方法都用同一个 cache，每个注解都写 cacheNames 很啰嗦。在类上加 @CacheConfig(cacheNames = "users")，类里所有缓存注解默认就用它，方法上写了就以方法为准。它还能统一指定 keyGenerator、cacheManager、cacheResolver。只对当前类生效，不会影响别的类，也不会真的创建缓存。
since: Spring 4.1 | versionNote: null
keyPoints: ["类级默认值：cacheNames、keyGenerator、cacheManager、cacheResolver。","方法上的注解优先，可以覆盖类级配置。","减少重复配置，改缓存名只改一处。","只能标在类上，标在方法上无效。"]
attrs: value:String[]="{}"; cacheNames:String[]="{}"; keyGenerator:String=""; cacheManager:String=""; cacheResolver:String=""
notes: ["类里多个 cache 时，在方法上单独写 cacheNames 覆盖即可。","它只负责默认值，真正开启缓存仍然要靠 @EnableCaching。"]
docs: https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/cache/annotation/CacheConfig.html , https://docs.spring.io/spring-framework/reference/integration/cache/annotations.html
import org.springframework.cache.annotation.CacheConfig;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Service
@CacheConfig(cacheNames = "users")
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // 不用再重复写 cacheNames = "users"
    @Cacheable(key = "#id")
    public User getById(Long id) {
        return userRepository.findById(id).orElse(null);
    }

    @CacheEvict(key = "#id")
    public void deleteById(Long id) {
        userRepository.deleteById(id);
    }
}

### enable-scheduling | @EnableScheduling | async
tagline: 打开定时任务的支持
plain: 加在配置类上，Spring 才会扫描 @Scheduled 方法并按 cron 或固定间隔调度。默认调度器只有一个线程，一个任务跑久了会把后面的任务全堵住，所以多任务场景要自己配 TaskScheduler 线程池。它只负责开启，任务的具体时间写在 @Scheduled 上，配错了不会报错但不会按预期执行。
since: Spring 3.1 | versionNote: null
keyPoints: ["没有它，@Scheduled 方法不会被调度。","默认单线程，任务会排队，多任务要配线程池。","配一个 TaskScheduler Bean 即可替换默认调度器。","集群部署时每个实例都会跑，需要分布式锁或选主。"]
attrs: 
notes: ["定时任务抛异常不会影响下一次调度，但异常会被吞掉，记得自己记录日志。","应用关闭时默认等任务跑完，急停要配 setWaitForTasksToCompleteOnShutdown。"]
docs: https://docs.spring.io/spring-framework/reference/integration/scheduling.html#scheduling-annotation-support-scheduled , https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/scheduling/annotation/EnableScheduling.html
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

@Configuration
@EnableScheduling
public class SchedulingConfig {

    // 默认调度器是单线程，多个任务会互相排队
    @Bean
    public ThreadPoolTaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(4);
        scheduler.setThreadNamePrefix("sched-");
        scheduler.initialize();
        return scheduler;
    }
}

### scheduled | @Scheduled | async
tagline: 按 cron 或固定间隔跑方法
plain: 标在方法上，Spring 按 cron 表达式或固定间隔调用它。方法必须无参、返回 void，否则启动时报错。cron 是六段，依次是秒、分、时、日、月、周，比 Linux 的五段多一个秒；fixedRate 按固定频率跑，fixedDelay 是上次跑完再等多久，任务耗时超过间隔时 fixedRate 会追着补跑。
since: Spring 3.0 | versionNote: null
keyPoints: ["方法必须返回 void 且不能有参数，否则启动失败。","cron 是六段，支持 zone 指定时区。","fixedRate 按开始时间算间隔，fixedDelay 按结束时间算。","initialDelay 控制首次延迟，配合 fixedRate 或 fixedDelay 用。","默认单线程调度，长任务会阻塞其他任务。"]
attrs: cron:String=""; zone:String=""; fixedRate:long="-1"; fixedDelay:long="-1"; initialDelay:long="-1"; timeUnit:TimeUnit="MILLISECONDS"; fixedRateString:String=""; fixedDelayString:String=""
notes: ["cron 里的 ? 只能用在日或周其中一个，另一个用 *。","集群环境要加分布式锁，否则每个节点都会执行一次。"]
docs: https://docs.spring.io/spring-framework/reference/integration/scheduling.html#scheduling-annotation-support-scheduled , https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/scheduling/annotation/Scheduled.html
import java.time.LocalDateTime;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ReportJob {

    // 六段 cron：秒 分 时 日 月 周，这里每 5 分钟执行一次
    @Scheduled(cron = "0 0/5 * * * *", zone = "Asia/Shanghai")
    public void buildReport() {
        System.out.println("build report at " + LocalDateTime.now());
    }

    // 上次执行完 30 秒后再跑，串行不会重叠
    @Scheduled(fixedDelay = 30_000)
    public void refreshCache() {
        // 刷新逻辑
    }
}
