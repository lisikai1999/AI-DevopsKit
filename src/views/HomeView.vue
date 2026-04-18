<template>
  <div class="home-view">
    <el-container>
      <!-- Hero Section -->
      <el-header class="hero-section">
        <div class="hero-content">
          <h1 class="hero-title">
            <el-icon class="hero-icon"><Cpu /></el-icon>
            AI DevOps 助手
          </h1>
          <p class="hero-subtitle">轻量、开源的 AI 辅助 DevOps 工具，支持多平台 CI/CD 配置生成 + Dockerfile 分析</p>
          
          <div class="hero-actions">
            <el-button type="primary" size="large" @click="$router.push('/cicd')">
              <el-icon><Tools /></el-icon>
              开始生成 CI/CD 配置
            </el-button>
            <el-button size="large" @click="$router.push('/dockerfile')">
              <el-icon><Document /></el-icon>
              分析 Dockerfile
            </el-button>
          </div>
        </div>
      </el-header>
      
      <!-- Features Section -->
      <el-main class="features-section">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-card class="feature-card" shadow="hover">
              <div class="feature-icon">
                <el-icon size="48"><Tools /></el-icon>
              </div>
              <h3>多平台 CI/CD 配置生成</h3>
              <p>支持 Jenkins、GitLab CI、GitHub Actions、Azure DevOps 等主流平台</p>
              <el-button type="text" @click="$router.push('/cicd')">
                立即体验 →
              </el-button>
            </el-card>
          </el-col>
          
          <el-col :span="8">
            <el-card class="feature-card" shadow="hover">
              <div class="feature-icon">
                <el-icon size="48"><Document /></el-icon>
              </div>
              <h3>Dockerfile AI 分析</h3>
              <p>粘贴代码 → 检测漏洞 + 可视化结果 + 优化建议</p>
              <el-button type="text" @click="$router.push('/dockerfile')">
                立即体验 →
              </el-button>
            </el-card>
          </el-col>
          
          <el-col :span="8">
            <el-card class="feature-card" shadow="hover">
              <div class="feature-icon">
                <el-icon size="48"><Clock /></el-icon>
              </div>
              <h3>本地历史记录</h3>
              <p>自动保存最近操作，支持复用和编辑</p>
              <el-button type="text" @click="$router.push('/history')">
                查看历史 →
              </el-button>
            </el-card>
          </el-col>
        </el-row>
        
        <!-- Stats Section -->
        <el-row :gutter="20" style="margin-top: 40px;">
          <el-col :span="24">
            <el-card class="stats-card">
              <div class="stats-content">
                <div class="stat-item">
                  <div class="stat-number">{{ stats.cicdConfigs }}</div>
                  <div class="stat-label">生成的 CI/CD 配置</div>
                </div>
                <div class="stat-item">
                  <div class="stat-number">{{ stats.dockerfiles }}</div>
                  <div class="stat-label">分析的 Dockerfile</div>
                </div>
                <div class="stat-item">
                  <div class="stat-number">{{ stats.platforms }}</div>
                  <div class="stat-label">支持的平台</div>
                </div>
                <div class="stat-item">
                  <div class="stat-number">{{ stats.history }}</div>
                  <div class="stat-label">历史记录</div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
        
        <!-- Quick Start Section -->
        <el-row :gutter="20" style="margin-top: 40px;">
          <el-col :span="24">
            <el-card class="quickstart-card">
              <h3>快速开始</h3>
              <el-steps :active="1" finish-status="success">
                <el-step title="选择平台" description="选择 Jenkins、GitLab、GitHub 或 Azure"></el-step>
                <el-step title="配置参数" description="填写相关参数或粘贴代码"></el-step>
                <el-step title="AI 处理" description="AI 自动处理并生成结果"></el-step>
                <el-step title="查看结果" description="查看生成的代码或分析报告"></el-step>
              </el-steps>
            </el-card>
          </el-col>
        </el-row>
        
        <!-- Mode Status -->
        <el-row :gutter="20" style="margin-top: 40px;">
          <el-col :span="24">
            <el-card class="mode-card">
              <div class="mode-content">
                <div class="mode-info">
                  <h4>当前模式: {{ aiMode === 'mock' ? '模拟模式' : 'AI 模式' }}</h4>
                  <p>{{ aiMode === 'mock' ? '无需 API 密钥，开箱即用' : '已连接 AI 服务，提供智能生成和分析' }}</p>
                </div>
                <el-tag :type="aiMode === 'mock' ? 'info' : 'success'">
                  {{ aiMode === 'mock' ? 'Mock Mode' : 'AI Mode' }}
                </el-tag>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Cpu, Tools, Document, Clock } from '@element-plus/icons-vue'
import { useAppStore } from '@/stores/app'
import { aiService } from '@/services/ai-service'

const appStore = useAppStore()

