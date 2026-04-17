<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">
        <el-icon class="title-icon"><Failed /></el-icon>
        <h1>日志翻译与解释</h1>
      </div>
      <p class="page-subtitle">粘贴英文技术日志（如 Jenkins 报错、AWS 告警），AI 翻译成中文并解释错误原因与修复建议</p>
    </div>

    <div class="page-content">
      <el-row :gutter="24">
        <el-col :span="12">
          <el-card class="content-card">
            <template #header>
              <div class="card-header">
                <span class="card-title">日志输入</span>
                <div class="header-actions">
                  <el-button size="small" @click="loadSample">填充示例</el-button>
                  <el-button size="small" @click="clearContent">清空</el-button>
                </div>
              </div>
            </template>

            <MonacoEditor v-model="logContent" language="plaintext" height="400px" />

            <div class="action-buttons">
              <el-button type="primary" size="large" @click="translate" :loading="translating" :disabled="!logContent.trim()">
                <el-icon><Search /></el-icon>
                翻译并解释
              </el-button>
              <el-button size="large" @click="clearContent">清空内容</el-button>
            </div>
          </el-card>
        </el-col>

        <el-col :span="12">
          <el-card v-if="result" class="content-card">
            <template #header>
              <div class="card-header">
                <span class="card-title">翻译 & 解释</span>
              </div>
            </template>

            <div class="translation">
              <div class="section">
                <h4 class="section-title">中文翻译</h4>
                <pre class="translation-box">{{ result.translation }}</pre>
              </div>

              <div class="section">
                <h4 class="section-title">可能的原因</h4>
                <p class="explanation-text">{{ result.explanation }}</p>
              </div>

              <div class="section">
                <h4 class="section-title">修复建议</h4>
                <ul class="fixes-list">
                  <li v-for="fix in result.fixes" :key="fix">{{ fix }}</li>
                </ul>
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
  import { ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Failed, Search } from '@element-plus/icons-vue'
  import MonacoEditor from '@/components/MonacoEditor.vue'
  import { aiService } from '@/services/ai-service'
  import { useHistory } from '@/composables/useHistory'

  const { saveLogTranslation } = useHistory()

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
    saveLogTranslation(result.value, logContent.value)
  }
</script>

<style scoped>
  .page-container {
    min-height: 100vh;
    background-color: #f5f7fa;
  }

  .page-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 40px 20px;
    margin-bottom: 32px;
  }

  .page-title {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 12px;
  }

  .title-icon {
    font-size: 32px;
    color: white;
  }

  .page-title h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 600;
    color: white;
  }

  .page-subtitle {
    margin: 0;
    font-size: 16px;
    color: rgba(255, 255, 255, 0.9);
    margin-left: 48px;
  }

  .page-content {
    padding: 0 20px 40px;
    max-width: 1400px;
    margin: 0 auto;
  }

  .content-card {
    border-radius: 12px;
    border: none;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .card-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }

  .action-buttons {
    margin-top: 20px;
    display: flex;
    gap: 12px;
  }

  .section {
    margin-bottom: 24px;
  }

  .section:last-child {
    margin-bottom: 0;
  }

  .section-title {
    margin: 0 0 12px 0;
    font-size: 15px;
    font-weight: 600;
    color: #303133;
  }

  .translation-box {
    white-space: pre-wrap;
    background: #f8f9fa;
    padding: 16px;
    border-radius: 8px;
    margin: 0;
    line-height: 1.6;
  }

  .explanation-text {
    margin: 0;
    line-height: 1.6;
    color: #606266;
  }

  .fixes-list {
    margin: 0;
    padding-left: 20px;
  }

  .fixes-list li {
    margin-bottom: 8px;
    color: #606266;
    line-height: 1.6;
  }

  .save-action {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid #e4e7ed;
  }

  @media (min-width: 1400px) {
    .page-header {
      padding: 48px 40px;
    }

    .page-content {
      padding: 0 40px 48px;
    }
  }

  @media (max-width: 1024px) {
    .page-header {
      padding: 32px 15px;
      margin-bottom: 24px;
    }

    .page-title {
      gap: 12px;
    }

    .title-icon {
      font-size: 28px;
    }

    .page-title h1 {
      font-size: 24px;
    }

    .page-subtitle {
      font-size: 14px;
      margin-left: 40px;
    }

    .page-content {
      padding: 0 15px 32px;
    }
  }

  @media (max-width: 768px) {
    .page-header {
      padding: 24px 10px;
      margin-bottom: 20px;
    }

    .page-title {
      gap: 10px;
      flex-direction: column;
      align-items: flex-start;
    }

    .title-icon {
      font-size: 24px;
    }

    .page-title h1 {
      font-size: 20px;
    }

    .page-subtitle {
      font-size: 13px;
      margin-left: 0;
    }

    .page-content {
      padding: 0 10px 24px;
    }

    .header-actions {
      flex-wrap: wrap;
      gap: 8px;
    }

    .action-buttons {
      flex-direction: column;
    }

    .card-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
  }

  :global(html.dark) {
    & .page-container {
      background-color: var(--el-bg-color-page);
    }

    & .page-header {
      background: linear-gradient(135deg, #5468c7 0%, #5a3d8a 100%);
    }

    & .content-card {
      background-color: var(--el-bg-color);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    & .card-title {
      color: var(--el-text-color-primary);
    }

    & .section-title {
      color: var(--el-text-color-primary);
    }

    & .translation-box {
      background-color: var(--el-fill-color-light);
      color: var(--el-text-color-primary);
    }

    & .explanation-text {
      color: var(--el-text-color-regular);
    }

    & .fixes-list li {
      color: var(--el-text-color-regular);
    }

    & .save-action {
      border-top-color: var(--el-border-color);
    }
  }
</style>