import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ModuleLoadingProvider, useModuleLoading } from '@/contexts/ModuleLoadingContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import RoleProtectedRoute from '@/components/RoleProtectedRoute'
import NetworkErrorHandler from '@/components/NetworkErrorHandler'
import SkeletonLoader from '@/components/SkeletonLoader'
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
const Reports = lazy(() => 
  import('@/pages/Reports').then(module => {
    console.log('📊 Reports页面已加载（包含Excel功能）')
    return module
  })
)
const History = lazy(() => 
  import('@/pages/History').then(module => {
    console.log('📚 History页面已加载')
    return module
  })
)





// 错误边界组件
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  isNetworkError: boolean
  retryCount: number
}

class AppErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  private maxRetries = 3
  private retryTimeout: NodeJS.Timeout | null = null

  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, isNetworkError: false, retryCount: 0 }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // 检查是否为网络相关错误
    const isNetworkError = error.message.includes('fetch') || 
                          error.message.includes('network') || 
                          error.message.includes('Failed to load') ||
                          error.message.includes('Loading chunk') ||
                          error.message.includes('ChunkLoadError') ||
                          error.name === 'NetworkError' ||
                          error.name === 'ChunkLoadError'
    
    return { hasError: true, error, isNetworkError }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('应用错误边界捕获到错误:', error, errorInfo)
    this.setState({ error, errorInfo })

    // 对于网络错误，尝试自动恢复
    if (this.state.isNetworkError && this.state.retryCount < this.maxRetries) {
      this.scheduleAutoRetry()
    }
  }

  scheduleAutoRetry = () => {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
    }

    this.retryTimeout = setTimeout(() => {
      this.handleRetry()
    }, 2000 + this.state.retryCount * 1000) // 递增延迟
  }

  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1

    if (newRetryCount >= this.maxRetries) {
      // 达到最大重试次数，重新加载页面
      window.location.reload()
      return
    }

    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined, 
      retryCount: newRetryCount 
    })
  }

  handleManualRetry = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined, 
      retryCount: 0 
    })
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
    }
  }

  render() {
    if (this.state.hasError) {
      const { isNetworkError, retryCount } = this.state
      
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg p-8 shadow-lg">
              <div className="mb-6">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-red-600 dark:text-red-400 text-2xl">
                    {isNetworkError ? '📡' : '⚠️'}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
                  {isNetworkError ? '网络错误' : '应用错误'}
                </h2>
                <p className="text-red-600 dark:text-red-300">
                  {isNetworkError 
                    ? '网络连接出现问题，正在尝试重新连接...'
                    : '应用遇到了一个错误，请重试'
                  }
                </p>
                {retryCount > 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    重试次数: {retryCount}/{this.maxRetries}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <button
                  onClick={this.handleManualRetry}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors duration-200"
                >
                  {isNetworkError ? '重新连接' : '重试'}
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors duration-200"
                >
                  刷新页面
                </button>
              </div>

              {import.meta.env.DEV && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="text-gray-600 dark:text-gray-400 cursor-pointer text-sm">
                    错误详情 (开发模式)
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono overflow-auto max-h-32">
                    <div className="text-red-600 dark:text-red-400 font-semibold mb-1">
                      {this.state.error.name}: {this.state.error.message}
                    </div>
                    {this.state.errorInfo?.componentStack && (
                      <pre className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// 智能分层预加载策略 - 优化为更保守的策略
const preloadComponents = () => {
  // 检查网络状态
  const connection = (navigator as any).connection
  const isSlowNetwork = connection && ['slow-2g', '2g', '3g'].includes(connection.effectiveType)
  
  // 如果是慢速网络，跳过预加载
  if (isSlowNetwork) {
    console.log('🐌 检测到慢速网络，跳过预加载以优化首屏加载')
    return
  }

  // 第一层：仅在用户空闲时预加载Dashboard（用户登录后的首页）
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      // 类型安全的预加载调用
      if ('preload' in Dashboard && typeof (Dashboard as any).preload === 'function') {
        (Dashboard as any).preload().catch(() => {
          // 静默处理预加载失败
        })
      }
    }, { timeout: 5000 }) // 增加延迟，确保首屏加载完成
  } else {
    setTimeout(() => {
      // 类型安全的预加载调用
      if ('preload' in Dashboard && typeof (Dashboard as any).preload === 'function') {
        (Dashboard as any).preload().catch(() => {
          // 静默处理预加载失败
        })
      }
    }, 5000)
  }

  // 第二层：仅在网络条件良好且用户空闲时预加载工时记录
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      const currentConnection = (navigator as any).connection
      const isGoodConnection = !currentConnection || currentConnection.effectiveType === '4g'
      
      if (isGoodConnection) {
        // 类型安全的预加载调用
        if ('preload' in TimesheetRecord && typeof (TimesheetRecord as any).preload === 'function') {
          (TimesheetRecord as any).preload().catch(() => {
            // 静默处理预加载失败
          })
        }
      }
    }, { timeout: 10000 })
  }
}

