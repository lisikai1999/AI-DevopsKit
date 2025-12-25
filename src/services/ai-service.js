import axios from 'axios'

/**
 * AI服务的响应结构
 * @typedef {Object} AIResponse
 * @property {string} content - 响应内容
 * @property {boolean} success - 请求是否成功
 * @property {string} [error] - 错误信息（可选）
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
   * @returns {Promise<AIResponse>} AI响应结果
   */
  async generateJenkinsfile(template, parameters) {
    if (this.#isMockMode) {
      return this.#mockJenkinsfileResponse(template, parameters);
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

只返回 Jenkinsfile 内容，不要包含其他解释。`;

      const response = await this.#callAI(prompt);
      return response;
    } catch (error) {
      return {
        success: false,
        error: '生成 Jenkinsfile 失败',
        content: ''
      };
    }
  }

  /**
   * 分析Dockerfile
   * @param {string} content - Dockerfile内容
   * @returns {Promise<AIResponse>} AI响应结果
   */
  async analyzeDockerfile(content) {
    if (this.#isMockMode) {
      return this.#mockDockerfileAnalysis(content);
    }

    try {
      const prompt = `请分析以下 Dockerfile 的安全性、性能和最佳实践：

${content}

请提供详细的分析报告，包括：
1. 安全性问题（如特权用户、明文密码等）
2. 性能优化建议（如镜像层数、缓存策略等）
3. 最佳实践建议
4. 优化后的 Dockerfile

请以 JSON 格式返回结果，包含以下字段：
{
  "issues": [{"line": 行号, "type": "error|warning|info", "message": "问题描述", "suggestion": "建议"}],
  "suggestions": ["建议1", "建议2"],
  "score": 评分(0-100),
  "optimizedContent": "优化后的Dockerfile内容"
}`;

      const response = await this.#callAI(prompt);
      
      // 尝试解析 JSON 响应
      try {
        const parsed = JSON.parse(response.content);
        return {
          success: true,
          content: JSON.stringify(parsed, null, 2)
        };
      } catch {
        // 如果解析失败，返回原始响应包装后的结果
        return {
          success: true,
          content: JSON.stringify({
            issues: [],
            suggestions: [response.content],
            score: 80,
            optimizedContent: content
          }, null, 2)
        };
      }
    } catch (error) {
      return {
        success: false,
        error: '分析 Dockerfile 失败',
        content: ''
      };
    }
  }

  /**
   * 调用AI接口的核心方法（私有）
   * @param {string} prompt - 提示词
   * @returns {Promise<AIResponse>} AI响应结果
   * @throws {Error} 当API密钥未配置或无响应时抛出错误
   */
  async #callAI(prompt) {
    if (!this.#apiKey) {
      throw new Error('API key not configured');
    }
    

    const response = await axios.post(
      '/api/chat/v1/chat/completions',
      {
        model: this.#model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的 DevOps 工程师，精通 Jenkins 和 Docker 技术。请提供专业、实用的建议和代码。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${this.#apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.choices && response.data.choices.length > 0) {
      return {
        success: true,
        content: response.data.choices[0].message.content
      };
    }

    throw new Error('No response from AI service');
  }

  /**
   * 模拟Jenkinsfile生成的响应（私有）
   * @param {string} template - 模板类型
   * @param {Record<string, any>} parameters - 生成参数
   * @returns {AIResponse} 模拟响应结果
   */
  #mockJenkinsfileResponse(template, parameters) {
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
    const content = responses[template] || responses.basic;
    
    return {
      success: true,
      content
    };
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
      return this.#mockBillingAnalysis(csvContent);
    }

    try {
      const prompt = `请分析以下 AWS 账单 CSV（CSV 第一行为表头，包含资源/服务和费用等字段）：\n\n${csvContent}\n\n请返回 JSON 格式：{ "summary": {"totalCost": number, "period": "YYYY-MM"}, "topResources": [{"resource": "ec2", "cost": number, "percent": number}], "suggestions": ["..."], "chartData": {"categories": ["s1"], "values": [100]} }`;

      const response = await this.#callAI(prompt);
      try {
        const parsed = JSON.parse(response.content);
        return { success: true, content: JSON.stringify(parsed, null, 2) };
      } catch {
        return { success: true, content: JSON.stringify({ summary: { totalCost: 0, period: '' }, topResources: [], suggestions: [response.content], chartData: { categories: [], values: [] } }, null, 2) };
      }
    } catch (error) {
      return { success: false, error: '分析账单失败', content: '' };
    }
  }

  /**
   * 翻译 & 解释技术日志（英文日志 -> 中文翻译 + 故障原因 + 修复建议）
   * @param {string} logContent - 英文日志
   * @returns {Promise<AIResponse>} AI 响应，content 为 JSON 字符串：{ translation, explanation, fixes }
   */
  async translateLog(logContent) {
    if (this.#isMockMode) {
      return this.#mockLogTranslation(logContent);
    }

    try {
      const prompt = `以下是英文技术日志，请翻译成中文并解释可能原因及给出具体修复建议：\n\n${logContent}\n\n请以 JSON 格式返回：{ "translation": "...", "explanation": "...", "fixes": ["..."] }`;

      const response = await this.#callAI(prompt);
      
      const jsonStr = response.content
            .replace(/^```json\s*/, '') // 移除开头的 ```json（含换行/空格）
            .replace(/\s*```$/, '');    // 移除结尾的 ```（含换行/空格）

      try {
        const parsed = JSON.parse(jsonStr);
        return { success: true, content: JSON.stringify(parsed, null, 2) };
      } catch {
        return { success: true, content: JSON.stringify({ translation: jsonStr['translation'], explanation: jsonStr['explanation'], fixes: jsonStr['fixes'] }, null, 2) };
      }
    } catch (error) {
      console.log(error)
      return { success: false, error: '日志翻译失败', content: '' };
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