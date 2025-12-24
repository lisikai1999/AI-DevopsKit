import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/jenkinsfile',
      name: 'jenkinsfile',
      component: () => import('../views/JenkinsfileView.vue'),
    },
    {
      path: '/dockerfile',
      name: 'dockerfile',
      component: () => import('../views/DockerfileView.vue'),
    },
    {
      path: '/billing',
      name: 'billing',
      component: () => import('../views/BillingView.vue'),
    },
    {
      path: '/logs',
      name: 'logs',
      component: () => import('../views/LogView.vue'),
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('../views/HistoryView.vue'),
    },
    {
      path: '/test',
      name: 'test',
      component: () => import('../views/Test.vue'),
    },
  ],
})

export default router