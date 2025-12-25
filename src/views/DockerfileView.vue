<template>
  <div class="dockerfile-view">
    <el-container>
      <el-header class="page-header">
        <h1>
          <el-icon><Document /></el-icon>
          Dockerfile 分析器
        </h1>
        <p>粘贴 Dockerfile 代码，检测漏洞并获取优化建议</p>
      </el-header>
      
      <el-main>
        <el-row :gutter="20">
          <!-- 左侧输入区域 -->
          <el-col :span="12">
            <el-card class="input-card">
              <template #header>
                <div class="card-header">
                  <span>Dockerfile 输入</span>
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
                  @click="analyzeDockerfile"
                  :loading="analyzing"
                  :disabled="!dockerfileContent.trim()"
                >
                  <el-icon><Search /></el-icon>
                  开始分析
                </el-button>
                <el-button @click="clearContent">清空内容</el-button>
              </div>
            </el-card>
          </el-col>
          
          <!-- 右侧分析结果 -->
          <el-col :span="12">
            <el-card v-if="analysisResult" class="result-card">
              <template #header>
                <div class="card-header">
                  <span>分析结果</span>
                  <el-tag :type="getScoreType(analysisResult.score)">
                    得分: {{ analysisResult.score }}/100
                  </el-tag>
                </div>
              </template>
              
              <!-- 问题列表 -->
              <div v-if="analysisResult.issues.length > 0" class="issues-section">
                <h4>检测到的问题</h4>
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
              
              <!-- 优化建议 -->
              <div v-if="analysisResult.suggestions.length > 0" class="suggestions-section">
                <h4>优化建议</h4>
                <ul class="suggestions-list">
                  <li v-for="suggestion in analysisResult.suggestions" :key="suggestion">
                    {{ suggestion }}
                  </li>
                </ul>
              </div>
              
              <!-- 图表展示 -->
              <div v-if="chartOption" class="chart-section">
                <h4>问题分布图</h4>
                <EChartsWrapper :option="chartOption" height="300px" />
              </div>
            </el-card>
          </el-col>
        </el-row>
        
        <!-- 优化后的 Dockerfile -->
        <el-row v-if="analysisResult && analysisResult.optimizedContent" :gutter="20" style="margin-top: 20px;">
          <el-col :span="24">
            <el-card class="optimized-card">
              <template #header>
                <div class="card-header">
                  <span>优化后的 Dockerfile</span>
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
          </el-col>
        </el-row>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Search, CopyDocument, Download } from '@element-plus/icons-vue'
import MonacoEditor from '@/components/MonacoEditor.vue'
import EChartsWrapper from '@/components/EChartsWrapper.vue'
import { DockerfileAnalyzer, sampleDockerfiles } from '@/utils/dockerfile-analyzer'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

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
    // 模拟分析过程
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const analyzer = new DockerfileAnalyzer(dockerfileContent.value)
    analysisResult.value = analyzer.analyze()
    
    // 保存到历史记录
    appStore.addToHistory({
      type: 'dockerfile',
      title: `Dockerfile 分析 - 得分 ${analysisResult.value.score}`,
      content: dockerfileContent.value,
      result: JSON.stringify(analysisResult.value, null, 2)
    })
    
    ElMessage.success(`分析完成! 得分: ${analysisResult.value.score}/100`)
  } catch (error) {
    ElMessage.error('分析失败，请重试')
  } finally {
    analyzing.value = false
  }
}

const copyOptimized = async () => {
  if (!analysisResult.value?.optimizedContent) return
  
  try {
    await navigator.clipboard.writeText(analysisResult.value.optimizedContent)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

const downloadOptimized = () => {
  if (!analysisResult.value?.optimizedContent) return
  
  const blob = new Blob([analysisResult.value.optimizedContent], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'Dockerfile.optimized'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  ElMessage.success('文件下载成功')
}
</script>

<style scoped>
    .dockerfile-view {
      padding: 20px;
      min-height: 100vh;
      background-color: #f5f7fa;
    }

    /* 桌面端优化 */
    @media (min-width: 1200px) {
      .dockerfile-view {
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

    .action-buttons {
    margin-top: 15px;
    display: flex;
    gap: 10px;
    }

    .result-card {
    height: fit-content;
    }

    .issues-section {
    margin-bottom: 20px;
    }

    .issues-section h4 {
    margin: 0 0 10px 0;
    color: #303133;
    }

    .issue-content {
    padding: 10px;
    background-color: #f8f9fa;
    border-radius: 4px;
    }

    .issue-message {
    margin: 0 0 5px 0;
    font-weight: 500;
    color: #303133;
    }

    .issue-suggestion {
    margin: 0;
    color: #606266;
    font-style: italic;
    }

    .suggestions-section {
    margin-bottom: 20px;
    }

    .suggestions-section h4 {
    margin: 0 0 10px 0;
    color: #303133;
    }

    .suggestions-list {
    margin: 0;
    padding-left: 20px;
    }

    .suggestions-list li {
    margin-bottom: 5px;
    color: #606266;
    }

    .chart-section {
    margin-top: 20px;
    }

    .chart-section h4 {
    margin: 0 0 10px 0;
    color: #303133;
    }

    .optimized-card {
    margin-top: 20px;
    }

    /* 平板适配 */
    @media (max-width: 1024px) {
    .dockerfile-view {
        padding: 15px;
    }
    }

    /* 手机适配 */
    @media (max-width: 768px) {
    .dockerfile-view {
        padding: 10px;
    }
    
    .header-actions {
        flex-wrap: wrap;
        gap: 8px;
    }
    
    .action-buttons {
        flex-direction: column;
    }
    
    .el-col {
        margin-bottom: 15px;
    }
    
    .chart-section {
        margin-top: 15px;
    }
    }
</style>