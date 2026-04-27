<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-row">
        <div class="page-title">
          <el-icon class="title-icon"><Plus /></el-icon>
          <h1>创建知识</h1>
        </div>
        <el-button @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回知识库
        </el-button>
      </div>
      <p class="page-subtitle">输入主题或粘贴内容，AI 辅助生成专业的知识文章</p>
    </div>

    <div class="page-content">
      <el-card v-if="!hasDraft" class="content-card input-card">
        <template #header>
          <div class="card-header">
            <span class="card-title">选择输入方式</span>
          </div>
        </template>

        <el-tabs v-model="inputType" class="input-tabs">
          <el-tab-pane label="输入主题" name="topic">
            <div class="tab-content">
              <p class="tab-description">输入一个技术主题，AI 将为您生成一篇完整的知识文章</p>
              <el-form :model="topicForm" label-width="100px">
                <el-form-item label="主题" required>
                  <el-input
                    v-model="topicForm.topic"
                    type="textarea"
                    :rows="3"
                    placeholder="例如：Docker 多阶段构建优化、Kubernetes Pod 故障排查、CI/CD 流水线最佳实践..."
                  />
                </el-form-item>
                <el-form-item label="目标分类">
                  <el-select v-model="topicForm.category" placeholder="选择分类（可选）" style="width: 100%">
                    <el-option
                      v-for="cat in categories"
                      :key="cat.id"
                      :label="cat.name"
                      :value="cat.id"
                    />
                  </el-select>
                </el-form-item>
              </el-form>
            </div>
          </el-tab-pane>

          <el-tab-pane label="粘贴内容" name="content">
            <div class="tab-content">
              <p class="tab-description">粘贴配置文件、日志或报错信息，AI 将分析并整理成知识文章</p>
              <el-form :model="contentForm" label-width="100px">
                <el-form-item label="内容类型">
                  <el-select v-model="contentForm.contentType" placeholder="选择内容类型">
                    <el-option label="配置文件" value="config" />
                    <el-option label="日志信息" value="log" />
                    <el-option label="报错信息" value="error" />
                    <el-option label="其他" value="other" />
                  </el-select>
                </el-form-item>
                <el-form-item label="内容" required>
                  <el-input
                    v-model="contentForm.content"
                    type="textarea"
                    :rows="12"
                    placeholder="粘贴您的配置、日志或报错信息..."
                  />
                </el-form-item>
                <el-form-item label="目标分类">
                  <el-select v-model="contentForm.category" placeholder="选择分类（可选）" style="width: 100%">
                    <el-option
                      v-for="cat in categories"
                      :key="cat.id"
                      :label="cat.name"
                      :value="cat.id"
                    />
                  </el-select>
                </el-form-item>
              </el-form>
            </div>
          </el-tab-pane>
        </el-tabs>

        <div class="action-buttons">
          <el-button type="primary" size="large" @click="generateDraft" :loading="generating">
            <el-icon><MagicStick /></el-icon>
            AI 生成草稿
          </el-button>
          <el-button size="large" @click="goBack">取消</el-button>
        </div>
      </el-card>

      <el-card v-else class="content-card draft-card">
        <template #header>
          <div class="card-header">
            <div class="header-left">
              <span class="card-title">编辑草稿</span>
              <el-tag type="success">AI 生成</el-tag>
            </div>
            <div class="header-right">
              <el-button @click="resetDraft">
                <el-icon><Refresh /></el-icon>
                重新生成
              </el-button>
              <el-button @click="backToInput">
                <el-icon><Edit /></el-icon>
                编辑输入
              </el-button>
            </div>
          </div>
        </template>

        <el-form :model="draftForm" label-width="100px">
          <el-form-item label="标题" required>
            <el-input v-model="draftForm.title" size="large" placeholder="文章标题" />
          </el-form-item>

          <el-form-item label="摘要" required>
            <el-input
              v-model="draftForm.summary"
              type="textarea"
              :rows="2"
              placeholder="文章摘要，100-200字"
            />
          </el-form-item>

          <el-row :gutter="24">
            <el-col :span="8">
              <el-form-item label="分类">
                <el-select v-model="draftForm.category" style="width: 100%">
                  <el-option
                    v-for="cat in categories"
                    :key="cat.id"
                    :label="cat.name"
                    :value="cat.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="难度">
                <el-select v-model="draftForm.difficulty" style="width: 100%">
                  <el-option label="初级" value="初级" />
                  <el-option label="中级" value="中级" />
                  <el-option label="高级" value="高级" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="阅读时间">
                <el-input v-model="draftForm.readTime" placeholder="例如：10 分钟" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="标签">
            <el-select
              v-model="draftForm.tags"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="输入标签后回车添加"
              style="width: 100%"
            >
              <el-option
                v-for="tag in suggestedTags"
                :key="tag"
                :label="tag"
                :value="tag"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="内容" required>
            <el-input
              v-model="draftForm.content"
              type="textarea"
              :rows="20"
              placeholder="文章内容（支持 Markdown 格式）"
            />
          </el-form-item>
        </el-form>

        <div class="preview-section">
          <el-divider>
            <span class="divider-text">内容预览</span>
          </el-divider>
          <div class="preview-content">
            <div class="markdown-content" v-html="renderMarkdown(draftForm.content)"></div>
          </div>
        </div>

        <div class="action-buttons">
          <el-button type="primary" size="large" @click="publishArticle" :loading="publishing">
            <el-icon><Check /></el-icon>
            发布知识
          </el-button>
          <el-button size="large" @click="saveDraft">
            <el-icon><Document /></el-icon>
            保存草稿
          </el-button>
          <el-button size="large" @click="resetDraft">取消</el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { 
  knowledgeCategories, 
  addCustomArticle, 
  loadCustomKnowledge 
} from '@/utils/knowledge-base'
import { aiService } from '@/services/ai-service'
import { 
  Plus, 
  ArrowLeft, 
  MagicStick, 
  Refresh, 
  Edit, 
  Check, 
  Document 
} from '@element-plus/icons-vue'

