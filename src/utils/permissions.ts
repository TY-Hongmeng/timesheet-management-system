// 权限管理工具函数
import { supabase, safeQuery } from '@/lib/supabase'

// 权限常量定义
export const PERMISSIONS = {
  // 用户管理
  USER_READ: 'user:read',
  USER_MANAGE: 'user:manage',
  USER_CREATE: 'user:create',
  USER_DELETE: 'user:delete',
  
  // 公司管理
  COMPANY_READ: 'company:read',
  COMPANY_MANAGE: 'company:manage',
  COMPANY_CREATE: 'company:create',
  COMPANY_DELETE: 'company:delete',
  
  // 工序管理
  PROCESS_READ: 'process:read',
  PROCESS_MANAGE: 'process:manage',
  PROCESS_CREATE: 'process:create',
  PROCESS_DELETE: 'process:delete',
  
  // 系统管理
  ROLE_MANAGE: 'role:manage',
  SYSTEM_CONFIG: 'system:config',
  
  // Dashboard模块权限（保持兼容性）
  TIME_RECORD: 'time_record',
  REPORTS: 'reports',
  HISTORY: 'history',
  PROCESS_MANAGEMENT: 'process_management',
  USER_MANAGEMENT: 'user_management',
  COMPANY_MANAGEMENT: 'company_management',
  SUPERVISOR_REVIEW: 'supervisor_review',
  MANAGER_REVIEW: 'manager_review',
  PERMISSION_MANAGEMENT: 'permission_management'
} as const

// 权限类型
export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

// 超级管理员角色名称常量
export const SUPER_ADMIN_ROLE = '超级管理员'

// 权限分组
export const PERMISSION_GROUPS: Record<string, string[]> = {
  user_management: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_DELETE
  ],
  company_management: [
    PERMISSIONS.COMPANY_READ,
    PERMISSIONS.COMPANY_MANAGE,
    PERMISSIONS.COMPANY_CREATE,
    PERMISSIONS.COMPANY_DELETE
  ],
  process_management: [
    PERMISSIONS.PROCESS_READ,
    PERMISSIONS.PROCESS_MANAGE,
    PERMISSIONS.PROCESS_CREATE,
    PERMISSIONS.PROCESS_DELETE
  ],
  system_management: [
    PERMISSIONS.ROLE_MANAGE,
    PERMISSIONS.SYSTEM_CONFIG
  ]
}

// 权限描述映射
export const PERMISSION_DESCRIPTIONS = {
  [PERMISSIONS.USER_READ]: '查看用户信息',
  [PERMISSIONS.USER_MANAGE]: '管理用户账户',
  [PERMISSIONS.USER_CREATE]: '创建新用户',
  [PERMISSIONS.USER_DELETE]: '删除用户账户',
  [PERMISSIONS.COMPANY_READ]: '查看公司信息',
  [PERMISSIONS.COMPANY_MANAGE]: '管理公司设置',
  [PERMISSIONS.COMPANY_CREATE]: '创建新公司',
  [PERMISSIONS.COMPANY_DELETE]: '删除公司',
  [PERMISSIONS.PROCESS_READ]: '查看工序信息',
  [PERMISSIONS.PROCESS_MANAGE]: '管理工序流程',
  [PERMISSIONS.PROCESS_CREATE]: '创建新工序',
  [PERMISSIONS.PROCESS_DELETE]: '删除工序',
  [PERMISSIONS.ROLE_MANAGE]: '管理用户角色',
  [PERMISSIONS.SYSTEM_CONFIG]: '系统配置管理'
}

// Dashboard模块配置
export interface DashboardModule {
  id: string
  name: string
  description: string
  icon: string
  path: string
  permission: Permission
  color: string
}

// Dashboard模块定义
export const DASHBOARD_MODULES: DashboardModule[] = [
  {
    id: 'time_record',
    name: '记录工时',
    description: '记录和管理工作时间',
    icon: 'Clock',
    path: '/timesheet-record',
    permission: PERMISSIONS.TIME_RECORD,
    color: 'from-green-400 to-green-600'
  },
  {
    id: 'reports',
    name: '查看报表',
    description: '查看工时统计和分析报表',
    icon: 'BarChart3',
    path: '/reports',
    permission: PERMISSIONS.REPORTS,
    color: 'from-blue-400 to-blue-600'
  },
  {
    id: 'history',
    name: '历史记录',
    description: '查看个人工时历史记录',
    icon: 'Activity',
    path: '/history',
    permission: PERMISSIONS.HISTORY,
    color: 'from-cyan-400 to-cyan-600'
  },
  {
    id: 'process_management',
    name: '工序管理',
    description: '管理生产工序和流程',
    icon: 'Settings',
    path: '/process-management',
    permission: PERMISSIONS.PROCESS_MANAGEMENT,
    color: 'from-purple-400 to-purple-600'
  },
  {
    id: 'user_management',
    name: '用户管理',
    description: '管理系统用户和权限',
    icon: 'Users',
    path: '/user-management',
    permission: PERMISSIONS.USER_MANAGEMENT,
    color: 'from-orange-400 to-orange-600'
  },
  {
    id: 'company_management',
    name: '公司管理',
    description: '管理公司信息和部门',
    icon: 'Building2',
    path: '/company-management',
    permission: PERMISSIONS.COMPANY_MANAGEMENT,
    color: 'from-teal-400 to-teal-600'
  },
  {
    id: 'supervisor_review',
    name: '班长审核',
    description: '班长审核工时记录',
    icon: 'CheckCircle',
    path: '/supervisor-approval',
    permission: PERMISSIONS.SUPERVISOR_REVIEW,
    color: 'from-indigo-400 to-indigo-600'
  },
  {
    id: 'section_chief_review',
    name: '段长审核',
    description: '段长审核工时记录',
    icon: 'Shield',
    path: '/section-chief-approval',
    permission: PERMISSIONS.MANAGER_REVIEW,
    color: 'from-pink-400 to-pink-600'
  },
  {
    id: 'permission_management',
    name: '权限管理',
    description: '管理用户角色和权限',
    icon: 'Key',
    path: '/role-permissions',
    permission: PERMISSIONS.PERMISSION_MANAGEMENT,
    color: 'from-red-400 to-red-600'
  }
]

