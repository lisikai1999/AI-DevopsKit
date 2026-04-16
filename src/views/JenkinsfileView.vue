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
            
            <div class="action-buttons">
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
                    @click="copyToClipboard"
                  >
                    <el-icon><CopyDocument /></el-icon>
                    复制
                  </el-button>
                  <el-button
                    v-if="generatedContent"
                    size="small"
                    @click="downloadFile"
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
  import { Tools, Mic, CopyDocument, Download } from '@element-plus/icons-vue'
  import MonacoEditor from '@/components/MonacoEditor.vue'
  import { useAppStore } from '@/stores/app'

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

  const appStore = useAppStore()

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
    
    // 验证必填字段
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
        ElMessage.error(res.error || '生成失败')
        return
      }

      // 清理可能的代码块包裹（```groovy / ```）
      let content = res.content.replace(/^```(?:groovy|jenkinsfile)?\s*/, '').replace(/\s*```$/, '').trim()

      generatedContent.value = content

      // 保存到历史记录
      appStore.addToHistory({
        type: 'jenkinsfile',
        title: `Jenkinsfile - ${selectedTemplate.value.name}`,
        content,
        result: content
      })

      ElMessage.success('Jenkinsfile 生成成功!')
    } catch (error) {
      console.error('生成 Jenkinsfile 出错:', error)
      ElMessage.error('生成失败，请重试')
    } finally {
      generating.value = false
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent.value)
      ElMessage.success('已复制到剪贴板')
    } catch (error) {
      ElMessage.error('复制失败')
    }
  }

  const downloadFile = () => {
    const blob = new Blob([generatedContent.value], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Jenkinsfile'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    ElMessage.success('文件下载成功')
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

  .template-card {
    margin-bottom: 24px;
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

  .action-buttons {
    margin-top: 24px;
    display: flex;
    gap: 12px;
  }

  .result-card {
    height: calc(100vh - 200px);
  }

  .header-actions {
    display: flex;
    gap: 8px;
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

    .result-card {
      height: calc(100vh - 220px);
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

    .template-list {
      max-height: 150px;
    }

    .result-card {
      height: calc(100vh - 240px);
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