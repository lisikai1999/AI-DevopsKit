<template>
  <div class="register-container">
    <div class="register-box">
      <div class="register-header">
        <div class="logo-section">
          <el-icon size="48" color="#409eff"><Cpu /></el-icon>
          <h1 class="app-title">AI DevOps 助手</h1>
        </div>
        <p class="register-subtitle">创建新账号</p>
      </div>

      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        class="register-form"
        label-position="top"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="registerForm.username"
            placeholder="请输入用户名"
            size="large"
            :prefix-icon="User"
          />
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input
            v-model="registerForm.email"
            placeholder="请输入邮箱地址"
            size="large"
            :prefix-icon="Message"
          />
        </el-form-item>

        <el-form-item label="姓名" prop="fullName">
          <el-input
            v-model="registerForm.fullName"
            placeholder="请输入姓名（可选）"
            size="large"
            :prefix-icon="UserFilled"
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            :prefix-icon="Lock"
            :show-password="true"
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="registerForm.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            size="large"
            :prefix-icon="Lock"
            :show-password="true"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="isLoading"
            class="register-button"
            @click="handleRegister"
          >
            注册
          </el-button>
        </el-form-item>

        <el-divider content-position="center">
          <span class="divider-text">已有账号？</span>
        </el-divider>

        <el-form-item>
          <el-button
            type="info"
            size="large"
            plain
            class="login-button"
            @click="goToLogin"
          >
            立即登录
          </el-button>
        </el-form-item>
      </el-form>

      <div class="register-footer">
        <p class="copyright">&copy; 2025 AI DevOps 助手</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { Cpu, User, Lock, Message, UserFilled } from '@element-plus/icons-vue'

const router = useRouter()
const authStore = useAuthStore()

const registerFormRef = ref(null)
const isLoading = ref(false)

const registerForm = reactive({
  username: '',
  email: '',
  fullName: '',
  password: '',
  confirmPassword: ''
})

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== registerForm.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 50, message: '用户名长度在 2 到 50 个字符', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 50, message: '密码长度在 6 到 50 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

const handleRegister = async () => {
  if (!registerFormRef.value) return

  await registerFormRef.value.validate(async (valid) => {
    if (valid) {
      isLoading.value = true
      try {
        await authStore.register({
          username: registerForm.username,
          email: registerForm.email,
          full_name: registerForm.fullName || registerForm.username,
          password: registerForm.password
        })
        ElMessage.success('注册成功！请登录')
        router.push('/login')
      } catch (error) {
        console.error('Register error:', error)
        const errorMessage = error.message || '注册失败，请重试'
        ElMessage.error(errorMessage)
      } finally {
        isLoading.value = false
      }
    }
  })
}

const goToLogin = () => {
  router.push('/login')
}

onMounted(async () => {
  await authStore.initialize()
  if (authStore.isAuthenticated) {
    router.push('/')
  }
})
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.register-box {
  width: 100%;
  max-width: 480px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.register-header {
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

.register-subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
}

.register-form {
  padding: 30px 40px;
}

.register-button,
.login-button {
  width: 100%;
}

.divider-text {
  color: #909399;
  font-size: 13px;
}

.register-footer {
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
  .register-form {
    padding: 20px;
  }

  .register-header {
    padding: 30px 20px 15px;
  }

  .app-title {
    font-size: 1.5rem;
  }
}

:global(html.dark) {
  & .register-box {
    background-color: var(--el-bg-color);
  }

  & .register-form {
    background-color: var(--el-bg-color);
  }

  & .register-footer {
    background-color: var(--el-fill-color-light);
    border-top-color: var(--el-border-color);
  }

  & .copyright {
    color: var(--el-text-color-secondary);
  }
}
</style>
