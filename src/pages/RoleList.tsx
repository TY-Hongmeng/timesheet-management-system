import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Shield, Users, Plus, Edit, AlertTriangle, Trash2, X, ArrowLeft, Search } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { hasPermission, PERMISSIONS } from '../utils/permissions'
import { formatDate } from '../utils/format'
import type { UserRole } from '../lib/supabase'

interface RoleWithUserCount extends UserRole {
  user_count: number
}

const RoleList: React.FC = () => {
  const { user } = useAuth()
  const [roles, setRoles] = useState<RoleWithUserCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; role: RoleWithUserCount | null }>({ show: false, role: null })
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    document.title = '权限管理 - 工时管理系统'
    if (user && user.role?.permissions) {
      if (!hasPermission(user, PERMISSIONS.ROLE_MANAGE)) {
        setError('您没有权限访问角色管理页面')
        setLoading(false)
        return
      }
      fetchRoles()
    }
  }, [user])

  const fetchRoles = async () => {
    try {
      // 获取所有角色
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false })

      if (rolesError) throw rolesError

      // 获取所有用户的角色统计
      const { data: userCounts, error: countError } = await supabase
        .from('users')
        .select('role_id')

      if (countError) {
        console.error('获取用户统计失败:', countError)
        // 如果统计失败，设置默认值为0
        const rolesWithCount = (rolesData || []).map(role => ({
          ...role,
          user_count: 0
        }))
        setRoles(rolesWithCount)
        return
      }

      // 统计每个角色的用户数量
      const roleCountMap = new Map<string, number>()
      userCounts?.forEach(user => {
        const count = roleCountMap.get(user.role_id) || 0
        roleCountMap.set(user.role_id, count + 1)
      })

      // 合并角色数据和用户数量
      const rolesWithCount = (rolesData || []).map(role => ({
        ...role,
        user_count: roleCountMap.get(role.id) || 0
      }))

      setRoles(rolesWithCount)
    } catch (error) {
      console.error('获取角色列表失败:', error)
      setError('获取角色列表失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const getPermissionCount = (permissions: string[]) => {
    return permissions?.length || 0
  }



  const handleDeleteRole = (role: RoleWithUserCount) => {
    setDeleteConfirm({ show: true, role })
  }

  const confirmDeleteRole = async () => {
    if (!deleteConfirm.role) return

    const role = deleteConfirm.role
    
    // 检查是否有用户正在使用该角色
    if (role.user_count > 0) {
      setError(`无法删除角色 "${role.name}"，该角色正被 ${role.user_count} 个用户使用`)
      setDeleteConfirm({ show: false, role: null })
      return
    }

    setDeleting(true)
    try {
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', role.id)

      if (deleteError) throw deleteError

      // 删除成功，刷新角色列表
      await fetchRoles()
      setDeleteConfirm({ show: false, role: null })
      setError('') // 清除之前的错误信息
    } catch (error) {
      setError('删除角色失败，请重试')
    } finally {
      setDeleting(false)
    }
  }

  const cancelDelete = () => {
    setDeleteConfirm({ show: false, role: null })
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
            to="/dashboard"
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-black font-bold rounded transition-colors font-mono"
          >
            返回首页
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-green-400 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-green-400 mr-3" />
              <h1 className="text-4xl font-bold text-green-400 font-mono">权限管理</h1>
            </div>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-green-300 hover:text-green-200 rounded-lg font-mono transition-all duration-200 shadow-md hover:shadow-lg border border-gray-600 hover:border-green-500/50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">返回控制台</span>
              <span className="sm:hidden">返回</span>
            </Link>
          </div>
          <div className="h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent"></div>
        </div>

        {/* Search and Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-400/60" />
              <input
                type="text"
                placeholder="搜索角色名称..."
                className="w-full bg-black border border-green-400/30 rounded px-10 py-2 text-green-400 placeholder-green-400/60 focus:outline-none focus:border-green-400"
              />
            </div>
          </div>
          <Link
            to="/role-permissions/create"
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-black font-bold rounded transition-colors font-mono"
          >
            <Plus className="w-4 h-4" />
            创建角色
          </Link>
        </div>



        {/* Roles Table */}
        <div className="bg-gray-900 border border-green-400 rounded-lg overflow-hidden">
          
          {roles.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 font-mono">暂无角色数据</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-green-900/30">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-green-400 uppercase tracking-wider font-mono">
                      角色名称
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-green-400 uppercase tracking-wider font-mono">
                      用户数量
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-green-400 uppercase tracking-wider font-mono">
                      创建时间
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-green-400 uppercase tracking-wider font-mono">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-green-800">
                  {roles.map((role) => (
                    <tr key={role.id} className="hover:bg-green-900/10 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 font-mono font-medium">{role.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 font-mono">{role.user_count}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-green-300 font-mono text-sm">
                          {formatDate(role.created_at)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/role-permissions/edit/${role.id}`}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-gray-700 rounded transition-colors"
                            title="编辑角色"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDeleteRole(role)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded transition-colors"
                            title="删除角色"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        {deleteConfirm.show && deleteConfirm.role && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-red-400 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-red-400 font-mono">确认删除角色</h3>
                <button
                  onClick={cancelDelete}
                  className="text-gray-400 hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-green-300 font-mono mb-2">
                  您确定要删除角色 <span className="text-red-400 font-bold">"{deleteConfirm.role.name}"</span> 吗？
                </p>
                <div className="bg-gray-800 border border-gray-600 rounded p-3 mb-3">
                  <p className="text-green-300 font-mono text-sm">
                    使用用户数：{deleteConfirm.role.user_count}
                  </p>
                </div>
                {deleteConfirm.role.user_count > 0 && (
                  <div className="bg-red-900 border border-red-400 rounded p-3 mb-3">
                    <p className="text-red-300 font-mono text-sm">
                      ⚠️ 该角色正被 {deleteConfirm.role.user_count} 个用户使用，无法删除！
                    </p>
                  </div>
                )}
                <p className="text-gray-400 font-mono text-sm">
                  此操作不可撤销，请谨慎操作。
                </p>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded transition-colors font-mono"
                  disabled={deleting}
                >
                  取消
                </button>
                <button
                  onClick={confirmDeleteRole}
                  disabled={deleting || deleteConfirm.role.user_count > 0}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded transition-colors font-mono"
                >
                  {deleting ? '删除中...' : '确认删除'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RoleList