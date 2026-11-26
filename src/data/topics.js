/**
 * 四个实战专题分块：规范 / 面经 / 企业分层 / Maven 坐标。
 *
 * 约束：四块数据文件分开、入口分开、搜索分组分开，任何时候都不做跨块合并展示。
 */
const FILES = import.meta.glob('./topics-*.json', { eager: true })

export const TOPICS = [
  {
    id: 'conventions',
    label: 'Spring Boot 开发规范',
    short: '规范',
    icon: '规',
    color: '#2f855a',
    desc: '包结构、注入、配置、接口、异常、事务、日志、测试、依赖，十条团队级约定与落地检查清单。',
    entry: '团队协作先对齐这十条',
  },
  {
    id: 'interview',
    label: '面试高频题（面经）',
    short: '面经',
    icon: '面',
    color: '#b7791f',
    desc: '自动配置、循环依赖、事务失效、AOP、优雅停机……常见面试题的一句话答案、展开讲和追问。',
    entry: '先答结论，再讲机制',
  },
  {
    id: 'layers',
    label: '现代企业分层写法',
    short: '分层',
    icon: '层',
    color: '#2b6cb0',
    desc: 'Controller / Service / Repository / DTO 各层职责、代码骨架与边界，讲清依赖方向和事务边界。',
    entry: '每层只做自己该做的事',
  },
  {
    id: 'coordinates',
    label: '常用 Maven 坐标用法',
    short: '坐标',
    icon: '依',
    color: '#805ad5',
    desc: 'Web、数据、安全、测试、监控、工具六组常用依赖：坐标、版本谁来管、配置怎么写、坑在哪。',
    entry: '坐标真实，版本不瞎写',
  },
]

const TOPIC_MAP = new Map(TOPICS.map((t) => [t.id, t]))

function normalize(item, topic) {
  return {
    ...item,
    topic: topic.id,
    topicLabel: topic.label,
    topicShort: topic.short,
    color: topic.color,
    tags: item.tags || [],
    sources: item.sources || [],
    coordinates: item.coordinates || [],
  }
}

export const topics = Object.values(FILES)
  .flatMap((doc) => (Array.isArray(doc?.items) ? doc.items : []).map((it) => normalize(it, TOPIC_MAP.get(doc.topic) || TOPIC_MAP.conventions)))

const topicOrder = new Map(TOPICS.map((t, i) => [t.id, i]))
// 按 TOPICS 声明的顺序分块展示；同一块内保留 JSON 里的原始顺序（stable sort）
topics.sort((a, b) => topicOrder.get(a.topic) - topicOrder.get(b.topic))

export const topicCounts = new Map(TOPICS.map((t) => [t.id, topics.filter((x) => x.topic === t.id).length]))

export const topicStats = {
  total: topics.length,
  blocks: TOPICS.length,
  byTopic: Object.fromEntries(topicCounts),
}

export function getTopic(id) {
  return TOPIC_MAP.get(String(id)) || null
}

export function getTopicArticles(topicId) {
  return topics.filter((t) => t.topic === topicId)
}

export function getTopicArticle(topicId, articleId) {
  return topics.find((t) => t.topic === topicId && t.id === articleId) || null
}