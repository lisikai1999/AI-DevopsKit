<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <div class="logo-section">
          <el-icon size="48" color="#409eff"><Cpu /></el-icon>
          <h1 class="app-title">AI DevOps 助手</h1>
        </div>
        <p class="login-subtitle">请登录以继续使用</p>
      </div>

      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        label-position="top"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            size="large"
            :prefix-icon="User"
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            :prefix-icon="Lock"
            :show-password="true"
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item>
          <el-checkbox v-model="loginForm.rememberMe">记住我</el-checkbox>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="isLoading"
            class="login-button"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>

        <el-divider content-position="center">
          <span class="divider-text">还没有账号？</span>
        </el-divider>

        <el-form-item>
          <el-button
            type="info"
            size="large"
            plain
            class="register-button"
            @click="goToRegister"
          >
            立即注册
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-footer">
        <p class="copyright">&copy; 2025 AI DevOps 助手</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { Cpu, User, Lock } from '@element-plus/icons-vue'

const router = useRouter()
const authStore = useAuthStore()

const loginFormRef = ref(null)
const isLoading = ref(false)

const loginForm = reactive({
  username: '',
  password: '',
  rememberMe: false
})

const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 50, message: '用户名长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少 6 个字符', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return

  await loginFormRef.value.validate(async (valid) => {
    if (valid) {
      isLoading.value = true
      try {
        await authStore.login({
          username: loginForm.username,
          password: loginForm.password
        })
        ElMessage.success('登录成功！')
        router.push('/')
      } catch (error) {
        console.error('Login error:', error)
        const errorMessage = error.message || '登录失败，请检查用户名和密码'
        ElMessage.error(errorMessage)
      } finally {
        isLoading.value = false
      }
    }
  })
}

const goToRegister = () => {
  router.push('/register')
}

onMounted(async () => {
  await authStore.initialize()
  if (authStore.isAuthenticated) {
    router.push('/')
  }
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-box {
  width: 100%;
  max-width: 450px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.login-header {
  text-align: center;
  padding: 40px 30px 20px;
  background: linear-gradient(135deg, #409eff 0%, #667eea 100%);
}

.logo-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}

.app-title {
  margin: 0;
  font-size: 1.8rem;
  color: white;
  font-weight: 600;
}

.login-subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
}

.login-form {
  padding: 30px 40px;
}

.login-button,
.register-button {
  width: 100%;
}

.divider-text {
  color: #909399;
  font-size: 13px;
}

.login-footer {
  text-align: center;
  padding: 20px;
  border-top: 1px solid #ebeef5;
  background-color: #fafafa;
}

.copyright {
  margin: 0;
  color: #909399;
  font-size: 13px;
}

@media (max-width: 480px) {
  .login-form {
    padding: 20px;
  }

  .login-header {
    padding: 30px 20px 15px;
  }

  .app-title {
    font-size: 1.5rem;
  }
}

:global(html.dark) {
  & .login-box {
    background-color: var(--el-bg-color);
  }

  & .login-form {
    background-color: var(--el-bg-color);
  }

  & .login-footer {
    background-color: var(--el-fill-color-light);
    border-top-color: var(--el-border-color);
  }

  & .copyright {
    color: var(--el-text-color-secondary);
  }
}
</style>
