<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">
        <el-icon class="title-icon"><Tools /></el-icon>
        <h1>CI/CD 流水线生成器</h1>
      </div>
      <p class="page-subtitle">选择平台，填写参数，一键生成专业的 CI/CD 配置文件</p>
    </div>

    <div class="page-content">
      <el-row :gutter="24">
        <el-col :span="8">
          <el-card class="content-card platform-card">
            <template #header>
              <div class="card-header">
                <span class="card-title">选择 CI/CD 平台</span>
              </div>
            </template>
            
            <div class="platform-list">
              <div
                v-for="platform in platforms"
                :key="platform.id"
                class="platform-item"
                :class="{ active: selectedPlatform?.id === platform.id }"
                @click="selectPlatform(platform)"
              >
                <div class="platform-icon-wrapper">
                  <span class="platform-icon">{{ platform.icon }}</span>
                </div>
                <div class="platform-info">
                  <h4>{{ platform.name }}</h4>
                  <p>{{ platform.description }}</p>
                </div>
              </div>
            </div>
          </el-card>
          
          <el-card v-if="selectedPlatform" class="content-card template-card">
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
            
            <div class="action-buttons cicd-action-buttons">
              <el-button type="primary" size="large" @click="generateConfig" :loading="generating">
                <el-icon><Mic /></el-icon>
                生成 {{ selectedPlatform?.name }} 配置
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
                  <el-tag v-if="selectedPlatform" :type="platformTagType" size="large">
                    {{ selectedPlatform.name }}
                  </el-tag>
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
              :language="editorLanguage"
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

  const { saveCICDConfig } = useHistory()
  const { copyToClipboard, downloadFile } = useClipboard()

  const platforms = [
    {
      id: 'jenkins',
      name: 'Jenkins',
      description: 'Jenkinsfile - 持续集成构建管道',
      icon: '🏗️',
      language: 'groovy',
      fileName: 'Jenkinsfile',
      tagType: 'primary'
    },
    {
      id: 'gitlab',
      name: 'GitLab CI/CD',
      description: '.gitlab-ci.yml - GitLab 持续集成',
      icon: '🦊',
      language: 'yaml',
      fileName: '.gitlab-ci.yml',
      tagType: 'warning'
    },
    {
      id: 'github',
      name: 'GitHub Actions',
      description: '.github/workflows - GitHub 工作流',
      icon: '🐙',
      language: 'yaml',
      fileName: 'workflow.yml',
      tagType: 'info'
    },
    {
      id: 'azure',
      name: 'Azure DevOps',
      description: 'azure-pipelines.yml - Azure 管道',
      icon: '☁️',
      language: 'yaml',
      fileName: 'azure-pipelines.yml',
      tagType: 'success'
    }
  ]

  const getPlatformTemplates = (platformId) => {
    const templates = {
      jenkins: {
        basic: [
          {
            id: 'jenkins-simple',
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
            id: 'jenkins-docker',
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
      },
      gitlab: {
        basic: [
          {
            id: 'gitlab-simple',
            name: '简单构建',
            description: '基本的代码构建和测试',
            fields: [
              { name: 'buildCommand', label: '构建命令', type: 'text', required: true, placeholder: 'npm install && npm run build' },
              { name: 'testCommand', label: '测试命令', type: 'text', required: true, placeholder: 'npm test' }
            ],
            template: `stages:
  - build
  - test

build:
  stage: build
  image: node:16
  script:
    - npm install
    - {{buildCommand}}
  artifacts:
    paths:
      - dist/

test:
  stage: test
  image: node:16
  script:
    - npm install
    - {{testCommand}}
`
          }
        ],
        advanced: [
          {
            id: 'gitlab-docker',
            name: 'Docker 部署',
            description: '构建 Docker 镜像并部署到 GitLab 容器仓库',
            fields: [
              { name: 'imageName', label: '镜像名称', type: 'text', required: true, placeholder: 'myapp' },
              { name: 'deployStage', label: '部署环境', type: 'select', required: true, 
                options: [
                  { label: '开发环境', value: 'dev' },
                  { label: '测试环境', value: 'test' },
                  { label: '生产环境', value: 'prod' }
                ]
              }
            ],
            template: `variables:
  DOCKER_TLS_CERTDIR: "/certs"
  IMAGE_TAG: $CI_REGISTRY_IMAGE/{{imageName}}:$CI_COMMIT_REF_SLUG

stages:
  - build
  - test
  - build_image
  - deploy_{{deployStage}}

build:
  stage: build
  image: node:16
  script:
    - npm install
    - npm run build
  artifacts:
    paths:
      - dist/

test:
  stage: test
  image: node:16
  script:
    - npm install
    - npm test

build_image:
  stage: build_image
  image: docker:20.10.16
  services:
    - docker:20.10.16-dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $IMAGE_TAG .
    - docker push $IMAGE_TAG
  needs:
    - build

deploy_{{deployStage}}:
  stage: deploy_{{deployStage}}
  image: docker:20.10.16
  services:
    - docker:20.10.16-dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker pull $IMAGE_TAG
    - echo "Deploying to {{deployStage}} environment"
  environment:
    name: {{deployStage}}
  only:
    - main
  needs:
    - build_image
`
          }
        ]
      },
      github: {
        basic: [
          {
            id: 'github-simple',
            name: '简单构建',
            description: '基本的代码构建和测试',
            fields: [
              { name: 'nodeVersion', label: 'Node 版本', type: 'select', required: true, 
                options: [
                  { label: 'Node 16', value: '16.x' },
                  { label: 'Node 18', value: '18.x' },
                  { label: 'Node 20', value: '20.x' }
                ]
              },
              { name: 'buildCommand', label: '构建命令', type: 'text', required: true, placeholder: 'npm run build' },
              { name: 'testCommand', label: '测试命令', type: 'text', required: true, placeholder: 'npm test' }
            ],
            template: `name: CI Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [{{nodeVersion}}]

    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js \${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: \${{ matrix.node-version }}
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build
      run: {{buildCommand}}
      
    - name: Test
      run: {{testCommand}}
`
          }
        ],
        advanced: [
          {
            id: 'github-docker',
            name: 'Docker 构建部署',
            description: '构建 Docker 镜像并推送到 GitHub Container Registry',
            fields: [
              { name: 'imageName', label: '镜像名称', type: 'text', required: true, placeholder: 'myapp' },
              { name: 'deployEnabled', label: '启用部署', type: 'checkbox', required: false }
            ],
            template: `name: Docker CI/CD

on:
  push:
    tags:
      - 'v*'
    branches:
      - main
  pull_request:
    branches: [ main ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: \${{ github.repository }}/{{imageName}}

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Test
        run: npm test

  build-and-push-image:
    needs: build-and-test
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Log in to the Container registry
        uses: docker/login-action@v3
        with:
          registry: \${{ env.REGISTRY }}
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata (tags, labels) for Docker
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: \${{ env.REGISTRY }}/\${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=tag
            type=sha,prefix={{imageName}}-

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: \${{ steps.meta.outputs.tags }}
          labels: \${{ steps.meta.outputs.labels }}
`
          }
        ]
      },
      azure: {
        basic: [
          {
            id: 'azure-simple',
            name: 'Node.js 构建',
            description: 'Node.js 项目构建和测试',
            fields: [
              { name: 'nodeVersion', label: 'Node 版本', type: 'select', required: true, 
                options: [
                  { label: 'Node 16', value: '16.x' },
                  { label: 'Node 18', value: '18.x' },
                  { label: 'Node 20', value: '20.x' }
                ]
              },
              { name: 'buildCommand', label: '构建命令', type: 'text', required: true, placeholder: 'npm run build' }
            ],
            template: `trigger:
  - main
  - develop

pr:
  - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  nodeVersion: '{{nodeVersion}}'

stages:
  - stage: Build
    displayName: 'Build Stage'
    jobs:
      - job: Build
        displayName: 'Build Job'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '\$(nodeVersion)'
            displayName: 'Install Node.js'

          - script: |
              npm ci
              {{buildCommand}}
            displayName: 'npm install and build'

          - task: PublishBuildArtifacts@1
            inputs:
              PathtoPublish: 'dist'
              ArtifactName: 'drop'
            displayName: 'Publish artifacts'
`
          }
        ],
        advanced: [
          {
            id: 'azure-docker',
            name: 'Docker 部署到 ACI',
            description: '构建 Docker 镜像并部署到 Azure 容器实例',
            fields: [
              { name: 'imageName', label: '镜像名称', type: 'text', required: true, placeholder: 'myapp' },
              { name: 'acrName', label: 'ACR 名称', type: 'text', required: true, placeholder: 'mycontainerregistry' },
              { name: 'resourceGroup', label: '资源组', type: 'text', required: true, placeholder: 'myResourceGroup' }
            ],
            template: `trigger:
  - main

variables:
  imageRepository: '{{imageName}}'
  containerRegistry: '{{acrName}}.azurecr.io'
  dockerfilePath: '**/Dockerfile'
  tag: '\$(Build.BuildId)'
  vmImageName: 'ubuntu-latest'

stages:
- stage: Build
  displayName: Build and push stage
  jobs:
  - job: Build
    displayName: Build
    pool:
      vmImage: \$(vmImageName)
    steps:
    - task: Docker@2
      displayName: Build and push an image to container registry
      inputs:
        command: buildAndPush
        repository: \$(imageRepository)
        dockerfile: \$(dockerfilePath)
        containerRegistry: 'dockerRegistryServiceConnection'
        tags: |
          \$(tag)
          latest

- stage: Deploy
  displayName: Deploy to ACI
  dependsOn: Build
  condition: succeeded()
  jobs:
  - job: Deploy
    displayName: Deploy to Azure Container Instances
    pool:
      vmImage: \$(vmImageName)
    steps:
    - task: AzureCLI@2
      displayName: 'Deploy to ACI'
      inputs:
        azureSubscription: 'azureServiceConnection'
        scriptType: 'bash'
        scriptLocation: 'inlineScript'
        inlineScript: |
          az container create \
            --resource-group {{resourceGroup}} \
            --name {{imageName}}-container \
            --image \$(containerRegistry)/\$(imageRepository):\$(tag) \
            --cpu 1 \
            --memory 1.5 \
            --ports 80 443 \
            --dns-name-label {{imageName}}-\$(Build.BuildId) \
            --registry-username \$(acrUsername) \
            --registry-password \$(acrPassword)
`
          }
        ]
      }
    }
    return templates[platformId] || templates.jenkins
  }

  const selectedPlatform = ref(null)
  const selectedCategory = ref('basic')
  const selectedTemplate = ref(null)
  const formData = ref({})
  const generatedContent = ref('')
  const generating = ref(false)

  const platformTemplates = computed(() => {
    if (!selectedPlatform.value) return { basic: [], advanced: [] }
    return getPlatformTemplates(selectedPlatform.value.id)
  })

  const filteredTemplates = computed(() => {
    return platformTemplates.value[selectedCategory.value] || []
  })

  const editorLanguage = computed(() => {
    if (!selectedPlatform.value) return 'groovy'
    return selectedPlatform.value.language
  })

  const platformTagType = computed(() => {
    if (!selectedPlatform.value) return 'info'
    return selectedPlatform.value.tagType
  })

  const selectPlatform = (platform) => {
    if (!platform) return
    
    selectedPlatform.value = platform
    selectedCategory.value = 'basic'
    selectedTemplate.value = null
    formData.value = {}
    generatedContent.value = ''
    
    const firstTemplate = filteredTemplates.value[0]
    if (firstTemplate) {
      selectTemplate(firstTemplate)
    }
  }

  const selectTemplate = (template) => {
    if (!template) return
    
    selectedTemplate.value = template
    
    const initialData = {}
    template.fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        initialData[field.name] = field.defaultValue
      } else if (field.type === 'checkbox') {
        initialData[field.name] = false
      } else if (field.type === 'select' && field.options && field.options.length > 0) {
        initialData[field.name] = field.options[0].value
      } else {
        initialData[field.name] = ''
      }
    })
    formData.value = initialData
  }

  const generateConfig = async () => {
    if (!selectedPlatform.value) {
      ElMessage.warning('请先选择一个 CI/CD 平台')
      return
    }
    
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
      const res = await aiService.generateCICDConfig(
        selectedPlatform.value.id,
        selectedPlatform.value.name,
        selectedTemplate.value.template,
        formData.value,
        selectedTemplate.value.id
      )
      
      if (!res.success) {
        const errorDetails = res.errorDetails
        console.error('[CICDView] 生成失败:', {
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

      let content = res.content
      
      if (selectedPlatform.value.id === 'jenkins') {
        content = content.replace(/^```(?:groovy|jenkinsfile)?\s*/, '').replace(/\s*```$/, '').trim()
      } else {
        content = content.replace(/^```(?:yaml|yml)?\s*/, '').replace(/\s*```$/, '').trim()
      }

      generatedContent.value = content

      saveCICDConfig(selectedPlatform.value.name, selectedTemplate.value.name, content, false)

      ElMessage.success(`${selectedPlatform.value.name} 配置生成成功!`)
    } catch (error) {
      const { userMessage, details } = analyzeError(error)
      
      console.error('[CICDView] 生成过程中发生错误:', {
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
    const fileName = selectedPlatform.value?.fileName || 'config.yml'
    downloadFile(generatedContent.value, fileName)
  }

  const resetForm = () => {
    if (selectedTemplate.value) {
      selectTemplate(selectedTemplate.value)
    }
    generatedContent.value = ''
  }

  onMounted(() => {
    const firstPlatform = platforms[0]
    if (firstPlatform) {
      selectPlatform(firstPlatform)
    }
  })

  watch(selectedCategory, (newCategory) => {
    if (platformTemplates.value[newCategory]) {
      const firstTemplate = platformTemplates.value[newCategory][0]
      if (firstTemplate) {
        selectTemplate(firstTemplate)
      }
    }
  })
</script>

<style scoped>
  @import '@/assets/page-styles.css';

  .platform-card {
    margin-bottom: 24px;
  }

  .platform-list {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .platform-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s;
  }

  .platform-item:hover {
    border-color: #409eff;
    background-color: #f0f9ff;
  }

  .platform-item.active {
    border-color: #409eff;
    background-color: #ecf5ff;
    border-left-width: 3px;
  }

  .platform-icon-wrapper {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background-color: #f5f7fa;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .platform-icon {
    font-size: 24px;
  }

  .platform-info h4 {
    margin: 0 0 4px 0;
    font-size: 15px;
    font-weight: 600;
    color: #303133;
  }

  .platform-info p {
    margin: 0;
    font-size: 13px;
    color: #606266;
  }

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

  .cicd-action-buttons {
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
    
    .platform-list {
      grid-template-columns: 1fr;
    }
  }

  :global(html.dark) {
    & .platform-item,
    & .template-item {
      border-color: var(--el-border-color);
      background-color: var(--el-bg-color);
    }

    & .platform-item:hover,
    & .template-item:hover {
      border-color: var(--el-color-primary);
      background-color: var(--el-fill-color-light);
    }

    & .platform-item.active,
    & .template-item.active {
      border-color: var(--el-color-primary);
      background-color: var(--el-fill-color-light);
    }

    & .platform-icon-wrapper {
      background-color: var(--el-fill-color-light);
    }

    & .platform-info h4,
    & .template-item h4 {
      color: var(--el-text-color-primary);
    }

    & .platform-info p,
    & .template-item p {
      color: var(--el-text-color-regular);
    }
  }
</style>
