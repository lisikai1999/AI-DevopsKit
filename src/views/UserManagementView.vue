<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-row">
        <div class="page-title">
          <el-icon class="title-icon"><User /></el-icon>
          <h1>用户管理</h1>
        </div>
        <el-button type="primary" size="large" @click="refreshUsers">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
      <p class="page-subtitle">管理系统用户、角色和权限</p>
    </div>

    <div class="page-content">
      <el-card v-loading="isLoading" class="content-card">
        <template #header>
          <div class="card-header">
            <div class="header-left">
              <span class="card-title">用户列表</span>
              <el-tag v-if="users.length > 0" type="info" size="large">
                共 {{ users.length }} 位用户
              </el-tag>
            </div>
            <div class="header-right">
              <el-select
                v-model="filterRole"
                placeholder="按角色筛选"
                clearable
                size="large"
                @change="refreshUsers"
              >
                <el-option label="管理员" value="admin" />
                <el-option label="普通用户" value="user" />
                <el-option label="只读用户" value="readonly" />
              </el-select>
            </div>
          </div>
        </template>

        <el-table
          :data="users"
          style="width: 100%"
          stripe
          v-if="users.length > 0"
        >
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="username" label="用户名" min-width="120">
            <template #default="{ row }">
              <div class="user-info">
                <el-avatar :size="32" :style="{ backgroundColor: getAvatarColor(row.username) }">
                  {{ row.username.charAt(0).toUpperCase() }}
                </el-avatar>
                <span class="username-text">{{ row.username }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="full_name" label="姓名" min-width="100">
            <template #default="{ row }">
              {{ row.full_name || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="email" label="邮箱" min-width="180" />
          <el-table-column prop="role" label="角色" width="120">
            <template #default="{ row }">
              <el-tag :type="getRoleTagType(row.role)" size="large">
                {{ getRoleLabel(row.role) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="is_active" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.is_active ? 'success' : 'danger'" size="large">
                {{ row.is_active ? '活跃' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="last_login_at" label="最后登录" width="180">
            <template #default="{ row }">
              {{ row.last_login_at ? formatDateTime(row.last_login_at) : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-button
                type="primary"
                size="small"
                :icon="Edit"
                @click="openEditDialog(row)"
              >
                编辑
              </el-button>
              <el-button
                :type="row.is_active ? 'warning' : 'success'"
                size="small"
                :icon="row.is_active ? 'CircleClose' : 'CircleCheck'"
                @click="toggleActive(row)"
                :disabled="row.id === currentUserId"
              >
                {{ row.is_active ? '禁用' : '启用' }}
              </el-button>
              <el-button
                type="danger"
                size="small"
                :icon="Delete"
                @click="handleDelete(row)"
                :disabled="row.id === currentUserId"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-empty
          v-else
          description="暂无用户数据"
          :image-size="200"
        >
          <el-button type="primary" @click="refreshUsers">
            刷新
          </el-button>
        </el-empty>
      </el-card>
    </div>

    <el-dialog
      v-model="editDialogVisible"
      title="编辑用户"
      width="500px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-width="100px"
      >
        <el-form-item label="用户名">
          <el-input v-model="editForm.username" disabled />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="editForm.email" />
        </el-form-item>
        <el-form-item label="姓名" prop="full_name">
          <el-input v-model="editForm.full_name" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="editForm.role" style="width: 100%">
            <el-option label="管理员 (ADMIN)" value="admin" />
            <el-option label="普通用户 (USER)" value="user" />
            <el-option label="只读用户 (READONLY)" value="readonly" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch
            v-model="editForm.is_active"
            active-text="活跃"
            inactive-text="禁用"
          />
        </el-form-item>
        <el-form-item label="重置密码" prop="password">
          <el-input
            v-model="editForm.password"
            type="password"
            placeholder="留空则不修改密码"
            :show-password="true"
          />
          <div class="form-tip">如需重置密码，请输入新密码（至少6位）</div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="isSaving"
          @click="handleSaveEdit"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usersApi, ApiError } from '@/services/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Refresh, Edit, Delete, CircleClose, CircleCheck } from '@element-plus/icons-vue'

const authStore = useAuthStore()

const isLoading = ref(false)
const isSaving = ref(false)
const users = ref([])
const filterRole = ref(null)
const editDialogVisible = ref(false)
const editFormRef = ref(null)

const currentUserId = computed(() => authStore.user?.id)

const editForm = reactive({
  id: null,
  username: '',
  email: '',
  full_name: '',
  role: 'user',
  is_active: true,
  password: ''
})

const editRules = {
  email: [
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ],
  password: [
    { min: 6, message: '密码长度至少6个字符', trigger: 'blur' }
  ]
}

const avatarColors = [
  '#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399',
  '#9a57ff', '#00d4ff', '#009688', '#ff5722', '#795548'
]

const getAvatarColor = (username) => {
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

const getRoleLabel = (role) => {
  const labels = {
    'admin': '管理员',
    'user': '用户',
    'readonly': '只读'
  }
  return labels[role?.toLowerCase()] || role
}

const getRoleTagType = (role) => {
  const types = {
    'admin': 'danger',
    'user': 'primary',
    'readonly': 'info'
  }
  return types[role?.toLowerCase()] || 'info'
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const loadUsers = async () => {
  isLoading.value = true
  try {
    const params = {}
    if (filterRole.value) {
      params.role = filterRole.value.toUpperCase()
    }
    const data = await usersApi.list(params)
    users.value = data
  } catch (error) {
    console.error('Failed to load users:', error)
    if (error instanceof ApiError && error.status === 401) {
      ElMessage.error('登录已过期，请重新登录')
    } else {
      ElMessage.error('加载用户列表失败：' + (error.message || '未知错误'))
    }
  } finally {
    isLoading.value = false
  }
}

const refreshUsers = () => {
  loadUsers()
}

const openEditDialog = (row) => {
  editForm.id = row.id
  editForm.username = row.username
  editForm.email = row.email
  editForm.full_name = row.full_name || ''
  editForm.role = row.role?.toLowerCase() || 'user'
  editForm.is_active = row.is_active
  editForm.password = ''
  editDialogVisible.value = true
}

const handleSaveEdit = async () => {
  if (!editFormRef.value) return

  await editFormRef.value.validate(async (valid) => {
    if (valid) {
      isSaving.value = true
      try {
        const updateData = {
          email: editForm.email,
          full_name: editForm.full_name || null,
          role: editForm.role.toUpperCase(),
          is_active: editForm.is_active
        }

        if (editForm.password) {
          updateData.password = editForm.password
        }

        await usersApi.update(editForm.id, updateData)
        ElMessage.success('用户信息已更新')
        editDialogVisible.value = false
        loadUsers()
      } catch (error) {
        console.error('Failed to update user:', error)
        ElMessage.error('更新失败：' + (error.message || '未知错误'))
      } finally {
        isSaving.value = false
      }
    }
  })
}

const toggleActive = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要${row.is_active ? '禁用' : '启用'}用户 "${row.username}" 吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await usersApi.update(row.id, {
      is_active: !row.is_active
    })
    ElMessage.success(`用户已${row.is_active ? '禁用' : '启用'}`)
    loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to toggle user:', error)
      ElMessage.error('操作失败：' + (error.message || '未知错误'))
    }
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户 "${row.username}" 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'danger'
      }
    )

    await usersApi.delete(row.id)
    ElMessage.success('用户已删除')
    loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete user:', error)
      ElMessage.error('删除失败：' + (error.message || '未知错误'))
    }
  }
}

onMounted(async () => {
  await authStore.initialize()
  if (!authStore.isAdmin) {
    ElMessage.error('只有管理员可以访问用户管理页面')
    return
  }
  loadUsers()
})
</script>

<style scoped>
@import '@/assets/page-styles.css';

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.username-text {
  font-weight: 500;
  color: #303133;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 6px;
}

@media (max-width: 768px) {
  .header-row,
  .card-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .header-left,
  .header-right {
    justify-content: space-between;
  }
}

:global(html.dark) {
  & .username-text {
    color: var(--el-text-color-primary);
  }
}
</style>
