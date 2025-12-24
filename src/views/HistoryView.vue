<template>
  <div class="history-view">
    <el-container>
      <el-header class="page-header">
        <h1>
          <el-icon><Clock /></el-icon>
          历史记录
        </h1>
        <p>查看和管理您的操作历史</p>
      </el-header>
      
      <el-main>
        <el-card>
          <template #header>
            <div class="card-header">
              <span>操作历史</span>
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
          
          <!-- 筛选器 -->
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
              style="width: 200px; margin-left: 10px;"
              clearable
            />
          </div>
          
          <!-- 历史记录列表 -->
          <div v-if="filteredHistory.length > 0" class="history-list">
            <el-table
              :data="paginatedHistory"
              style="width: 100%"
              @row-click="viewHistory"
            >
              <el-table-column prop="type" label="类型" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.type === 'jenkinsfile' ? 'primary' : row.type === 'dockerfile' ? 'success' : 'info'">
                    {{ row.type === 'jenkinsfile' ? 'Jenkinsfile' : row.type === 'dockerfile' ? 'Dockerfile' : row.type === 'billing' ? '账单' : '日志' }}
                  </el-tag>
                </template>
              </el-table-column>
              
              <el-table-column prop="title" label="标题" min-width="200" />
              
              <el-table-column prop="createdAt" label="创建时间" width="180">
                <template #default="{ row }">
                  {{ formatDate(row.createdAt) }}
                </template>
              </el-table-column>
              
              <el-table-column label="操作" width="180">
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
            
            <!-- 分页 -->
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
          
          <!-- 空状态 -->
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
      </el-main>
    </el-container>
    
    <!-- 历史详情对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="selectedHistory?.title"
      width="80%"
      destroy-on-close
    >
      <div v-if="selectedHistory">
        <div class="dialog-header">
          <el-tag :type="selectedHistory.type === 'jenkinsfile' ? 'primary' : 'success'">
            {{ selectedHistory.type === 'jenkinsfile' ? 'Jenkinsfile' : 'Dockerfile' }}
          </el-tag>
          <span class="dialog-date">{{ formatDate(selectedHistory.createdAt) }}</span>
        </div>
        
        <div class="dialog-content">
          <h4>内容:</h4>
          <MonacoEditor
            v-model="selectedHistory.content"
            :language="selectedHistory.type === 'jenkinsfile' ? 'groovy' : selectedHistory.type === 'dockerfile' ? 'dockerfile' : selectedHistory.type === 'billing' ? 'json' : 'plaintext'"
            height="300px"
            :readonly="!isEditMode"
          />
          
          <div v-if="selectedHistory.result" class="result-section">
            <h4>结果:</h4>
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

    const appStore = useAppStore()

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

    /**
    * 格式化日期字符串
    * @param {string} dateString - 原始日期字符串（ISO格式）
    * @returns {string} 格式化后的本地日期字符串
    */
    const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    })
    }

    const refreshHistory = () => {
    appStore.loadHistory()
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
        // 更新内容
        const index = history.value.findIndex(item => item.id === selectedHistory.value.id)
        if (index !== -1) {
        history.value[index] = {
            ...selectedHistory.value,
            createdAt: new Date().toISOString() // 更新修改时间
        }
        
        // 保存到 localStorage
        localStorage.setItem('ai-devops-history', JSON.stringify(history.value))
        }
        
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
    .history-view {
    padding: 20px;
    min-height: 100vh;
    background-color: #f5f7fa;
    }

    /* 桌面端优化 */
    @media (min-width: 1200px) {
    .history-view {
        min-width: 1200px;
    }
    }

    .page-header {
    background: white;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .page-header h1 {
    margin: 0 0 8px 0;
    color: #303133;
    display: flex;
    align-items: center;
    gap: 10px;
    }

    .page-header p {
    margin: 0;
    color: #606266;
    }

    .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    }

    .header-actions {
    display: flex;
    gap: 8px;
    }

    .filters {
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    }

    .history-list {
    margin-top: 20px;
    }

    .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: center;
    }

    .dialog-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
    }

    .dialog-date {
    color: #909399;
    font-size: 14px;
    }

    .dialog-content h4 {
    margin: 20px 0 10px 0;
    color: #303133;
    }

    .result-section {
    margin-top: 20px;
    }

    .dialog-actions {
    margin-top: 20px;
    text-align: right;
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    }

    :deep(.el-table__row) {
    cursor: pointer;
    }

    :deep(.el-table__row:hover) {
    background-color: #f5f7fa;
    }

    /* 平板适配 */
    @media (max-width: 1024px) {
    .history-view {
        padding: 15px;
    }
    }

    /* 手机适配 */
    @media (max-width: 768px) {
    .history-view {
        padding: 10px;
    }
    
    .header-actions {
        flex-wrap: wrap;
        gap: 8px;
    }
    
    .filters {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
    }
    
    .el-input {
        margin-left: 0 !important;
        width: 100% !important;
    }
    
    .pagination {
        text-align: center;
    }
    
    .dialog-actions {
        justify-content: center;
        flex-wrap: wrap;
    }
    }
</style>