<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">
        <el-icon class="title-icon"><Search /></el-icon>
        <h1>CI/CD 配置智能诊断</h1>
      </div>
      <p class="page-subtitle">粘贴现有的 CI/CD 配置，AI 自动检测常见问题并提供修复方案</p>
    </div>

    <div class="page-content">
      <el-row :gutter="24">
        <el-col :span="12">
          <el-card class="content-card">
            <template #header>
              <div class="card-header">
                <span class="card-title">CI/CD 配置输入</span>
                <div class="header-actions">
                  <el-select v-model="selectedPlatform" placeholder="选择平台" size="small" style="width: 160px">
                    <el-option label="Jenkins" value="jenkins" />
                    <el-option label="GitLab CI/CD" value="gitlab" />
                    <el-option label="GitHub Actions" value="github" />
                    <el-option label="Azure DevOps" value="azure" />
                  </el-select>
                  <el-button size="small" @click="loadSample('jenkins')">Jenkins 示例</el-button>
                  <el-button size="small" @click="loadSample('gitlab')">GitLab 示例</el-button>
                  <el-button size="small" @click="loadSample('github')">GitHub 示例</el-button>
                  <el-button size="small" @click="loadSample('azure')">Azure 示例</el-button>
                  <el-button size="small" @click="clearContent">清空</el-button>
                </div>
              </div>
            </template>
            
            <MonacoEditor
              v-model="cicdContent"
              :language="editorLanguage"
              height="400px"
              :options="editorOptions"
            />
            
            <div class="action-buttons">
              <el-button
                type="primary"
                size="large"
                @click="analyzeConfig"
                :loading="analyzing"
                :disabled="!cicdContent.trim()"
              >
                <el-icon><Search /></el-icon>
                开始诊断
              </el-button>
              <el-button size="large" @click="clearContent">清空内容</el-button>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="12">
          <el-card v-if="analysisResult" class="content-card">
            <template #header>
              <div class="card-header">
                <span class="card-title">诊断结果</span>
                <div class="header-actions">
                  <el-tag :type="getScoreType(analysisResult.score)" size="large">
                    得分: {{ analysisResult.score }}/100
                  </el-tag>
                  <el-tag size="large" type="info">
                    {{ getPlatformName(selectedPlatform) }}
                  </el-tag>
                </div>
              </div>
            </template>
            
            <div v-if="analysisResult.summary" class="summary-section">
              <el-alert :title="analysisResult.summary" type="info" :closable="false" show-icon />
            </div>
            
            <div v-if="analysisResult.issues && analysisResult.issues.length > 0" class="section">
              <h4 class="section-title">
                检测到的问题 
                <el-tag size="small" type="danger" v-if="highSeverityCount > 0">
                  高风险: {{ highSeverityCount }}
                </el-tag>
                <el-tag size="small" type="warning" v-if="mediumSeverityCount > 0">
                  中风险: {{ mediumSeverityCount }}
                </el-tag>
                <el-tag size="small" type="info" v-if="lowSeverityCount > 0">
                  低风险: {{ lowSeverityCount }}
                </el-tag>
              </h4>
              
              <el-tabs v-model="activeCategory">
                <el-tab-pane
                  v-for="category in categories"
                  :key="category"
                  :label="`${getCategoryIcon(category)} ${category}`"
                  :name="category"
                  :disabled="getIssuesByCategory(category).length === 0"
                >
                  <el-collapse v-model="activeIssues">
                    <el-collapse-item
                      v-for="(issue, index) in getIssuesByCategory(category)"
                      :key="`${issue.line}-${index}`"
                      :title="`${getSeverityTag(issue.severity)} ${issue.message}`"
                      :name="`${category}-${index}`"
                    >
                      <div class="issue-content">
                        <p v-if="issue.line > 0" class="issue-line">
                          <el-tag size="small">第 {{ issue.line }} 行</el-tag>
                        </p>
                        <p class="issue-message">{{ issue.message }}</p>
                        <p class="issue-suggestion">
                          <strong>修复建议:</strong> {{ issue.suggestion }}
                        </p>
                      </div>
                    </el-collapse-item>
                  </el-collapse>
                </el-tab-pane>
              </el-tabs>
            </div>
            
            <div v-else class="section">
              <el-empty description="未检测到问题" />
            </div>
            
            <div v-if="analysisResult.suggestions && analysisResult.suggestions.length > 0" class="section">
              <h4 class="section-title">总体优化建议</h4>
              <ul class="suggestions-list">
                <li v-for="(suggestion, index) in analysisResult.suggestions" :key="index">
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
      
      <div v-if="analysisResult && analysisResult.fixedContent" class="optimized-section">
        <el-card class="content-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">修复后的配置</span>
              <div class="header-actions">
                <el-tag type="success" size="large">已优化</el-tag>
                <el-button size="small" @click="copyFixed">
                  <el-icon><CopyDocument /></el-icon>
                  复制
                </el-button>
                <el-button size="small" @click="downloadFixed">
                  <el-icon><Download /></el-icon>
                  下载
                </el-button>
              </div>
            </div>
          </template>
          
          <MonacoEditor
            v-model="analysisResult.fixedContent"
            :language="editorLanguage"
            height="400px"
          />
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import { aiService } from '@/services/ai-service'
  import { analyzeError, formatUserMessage } from '@/utils/errorHandler'
  import MonacoEditor from '@/components/MonacoEditor.vue'
  import EChartsWrapper from '@/components/EChartsWrapper.vue'
  import { Search, CopyDocument, Download } from '@element-plus/icons-vue'
  import { 
    sampleCICDConfigs, 
    getSeverityTagType, 
    getCategoryIcon, 
    getPlatformName, 
    getPlatformLanguage,
    getPlatformFileName
  } from '@/utils/cicd-scanner'
  import { useHistory } from '@/composables/useHistory'
  import { useClipboard } from '@/composables/useClipboard'

  const { saveCICDScan } = useHistory()
  const { copyToClipboard, downloadFile } = useClipboard()

  const cicdContent = ref('')
  const selectedPlatform = ref('jenkins')
  const analysisResult = ref(null)
  const analyzing = ref(false)
  const activeIssues = ref([])
  const activeCategory = ref('全部')

  const categories = ['全部', '缓存', '超时', '并行', '安全', '性能', '最佳实践', '资源']

  const editorOptions = {
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 14,
    wordWrap: 'on'
  }

  const editorLanguage = computed(() => {
    return getPlatformLanguage(selectedPlatform.value)
  })

  const highSeverityCount = computed(() => {
    if (!analysisResult.value?.issues) return 0
    return analysisResult.value.issues.filter(i => i.severity === '高').length
  })

  const mediumSeverityCount = computed(() => {
    if (!analysisResult.value?.issues) return 0
    return analysisResult.value.issues.filter(i => i.severity === '中').length
  })

  const lowSeverityCount = computed(() => {
    if (!analysisResult.value?.issues) return 0
    return analysisResult.value.issues.filter(i => i.severity === '低').length
  })

  const chartOption = computed(() => {
    if (!analysisResult.value?.issues?.length) return null
    
    const categoryCounts = analysisResult.value.issues.reduce((acc, issue) => {
      const cat = issue.category || '其他'
      acc[cat] = (acc[cat] || 0) + 1
      return acc
    }, {})
    
    const colors = {
      '缓存': '#409eff',
      '超时': '#e6a23c',
      '并行': '#67c23a',
      '安全': '#f56c6c',
      '性能': '#909399',
      '最佳实践': '#9b59b6',
      '资源': '#1abc9c',
      '其他': '#95a5a6'
    }
    
    const data = Object.entries(categoryCounts).map(([name, value]) => ({
      name,
      value,
      itemStyle: { color: colors[name] || colors['其他'] }
    }))
    
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
          center: ['60%', '50%'],
          data: data,
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

  const getIssuesByCategory = (category) => {
    if (!analysisResult.value?.issues) return []
    if (category === '全部') return analysisResult.value.issues
    return analysisResult.value.issues.filter(i => i.category === category)
  }

  const getScoreType = (score) => {
    if (score >= 80) return 'success'
    if (score >= 60) return 'warning'
    return 'danger'
  }

  const getSeverityTag = (severity) => {
    return `<el-tag size="small" type="${getSeverityTagType(severity)}">${severity}</el-tag>`
  }

  const loadSample = (platform) => {
    selectedPlatform.value = platform
    cicdContent.value = sampleCICDConfigs[platform] || ''
    ElMessage.success(`已加载 ${getPlatformName(platform)} 示例`)
  }

  const clearContent = () => {
    cicdContent.value = ''
    analysisResult.value = null
  }

  const analyzeConfig = async () => {
    if (!cicdContent.value.trim()) {
      ElMessage.warning('请输入 CI/CD 配置内容')
      return
    }
    
    analyzing.value = true
    
    try {
      const res = await aiService.analyzeCICDConfig(cicdContent.value, selectedPlatform.value)
      
      if (!res.success) {
        const errorDetails = res.errorDetails
        console.error('[CICDScannerView] 诊断失败:', {
          error: res.error,
          details: errorDetails
        })
        
        let userMessage = res.error || '诊断失败'
        
        if (errorDetails?.type === 'AUTH') {
          userMessage = `${userMessage} - 请检查 API 密钥配置`
        } else if (errorDetails?.type === 'NETWORK' || errorDetails?.type === 'TIMEOUT') {
          userMessage = `${userMessage} - 请检查网络连接`
        }
        
        ElMessage.error(userMessage)
        return
      }

      try {
        analysisResult.value = JSON.parse(res.content)
        
        saveCICDScan(analysisResult.value, getPlatformName(selectedPlatform.value), cicdContent.value, false)
        
        ElMessage.success(`诊断完成! 得分: ${analysisResult.value.score}/100`)
      } catch (parseError) {
        console.error('[CICDScannerView] 解析诊断结果失败:', parseError)
        
        analysisResult.value = {
          issues: [],
          suggestions: [res.content.substring(0, 500)],
          score: 70,
          summary: '诊断完成，但结果格式异常',
          fixedContent: cicdContent.value
        }
        
        ElMessage.warning('诊断完成，但结果格式异常')
      }
    } catch (error) {
      const { details } = analyzeError(error)
      
      console.error('[CICDScannerView] 诊断过程中发生错误:', {
        error: error.message,
        details
      })
      
      ElMessage.error(formatUserMessage(error, '诊断失败，请重试'))
    } finally {
      analyzing.value = false
    }
  }

  const copyFixed = () => {
    if (!analysisResult.value?.fixedContent) return
    copyToClipboard(analysisResult.value.fixedContent)
  }

  const downloadFixed = () => {
    if (!analysisResult.value?.fixedContent) return
    const fileName = getPlatformFileName(selectedPlatform.value)
    downloadFile(analysisResult.value.fixedContent, fileName)
  }

  watch(selectedPlatform, (newPlatform) => {
    if (analysisResult.value) {
      analysisResult.value = null
    }
  })
</script>

<style scoped>
  @import '@/assets/page-styles.css';

  .section-title {
    margin: 0 0 16px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .summary-section {
    margin-bottom: 20px;
  }

  .issue-content {
    padding: 16px;
    background-color: #f8f9fa;
    border-radius: 8px;
  }

  .issue-line {
    margin: 0 0 8px 0;
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

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  @media (max-width: 768px) {
    .optimized-section {
      margin-top: 20px;
    }
    
    .header-actions {
      justify-content: flex-start;
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