// 懒加载包装组件
const LazyWrapper: React.FC<{ children: React.ReactNode; type?: 'page' | 'card' | 'list' | 'table' | 'form' }> = ({ 
  children, 
  type = 'page' 
}) => (
  <Suspense fallback={
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-full max-w-6xl mx-auto">
        <SkeletonLoader type={type} />
      </div>
    </div>
  }>
    {children}
  </Suspense>
)


// 内部App组件
function AppInner() {
  // 在组件挂载后预加载高频组件
  useEffect(() => {
    preloadComponents()
  }, [])

  const basename = import.meta.env.PROD ? '/timesheet-management-system' : ''
  
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
              <LazyWrapper type="card"><Dashboard /></LazyWrapper>
            </ProtectedRoute>
          } />
          <Route path="/company-management" element={
            <ProtectedRoute>
              <LazyWrapper type="table"><CompanyManagement /></LazyWrapper>
            </ProtectedRoute>
          } />
          <Route path="/user-management" element={
            <ProtectedRoute>
              <LazyWrapper type="table"><UserManagement /></LazyWrapper>
            </ProtectedRoute>
          } />
          <Route path="/role-permissions" element={
            <ProtectedRoute>
              <LazyWrapper type="list"><RoleList /></LazyWrapper>
            </ProtectedRoute>
          } />

          <Route path="/role-permissions/edit/:id" element={
            <ProtectedRoute>
              <LazyWrapper type="form"><RoleEdit /></LazyWrapper>
            </ProtectedRoute>
          } />
          <Route path="/role-permissions/create" element={
            <ProtectedRoute>
              <LazyWrapper type="form"><RoleCreate /></LazyWrapper>
            </ProtectedRoute>
          } />
          <Route path="/process-management" element={
            <ProtectedRoute>
              <LazyWrapper type="table"><ProcessManagement /></LazyWrapper>
            </ProtectedRoute>
          } />
          <Route path="/timesheet-record" element={
            <ProtectedRoute>
              <LazyWrapper type="form"><TimesheetRecord /></LazyWrapper>
            </ProtectedRoute>
          } />
          <Route path="/timesheet-history" element={
            <ProtectedRoute>
              <LazyWrapper type="list"><TimesheetHistory /></LazyWrapper>
            </ProtectedRoute>
          } />
          <Route path="/supervisor-approval" element={
            <RoleProtectedRoute allowedRoles={['班长', 'supervisor', '超级管理员', 'super_admin']}>
              <LazyWrapper type="table"><SupervisorApproval /></LazyWrapper>
            </RoleProtectedRoute>
          } />
          <Route path="/section-chief-approval" element={
            <RoleProtectedRoute allowedRoles={['段长', 'section_chief', '超级管理员', 'super_admin']}>
              <LazyWrapper type="table"><SectionChiefApproval /></LazyWrapper>
            </RoleProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute>
              <LazyWrapper type="table"><Reports /></LazyWrapper>
            </ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute>
              <LazyWrapper type="list"><History /></LazyWrapper>
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
  return (
    <AppErrorBoundary>
      <NetworkErrorHandler>
        <AuthProvider>
          <ModuleLoadingProvider>
            <AppInner />
            {/* Toast 通知 */}
            <Toaster position="top-right" richColors />
          </ModuleLoadingProvider>
        </AuthProvider>
      </NetworkErrorHandler>
    </AppErrorBoundary>
  )
}

export default App
