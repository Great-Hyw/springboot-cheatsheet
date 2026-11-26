import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'home', component: () => import('../views/HomeView.vue'), meta: { title: 'Spring Boot 注解与知识速查' } },
  { path: '/annotations', name: 'annotations', component: () => import('../views/AnnotationsView.vue'), meta: { title: '注解速查' } },
  { path: '/annotations/:id', name: 'annotation-detail', component: () => import('../views/AnnotationDetailView.vue'), meta: { title: '注解详情' } },
  { path: '/knowledge', name: 'knowledge', component: () => import('../views/KnowledgeView.vue'), meta: { title: '知识库' } },
  { path: '/knowledge/:id', name: 'knowledge-detail', component: () => import('../views/KnowledgeDetailView.vue'), meta: { title: '知识文章' } },
  { path: '/favorites', name: 'favorites', component: () => import('../views/FavoritesView.vue'), meta: { title: '我的收藏' } },
  { path: '/about', name: 'about', component: () => import('../views/AboutView.vue'), meta: { title: '关于与内容核查' } },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue'), meta: { title: '页面不存在' } },
]

const router = createRouter({
  // hash 模式：直接双击打开 dist/index.html 也能用，部署到任意静态空间不用配 rewrite
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, top: 76, behavior: 'smooth' }
    return { top: 0 }
  },
})

router.afterEach((to) => {
  const base = 'SpringBoot 速查'
  document.title = to.meta?.title ? `${to.meta.title} · ${base}` : base
})

export default router