import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, X, Eye, EyeOff, Shield } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { SUPER_ADMIN_ROLE, DASHBOARD_MODULES } from '@/utils/permissions'

interface RoleFormData {
  name: string
  permissions: string[]
}



export default function RoleCreate() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    permissions: []
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)









  const toggleModulePermission = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }))
  }



  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-green-400 text-xl animate-pulse font-mono">
            加载中...
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="bg-gray-900 border border-green-400 p-8 rounded-lg max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-green-400 mb-2 font-mono">未登录</h2>
          <p className="text-green-300 mb-6 font-mono">请先登录后再访问此页面</p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError('角色名称不能为空')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      // 检查角色名称是否已存在
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('name', formData.name.trim())
        .single()

      if (existingRole) {
        setError('角色名称已存在，请使用其他名称')
        setIsSaving(false)
        return
      }

      // 防止创建重复的超级管理员角色
      if (formData.name.trim() === SUPER_ADMIN_ROLE) {
        setError('超级管理员角色已存在，无法重复创建')
        setIsSaving(false)
        return
      }

      // 创建角色
      const { error: createError } = await supabase
        .from('user_roles')
        .insert({
          name: formData.name.trim(),
          permissions: formData.permissions
        })

      if (createError) {
        setError('创建角色失败，请重试')
        return
      }
      
      setError('')
      navigate('/roles')
    } catch (error) {
      setError('创建角色时发生错误，请重试')
    } finally {
      setIsSaving(false)
    }
  }



  return (
    <div className="min-h-screen bg-black text-green-300 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl sm:text-2xl font-bold text-green-400 font-mono truncate">
              创建角色
            </h1>
            <button
              onClick={() => navigate('/role-permissions')}
              className="flex items-center text-green-400 hover:text-green-300 transition-colors flex-shrink-0 font-mono"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              返回
            </button>
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
                        onChange={() => toggleModulePermission(module.permission)}
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

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving || !formData.name.trim()}
              className="flex items-center justify-center gap-2 px-4 py-2 sm:py-3 bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:opacity-50 text-black font-medium rounded transition-all font-mono text-sm"
            >
              <Save className="w-4 h-4" />
              {isSaving ? '创建中...' : '创建角色'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/role-permissions')}
              className="flex items-center justify-center gap-2 px-4 py-2 sm:py-3 border border-gray-500 hover:border-gray-400 hover:bg-gray-800/30 text-gray-300 font-medium rounded transition-all font-mono text-sm"
            >
              <X className="w-4 h-4" />
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}