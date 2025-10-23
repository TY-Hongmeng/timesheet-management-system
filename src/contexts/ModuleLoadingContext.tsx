import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// 模块加载状态类型
interface ModuleLoadingState {
  [moduleId: string]: {
    isLoaded: boolean
    loadedAt?: number
    isHighlighted: boolean
  }
}

interface ModuleLoadingContextType {
  moduleStates: ModuleLoadingState
  markModuleAsLoaded: (moduleId: string) => void
  isModuleLoaded: (moduleId: string) => boolean
  isModuleHighlighted: (moduleId: string) => boolean
  clearHighlight: (moduleId: string) => void
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

interface ModuleLoadingProviderProps {
  children: ReactNode
}

export function ModuleLoadingProvider({ children }: ModuleLoadingProviderProps) {
  const [moduleStates, setModuleStates] = useState<ModuleLoadingState>({
    // 所有模块默认为已加载状态，避免手机端显示加载中
    [MODULE_IDS.DASHBOARD]: {
      isLoaded: true,
      loadedAt: Date.now(),
      isHighlighted: false
    },
    [MODULE_IDS.TIME_RECORD]: {
      isLoaded: true,
      loadedAt: Date.now(),
      isHighlighted: false
    },
    [MODULE_IDS.REPORTS]: {
      isLoaded: true,
      loadedAt: Date.now(),
      isHighlighted: false
    },
    [MODULE_IDS.HISTORY]: {
      isLoaded: true,
      loadedAt: Date.now(),
      isHighlighted: false
    },
    [MODULE_IDS.PROCESS_MANAGEMENT]: {
      isLoaded: true,
      loadedAt: Date.now(),
      isHighlighted: false
    },
    [MODULE_IDS.USER_MANAGEMENT]: {
      isLoaded: true,
      loadedAt: Date.now(),
      isHighlighted: false
    },
    [MODULE_IDS.COMPANY_MANAGEMENT]: {
      isLoaded: true,
      loadedAt: Date.now(),
      isHighlighted: false
    },
    [MODULE_IDS.SUPERVISOR_REVIEW]: {
      isLoaded: true,
      loadedAt: Date.now(),
      isHighlighted: false
    },
    [MODULE_IDS.SECTION_CHIEF_REVIEW]: {
      isLoaded: true,
      loadedAt: Date.now(),
      isHighlighted: false
    },
    [MODULE_IDS.PERMISSION_MANAGEMENT]: {
      isLoaded: true,
      loadedAt: Date.now(),
      isHighlighted: false
    },
    [MODULE_IDS.ROLE_LIST]: {
      isLoaded: true,
      loadedAt: Date.now(),
      isHighlighted: false
    },
    [MODULE_IDS.ROLE_EDIT]: {
      isLoaded: true,
      loadedAt: Date.now(),
      isHighlighted: false
    },
    [MODULE_IDS.ROLE_CREATE]: {
      isLoaded: true,
      loadedAt: Date.now(),
      isHighlighted: false
    }
  })

  // 标记模块为已加载
  const markModuleAsLoaded = (moduleId: string) => {
    setModuleStates(prev => ({
      ...prev,
      [moduleId]: {
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

  return (
    <ModuleLoadingContext.Provider
      value={{
        moduleStates,
        markModuleAsLoaded,
        isModuleLoaded,
        isModuleHighlighted,
        clearHighlight
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