const router = useRouter()

const inputType = ref('topic')
const generating = ref(false)
const publishing = ref(false)
const hasDraft = ref(false)

const customCategory = {
  id: 'custom',
  name: '我的知识'
}

const categories = computed(() => [
  ...knowledgeCategories,
  customCategory
])

const suggestedTags = [
  'Docker', 'Kubernetes', 'CI/CD', 'DevOps', '安全', '性能优化',
  '配置管理', '监控', '日志', '故障排查', '最佳实践', '自动化'
]

const topicForm = reactive({
  topic: '',
  category: ''
})

const contentForm = reactive({
  contentType: 'config',
  content: '',
  category: ''
})

const draftForm = reactive({
  id: '',
  title: '',
  summary: '',
  category: 'custom',
  difficulty: '中级',
  readTime: '10 分钟',
  tags: [],
  content: '',
  isDraft: false
})

const goBack = () => {
  router.push('/knowledge')
}

const backToInput = () => {
  hasDraft.value = false
}

const resetDraft = () => {
  hasDraft.value = false
  draftForm.title = ''
  draftForm.summary = ''
  draftForm.category = 'custom'
  draftForm.difficulty = '中级'
  draftForm.readTime = '10 分钟'
  draftForm.tags = []
  draftForm.content = ''
}

const generateDraft = async () => {
  let params
  
  if (inputType.value === 'topic') {
    if (!topicForm.topic.trim()) {
      ElMessage.warning('请输入主题')
      return
    }
    params = {
      inputType: 'topic',
      input: topicForm.topic,
      category: topicForm.category
    }
  } else {
    if (!contentForm.content.trim()) {
      ElMessage.warning('请粘贴内容')
      return
    }
    params = {
      inputType: 'content',
      input: contentForm.content,
      category: contentForm.category
    }
  }

  generating.value = true
  
  try {
    const response = await aiService.generateKnowledgeArticle(params)
    
    if (response.success) {
      const article = JSON.parse(response.content)
      
      draftForm.title = article.title || ''
      draftForm.summary = article.summary || ''
      draftForm.category = article.category || 'custom'
      draftForm.difficulty = article.difficulty || '中级'
      draftForm.readTime = article.readTime || '10 分钟'
      draftForm.tags = article.tags || []
      draftForm.content = article.content || ''
      
      hasDraft.value = true
      ElMessage.success('草稿生成成功！')
    } else {
      ElMessage.error(response.error || '生成失败，请重试')
    }
  } catch (error) {
    console.error('[KnowledgeCreate] 生成草稿失败:', error)
    ElMessage.error('生成失败，请检查网络连接后重试')
  } finally {
    generating.value = false
  }
}

const publishArticle = () => {
  if (!draftForm.title.trim()) {
    ElMessage.warning('请输入标题')
    return
  }
  if (!draftForm.content.trim()) {
    ElMessage.warning('请输入内容')
    return
  }

  publishing.value = true
  
  try {
    const article = {
      id: `custom-${Date.now()}`,
      title: draftForm.title,
      summary: draftForm.summary,
      category: draftForm.category,
      difficulty: draftForm.difficulty,
      readTime: draftForm.readTime,
      tags: draftForm.tags,
      content: draftForm.content,
      isCustom: true
    }

    addCustomArticle(article)
    
    ElMessage.success('知识发布成功！')
    router.push('/knowledge')
  } catch (error) {
    console.error('[KnowledgeCreate] 发布失败:', error)
    ElMessage.error('发布失败，请重试')
  } finally {
    publishing.value = false
  }
}

