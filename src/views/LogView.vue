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
  import { analyzeError, formatUserMessage } from '@/utils/errorHandler'
  import { useHistory } from '@/composables/useHistory'

  const { saveLogTranslation } = useHistory()

  const logContent = ref('')
  const translating = ref(false)
  const result = ref(null)

  const loadSample = () => {
    logContent.value = `[ERROR] Failed to connect to DB: timeout while connecting to 10.0.0.5:5432\nCaused by: Connection timed out`
  }

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
        const errorDetails = res.errorDetails
        console.error('[LogView] 翻译失败:', {
          error: res.error,
          details: errorDetails
        })
        
        let userMessage = res.error || '翻译失败'
        
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
        ElMessage.success('翻译完成')
      } catch (parseError) {
        console.error('[LogView] 解析翻译结果失败:', parseError)
        
        result.value = {
          translation: res.content,
          explanation: 'AI返回格式异常，已显示原始内容',
          fixes: []
        }
        
        ElMessage.warning('翻译完成，但结果格式异常')
      }
    } catch (error) {
      const { details } = analyzeError(error)
      
      console.error('[LogView] 翻译过程中发生错误:', {
        error: error.message,
        details
      })
      
      ElMessage.error(formatUserMessage(error, '翻译失败，请重试'))
    } finally {
      translating.value = false
    }
  }

  const saveToHistory = () => {
    saveLogTranslation(result.value, logContent.value)
  }
</script>

<style scoped>
  @import '@/assets/page-styles.css';

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

  :global(html.dark) {
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
