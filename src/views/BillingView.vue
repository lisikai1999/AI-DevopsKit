<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">
        <el-icon class="title-icon"><TrendCharts /></el-icon>
        <h1>AWS 账单分析</h1>
      </div>
      <p class="page-subtitle">上传 CSV 或粘贴账单内容，AI 自动分析哪些资源消耗最多并给出优化建议</p>
    </div>

    <div class="page-content">
      <el-row :gutter="24">
        <el-col :span="12">
          <el-card class="content-card">
            <template #header>
              <div class="card-header">
                <span class="card-title">账单输入 (CSV)</span>
                <div class="header-actions">
                  <input ref="fileInput" type="file" accept=".csv" @change="handleFile" class="file-input" />
                  <el-button size="small" @click="loadSample">加载示例</el-button>
                  <el-button size="small" @click="clearContent">清空</el-button>
                </div>
              </div>
            </template>

            <textarea v-model="csvContent" class="csv-textarea" placeholder="粘贴 CSV 内容或上传文件" />

            <div class="action-buttons">
              <el-button type="primary" size="large" @click="analyzeBilling" :loading="analyzing" :disabled="!csvContent.trim()">
                <el-icon><Search /></el-icon>
                开始分析
              </el-button>
              <el-button size="large" @click="clearContent">清空内容</el-button>
            </div>
          </el-card>
        </el-col>

        <el-col :span="12">
          <el-card v-if="result" class="content-card">
            <template #header>
              <div class="card-header">
                <span class="card-title">分析结果</span>
              </div>
            </template>

            <div class="summary">
              <div class="section">
                <el-row :gutter="16">
                  <el-col :span="8">
                    <div class="stat-card">
                      <div class="stat-number">{{ result.summary.totalCost }} USD</div>
                      <div class="stat-label">总费用 ({{ result.summary.period }})</div>
                    </div>
                  </el-col>
                  <el-col :span="16">
                    <h4 class="section-title">Top 资源</h4>
                    <el-table :data="result.topResources" style="width: 100%" size="small">
                      <el-table-column prop="resource" label="资源" />
                      <el-table-column prop="cost" label="费用 (USD)" />
                      <el-table-column prop="percent" label="占比 (%)" />
                    </el-table>
                  </el-col>
                </el-row>
              </div>

              <div v-if="result.suggestions?.length" class="section">
                <h4 class="section-title">建议</h4>
                <ul class="suggestions-list">
                  <li v-for="s in result.suggestions" :key="s">{{ s }}</li>
                </ul>
              </div>

              <div v-if="chartOption" class="section">
                <h4 class="section-title">费用分布</h4>
                <EChartsWrapper :option="chartOption" height="300px" />
              </div>

              <div class="save-action">
                <el-button size="small" @click="saveToHistory">保存到历史</el-button>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { TrendCharts, Search } from '@element-plus/icons-vue'
import EChartsWrapper from '@/components/EChartsWrapper.vue'
import { aiService } from '@/services/ai-service'
import { analyzeError, formatUserMessage } from '@/utils/errorHandler'
import { useHistory } from '@/composables/useHistory'

const { saveBillingAnalysis } = useHistory()

const csvContent = ref('')
const analyzing = ref(false)
const result = ref(null)
const fileInput = ref(null)

const chartOption = computed(() => {
  if (!result.value?.chartData) return null
  return {
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [
      {
        name: '费用',
        type: 'pie',
        radius: '55%',
        data: result.value.chartData.categories.map((c, i) => ({ name: c, value: result.value.chartData.values[i] }))
      }
    ]
  }
})

const loadSample = () => {
  csvContent.value = `resource,cost\nEC2,734.12\nS3,256.5\nRDS,150.75\nOther,104.3`
}

const clearContent = () => {
  csvContent.value = ''
  result.value = null
}

const handleFile = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    csvContent.value = reader.result
  }
  reader.readAsText(file)
}

const analyzeBilling = async () => {
  if (!csvContent.value.trim()) {
    ElMessage.warning('请输入 CSV 内容或上传文件')
    return
  }

  analyzing.value = true
  try {
    const res = await aiService.analyzeBillingCSV(csvContent.value)
    
    if (!res.success) {
      const errorDetails = res.errorDetails
      console.error('[BillingView] 分析失败:', {
        error: res.error,
        details: errorDetails
      })
      
      let userMessage = res.error || '分析失败'
      
      if (errorDetails?.type === 'AUTH') {
        userMessage = `${userMessage} - 请检查 API 密钥配置`
      } else if (errorDetails?.type === 'NETWORK' || errorDetails?.type === 'TIMEOUT') {
        userMessage = `${userMessage} - 请检查网络连接`
      }
      
      ElMessage.error(userMessage)
      return
    }

    try {
      result.value = JSON.parse(res.content)
      ElMessage.success('分析完成')
    } catch (parseError) {
      console.error('[BillingView] 解析分析结果失败:', parseError)
      
      result.value = {
        summary: { totalCost: 0, period: '' },
        topResources: [],
        suggestions: [res.content.substring(0, 500)],
        chartData: { categories: [], values: [] }
      }
      
      ElMessage.warning('分析完成，但结果格式异常')
    }
  } catch (error) {
    const { details } = analyzeError(error)
    
    console.error('[BillingView] 分析过程中发生错误:', {
      error: error.message,
      details
    })
    
    ElMessage.error(formatUserMessage(error, '分析失败，请重试'))
  } finally {
    analyzing.value = false
  }
}

const saveToHistory = () => {
  saveBillingAnalysis(result.value, csvContent.value)
}
</script>

<style scoped>
  @import '@/assets/page-styles.css';

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .file-input {
    font-size: 13px;
  }

  .csv-textarea {
    width: 100%;
    min-height: 200px;
    font-family: Monaco, Consolas, monospace;
    padding: 12px;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    resize: vertical;
    line-height: 1.5;
  }

  .csv-textarea:focus {
    outline: none;
    border-color: #409eff;
  }

  .stat-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    padding: 20px;
    text-align: center;
  }

  .stat-number {
    font-size: 24px;
    font-weight: 700;
    color: white;
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.9);
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

  .save-action {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid #e4e7ed;
  }

  @media (max-width: 1024px) {
    .stat-number {
      font-size: 20px;
    }
  }

  @media (max-width: 768px) {
    .stat-card {
      padding: 16px;
    }

    .stat-number {
      font-size: 18px;
    }
  }

  :global(html.dark) {
    & .csv-textarea {
      background-color: var(--el-fill-color-light);
      color: var(--el-text-color-primary);
      border-color: var(--el-border-color);
    }

    & .stat-card {
      background: linear-gradient(135deg, #5468c7 0%, #5a3d8a 100%);
    }

    & .suggestions-list li {
      color: var(--el-text-color-regular);
    }

    & .save-action {
      border-top-color: var(--el-border-color);
    }
  }
</style>