const saveDraft = () => {
  ElMessage.info('草稿已自动保存到本地')
}

const renderMarkdown = (content) => {
  if (!content) return ''
  
  let html = content
    .replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="md-li">$1</li>')
    .replace(/(<li class="md-li">.*<\/li>\n?)+/g, '<ul class="md-ul">$&</ul>')
    .replace(/\n\n/g, '</p><p class="md-p">')
    .replace(/```([\s\S]*?)```/g, '<pre class="md-pre"><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
    .replace(/^\|(.+)\|$/gm, (match, content) => {
      const cells = content.split('|').map(c => c.trim())
      if (cells.every(c => /^-+$/.test(c) || c === '')) {
        return ''
      }
      return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`
    })
    .replace(/(<tr>.*<\/tr>\n?)+/g, '<table class="md-table">$&</table>')
  
  if (html) {
    html = '<p class="md-p">' + html + '</p>'
  }
  
  return html
}
</script>

<style scoped>
@import '@/assets/page-styles.css';

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.input-card,
.draft-card {
  max-width: 1000px;
  margin: 0 auto;
}

.input-tabs {
  margin-bottom: 24px;
}

.tab-content {
  padding: 16px 0;
}

.tab-description {
  margin: 0 0 24px 0;
  color: #606266;
  font-size: 14px;
}

.action-buttons {
  display: flex;
  justify-content: flex-start;
  gap: 12px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #ebeef5;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.divider-text {
  font-size: 14px;
  color: #909399;
}

.preview-section {
  margin-top: 32px;
}

.preview-content {
  background-color: #fafafa;
  padding: 24px;
  border-radius: 8px;
  min-height: 200px;
}

.markdown-content {
  line-height: 1.8;
  color: #303133;
}

.markdown-content :deep(.md-h1) {
  font-size: 24px;
  font-weight: 600;
  margin: 24px 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #409eff;
  color: #303133;
}

.markdown-content :deep(.md-h2) {
  font-size: 20px;
  font-weight: 600;
  margin: 20px 0 10px 0;
  color: #303133;
}

.markdown-content :deep(.md-h3) {
  font-size: 16px;
  font-weight: 600;
  margin: 16px 0 8px 0;
  color: #303133;
}

.markdown-content :deep(.md-p) {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #606266;
}

.markdown-content :deep(.md-ul) {
  margin: 12px 0;
  padding-left: 24px;
}

.markdown-content :deep(.md-li) {
  margin: 6px 0;
  font-size: 14px;
  color: #606266;
  list-style-type: disc;
}

.markdown-content :deep(.md-pre) {
  background-color: #1e1e1e;
  color: #d4d4d4;
  padding: 12px 16px;
  border-radius: 6px;
  margin: 12px 0;
  overflow-x: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.markdown-content :deep(.md-pre code) {
  background: none;
  padding: 0;
}

.markdown-content :deep(.md-code) {
  background-color: #f5f7fa;
  color: #e96900;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
}

.markdown-content :deep(.md-table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
}

.markdown-content :deep(.md-table tr) {
  border-bottom: 1px solid #ebeef5;
}

.markdown-content :deep(.md-table tr:first-child) {
  background-color: #f5f7fa;
  font-weight: 600;
}

.markdown-content :deep(.md-table td) {
  padding: 10px 12px;
  text-align: left;
  font-size: 14px;
  color: #606266;
}

@media (max-width: 768px) {
  .header-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .header-row .el-button {
    width: 100%;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-right {
    width: 100%;
  }

  .header-right .el-button {
    flex: 1;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-buttons .el-button {
    width: 100%;
  }

  .markdown-content :deep(.md-pre) {
    font-size: 12px;
    padding: 10px;
  }

  .markdown-content :deep(.md-table) {
    display: block;
    overflow-x: auto;
  }
}

:global(html.dark) {
  & .tab-description {
    color: var(--el-text-color-regular);
  }

  & .preview-content {
    background-color: var(--el-fill-color-light);
  }

  & .markdown-content {
    color: var(--el-text-color-primary);
  }

  & .markdown-content :deep(.md-h1),
  & .markdown-content :deep(.md-h2),
  & .markdown-content :deep(.md-h3) {
    color: var(--el-text-color-primary);
  }

  & .markdown-content :deep(.md-p),
  & .markdown-content :deep(.md-li),
  & .markdown-content :deep(.md-table td) {
    color: var(--el-text-color-regular);
  }

  & .markdown-content :deep(.md-code) {
    background-color: var(--el-fill-color-light);
  }

  & .markdown-content :deep(.md-table tr:first-child) {
    background-color: var(--el-fill-color-light);
  }

  & .markdown-content :deep(.md-table tr) {
    border-bottom-color: var(--el-border-color);
  }
}
</style>
