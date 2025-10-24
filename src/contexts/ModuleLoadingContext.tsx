import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { performanceMonitor, startTimer, endTimer } from '@/utils/performanceMonitor'
import { errorLogger, logLoadingError } from '@/utils/errorLogger'

// 模块加载状态类型
interface ModuleLoadingState {
  [moduleId: string]: {
    isLoaded: boolean
    loadedAt?: number
    isHighlighted: boolean
    priority: number // 加载优先级：1=最高，2=高，3=中，4=低
  }
}

interface ModuleLoadingContextType {
  moduleStates: ModuleLoadingState
  markModuleAsLoaded: (moduleId: string) => void
  isModuleLoaded: (moduleId: string) => boolean
  isModuleHighlighted: (moduleId: string) => boolean
  clearHighlight: (moduleId: string) => void
  getLoadingProgress: () => number
  initializeProgressiveLoading: () => void
}

const ModuleLoadingContext = createContext<ModuleLoadingContextType | undefined>(undefined)

// 模块ID映射 - 与Dashboard组件和permissions.ts保持一致
export const MODULE_IDS = {
  DASHBOARD: 'dashboard',
  TIME_RECORD: 'time_record',
  REPORTS: 'reports',
  HISTORY: 'history',
  PROCESS_MANAGEMENT: 'process_management',
  USER_MANAGEMENT: 'user_management',
  COMPANY_MANAGEMENT: 'company_management',
  SUPERVISOR_REVIEW: 'supervisor_review',
  SECTION_CHIEF_REVIEW: 'section_chief_review',
  PERMISSION_MANAGEMENT: 'permission_management',
  ROLE_LIST: 'role-list',
  ROLE_EDIT: 'role-edit',
  ROLE_CREATE: 'role-create'
} as const

export type ModuleId = typeof MODULE_IDS[keyof typeof MODULE_IDS]

// 模块分级配置 - 根据重要性和使用频率分级
const MODULE_PRIORITIES = {
  // 第一级：核心功能（立即加载）
  [MODULE_IDS.DASHBOARD]: 1,
  [MODULE_IDS.TIME_RECORD]: 1,
  
  // 第二级：常用功能（延迟500ms加载）
  [MODULE_IDS.REPORTS]: 2,
  [MODULE_IDS.HISTORY]: 2,
  [MODULE_IDS.SUPERVISOR_REVIEW]: 2,
  [MODULE_IDS.SECTION_CHIEF_REVIEW]: 2,
  
  // 第三级：管理功能（延迟1000ms加载）
  [MODULE_IDS.PROCESS_MANAGEMENT]: 3,
  [MODULE_IDS.USER_MANAGEMENT]: 3,
  [MODULE_IDS.COMPANY_MANAGEMENT]: 3,
  
  // 第四级：系统管理功能（延迟1500ms加载）
  [MODULE_IDS.PERMISSION_MANAGEMENT]: 4,
  [MODULE_IDS.ROLE_LIST]: 4,
  [MODULE_IDS.ROLE_EDIT]: 4,
  [MODULE_IDS.ROLE_CREATE]: 4
}

// 智能分级加载延迟配置 - 根据网络条件动态调整
const getLoadingDelays = () => {
  const connection = (navigator as any).connection
  const isSlowConnection = connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')
  const isLowEndDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2
  
  if (isSlowConnection || isLowEndDevice) {
    // 低性能环境：更保守的延迟
    return {
      1: 0,     // 立即加载
      2: 800,   // 800ms后加载
      3: 1500,  // 1.5秒后加载
      4: 2500   // 2.5秒后加载
    }
  } else {
    // 高性能环境：更激进的延迟
    return {
      1: 0,     // 立即加载
      2: 200,   // 200ms后加载（大幅减少）
      3: 500,   // 500ms后加载（大幅减少）
      4: 800    // 800ms后加载（大幅减少）
    }
  }
}

interface ModuleLoadingProviderProps {
  children: ReactNode
}

