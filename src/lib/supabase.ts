import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

// 详细调试信息
console.log('Supabase配置详情:', {
  url: import.meta.env.VITE_SUPABASE_URL ? '已配置' : '未配置',
  urlValue: import.meta.env.VITE_SUPABASE_URL ? import.meta.env.VITE_SUPABASE_URL.substring(0, 50) + '...' : '未设置',
  key: import.meta.env.VITE_SUPABASE_ANON_KEY ? '已配置' : '未配置',
  keyValue: import.meta.env.VITE_SUPABASE_ANON_KEY ? import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 50) + '...' : '未设置',
  env: import.meta.env.MODE,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD
})

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Supabase配置缺失！正在使用占位符值，这将导致连接失败:', {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '未设置',
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? '已设置' : '未设置',
    actualUrl: supabaseUrl,
    actualKey: supabaseAnonKey.substring(0, 20) + '...'
  })
} else {
  console.log('✅ Supabase配置正常，连接到:', supabaseUrl)
}

// 简化的 fetch 包装器
const safariOptimizedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  try {
    // 使用标准 fetch，添加基本的超时控制
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时
    
    const response = await fetch(input, {
      ...init,
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    console.error('Fetch failed:', error)
    throw error
  }
}

// 创建带有移动端优化的Supabase客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce' // Safari 安全策略
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web-mobile-safari-optimized'
    },
    fetch: safariOptimizedFetch // 使用 Safari 优化的 fetch 方法
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 3 // Safari 进一步降低实时事件频率
    }
  }
})

// 重试机制包装函数
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      console.warn(`操作失败，第 ${attempt} 次尝试:`, error)
      
      if (attempt === maxRetries) {
        break
      }
      
      // 指数退避延迟
      const waitTime = delay * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }
  
  throw lastError!
}

// 检查网络连接
export async function checkNetworkConnection(): Promise<boolean> {
  try {
    const result = await withRetry(async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1)
      
      if (error) {
        throw new Error(`数据库连接失败: ${error.message}`)
      }
      
      return data
    }, 2, 500)
    
    return true
  } catch (error) {
    console.error('网络连接检查失败:', error)
    return false
  }
}

// 安全的数据库查询包装函数
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  try {
    return await withRetry(queryFn, 2, 500)
  } catch (error) {
    console.error('数据库查询失败:', error)
    return {
      data: null,
      error: {
        message: '网络连接异常，请检查网络设置或稍后重试',
        code: 'NETWORK_ERROR',
        details: error
      }
    }
  }
}

// Database types
export interface Company {
  id: string
  name: string
  order_index: number
  created_at: string
  updated_at: string
}

export interface Department {
  id: string
  company_id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface UserRole {
  id: string
  name: string
  permissions: string[]
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  phone: string
  password_hash: string
  id_card: string
  name: string
  company_id: string
  department_id?: string
  role_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Auth types
export interface LoginCredentials {
  phone: string
  password: string
}

export interface RegisterData {
  phone: string
  password: string
  id_card: string
  name: string
  company_id: string
  role_id: string
}

export interface ResetPasswordData {
  id_card: string
  new_password: string
}

// Permission categories interface
export interface PermissionCategory {
  category: string
  display_name: string
  description?: string
  sort_order: number
  created_at: string
}