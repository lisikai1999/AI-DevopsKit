<template>
  <el-container class="app-container">
    <!-- 顶部导航 -->
    <el-header class="app-header">
      <div class="header-content">
        <div class="logo-section">
          <el-icon size="32" color="#409eff"><Cpu /></el-icon>
          <h1 class="app-title">AI DevOps 助手</h1>
        </div>
        
        <el-menu
          :default-active="$route.path"
          mode="horizontal"
          :router="true"
          class="nav-menu"
        >
          <el-menu-item index="/">
            <el-icon><House /></el-icon>
            <span>首页</span>
          </el-menu-item>
          <el-menu-item index="/jenkinsfile">
            <el-icon><Tools /></el-icon>
            <span>Jenkinsfile 生成器</span>
          </el-menu-item>
          <el-menu-item index="/dockerfile">
            <el-icon><Document /></el-icon>
            <span>Dockerfile 分析器</span>
          </el-menu-item>
          <el-menu-item index="/billing">
            <el-icon><TrendCharts /></el-icon>
            <span>账单分析</span>
          </el-menu-item>
          <el-menu-item index="/logs">
            <el-icon><Failed /></el-icon>
            <span>日志翻译</span>
          </el-menu-item>
          <el-menu-item index="/history">
            <el-icon><Clock /></el-icon>
            <span>历史记录</span>
          </el-menu-item>
          

        </el-menu>
        
        <div class="header-actions">
          <el-tag :type="aiMode === 'mock' ? 'info' : 'success'" size="small">
            {{ aiMode === 'mock' ? 'Mock 模式' : 'AI 模式' }}
          </el-tag>
          <el-button
            type="text"
            @click="toggleDarkMode"
            circle
            :title="isDarkMode ? '切换到亮色模式' : '切换到暗色模式'"
          >
            <el-icon><component :is="isDarkMode ? Sunny : Moon" /></el-icon>
          </el-button>
        </div>
      </div>
    </el-header>
    
    <!-- 主要内容区域 -->
    <el-main class="app-main">
      <RouterView />
    </el-main>
    
    <!-- 底部 -->
    <el-footer class="app-footer">
      <div class="footer-content">
        <p>&copy; 2025 AI DevOps 助手 - 让 DevOps 更高效</p>
        <div class="footer-links">
          <el-link href="https://github.com/lisikai1999/AI-DevopsKit" target="_blank" type="primary">GitHub</el-link>
          <el-link href="#" type="primary">文档</el-link>
          <el-link href="#" type="primary">反馈</el-link>
        </div>
      </div>
    </el-footer>
  </el-container>
</template>

<script setup>
  import { computed, watch, onMounted } from 'vue'
  import { Cpu, House, Tools, Document, Clock, Moon, Sunny, Failed, TrendCharts } from '@element-plus/icons-vue'
  import { useAppStore } from '@/stores/app'
  import { aiService } from '@/services/ai-service'

  const appStore = useAppStore()

  const aiMode = computed(() => aiService.getMode())
  const isDarkMode = computed(() => appStore.isDarkMode)

  const toggleDarkMode = () => {
    appStore.toggleDarkMode()
  }

  const applyDarkMode = (isDark) => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  watch(isDarkMode, (newValue) => {
    applyDarkMode(newValue)
    localStorage.setItem('ai-devops-dark-mode', newValue)
  })

  onMounted(() => {
    const savedDarkMode = localStorage.getItem('ai-devops-dark-mode')
    if (savedDarkMode !== null) {
      const isDark = savedDarkMode === 'true'
      if (isDark !== appStore.isDarkMode) {
        appStore.toggleDarkMode()
      }
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        appStore.toggleDarkMode()
      }
    }
    applyDarkMode(appStore.isDarkMode)
  })
</script>

<style scoped>
  .app-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .app-header {
    background: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 0;
    height: 60px;
    position: sticky;
    top: 0;
    z-index: 1000;
  }

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    padding: 0 20px;
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
  }

  .logo-section {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .app-title {
    margin: 0;
    font-size: 1.5rem;
    color: #303133;
    font-weight: 600;
  }

  .nav-menu {
    flex: 1;
    margin: 0 40px;
    border-bottom: none;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .app-main {
    flex: 1;
    padding: 0;
    background-color: #f5f7fa;
  }

  .app-footer {
    background: #2c3e50;
    color: white;
    height: 60px;
    padding: 0;
  }

  .footer-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    padding: 0 20px;
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
  }

  .footer-content p {
    margin: 0;
    font-size: 14px;
  }

  .footer-links {
    display: flex;
    gap: 20px;
  }

  .footer-links :deep(.el-link) {
    color: #409eff;
    font-size: 14px;
  }

  /* 大屏幕适配 */
  @media (min-width: 1400px) {
    .header-content, .footer-content {
      padding: 0 40px;
    }
  }

  /* 平板适配 */
  @media (max-width: 1024px) {
    .header-content, .footer-content {
      padding: 0 15px;
    }
    
    .nav-menu {
      margin: 0 20px;
    }
  }

  /* 手机适配 */
  @media (max-width: 768px) {
    .app-header {
      height: auto;
      position: relative;
    }
    
    .header-content {
      flex-direction: column;
      height: auto;
      padding: 15px;
      gap: 15px;
    }
    
    .nav-menu {
      margin: 0;
      width: 100%;
      justify-content: center;
    }
    
    .header-actions {
      justify-content: center;
    }
    
    .footer-content {
      flex-direction: column;
      text-align: center;
      gap: 10px;
      padding: 15px;
    }
    
    .app-title {
      font-size: 1.2rem;
      text-align: center;
    }
    
    .logo-section {
      justify-content: center;
    }
  }

  /* Element Plus 菜单样式优化 */
  :deep(.el-menu--horizontal > .el-menu-item) {
    border-bottom: 2px solid transparent;
    height: 60px;
    line-height: 60px;
  }

  :deep(.el-menu--horizontal > .el-menu-item.is-active) {
    border-bottom-color: #409eff;
    background-color: #f0f9ff;
  }

  :deep(.el-menu--horizontal > .el-menu-item:hover) {
    background-color: #f5f7fa;
  }

  /* 暗色模式样式 */
  :global(html.dark) {
    & .app-container {
      background-color: var(--el-bg-color-page);
    }

    & .app-header {
      background-color: var(--el-bg-color);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
    }

    & .app-title {
      color: var(--el-text-color-primary);
    }

    & .app-main {
      background-color: var(--el-bg-color-page);
    }

    & .app-footer {
      background-color: var(--el-bg-color);
      color: var(--el-text-color-primary);
    }

    & :deep(.el-menu--horizontal) {
      background-color: var(--el-bg-color);
    }

    & :deep(.el-menu--horizontal > .el-menu-item) {
      color: var(--el-text-color-regular);
    }

    & :deep(.el-menu--horizontal > .el-menu-item.is-active) {
      background-color: var(--el-fill-color-light);
      color: var(--el-color-primary);
    }

    & :deep(.el-menu--horizontal > .el-menu-item:hover) {
      background-color: var(--el-fill-color-light);
    }

    & :deep(.el-link) {
      color: var(--el-color-primary);
    }
  }
</style>
