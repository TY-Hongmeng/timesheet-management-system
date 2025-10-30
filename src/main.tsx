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
