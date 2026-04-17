<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">
        <el-icon class="title-icon"><Document /></el-icon>
        <h1>Dockerfile 分析器</h1>
      </div>
      <p class="page-subtitle">粘贴 Dockerfile 代码，检测漏洞并获取优化建议</p>
    </div>

    <div class="page-content">
      <el-row :gutter="24">
        <el-col :span="12">
          <el-card class="content-card">
            <template #header>
              <div class="card-header">
                <span class="card-title">Dockerfile 输入</span>
                <div class="header-actions">
                  <el-button size="small" @click="loadSample('node')">Node.js 示例</el-button>
                  <el-button size="small" @click="loadSample('python')">Python 示例</el-button>
                  <el-button size="small" @click="clearContent">清空</el-button>
                </div>
              </div>
            </template>
            
            <MonacoEditor
              v-model="dockerfileContent"
              language="dockerfile"
              height="400px"
              :options="editorOptions"
            />
            
            <div class="action-buttons">
              <el-button
                type="primary"
                size="large"
                @click="analyzeDockerfile"
                :loading="analyzing"
                :disabled="!dockerfileContent.trim()"
              >
                <el-icon><Search /></el-icon>
                开始分析
              </el-button>
              <el-button size="large" @click="clearContent">清空内容</el-button>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="12">
          <el-card v-if="analysisResult" class="content-card">
            <template #header>
              <div class="card-header">
                <span class="card-title">分析结果</span>
                <el-tag :type="getScoreType(analysisResult.score)" size="large">
                  得分: {{ analysisResult.score }}/100
                </el-tag>
              </div>
            </template>
            
            <div v-if="analysisResult.issues.length > 0" class="section">
              <h4 class="section-title">检测到的问题</h4>
              <el-collapse v-model="activeIssues">
                <el-collapse-item
                  v-for="issue in analysisResult.issues"
                  :key="issue.line"
                  :title="`${issue.type.toUpperCase()} - 第${issue.line}行`"
                  :name="issue.line"
                >
                  <div class="issue-content">
                    <p class="issue-message">{{ issue.message }}</p>
                    <p class="issue-suggestion">建议: {{ issue.suggestion }}</p>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </div>
            
            <div v-if="analysisResult.suggestions.length > 0" class="section">
              <h4 class="section-title">优化建议</h4>
              <ul class="suggestions-list">
                <li v-for="suggestion in analysisResult.suggestions" :key="suggestion">
                  {{ suggestion }}
                </li>
              </ul>
            </div>
            
            <div v-if="chartOption" class="section">
              <h4 class="section-title">问题分布图</h4>
              <EChartsWrapper :option="chartOption" height="300px" />
            </div>
          </el-card>
        </el-col>
      </el-row>
      
      <div v-if="analysisResult && analysisResult.optimizedContent" class="optimized-section">
        <el-card class="content-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">优化后的 Dockerfile</span>
              <div class="header-actions">
                <el-button size="small" @click="copyOptimized">
                  <el-icon><CopyDocument /></el-icon>
                  复制
                </el-button>
                <el-button size="small" @click="downloadOptimized">
                  <el-icon><Download /></el-icon>
                  下载
                </el-button>
              </div>
            </div>
          </template>
          
          <MonacoEditor
            v-model="analysisResult.optimizedContent"
            language="dockerfile"
            height="300px"
          />
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { ElMessage } from 'element-plus'
  import { aiService } from '@/services/ai-service'
  import MonacoEditor from '@/components/MonacoEditor.vue'
  import EChartsWrapper from '@/components/EChartsWrapper.vue'
  import { Document, Search, CopyDocument, Download } from '@element-plus/icons-vue'
  import { sampleDockerfiles } from '@/utils/dockerfile-analyzer'
  import { useHistory } from '@/composables/useHistory'
  import { useClipboard } from '@/composables/useClipboard'

  const { saveDockerfileAnalysis } = useHistory()
  const { copyToClipboard, downloadFile } = useClipboard()

  const dockerfileContent = ref('')
  const analysisResult = ref(null)
  const analyzing = ref(false)
  const activeIssues = ref([])

  const editorOptions = {
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 14,
    wordWrap: 'on'
  }

  const chartOption = computed(() => {
    if (!analysisResult.value?.issues.length) return null
    
    const issueTypes = analysisResult.value.issues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1
      return acc
    }, {})
    
    return {
      title: {
        text: '问题类型分布',
        left: 'center',
        textStyle: {
          fontSize: 16
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left'
      },
      series: [
        {
          name: '问题类型',
          type: 'pie',
          radius: '50%',
          data: [
            { value: issueTypes.error || 0, name: '错误', itemStyle: { color: '#f56c6c' } },
            { value: issueTypes.warning || 0, name: '警告', itemStyle: { color: '#e6a23c' } },
            { value: issueTypes.info || 0, name: '信息', itemStyle: { color: '#909399' } }
          ],
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    }
  })

  const getScoreType = (score) => {
    if (score >= 80) return 'success'
    if (score >= 60) return 'warning'
    return 'danger'
  }

  const loadSample = (type) => {
    dockerfileContent.value = sampleDockerfiles[type]
    ElMessage.success(`已加载 ${type} 示例`)
  }

  const clearContent = () => {
    dockerfileContent.value = ''
    analysisResult.value = null
  }

  const analyzeDockerfile = async () => {
    if (!dockerfileContent.value.trim()) {
      ElMessage.warning('请输入 Dockerfile 内容')
      return
    }
    
    analyzing.value = true
    
    try {
      const res = await aiService.analyzeDockerfile(dockerfileContent.value)
      if (!res.success) {
        ElMessage.error(res.error || '分析失败')
        return
      }

      analysisResult.value = JSON.parse(res.content)
      
      // 保存到历史记录
      saveDockerfileAnalysis(analysisResult.value, dockerfileContent.value, false)
      
      ElMessage.success(`分析完成! 得分: ${analysisResult.value.score}/100`)
    } catch (error) {
      ElMessage.error('分析失败，请重试')
    } finally {
      analyzing.value = false
    }
  }

  const copyOptimized = () => {
    if (!analysisResult.value?.optimizedContent) return
    copyToClipboard(analysisResult.value.optimizedContent)
  }

  const downloadOptimized = () => {
    if (!analysisResult.value?.optimizedContent) return
    downloadFile(analysisResult.value.optimizedContent, 'Dockerfile.optimized')
  }
</script>

<style scoped>
  @import '@/assets/page-styles.css';

  .section-title {
    margin: 0 0 16px 0;
  }

  .issue-content {
    padding: 16px;
    background-color: #f8f9fa;
    border-radius: 8px;
  }

  .issue-message {
    margin: 0 0 8px 0;
    font-weight: 500;
    color: #303133;
  }

  .issue-suggestion {
    margin: 0;
    color: #606266;
    font-style: italic;
  }

  .suggestions-list {
    margin: 0;
    padding-left: 20px;
  }

  .suggestions-list li {
    margin-bottom: 8px;
    color: #606266;
    line-height: 1.6;
  }

  .optimized-section {
    margin-top: 24px;
  }

  @media (max-width: 768px) {
    .optimized-section {
      margin-top: 20px;
    }
  }

  :global(html.dark) {
    & .issue-content {
      background-color: var(--el-fill-color-light);
    }

    & .issue-message {
      color: var(--el-text-color-primary);
    }

    & .issue-suggestion {
      color: var(--el-text-color-regular);
    }

    & .suggestions-list li {
      color: var(--el-text-color-regular);
    }
  }
</style>
