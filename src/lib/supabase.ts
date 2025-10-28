import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

// 只在开发环境显示配置详情
if (import.meta.env.DEV) {
  console.log('Supabase配置详情:', {
    url: supabaseUrl ? '已配置' : '未配置',
    urlValue: supabaseUrl,
    key: supabaseAnonKey ? '已配置' : '未配置',
    keyValue: supabaseAnonKey,
    env: import.meta.env.MODE,
    isDev: import.meta.env.DEV
  })
}

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder') || supabaseAnonKey.includes('placeholder')) {
  console.error('❌ Supabase配置缺失！正在使用占位符值，这将导致连接失败:', {
    url: supabaseUrl,
    key: supabaseAnonKey ? '***' : '未设置'
  })
} else if (import.meta.env.DEV) {
  console.log('✅ Supabase配置正常，连接到:', supabaseUrl)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    fetch: async (url, options = {}) => {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
          }
        })
        return response
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Fetch failed:', error)
        }
        throw error
      }
    }
  }
})

// 网络重试机制
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      // 如果是最后一次尝试，直接抛出错误
      if (attempt === maxRetries) {
        throw lastError
      }

      // 网络错误或超时错误才重试
      const isRetryableError = 
        error instanceof TypeError ||
        (error as any)?.message?.includes('fetch') ||
        (error as any)?.message?.includes('network') ||
        (error as any)?.code === 'PGRST301' // PostgREST timeout

      if (!isRetryableError) {
        throw error
      }

      if (import.meta.env.DEV) {
        console.warn(`操作失败，第 ${attempt} 次尝试:`, error)
      }
      
      // 指数退避
      const waitTime = delay * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }

  throw lastError!
}

// 网络状态检查
export const checkNetworkStatus = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single()
    
    return !error || error.code !== 'PGRST301'
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('网络连接检查失败:', error)
    }
    return false
  }
}

// 数据库查询包装器
export const dbQuery = async <T>(queryFn: () => Promise<T>): Promise<T> => {
  try {
    return await withRetry(queryFn)
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('数据库查询失败:', error)
    }
    throw error
  }
}