import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { UserRole } from '../lib/supabase'
import { hasPermission, PERMISSIONS, SUPER_ADMIN_ROLE, DASHBOARD_MODULES } from '../utils/permissions'
import { Shield, ArrowLeft, Save, X, AlertTriangle } from 'lucide-react'



interface RoleFormData {
  name: string
  permissions: string[]
}



export default function RoleEdit() {
  const { id } = useParams<{ id: string }>()
  const [role, setRole] = useState<UserRole | null>(null)
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    permissions: []
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')


  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  // 检查用户认证状态和权限
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
      return
    }

    // 检查用户是否有角色管理权限
    if (user && user.role?.permissions && !hasPermission(user, PERMISSIONS.ROLE_MANAGE)) {
      setError('您没有权限访问角色管理功能')
      setLoading(false)
      return
    }
  }, [user, authLoading, navigate])

  // 如果正在加载认证状态，显示加载界面
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-green-400 text-2xl font-mono mb-4">加载中...</div>
          <div className="text-green-600 font-mono">正在验证用户身份</div>
        </div>
      </div>
    )
  }

  useEffect(() => {
    if (user && user.role?.permissions && hasPermission(user, PERMISSIONS.ROLE_MANAGE) && id) {
      fetchRoleAndPermissions()
    }
  }, [user, id])

  const fetchRoleAndPermissions = async () => {
    if (!id) return

    try {
      // 获取角色信息
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('id', id)
        .single()

      if (roleError) throw roleError
      if (!roleData) throw new Error('角色不存在')

    

      setRole(roleData)
      setFormData({
        name: roleData.name,
        permissions: roleData.permissions || []
      })
    } catch (error: any) {
      setError(error.message || '获取角色信息失败')
    } finally {
      setLoading(false)
    }
  }



  const togglePermission = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }))
  }



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      if (!id) throw new Error('角色ID不存在')

      // 检查角色名称是否已存在（排除当前角色）
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('name', formData.name)
        .neq('id', id)
        .single()

      if (existingRole) {
        throw new Error('角色名称已存在')
      }

      // 更新角色
      const { data, error } = await supabase
        .from('user_roles')
        .update({
          name: formData.name,
          permissions: formData.permissions,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*')

      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('更新失败：无法获取更新后的数据，请检查权限设置')
      }

      navigate('/role-permissions')
    } catch (error: any) {
      console.error('保存角色失败:', error)
      setError(error.message || '保存失败')
    } finally {
      setSaving(false)
    }
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

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <div className="text-red-400 text-xl font-mono mb-4">{error}</div>
          <Link
            to="/role-permissions"
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-black font-bold rounded transition-colors font-mono"
          >返回角色列表</Link>
        </div>
      </div>
    )
  }

  if (!role) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <div className="text-red-400 text-xl font-mono mb-4">角色不存在</div>
          <Link
            to="/role-permissions"
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-black font-bold rounded transition-colors font-mono"
          >
            返回角色列表
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-green-300 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl sm:text-2xl font-bold text-green-400 font-mono truncate">
              编辑角色 - {role.name}
            </h1>
            <Link
              to="/role-permissions"
              className="flex items-center text-green-400 hover:text-green-300 transition-colors flex-shrink-0 font-mono"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              返回
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-400/60 rounded text-red-200 text-sm font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Basic Info */}
          <div className="bg-gray-900/50 border border-green-400/50 rounded p-4 sm:p-6">
            <h2 className="text-lg font-bold text-green-400 font-mono mb-3 sm:mb-4">基本信息</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-green-300 text-sm font-mono mb-2">
                  角色名称 *
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400/70 w-4 h-4" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="w-full pl-10 pr-4 py-2 sm:py-3 bg-black border border-green-400/30 rounded text-green-200 placeholder-green-700 focus:outline-none focus:border-green-400 focus:bg-gray-900/30 font-mono text-sm transition-all"
                    placeholder="请输入角色名称"
                  />
                </div>
              </div>


            </div>
          </div>

          {/* Permissions */}
          {role && role.name !== SUPER_ADMIN_ROLE && (
            <div className="bg-gray-900/50 border border-green-400/50 rounded p-4 sm:p-6">
              <h2 className="text-lg font-bold text-green-400 font-mono mb-3 sm:mb-4">权限设置</h2>
              
              <div className="space-y-3">
                <div className="text-green-300 font-mono text-sm mb-4">
                  选择该角色可以访问的Dashboard模块：
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {DASHBOARD_MODULES.map((module) => (
                    <label key={module.id} className="flex flex-col items-start gap-2 p-3 border border-green-400/20 rounded transition-colors cursor-pointer hover:bg-gray-800/30">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(module.permission)}
                          onChange={() => togglePermission(module.permission)}
                          className="w-4 h-4 text-green-600 bg-black border-green-400 rounded focus:ring-green-500 focus:ring-2"
                        />
                        <div className="text-green-300 font-mono text-sm font-medium">
                          {module.name}
                        </div>
                      </div>
                      <div className="text-green-600 font-mono text-xs ml-6">
                        {module.description}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* 超级管理员特殊提示 */}
          {role && role.name === SUPER_ADMIN_ROLE && (
            <div className="bg-gray-900/50 border border-green-400/50 rounded p-4 sm:p-6">
              <h2 className="text-lg font-bold text-green-400 font-mono mb-3 sm:mb-4">权限设置</h2>
              <div className="p-4 bg-yellow-900/30 border border-yellow-400/60 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-yellow-400" />
                  <span className="text-yellow-400 font-mono font-bold">超级管理员</span>
                </div>
                <p className="text-yellow-300 font-mono text-sm">
                  超级管理员自动拥有系统所有权限，可以访问所有Dashboard模块，无需手动设置。
                </p>
              </div>
            </div>
          )}



          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 px-4 py-2 sm:py-3 bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:opacity-50 text-black font-medium rounded transition-all font-mono text-sm"
            >
              <Save className="w-4 h-4" />
              {saving ? '保存中...' : '保存'}
            </button>
            <Link
              to="/role-permissions"
              className="flex items-center justify-center gap-2 px-4 py-2 sm:py-3 border border-gray-500 hover:border-gray-400 hover:bg-gray-800/30 text-gray-300 font-medium rounded transition-all font-mono text-sm"
            >
              <X className="w-4 h-4" />
              取消
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}