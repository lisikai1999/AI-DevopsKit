import axios from 'axios'
import { AppError, ErrorType, analyzeError, safeAsync } from '@/utils/errorHandler'

/**
 * AI服务的响应结构
 * @typedef {Object} AIResponse
 * @property {string} content - 响应内容
 * @property {boolean} success - 请求是否成功
 * @property {string} [error] - 错误信息（可选）
 * @property {Object} [errorDetails] - 详细错误信息（用于调试）
 */

/**
 * AI服务类：处理Jenkinsfile生成和Dockerfile分析的AI调用逻辑
 * 支持mock模式和真实AI接口调用
 */
export class AIService {
  /**
   * 私有属性：OpenAI API密钥
   * @type {string}
   */
  #apiKey;
  /**
   * 私有属性：API基础地址
   * @type {string}
   */
  #baseUrl;
  /**
   * 私有属性：使用的AI模型
   * @type {string}
   */
  #model;
  /**
   * 私有属性：是否为mock模式
   * @type {boolean}
   */
  #isMockMode;

  constructor() {
    // 从环境变量读取配置，兼容默认值
    this.#apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
    this.#baseUrl = import.meta.env.VITE_OPENAI_API_BASE_URL || 'https://api.openai.com/v1';
    this.#model = import.meta.env.VITE_OPENAI_MODEL || 'gpt-3.5-turbo';
    this.#isMockMode = import.meta.env.VITE_APP_MODE === 'mock';
  }

  /**
   * 生成Jenkinsfile
   * @param {string} template - 模板类型（basic/docker/advanced）
   * @param {Record<string, any>} parameters - 生成参数
   * @param {string} templateId - 模板ID
   * @returns {Promise<AIResponse>} AI响应结果
   */
  async generateJenkinsfile(template, parameters, templateId = 'sample') {
    if (this.#isMockMode) {
      return this.#mockJenkinsfileResponse(templateId, parameters)
    }

    try {
      const prompt = `请根据以下模板和参数生成一个专业的 Jenkinsfile：

模板类型：${template}
参数：${JSON.stringify(parameters, null, 2)}

请生成一个完整的、可用的 Jenkinsfile，包含：
1. 完整的 pipeline 结构
2. 合理的 stages 配置
3. 错误处理
4. 清晰的注释

只返回 Jenkinsfile 内容，不要包含其他解释。`

      const response = await this.#callAI(prompt)
      return response
    } catch (error) {
      return this.#createErrorResponse(
        error,
        `生成 Jenkinsfile 失败: ${error instanceof AppError ? error.userMessage : '请检查网络连接和 API 配置后重试'}`
      )
    }
  }

  /**
   * 分析Dockerfile
   * @param {string} content - Dockerfile内容
   * @returns {Promise<AIResponse>} AI响应结果
   */
  async analyzeDockerfile(content) {
    if (this.#isMockMode) {
      return this.#mockDockerfileAnalysis(content)
    }

    try {
      const prompt = `请分析以下 Dockerfile 的安全性、性能：

${content}

请提供详细的分析报告，包括：
1. 安全性问题（如特权用户、明文密码等）
2. 性能优化建议（如镜像层数、缓存策略等）
3. 最佳实践建议

请以 JSON 格式返回结果(只要返回JSON数据)，参考如下：
{
  "issues": [{"line": 行号, "type": "error|warning|info", "message": "问题描述", "suggestion": "建议"}],
  "suggestions": ["建议1", "建议2"],
  "score": 评分(0-100)
}`

      const response = await this.#callAI(prompt)
      
      let parsedResponse
      try {
        parsedResponse = JSON.parse(response.content)
      } catch (parseError) {
        console.warn('[AIService] AI返回的JSON解析失败，尝试使用原始内容', {
          error: parseError.message,
          rawContent: response.content.substring(0, 200)
        })
        
        parsedResponse = {
          issues: [],
          suggestions: [response.content.substring(0, 500)],
          score: 70
        }
      }

      const prompt2 = `
对于以下Dockerfile
${content}
基于以下分析报告，请提供一个优化后的 Dockerfile：
${response.content}
请只返回优化后的 Dockerfile 内容，不要包含其他解释。`

      try {
        const response2 = await this.#callAI(prompt2)
        parsedResponse.optimizedContent = response2.content
      } catch (optimizeError) {
        console.warn('[AIService] 生成优化Dockerfile失败，使用原始内容', {
          error: optimizeError.message
        })
        parsedResponse.optimizedContent = content
      }

      return {
        success: true,
        content: JSON.stringify(parsedResponse, null, 2)
      }
    } catch (error) {
      return this.#createErrorResponse(
        error,
        `分析 Dockerfile 失败: ${error instanceof AppError ? error.userMessage : '请检查网络连接后重试'}`
      )
    }
  }

  /**
   * 生成 CI/CD 配置文件
   * @param {string} platformId - 平台ID (jenkins, gitlab, github, azure)
   * @param {string} platformName - 平台名称
   * @param {string} template - 模板内容
   * @param {Record<string, any>} parameters - 生成参数
   * @param {string} templateId - 模板ID
   * @returns {Promise<AIResponse>} AI响应结果
   */
  async generateCICDConfig(platformId, platformName, template, parameters, templateId = 'sample') {
    if (this.#isMockMode) {
      return this.#mockCICDResponse(platformId, templateId, parameters)
    }

    try {
      const platformInfo = {
        jenkins: {
          name: 'Jenkins',
          fileType: 'Jenkinsfile',
          language: 'Groovy'
        },
        gitlab: {
          name: 'GitLab CI/CD',
          fileType: '.gitlab-ci.yml',
          language: 'YAML'
        },
        github: {
          name: 'GitHub Actions',
          fileType: 'workflow.yml',
          language: 'YAML'
        },
        azure: {
          name: 'Azure DevOps',
          fileType: 'azure-pipelines.yml',
          language: 'YAML'
        }
      }

      const info = platformInfo[platformId] || platformInfo.jenkins

      let templateType = 'standard'
      if (templateId.includes('simple') || templateId.includes('basic')) {
        templateType = '简单构建'
      } else if (templateId.includes('docker')) {
        templateType = 'Docker 构建部署'
      }

      const prompt = `请根据以下模板类型和参数生成一个专业的 ${info.fileType}：

模板类型：${templateType}
参数：${JSON.stringify(parameters, null, 2)}

请生成一个完整的、可用的 ${info.fileType}，包含：
1. 完整的 pipeline 结构
2. 合理的 stages 配置
3. 错误处理
4. 清晰的注释

只返回 ${info.language} 格式的配置内容，不要包含其他解释。`

      const response = await this.#callAI(prompt)
      return response
    } catch (error) {
      return this.#createErrorResponse(
        error,
        `生成 CI/CD 配置失败: ${error instanceof AppError ? error.userMessage : '请检查网络连接和 API 配置后重试'}`
      )
    }
  }

  /**
   * 创建错误响应对象
   * @private
   * @param {Error} error - 原始错误
   * @param {string} userFriendlyMessage - 用户友好的错误消息
   * @returns {AIResponse} 错误响应
   */
  #createErrorResponse(error, userFriendlyMessage) {
    const appError = AppError.fromError(error)
    const details = {
      type: appError.type,
      timestamp: appError.timestamp,
      ...appError.details
    }
    
    console.error(`[AIService] ${userFriendlyMessage}`, {
      error: appError.toJSON(),
      technicalDetails: details
    })
    
    return {
      success: false,
      error: userFriendlyMessage || appError.userMessage,
      errorDetails: details,
      content: ''
    }
  }

  /**
   * 调用AI接口的核心方法（私有）
   * @param {string} prompt - 提示词
   * @returns {Promise<AIResponse>} AI响应结果
   * @throws {AppError} 当API密钥未配置或请求失败时抛出错误
   */
  async #callAI(prompt) {
    if (!this.#apiKey) {
      throw new AppError(
        'API key not configured',
        ErrorType.AUTH,
        {
          userMessage: 'API 密钥未配置，请检查环境变量 VITE_OPENAI_API_KEY',
          details: {
            envVar: 'VITE_OPENAI_API_KEY',
            isConfigured: false
          }
        }
      )
    }

    try {
      const response = await axios.post(
        '/api/chat/v1/chat/completions',
        {
          model: this.#model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 4096,
          temperature: 1,
          top_k: 6
        },
        {
          headers: {
            'Authorization': `Bearer ${this.#apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 120000
        }
      )

      if (response.data.choices && response.data.choices.length > 0) {
        const jsonStr = response.data.choices[0].message.content
              .replace(/^```json\s*/, '')
              .replace(/\s*```$/, '')
        return {
          success: true,
          content: jsonStr
        }
      }

      throw new AppError(
        'No response content from AI service',
        ErrorType.API,
        {
          userMessage: 'AI 服务返回了空响应，请稍后重试',
          details: {
            responseStatus: response.status,
            hasChoices: !!response.data.choices,
            choicesCount: response.data.choices?.length || 0
          }
        }
      )
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }

      const { type, userMessage, details } = analyzeError(error)
      
      throw new AppError(
        error.message || 'AI API call failed',
        type,
        {
          cause: error,
          userMessage,
          details: {
            ...details,
            endpoint: '/api/chat/v1/chat/completions',
            model: this.#model
          }
        }
      )
    }
  }

  /**
   * 模拟Jenkinsfile生成的响应（私有）
   * @param {string} template - 模板类型
   * @param {Record<string, any>} parameters - 生成参数
   * @returns {AIResponse} 模拟响应结果
   */
  #mockJenkinsfileResponse(templateId, parameters) {
    // 模拟不同类型的响应
    const responses = {
      'basic': `pipeline {
    agent any
    
    tools {
        maven 'Maven 3.8.6'
        jdk 'JDK 11'
    }
    
    stages {
        stage('Checkout') {
            steps {
                git url: '${parameters.repoUrl || "https://github.com/example/repo.git"}'
            }
        }
        
        stage('Build') {
            steps {
                sh '${parameters.buildCommand || "mvn clean package"}'
            }
        }
        
        stage('Test') {
            steps {
                sh '${parameters.testCommand || "mvn test"}'
            }
        }
    }
}`,
      'docker': `pipeline {
    agent any
    
    stages {
        stage('Build Docker Image') {
            steps {
                sh 'docker build -t docker.io/${parameters.imageName || "myapp"}:latest .'
            }
        }
        
        stage('Push Image') {
            steps {
                sh 'echo "Pushing image to docker.io/${parameters.imageName || "myapp"}:latest"'
                sh 'docker push docker.io/${parameters.imageName || "myapp"}:latest'
            }
        }
    }
}`,
      'advanced': `pipeline {
    agent any
    
    environment {
        REPO_URL = '${parameters.repoUrl || "https://github.com/example/repo.git"}'
    }
    
    stages {
        stage('Checkout') {
            steps {
                git url: env.REPO_URL
            }
        }
        
        stage('Build & Test') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        sh 'mvn test'
                    }
                }
                stage('Integration Tests') {
                    steps {
                        sh 'mvn verify'
                    }
                }
            }
        }
        
        stage('Deploy') {
            steps {
                echo 'Deploying to production...'
            }
        }
    }
}`
    };

    // 若模板不存在，默认使用basic模板
    const content = responses[templateId] || responses.basic;
    
    return {
      success: true,
      content
    };
  }

  /**
   * 模拟 CI/CD 配置生成的响应（私有）
   * @param {string} platformId - 平台ID
   * @param {string} templateId - 模板ID
   * @param {Record<string, any>} parameters - 生成参数
   * @returns {AIResponse} 模拟响应结果
   */
  #mockCICDResponse(platformId, templateId, parameters) {
    const getResponse = () => {
      switch (platformId) {
        case 'gitlab':
          if (templateId === 'gitlab-simple' || templateId === 'simple') {
            return `stages:
  - build
  - test

