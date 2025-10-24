import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ModuleLoadingProvider, useModuleLoading } from '@/contexts/ModuleLoadingContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import RoleProtectedRoute from '@/components/RoleProtectedRoute'
import { Toaster } from 'sonner'
import { lazy, Suspense, Component, ErrorInfo, ReactNode, useState, useEffect } from 'react'
import { performanceMonitor, startTimer, endTimer } from '@/utils/performanceMonitor'
import { errorLogger, logError, logLoadingError } from '@/utils/errorLogger'



// 关键页面直接导入（登录相关）
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import ResetPassword from '@/pages/ResetPassword'

// 其他页面懒加载 - 按使用频率和大小分组
// 高频页面 - 预加载
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const TimesheetRecord = lazy(() => import('@/pages/TimesheetRecord'))
const TimesheetHistory = lazy(() => import('@/pages/TimesheetHistory'))

// 管理页面 - 按需加载
const CompanyManagement = lazy(() => import('@/pages/CompanyManagement'))
const UserManagement = lazy(() => import('@/pages/UserManagement'))
const ProcessManagement = lazy(() => import('@/pages/ProcessManagement'))

// 角色权限相关 - 按需加载
const RoleList = lazy(() => import('@/pages/RoleList'))
const RoleEdit = lazy(() => import('@/pages/RoleEdit'))
const RoleCreate = lazy(() => import('@/pages/RoleCreate'))

// 审批相关 - 按需加载
const SupervisorApproval = lazy(() => import('@/pages/SupervisorApproval'))
const SectionChiefApproval = lazy(() => import('@/pages/SectionChiefApproval'))

// 报表相关 - 延迟加载（包含大型 Excel 库）
const Reports = lazy(() => import('@/pages/Reports'))
const History = lazy(() => import('@/pages/History'))



