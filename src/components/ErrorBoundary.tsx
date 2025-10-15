import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Wifi } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
}

export default class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  handleRetry = () => {
    if (this.state.retryCount >= this.maxRetries) {
      window.location.reload()
      return
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }))
  }

  handleGoHome = () => {
    window.location.href = '/timesheet-management-system/'
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const isNetworkError = this.state.error?.message?.includes('fetch') || 
                            this.state.error?.message?.includes('network') ||
                            this.state.error?.message?.includes('Failed to import')

      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                  {isNetworkError ? (
                    <Wifi className="h-8 w-8 text-red-600" />
                  ) : (
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  )}
                </div>
                
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {isNetworkError ? '网络连接问题' : '应用出现错误'}
                </h2>
                
                <p className="text-sm text-gray-600 mb-6">
                  {isNetworkError 
                    ? '无法加载应用资源，请检查网络连接后重试'
                    : '应用运行时出现了错误，我们正在努力修复'
                  }
                </p>

                {/* 错误详情（开发环境） */}
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mb-6 text-left">
                    <summary className="text-sm text-gray-500 cursor-pointer mb-2">
                      错误详情 (开发模式)
                    </summary>
                    <div className="bg-gray-100 p-3 rounded text-xs font-mono text-gray-700 overflow-auto max-h-32">
                      <div className="mb-2">
                        <strong>错误:</strong> {this.state.error.message}
                      </div>
                      {this.state.errorInfo && (
                        <div>
                          <strong>堆栈:</strong>
                          <pre className="whitespace-pre-wrap">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}

                {/* 网络状态指示 */}
                <div className="mb-6">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    navigator.onLine 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      navigator.onLine ? 'bg-green-400' : 'bg-red-400'
                    }`}></div>
                    {navigator.onLine ? '网络连接正常' : '网络连接断开'}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="space-y-3">
                  {this.state.retryCount < this.maxRetries ? (
                    <button
                      onClick={this.handleRetry}
                      className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      重试 ({this.state.retryCount + 1}/{this.maxRetries})
                    </button>
                  ) : (
                    <button
                      onClick={this.handleReload}
                      className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      刷新页面
                    </button>
                  )}
                  
                  <button
                    onClick={this.handleGoHome}
                    className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    返回首页
                  </button>
                </div>

                {/* 帮助信息 */}
                <div className="mt-6 text-xs text-gray-500">
                  <p>如果问题持续存在，请尝试：</p>
                  <ul className="mt-2 space-y-1 text-left">
                    <li>• 检查网络连接</li>
                    <li>• 清除浏览器缓存</li>
                    <li>• 使用其他浏览器</li>
                    <li>• 联系技术支持</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// 函数式错误边界 Hook (React 18+)
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error('Error caught by error handler:', error, errorInfo)
    
    // 可以在这里添加错误上报逻辑
    if (process.env.NODE_ENV === 'production') {
      // 上报错误到监控服务
      // reportError(error, errorInfo)
    }
  }
}

// 异步错误处理组件
export function AsyncErrorBoundary({ children }: { children: ReactNode }) {
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason)
      setError(new Error(event.reason))
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  if (error) {
    return (
      <ErrorBoundary>
        <div className="text-center p-8">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">异步操作失败</h3>
          <p className="text-sm text-gray-600 mb-4">{error.message}</p>
          <button
            onClick={() => setError(null)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            重试
          </button>
        </div>
      </ErrorBoundary>
    )
  }

  return <>{children}</>
}