export function ModuleLoadingProvider({ children }: ModuleLoadingProviderProps) {
  const [moduleStates, setModuleStates] = useState<ModuleLoadingState>(() => {
    // 初始化所有模块为未加载状态，但设置优先级
    const initialStates: ModuleLoadingState = {}
    
    Object.entries(MODULE_IDS).forEach(([key, moduleId]) => {
      initialStates[moduleId] = {
        isLoaded: false,
        isHighlighted: false,
        priority: MODULE_PRIORITIES[moduleId] || 4
      }
    })
    
    return initialStates
  })

  // 智能分级加载初始化 - 增强版
  const initializeProgressiveLoading = () => {
    console.log('🚀 启动智能分级加载策略')
    
    // 启动总体性能监控
    startTimer('分级加载总耗时')
    
    // 获取动态延迟配置
    const LOADING_DELAYS = getLoadingDelays()
    
    // 按优先级分组加载模块
    const modulesByPriority: { [priority: number]: string[] } = {}
    
    Object.entries(MODULE_PRIORITIES).forEach(([moduleId, priority]) => {
      if (!modulesByPriority[priority]) {
        modulesByPriority[priority] = []
      }
      modulesByPriority[priority].push(moduleId)
    })
    
    // 性能监控和错误处理
    let loadedCount = 0
    const totalModules = Object.keys(MODULE_PRIORITIES).length
    
    // 按优先级顺序加载，添加错误处理和重试机制
    Object.entries(modulesByPriority).forEach(([priority, moduleIds]) => {
      const delay = LOADING_DELAYS[parseInt(priority)]
      
      setTimeout(() => {
        startTimer(`优先级${priority}模块加载`)
        try {
          moduleIds.forEach(moduleId => {
            setModuleStates(prev => ({
              ...prev,
              [moduleId]: {
                ...prev[moduleId],
                isLoaded: true,
                loadedAt: Date.now()
              }
            }))
            
            loadedCount++
            console.log(`✅ 模块 ${moduleId} 加载完成 (${loadedCount}/${totalModules})`)
            
            // 当所有模块加载完成时记录性能
            if (loadedCount === totalModules) {
              const totalTime = endTimer('分级加载总耗时')
              performanceMonitor.recordMetric('分级加载模块数', totalModules)
              console.log(`🎯 所有模块加载完成，总耗时: ${Math.round(totalTime)}ms`)
              
              // 生成性能报告
              performanceMonitor.generatePerformanceReport()
            }
          })
          endTimer(`优先级${priority}模块加载`)
        } catch (error) {
          endTimer(`优先级${priority}模块加载`)
          logLoadingError(`优先级${priority}模块加载`, error)
          console.error(`❌ 优先级 ${priority} 模块加载失败:`, error)
          
          // 重试机制
          setTimeout(() => {
            console.log(`🔄 重试加载优先级 ${priority} 模块`)
            moduleIds.forEach(moduleId => {
              setModuleStates(prev => ({
                ...prev,
                [moduleId]: {
                  ...prev[moduleId],
                  isLoaded: true,
                  loadedAt: Date.now()
                }
              }))
            })
          }, 1000) // 1秒后重试
        }
      }, delay)
    })
  }

  // 标记模块为已加载
  const markModuleAsLoaded = (moduleId: string) => {
    setModuleStates(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        isLoaded: true,
        loadedAt: Date.now(),
        isHighlighted: true
      }
    }))

    // 3秒后自动取消高亮
    setTimeout(() => {
      setModuleStates(prev => ({
        ...prev,
        [moduleId]: {
          ...prev[moduleId],
          isHighlighted: false
        }
      }))
    }, 3000)
  }

  // 检查模块是否已加载
  const isModuleLoaded = (moduleId: string) => {
    return moduleStates[moduleId]?.isLoaded || false
  }

  // 检查模块是否正在高亮
  const isModuleHighlighted = (moduleId: string) => {
    return moduleStates[moduleId]?.isHighlighted || false
  }

  // 清除高亮
  const clearHighlight = (moduleId: string) => {
    setModuleStates(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        isHighlighted: false
      }
    }))
  }

  // 获取加载进度
  const getLoadingProgress = () => {
    const totalModules = Object.keys(moduleStates).length
    const loadedModules = Object.values(moduleStates).filter(state => state.isLoaded).length
    return totalModules > 0 ? Math.round((loadedModules / totalModules) * 100) : 0
  }

  return (
    <ModuleLoadingContext.Provider
      value={{
        moduleStates,
        markModuleAsLoaded,
        isModuleLoaded,
        isModuleHighlighted,
        clearHighlight,
        getLoadingProgress,
        initializeProgressiveLoading
      }}
    >
      {children}
    </ModuleLoadingContext.Provider>
  )
}

export function useModuleLoading() {
  const context = useContext(ModuleLoadingContext)
  if (context === undefined) {
    throw new Error('useModuleLoading must be used within a ModuleLoadingProvider')
  }
  return context
}