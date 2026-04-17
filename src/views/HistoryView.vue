<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">
        <el-icon class="title-icon"><Clock /></el-icon>
        <h1>历史记录</h1>
      </div>
      <p class="page-subtitle">查看和管理您的操作历史</p>
    </div>

    <div class="page-content">
      <el-card class="content-card">
        <template #header>
          <div class="card-header">
            <span class="card-title">操作历史</span>
            <div class="header-actions">
              <el-button
                size="small"
                @click="refreshHistory"
              >
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="clearAllHistory"
                :disabled="!history.length"
              >
                <el-icon><Delete /></el-icon>
                清空历史
              </el-button>
            </div>
          </div>
        </template>
        
        <div class="filters">
          <el-radio-group v-model="filterType" size="small">
            <el-radio-button label="all">全部</el-radio-button>
            <el-radio-button label="jenkinsfile">Jenkinsfile</el-radio-button>
            <el-radio-button label="dockerfile">Dockerfile</el-radio-button>
            <el-radio-button label="billing">账单分析</el-radio-button>
            <el-radio-button label="log">日志翻译</el-radio-button>
          </el-radio-group>
          
          <el-input
            v-model="searchKeyword"
            placeholder="搜索标题..."
            prefix-icon="Search"
            size="small"
            class="search-input"
            clearable
          />
        </div>
        
        <div v-if="filteredHistory.length > 0" class="history-list">
          <el-table
            :data="paginatedHistory"
            style="width: 100%"
            @row-click="viewHistory"
          >
            <el-table-column prop="type" label="类型" width="120">
              <template #default="{ row }">
                <el-tag :type="getTagType(row.type)" size="large">
                  {{ getTypeLabel(row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            
            <el-table-column prop="title" label="标题" min-width="250" />
            
            <el-table-column prop="createdAt" label="创建时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
            
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <el-button
                  size="small"
                  @click.stop="viewHistory(row)"
                >
                  <el-icon><View /></el-icon>
                  查看
                </el-button>
                <el-button
                  size="small"
                  @click.stop="editHistory(row)"
                >
                  <el-icon><Edit /></el-icon>
                  编辑
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  @click.stop="deleteHistory(row.id)"
                >
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <div class="pagination">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="filteredHistory.length"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </div>
        
        <el-empty
          v-else
          description="暂无历史记录"
          :image-size="200"
        >
          <el-button type="primary" @click="$router.push('/jenkinsfile')">
            开始使用
          </el-button>
        </el-empty>
      </el-card>
    </div>
    
    <el-dialog
      v-model="dialogVisible"
      :title="selectedHistory?.title"
      width="80%"
      destroy-on-close
    >
      <div v-if="selectedHistory">
        <div class="dialog-header">
          <el-tag :type="getTagType(selectedHistory.type)" size="large">
            {{ getTypeLabel(selectedHistory.type) }}
          </el-tag>
          <span class="dialog-date">{{ formatDate(selectedHistory.createdAt) }}</span>
        </div>
        
        <div class="dialog-content">
          <div class="section">
            <h4 class="section-title">内容:</h4>
            <MonacoEditor
              v-model="selectedHistory.content"
              :language="getEditorLanguage(selectedHistory.type)"
              height="300px"
              :readonly="!isEditMode"
            />
          </div>
          
          <div v-if="selectedHistory.result" class="section result-section">
            <h4 class="section-title">结果:</h4>
            <MonacoEditor
              v-model="selectedHistory.result"
              language="json"
              height="200px"
              :readonly="true"
            />
          </div>
        </div>
        
        <div class="dialog-actions">
          <el-button @click="dialogVisible = false">关闭</el-button>
          <el-button
            v-if="!isEditMode"
            type="primary"
            @click="isEditMode = true"
          >
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
          <el-button
            v-else
            type="success"
            @click="saveEdit"
          >
            <el-icon><Check /></el-icon>
            保存
          </el-button>
          <el-button
            v-if="isEditMode"
            @click="cancelEdit"
          >
            取消
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
    import { ref, computed, onMounted } from 'vue'
    import { ElMessage, ElMessageBox } from 'element-plus'
    import { Clock, Refresh, Delete, View, Edit, Check, Search } from '@element-plus/icons-vue'
    import MonacoEditor from '@/components/MonacoEditor.vue'
    import { useAppStore } from '@/stores/app'
    import { useHistory } from '@/composables/useHistory'

    const appStore = useAppStore()
    const { formatDate, getTagType, getTypeLabel, getEditorLanguage } = useHistory()

    const filterType = ref('all')
    const searchKeyword = ref('')
    const currentPage = ref(1)
    const pageSize = ref(20)
    const dialogVisible = ref(false)
    /**
    * 选中的历史记录
    * @type {import('@/stores/app').HistoryItem | null}
    */
    const selectedHistory = ref(null) // 移除TS类型注解，改为纯JS的ref(null)
    const isEditMode = ref(false)
    const originalContent = ref('')

    // 加载历史记录
    const history = computed(() => appStore.history)

    // 筛选后的历史记录
    const filteredHistory = computed(() => {
    let filtered = history.value
    
    // 类型筛选
    if (filterType.value !== 'all') {
        filtered = filtered.filter(item => item.type === filterType.value)
    }
    
    // 关键词搜索
    if (searchKeyword.value.trim()) {
        const keyword = searchKeyword.value.toLowerCase()
        filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(keyword)
        )
    }
    
    return filtered
    })

    // 分页后的历史记录
    const paginatedHistory = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    return filteredHistory.value.slice(start, end)
    })



    const refreshHistory = () => {
    appStore.loadHistory(true)
    ElMessage.success('历史记录已刷新')
    }

    const clearAllHistory = async () => {
    try {
        await ElMessageBox.confirm(
        '确定要清空所有历史记录吗？此操作不可恢复。',
        '确认清空',
        {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        }
        )
        
        appStore.clearHistory()
        ElMessage.success('历史记录已清空')
    } catch {
        // 用户取消，不做处理
    }
    }

    /**
    * 查看历史记录详情
    * @param {import('@/stores/app').HistoryItem} item - 历史记录项
    */
    const viewHistory = (item) => {
    selectedHistory.value = { ...item }
    isEditMode.value = false
    dialogVisible.value = true
    }

    /**
    * 编辑历史记录
    * @param {import('@/stores/app').HistoryItem} item - 历史记录项
    */
    const editHistory = (item) => {
    selectedHistory.value = { ...item }
    originalContent.value = item.content
    isEditMode.value = true
    dialogVisible.value = true
    }

    const saveEdit = async () => {
    if (!selectedHistory.value) return
    
    try {
        appStore.updateHistoryItem(selectedHistory.value.id, {
            content: selectedHistory.value.content
        })
        
        isEditMode.value = false
        ElMessage.success('保存成功')
    } catch (error) {
        ElMessage.error('保存失败')
    }
    }

    const cancelEdit = () => {
    if (selectedHistory.value) {
        selectedHistory.value.content = originalContent.value
    }
    isEditMode.value = false
    }

    /**
    * 删除单条历史记录
    * @param {string} id - 历史记录的唯一标识
    */
    const deleteHistory = async (id) => {
    try {
        await ElMessageBox.confirm(
        '确定要删除这条历史记录吗？',
        '确认删除',
        {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        }
        )
        
        appStore.deleteHistoryItem(id)
        ElMessage.success('删除成功')
    } catch {
        // 用户取消，不做处理
    }
    }

    const handleSizeChange = (size) => {
    pageSize.value = size
    currentPage.value = 1
    }

    const handleCurrentChange = (page) => {
    currentPage.value = page
    }



    onMounted(() => {
    appStore.loadHistory()
    })
