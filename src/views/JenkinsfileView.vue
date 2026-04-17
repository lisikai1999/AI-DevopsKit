<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">
        <el-icon class="title-icon"><Tools /></el-icon>
        <h1>Jenkinsfile 生成器</h1>
      </div>
      <p class="page-subtitle">选择模板，填写参数，一键生成专业的 Jenkinsfile</p>
    </div>

    <div class="page-content">
      <el-row :gutter="24">
        <el-col :span="8">
          <el-card class="content-card template-card">
            <template #header>
              <div class="card-header">
                <span class="card-title">选择模板</span>
                <el-tag :type="selectedCategory === 'basic' ? 'primary' : 'success'" size="large">
                  {{ selectedCategory === 'basic' ? '基础模板' : '高级模板' }}
                </el-tag>
              </div>
            </template>
            
            <el-radio-group v-model="selectedCategory" class="category-tabs">
              <el-radio-button label="basic">基础模板</el-radio-button>
              <el-radio-button label="advanced">高级模板</el-radio-button>
            </el-radio-group>
            
            <div class="template-list">
              <div
                v-for="template in filteredTemplates"
                :key="template.id"
                class="template-item"
                :class="{ active: selectedTemplate?.id === template.id }"
                @click="selectTemplate(template)"
              >
                <h4>{{ template.name }}</h4>
                <p>{{ template.description }}</p>
              </div>
            </div>
          </el-card>
          
          <el-card v-if="selectedTemplate" class="content-card config-card">
            <template #header>
              <span class="card-title">参数配置</span>
            </template>
            
            <el-form :model="formData" label-width="120px">
              <el-form-item
                v-for="field in selectedTemplate.fields"
                :key="field.name"
                :label="field.label"
                :required="field.required"
              >
                <el-input
                  v-if="field.type === 'text'"
                  v-model="formData[field.name]"
                  :placeholder="field.placeholder"
                />
                <el-select
                  v-else-if="field.type === 'select'"
                  v-model="formData[field.name]"
                  style="width: 100%"
                >
                  <el-option
                    v-for="option in field.options"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
                <el-checkbox
                  v-else-if="field.type === 'checkbox'"
                  v-model="formData[field.name]"
                />
              </el-form-item>
            </el-form>
            
            <div class="action-buttons jenkins-action-buttons">
              <el-button type="primary" size="large" @click="generateJenkinsfile" :loading="generating">
                <el-icon><Mic /></el-icon>
                生成 Jenkinsfile
              </el-button>
              <el-button size="large" @click="resetForm">重置</el-button>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="16">
          <el-card class="content-card result-card">
            <template #header>
              <div class="card-header">
                <span class="card-title">生成结果</span>
                <div class="header-actions">
                  <el-button
                    v-if="generatedContent"
                    size="small"
                    @click="handleCopy"
                  >
                    <el-icon><CopyDocument /></el-icon>
                    复制
                  </el-button>
                  <el-button
                    v-if="generatedContent"
                    size="small"
                    @click="handleDownload"
                  >
                    <el-icon><Download /></el-icon>
                    下载
                  </el-button>
                </div>
              </div>
            </template>
            
            <MonacoEditor
              v-model="generatedContent"
              language="groovy"
              height="600px"
              :readonly="false"
            />
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import { aiService } from '@/services/ai-service'
  import { analyzeError, formatUserMessage } from '@/utils/errorHandler'
  import { Tools, Mic, CopyDocument, Download } from '@element-plus/icons-vue'
  import MonacoEditor from '@/components/MonacoEditor.vue'
  import { useHistory } from '@/composables/useHistory'
  import { useClipboard } from '@/composables/useClipboard'

  const { saveJenkinsfile } = useHistory()
  const { copyToClipboard, downloadFile } = useClipboard()

  // 内联模板数据
  const jenkinsfileTemplates = {
    basic: [
      {
        id: 'simple',
        name: '简单构建',
        description: '基本的代码构建和测试',
        fields: [
          { name: 'repoUrl', label: '代码仓库地址', type: 'text', required: true, placeholder: 'https://github.com/user/repo.git' },
          { name: 'buildCommand', label: '构建命令', type: 'text', required: true, placeholder: 'mvn clean package' },
          { name: 'testCommand', label: '测试命令', type: 'text', required: true, placeholder: 'mvn test' }
        ],
        template: `pipeline {
      agent any
      
      tools {
          maven 'Maven 3.8.6'
          jdk 'JDK 11'
      }
      
      stages {
          stage('Checkout') {
              steps {
                  git url: '{{repoUrl}}'
              }
          }
          
          stage('Build') {
              steps {
                  sh '{{buildCommand}}'
              }
          }
          
          stage('Test') {
              steps {
                  sh '{{testCommand}}'
              }
          }
      }
  }`
      }
    ],
    advanced: [
      {
        id: 'docker',
        name: 'Docker 部署',
        description: '构建 Docker 镜像并部署',
        fields: [
          { name: 'imageName', label: '镜像名称', type: 'text', required: true, placeholder: 'myapp' },
          { name: 'dockerRegistry', label: 'Docker 仓库', type: 'text', required: false, placeholder: 'docker.io/myuser' }
        ],
        template: `pipeline {
      agent any
      
      stages {
          stage('Build Docker Image') {
              steps {
                  sh 'docker build -t {{imageName}}:latest .'
              }
          }
          
          stage('Push Image') {
              steps {
                  sh 'docker push {{imageName}}:latest'
              }
          }
      }
  }`
      }
    ]
  }

  const selectedCategory = ref('basic')
  const selectedTemplate = ref(null)
  const formData = ref({})
  const generatedContent = ref('')
  const generating = ref(false)

  const filteredTemplates = computed(() => {
    return jenkinsfileTemplates[selectedCategory.value] || jenkinsfileTemplates.basic
  })

  const selectTemplate = (template) => {
    if (!template) return
    
    selectedTemplate.value = template
    
    // 初始化表单数据
    const initialData = {}
    template.fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        initialData[field.name] = field.defaultValue
      } else if (field.type === 'checkbox') {
        initialData[field.name] = false
      } else {
        initialData[field.name] = ''
      }
    })
    formData.value = initialData
  }

  const generateJenkinsfile = async () => {
    if (!selectedTemplate.value) {
      ElMessage.warning('请先选择一个模板')
      return
    }
    
    const missingFields = selectedTemplate.value.fields.filter(
      field => field.required && !formData.value[field.name]
    )
    
    if (missingFields.length > 0) {
      ElMessage.error(`请填写必填字段: ${missingFields.map(f => f.label).join(', ')}`)
      return
    }
    
    generating.value = true

    try {
      const res = await aiService.generateJenkinsfile(selectedTemplate.value.template, formData.value, selectedTemplate.value.id)
      
      if (!res.success) {
        const errorDetails = res.errorDetails
        console.error('[JenkinsfileView] 生成失败:', {
          error: res.error,
          details: errorDetails
        })
        
        let userMessage = res.error || '生成失败'
        
        if (errorDetails?.type === 'AUTH') {
          userMessage = `${userMessage} - 请检查 API 密钥配置`
        } else if (errorDetails?.type === 'NETWORK' || errorDetails?.type === 'TIMEOUT') {
          userMessage = `${userMessage} - 请检查网络连接`
        } else if (errorDetails?.type === 'API') {
          userMessage = `${userMessage} - AI 服务暂时不可用`
        }
        
        ElMessage.error(userMessage)
        return
      }

      let content = res.content.replace(/^```(?:groovy|jenkinsfile)?\s*/, '').replace(/\s*```$/, '').trim()

      generatedContent.value = content

      saveJenkinsfile(selectedTemplate.value.name, content, false)

      ElMessage.success('Jenkinsfile 生成成功!')
    } catch (error) {
      const { userMessage, details } = analyzeError(error)
      
      console.error('[JenkinsfileView] 生成过程中发生错误:', {
        error: error.message,
        details
      })
      
      ElMessage.error(formatUserMessage(error, '生成失败，请重试'))
    } finally {
      generating.value = false
    }
  }

  const handleCopy = () => {
    copyToClipboard(generatedContent.value)
  }

  const handleDownload = () => {
    downloadFile(generatedContent.value, 'Jenkinsfile')
  }

  const resetForm = () => {
    if (selectedTemplate.value) {
      selectTemplate(selectedTemplate.value)
    } else {
      // 如果没有选中的模板，选择第一个可用模板
      const firstTemplate = filteredTemplates.value[0]
      if (firstTemplate) {
        selectTemplate(firstTemplate)
      }
    }
    generatedContent.value = ''
  }

  onMounted(() => {
    // 默认选择第一个模板
    const firstTemplate = filteredTemplates.value[0]
    if (firstTemplate) {
      selectTemplate(firstTemplate)
    }
  })

  // 当分类改变时，选择该分类的第一个模板
  watch(selectedCategory, (newCategory) => {
    const newFilteredTemplates = jenkinsfileTemplates[newCategory] || jenkinsfileTemplates.basic
    const firstTemplate = newFilteredTemplates[0]
    if (firstTemplate) {
      selectTemplate(firstTemplate)
    }
  })