// 权限检查函数 - 优化版本，减少数据库查询
export async function checkUserPermission(userId: string, permission: Permission): Promise<boolean> {
  try {
    // 使用缓存或直接从用户对象获取权限信息
    const permissions = await getUserPermissions(userId)
    return permissions.includes(permission)
  } catch (error) {
    console.error('权限检查异常:', error)
    return false
  }
}

// 权限缓存
interface PermissionCache {
  permissions: Permission[]
  timestamp: number
  userId: string
}

let permissionCache: PermissionCache | null = null
const CACHE_DURATION = 10 * 60 * 1000 // 10分钟缓存，减少查询频率

// 获取用户权限列表 - 带缓存优化
export async function getUserPermissions(userId: string): Promise<Permission[]> {
  try {
    // 检查缓存
    if (permissionCache && 
        permissionCache.userId === userId && 
        Date.now() - permissionCache.timestamp < CACHE_DURATION) {
      return permissionCache.permissions
    }

    // 使用安全查询获取用户信息和角色
    const { data: userData, error: userError } = await safeQuery(async () => {
      return await supabase
        .from('users')
        .select(`
          id,
          role_id,
          user_roles (
            id,
            name,
            permissions
          )
        `)
        .eq('id', userId)
        .single()
    })
    
    if (userError || !userData) {
      console.error('获取用户信息失败:', userError)
      return []
    }
    
    let permissions: Permission[] = []
    
    // 如果是超级管理员，返回所有权限
    if (userData.user_roles && isSuperAdmin((userData.user_roles as any).name)) {
      permissions = getAllPermissions() as Permission[]
    } else if (userData.user_roles && (userData.user_roles as any).permissions) {
      // 返回角色权限
      permissions = (userData.user_roles as any).permissions as Permission[]
    }
    
    // 更新缓存
    permissionCache = {
      permissions,
      timestamp: Date.now(),
      userId
    }
    
    return permissions
  } catch (error) {
    console.error('获取用户权限异常:', error)
    return []
  }
}

// 清除权限缓存
export function clearPermissionCache(userId?: string) {
  if (userId) {
    if (permissionCache && permissionCache.userId === userId) {
      permissionCache = null
    }
  } else {
    permissionCache = null
  }
}

// 过滤用户可访问的模块
export function filterAccessibleModules(userPermissions: Permission[]): DashboardModule[] {
  return DASHBOARD_MODULES.filter(module => 
    userPermissions.includes(module.permission)
  )
}

// 检查是否为超级管理员
export function isSuperAdmin(userRole: string | any): boolean {
  // 如果userRole是对象，取name字段
  if (typeof userRole === 'object' && userRole !== null) {
    return userRole.name === '超级管理员'
  }
  // 如果userRole是字符串，直接比较
  return userRole === '超级管理员'
}

// 获取所有模块（超级管理员使用）
export function getAllModules(): DashboardModule[] {
  return DASHBOARD_MODULES
}

// 权限检查工具函数
export const hasPermission = (user: any, requiredPermission: string): boolean => {
  if (!user) return false
  
  // 超级管理员拥有所有权限
  if (isSuperAdmin(user.role || user.user_roles)) return true
  
  // 检查用户角色权限
  const userRole = user.role || user.user_roles
  if (!userRole || !userRole.permissions) return false
  return userRole.permissions.includes(requiredPermission)
}

export const hasAnyPermission = (user: any, requiredPermissions: string[]): boolean => {
  if (!user) return false
  
  // 超级管理员拥有所有权限
  if (isSuperAdmin(user.role || user.user_roles)) return true
  
  // 检查用户角色权限
  const userRole = user.role || user.user_roles
  if (!userRole || !userRole.permissions) return false
  return requiredPermissions.some(permission => userRole.permissions.includes(permission))
}

export const hasAllPermissions = (user: any, requiredPermissions: string[]): boolean => {
  if (!user) return false
  
  // 超级管理员拥有所有权限
  if (isSuperAdmin(user.role || user.user_roles)) return true
  
  // 检查用户角色权限
  const userRole = user.role || user.user_roles
  if (!userRole || !userRole.permissions) return false
  return requiredPermissions.every(permission => userRole.permissions.includes(permission))
}

// 获取所有可用权限
export const getAllPermissions = (): string[] => {
  return Object.values(PERMISSIONS)
}