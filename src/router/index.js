import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/console' },
    {
      path: '/console',
      name: 'console',
      component: () => import('../views/ConsoleView.vue'),
      meta: { title: '控制台' }
    },
    {
      path: '/live',
      name: 'live',
      component: () => import('../views/LiveView.vue'),
      meta: { title: '实时运行' }
    },
    {
      path: '/results',
      name: 'results',
      component: () => import('../views/ResultsView.vue'),
      meta: { title: '运行结果' }
    },
    {
      path: '/editor',
      name: 'editor',
      component: () => import('../views/EditorView.vue'),
      meta: { title: 'Spec 编辑' }
    }
  ]
})

export default router
