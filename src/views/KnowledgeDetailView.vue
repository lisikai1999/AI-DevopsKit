<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">
        <el-icon class="title-icon"><Reading /></el-icon>
        <h1>{{ article?.title || '文章详情' }}</h1>
      </div>
      <p class="page-subtitle" v-if="article">
        分类: {{ article.categoryName }}
      </p>
    </div>

    <div class="page-content">
      <div v-if="!article" class="loading-section">
        <el-empty description="文章不存在或已被删除">
          <el-button type="primary" @click="goBack">返回知识库</el-button>
        </el-empty>
      </div>

      <div v-else class="detail-content">
        <el-row :gutter="24">
          <el-col :span="18">
            <el-card class="content-card article-card">
              <div class="article-meta-header">
                <div class="meta-left">
                  <el-tag :type="getDifficultyTagType(article.difficulty)" size="large">
                    {{ article.difficulty }}
                  </el-tag>
                  <span class="read-time">{{ article.readTime }} 阅读</span>
                </div>
                <div class="meta-right">
                  <el-button type="primary" size="small" @click="goBack">
                    <el-icon><ArrowLeft /></el-icon>
                    返回知识库
                  </el-button>
                </div>
              </div>

              <div class="article-tags-header">
                <el-tag v-for="tag in article.tags" :key="tag" size="large" effect="plain">
                  {{ tag }}
                </el-tag>
              </div>

              <el-divider />

              <div class="article-body">
                <div class="markdown-content" v-html="renderMarkdown(article.content)"></div>
              </div>
            </el-card>
          </el-col>

          <el-col :span="6">
            <el-card class="content-card sidebar-card">
              <template #header>
                <div class="card-header">
                  <span class="card-title">相关知识</span>
                </div>
              </template>
              <div v-if="relatedArticles.length === 0" class="no-related">
                <p>暂无相关文章</p>
              </div>
              <div v-else class="related-list">
                <div
                  v-for="relatedArticle in relatedArticles"
                  :key="relatedArticle.id"
                  class="related-item"
                  @click="goToArticle(relatedArticle.id)"
                >
                  <h4 class="related-title">{{ relatedArticle.title }}</h4>
                  <p class="related-summary">{{ relatedArticle.summary }}</p>
                  <div class="related-meta">
                    <el-tag :type="getDifficultyTagType(relatedArticle.difficulty)" size="small">
                      {{ relatedArticle.difficulty }}
                    </el-tag>
                    <span class="related-time">{{ relatedArticle.readTime }}</span>
                  </div>
                </div>
              </div>
            </el-card>

            <el-card class="content-card sidebar-card quick-nav-card">
              <template #header>
                <div class="card-header">
                  <span class="card-title">快速导航</span>
                </div>
              </template>
              <div class="quick-nav-list">
                <div class="quick-nav-item" @click="goToCategory('cicd-best-practices')">
                  <span class="nav-icon">🔄</span>
                  <span class="nav-text">CI/CD 最佳实践</span>
                </div>
                <div class="quick-nav-item" @click="goToCategory('docker-optimization')">
                  <span class="nav-icon">🐳</span>
                  <span class="nav-text">Docker 优化指南</span>
                </div>
                <div class="quick-nav-item" @click="goToCategory('kubernetes-ops')">
                  <span class="nav-icon">☸️</span>
                  <span class="nav-text">Kubernetes 运维</span>
                </div>
                <div class="quick-nav-item" @click="goToCategory('cloud-architecture')">
                  <span class="nav-icon">☁️</span>
                  <span class="nav-text">云服务架构</span>
                </div>
                <div class="quick-nav-item" @click="goToCategory('security-compliance')">
                  <span class="nav-icon">🔒</span>
                  <span class="nav-text">安全合规要求</span>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getArticleByIdWithCustom, getRelatedArticles } from '@/utils/knowledge-base'
import { knowledgeApi } from '@/services/api'
import { Reading, ArrowLeft } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const article = ref(null)
const isLoading = ref(false)
const useBackend = ref(false)

const relatedArticles = computed(() => {
  if (!article.value) return []
  
  if (useBackend.value) {
    return []
  }
  
  if (article.value.categoryId === 'custom') {
    return []
  }
  return getRelatedArticles(article.value.categoryId, article.value.id, 3)
})

const getCategoryName = (cat) => {
  if (cat && typeof cat === 'object' && cat.name) {
    return cat.name
  }
  return '未分类'
}

