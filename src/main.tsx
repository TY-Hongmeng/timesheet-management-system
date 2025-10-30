import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initMobileOptimization, mobileNetworkManager, mobileErrorRecovery } from './utils/mobileOptimization.ts'
import AppStartupProgress from './components/AppStartupProgress.tsx'
import { smoothProgressManager } from './utils/smoothProgressManager'
import { performanceMonitor } from './utils/performanceMonitor.ts'
import { progressBridge, updateInitProgress } from './utils/progressBridge'

// 应用启动包装器组件
function AppWrapper() {
  const [showProgress, setShowProgress] = useState(true)
  const [appReady, setAppReady] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // 立即开始初始化进度
  useEffect(() => {
    if (isInitialized) return // 防止重复执行
    
    // 步骤0: 页面加载完成，开始初始化 (0-20%)
    console.log('🚀 开始HTML进度条初始化')
    updateInitProgress(0, '页面加载完成，开始初始化...')
    setTimeout(() => {
      updateInitProgress(10, 'React组件正在挂载...')
    }, 50)
    
    setIsInitialized(true)
  }, [])

  useEffect(() => {
    if (!isInitialized) return // 等待初始化完成
    
    const initializeApp = async () => {
      try {
        // 步骤1: 基础初始化 (0-20%)
        updateInitProgress(0, '正在启动应用...')
        await new Promise(resolve => setTimeout(resolve, 150))
        updateInitProgress(10, '加载核心模块...')
        await new Promise(resolve => setTimeout(resolve, 150))
        updateInitProgress(20, '初始化系统配置...')
        
        // 步骤2: 移动端优化初始化 (20-40%)
        updateInitProgress(25, '优化移动端体验...')
        await new Promise(resolve => setTimeout(resolve, 150))
        updateInitProgress(35, '配置响应式布局...')
        await new Promise(resolve => setTimeout(resolve, 150))
        updateInitProgress(40, '加载移动端组件...')
        
        // 步骤3: 网络连接检查 (40-65%)
        updateInitProgress(45, '检查网络连接...')
        await new Promise(resolve => setTimeout(resolve, 150))
        updateInitProgress(55, '验证服务连接...')
        await new Promise(resolve => setTimeout(resolve, 150))
        updateInitProgress(65, '建立数据连接...')
        
        // 步骤4: 进度监控系统启动 (65-85%)
        updateInitProgress(70, '启动进度监控...')
        await new Promise(resolve => setTimeout(resolve, 150))
        updateInitProgress(80, '同步系统状态...')
        await new Promise(resolve => setTimeout(resolve, 150))
        
        // 步骤5: 应用准备就绪 (85-100%)
        updateInitProgress(85, '准备应用界面...')
        await new Promise(resolve => setTimeout(resolve, 150))
        updateInitProgress(95, '应用即将启动')
        await new Promise(resolve => setTimeout(resolve, 150))
        updateInitProgress(100, '启动完成')
        
        console.log('应用初始化完成')
        setAppReady(true)
        
      } catch (error) {
        console.error('应用初始化失败:', error)
        updateInitProgress(100, '初始化失败，正在恢复...')
        // 即使初始化失败，也要确保应用能够启动
        setTimeout(() => {
          setAppReady(true)
          setShowProgress(false)
        }, 2000)
      }
    }

     initializeApp()
   }, [isInitialized])

  // 进度条完成回调
  const handleProgressComplete = () => {
    console.log('进度条完成，准备显示主应用')
    setShowProgress(false)
    setAppReady(true)
  }

  // 如果需要显示React进度条
  if (showProgress) {
    return <AppStartupProgress onComplete={handleProgressComplete} isVisible={true} />
  }

  // 如果应用已准备好，显示主应用
  if (appReady) {
    return <App />
  }

  // 默认返回null，等待初始化完成
  return null
}

// 全局标志，防止重复挂载
let isAppMounted = false

// 移动端应用启动器
const startMobileApp = async () => {
  console.log('🚀 启动移动端工时管理应用...')
  
  if (isAppMounted) {
    console.log('⚠️ 应用已经挂载，跳过重复挂载')
    return
  }
  
  try {
    // 使用网络重试机制启动React应用
    await mobileNetworkManager.retryWithBackoff(async () => {
      return new Promise((resolve, reject) => {
        try {
          const root = ReactDOM.createRoot(document.getElementById('root')!)
          root.render(
            <React.StrictMode>
              <AppWrapper />
            </React.StrictMode>
          )
          
          isAppMounted = true
          
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
