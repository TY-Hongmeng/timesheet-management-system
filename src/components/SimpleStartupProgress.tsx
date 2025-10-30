import React, { useEffect } from 'react'

interface SimpleStartupProgressProps {
  onComplete?: () => void
}

export const SimpleStartupProgress: React.FC<SimpleStartupProgressProps> = ({ onComplete }) => {
  useEffect(() => {
    // 简单的启动步骤 - 真实反馈React应用启动过程
    const steps = [
      { progress: 30, status: '初始化React应用...', delay: 100 },
      { progress: 50, status: '加载路由系统...', delay: 150 },
      { progress: 70, status: '检查用户认证...', delay: 150 },
      { progress: 90, status: '准备界面...', delay: 150 },
      { progress: 100, status: '启动完成', delay: 200 }
    ]

    let currentStep = 0

    const runStep = () => {
      if (currentStep < steps.length) {
        const step = steps[currentStep]
        
        // 更新HTML进度条
        if (window.loadingProgress) {
          window.loadingProgress.update(step.progress, step.status)
        }

        if (step.progress === 100) {
          // 完成后隐藏进度条并调用回调
          setTimeout(() => {
            if (window.loadingProgress) {
              window.loadingProgress.hide()
            }
            setTimeout(() => {
              onComplete?.()
            }, 300)
          }, step.delay)
        } else {
          setTimeout(() => {
            currentStep++
            runStep()
          }, step.delay)
        }
      }
    }

    runStep()
  }, [onComplete])

  // 这个组件不渲染任何内容，只是控制HTML进度条
  return null
}

// 声明全局类型
declare global {
  interface Window {
    loadingProgress?: {
      update: (progress: number, status: string) => void
      hide: () => void
    }
  }
}