</script>

<style scoped>
  .page-container {
    min-height: 100vh;
    background-color: #f5f7fa;
  }

  .page-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 40px 20px;
    margin-bottom: 32px;
  }

  .page-title {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 12px;
  }

  .title-icon {
    font-size: 32px;
    color: white;
  }

  .page-title h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 600;
    color: white;
  }

  .page-subtitle {
    margin: 0;
    font-size: 16px;
    color: rgba(255, 255, 255, 0.9);
    margin-left: 48px;
  }

  .page-content {
    padding: 0 20px 40px;
    max-width: 1400px;
    margin: 0 auto;
  }

  .content-card {
    border-radius: 12px;
    border: none;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .card-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }

  .filters {
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }

  .search-input {
    width: 200px;
  }

  .history-list {
    margin-top: 24px;
  }

  .pagination {
    margin-top: 24px;
    display: flex;
    justify-content: center;
  }

  .dialog-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
  }

  .dialog-date {
    color: #909399;
    font-size: 14px;
  }

  .dialog-content {
    padding: 8px 0;
  }

  .section {
    margin-bottom: 24px;
  }

  .section:last-child {
    margin-bottom: 0;
  }

  .section-title {
    margin: 0 0 12px 0;
    font-size: 15px;
    font-weight: 600;
    color: #303133;
  }

  .result-section {
    margin-top: 24px;
  }

  .dialog-actions {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid #e4e7ed;
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  :deep(.el-table__row) {
    cursor: pointer;
  }

  :deep(.el-table__row:hover) {
    background-color: #f5f7fa;
  }

  @media (min-width: 1400px) {
    .page-header {
      padding: 48px 40px;
    }

    .page-content {
      padding: 0 40px 48px;
    }
  }

  @media (max-width: 1024px) {
    .page-header {
      padding: 32px 15px;
      margin-bottom: 24px;
    }

    .page-title {
      gap: 12px;
    }

    .title-icon {
      font-size: 28px;
    }

    .page-title h1 {
      font-size: 24px;
    }

    .page-subtitle {
      font-size: 14px;
      margin-left: 40px;
    }

    .page-content {
      padding: 0 15px 32px;
    }
  }

  @media (max-width: 768px) {
    .page-header {
      padding: 24px 10px;
      margin-bottom: 20px;
    }

    .page-title {
      gap: 10px;
      flex-direction: column;
      align-items: flex-start;
    }

    .title-icon {
      font-size: 24px;
    }

    .page-title h1 {
      font-size: 20px;
    }

    .page-subtitle {
      font-size: 13px;
      margin-left: 0;
    }

    .page-content {
      padding: 0 10px 24px;
    }

    .header-actions {
      flex-wrap: wrap;
      gap: 8px;
    }

    .filters {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }

    .search-input {
      width: 100%;
    }

    .pagination {
      text-align: center;
    }

    .dialog-actions {
      justify-content: center;
      flex-wrap: wrap;
    }

    .card-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
  }

  :global(html.dark) {
    & .page-container {
      background-color: var(--el-bg-color-page);
    }

    & .page-header {
      background: linear-gradient(135deg, #5468c7 0%, #5a3d8a 100%);
    }

    & .content-card {
      background-color: var(--el-bg-color);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    & .card-title {
      color: var(--el-text-color-primary);
    }

    & .dialog-date {
      color: var(--el-text-color-secondary);
    }

    & .section-title {
      color: var(--el-text-color-primary);
    }

    & .dialog-actions {
      border-top-color: var(--el-border-color);
    }

    & :deep(.el-table__row:hover) {
      background-color: var(--el-fill-color-light);
    }
  }
</style>