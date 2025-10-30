import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initMobileOptimization, mobileNetworkManager, mobileErrorRecovery } from './utils/mobileOptimization.ts'
import AppStartupProgress from './components/AppStartupProgress.tsx'
import { performanceMonitor } from './utils/performanceMonitor.ts'

// 应用启动包装器组件
function AppLauncher() {
  const [showProgress, setShowProgress] = useState(true)
  const [appReady, setAppReady] = useState(false)

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 通知HTML进度条React应用已准备就绪
        window.dispatchEvent(new CustomEvent('react-app-ready'))
        
        // 等待HTML进度条完成并消失
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // 初始化移动端优化
        await initMobileOptimization()
        
        // 模拟应用准备过程
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        setAppReady(true)
        setShowProgress(false)
      } catch (error) {
        console.error('应用初始化失败:', error)
        setAppReady(true)
        setShowProgress(false)
      }
    }

    initializeApp()
  }, [])

  // 检查HTML进度条是否还存在
  useEffect(() => {
    const checkInstantProgress = () => {
      const instantProgress = document.getElementById('instant-progress')
      if (!instantProgress) {
        // HTML进度条已消失，可以显示React进度条
        setShowProgress(false)
      }
    }

    const interval = setInterval(checkInstantProgress, 100)
    return () => clearInterval(interval)
  }, [])

  if (showProgress) {
    return <AppStartupProgress />
  }

  return <App />
}

// 移动端应用启动器
const startMobileApp = async () => {
  console.log('🚀 启动移动端工时管理应用...')
  
  try {
    // 使用网络重试机制启动React应用
    await mobileNetworkManager.retryWithBackoff(async () => {
      return new Promise((resolve, reject) => {
        try {
          const root = ReactDOM.createRoot(document.getElementById('root')!)
          root.render(
            <React.StrictMode>
              <AppLauncher />
            </React.StrictMode>
          )
          
          // 等待应用挂载
          setTimeout(() => {
            if (document.querySelector('#root > *')) {
              resolve(true)
            } else {
              reject(new Error('React应用挂载失败'))
            }
          }, 1000)
        } catch (error) {
          reject(error)
        }
      })
    }, 'React应用启动')
    
  } catch (error) {
    console.error('❌ 移动端应用启动失败:', error)
    mobileErrorRecovery.handleError(error as Error, '应用启动')
    
    // 显示错误页面
    const root = document.getElementById('root')
    if (root) {
      root.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          padding: 20px;
          text-align: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        ">
          <div style="
            background: rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
            max-width: 400px;
            width: 100%;
          ">
            <h2 style="margin: 0 0 15px 0; font-size: 24px;">应用启动失败</h2>
            <p style="margin: 0 0 20px 0; opacity: 0.9; line-height: 1.5;">
              工时管理系统在移动端启动时遇到问题，正在尝试恢复...
            </p>
            <button onclick="window.location.reload()" style="
              background: #4CAF50;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              font-size: 16px;
              cursor: pointer;
              transition: background 0.3s;
            " onmouseover="this.style.background='#45a049'" onmouseout="this.style.background='#4CAF50'">
              重新加载
            </button>
          </div>
        </div>
      `
    }
  }
}

// 启动应用
startMobileApp()
