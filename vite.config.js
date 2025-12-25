import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    // 配置开发代理
    proxy: {
      '/api/chat': {
        target: 'https://spark-api-open.xf-yun.com/',
        changeOrigin: true, // 开启跨域
        rewrite: (path) => path.replace(/^\/api\/chat/, ''), // 重写路径
        headers: {
          // 按需添加讯飞接口需要的headers（认证信息建议还是放后端）
        },
        // 配置代理请求的日志
        configure: (proxy, options) => {
          // 监听代理请求发送前的事件
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(`[Vite Proxy] 转发请求 → 目标地址: ${options.target}${proxyReq.path} | 请求方法: ${req.method}`);
          });
          // 监听代理响应事件（可选）
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log(`[Vite Proxy] 响应状态码: ${proxyRes.statusCode} | 原始请求路径: ${req.originalUrl}`);
          });
          // 监听代理错误（可选，排查失败原因）
          proxy.on('error', (err, req, res) => {
            console.error(`[Vite Proxy] 代理错误: ${err.message} | 请求路径: ${req.originalUrl}`);
          });
        }
      }
    }
  }
})