build:
  stage: build
  image: node:16
  script:
    - npm install
    - ${parameters.buildCommand || "npm run build"}
  artifacts:
    paths:
      - dist/

test:
  stage: test
  image: node:16
  script:
    - npm install
    - ${parameters.testCommand || "npm test"}
`
          } else if (templateId === 'gitlab-docker' || templateId === 'docker') {
            return `variables:
  DOCKER_TLS_CERTDIR: "/certs"
  IMAGE_TAG: \$CI_REGISTRY_IMAGE/${parameters.imageName || "myapp"}:\$CI_COMMIT_REF_SLUG

stages:
  - build
  - test
  - build_image
  - deploy_${parameters.deployStage || "dev"}

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
    - docker login -u \$CI_REGISTRY_USER -p \$CI_REGISTRY_PASSWORD \$CI_REGISTRY
  script:
    - docker build -t \$IMAGE_TAG .
    - docker push \$IMAGE_TAG
  needs:
    - build

deploy_${parameters.deployStage || "dev"}:
  stage: deploy_${parameters.deployStage || "dev"}
  image: docker:20.10.16
  services:
    - docker:20.10.16-dind
  before_script:
    - docker login -u \$CI_REGISTRY_USER -p \$CI_REGISTRY_PASSWORD \$CI_REGISTRY
  script:
    - docker pull \$IMAGE_TAG
    - echo "Deploying to ${parameters.deployStage || "dev"} environment"
  environment:
    name: ${parameters.deployStage || "dev"}
  only:
    - main
  needs:
    - build_image
`
          }
          break

        case 'github':
          if (templateId === 'github-simple' || templateId === 'simple') {
            return `name: CI Pipeline

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
        node-version: [${parameters.nodeVersion || "18.x"}]

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
      run: ${parameters.buildCommand || "npm run build"}
      
    - name: Test
      run: ${parameters.testCommand || "npm test"}
`
          } else if (templateId === 'github-docker' || templateId === 'docker') {
            return `name: Docker CI/CD

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
  IMAGE_NAME: \${{ github.repository }}/${parameters.imageName || "myapp"}

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
            type=sha,prefix=${parameters.imageName || "myapp"}-

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: \${{ steps.meta.outputs.tags }}
          labels: \${{ steps.meta.outputs.labels }}
`
          }
          break

        case 'azure':
          if (templateId === 'azure-simple' || templateId === 'simple') {
            return `trigger:
  - main
  - develop

pr:
  - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  nodeVersion: '${parameters.nodeVersion || "18.x"}'

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
              ${parameters.buildCommand || "npm run build"}
            displayName: 'npm install and build'

          - task: PublishBuildArtifacts@1
            inputs:
              PathtoPublish: 'dist'
              ArtifactName: 'drop'
            displayName: 'Publish artifacts'
`
          } else if (templateId === 'azure-docker' || templateId === 'docker') {
            return `trigger:
  - main

variables:
  imageRepository: '${parameters.imageName || "myapp"}'
  containerRegistry: '${parameters.acrName || "mycontainerregistry"}.azurecr.io'
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
            --resource-group ${parameters.resourceGroup || "myResourceGroup"} \
            --name ${parameters.imageName || "myapp"}-container \
            --image \$(containerRegistry)/\$(imageRepository):\$(tag) \
            --cpu 1 \
            --memory 1.5 \
            --ports 80 443 \
            --dns-name-label ${parameters.imageName || "myapp"}-\$(Build.BuildId) \
            --registry-username \$(acrUsername) \
            --registry-password \$(acrPassword)
