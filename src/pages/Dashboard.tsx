import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Clock, BarChart3, Settings, Users, Building2, CheckCircle, Shield, Key, User, Building, Cog, Activity, LogOut, LucideIcon, Loader2 } from 'lucide-react'
import { useModuleLoading } from '../contexts/ModuleLoadingContext'
import { useAuth } from '../contexts/AuthContext'
import { filterAccessibleModules, getAllModules, isSuperAdmin, DashboardModule } from '../utils/permissions'
import { formatTime } from '../utils/format'

// 图标映射
const iconMap: Record<string, LucideIcon> = {
  Clock,
  BarChart3,
  Settings,
  Users,
  Building2,
  CheckCircle,
  Shield,
  Key,
  User,
  Building,
  Cog,
  Activity
}

// 模块卡片组件
interface ModuleCardProps {
  module: DashboardModule & { isPlaceholder?: boolean }
  index: number
}

function ModuleCard({ module, index }: ModuleCardProps) {
  const { setModuleLoading } = useModuleLoading()

  const handleClick = () => {
    if (module.isPlaceholder) return
    setModuleLoading(module.id, true)
  }

  if (module.isPlaceholder) {
    return (
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6 flex flex-col items-center justify-center min-h-[200px]">
        <div className="w-12 h-12 bg-gray-700/50 rounded-lg mb-4 animate-pulse"></div>
        <div className="h-4 bg-gray-700/50 rounded w-24 mb-2 animate-pulse"></div>
        <div className="h-3 bg-gray-700/50 rounded w-32 animate-pulse"></div>
      </div>
    )
  }

  const IconComponent = iconMap[module.icon] || Clock

  return (
    <Link
      to={module.path}
      onClick={handleClick}
      className="group bg-gray-800/50 hover:bg-gray-800/70 border border-gray-700/50 hover:border-green-500/50 rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/10 flex flex-col items-center justify-center min-h-[200px] relative overflow-hidden"
    >
      {/* 背景光效 */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-500/30 transition-colors duration-300">
          <IconComponent className="w-6 h-6 text-green-400" />
        </div>
        
        <h3 className="text-lg font-semibold text-white mb-2 text-center group-hover:text-green-400 transition-colors duration-300">
          {module.name}
        </h3>
        
        <p className="text-sm text-gray-400 text-center leading-relaxed">
          {module.description}
        </p>
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [accessibleModules, setAccessibleModules] = useState<DashboardModule[]>([])
  const { user, logout } = useAuth()
  const timeUpdateRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        
        // 模拟加载延迟
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // 获取用户可访问的模块
        const allModules = getAllModules()
        const userAccessibleModules = await filterAccessibleModules(allModules, user)
        
        setAccessibleModules(userAccessibleModules)
      } catch (error) {
        console.error('获取仪表板数据失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user])

  useEffect(() => {
    // 更新时间
    const updateTime = () => {
      setCurrentTime(new Date())
    }

    updateTime()
    timeUpdateRef.current = setInterval(updateTime, 1000)

    return () => {
      if (timeUpdateRef.current) {
        clearInterval(timeUpdateRef.current)
      }
    }
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('退出登录失败:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-green-400 mb-2">工时管理系统</h2>
          <div className="w-64 bg-gray-700 rounded-full h-2 mb-4">
            <div className="bg-green-500 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
          </div>
          <p className="text-green-400 text-lg font-medium">100%</p>
          <p className="text-gray-400 mt-2">欢迎使用工时管理系统</p>
        </div>
      </div>
    )
  }

  // 创建网格布局，确保至少显示6个位置
  const gridItems = [...accessibleModules]
  while (gridItems.length < 6) {
    gridItems.push({
      id: `placeholder-${gridItems.length}`,
      name: '',
      description: '',
      path: '',
      icon: 'Clock',
      isPlaceholder: true
    } as DashboardModule & { isPlaceholder: boolean })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* 头部信息栏 */}
      <div className="bg-gray-800/50 border-b border-gray-700/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold text-green-400">工时管理系统</h1>
            <div className="text-gray-300">
              <span className="text-sm">当前时间：</span>
              <span className="font-mono text-green-400">{formatTime(currentTime)}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-400">欢迎回来</div>
              <div className="font-semibold text-white flex items-center">
                <User className="w-4 h-4 mr-1" />
                {user?.username || '用户'}
                {isSuperAdmin(user) && (
                  <span className="ml-2 px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">
                    超级管理员
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors duration-200 border border-red-500/30"
            >
              <LogOut className="w-4 h-4" />
              <span>退出</span>
            </button>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 模块展示区 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">系统模块</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gridItems.map((module, index) => (
              <ModuleCard
                key={module.id}
                module={module}
                index={index}
              />
            ))}
          </div>
        </div>

        {/* 无权限提示 */}
        {accessibleModules.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-yellow-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">暂无可用模块</h3>
            <p className="text-gray-400">请联系管理员分配相应的权限</p>
          </div>
        )}
      </div>
    </div>
  )
}