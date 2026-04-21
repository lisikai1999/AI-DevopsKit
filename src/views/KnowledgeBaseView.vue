<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">
        <el-icon class="title-icon"><Reading /></el-icon>
        <h1>DevOps 知识库</h1>
      </div>
      <p class="page-subtitle">DevOps 最佳实践、运维指南和安全合规知识</p>
    </div>

    <div class="page-content">
      <div class="search-section">
        <el-input
          v-model="searchQuery"
          placeholder="搜索知识库文章..."
          clearable
          size="large"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <div v-if="filteredCategories.length === 0" class="empty-section">
        <el-empty description="没有找到匹配的文章">
          <el-button type="primary" @click="searchQuery = ''">清除搜索</el-button>
        </el-empty>
      </div>

      <div v-else class="categories-section">
        <div
          v-for="category in filteredCategories"
          :key="category.id"
          class="category-card"
        >
          <el-card class="content-card category-header-card" :body-style="{ padding: '0' }">
            <div
              class="category-header"
              :style="{ borderLeftColor: category.color }"
              @click="toggleCategory(category.id)"
            >
              <div class="category-icon" :style="{ backgroundColor: category.color + '20' }">
                <span class="icon-text">{{ category.icon }}</span>
              </div>
              <div class="category-info">
                <h3 class="category-name">{{ category.name }}</h3>
                <p class="category-description">{{ category.description }}</p>
                <p class="category-count">{{ filteredArticles(category).length }} 篇文章</p>
              </div>
              <el-icon class="expand-icon" :class="{ rotated: expandedCategories.includes(category.id) }">
                <ChevronRight />
              </el-icon>
            </div>
          </el-card>

          <el-collapse
            v-if="expandedCategories.includes(category.id) && filteredArticles(category).length > 0"
            v-model="activeArticles"
            class="articles-collapse"
          >
            <el-collapse-item
              v-for="article in filteredArticles(category)"
              :key="article.id"
              :name="article.id"
            >
              <template #title>
                <div class="article-title-row">
                  <span class="article-title">{{ article.title }}</span>
                  <div class="article-meta">
                    <el-tag :type="getDifficultyTagType(article.difficulty)" size="small">
                      {{ article.difficulty }}
                    </el-tag>
                    <span class="read-time">{{ article.readTime }}</span>
                  </div>
                </div>
              </template>
              <div class="article-content">
                <p class="article-summary">{{ article.summary }}</p>
                <div class="article-tags">
                  <el-tag v-for="tag in article.tags" :key="tag" size="small" effect="plain">
                    {{ tag }}
                  </el-tag>
                </div>
                <el-button type="primary" size="small" @click="goToArticle(article.id)">
                  <el-icon><View /></el-icon>
                  查看详情
                </el-button>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { knowledgeCategories, getArticleById } from '@/utils/knowledge-base'
import { Reading, Search, ChevronRight, View } from '@element-plus/icons-vue'

const router = useRouter()

const searchQuery = ref('')
const expandedCategories = ref([])
const activeArticles = ref([])

const filteredCategories = computed(() => {
  if (!searchQuery.value.trim()) {
    return knowledgeCategories
  }
  
  const query = searchQuery.value.toLowerCase()
  return knowledgeCategories.filter(category => {
    if (category.name.toLowerCase().includes(query)) {
      return true
    }
    if (category.description.toLowerCase().includes(query)) {
      return true
    }
    return category.articles.some(article => 
      article.title.toLowerCase().includes(query) ||
      article.summary.toLowerCase().includes(query) ||
      article.tags.some(tag => tag.toLowerCase().includes(query))
    )
  })
})

const filteredArticles = (category) => {
  if (!searchQuery.value.trim()) {
    return category.articles
  }
  
  const query = searchQuery.value.toLowerCase()
  return category.articles.filter(article =>
    article.title.toLowerCase().includes(query) ||
    article.summary.toLowerCase().includes(query) ||
    article.tags.some(tag => tag.toLowerCase().includes(query))
  )
}

const toggleCategory = (categoryId) => {
  const index = expandedCategories.value.indexOf(categoryId)
  if (index === -1) {
    expandedCategories.value.push(categoryId)
  } else {
    expandedCategories.value.splice(index, 1)
  }
}

const getDifficultyTagType = (difficulty) => {
  const types = {
    '初级': 'success',
    '中级': 'warning',
    '高级': 'danger'
  }
  return types[difficulty] || 'info'
}

const goToArticle = (articleId) => {
  router.push(`/knowledge/${articleId}`)
}
</script>

<style scoped>
@import '@/assets/page-styles.css';

.search-section {
  margin-bottom: 32px;
  max-width: 600px;
}

.empty-section {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.categories-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.category-card {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.category-header-card {
  border-radius: 12px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px 24px;
  cursor: pointer;
  border-left: 4px solid #409eff;
  transition: background-color 0.3s;
}

.category-header:hover {
  background-color: #f5f7fa;
}

.category-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-text {
  font-size: 28px;
}

.category-info {
  flex: 1;
}

.category-name {
  margin: 0 0 6px 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.category-description {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #606266;
}

.category-count {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.expand-icon {
  font-size: 20px;
  color: #909399;
  transition: transform 0.3s;
  flex-shrink: 0;
}

.expand-icon.rotated {
  transform: rotate(90deg);
}

.articles-collapse {
  margin-top: 16px;
  border-radius: 8px;
  overflow: hidden;
}

.articles-collapse :deep(.el-collapse-item__header) {
  background-color: #fafafa;
  padding: 16px 20px;
  border-bottom: 1px solid #ebeef5;
}

.articles-collapse :deep(.el-collapse-item__header.is-active) {
  border-bottom: none;
}

.articles-collapse :deep(.el-collapse-item__content) {
  padding: 0;
}

.article-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.article-title {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.read-time {
  font-size: 13px;
  color: #909399;
}

.article-content {
  padding: 20px;
  background-color: #ffffff;
  border-bottom: 1px solid #ebeef5;
}

.article-content:last-child {
  border-bottom: none;
}

.article-summary {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .category-header {
    padding: 16px;
    gap: 12px;
  }

  .category-icon {
    width: 48px;
    height: 48px;
  }

  .icon-text {
    font-size: 24px;
  }

  .category-name {
    font-size: 16px;
  }

  .article-title-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .article-meta {
    width: 100%;
  }
}

:global(html.dark) {
  & .category-header:hover {
    background-color: var(--el-fill-color-light);
  }

  & .category-name,
  & .article-title {
    color: var(--el-text-color-primary);
  }

  & .category-description,
  & .article-summary {
    color: var(--el-text-color-regular);
  }

  & .category-count,
  & .read-time {
    color: var(--el-text-color-secondary);
  }

  & .articles-collapse :deep(.el-collapse-item__header) {
    background-color: var(--el-fill-color-light);
    border-bottom-color: var(--el-border-color);
  }

  & .article-content {
    background-color: var(--el-bg-color);
    border-bottom-color: var(--el-border-color);
  }
}
</style>
