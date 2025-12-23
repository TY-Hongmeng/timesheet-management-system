import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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
  ROLE_CREATE: 'role-create',
  RECYCLE_BIN: 'recycle_bin'
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
  [MODULE_IDS.ROLE_CREATE]: 4,
  [MODULE_IDS.RECYCLE_BIN]: 3
}

// 分级加载延迟配置
const LOADING_DELAYS = {
  1: 0,     // 立即加载
  2: 500,   // 500ms后加载
  3: 1000,  // 1秒后加载
  4: 1500   // 1.5秒后加载
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

  // 分级加载初始化
  const initializeProgressiveLoading = () => {
    // 按优先级分组加载模块
    const modulesByPriority: { [priority: number]: string[] } = {}
    
    Object.entries(MODULE_PRIORITIES).forEach(([moduleId, priority]) => {
      if (!modulesByPriority[priority]) {
        modulesByPriority[priority] = []
      }
      modulesByPriority[priority].push(moduleId)
    })
    
    // 按优先级顺序加载
    Object.entries(modulesByPriority).forEach(([priority, moduleIds]) => {
      const delay = LOADING_DELAYS[parseInt(priority)]
      
      setTimeout(() => {
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
