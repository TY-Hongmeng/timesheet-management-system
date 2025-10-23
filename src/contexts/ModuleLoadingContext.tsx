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

// 模块ID映射
export const MODULE_IDS = {
  DASHBOARD: 'dashboard',
  TIMESHEET_RECORD: 'timesheet-record',
  TIMESHEET_HISTORY: 'timesheet-history',
  COMPANY_MANAGEMENT: 'company-management',
  USER_MANAGEMENT: 'user-management',
  PROCESS_MANAGEMENT: 'process-management',
  SUPERVISOR_APPROVAL: 'supervisor-approval',
  SECTION_CHIEF_APPROVAL: 'section-chief-approval',
  REPORTS: 'reports',
  HISTORY: 'history',
  ROLE_LIST: 'role-list',
  ROLE_EDIT: 'role-edit',
  ROLE_CREATE: 'role-create'
} as const

export type ModuleId = typeof MODULE_IDS[keyof typeof MODULE_IDS]

interface ModuleLoadingProviderProps {
  children: ReactNode
}

export function ModuleLoadingProvider({ children }: ModuleLoadingProviderProps) {
  const [moduleStates, setModuleStates] = useState<ModuleLoadingState>({})

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