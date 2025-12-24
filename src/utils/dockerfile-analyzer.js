export class DockerfileAnalyzer {
  constructor(content) {
    this.dockerfileContent = content
  }

  analyze() {
    const issues = this.detectIssues()
    const suggestions = this.generateSuggestions(issues)
    const score = this.calculateScore(issues)
    const optimizedContent = this.generateOptimizedContent(issues)

    return {
      issues,
      suggestions,
      score,
      optimizedContent
    }
  }

  detectIssues() {
    const issues = []
    const lines = this.dockerfileContent.split('\n')

    lines.forEach((line, index) => {
      const lineNum = index + 1
      const trimmedLine = line.trim().toUpperCase()

      if (trimmedLine.startsWith('FROM')) {
        if (!trimmedLine.includes(':') || trimmedLine.endsWith(':LATEST')) {
          issues.push({
            line: lineNum,
            type: 'warning',
            message: '建议使用具体版本号而非 latest',
            suggestion: '使用具体版本号如 FROM node:16.14.0 替代 FROM node:latest'
          })
        }
      }

      if (trimmedLine.includes('PASS') || trimmedLine.includes('PASSWORD')) {
        issues.push({
          line: lineNum,
          type: 'error',
          message: '检测到可能的密码硬编码',
          suggestion: '使用环境变量或 secrets 来传递敏感信息'
        })
      }

      if (trimmedLine === 'USER ROOT' || (trimmedLine.includes('USER') && trimmedLine.includes('ROOT'))) {
        issues.push({
          line: lineNum,
          type: 'warning',
          message: '不建议使用 root 用户运行应用',
          suggestion: '创建专用用户并切换到该用户运行应用'
        })
      }

      if (trimmedLine.startsWith('ADD ') && !trimmedLine.includes('HTTP') && !trimmedLine.includes('HTTPS')) {
        issues.push({
          line: lineNum,
          type: 'info',
          message: '建议使用 COPY 替代 ADD',
          suggestion: '对于本地文件复制，使用 COPY 更安全和明确'
        })
      }

      if (trimmedLine.startsWith('RUN ') && trimmedLine.includes('&&')) {
        const commands = trimmedLine.split('&&').length
        if (commands > 5) {
          issues.push({
            line: lineNum,
            type: 'info',
            message: 'RUN 命令过于复杂，建议拆分',
            suggestion: '将复杂的 RUN 命令拆分为多个层以提高缓存效率'
          })
        }
      }

      const hasHealthCheck = lines.some(l => l.trim().toUpperCase().startsWith('HEALTHCHECK'))
      if (!hasHealthCheck && index === lines.length - 1) {
        issues.push({
          line: lineNum,
          type: 'info',
          message: '建议添加 HEALTHCHECK 指令',
          suggestion: '添加 HEALTHCHECK 以监控容器运行状态'
        })
      }
    })

    return issues
  }

  generateSuggestions(issues) {
    const suggestions = new Set()

    const errorCount = issues.filter(i => i.type === 'error').length
    const warningCount = issues.filter(i => i.type === 'warning').length

    if (errorCount > 0) {
      suggestions.add('存在安全性问题，建议立即修复')
    }

    if (warningCount > 0) {
      suggestions.add('存在一些潜在问题，建议优化')
    }

    suggestions.add('使用多阶段构建减少最终镜像大小')
    suggestions.add('将不常变化的依赖项放在前面，提高构建缓存效率')
    suggestions.add('使用 .dockerignore 排除不必要的文件')

    return Array.from(suggestions)
  }

  calculateScore(issues) {
    let score = 100
    
    issues.forEach(issue => {
      switch (issue.type) {
        case 'error':
          score -= 15
          break
        case 'warning':
          score -= 8
          break
        case 'info':
          score -= 3
          break
      }
    })

    return Math.max(0, score)
  }

  generateOptimizedContent(issues) {
    let optimized = this.dockerfileContent

    const optimizations = []

    if (!optimized.toLowerCase().includes('as builder') && optimized.includes('node')) {
      optimizations.push('# 考虑使用多阶段构建来减少最终镜像大小')
      optimizations.push('# FROM node:16.14.0 as builder')
      optimizations.push('# WORKDIR /app')
      optimizations.push('# COPY package*.json ./')
      optimizations.push('# RUN npm install')
      optimizations.push('# COPY . .')
      optimizations.push('# RUN npm run build')
      optimizations.push('#')
      optimizations.push('# FROM node:16.14.0-alpine')
      optimizations.push('# WORKDIR /app')
      optimizations.push('# COPY --from=builder /app/dist ./dist')
      optimizations.push('# COPY --from=builder /app/node_modules ./node_modules')
    }

    if (optimizations.length > 0) {
      optimized = '\n# 优化建议:\n' + optimizations.join('\n') + '\n\n# 原始 Dockerfile:\n' + optimized
    }

    return optimized
  }
}

export const sampleDockerfiles = {
  node: `FROM node:latest

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]`,

  python: `FROM python:3.9

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["python", "app.py"]`,

  nginx: `FROM nginx:latest

COPY . /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`
}