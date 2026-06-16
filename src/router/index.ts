import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
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

export default router
