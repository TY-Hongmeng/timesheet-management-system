import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Clock, BarChart3, Settings, Users, Building2, CheckCircle, Shield, Key, User, Building, Cog, Activity, LogOut, LucideIcon, Loader2, Move3D, Hand } from 'lucide-react'
import { useModuleLoading } from '../contexts/ModuleLoadingContext'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
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
  dragModeEnabled: boolean
}

function SortableModule({ module, index, isDragMode, dragModeEnabled }: SortableModuleProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: module.id,
    disabled: !dragModeEnabled // 只有在拖拽模式开启时才启用拖拽
  })

  const { isModuleHighlighted, isModuleLoaded } = useModuleLoading()
  
  // 添加拖拽完成后的延迟状态，防止拖拽后立即触发点击
  const [recentlyDragged, setRecentlyDragged] = useState(false)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const IconComponent = iconMap[module.icon]
  const isPlaceholder = module.isPlaceholder
  const isHighlighted = isModuleHighlighted(module.id)
  const isLoaded = isModuleLoaded(module.id)

  // 监听拖拽状态变化，设置延迟保护
  useEffect(() => {
    if (isDragging) {
      setRecentlyDragged(true)
    } else if (recentlyDragged) {
      // 拖拽结束后延迟300ms才允许点击，防止拖拽后立即触发点击事件
      const timer = setTimeout(() => {
        setRecentlyDragged(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isDragging, recentlyDragged])

  // 处理链接点击
  const handleLinkClick = (e: React.MouseEvent) => {
    // 如果拖拽模式开启、正在拖拽或刚完成拖拽，阻止链接跳转
    if (dragModeEnabled || isDragMode || isDragging || recentlyDragged) {
      e.preventDefault()
      e.stopPropagation()
      return false
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
        {...(dragModeEnabled ? listeners : {})}
        className={`${
          isDragMode 
            ? 'cursor-grabbing' 
            : dragModeEnabled 
              ? 'cursor-grab' 
              : 'cursor-pointer'
        }`}
        style={{
          touchAction: dragModeEnabled ? 'none' : 'auto', // 手机端拖拽时禁用默认触摸行为
          userSelect: dragModeEnabled ? 'none' : 'auto', // 拖拽模式时禁用文本选择
          WebkitUserSelect: dragModeEnabled ? 'none' : 'auto', // Safari兼容
          WebkitTouchCallout: dragModeEnabled ? 'none' : 'default', // 禁用长按菜单
        } as React.CSSProperties}
      >
        <Link 
          to={module.path} 
          className="group block"
          onClick={handleLinkClick}
        >
          <div className={`relative bg-gray-800 rounded-xl border transition-all duration-300 hover:transform hover:scale-[1.02] hover:shadow-xl min-h-[140px] backdrop-blur-sm ${
            isDragMode || dragModeEnabled ? 'pointer-events-none' : ''
          } ${
            dragModeEnabled && !isDragMode ? 'border-blue-400 shadow-lg shadow-blue-400/20 bg-gradient-to-br from-gray-800 to-blue-900/20' : ''
          } ${
            isHighlighted 
              ? 'border-green-400 shadow-lg shadow-green-400/20 bg-gradient-to-br from-gray-800 to-green-900/20' 
              : 'border-gray-700 hover:border-green-400/60 hover:shadow-green-500/10'
          }`}>
            {/* 标题栏 */}
            <div className="bg-gray-800 border-b border-green-600 p-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    isHighlighted 
                      ? 'bg-gradient-to-br from-green-400 to-green-500 shadow-lg shadow-green-400/30' 
                      : 'bg-gradient-to-br from-green-500 to-green-600 group-hover:from-green-400 group-hover:to-green-500'
                  }`}>
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                  <h3 className={`font-bold text-lg transition-colors ${
                    isHighlighted 
                      ? 'text-green-300' 
                      : 'text-white group-hover:text-green-100'
                  }`}>{module.name}</h3>
                  {isHighlighted && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-400 text-xs font-mono">已加载</span>
                    </div>
                  )}
                </div>

              </div>
            </div>
            
            {/* 内容区域 */}
            <div className="p-6 flex flex-col items-center justify-center">
              {!isLoaded ? (
                /* 未加载状态 */
                <div className="flex flex-col items-center space-y-3">
                  <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
                  <span className="text-green-400 text-sm font-mono">加载中...</span>
                </div>
              ) : (
                /* 已加载状态 - 模块描述 */
                <p className="text-gray-400 text-sm text-center leading-relaxed group-hover:text-gray-300 transition-colors">{module.description}</p>
              )}
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
  const { markModuleAsLoaded, initializeProgressiveLoading } = useModuleLoading()

  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [accessibleModules, setAccessibleModules] = useState<DashboardModule[]>([])
  const [orderedModules, setOrderedModules] = useState<DashboardModule[]>([])
  const [isDragMode, setIsDragMode] = useState(false)
  const [dragModeEnabled, setDragModeEnabled] = useState(false)

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
      // Dashboard页面加载完成后标记为已加载
      markModuleAsLoaded('dashboard')
      
      // 启动分级加载
      initializeProgressiveLoading()
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

  // 拖拽传感器配置 - 始终创建所有传感器，但通过激活约束控制
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: dragModeEnabled ? {
      distance: 8, // 桌面端需要移动8px才激活拖拽
    } : {
      distance: 999999, // 拖拽模式关闭时设置极大距离，实际禁用拖拽
    }
  })
  
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: dragModeEnabled ? {
      delay: 100, // 手机端延迟100ms，避免与滚动冲突
      tolerance: 8, // 容忍度8px
    } : {
      delay: 999999, // 拖拽模式关闭时设置极大延迟，实际禁用拖拽
      tolerance: 999999,
    }
  })
  
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })

  const sensors = useSensors(
    pointerSensor,
    touchSensor,
    keyboardSensor
  )

  // 处理拖拽开始
  const handleDragStart = (event: DragStartEvent) => {
    // 只有在拖拽模式开启时才允许拖拽
    if (!dragModeEnabled) {
      return
    }
    setIsDragMode(true)
  }

  // 处理拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setIsDragMode(false)

    // 只有在拖拽模式开启时才处理拖拽结果
    if (!dragModeEnabled || !over || !user || active.id === over.id) {
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

  // 处理拖拽取消
  const handleDragCancel = () => {
    setIsDragMode(false)
  }

  // 切换拖拽模式
  const toggleDragMode = () => {
    const newDragModeEnabled = !dragModeEnabled
    setDragModeEnabled(newDragModeEnabled)
    
    // 如果关闭拖拽模式，同时关闭拖拽状态
    if (!newDragModeEnabled) {
      setIsDragMode(false)
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
              <h1 className="text-xl sm:text-4xl font-bold text-green-400 font-mono">
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
            onDragCancel={handleDragCancel}
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
                    dragModeEnabled={dragModeEnabled}
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
          
          {/* 拖拽控制和状态 */}
          {accessibleModules.length > 0 && (
            <div className="mt-6">
              {isDragMode ? (
                <div className="bg-green-900/30 border border-green-500 rounded-lg p-3 text-center">
                  <p className="text-green-400 text-sm font-mono font-bold">
                    🎯 拖拽模式已激活 - 松开手指完成排序
                  </p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                  {/* 拖拽开关 */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleDragMode}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm font-medium transition-all duration-200 ${
                        dragModeEnabled
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 hover:from-blue-600 hover:to-blue-700'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                      }`}
                    >
                      {dragModeEnabled ? <Move3D className="w-4 h-4" /> : <Hand className="w-4 h-4" />}
                      <span>{dragModeEnabled ? '拖拽模式：开启' : '拖拽模式：关闭'}</span>
                    </button>
                  </div>
                  
                  {/* 操作提示 */}
                  <div className="text-center sm:text-right">
                    {dragModeEnabled ? (
                      <div className="space-y-1">
                        <p className="text-blue-400 text-sm font-mono">
                          💡 拖拽模式已开启，可以拖拽模块重新排序
                        </p>
                        <p className="text-blue-500 text-xs font-mono">
                          点击模块进入功能已禁用，关闭拖拽模式恢复正常
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-green-600 text-sm font-mono">
                          💡 点击开启拖拽模式来重新排列模块顺序
                        </p>
                        <p className="text-green-700 text-xs font-mono">
                          拖拽模式关闭时，点击模块可正常进入功能页面
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}