// 增强的加载组件 - 支持错误处理和重试
const EnhancedLoadingSpinner = () => {
  const [loadingText, setLoadingText] = useState('正在加载...')
  const [showRetry, setShowRetry] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  
  useEffect(() => {
    // 启动加载监控
    startTimer('组件加载时间')
    
    // 动态加载文本
    const texts = [
      '正在加载...',
      '正在初始化组件...',
      '正在建立连接...',
      '即将完成...'
    ]
    
    let index = 0
    const interval = setInterval(() => {
      index = (index + 1) % texts.length
      setLoadingText(texts[index])
    }, 2000)
    
    // 超时检测
    const timeout = setTimeout(() => {
      setShowRetry(true)
      setLoadingText('加载时间较长，可能网络较慢')
      
      // 记录加载超时
      logLoadingError('组件加载超时', new Error('组件加载超过10秒'), retryCount)
      endTimer('组件加载时间')
    }, 10000)
    
    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
      endTimer('组件加载时间')
    }
  }, [])
  
  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    setShowRetry(false)
    setLoadingText('正在重试加载...')
    
    // 记录重试操作
    logLoadingError('用户手动重试', new Error('用户点击重试按钮'), retryCount)
    
    // 刷新页面重试
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black">
      <div className="text-center p-8 max-w-md mx-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
        <h3 className="text-lg font-semibold text-green-400 mb-2 font-mono">工时管理系统</h3>
        <p className="text-green-300 font-mono mb-4">{loadingText}</p>
        
        {showRetry && (
          <div className="space-y-3">
            <p className="text-yellow-400 text-sm font-mono">
              {retryCount > 0 ? `重试次数: ${retryCount}` : '网络连接可能较慢'}
            </p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-mono text-sm rounded transition-colors"
            >
              重新加载
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// 错误边界组件
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

class AppErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('应用错误边界捕获到错误:', error, errorInfo)
    
    // 记录错误到错误日志系统
    logError({
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      context: '应用错误边界',
      url: window.location.href
    })
    
    // 生成错误报告
    errorLogger.generateErrorReport()
    
    this.setState({ error, errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
          <div className="max-w-md text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">应用出现错误</h2>
              <p className="text-gray-600 mb-6">
                抱歉，应用遇到了一个意外错误。请尝试刷新页面或稍后再试。
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                刷新页面
              </button>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                重试
              </button>
            </div>

            {/* 开发环境下显示错误详情 */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  查看错误详情
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// 深度优化的预加载策略 - 根据网络和设备性能动态调整
const preloadComponents = () => {
  console.log('🚀 启动深度优化预加载策略...')
  
  // 启动性能监控
  startTimer('预加载总耗时')
  let loadedModules = 0
  
  // 检测网络和设备性能
  const connection = (navigator as any).connection
  const isSlowNetwork = connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')
  const isLowEndDevice = navigator.hardwareConcurrency <= 2
  const isLowPerformance = isSlowNetwork || isLowEndDevice
  
  console.log(`📊 性能检测: 网络=${connection?.effectiveType || 'unknown'}, CPU核心=${navigator.hardwareConcurrency}, 低性能模式=${isLowPerformance}`)
  
  if (isLowPerformance) {
    console.log('⚡ 检测到低性能环境，采用保守预加载策略')
    
    // 低性能环境：只预加载最关键的组件
     setTimeout(() => {
       startTimer('Dashboard预加载')
       import('@/pages/Dashboard').then(() => {
         endTimer('Dashboard预加载')
         loadedModules++
         console.log('✅ Dashboard 预加载完成')
       }).catch(err => {
         endTimer('Dashboard预加载')
         logLoadingError('Dashboard预加载', err)
         console.warn('⚠️ Dashboard 预加载失败:', err)
       })
     }, 100)
     
     setTimeout(() => {
       startTimer('TimesheetRecord预加载')
       import('@/pages/TimesheetRecord').then(() => {
         endTimer('TimesheetRecord预加载')
         loadedModules++
         console.log('✅ TimesheetRecord 预加载完成')
         
         // 低性能环境预加载完成
         endTimer('预加载总耗时')
         performanceMonitor.recordMetric('低性能预加载模块数', loadedModules)
       }).catch(err => {
         endTimer('TimesheetRecord预加载')
         logLoadingError('TimesheetRecord预加载', err)
         console.warn('⚠️ TimesheetRecord 预加载失败:', err)
       })
     }, 300)
    
  } else {
    console.log('🚀 高性能环境，采用积极分层预加载策略')
    
    // 第一层：核心功能（立即开始）
     setTimeout(() => {
       startTimer('第一层预加载')
       Promise.all([
         import('@/pages/Dashboard').then(() => console.log('✅ Dashboard 预加载完成')),
         import('@/pages/TimesheetRecord').then(() => console.log('✅ TimesheetRecord 预加载完成'))
       ]).then(() => {
         endTimer('第一层预加载')
         loadedModules += 2
         console.log('🎯 第一层预加载完成')
       }).catch(err => {
         endTimer('第一层预加载')
         logLoadingError('第一层预加载', err)
         console.warn('⚠️ 第一层预加载部分失败:', err)
       })
     }, 50)
     
     // 第二层：常用功能
     setTimeout(() => {
       startTimer('第二层预加载')
       Promise.all([
         import('@/pages/TimesheetHistory').then(() => console.log('✅ TimesheetHistory 预加载完成')),
         import('@/pages/CompanyManagement').then(() => console.log('✅ CompanyManagement 预加载完成')),
         import('@/pages/UserManagement').then(() => console.log('✅ UserManagement 预加载完成'))
       ]).then(() => {
         endTimer('第二层预加载')
         loadedModules += 3
         console.log('🎯 第二层预加载完成')
       }).catch(err => {
         endTimer('第二层预加载')
         logLoadingError('第二层预加载', err)
         console.warn('⚠️ 第二层预加载部分失败:', err)
       })
     }, 200)
     
     // 第三层：管理功能
     setTimeout(() => {
       startTimer('第三层预加载')
       Promise.all([
         import('@/pages/ProcessManagement').then(() => console.log('✅ ProcessManagement 预加载完成')),
         import('@/pages/RoleList').then(() => console.log('✅ RoleList 预加载完成'))
       ]).then(() => {
         endTimer('第三层预加载')
         loadedModules += 2
         console.log('🎯 第三层预加载完成')
       }).catch(err => {
         endTimer('第三层预加载')
         logLoadingError('第三层预加载', err)
         console.warn('⚠️ 第三层预加载部分失败:', err)
       })
     }, 500)
     
     // 第四层：审批功能
     setTimeout(() => {
       startTimer('第四层预加载')
       Promise.all([
         import('@/pages/SupervisorApproval').then(() => console.log('✅ SupervisorApproval 预加载完成')),
         import('@/pages/SectionChiefApproval').then(() => console.log('✅ SectionChiefApproval 预加载完成'))
       ]).then(() => {
         endTimer('第四层预加载')
         loadedModules += 2
         console.log('🎯 第四层预加载完成')
       }).catch(err => {
         endTimer('第四层预加载')
         logLoadingError('第四层预加载', err)
         console.warn('⚠️ 第四层预加载部分失败:', err)
       })
     }, 800)
     
     // 第五层：报表功能（最后加载，包含大型库）
     setTimeout(() => {
       startTimer('第五层预加载')
       Promise.all([
         import('@/pages/Reports').then(() => console.log('✅ Reports 预加载完成')),
         import('@/pages/History').then(() => console.log('✅ History 预加载完成'))
       ]).then(() => {
         endTimer('第五层预加载')
         loadedModules += 2
         console.log('🎯 第五层预加载完成')
         
         // 输出总体性能报告
         const totalTime = endTimer('预加载总耗时')
         performanceMonitor.recordMetric('高性能预加载模块数', loadedModules)
         console.log(`📊 预加载完成统计: 模块数=${loadedModules}, 总耗时=${Math.round(totalTime)}ms`)
         
         // 生成性能报告
         performanceMonitor.generatePerformanceReport()
       }).catch(err => {
         endTimer('第五层预加载')
         logLoadingError('第五层预加载', err)
         console.warn('⚠️ 第五层预加载部分失败:', err)
       })
     }, 1200)
  }
}

// 懒加载包装组件 - 移动端优化
const LazyWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<EnhancedLoadingSpinner />}>
      <AppErrorBoundary>
        {children}
      </AppErrorBoundary>
    </Suspense>
  )
}


// 内部App组件
function AppInner() {
  // 在组件挂载后预加载高频组件
  useEffect(() => {
    preloadComponents()
  }, [])

  const basename = import.meta.env.DEV ? '' : '/timesheet-management-system'
  
  return (
    <Router basename={basename}>
          <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <LazyWrapper><Dashboard /></LazyWrapper>
            </ProtectedRoute>
          } />
          <Route path="/company-management" element={
            <ProtectedRoute>
              <LazyWrapper><CompanyManagement /></LazyWrapper>
            </ProtectedRoute>
          } />
          <Route path="/user-management" element={
            <ProtectedRoute>
              <LazyWrapper><UserManagement /></LazyWrapper>
            </ProtectedRoute>
          } />
          <Route path="/role-permissions" element={
            <ProtectedRoute>
              <LazyWrapper><RoleList /></LazyWrapper>
            </ProtectedRoute>
          } />

          <Route path="/role-permissions/edit/:id" element={
            <ProtectedRoute>
              <LazyWrapper><RoleEdit /></LazyWrapper>
            </ProtectedRoute>
          } />
          <Route path="/role-permissions/create" element={
            <ProtectedRoute>
              <LazyWrapper><RoleCreate /></LazyWrapper>
            </ProtectedRoute>
          } />
          <Route path="/process-management" element={
            <ProtectedRoute>
              <LazyWrapper><ProcessManagement /></LazyWrapper>
            </ProtectedRoute>
          } />
          <Route path="/timesheet-record" element={
            <ProtectedRoute>
              <LazyWrapper><TimesheetRecord /></LazyWrapper>
            </ProtectedRoute>
          } />
          <Route path="/timesheet-history" element={
            <ProtectedRoute>
              <LazyWrapper><TimesheetHistory /></LazyWrapper>
            </ProtectedRoute>
          } />
          <Route path="/supervisor-approval" element={
            <RoleProtectedRoute allowedRoles={['班长', 'supervisor', '超级管理员', 'super_admin']}>
              <LazyWrapper><SupervisorApproval /></LazyWrapper>
            </RoleProtectedRoute>
          } />
          <Route path="/section-chief-approval" element={
            <RoleProtectedRoute allowedRoles={['段长', 'section_chief', '超级管理员', 'super_admin']}>
              <LazyWrapper><SectionChiefApproval /></LazyWrapper>
            </RoleProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute>
              <LazyWrapper><Reports /></LazyWrapper>
            </ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute>
              <LazyWrapper><History /></LazyWrapper>
            </ProtectedRoute>
          } />



          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
  )
}

// 主App组件
function App() {
  useEffect(() => {
    // 启动应用监控
    startTimer('应用启动时间')
    console.log('🚀 应用开始启动...')
    
    // 记录应用启动信息
    performanceMonitor.recordMetric('应用启动时间戳', Date.now())
    
    // 启动预加载
    preloadComponents()
    
    // 检查是否有严重错误
    if (errorLogger.hasCriticalErrors()) {
      console.warn('⚠️ 检测到严重错误，可能影响应用性能')
      errorLogger.generateErrorReport()
    }
    
    // 应用启动完成
    setTimeout(() => {
      endTimer('应用启动时间')
      console.log('✅ 应用启动完成')
    }, 100)
    
    return () => {
      endTimer('应用启动时间')
    }
  }, [])

  return (
    <AppErrorBoundary>
      <AuthProvider>
        <ModuleLoadingProvider>
          <AppInner />
          {/* Toast 通知 */}
          <Toaster position="top-right" richColors />
        </ModuleLoadingProvider>
      </AuthProvider>
    </AppErrorBoundary>
  )
}

export default App
