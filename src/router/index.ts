import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { public: true, hidden: true },
    },
    {
      path: '/',
      redirect: '/exams',
    },
    {
      path: '/exams',
      name: 'ExamList',
      component: () => import('@/views/ExamList.vue'),
      meta: { title: '考试记录', icon: 'document-text' },
    },
    {
      path: '/exams/new',
      name: 'ExamEntry',
      component: () => import('@/views/ExamEntry.vue'),
      meta: { title: '录入考试', icon: 'add-circle' },
    },
    {
      path: '/exams/:id',
      name: 'ExamDetail',
      component: () => import('@/views/ExamDetail.vue'),
      meta: { title: '考试详情', hidden: true },
    },
    {
      path: '/practice',
      name: 'PracticeHome',
      component: () => import('@/views/PracticeHome.vue'),
      meta: { title: '专项练习', icon: 'fitness' },
    },
    {
      path: '/practice/new',
      name: 'PracticeEntry',
      component: () => import('@/views/PracticeEntry.vue'),
      meta: { title: '录入练习', hidden: true },
    },
    {
      path: '/practice/:id',
      name: 'PracticeDetail',
      component: () => import('@/views/PracticeDetail.vue'),
      meta: { title: '练习详情', hidden: true },
    },
    {
      path: '/trends',
      name: 'TrendAnalysis',
      component: () => import('@/views/TrendAnalysis.vue'),
      meta: { title: '趋势分析', icon: 'trending-up' },
    },
    {
      path: '/goals',
      name: 'GoalsPlans',
      component: () => import('@/views/GoalsPlans.vue'),
      meta: { title: '目标与计划', icon: 'flag' },
    },
    {
      path: '/idioms',
      name: 'IdiomHome',
      component: () => import('@/views/IdiomHome.vue'),
      meta: { title: '成语积累', icon: 'book' },
    },
    {
      path: '/idioms/new',
      name: 'IdiomEntry',
      component: () => import('@/views/IdiomEntry.vue'),
      meta: { title: '添加成语', hidden: true },
    },
    {
      path: '/idioms/:id',
      name: 'IdiomDetail',
      component: () => import('@/views/IdiomDetail.vue'),
      meta: { title: '成语详情', hidden: true },
    },
    {
      path: '/ai',
      name: 'AIAssistant',
      component: () => import('@/views/AIAssistant.vue'),
      meta: { title: 'AI 助手', icon: 'bulb' },
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('@/views/Settings.vue'),
      meta: { title: '设置', icon: 'settings' },
    },
  ],
})

router.beforeEach((to) => {
  const authStore = useAuthStore()
  if (!to.meta.public && !authStore.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.path === '/login' && authStore.isAuthenticated) {
    return '/exams'
  }
})

export default router
