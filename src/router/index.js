import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: false }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresAuth: false, isAuthPage: true }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { requiresAuth: false, isAuthPage: true }
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('../views/UserManagementView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/jenkinsfile',
      name: 'jenkinsfile',
      redirect: '/cicd',
      meta: { requiresAuth: false }
    },
    {
      path: '/cicd',
      name: 'cicd',
      component: () => import('../views/CICDView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/cicd-scanner',
      name: 'cicd-scanner',
      component: () => import('../views/CICDScannerView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/dockerfile',
      name: 'dockerfile',
      component: () => import('../views/DockerfileView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/billing',
      name: 'billing',
      component: () => import('../views/BillingView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/logs',
      name: 'logs',
      component: () => import('../views/LogView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('../views/HistoryView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/workflow',
      name: 'workflow',
      component: () => import('../views/WorkflowView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/knowledge',
      name: 'knowledge',
      component: () => import('../views/KnowledgeBaseView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/knowledge/create',
      name: 'knowledge-create',
      component: () => import('../views/KnowledgeCreateView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/knowledge/:id',
      name: 'knowledge-detail',
      component: () => import('../views/KnowledgeDetailView.vue'),
      meta: { requiresAuth: false }
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  if (!authStore.isInitialized) {
    await authStore.initialize()
  }

  if (to.meta.isAuthPage && authStore.isAuthenticated) {
    next({ path: '/' })
    return
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next({ path: '/' })
    return
  }

  next()
})

export default router
