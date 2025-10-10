import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Clock, BarChart3, Settings, Users, Building2, CheckCircle, Shield, Key, User, Building, Cog, Activity, LogOut, LucideIcon } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent
} from '@dnd-kit/core'
import { 
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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

// 可排序的模块组件
interface SortableModuleProps {
  module: DashboardModule & { isPlaceholder?: boolean }
  index: number
  isDragMode: boolean
}

function SortableModule({ module, index, isDragMode }: SortableModuleProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const IconComponent = iconMap[module.icon]
  const isPlaceholder = module.isPlaceholder

  // 处理点击事件
  const handleClick = (e: React.MouseEvent) => {
    // 如果正在拖拽模式，阻止点击
    if (isDragMode) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  // 移除占位符显示逻辑
  if (isPlaceholder) {
    return null
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`transition-all duration-200 ${
        isDragging 
          ? 'transform rotate-3 scale-105 shadow-2xl shadow-green-500/20 opacity-50 z-50' 
          : ''
      } ${
        isDragMode ? 'cursor-grabbing' : ''
      }`}
    >
      <div 
        {...attributes}
        {...listeners}
        className={`${
          isDragMode 
            ? 'cursor-grabbing' 
            : 'cursor-pointer'
        }`}
      >
        <Link 
          to={module.path} 
          className="group block"
          onClick={handleClick}
        >
          <div className={`relative bg-gray-800 rounded-xl border border-gray-700 hover:border-green-400/60 transition-all duration-300 hover:transform hover:scale-[1.02] hover:shadow-xl hover:shadow-green-500/10 min-h-[140px] backdrop-blur-sm ${
            isDragMode ? 'pointer-events-none' : ''
          }`}>
            {/* 标题栏 */}
            <div className="bg-gray-800 border-b border-green-600 p-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center group-hover:from-green-400 group-hover:to-green-500 transition-all duration-300">
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-white font-bold text-lg group-hover:text-green-100 transition-colors">{module.name}</h3>
                </div>
                {/* 拖拽指示器 */}
                <div className={`transition-opacity ${
                  isDragMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}>
                  <div className="flex flex-col gap-1">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 内容区域 */}
            <div className="p-6 flex flex-col items-center justify-center">
              {/* 模块描述 */}
              <p className="text-gray-400 text-sm text-center leading-relaxed group-hover:text-gray-300 transition-colors">{module.description}</p>
            </div>
            
            {/* 拖拽状态指示 */}
            {isDragMode && (
              <div className="absolute inset-0 bg-green-500/10 rounded-xl border-2 border-green-400/50 flex items-center justify-center backdrop-blur-sm">
                <div className="text-green-400 font-mono text-sm font-bold">拖拽模式</div>
              </div>
            )}
            
            {/* 悬停效果光晕 */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-green-500/0 via-green-500/0 to-green-500/0 group-hover:from-green-500/5 group-hover:via-transparent group-hover:to-green-500/5 transition-all duration-300"></div>
          </div>
        </Link>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, logout } = useAuth()

  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [accessibleModules, setAccessibleModules] = useState<DashboardModule[]>([])
  const [orderedModules, setOrderedModules] = useState<DashboardModule[]>([])
  const [isDragMode, setIsDragMode] = useState(false)

  useEffect(() => {
    fetchDashboardData()
    
    // 更新时间
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // 权限检查和模块过滤
  useEffect(() => {
    if (user) {
      let modules: DashboardModule[] = []
      // 超级管理员可以访问所有模块
      if (isSuperAdmin(user.role.name)) {
        modules = getAllModules()
      } else {
        // 其他角色根据权限过滤模块
        const userPermissions = user.permissions || []
        modules = filterAccessibleModules(userPermissions)
      }
      setAccessibleModules(modules)
      
      // 从localStorage加载用户自定义排序
      const savedOrder = localStorage.getItem(`dashboard-order-${user.id}`)
      if (savedOrder) {
        try {
          const orderIds = JSON.parse(savedOrder)
          const orderedModules = orderIds.map((id: string) => 
            modules.find(m => m.id === id)
          ).filter(Boolean)
          // 添加新模块（如果有的话）
          const newModules = modules.filter(m => !orderIds.includes(m.id))
          setOrderedModules([...orderedModules, ...newModules])
        } catch {
          setOrderedModules(modules)
        }
      } else {
        setOrderedModules(modules)
      }
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {


    } catch (error: any) {
      console.error('获取数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error: any) {
      // 即使退出失败也清除本地状态
    }
  }

  // 拖拽传感器配置 - 优化拖拽灵敏度
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 需要移动5px才开始拖拽
        delay: 100,  // 100ms延迟
        tolerance: 3 // 容差
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 处理拖拽开始
  const handleDragStart = (event: DragStartEvent) => {
    setIsDragMode(true)
  }

  // 处理拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setIsDragMode(false)

    if (!over || !user || active.id === over.id) {
      return
    }

    const oldIndex = orderedModules.findIndex(item => item.id === active.id)
    const newIndex = orderedModules.findIndex(item => item.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      const newItems = arrayMove(orderedModules, oldIndex, newIndex)
      setOrderedModules(newItems)
      
      // 保存到localStorage
      const orderIds = newItems.map(item => item.id)
      localStorage.setItem(`dashboard-order-${user.id}`, JSON.stringify(orderIds))
    }
  }

  // 只返回实际的模块，不添加占位符
  const getDisplayModules = () => {
    return orderedModules
  }





  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-green-400 text-xl animate-pulse font-mono">
          加载中...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-green-300">
      {/* Header */}
      <header className="bg-gray-900 border-b border-green-400 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-green-400 font-mono">
                工时管理系统
              </h1>
              {/* 用户信息移到h1下面 */}
              <div className="mt-2 flex items-center gap-2">
                <div className="text-green-300 font-mono text-sm">
                  {user?.name || '未知用户'}
                </div>
                <span className="text-green-600">•</span>
                <div className="text-green-600 font-mono text-sm">
                  {user?.role?.name || '未分配角色'}
                </div>
              </div>
            </div>
            
            {/* 退出按钮 - 重新设计 */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium rounded-lg transition-all duration-200 font-mono text-sm shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">退出系统</span>
              <span className="sm:hidden">退出</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="mt-4 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent"></div>
        </div>



        {/* Quick Actions Section */}
        <div className="mb-8">
          {/* Quick Actions - 3x3拖拽网格 */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={getDisplayModules().map(m => m.id)}
              strategy={rectSortingStrategy}
            >
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 transition-colors duration-200 ${
                isDragMode ? 'select-none' : ''
              }`}>
                {getDisplayModules().map((module, index) => (
                  <SortableModule
                    key={module.id}
                    module={module}
                    index={index}
                    isDragMode={isDragMode}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          
          {/* 无权限提示 */}
          {accessibleModules.length === 0 && (
            <div className="text-center py-12">
              <div className="text-green-600 mb-4">
                <Shield className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-green-400 mb-2 font-mono">暂无可访问的模块</h3>
              <p className="text-green-600 font-mono">请联系管理员为您分配相应的权限</p>
            </div>
          )}
          
          {/* 拖拽提示和状态 */}
          {accessibleModules.length > 0 && (
            <div className="mt-6 text-center">
              {isDragMode ? (
                <div className="bg-green-900/30 border border-green-500 rounded-lg p-3">
                  <p className="text-green-400 text-sm font-mono font-bold">
                    🎯 拖拽模式已激活 - 松开鼠标完成排序
                  </p>
                </div>
              ) : (
                <p className="text-green-600 text-sm font-mono">
                  💡 提示：长按模块或拖拽一定距离来重新排列顺序
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}