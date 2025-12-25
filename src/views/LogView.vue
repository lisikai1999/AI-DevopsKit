<template>
  <div class="log-view">
    <el-container>
      <el-header class="page-header">
        <h1>
          <el-icon><Failed /></el-icon>
          日志翻译与解释
        </h1>
        <p>粘贴英文技术日志（如 Jenkins 报错、AWS 告警），AI 翻译成中文并解释错误原因与修复建议</p>
      </el-header>

      <el-main>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-card class="input-card">
              <template #header>
                <div class="card-header">
                  <span>日志输入</span>
                  <div class="header-actions">
                    <el-button size="small" @click="loadSample">填充示例</el-button>
                    <el-button size="small" @click="clearContent">清空</el-button>
                  </div>
                </div>
              </template>

              <MonacoEditor v-model="logContent" language="plaintext" height="400px" />

              <div class="action-buttons">
                <el-button type="primary" @click="translate" :loading="translating" :disabled="!logContent.trim()">
                  <el-icon><Search /></el-icon>
                  翻译并解释
                </el-button>
                <el-button @click="clearContent">清空内容</el-button>
              </div>
            </el-card>
          </el-col>

          <el-col :span="12">
            <el-card v-if="result" class="result-card">
              <template #header>
                <div class="card-header">
                  <span>翻译 & 解释</span>
                </div>
              </template>

              <div class="translation">
                <h4>中文翻译</h4>
                <pre class="translation-box">{{ result.translation }}</pre>

                <h4>可能的原因</h4>
                <p>{{ result.explanation }}</p>

                <h4>修复建议</h4>
                <ul>
                  <li v-for="fix in result.fixes" :key="fix">{{ fix }}</li>
                </ul>

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
  import { ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Failed, Search } from '@element-plus/icons-vue'
  import MonacoEditor from '@/components/MonacoEditor.vue'
  import { aiService } from '@/services/ai-service'
  import { useAppStore } from '@/stores/app'

  const appStore = useAppStore()

  const logContent = ref('')
  const translating = ref(false)
  const result = ref(null)

  const loadSample = () => {
    logContent.value = `[ERROR] Failed to connect to DB: timeout while connecting to 10.0.0.5:5432\nCaused by: Connection timed out`}

  const clearContent = () => {
    logContent.value = ''
    result.value = null
  }

  const translate = async () => {
    if (!logContent.value.trim()) {
      ElMessage.warning('请输入日志内容')
      return
    }

    translating.value = true
    try {
      const res = await aiService.translateLog(logContent.value)
      if (!res.success) {
        ElMessage.error(res.error || '翻译失败')
        return
      }
      console.log('result ===>', result)
      result.value = JSON.parse(res.content)
      ElMessage.success('翻译完成')
    } catch (err) {
      console.log(err)
      ElMessage.error('处理出错')
    } finally {
      translating.value = false
    }
  }

  const saveToHistory = () => {
    if (!result.value) return
    appStore.addToHistory({ type: 'log', title: '日志翻译', content: logContent.value, result: JSON.stringify(result.value) })
    ElMessage.success('已保存到历史')
  }
</script>

<style scoped>
  .log-view {
    padding: 20px;
    min-height: 100vh;
    background-color: #f5f7fa;
  }

  /* 桌面端优化 */
  @media (min-width: 1200px) {
    .log-view {
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

  .translation-box {
    white-space: pre-wrap;
    background: #f6f8fa;
    padding: 12px;
    border-radius: 6px;
  }
</style>