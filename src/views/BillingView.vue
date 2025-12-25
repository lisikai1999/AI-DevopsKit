<template>
  <div class="billing-view">
    <el-container>
      <el-header class="page-header">
        <h1>
          <el-icon><TrendCharts /></el-icon>
          AWS 账单分析
        </h1>
        <p>上传 CSV 或粘贴账单内容，AI 自动分析哪些资源消耗最多并给出优化建议</p>
      </el-header>

      <el-main>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-card class="input-card">
              <template #header>
                <div class="card-header">
                  <span>账单输入 (CSV)</span>
                  <div class="header-actions">
                    <input ref="fileInput" type="file" accept=".csv" @change="handleFile" />
                    <el-button size="small" @click="loadSample">加载示例</el-button>
                    <el-button size="small" @click="clearContent">清空</el-button>
                  </div>
                </div>
              </template>

              <textarea v-model="csvContent" class="csv-textarea" placeholder="粘贴 CSV 内容或上传文件" />

              <div class="action-buttons">
                <el-button type="primary" @click="analyzeBilling" :loading="analyzing" :disabled="!csvContent.trim()">
                  <el-icon><Search /></el-icon>
                  开始分析
                </el-button>
                <el-button @click="clearContent">清空内容</el-button>
              </div>
            </el-card>
          </el-col>

          <el-col :span="12">
            <el-card v-if="result" class="result-card">
              <template #header>
                <div class="card-header">
                  <span>分析结果</span>
                </div>
              </template>

              <div class="summary">
                <el-row :gutter="10">
                  <el-col :span="8">
                    <el-card>
                      <div class="stat-number">{{ result.summary.totalCost }} USD</div>
                      <div class="stat-label">总费用 ({{ result.summary.period }})</div>
                    </el-card>
                  </el-col>
                  <el-col :span="16">
                    <h4>Top 资源</h4>
                    <el-table :data="result.topResources" style="width: 100%">
                      <el-table-column prop="resource" label="资源" />
                      <el-table-column prop="cost" label="费用 (USD)" />
                      <el-table-column prop="percent" label="占比 (%)" />
                    </el-table>
                  </el-col>
                </el-row>

                <div v-if="result.suggestions?.length" style="margin-top: 16px;">
                  <h4>建议</h4>
                  <ul>
                    <li v-for="s in result.suggestions" :key="s">{{ s }}</li>
                  </ul>
                </div>

                <div v-if="chartOption" style="margin-top: 16px;">
                  <h4>费用分布</h4>
                  <EChartsWrapper :option="chartOption" height="300px" />
                </div>

                <div style="margin-top: 16px;">
                  <el-button size="small" @click="saveToHistory">保存到历史</el-button>
                </div>
              </div>
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
import { TrendCharts, Search } from '@element-plus/icons-vue'
import EChartsWrapper from '@/components/EChartsWrapper.vue'
import { aiService } from '@/services/ai-service'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

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
      ElMessage.error(res.error || '分析失败')
      return
    }
    result.value = JSON.parse(res.content)
    ElMessage.success('分析完成')
  } catch (err) {
    ElMessage.error('分析出错')
  } finally {
    analyzing.value = false
  }
}

const saveToHistory = () => {
  if (!result.value) return
  appStore.addToHistory({ type: 'billing', title: `账单分析 - ${result.value.summary.period}`, content: csvContent.value, result: JSON.stringify(result.value) })
  ElMessage.success('已保存到历史')
}
</script>

<style scoped>
  .billing-view {
      padding: 20px;
      min-height: 100vh;
      background-color: #f5f7fa;
    }

    /* 桌面端优化 */
    @media (min-width: 1200px) {
      .billing-view {
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

  .csv-textarea {
    width: 100%;
    min-height: 200px;
    font-family: Monaco, Consolas, monospace;
    padding: 8px;
  }
</style>