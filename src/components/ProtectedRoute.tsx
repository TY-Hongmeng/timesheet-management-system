import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
}

export default function ProtectedRoute({ children, requireAuth = true }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth()
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

  if (requireAuth && !isAuthenticated()) {
    // 保存当前路径，登录后重定向
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!requireAuth && isAuthenticated()) {
    // 已登录用户访问登录/注册页面，重定向到首页
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}