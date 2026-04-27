<template>
  <el-card class="content-card knowledge-recommend-card">
    <template #header>
      <div class="card-header">
        <span class="card-title">
          <el-icon><Reading /></el-icon>
          相关知识推荐
        </span>
        <el-link type="primary" @click="goToKnowledgeBase">
          查看更多
          <el-icon><ArrowRight /></el-icon>
        </el-link>
      </div>
    </template>

    <div v-if="recommendations.length === 0" class="no-recommendations">
      <el-empty description="暂无相关知识推荐" :image-size="60" />
    </div>

    <div v-else class="recommendations-list">
      <div
        v-for="article in recommendations"
        :key="article.id"
        class="recommendation-item"
        @click="goToArticle(article.id)"
      >
        <div class="recommendation-icon" :style="{ backgroundColor: getCategoryColor(article.id) + '20' }">
          <span class="icon-text">{{ getCategoryIcon(article.id) }}</span>
        </div>
        <div class="recommendation-content">
          <h4 class="recommendation-title">{{ article.title }}</h4>
          <p class="recommendation-summary">{{ article.summary }}</p>
          <div class="recommendation-meta">
            <el-tag :type="getDifficultyTagType(article.difficulty)" size="small">
              {{ article.difficulty }}
            </el-tag>
            <span class="recommendation-time">{{ article.readTime }}</span>
          </div>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { getRecommendationsForPage, knowledgeCategories } from '@/utils/knowledge-base'
import { Reading, ArrowRight } from '@element-plus/icons-vue'

const props = defineProps({
  pageType: {
    type: String,
    default: 'cicd',
    validator: (value) => ['cicd', 'docker', 'kubernetes', 'cloud'].includes(value)
  }
})

const router = useRouter()

const recommendations = computed(() => {
  return getRecommendationsForPage(props.pageType)
})

const getDifficultyTagType = (difficulty) => {
  const types = {
    '初级': 'success',
    '中级': 'warning',
    '高级': 'danger'
  }
  return types[difficulty] || 'info'
}

const getCategoryForArticle = (articleId) => {
  for (const category of knowledgeCategories) {
    if (category.articles.some(art => art.id === articleId)) {
      return category
    }
  }
  return null
}

const getCategoryColor = (articleId) => {
  const category = getCategoryForArticle(articleId)
  return category?.color || '#409eff'
}

const getCategoryIcon = (articleId) => {
  const category = getCategoryForArticle(articleId)
  return category?.icon || '📚'
}

const goToArticle = (articleId) => {
  router.push(`/knowledge/${articleId}`)
}

const goToKnowledgeBase = () => {
  router.push('/knowledge')
}
</script>

<style scoped>
.knowledge-recommend-card {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.no-recommendations {
  padding: 20px 0;
}

.recommendations-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.recommendation-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid #ebeef5;
}

.recommendation-item:hover {
  background-color: #f5f7fa;
  border-color: #409eff;
}

.recommendation-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-text {
  font-size: 24px;
}

.recommendation-content {
  flex: 1;
  min-width: 0;
}

.recommendation-title {
  margin: 0 0 6px 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recommendation-summary {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.recommendation-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.recommendation-time {
  font-size: 12px;
  color: #909399;
}

@media (max-width: 768px) {
  .recommendation-item {
    padding: 10px;
    gap: 10px;
  }

  .recommendation-icon {
    width: 40px;
    height: 40px;
  }

  .icon-text {
    font-size: 20px;
  }
}

:global(html.dark) {
  & .card-title {
    color: var(--el-text-color-primary);
  }

  & .recommendation-item {
    border-color: var(--el-border-color);
  }

  & .recommendation-item:hover {
    background-color: var(--el-fill-color-light);
    border-color: var(--el-color-primary);
  }

  & .recommendation-title {
    color: var(--el-text-color-primary);
  }

  & .recommendation-summary {
    color: var(--el-text-color-regular);
  }

  & .recommendation-time {
    color: var(--el-text-color-secondary);
  }
}
</style>
