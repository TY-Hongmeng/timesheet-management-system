import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, checkNetworkConnection } from '../lib/supabase'
import type { User, Company, UserRole } from '@/lib/supabase'
import { toast } from 'sonner'
import { getUserPermissions, Permission, PERMISSIONS } from '../utils/permissions'

interface AuthUser {
  id: string
  phone: string
  name: string
  id_card: string
  company: Company
  role: UserRole
  department_id?: string
  is_active: boolean
  permissions?: Permission[]
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (phone: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (data: RegisterFormData) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  resetPassword: (idCard: string, newPassword?: string) => Promise<{ success: boolean; error?: string; user?: any }>
  refreshUser: () => Promise<void>
  isAuthenticated: () => boolean
}

interface RegisterFormData {
  phone: string
  password: string
  id_card: string
  name: string
  company_id: string
  role_id: string
  production_line?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const storedUser = localStorage.getItem('auth_user')
        const lastLoginTime = localStorage.getItem('last_login_time')
        
        if (storedUser && lastLoginTime) {
          const userData = JSON.parse(storedUser)
          const loginTime = parseInt(lastLoginTime)
          const currentTime = Date.now()
          const sessionDuration = 24 * 60 * 60 * 1000 // 24小时
          
          // 检查会话是否过期
          if (currentTime - loginTime > sessionDuration) {
            console.warn('会话已过期，清除本地数据')
            localStorage.removeItem('auth_user')
            localStorage.removeItem('last_login_time')
            setUser(null)
            setLoading(false)
            return
          }
          
          // 如果网络不可用，直接使用本地存储的用户数据
          if (!navigator.onLine) {
            setUser(userData)
            setLoading(false)
            return
          }
          
          // 验证用户是否仍然有效 - 添加超时和错误处理
          try {
            const { data, error } = await Promise.race([
              supabase
                .from('users')
                .select(`
                  *,
                  company:companies(*),
                  role:user_roles(*)
                `)
                .eq('id', userData.id)
                .eq('is_active', true)
                .single(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('验证超时')), 8000)
              )
            ]) as any

            if (data && !error) {
              // 获取用户权限
              const userPermissions = await getUserPermissions(data.id)
              
              const authUser = {
                id: data.id,
                phone: data.phone,
                name: data.name,
                id_card: data.id_card,
                company: data.company,
                role: data.role,
                department_id: data.department_id,
                is_active: data.is_active,
                permissions: userPermissions
              }
              setUser(authUser)
              localStorage.setItem('auth_user', JSON.stringify(authUser))
              // 更新最后登录时间
              localStorage.setItem('last_login_time', currentTime.toString())
            } else {
              console.warn('用户验证失败，清除本地数据')
              localStorage.removeItem('auth_user')
              localStorage.removeItem('last_login_time')
              setUser(null)
            }
          } catch (verifyError) {
            console.warn('用户验证网络错误，使用本地数据:', verifyError)
            // 网络错误时使用本地存储的数据
            setUser(userData)
          }
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('检查用户状态失败:', error)
        localStorage.removeItem('auth_user')
        localStorage.removeItem('last_login_time')
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkUser()

    // 设置定期检查会话有效性
    const sessionCheckInterval = setInterval(() => {
      const lastLoginTime = localStorage.getItem('last_login_time')
      if (lastLoginTime) {
        const loginTime = parseInt(lastLoginTime)
        const currentTime = Date.now()
        const sessionDuration = 24 * 60 * 60 * 1000 // 24小时
        
        if (currentTime - loginTime > sessionDuration) {
          console.warn('会话过期，自动登出')
          localStorage.removeItem('auth_user')
          localStorage.removeItem('last_login_time')
          setUser(null)
          window.location.href = '/login'
        }
      }
    }, 60 * 1000) // 每分钟检查一次