const loadArticle = async () => {
  const articleId = route.params.id
  if (!articleId) return

  isLoading.value = true
  
  try {
    let articleData = null
    
    const isNumericId = !isNaN(Number(articleId)) && articleId !== ''
    
    if (isNumericId) {
      try {
        articleData = await knowledgeApi.getArticle(Number(articleId))
        useBackend.value = true
        
        article.value = {
          ...articleData,
          categoryId: articleData.category_id,
          categoryName: '知识库文章',
          readTime: articleData.read_time || '5 分钟'
        }
        isLoading.value = false
        return
      } catch (backendError) {
        console.error('[KnowledgeDetail] 从后端获取文章失败，尝试本地数据:', backendError)
      }
    }
    
    articleData = getArticleByIdWithCustom(articleId)
    useBackend.value = false
    
    if (articleData) {
      article.value = articleData
    } else {
      article.value = null
    }
  } catch (error) {
    console.error('[KnowledgeDetail] 加载文章失败:', error)
    article.value = null
  } finally {
    isLoading.value = false
  }
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

const getDifficultyTagType = (difficulty) => {
  const types = {
    '初级': 'success',
    '中级': 'warning',
    '高级': 'danger'
  }
  return types[difficulty] || 'info'
}

const goBack = () => {
  router.push('/knowledge')
}

const goToArticle = (articleId) => {
  router.push(`/knowledge/${articleId}`)
}

const goToCategory = (categoryId) => {
  router.push({
    path: '/knowledge',
    query: { category: categoryId }
  })
}

onMounted(() => {
  loadArticle()
})
</script>

<style scoped>
@import '@/assets/page-styles.css';

.loading-section {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.detail-content {
  display: flex;
  flex-direction: column;
}

.article-card {
  margin-bottom: 24px;
}

.article-meta-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.meta-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.read-time {
  font-size: 14px;
  color: #909399;
}

.article-tags-header {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.article-body {
  padding: 8px 0;
}

.markdown-content {
  line-height: 1.8;
  color: #303133;
}

.markdown-content :deep(.md-h1) {
  font-size: 24px;
  font-weight: 600;
  margin: 32px 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #409eff;
  color: #303133;
}

.markdown-content :deep(.md-h2) {
  font-size: 20px;
  font-weight: 600;
  margin: 28px 0 14px 0;
  color: #303133;
}

.markdown-content :deep(.md-h3) {
  font-size: 17px;
  font-weight: 600;
  margin: 24px 0 12px 0;
  color: #303133;
}

.markdown-content :deep(.md-p) {
  margin: 0 0 16px 0;
  font-size: 15px;
  color: #606266;
}

.markdown-content :deep(.md-ul) {
  margin: 16px 0;
  padding-left: 24px;
}

.markdown-content :deep(.md-li) {
  margin: 8px 0;
  font-size: 15px;
  color: #606266;
  list-style-type: disc;
}

.markdown-content :deep(.md-pre) {
  background-color: #1e1e1e;
  color: #d4d4d4;
  padding: 16px 20px;
  border-radius: 8px;
  margin: 16px 0;
  overflow-x: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
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
  font-size: 14px;
}

.markdown-content :deep(.md-table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
}

.markdown-content :deep(.md-table tr) {
  border-bottom: 1px solid #ebeef5;
}

.markdown-content :deep(.md-table tr:first-child) {
  background-color: #f5f7fa;
  font-weight: 600;
}

.markdown-content :deep(.md-table td) {
  padding: 12px 16px;
  text-align: left;
  font-size: 14px;
  color: #606266;
}

.sidebar-card {
  margin-bottom: 24px;
}

.no-related {
  text-align: center;
  padding: 20px 0;
  color: #909399;
}

.related-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.related-item {
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid #ebeef5;
}

.related-item:hover {
  background-color: #f5f7fa;
  border-color: #409eff;
}

.related-title {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.related-summary {
  margin: 0 0 10px 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.related-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.related-time {
  font-size: 12px;
  color: #909399;
}

.quick-nav-card {
  position: sticky;
  top: 24px;
}

.quick-nav-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.quick-nav-item:hover {
  background-color: #f5f7fa;
}

.nav-icon {
  font-size: 18px;
}

.nav-text {
  font-size: 14px;
  color: #606266;
}

@media (max-width: 1024px) {
  .quick-nav-card {
    position: static;
  }
}

@media (max-width: 768px) {
  .article-meta-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .meta-right {
    width: 100%;
  }

  .meta-right .el-button {
    width: 100%;
  }

  .markdown-content :deep(.md-pre) {
    font-size: 12px;
    padding: 12px;
  }

  .markdown-content :deep(.md-table) {
    display: block;
    overflow-x: auto;
  }
}

:global(html.dark) {
  & .markdown-content {
    color: var(--el-text-color-primary);
  }

  & .markdown-content :deep(.md-h1),
  & .markdown-content :deep(.md-h2),
  & .markdown-content :deep(.md-h3) {
    color: var(--el-text-color-primary);
  }

  & .markdown-content :deep(.md-p),
  & .markdown-content :deep(.md-li) {
    color: var(--el-text-color-regular);
  }

  & .markdown-content :deep(.md-code) {
    background-color: var(--el-fill-color-light);
    color: #e96900;
  }

  & .markdown-content :deep(.md-table tr:first-child) {
    background-color: var(--el-fill-color-light);
  }

  & .markdown-content :deep(.md-table tr) {
    border-bottom-color: var(--el-border-color);
  }

  & .markdown-content :deep(.md-table td) {
    color: var(--el-text-color-regular);
  }

  & .related-item {
    border-color: var(--el-border-color);
  }

  & .related-item:hover {
    background-color: var(--el-fill-color-light);
    border-color: var(--el-color-primary);
  }

  & .related-title {
    color: var(--el-text-color-primary);
  }

  & .related-summary,
  & .nav-text {
    color: var(--el-text-color-regular);
  }

  & .quick-nav-item:hover {
    background-color: var(--el-fill-color-light);
  }
}
</style>