`
          }
          break

        case 'jenkins':
        default:
          if (templateId === 'jenkins-simple' || templateId === 'simple' || templateId === 'basic') {
            return `pipeline {
    agent any
    
    tools {
        maven 'Maven 3.8.6'
        jdk 'JDK 11'
    }
    
    stages {
        stage('Checkout') {
            steps {
                git url: '${parameters.repoUrl || "https://github.com/example/repo.git"}'
            }
        }
        
        stage('Build') {
            steps {
                sh '${parameters.buildCommand || "mvn clean package"}'
            }
        }
        
        stage('Test') {
            steps {
                sh '${parameters.testCommand || "mvn test"}'
            }
        }
    }
}`
          } else {
            return `pipeline {
    agent any
    
    stages {
        stage('Build Docker Image') {
            steps {
                sh 'docker build -t docker.io/${parameters.imageName || "myapp"}:latest .'
            }
        }
        
        stage('Push Image') {
            steps {
                sh 'docker push docker.io/${parameters.imageName || "myapp"}:latest'
            }
        }
    }
}`
          }
      }
      return `# Default configuration for ${platformId}`
    }

    const content = getResponse()
    return {
      success: true,
      content
    }
  }

  /**
   * 模拟Dockerfile分析的响应（私有）
   * @param {string} content - Dockerfile内容
   * @returns {AIResponse} 模拟响应结果
   */
  #mockDockerfileAnalysis(content) {
    // 模拟分析结果
    const mockAnalysis = {
      issues: [
        {
          line: 1,
          type: 'warning',
          message: '建议使用具体版本号而非 latest',
          suggestion: '使用具体版本号如 FROM node:16.14.0 替代 FROM node:latest'
        },
        {
          line: 8,
          type: 'info',
          message: '建议添加 .dockerignore 文件',
          suggestion: '创建 .dockerignore 文件排除不必要的文件以减少构建上下文'
        }
      ],
      suggestions: [
        '使用多阶段构建减少最终镜像大小',
        '将依赖项复制和安装分层以提高缓存效率',
        '考虑使用非 root 用户运行应用以提高安全性'
      ],
      score: 75,
      optimizedContent: `# 优化后的 Dockerfile
FROM node:16.14.0-alpine as builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./
RUN npm ci --only=production

# 复制源代码并构建
COPY . .
RUN npm run build

# 生产阶段
FROM node:16.14.0-alpine

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# 从构建阶段复制文件
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]`
    };

    return {
      success: true,
      content: JSON.stringify(mockAnalysis, null, 2)
    };
  }

  /**
   * 分析 AWS 账单 CSV
   * @param {string} csvContent - CSV 原文
   * @returns {Promise<AIResponse>} AI 响应，content 为 JSON 字符串：{ summary, topResources, suggestions, chartData }
   */
  async analyzeBillingCSV(csvContent) {
    if (this.#isMockMode) {
      return this.#mockBillingAnalysis(csvContent)
    }

    try {
      const prompt = `请分析以下 AWS 账单 CSV（CSV 第一行为表头，包含资源/服务和费用等字段）：\n\n${csvContent}\n\n请返回 JSON 格式，格式参考：{ "summary": {"totalCost": number, "period": "YYYY-MM"}, "topResources": [{"resource": "ec2", "cost": number, "percent": number}], "suggestions": ["..."], "chartData": {"categories": ["ec2"], "values": [100]} }`

      const response = await this.#callAI(prompt)
      
      try {
        const parsed = JSON.parse(response.content)
        return { success: true, content: JSON.stringify(parsed, null, 2) }
      } catch (parseError) {
        console.warn('[AIService] 账单分析结果JSON解析失败，使用原始内容', {
          error: parseError.message,
          rawContent: response.content.substring(0, 200)
        })
        
        return { 
          success: true, 
          content: JSON.stringify({ 
            summary: { totalCost: 0, period: '' }, 
            topResources: [], 
            suggestions: [response.content.substring(0, 500)], 
            chartData: { categories: [], values: [] } 
          }, null, 2) 
        }
      }
    } catch (error) {
      return this.#createErrorResponse(
        error,
        `分析账单失败: ${error instanceof AppError ? error.userMessage : '请检查网络连接后重试'}`
      )
    }
  }

  /**
   * 翻译 & 解释技术日志（英文日志 -> 中文翻译 + 故障原因 + 修复建议）
   * @param {string} logContent - 英文日志
   * @returns {Promise<AIResponse>} AI 响应，content 为 JSON 字符串：{ translation, explanation, fixes }
   */
  async translateLog(logContent) {
    if (this.#isMockMode) {
      return this.#mockLogTranslation(logContent)
    }

    try {
      const prompt = `以下是英文技术日志，请翻译成中文并解释可能原因及给出具体修复建议：\n\n${logContent}\n\n请以 JSON 格式返回：{ "translation": "...", "explanation": "...", "fixes": ["..."] }`

      const response = await this.#callAI(prompt)

      try {
        const parsed = JSON.parse(response.content)
        return { success: true, content: JSON.stringify(parsed, null, 2) }
      } catch (parseError) {
        console.warn('[AIService] 日志翻译结果JSON解析失败，使用原始内容', {
          error: parseError.message
        })
        
        return { 
          success: true, 
          content: JSON.stringify({ 
            translation: response.content, 
            explanation: 'AI返回格式异常，请直接查看翻译内容', 
            fixes: [] 
          }, null, 2) 
        }
      }
    } catch (error) {
      return this.#createErrorResponse(
        error,
        `日志翻译失败: ${error instanceof AppError ? error.userMessage : '请检查网络连接后重试'}`
      )
    }
  }

  /**
   * 模拟账单分析（私有）
   * @param {string} csvContent
   * @returns {AIResponse}
   */
  #mockBillingAnalysis(csvContent) {
    const mock = {
      summary: {
        totalCost: 1245.67,
        period: '2025-11'
      },
      topResources: [
        { resource: 'EC2', cost: 734.12, percent: 58.9 },
        { resource: 'S3', cost: 256.5, percent: 20.6 },
        { resource: 'RDS', cost: 150.75, percent: 12.1 }
      ],
      suggestions: [
        '关闭未使用的 EC2 实例或使用 Spot/Reserved 实例节省成本',
        '为 S3 设置生命周期规则清理不必要的归档',
        '检查 RDS 的实例规格，考虑降配或使用 Aurora Serverless'
      ],
      chartData: {
        categories: ['EC2', 'S3', 'RDS', '其他'],
        values: [734.12, 256.5, 150.75, 104.3]
      }
    };

    return { success: true, content: JSON.stringify(mock, null, 2) };
  }

  /**
   * 模拟日志翻译（私有）
   * @param {string} logContent
   * @returns {AIResponse}
   */
  #mockLogTranslation(logContent) {
    const mock = {
      translation: '错误: 连接到数据库失败：超时\n详细: 数据库不可达。',
      explanation: '看起来应用无法连接到数据库，可能原因包括网络中断、数据库凭据错误或数据库实例处于不可用状态。',
      fixes: [
        '检查数据库连接字符串和凭据',
        '确认数据库实例运行并可达（安全组/防火墙规则）',
        '查看数据库端日志以确认是否有资源或配额问题'
      ]
    };

    return { success: true, content: JSON.stringify(mock, null, 2) };
  }

  /**
   * 分析 CI/CD 配置文件，检测常见问题并提供修复建议
   * @param {string} content - CI/CD 配置内容
   * @param {string} platform - 平台类型 (jenkins, gitlab, github, azure)
   * @returns {Promise<AIResponse>} AI响应结果，content 为 JSON 字符串：{ issues, suggestions, score, fixedContent }
   */
  async analyzeCICDConfig(content, platform = 'jenkins') {
    if (this.#isMockMode) {
      return this.#mockCICDAnalysis(content, platform)
    }

    try {
      const platformInfo = {
        jenkins: {
          name: 'Jenkins',
          fileType: 'Jenkinsfile',
          language: 'Groovy'
        },
        gitlab: {
          name: 'GitLab CI/CD',
          fileType: '.gitlab-ci.yml',
          language: 'YAML'
        },
        github: {
          name: 'GitHub Actions',
          fileType: 'workflow.yml',
          language: 'YAML'
        },
        azure: {
          name: 'Azure DevOps',
          fileType: 'azure-pipelines.yml',
          language: 'YAML'
        }
      }

      const info = platformInfo[platform] || platformInfo.jenkins

      const prompt = `请分析以下 ${info.fileType} 配置，检测常见问题并提供修复建议：

${content}

请检测以下类型的问题：
1. 缓存配置问题（如未配置缓存导致构建缓慢）
2. 超时时间设置不合理（过短或过长）
3. 并行策略问题（如可以并行但顺序执行）
4. 安全漏洞（如明文密码、硬编码密钥、不安全的权限配置）
5. 性能问题（如未使用并行构建、镜像层未优化）
6. 最佳实践缺失（如缺少错误处理、缺少通知机制）
7. 资源配置不合理

请以 JSON 格式返回结果（只返回JSON数据，不要包含其他内容）：
{
  "issues": [
    {
      "line": 行号(如果无法确定则为0),
      "type": "error|warning|info",
      "category": "缓存|超时|并行|安全|性能|最佳实践|资源",
      "message": "问题描述",
      "suggestion": "修复建议",
      "severity": "高|中|低"
    }
  ],
  "suggestions": [
    "总体优化建议1",
    "总体优化建议2"
  ],
  "score": 评分(0-100),
  "summary": "简要总结分析结果"
}`

      const response = await this.#callAI(prompt)
      
      let parsedResponse
      try {
        parsedResponse = JSON.parse(response.content)
      } catch (parseError) {
        console.warn('[AIService] CI/CD分析结果JSON解析失败，尝试使用原始内容', {
          error: parseError.message,
          rawContent: response.content.substring(0, 200)
        })
        
        parsedResponse = {
          issues: [],
          suggestions: [response.content.substring(0, 500)],
          score: 70,
          summary: '分析完成，但结果格式异常'
        }
      }

      const prompt2 = `
对于以下 ${info.fileType} 配置：
${content}

基于以下分析报告，请提供一个优化修复后的完整配置文件：
${JSON.stringify(parsedResponse, null, 2)}

请只返回修复后的 ${info.language} 配置内容，不要包含其他解释、注释或代码块标记。`

      try {
        const response2 = await this.#callAI(prompt2)
        let fixedContent = response2.content
        
        if (platform === 'jenkins') {
          fixedContent = fixedContent.replace(/^```(?:groovy|jenkinsfile)?\s*/, '').replace(/\s*```$/, '').trim()
        } else {
          fixedContent = fixedContent.replace(/^```(?:yaml|yml)?\s*/, '').replace(/\s*```$/, '').trim()
        }
        
        parsedResponse.fixedContent = fixedContent
      } catch (optimizeError) {
        console.warn('[AIService] 生成修复CI/CD配置失败，使用原始内容', {
          error: optimizeError.message
        })
        parsedResponse.fixedContent = content
      }

      return {
        success: true,
        content: JSON.stringify(parsedResponse, null, 2)
      }
    } catch (error) {
      return this.#createErrorResponse(
        error,
        `分析 CI/CD 配置失败: ${error instanceof AppError ? error.userMessage : '请检查网络连接后重试'}`
      )
    }
  }

  /**
   * 模拟 CI/CD 配置分析响应（私有）
   * @param {string} content - CI/CD 配置内容
   * @param {string} platform - 平台类型
   * @returns {AIResponse} 模拟响应结果
   */
  #mockCICDAnalysis(content, platform) {
    const platformInfo = {
      jenkins: {
        name: 'Jenkins',
        issues: [
          {
            line: 2,
            type: 'warning',
            category: '缓存',
            message: '未配置构建缓存，每次构建都需要重新下载依赖',
            suggestion: '建议使用 mavenLocal 缓存或配置 Jenkins 全局工具缓存',
            severity: '中'
          },
          {
            line: 0,
            type: 'warning',
            category: '超时',
            message: '未显式设置超时时间，可能导致长时间运行的任务被意外终止',
            suggestion: '建议使用 options { timeout(time: 30, unit: \"MINUTES\") } 设置合理的超时时间',
            severity: '中'
          },
          {
            line: 0,
            type: 'info',
            category: '并行',
            message: '测试和构建顺序执行，可以考虑并行执行以缩短总构建时间',
            suggestion: '使用 parallel 块并行运行单元测试和集成测试',
            severity: '低'
          },
          {
            line: 0,
            type: 'warning',
            category: '安全',
            message: '未使用凭据管理，可能存在硬编码敏感信息的风险',
            suggestion: '使用 Jenkins Credentials 插件管理凭据，通过 withCredentials 引用',
            severity: '高'
          },
          {
            line: 0,
            type: 'info',
            category: '最佳实践',
            message: '缺少构建失败通知机制',
            suggestion: '添加 post { failure { mail to: \"dev@example.com\", subject: \"构建失败\" } }',
            severity: '低'
          }
        ],
        suggestions: [
          '配置 maven 或 npm 缓存以加快构建速度',
          '设置合理的超时时间防止构建卡住',
          '考虑将测试阶段并行化',
          '使用凭据插件管理敏感信息',
          '添加构建状态通知'
        ],
        score: 65,
        summary: '检测到5个可优化点，主要问题包括缺少缓存配置、超时设置、并行策略和安全凭据管理'
      },
      gitlab: {
        name: 'GitLab CI/CD',
        issues: [
          {
            line: 0,
            type: 'warning',
            category: '缓存',
            message: '未配置 cache，每次 job 都需要重新下载依赖',
            suggestion: '配置 cache: key: \"${CI_COMMIT_REF_SLUG}\" paths: [node_modules/]',
            severity: '中'
          },
          {
            line: 0,
            type: 'warning',
            category: '超时',
            message: '未设置 job 超时时间，使用默认值可能不够',
            suggestion: '设置 timeout: 30m 或根据实际需求调整',
            severity: '低'
          },
          {
            line: 0,
            type: 'info',
            category: '并行',
            message: 'build 和 test 顺序执行，可以考虑使用 needs 或并行策略',
            suggestion: '如果 test 不依赖 build 结果，可以设置 needs: [] 让它们并行',
            severity: '低'
          },
          {
            line: 0,
            type: 'warning',
            category: '安全',
            message: '可能使用了硬编码的敏感变量',
            suggestion: '使用 GitLab CI/CD Variables 管理敏感信息，勾选 masked 和 protected',
            severity: '高'
          },
          {
            line: 0,
            type: 'info',
            category: '最佳实践',
            message: '未使用 rules 或 only/except 控制触发时机',
            suggestion: '添加 rules: - if: \$CI_COMMIT_BRANCH == \"main\" 等条件控制',
            severity: '低'
          }
        ],
        suggestions: [
          '配置 cache 缓存 node_modules 或其他依赖',
          '设置合理的 job 超时时间',
          '使用 needs 优化依赖关系，允许并行执行',
          '通过 GitLab CI/CD Variables 管理敏感信息',
          '使用 rules 精确控制 job 触发条件'
        ],
        score: 68,
        summary: '检测到5个可优化点，建议配置缓存、设置超时、优化并行策略和安全变量管理'
      },
      github: {
        name: 'GitHub Actions',
        issues: [
          {
            line: 0,
            type: 'warning',
            category: '缓存',
            message: '未使用 actions/cache 缓存依赖',
            suggestion: '添加 - uses: actions/cache@v4 with: path: node_modules key: \${{ runner.os }}-node-\${{ hashFiles(\"**/package-lock.json\") }}',
            severity: '中'
          },
          {
            line: 0,
            type: 'info',
            category: '超时',
            message: '未设置 job 超时，默认 6 小时可能过长',
            suggestion: '设置 timeout-minutes: 30 限制最大执行时间',
            severity: '低'
          },
          {
            line: 0,
            type: 'info',
            category: '并行',
            message: '未使用 matrix 或并行 job 优化',
            suggestion: '考虑使用 strategy: matrix 测试多个 Node 版本，或拆分独立 job 并行执行',
            severity: '低'
          },
          {
            line: 0,
            type: 'warning',
            category: '安全',
            message: '可能存在权限配置问题',
            suggestion: '显式设置 permissions: contents: read 最小化权限，避免使用默认的 write 权限',
            severity: '高'
          },
          {
            line: 0,
            type: 'warning',
            category: '安全',
            message: '未使用 GitHub Secrets 管理敏感信息',
            suggestion: '使用 \${{ secrets.SECRET_NAME }} 引用机密，不要硬编码',
            severity: '高'
          },
          {
            line: 0,
            type: 'info',
            category: '最佳实践',
            message: '缺少构建失败通知',
            suggestion: '添加 slack-send 或其他通知 action 在构建失败时通知团队',
            severity: '低'
          }
        ],
        suggestions: [
          '使用 actions/cache 缓存 npm/maven 依赖',
          '设置合理的 timeout-minutes',
          '使用 matrix 策略多版本测试',
          '显式配置最小化 permissions',
          '使用 GitHub Secrets 管理敏感信息',
          '添加构建状态通知'
        ],
        score: 60,
        summary: '检测到6个可优化点，主要问题包括缺少缓存配置、权限配置和安全凭据管理'
      },
      azure: {
        name: 'Azure DevOps',
        issues: [
          {
            line: 0,
            type: 'warning',
            category: '缓存',
            message: '未使用 Cache task 缓存依赖',
            suggestion: '使用 Cache@2 task 缓存 node_modules 或其他依赖',
            severity: '中'
          },
          {
            line: 0,
            type: 'info',
            category: '超时',
            message: '未设置 job 超时时间',
            suggestion: '设置 timeoutInMinutes: 30 限制最大执行时间',
            severity: '低'
          },
          {
            line: 0,
            type: 'info',
            category: '并行',
            message: '未充分利用并行 job',
            suggestion: '考虑使用 jobs: - job: Test strategy: parallel: 4 并行执行测试',
            severity: '低'
          },
          {
            line: 0,
            type: 'warning',
            category: '安全',
            message: '可能硬编码了连接字符串或密钥',
            suggestion: '使用 Azure DevOps Variable Groups 或 Library Secure Files 管理敏感信息',
            severity: '高'
          },
          {
            line: 0,
            type: 'info',
            category: '最佳实践',
            message: '缺少构建质量检查',
            suggestion: '添加 SonarCloud 或 Code Analysis task 进行代码质量检查',
            severity: '低'
          }
        ],
        suggestions: [
          '使用 Cache@2 task 缓存依赖',
          '设置合理的 timeoutInMinutes',
          '使用 parallel 策略并行执行测试',
          '通过 Variable Groups 管理敏感信息',
          '添加代码质量检查任务'
        ],
        score: 68,
        summary: '检测到5个可优化点，建议配置缓存、设置超时、优化并行策略和安全变量管理'
      }
    }

    const info = platformInfo[platform] || platformInfo.jenkins
    
    let fixedContent = content
    if (platform === 'jenkins') {
      fixedContent = `pipeline {
    agent any
    
    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }
    
    tools {
        maven 'Maven 3.8.6'
        jdk 'JDK 11'
    }
    
    environment {
        MAVEN_OPTS = '-Dmaven.repo.local=.m2/repository'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Build & Test') {
            parallel {
                stage('Build') {
                    steps {
                        withMaven(maven: 'Maven 3.8.6', jdk: 'JDK 11', options: [
                            artifactsPublisher(disabled: true)
                        ]) {
                            sh 'mvn clean package -DskipTests'
                        }
                    }
                }
                stage('Unit Tests') {
                    steps {
                        withMaven(maven: 'Maven 3.8.6', jdk: 'JDK 11', options: [
                            junitPublisher(disabled: false, healthScaleFactor: 1.0)
                        ]) {
                            sh 'mvn test'
                        }
                    }
                }
            }
        }
    }
    
    post {
        always {
            echo '清理工作空间...'
            cleanWs()
        }
        success {
            echo '构建成功!'
        }
        failure {
            echo '构建失败!'
        }
    }
}`
    } else if (platform === 'gitlab') {
      fixedContent = `stages:
  - build
  - test
  - deploy

variables:
  NODE_OPTIONS: '--max-old-space-size=4096'

cache:
  key: '\${CI_COMMIT_REF_SLUG}'
  paths:
    - node_modules/
  policy: pull-push

build:
  stage: build
  image: node:20-alpine
  timeout: 30m
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 week
  rules:
    - if: \$CI_COMMIT_BRANCH
    - if: \$CI_PIPELINE_SOURCE == 'merge_request_event'

test:
  stage: test
  image: node:20-alpine
  timeout: 20m
  script:
    - npm ci
    - npm test
  needs:
    - build
  rules:
    - if: \$CI_COMMIT_BRANCH
    - if: \$CI_PIPELINE_SOURCE == 'merge_request_event'

deploy_prod:
  stage: deploy
  image: docker:latest
  services:
    - docker:dind
  timeout: 45m
  variables:
    DOCKER_TLS_CERTDIR: '/certs'
  script:
    - docker login -u \$CI_REGISTRY_USER -p \$CI_REGISTRY_PASSWORD \$CI_REGISTRY
    - docker build -t \$CI_REGISTRY_IMAGE:latest .
    - docker push \$CI_REGISTRY_IMAGE:latest
  rules:
    - if: \$CI_COMMIT_BRANCH == 'main'
  environment:
    name: production
    url: https://example.com`
    } else if (platform === 'github') {
      fixedContent = `name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

permissions:
  contents: read
  packages: write

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js \${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run linter
        run: npm run lint
        
      - name: Build
        run: npm run build
        
      - name: Test
        run: npm test
        env:
          CI: true

  build-and-push-image:
    needs: build-and-test
    runs-on: ubuntu-latest
    timeout-minutes: 45
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        
      - name: Log in to Container registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}
          
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/\${{ github.repository }}
          tags: |
            type=ref,event=branch
            type=sha,prefix=
            
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: \${{ steps.meta.outputs.tags }}
          labels: \${{ steps.meta.outputs.labels }}`
    } else {
      fixedContent = `trigger:
  - main
  - develop

pr:
  - main

variables:
  nodeVersion: '20.x'
  buildConfiguration: 'Release'

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: Build
    displayName: 'Build Stage'
    jobs:
      - job: Build
        displayName: 'Build Job'
        timeoutInMinutes: 30
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '\$(nodeVersion)'
            displayName: 'Install Node.js'
            
          - task: Cache@2
            inputs:
              key: 'npm | "\$(Agent.OS)" | package-lock.json'
              restoreKeys: |
                npm | "\$(Agent.OS)"
              path: 'node_modules'
            displayName: 'Cache npm dependencies'
            
          - script: |
              npm ci
              npm run build
            displayName: 'npm install and build'
            
          - task: PublishBuildArtifacts@1
            inputs:
              PathtoPublish: 'dist'
              ArtifactName: 'drop'
            displayName: 'Publish artifacts'
            
  - stage: Test
    displayName: 'Test Stage'
    dependsOn: Build
    jobs:
      - job: Test
        displayName: 'Run Tests'
        timeoutInMinutes: 20
        strategy:
          parallel: 2
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '\$(nodeVersion)'
            displayName: 'Install Node.js'
            
          - task: Cache@2
            inputs:
              key: 'npm | "\$(Agent.OS)" | package-lock.json'
              path: 'node_modules'
            displayName: 'Cache npm dependencies'
            
          - script: |
              npm ci
              npm test
            displayName: 'Run tests'
            
          - task: PublishTestResults@2
            inputs:
              testResultsFormat: 'JUnit'
              testResultsFiles: '**/test-*.xml'
            displayName: 'Publish test results'
            condition: succeededOrFailed()
            
  - stage: Deploy
    displayName: 'Deploy to Production'
    dependsOn: Test
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: Deploy
        displayName: 'Deploy Job'
        timeoutInMinutes: 45
        environment: 'Production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: DownloadBuildArtifacts@0
                  inputs:
                    buildType: 'current'
                    downloadType: 'single'
                    artifactName: 'drop'
                    downloadPath: '\$(System.ArtifactsDirectory)'
                  displayName: 'Download artifacts'
                  
                - task: AzureWebApp@1
                  inputs:
                    azureSubscription: 'AzureServiceConnection'
                    appType: 'webAppLinux'
                    appName: 'my-web-app'
                    package: '\$(System.ArtifactsDirectory)/drop'
                  displayName: 'Deploy to Azure Web App'`
    }

    const mockAnalysis = {
      issues: info.issues,
      suggestions: info.suggestions,
      score: info.score,
      summary: info.summary,
      fixedContent: fixedContent
    }

    return {
      success: true,
      content: JSON.stringify(mockAnalysis, null, 2)
    }
  }

  /**
   * AI辅助生成知识文章
   * @param {Object} params - 生成参数
   * @param {string} params.inputType - 输入类型：'topic'（主题）或 'content'（配置/日志/报错）
   * @param {string} params.input - 用户输入的内容
   * @param {string} [params.category] - 可选的目标分类提示
   * @returns {Promise<AIResponse>} AI响应结果，content为JSON字符串：{ title, summary, tags, difficulty, content, category }
   */
  async generateKnowledgeArticle(params) {
    if (this.#isMockMode) {
      return this.#mockKnowledgeArticle(params)
    }

    try {
      const { inputType, input, category } = params
      
      let prompt
      if (inputType === 'topic') {
        prompt = `请根据以下主题，生成一篇完整的技术知识文章：

主题：${input}
${category ? `目标分类：${category}` : ''}

请生成一个结构完整的知识文章，以JSON格式返回，格式如下：
{
  "title": "文章标题（简洁明了）",
  "summary": "文章摘要，100-200字概括主要内容",
  "tags": ["标签1", "标签2", "标签3"],
  "difficulty": "初级|中级|高级",
  "readTime": "阅读时间，如：10 分钟",
  "content": "Markdown格式的完整文章内容，包含：
1. 清晰的章节结构（## 标题，### 子标题）
2. 代码示例（使用代码块标记）
3. 表格说明（使用|分隔）
4. 最佳实践建议
5. 常见问题解答",
  "category": "建议的分类ID（如：cicd-best-practices, docker-optimization, kubernetes-ops, cloud-architecture, security-compliance 或 custom）"
}

请确保：
1. 内容专业且实用，适合DevOps工程师参考
2. 代码示例准确可运行
3. 标签与分类匹配
4. 难度评估合理`
      } else {
        prompt = `请分析以下内容（配置/日志/报错信息），将其整理成一篇结构化的知识文章：

${input}

${category ? `目标分类：${category}` : ''}

请分析内容类型，提取关键信息，生成一篇有价值的知识文章。以JSON格式返回：
{
  "title": "文章标题（概括内容主题）",
  "summary": "文章摘要，100-200字概括主要内容",
  "tags": ["标签1", "标签2", "标签3"],
  "difficulty": "初级|中级|高级",
  "readTime": "阅读时间，如：8 分钟",
  "content": "Markdown格式的完整文章内容，应包含：
1. 问题/场景描述
2. 原因分析
3. 解决方案
4. 代码示例或配置片段
5. 最佳实践建议
6. 预防措施",
  "category": "建议的分类ID（如：cicd-best-practices, docker-optimization, kubernetes-ops, cloud-architecture, security-compliance 或 custom）"
}

请确保：
1. 准确分析用户提供的内容
2. 给出实用的解决方案
3. 代码示例准确可运行
4. 标签与分类匹配
5. 难度评估合理`
      }

      const response = await this.#callAI(prompt)
      
      let parsedResponse
      try {
        parsedResponse = JSON.parse(response.content)
      } catch (parseError) {
        console.warn('[AIService] 知识文章生成结果JSON解析失败，尝试使用原始内容', {
          error: parseError.message,
          rawContent: response.content.substring(0, 300)
        })
        
        parsedResponse = {
          title: inputType === 'topic' ? input : '技术知识文章',
          summary: 'AI生成的知识文章',
          tags: ['技术'],
          difficulty: '中级',
          readTime: '10 分钟',
          content: response.content,
          category: 'custom'
        }
      }

      return {
        success: true,
        content: JSON.stringify(parsedResponse, null, 2)
      }
    } catch (error) {
      return this.#createErrorResponse(
        error,
        `生成知识文章失败: ${error instanceof AppError ? error.userMessage : '请检查网络连接和 API 配置后重试'}`
      )
    }
  }

  /**
   * 模拟生成知识文章（私有）
   * @param {Object} params - 生成参数
   * @returns {AIResponse} 模拟响应结果
   */
  #mockKnowledgeArticle(params) {
    const { inputType, input } = params
    
    const mockArticles = {
      topic: {
        'docker': {
          title: 'Docker 容器化最佳实践指南',
          summary: '深入了解Docker容器化的核心概念和最佳实践，包括镜像构建优化、容器安全、网络配置和持久化存储等关键主题。',
          tags: ['Docker', '容器化', '最佳实践', 'DevOps'],
          difficulty: '中级',
          readTime: '12 分钟',
          content: `## Docker 容器化最佳实践指南

### 1. 镜像构建优化

#### 使用多阶段构建
多阶段构建可以显著减小最终镜像的体积，只包含运行时必需的文件。

\`\`\`dockerfile
# 构建阶段
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# 生产阶段
FROM node:18-alpine
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
USER appuser
EXPOSE 3000
CMD ["node", "dist/index.js"]
\`\`\`

#### 合理安排层顺序
将变化频率低的指令放在前面，利用Docker的层缓存机制：

| 指令顺序 | 说明 |
|----------|------|
| FROM | 基础镜像 |
| ENV/LABEL | 元数据 |
| RUN apk add... | 安装依赖 |
| COPY package*.json | 依赖定义 |
| RUN npm install | 安装依赖 |
| COPY . | 应用代码 |
| CMD/ENTRYPOINT | 启动命令 |

### 2. 容器安全最佳实践

#### 以非root用户运行
始终创建非root用户来运行应用：

\`\`\`dockerfile
FROM alpine:3.18
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --chown=appuser:appgroup . .
USER appuser
CMD ["node", "app.js"]
\`\`\`

#### 扫描镜像漏洞
使用工具扫描已知漏洞：
- **Trivy**: 简单易用的漏洞扫描器
- **Clair**: 深度漏洞分析
- **Snyk**: 开发者友好的安全工具

\`\`\`bash
trivy image myapp:latest
\`\`\`

### 3. 网络配置

#### 使用自定义网络
创建自定义网络进行服务间通信：

\`\`\`bash
# 创建网络
docker network create app-network

# 运行服务
docker run -d --name db --network app-network postgres:13
docker run -d --name api --network app-network myapi
\`\`\`

#### 限制端口监听范围
只监听必要的端口，避免暴露到公网：

\`\`\`bash
# 只监听localhost
docker run -d -p 127.0.0.1:8080:80 nginx
\`\`\`

### 4. 持久化存储

#### 使用Volume而非Bind Mounts
Volume由Docker管理，提供更好的性能和隔离：

\`\`\`dockerfile
VOLUME /app/data
\`\`\`

#### 命名Volume管理
明确命名Volume以便于管理：

\`\`\`bash
docker run -d \
  --name db \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:13
\`\`\`

### 5. 资源限制

#### 限制CPU和内存
防止单个容器耗尽宿主机资源：

\`\`\`bash
docker run -d \
  --memory=512m \
  --cpus=0.5 \
  --pids-limit=100 \
  myapp:latest
\`\`\`

### 常见问题解答

**Q: 如何减小镜像体积？**
A: 使用多阶段构建、选择alpine基础镜像、合并RUN指令、清理缓存。

**Q: 容器之间如何通信？**
A: 使用自定义Docker网络，通过容器名称或网络别名互相访问。

**Q: 如何处理容器日志？**
A: 使用Docker日志驱动，或配置ELK Stack进行日志聚合分析。`,
          category: 'docker-optimization'
        },
        'kubernetes': {
          title: 'Kubernetes Pod 故障排查指南',
          summary: '掌握Kubernetes Pod故障排查的核心方法，从常见问题到高级诊断技巧，帮助你快速定位和解决Pod运行时问题。',
          tags: ['Kubernetes', 'Pod', '故障排查', '运维'],
          difficulty: '中级',
          readTime: '15 分钟',
          content: `## Kubernetes Pod 故障排查指南

### Pod 生命周期状态

| 状态 | 描述 | 常见原因 |
|------|------|----------|
| Pending | Pod已被接受，容器尚未创建 | 资源不足、镜像拉取问题、PVC未绑定 |
| Running | Pod已绑定节点，所有容器已创建 | 正常运行 |
| Succeeded | 所有容器成功终止 | 一次性任务完成 |
| Failed | 至少一个容器异常退出 | 应用崩溃、配置错误 |
| Unknown | 无法获取状态 | 节点通信问题 |

### 第一步：获取基本信息

\`\`\`bash
# 查看Pod列表
kubectl get pods

# 查看更多信息（包含节点）
kubectl get pods -o wide

# 查看Pod详细信息（包含事件）
kubectl describe pod <pod-name>

# 持续观察Pod状态
kubectl get pods -w
\`\`\`

### 常见问题排查

#### 1. Pod 卡在 Pending

**检查事件：**
\`\`\`bash
kubectl describe pod <pod-name>
\`\`\`

**常见原因：**

**a) 资源不足**
- 节点CPU或内存不足
- 检查节点资源：\`kubectl describe nodes\`

**b) 镜像拉取失败**
检查事件中的错误信息：
- ImagePullBackOff
- ErrImagePull
- 验证镜像名称和标签
- 检查私有仓库凭据

\`\`\`bash
# 检查Secret是否存在
kubectl get secrets

# 测试手动拉取
kubectl run test --image=private/image --rm -it
\`\`\`

**c) PVC 未绑定**
- 检查PersistentVolumeClaim状态
- 验证StorageClass配置

#### 2. Pod 不断重启 (CrashLoopBackOff)

**查看日志：**
\`\`\`bash
# 查看当前日志
kubectl logs <pod-name>

# 查看已退出容器的日志
kubectl logs --previous <pod-name>

# 持续查看日志
kubectl logs -f <pod-name>
\`\`\`

**常见原因：**

**a) 应用启动错误**
- 配置文件缺失
- 依赖服务不可用
- 权限问题

**b) 探针配置问题**
- livenessProbe 失败
- 探针超时时间过短
- 初始延迟不足

\`\`\`yaml
# 优化前
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 5  # 可能太短

# 优化后
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
\`\`\`

**c) 资源限制问题**
- 内存限制导致OOMKilled
- 检查Pod事件中的退出代码

\`\`\`bash
# 查看退出代码
kubectl get pod <pod-name> -o jsonpath='{.status.containerStatuses[0].lastState.terminated.exitCode}'
\`\`\`

#### 3. Pod 无法访问服务

**检查网络：**

\`\`\`bash
# 查看Service端点
kubectl get endpoints

# 检查Pod标签匹配
kubectl get pods --show-labels

# 临时调试Pod
kubectl run -it --rm debug --image=nicolaka/netshoot -- bash

# 在debug Pod中测试
curl http://<service-name>.<namespace>.svc.cluster.local
\`\`\`

**检查网络策略：**
- 是否有NetworkPolicy阻止访问
- 验证Pod标签选择器

### 高级诊断技巧

#### 1. 进入容器调试

\`\`\`bash
# 进入默认容器
kubectl exec -it <pod-name> -- /bin/bash

# 指定容器
kubectl exec -it <pod-name> -c <container-name> -- /bin/sh

# 执行命令
kubectl exec <pod-name> -- ls -la
\`\`\`

#### 2. 使用临时容器（Kubernetes 1.23+）

\`\`\`bash
# 向运行中的Pod添加调试容器
kubectl debug -it <pod-name> --image=nicolaka/netshoot --share-processes
\`\`\`

#### 3. 检查节点问题

\`\`\`bash
# 查看节点状态
kubectl get nodes

# 查看节点详细信息
kubectl describe node <node-name>

# 查看节点事件
kubectl get events --field-selector involvedObject.kind=Node
\`\`\`

### 故障排查流程图

1. **获取状态** → \`kubectl get pods\`
2. **查看事件** → \`kubectl describe pod\`
3. **检查日志** → \`kubectl logs --previous\`
4. **网络诊断** → 使用debug Pod
5. **节点检查** → 验证节点状态

### 预防措施

- 设置合理的资源requests和limits
- 配置适当的探针
- 使用InitContainer检查依赖
- 实施健康检查端点
- 配置PodDisruptionBudget

### 常见问题解答

**Q: ImagePullBackOff 是什么意思？**
A: 表示镜像拉取失败，Kubernetes会在一段时间后重试。常见原因包括镜像不存在、凭据问题或网络问题。

**Q: 如何查看Pod被调度到哪个节点？**
A: 使用 \`kubectl get pods -o wide\` 查看NODE列。

**Q: 容器退出代码137表示什么？**
A: 表示容器被OOM（内存不足）杀掉。需要增加内存limits或优化应用内存使用。`,
          category: 'kubernetes-ops'
        },
        'cicd': {
          title: 'CI/CD 流水线设计模式与最佳实践',
          summary: '深入理解CI/CD流水线的核心设计模式，学习如何构建高效、可靠、可维护的持续集成和持续部署流程。',
          tags: ['CI/CD', '流水线', '设计模式', '最佳实践'],
          difficulty: '中级',
          readTime: '10 分钟',
          content: `## CI/CD 流水线设计模式与最佳实践

### 核心设计原则

#### 1. 快速反馈循环
构建时间应该控制在10分钟以内，超过这个时间会降低开发效率。

**优化策略：**
- 使用缓存机制减少重复下载
- 并行执行独立的测试任务
- 增量构建（只构建变更模块）

#### 2. 一次构建，多次部署
遵循"构建一次，到处运行"原则，避免在不同环境重复构建。

**最佳实践：**
- 使用Docker镜像打包应用
- 将构建产物上传到制品仓库
- 不同环境使用相同的构建产物

#### 3. 流水线即代码
将流水线定义存储在版本控制系统中，与应用代码一起管理。

**优势：**
- 版本历史追踪
- 代码审查流程
- 回滚能力

### 流水线阶段设计

#### 典型阶段结构

\`\`\`yaml
stages:
  - build        # 构建
  - test         # 测试
  - scan         # 安全扫描
  - package      # 打包
  - deploy-dev   # 部署开发环境
  - deploy-staging # 部署预发布
  - deploy-prod  # 部署生产
\`\`\`

#### 阶段详解

**1. Build 阶段**
- 编译代码
- 安装依赖
- 生成构建产物

**2. Test 阶段**
- 单元测试
- 集成测试
- 端到端测试（可选）

**3. Security Scan 阶段**
- 依赖漏洞扫描
- 静态代码分析
- 密钥检测

**4. Package 阶段**
- Docker镜像构建
- Helm Chart打包
- 上传制品仓库

**5. Deploy 阶段**
- 按环境依次部署
- 蓝绿/金丝雀发布
- 自动回滚机制

### 并行与依赖管理

#### 并行执行模式

\`\`\`groovy
// Jenkinsfile 并行示例
stage('Test') {
    parallel {
        stage('Unit Tests') {
            steps {
                sh 'mvn test'
            }
        }
        stage('Integration Tests') {
            steps {
                sh 'mvn verify'
            }
        }
        stage('Security Scan') {
            steps {
                sh 'snyk test'
            }
        }
    }
}
\`\`\`

#### 依赖管理

| 策略 | 适用场景 | 优点 | 缺点 |
|------|----------|------|------|
| 顺序执行 | 强依赖任务 | 简单直观 | 效率低 |
| 并行执行 | 独立任务 | 效率高 | 需要协调 |
| 按需触发 | 条件执行 | 节省资源 | 复杂度高 |

### 发布策略

#### 蓝绿部署
同时运行两个版本，流量在两者间切换。

**优点：**
- 零停机部署
- 瞬间回滚
- 完整测试新版本

**缺点：**
- 资源成本翻倍

#### 金丝雀发布
逐步将流量从旧版本切换到新版本。

**优点：**
- 风险可控
- 观察真实用户反馈
- 问题影响范围小

**缺点：**
- 部署周期较长

#### 滚动更新
逐个替换实例，确保应用始终可用。

**优点：**
- 资源利用率高
- 简单直观

**缺点：**
- 回滚较慢

### 质量门禁

#### 门禁配置示例

\`\`\`groovy
// Jenkinsfile 质量门禁
stage('Quality Gate') {
    steps {
        timeout(time: 1, unit: 'HOURS') {
            waitForQualityGate abortPipeline: true
        }
    }
}
\`\`\`

#### 检查项

| 检查项 | 工具 | 失败条件 |
|--------|------|----------|
| 单元测试覆盖率 | JaCoCo/istanbul | < 80% |
| 代码质量 | SonarQube | 严重违规 |
| 安全漏洞 | Snyk/Trivy | 高危漏洞 |
| 构建产物 | 制品扫描 | 未签名 |

### 常见问题解答

**Q: 如何优化构建时间？**
A: 使用缓存、并行执行、增量构建、优化Docker镜像层。

**Q: 生产环境部署失败如何回滚？**
A: 采用蓝绿或金丝雀发布策略，保留上一版本，快速切换流量。

**Q: 如何处理敏感配置？**
A: 使用密钥管理服务（Vault、Secrets Manager），不要硬编码到代码中。`,
          category: 'cicd-best-practices'
        }
      },
      content: {
        'default': {
          title: '配置与日志分析指南',
          summary: '学习如何有效分析配置文件和日志信息，提取关键问题，理解错误原因，并掌握系统性的问题解决方法。',
          tags: ['配置分析', '日志分析', '故障排查', '运维'],
          difficulty: '中级',
          readTime: '8 分钟',
          content: `## 配置与日志分析指南

### 配置文件分析

#### 常见配置问题

**1. 语法错误**
- YAML缩进问题（非常常见）
- JSON格式错误
- 引号不匹配

**2. 逻辑错误**
- 配置项冲突
- 依赖缺失
- 路径错误

**3. 环境差异**
- 开发/测试/生产环境不一致
- 硬编码本地路径
- 缺少环境变量

#### YAML 配置检查清单

| 检查项 | 说明 |
|--------|------|
| 缩进 | 使用空格，不要用Tab，通常2或4空格 |
| 冒号 | 键值对冒号后必须有空格 |
| 列表 | 列表项使用减号，注意缩进层级 |
| 引号 | 特殊字符需要引号包裹 |
| 锚点 | &和*用于引用，注意定义位置 |

#### 常见 YAML 错误示例

\`\`\`yaml
# ❌ 错误：冒号后无空格
key:value

# ✅ 正确
key: value

# ❌ 错误：缩进不一致
items:
  - item1
   - item2  # 缩进多了一个空格

# ✅ 正确
items:
  - item1
  - item2
\`\`\`

### 日志分析方法

#### 日志级别理解

| 级别 | 含义 | 关注点 |
|------|------|--------|
| ERROR | 错误 | 立即关注，系统故障 |
| WARN | 警告 | 潜在问题，需要监控 |
| INFO | 信息 | 正常操作记录 |
| DEBUG | 调试 | 详细调试信息 |
| TRACE | 追踪 | 最详细的调用追踪 |

#### 错误日志分析步骤

**1. 识别关键错误**
- 查找ERROR和WARN级别
- 提取异常堆栈信息
- 识别根本原因异常

**2. 理解上下文**
- 错误发生的时间
- 相关操作
- 影响范围

**3. 关联分析**
- 同一时间点的其他日志
- 相关服务状态
- 资源使用情况

#### 常见错误模式

\`\`\`
# 连接超时
java.net.SocketTimeoutException: connect timed out
→ 原因：网络问题、服务未启动、防火墙阻止

# 内存溢出
java.lang.OutOfMemoryError: Java heap space
→ 原因：内存限制不足、内存泄漏、大对象处理

# 权限拒绝
java.nio.file.AccessDeniedException: /path/to/file
→ 原因：文件权限不足、运行用户错误

# 依赖缺失
ClassNotFoundException: com.example.SomeClass
→ 原因：jar包缺失、版本不兼容、类路径错误
\`\`\`

### 实战案例分析

#### 案例1：应用启动失败

**错误日志：**
\`\`\`
Caused by: org.postgresql.util.PSQLException: 
  Connection to localhost:5432 refused. 
  Check that the hostname and port are correct 
  and that the postmaster is accepting TCP/IP connections.
\`\`\`

**分析步骤：**
1. 检查PostgreSQL服务是否运行
2. 确认端口是否正确
3. 验证防火墙规则
4. 检查pg_hba.conf配置

**解决方案：**
\`\`\`bash
# 检查服务状态
systemctl status postgresql

# 检查端口监听
netstat -tlnp | grep 5432

# 测试连接
psql -h localhost -U postgres
\`\`\`

#### 案例2：Kubernetes Pod 启动失败

**事件信息：**
\`\`\`
Events:
  Type     Reason     Age   From               Message
  ----     ------     ----  ----               -------
  Normal   Scheduled  30s   default-scheduler  Successfully assigned default/myapp-xxx to node-1
  Warning  Failed     28s   kubelet            Error: failed to start container "myapp": Error response from daemon: OCI runtime create failed: container_linux.go:380: starting container process caused: exec: "/app/start.sh": permission denied
\`\`\`

**分析：**
- 容器启动时执行权限被拒绝
- start.sh脚本没有执行权限

**解决方案：**
\`\`\`dockerfile
# Dockerfile中添加执行权限
RUN chmod +x /app/start.sh

# 或在构建时设置
COPY --chmod=755 start.sh /app/
\`\`\`

### 预防措施

#### 配置管理
- 使用配置验证工具
- 实施配置版本控制
- 建立配置变更审批流程

#### 日志管理
- 统一日志格式
- 集中日志收集
- 设置告警阈值

#### 监控告警
- 关键错误实时告警
- 异常模式自动识别
- 趋势分析预测

### 工具推荐

| 用途 | 工具 |
|------|------|
| 配置验证 | yamllint, jsonlint |
| 日志分析 | grep, awk, jq |
| 日志聚合 | ELK Stack, Loki |
| 配置管理 | Ansible, Terraform |

### 常见问题解答

**Q: 如何快速定位日志中的错误？**
A: 使用grep过滤ERROR/WARN级别，结合时间范围筛选，查找最近的异常堆栈。

**Q: 配置文件缩进有问题怎么办？**
A: 使用yamllint等工具验证，或使用IDE的格式化功能，统一使用2或4空格缩进。

**Q: 如何追踪跨服务的错误？**
A: 实现分布式追踪（如Jaeger、Zipkin），在日志中包含traceId，关联分析相关服务日志。`,
          category: 'custom'
        }
      }
    }

    let result
    if (inputType === 'topic') {
      const inputLower = input.toLowerCase()
      if (inputLower.includes('docker') || inputLower.includes('容器')) {
        result = mockArticles.topic.docker
      } else if (inputLower.includes('kubernetes') || inputLower.includes('k8s') || inputLower.includes('pod')) {
        result = mockArticles.topic.kubernetes
      } else if (inputLower.includes('cicd') || inputLower.includes('ci/cd') || inputLower.includes('流水线')) {
        result = mockArticles.topic.cicd
      } else {
        result = {
          title: input,
          summary: `关于"${input}"的技术知识文章，包含详细的技术分析和最佳实践建议。`,
          tags: ['技术', 'DevOps', '最佳实践'],
          difficulty: '中级',
          readTime: '10 分钟',
          content: `## ${input}

### 概述

本文档详细介绍了${input}的核心概念、实现方法和最佳实践。

### 核心概念

#### 1. 基本原理
理解${input}的工作原理是有效使用它的基础。

#### 2. 关键组件
- 组件A：负责核心功能
- 组件B：处理辅助逻辑
- 组件C：提供接口

### 最佳实践

1. **配置管理**
   - 使用版本控制管理配置
   - 环境变量注入敏感信息
   - 配置分离原则

2. **安全考虑**
   - 最小权限原则
   - 定期更新依赖
   - 安全扫描集成

3. **性能优化**
   - 缓存策略
   - 连接池管理
   - 异步处理

### 常见问题

**Q: 如何解决常见问题？**
A: 首先检查日志，然后验证配置，最后检查依赖服务状态。

**Q: 最佳实践有哪些？**
A: 遵循12要素应用原则，实施自动化测试，建立监控告警体系。`,
          category: 'custom'
        }
      }
    } else {
      result = mockArticles.content.default
    }

    return {
      success: true,
      content: JSON.stringify(result, null, 2)
    }
  }

  /**
   * 检查AI服务是否已配置（非mock模式下是否有API密钥）
   * @returns {boolean} 配置状态
   */
  isConfigured() {
    return !this.#isMockMode && !!this.#apiKey;
  }

  /**
   * 获取当前服务模式
   * @returns {'mock' | 'ai'} 模式类型
   */
  getMode() {
    return this.#isMockMode ? 'mock' : 'ai';
  }
}

// 导出单例实例
export const aiService = new AIService();