    // 简化的认证状态监听
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        localStorage.removeItem('auth_user')
        localStorage.removeItem('last_login_time')
      }
    })

    return () => {
      subscription.unsubscribe()
      clearInterval(sessionCheckInterval)
    }
  }, [])

  const login = async (phone: string, password: string, retryCount = 0) => {
    try {
      // 简化的网络检测
      if (!navigator.onLine) {
        return { success: false, error: '网络连接已断开，请检查网络后重试' }
      }

      // 验证用户凭据 - 使用更简单的查询避免复杂关联
      const { data, error } = await Promise.race([
        supabase
          .from('users')
          .select(`
            *,
            company:companies(*),
            role:user_roles(*)
          `)
          .eq('phone', phone)
          .eq('is_active', true)
          .single(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('请求超时')), 10000)
        )
      ]) as any

      if (error) {
        console.error('用户查询错误:', error)
        if (error.code === 'PGRST116') {
          return { success: false, error: '用户不存在或已被禁用' }
        }
        throw error
      }

      if (!data) {
        return { success: false, error: '用户不存在或已被禁用' }
      }

      // 简化的密码验证（实际项目中应该使用bcrypt）
      if (data.password_hash !== password) {
        return { success: false, error: '密码错误' }
      }

      // 延迟获取权限，先完成基本登录
      let userPermissions: Permission[] = []
      
      // 如果是超级管理员，直接设置所有权限，避免数据库查询
      if (data.role && data.role.name === '超级管理员') {
        userPermissions = Object.values(PERMISSIONS) as Permission[]
      } else {
        // 异步获取权限，不阻塞登录流程
        setTimeout(async () => {
          try {
            const permissions = await getUserPermissions(data.id)
            const currentUser = JSON.parse(localStorage.getItem('auth_user') || '{}')
            if (currentUser.id === data.id) {
              currentUser.permissions = permissions
              localStorage.setItem('auth_user', JSON.stringify(currentUser))
              setUser(currentUser)
            }
          } catch (error) {
            console.warn('异步获取权限失败:', error)
          }
        }, 100)
      }
      
      // 创建用户对象（不包含权限，权限异步加载）
      const authUser: AuthUser = {
        id: data.id,
        phone: data.phone,
        name: data.name,
        id_card: data.id_card,
        company: data.company,
        role: data.role,
        department_id: data.department_id,
        is_active: data.is_active,
        permissions: userPermissions
      }

      // 设置用户状态
      setUser(authUser)
      localStorage.setItem('auth_user', JSON.stringify(authUser))
      localStorage.setItem('last_login_time', Date.now().toString())
      return { success: true }
    } catch (error: any) {
      console.error('登录失败:', error)
      
      // 增强的网络错误检测和重试机制
      const isNetworkError = 
        error.message?.includes('fetch') ||
        error.message?.includes('network') ||
        error.message?.includes('CONNECTION_CLOSED') ||
        error.message?.includes('ERR_NETWORK_CHANGED') ||
        error.message?.includes('ERR_ABORTED') ||
        error.message?.includes('ERR_CONNECTION_CLOSED') ||
        error.message?.includes('请求超时') ||
        error.message?.includes('Failed to fetch') ||
        error.code === 'NETWORK_ERROR' ||
        error.name === 'TypeError' ||
        !navigator.onLine
      
      if (retryCount < 5 && isNetworkError) {
        console.log(`网络错误，重试登录，第 ${retryCount + 1} 次，错误:`, error.message)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)))
        return login(phone, password, retryCount + 1)
      }
      
      // 根据错误类型返回不同的错误信息
      if (isNetworkError) {
        return { success: false, error: `网络连接不稳定，已重试${retryCount}次，请检查网络后重试` }
      }
      
      return { success: false, error: error.message || '登录失败，请稍后重试' }
    }
  }

  const register = async (formData: RegisterFormData) => {
    try {
      // 检查身份证号是否已存在
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('id_card', formData.id_card)
        .maybeSingle()

      if (userCheckError && userCheckError.code !== 'PGRST116') {
        return { success: false, error: '系统错误，请稍后重试' }
      }

      // 检查手机号是否已存在
      const { data: existingPhone, error: phoneCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', formData.phone)
        .maybeSingle()

      if (phoneCheckError && phoneCheckError.code !== 'PGRST116') {
        return { success: false, error: '系统错误，请稍后重试' }
      }

      // 如果身份证号或手机号已存在（无论是否活跃），都不允许注册
      if (existingUser || existingPhone) {
        if (existingUser) {
          return { success: false, error: '该身份证号已被注册' }
        }
        if (existingPhone) {
          return { success: false, error: '该手机号已被注册' }
        }
      }

      // 生成用户ID（移除邮箱相关认证）
      const userId = crypto.randomUUID()
      
      console.log('创建用户账号，用户ID:', userId)

      // 创建用户信息记录
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          phone: formData.phone,
          id_card: formData.id_card,
          name: formData.name,
          company_id: formData.company_id,
          role_id: formData.role_id,
          password_hash: formData.password,
          production_line: formData.production_line,
          is_active: false
        })

      if (userError) {
        return { success: false, error: '用户信息创建失败' }
      }

      // 获取完整用户信息
      const { data: userData } = await supabase
        .from('users')
        .select(`
          *,
          company:companies(*),
          role:user_roles(*)
        `)
        .eq('id', userId)
        .single()

      // 注册成功，但不自动登录（账号默认为禁用状态，需要管理员激活）
      console.log('用户注册成功，账号状态为禁用，需要管理员激活')

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || '注册失败，请重试' }
    }
  }

  const resetPassword = async (idCard: string, newPassword?: string) => {
    try {
      // 根据身份证号查找用户 - 添加超时和错误处理
      const { data: userData, error: userError } = await Promise.race([
        supabase
          .from('users')
          .select('id, phone, name')
          .eq('id_card', idCard)
          .eq('is_active', true)
          .single(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('查询超时')), 8000)
        )
      ]) as any

      if (userError) {
        console.error('用户查询错误:', userError)
        if (userError.code === 'PGRST116') {
          return { success: false, error: '未找到该身份证号对应的用户' }
        }
        return { success: false, error: '查询用户失败，请重试' }
      }

      if (!userData) {
        return { success: false, error: '未找到该身份证号对应的用户' }
      }

      // 如果只是验证身份证号（第一步）
      if (!newPassword) {
        return { 
          success: true, 
          user: {
            id: userData.id,
            phone: userData.phone,
            name: userData.name
          }
        }
      }

      // 重置密码（第二步）- 更新数据库中的密码哈希，添加超时处理
      const { error: resetError } = await Promise.race([
        supabase
          .from('users')
          .update({ password_hash: newPassword })
          .eq('id', userData.id),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('更新超时')), 8000)
        )
      ]) as any

      if (resetError) {
        console.error('密码更新错误:', resetError)
        return { success: false, error: '密码重置失败，请重试' }
      }

      return { success: true }
    } catch (error: any) {
      console.error('重置密码失败:', error)
      if (error.message?.includes('超时')) {
        return { success: false, error: '网络超时，请检查网络连接后重试' }
      }
      return { success: false, error: error.message || '密码重置失败' }
    }
  }

  const logout = async () => {
    try {
      // 清理本地状态（移除Supabase认证会话清理）
      setUser(null)
      localStorage.removeItem('auth_user')
      localStorage.removeItem('last_login_time')
      
      console.log('用户已成功登出')
    } catch (error) {
      console.error('登出错误:', error)
      // 即使出错也要清理本地状态
      setUser(null)
      localStorage.removeItem('auth_user')
      localStorage.removeItem('last_login_time')
    }
  }

  // 刷新用户信息
  const refreshUser = async () => {
    if (!user?.id) return
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          company:companies(*),
          role:user_roles(*)
        `)
        .eq('id', user.id)
        .eq('is_active', true)
        .single()

      if (data && !error) {
        const userPermissions = await getUserPermissions(data.id)
        const authUser = {
          id: data.id,
          phone: data.phone,
          name: data.name,
          id_card: data.id_card,
          company: data.company,
          role: data.role,
          department_id: data.department_id,
          is_active: data.is_active,
          permissions: userPermissions
        }
        setUser(authUser)
        localStorage.setItem('auth_user', JSON.stringify(authUser))
      }
    } catch (error) {
      console.error('刷新用户信息失败:', error)
    }
  }

  // 检查是否已认证
  const isAuthenticated = () => {
    return !!(user && user.id && user.is_active)
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    resetPassword,
    refreshUser,
    isAuthenticated
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}