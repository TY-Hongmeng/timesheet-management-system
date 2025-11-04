import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { SimpleStartupProgress } from './components/SimpleStartupProgress'
import './index.css'

// 简单的应用包装器
const AppWrapper: React.FC = () => {
  const [showProgress, setShowProgress] = useState(true)

  const handleProgressComplete = () => {
    setShowProgress(false)
  }

  // 显示进度条或主应用
  return showProgress ? 
    <SimpleStartupProgress onComplete={handleProgressComplete} /> : 
    <App />
}

// 启动应用
const rootElement = document.getElementById('root')
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(<AppWrapper />)
}

// 注册 Service Worker，适配 GitHub Pages 的 base 路径
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const baseUrl = (import.meta as any).env?.BASE_URL || '/'
    const swUrl = `${baseUrl}sw.js`

    navigator.serviceWorker.register(swUrl, { scope: baseUrl }).then(registration => {
      console.log('[SW] Registered:', swUrl, 'scope:', baseUrl)

      // 监听更新事件
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // 新版本已安装，通知跳过等待并刷新
              registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
              console.log('[SW] New content available; refreshing...')
              setTimeout(() => window.location.reload(), 500)
            } else {
              console.log('[SW] Content cached for offline use.')
            }
          }
        })
      })

      // 监听来自 SW 的更新消息
      navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
        if (event.data?.type === 'SW_UPDATED') {
          console.log('[SW] Updated to', event.data.version)
          // 主动刷新获取最新资源
          setTimeout(() => window.location.reload(), 300)
        }
      })
    }).catch(err => {
      console.error('[SW] Registration failed:', err)
    })
  })
}
