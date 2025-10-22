import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import RoleProtectedRoute from '@/components/RoleProtectedRoute'
import PerformanceMonitor from '@/components/PerformanceMonitor'
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



// 简化的加载组件
const EnhancedLoadingSpinner = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md mx-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">工时管理系统</h3>
        <p className="text-gray-600">正在加载...</p>
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

// 智能分层预加载策略
const preloadComponents = () => {
  // 优化预加载策略 - 快速预加载核心组件，提升用户体验
  // 第一层：立即预加载Dashboard和TimesheetRecord（最常用的组件）
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      Dashboard.preload?.()
      TimesheetRecord.preload?.()
    }, { timeout: 500 }) // 快速预加载核心组件
  } else {
    setTimeout(() => {
      Dashboard.preload?.()
      TimesheetRecord.preload?.()
    }, 500)
  }

  // 第二层：预加载常用管理组件
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      TimesheetHistory.preload?.()
      CompanyManagement.preload?.()
      UserManagement.preload?.()
    }, { timeout: 1500 })
  } else {
    setTimeout(() => {
      TimesheetHistory.preload?.()
      CompanyManagement.preload?.()
      UserManagement.preload?.()
    }, 1500)
  }

  // 第三层：预加载其他功能组件
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      ProcessManagement.preload?.()
      SupervisorApproval.preload?.()
      SectionChiefApproval.preload?.()
    }, { timeout: 3000 })
  } else {
    setTimeout(() => {
      ProcessManagement.preload?.()
      SupervisorApproval.preload?.()
      SectionChiefApproval.preload?.()
    }, 3000)
  }

  // 第四层：延迟预加载重型组件（仅在网络条件良好时）
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      const connection = navigator.connection
      const isGoodConnection = !connection || connection.effectiveType === '4g'
      
      if (isGoodConnection) {
        Reports.preload?.()
        History.preload?.()
      }
    }, { timeout: 5000 })
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


function App() {
  // 在组件挂载后预加载高频组件
  useEffect(() => {
    preloadComponents()
  }, [])

  const basename = import.meta.env.DEV ? '' : '/timesheet-management-system'
  
  return (
    <AppErrorBoundary>
      <AuthProvider>
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
      
      {/* 性能监控组件 - 仅在开发环境显示 */}
      {import.meta.env.DEV && <PerformanceMonitor />}
      
      {/* Toast 通知 */}
      <Toaster position="top-right" richColors />
    </AuthProvider>
  </AppErrorBoundary>
  )
}

export default App
