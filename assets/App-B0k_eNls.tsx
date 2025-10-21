import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import RoleProtectedRoute from '@/components/RoleProtectedRoute'
import { Toaster } from 'sonner'
import { lazy, Suspense, Component, ErrorInfo, ReactNode, useState, useEffect } from 'react'



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

// 测试页面 - 开发时使用
const ToastTest = lazy(() => import('@/pages/ToastTest'))

// 移动端专用加载组件
const MobileLoadingSpinner = () => {
  const [loadingText, setLoadingText] = useState('正在加载...')
  const [dots, setDots] = useState('')

  useEffect(() => {
    // 简单的点点点动画
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)

    // 移动端加载文本变化
    const textTimer = setTimeout(() => {
      setLoadingText('请稍候')
    }, 3000)

    return () => {
      clearInterval(dotsInterval)
      clearTimeout(textTimer)
    }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black px-4">
      <div className="text-center">
        {/* 简化的加载动画 */}
        <div className="mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-green-400 border-t-transparent mx-auto"></div>
        </div>
        
        {/* 加载文本 */}
        <p className="text-green-300 text-base font-mono">
          {loadingText}{dots}
        </p>
        
        {/* 简化的进度条 */}
        <div className="mt-4 w-32 mx-auto">
          <div className="w-full bg-gray-800 rounded-full h-1">
            <div className="bg-green-400 h-1 rounded-full animate-pulse" style={{ width: '50%' }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 增强的加载组件
const EnhancedLoadingSpinner = () => {
  const [loadingText, setLoadingText] = useState('正在加载...')
  const [showRetry, setShowRetry] = useState(false)
  const [isSlowConnection, setIsSlowConnection] = useState(false)

  useEffect(() => {
    // 检测慢速连接
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    if (connection) {
      const slowTypes = ['slow-2g', '2g', '3g']
      setIsSlowConnection(slowTypes.includes(connection.effectiveType))
    }

    // 加载超时处理
    const timer1 = setTimeout(() => {
      setLoadingText('加载时间较长，请稍候...')
    }, 3000)

    const timer2 = setTimeout(() => {
      setLoadingText('网络较慢，正在努力加载...')
    }, 8000)

    const timer3 = setTimeout(() => {
      setShowRetry(true)
      setLoadingText('加载超时，请检查网络连接')
    }, 15000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [])

  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="text-center">
        {/* 加载动画 */}
        <div className="relative mb-6">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          {isSlowConnection && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">!</span>
            </div>
          )}
        </div>

        {/* 加载文本 */}
        <p className="text-gray-600 mb-4 text-lg">{loadingText}</p>

        {/* 网络状态提示 */}
        {isSlowConnection && (
          <p className="text-orange-600 text-sm mb-4">
            检测到网络连接较慢，加载可能需要更长时间
          </p>
        )}

        {/* 重试按钮 */}
        {showRetry && (
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              重新加载
            </button>
            <p className="text-gray-500 text-sm">
              如果问题持续存在，请检查网络连接或稍后再试
            </p>
          </div>
        )}

        {/* 加载进度指示 */}
        <div className="mt-6 w-64 mx-auto">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
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
    this.setState({ error, errorInfo })
  }

  render() {
    if (this.state.hasError) {
      // 检测移动端
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                       window.innerWidth <= 768

      // 检测错误类型
      const errorMessage = this.state.error?.message || ''
      const isNetworkError = errorMessage.includes('fetch') || 
                            errorMessage.includes('network') ||
                            errorMessage.includes('Failed to import') ||
                            errorMessage.includes('Loading chunk')
      const isMemoryError = errorMessage.includes('memory') || errorMessage.includes('heap')
      
      return (
        <div className={`flex flex-col items-center justify-center min-h-screen px-4 ${
          isMobile ? 'bg-black' : 'bg-gray-50'
        }`}>
          <div className={`max-w-md text-center ${isMobile ? 'text-green-300' : ''}`}>
            <div className="mb-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                isMobile ? 'bg-red-900/50 border border-red-400' : 'bg-red-100'
              }`}>
                <svg className={`w-8 h-8 ${isMobile ? 'text-red-400' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className={`text-xl font-semibold mb-2 ${
                isMobile ? 'text-green-400 font-mono' : 'text-gray-900'
              }`}>
                应用出现错误
              </h2>
              <p className={`mb-6 ${isMobile ? 'text-green-300 font-mono text-sm' : 'text-gray-600'}`}>
                {isNetworkError 
                  ? '网络加载失败，请检查网络连接后重试'
                  : isMemoryError
                  ? '内存不足，请关闭其他应用后重试'
                  : '应用遇到了意外错误，请尝试刷新页面'
                }
              </p>
            </div>

            {/* 网络状态指示 */}
            <div className="mb-6">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                navigator.onLine 
                  ? isMobile ? 'bg-green-900/50 text-green-300 border border-green-400' : 'bg-green-100 text-green-800'
                  : isMobile ? 'bg-red-900/50 text-red-300 border border-red-400' : 'bg-red-100 text-red-800'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  navigator.onLine 
                    ? isMobile ? 'bg-green-400' : 'bg-green-400'
                    : isMobile ? 'bg-red-400' : 'bg-red-400'
                }`}></div>
                {navigator.onLine ? '网络连接正常' : '网络连接断开'}
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className={`w-full px-4 py-2 rounded-lg transition-colors font-medium ${
                  isMobile 
                    ? 'bg-green-600 hover:bg-green-500 text-black font-mono'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                刷新页面
              </button>
              <button
                onClick={() => this.setState({ hasError: false })}
                className={`w-full px-4 py-2 rounded-lg transition-colors font-medium ${
                  isMobile 
                    ? 'border border-green-400 hover:bg-green-900/30 text-green-300 font-mono'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                重试
              </button>
              
              {/* 移动端专用：返回首页按钮 */}
              {isMobile && (
                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full px-4 py-2 border border-gray-600 hover:bg-gray-800/30 text-gray-400 rounded-lg transition-colors font-mono"
                >
                  返回首页
                </button>
              )}
            </div>

            {/* 移动端优化的帮助信息 */}
            <div className={`mt-6 text-xs ${isMobile ? 'text-green-600 font-mono' : 'text-gray-500'}`}>
              <p>如果问题持续存在，请尝试：</p>
              <ul className="mt-2 space-y-1 text-left">
                <li>• 检查网络连接</li>
                <li>• 清除浏览器缓存</li>
                {isMobile && <li>• 关闭其他应用释放内存</li>}
                <li>• 重启浏览器</li>
              </ul>
            </div>

            {/* 开发环境下显示错误详情 */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left">
                <summary className={`cursor-pointer text-sm hover:opacity-80 ${
                  isMobile ? 'text-green-500 font-mono' : 'text-gray-500'
                }`}>
                  查看错误详情 (开发模式)
                </summary>
                <pre className={`mt-2 p-3 rounded text-xs overflow-auto max-h-40 ${
                  isMobile 
                    ? 'bg-gray-900 text-green-300 border border-gray-700 font-mono'
                    : 'bg-gray-100 text-gray-700'
                }`}>
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

// 移动端优化的预加载策略
const preloadComponents = () => {
  // 检测是否为移动设备
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   window.innerWidth <= 768
  
  // 检测网络连接类型
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
  const isSlowConnection = connection && ['slow-2g', '2g', '3g'].includes(connection.effectiveType)
  
  if (isMobile) {
    // 移动端：更保守的预加载策略
    if (!isSlowConnection) {
      // 只在非慢速网络下预加载核心页面
      setTimeout(() => {
        Dashboard.preload?.()
        TimesheetRecord.preload?.()
      }, 3000)
      
      // 进一步延迟预加载其他页面
      setTimeout(() => {
        TimesheetHistory.preload?.()
      }, 8000)
    }
    // 慢速网络下不预加载，完全按需加载
  } else {
    // 桌面端：原有的预加载策略
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        Dashboard.preload?.()
        TimesheetRecord.preload?.()
        TimesheetHistory.preload?.()
      })
    } else {
      setTimeout(() => {
        Dashboard.preload?.()
        TimesheetRecord.preload?.()
        TimesheetHistory.preload?.()
      }, 2000)
    }
    
    // 延迟预加载管理页面
    setTimeout(() => {
      CompanyManagement.preload?.()
      UserManagement.preload?.()
    }, 5000)
  }
}

// 懒加载包装组件 - 移动端优化
const LazyWrapper = ({ children }: { children: React.ReactNode }) => {
  // 检测是否为移动设备
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   window.innerWidth <= 768

  return (
    <Suspense fallback={isMobile ? <MobileLoadingSpinner /> : <EnhancedLoadingSpinner />}>
      <AppErrorBoundary>
        {children}
      </AppErrorBoundary>
    </Suspense>
  )
}


function App() {
  useEffect(() => {
    // 预加载高频组件
    preloadComponents()
  }, [])

  const basename = import.meta.env.DEV ? '' : '/timesheet-management-system'
  
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <Router basename={basename}>
          <Toaster position="top-right" richColors />
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
            <Route path="/toast-test" element={
              <ProtectedRoute>
                <LazyWrapper><ToastTest /></LazyWrapper>
              </ProtectedRoute>
            } />


            
            {/* Catch all route */}
           <Route path="*" element={<Navigate to="/dashboard" replace />} />
         </Routes>
       </Router>
     </AuthProvider>
    </AppErrorBoundary>
  )
}

export default App
