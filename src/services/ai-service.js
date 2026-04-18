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