</script>

<style scoped>
  @import '@/assets/page-styles.css';

  .template-card {
    margin-bottom: 24px;
  }

  .category-tabs {
    margin-bottom: 20px;
    width: 100%;
  }

  .template-list {
    max-height: 200px;
    overflow-y: auto;
  }

  .template-item {
    padding: 16px;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    margin-bottom: 12px;
    cursor: pointer;
    transition: all 0.3s;
  }

  .template-item:hover {
    border-color: #409eff;
    background-color: #f0f9ff;
  }

  .template-item.active {
    border-color: #409eff;
    background-color: #ecf5ff;
    border-left-width: 3px;
  }

  .template-item h4 {
    margin: 0 0 6px 0;
    font-size: 15px;
    font-weight: 600;
    color: #303133;
  }

  .template-item p {
    margin: 0;
    font-size: 13px;
    color: #606266;
  }

  .config-card {
    height: fit-content;
  }

  .jenkins-action-buttons {
    margin-top: 24px;
  }

  .result-card {
    height: calc(100vh - 200px);
  }

  @media (max-width: 1024px) {
    .result-card {
      height: calc(100vh - 220px);
    }
  }

  @media (max-width: 768px) {
    .template-list {
      max-height: 150px;
    }

    .result-card {
      height: calc(100vh - 240px);
    }
  }

  :global(html.dark) {
    & .template-item {
      border-color: var(--el-border-color);
      background-color: var(--el-bg-color);
    }

    & .template-item:hover {
      border-color: var(--el-color-primary);
      background-color: var(--el-fill-color-light);
    }

    & .template-item.active {
      border-color: var(--el-color-primary);
      background-color: var(--el-fill-color-light);
    }

    & .template-item h4 {
      color: var(--el-text-color-primary);
    }

    & .template-item p {
      color: var(--el-text-color-regular);
    }
  }
</style>
