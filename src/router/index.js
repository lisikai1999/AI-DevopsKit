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
      redirect: '/cicd',
    },
    {
      path: '/cicd',
      name: 'cicd',
      component: () => import('../views/CICDView.vue'),
    },
    {
      path: '/cicd-scanner',
      name: 'cicd-scanner',
      component: () => import('../views/CICDScannerView.vue'),
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
      path: '/workflow',
      name: 'workflow',
      component: () => import('../views/WorkflowView.vue'),
    },
    {
      path: '/knowledge',
      name: 'knowledge',
      component: () => import('../views/KnowledgeBaseView.vue'),
    },
    {
      path: '/knowledge/:id',
      name: 'knowledge-detail',
      component: () => import('../views/KnowledgeDetailView.vue'),
    },
  ],
})

export default router