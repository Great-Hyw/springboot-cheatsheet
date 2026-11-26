/**
 * 分类元信息：顺序、名称、一句话说明、主题色。
 * 分类 id 与 docs/CONTENT-SPEC.md §4 保持一致，不可随意新增。
 */
export const ANNOTATION_CATEGORIES = [
  { id: 'core', label: '核心容器', short: '核心', desc: 'Bean、依赖注入、容器配置与事件', color: '#5b9c34' },
  { id: 'aop', label: '切面编程', short: 'AOP', desc: '把日志、事务等横切逻辑抽出来', color: '#8b5cf6' },
  { id: 'web', label: 'Web 与 REST', short: 'Web', desc: '写接口、收参数、返回 JSON', color: '#2563eb' },
  { id: 'validation', label: '参数校验', short: '校验', desc: '在入口处挡住不合法的数据', color: '#0891b2' },
  { id: 'data', label: '数据访问', short: '数据', desc: '事务、JPA、MyBatis 与缓存', color: '#d97706' },
  { id: 'async', label: '异步与定时', short: '异步', desc: '后台任务、线程池与定时调度', color: '#db2777' },
  { id: 'boot', label: 'Spring Boot', short: 'Boot', desc: '自动配置、配置绑定与启动', color: '#16a34a' },
  { id: 'test', label: '测试', short: '测试', desc: '切片测试、Mock 与测试配置', color: '#7c3aed' },
  { id: 'security', label: '安全', short: '安全', desc: '登录认证、方法级权限控制', color: '#dc2626' },
]

export const KNOWLEDGE_CATEGORIES = [
  { id: 'principle', label: '核心原理', desc: 'IoC、Bean 生命周期、AOP、循环依赖', color: '#5b9c34' },
  { id: 'web', label: 'Web 开发', desc: '请求流程、异常处理、参数校验', color: '#2563eb' },
  { id: 'data', label: '数据访问', desc: '事务失效、JPA 与 MyBatis 选型', color: '#d97706' },
  { id: 'boot', label: 'Spring Boot', desc: '自动配置、启动流程、配置优先级', color: '#16a34a' },
  { id: 'test', label: '测试', desc: '切片测试与测试替身', color: '#7c3aed' },
  { id: 'engineering', label: '工程实践', desc: '异步、定时、日志、打包部署', color: '#db2777' },
  { id: 'migration', label: '版本升级', desc: 'javax→jakarta、Boot 2→3→4', color: '#dc2626' },
]

const ANN_MAP = new Map(ANNOTATION_CATEGORIES.map((c) => [c.id, c]))
const KN_MAP = new Map(KNOWLEDGE_CATEGORIES.map((c) => [c.id, c]))

export function annotationCategory(id) {
  return ANN_MAP.get(id) || { id, label: id || '未分类', short: id || '其它', desc: '', color: '#64726a' }
}

export function knowledgeCategory(id) {
  return KN_MAP.get(id) || { id, label: id || '未分类', desc: '', color: '#64726a' }
}

export const LEVELS = ['入门', '进阶']