const stats = ref({
  cicdConfigs: 0,
  dockerfiles: 0,
  platforms: 4,
  history: 0
})

const aiMode = computed(() => aiService.getMode())

const loadStats = () => {
  const history = appStore.history
  
  stats.value = {
    cicdConfigs: history.filter(item => item.type === 'cicd' || item.type === 'jenkinsfile').length,
    dockerfiles: history.filter(item => item.type === 'dockerfile').length,
    platforms: 4,
    history: history.length
  }
}

onMounted(() => {
  appStore.loadHistory()
  loadStats()
})
</script>

<style scoped>
  .home-view {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .hero-section {
    height: 70vh;
    min-height: 500px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    padding: 0 20px;
  }

  .hero-content {
    text-align: center;
    color: white;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
    width: 100%;
  }

  .hero-title {
    font-size: 4rem;
    font-weight: bold;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
  }

  .hero-icon {
    font-size: 3.5rem;
  }

  .hero-subtitle {
    font-size: 1.8rem;
    margin-bottom: 40px;
    opacity: 0.9;
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.4;
  }

  .hero-actions {
    display: flex;
    gap: 20px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .features-section {
    padding: 80px 20px;
    background-color: #f5f7fa;
    border-radius: 20px 20px 0 0;
    margin-top: -40px;
    position: relative;
    z-index: 1;
    max-width: 1400px;
    margin-left: auto;
    margin-right: auto;
  }

  .feature-card {
    text-align: center;
    padding: 30px;
    height: 100%;
    transition: transform 0.3s;
  }

  .feature-card:hover {
    transform: translateY(-10px);
  }

  .feature-icon {
    color: #409eff;
    margin-bottom: 20px;
  }

  .feature-card h3 {
    margin: 20px 0 10px 0;
    color: #303133;
    font-size: 1.5rem;
  }

  .feature-card p {
    color: #606266;
    margin-bottom: 20px;
    line-height: 1.6;
  }

  .stats-card {
    background: linear-gradient(135deg, #409eff 0%, #36cfc9 100%);
    color: white;
  }

  .stats-content {
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 20px 0;
  }

  .stat-item {
    text-align: center;
  }

  .stat-number {
    font-size: 2.5rem;
    font-weight: bold;
    margin-bottom: 5px;
  }

  .stat-label {
    font-size: 1rem;
    opacity: 0.9;
  }

  .quickstart-card {
    padding: 30px;
  }

  .quickstart-card h3 {
    margin-bottom: 30px;
    color: #303133;
    text-align: center;
  }

  .mode-card {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: white;
  }

  .mode-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
  }

  .mode-info h4 {
    margin: 0 0 10px 0;
    font-size: 1.2rem;
  }

  .mode-info p {
    margin: 0;
    opacity: 0.9;
  }

  /* 大屏幕适配 */
  @media (min-width: 1400px) {
    .features-section {
      padding: 80px 40px;
    }
    
    .hero-content {
      padding: 0 40px;
    }
  }

  /* 平板适配 */
  @media (max-width: 1024px) {
    .features-section {
      padding: 60px 20px;
    }
    
    .hero-content {
      padding: 0 20px;
    }
    
    .hero-title {
      font-size: 3rem;
    }
    
    .hero-subtitle {
      font-size: 1.5rem;
    }
  }

  /* 手机适配 */
  @media (max-width: 768px) {
    .hero-section {
      height: 60vh;
    }
    
    .hero-content {
      padding: 0 15px;
    }
    
    .hero-title {
      font-size: 2.5rem;
      flex-direction: column;
      gap: 10px;
    }
    
    .hero-icon {
      font-size: 2.5rem;
    }
    
    .hero-subtitle {
      font-size: 1.2rem;
      margin-bottom: 30px;
    }
    
    .features-section {
      padding: 40px 15px;
      margin-top: -20px;
    }
    
    .feature-card {
      margin-bottom: 20px;
    }
    
    .stats-content {
      flex-direction: column;
      gap: 20px;
    }
    
    .mode-content {
      flex-direction: column;
      text-align: center;
      gap: 15px;
    }
  }

  /* 小屏幕手机 */
  @media (max-width: 480px) {
    .hero-title {
      font-size: 2rem;
    }
    
    .hero-subtitle {
      font-size: 1rem;
    }
    
    .hero-actions {
      flex-direction: column;
      align-items: center;
    }
    
    .features-section {
      padding: 30px 15px;
    }
  }

  /* 暗色模式样式 */
  :global(html.dark) {
    & .home-view {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    }

    & .features-section {
      background-color: var(--el-bg-color-page);
    }

    & .feature-card h3 {
      color: var(--el-text-color-primary);
    }

    & .feature-card p {
      color: var(--el-text-color-regular);
    }

    & .quickstart-card h3 {
      color: var(--el-text-color-primary);
    }
  }
</style>
