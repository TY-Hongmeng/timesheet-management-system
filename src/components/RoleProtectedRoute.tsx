import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface RoleProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: string[]
  fallbackPath?: string
}

export default function RoleProtectedRoute({ 
  children, 
  allowedRoles, 
  fallbackPath = '/dashboard' 
}: RoleProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // 显示加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-green-400 text-xl animate-pulse font-mono">
          加载中...
        </div>
      </div>
    )
  }

  // 未登录用户重定向到登录页
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 检查用户角色权限
  const userRole = user.role?.name
  const hasPermission = allowedRoles.some(role => 
    userRole === role || 
    userRole?.toLowerCase() === role.toLowerCase()
  )
  
  // 调试信息
  console.log('🔍 RoleProtectedRoute 权限检查:', {
    userRole,
    allowedRoles,
    hasPermission,
    currentPath: location.pathname
  });

  // 无权限用户重定向到指定页面
  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-red-400 mb-2 font-mono">访问被拒绝</h1>
          <p className="text-green-300 mb-6 font-mono">
            您没有权限访问此页面。需要角色: {allowedRoles.join(', ')}
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-green-600 hover:bg-green-500 text-black font-bold rounded font-mono transition-colors"
          >
            返回上一页
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}