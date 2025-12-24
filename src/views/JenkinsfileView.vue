<template>
  <div class="jenkinsfile-view">
    <el-container>
      <el-header class="page-header">
        <h1>
        
          <el-icon><Tools /></el-icon>
          Jenkinsfile 生成器
        </h1>
        <p>选择模板，填写参数，一键生成专业的 Jenkinsfile</p>
      </el-header>
      
      <el-main>
        <el-row :gutter="20">
          <!-- 左侧模板选择和配置 -->
          <el-col :span="8">
            <el-card class="template-card">
              <template #header>
                <div class="card-header">
                  <span>选择模板</span>
                  <el-tag :type="selectedCategory === 'basic' ? 'primary' : 'success'">
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
            
            <!-- 参数配置 -->
            <el-card v-if="selectedTemplate" class="config-card">
              <template #header>
                <span>参数配置</span>
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
                <el-button type="primary" @click="generateJenkinsfile" :loading="generating">
                  <el-icon><Mic /></el-icon>
                  生成 Jenkinsfile
                </el-button>
                <el-button @click="resetForm">重置</el-button>
              </div>
            </el-card>
          </el-col>
          
          <!-- 右侧结果展示 -->
          <el-col :span="16">
            <el-card class="result-card">
              <template #header>
                <div class="card-header">
                  <span>生成结果</span>
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
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch } from 'vue'
  import { ElMessage } from 'element-plus'
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
      // 模拟生成过程
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 替换模板变量
      let content = selectedTemplate.value.template
      Object.keys(formData.value).forEach(key => {
        const value = formData.value[key]
        const regex = new RegExp(`{{${key}}}`, 'g')
        content = content.replace(regex, value?.toString() || '')
      })
      
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
  .jenkinsfile-view {
    padding: 20px;
    min-height: 100vh;
    background-color: #f5f7fa;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  /* 大屏幕适配 */
  @media (min-width: 1400px) {
    .jenkinsfile-view {
      padding: 30px;
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

  .template-card {
    margin-bottom: 20px;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .category-tabs {
    margin-bottom: 15px;
    width: 100%;
  }

  .template-list {
    max-height: 200px;
    overflow-y: auto;
  }

  .template-item {
    padding: 12px;
    border: 1px solid #e4e7ed;
    border-radius: 6px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.3s;
  }

  .template-item:hover {
    border-color: #409eff;
    background-color: #f0f9ff;
  }

  .template-item.active {
    border-color: #409eff;
    background-color: #409eff10;
  }

  .template-item h4 {
    margin: 0 0 4px 0;
    font-size: 14px;
    color: #303133;
  }

  .template-item p {
    margin: 0;
    font-size: 12px;
    color: #606266;
  }

  .config-card {
    height: fit-content;
  }

  .action-buttons {
    margin-top: 20px;
    display: flex;
    gap: 10px;
  }

  .result-card {
    height: calc(100vh - 200px);
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }

  /* 平板适配 */
  @media (max-width: 1024px) {
    .jenkinsfile-view {
      padding: 15px;
    }
    
    .result-card {
      height: calc(100vh - 220px);
    }
  }

  /* 手机适配 */
  @media (max-width: 768px) {
    .jenkinsfile-view {
      padding: 10px;
    }
    
    .page-header h1 {
      font-size: 1.2rem;
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
    
    .el-col {
      margin-bottom: 15px;
    }
  }
</style>