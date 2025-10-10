import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Company, UserRole } from '@/lib/supabase'
import { User, Plus, Edit, Trash2, Search, Save, X, Shield, Phone, CreditCard, Building, UserCheck, AlertTriangle, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { checkUserPermission, PERMISSIONS, isSuperAdmin } from '../utils/permissions'

interface UserData {
  id: string
  phone: string
  id_card: string
  name: string
  company_id: string
  role_id: string
  production_line?: string
  is_active: boolean
  created_at: string
  company?: { name: string }
  role?: { name: string, permissions: string[] }
  // 删除时的数据转移相关字段
  pendingRecords?: any[]
  sameRoleUsers?: { id: string; name: string; phone: string }[]
  userNames?: string[]
}

interface UserFormData {
  phone: string
  id_card: string
  name: string
  company_id: string
  role_id: string
  production_line?: string
  is_active: boolean
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [roles, setRoles] = useState<UserRole[]>([])
  const [productionLines, setProductionLines] = useState<string[]>([])
  const [showProductionLine, setShowProductionLine] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [formData, setFormData] = useState<UserFormData>({
    phone: '',
    id_card: '',
    name: '',
    company_id: '',
    role_id: '',
    production_line: '',
    is_active: false // 新用户默认为禁用状态
  })
  const [formLoading, setFormLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null)
  const [showRoleChangeConfirm, setShowRoleChangeConfirm] = useState(false)
  const [roleChangeData, setRoleChangeData] = useState<{
    user: UserData | null
    oldRole: UserRole | null
    newRole: UserRole | null
    pendingRecords: any[]
    sameRoleUsers: { id: string; name: string; phone: string }[]
    userNames: string[]
  }>({ user: null, oldRole: null, newRole: null, pendingRecords: [], sameRoleUsers: [], userNames: [] })
  const [selectedRoleChangeReceiver, setSelectedRoleChangeReceiver] = useState('')
  const [showProductionLineChangeConfirm, setShowProductionLineChangeConfirm] = useState(false)
  const [productionLineChangeData, setProductionLineChangeData] = useState<{
    user: UserData | null
    oldProductionLine: string
    newProductionLine: string
    role: UserRole | null
    pendingRecords: any[]
    sameRoleUsers: { id: string; name: string; phone: string }[]
    userNames: string[]
  }>({ user: null, oldProductionLine: '', newProductionLine: '', role: null, pendingRecords: [], sameRoleUsers: [], userNames: [] })
  const [selectedProductionLineChangeReceiver, setSelectedProductionLineChangeReceiver] = useState('')
  const [error, setError] = useState('')

  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  // 检查用户认证状态
  useEffect(() => {
    if (!authLoading && !user) {
      console.log('用户未登录，重定向到登录页面')
      navigate('/login')
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
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      if (!user) {
        console.error('fetchData: 用户信息不存在')
        toast.error('用户信息不存在')
        return
      }

      // 获取用户列表 - 添加公司权限控制
      let usersQuery = supabase
        .from('users')
        .select(`
          *,
          company:companies(name),
          role:user_roles(name, permissions)
        `)
        // 显示所有激活的用户

      // 如果不是超级管理员，只能查看自己公司的用户
      if (!isSuperAdmin(user.role)) {
        if (!user.company?.id) {
          console.error('fetchData: 用户没有关联的公司ID')
          toast.error('用户没有关联的公司，请联系管理员')
          return
        }
        usersQuery = usersQuery.eq('company_id', user.company.id)
        console.log('fetchData: 添加公司过滤条件', user.company.id)
      } else {
        console.log('fetchData: 超级管理员，不添加公司过滤')
      }

      // 直接执行查询，不使用 safeQuery 包装
      const { data: usersData, error: usersError } = await usersQuery
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      // 获取公司列表 - 添加公司权限控制
      let companiesQuery = supabase
        .from('companies')
        .select('*')

      // 如果不是超级管理员，只能看到自己的公司
      if (!isSuperAdmin(user.role)) {
        companiesQuery = companiesQuery.eq('id', user.company?.id)
      }

      const { data: companiesData, error: companiesError } = await companiesQuery
        .order('name')

      if (companiesError) throw companiesError

      // 获取角色列表
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .order('name')

      if (rolesError) throw rolesError

      setUsers(usersData || [])
      setCompanies(companiesData || [])
      setRoles(rolesData || [])
      
      // 如果不是超级管理员，自动设置表单的公司为用户所属公司
      if (!isSuperAdmin(user.role) && user.company?.id) {
        setFormData(prev => ({
          ...prev,
          company_id: user.company.id
        }))
      }
    } catch (error) {
      console.error('获取数据失败:', error)
      setError('获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setError('')

    try {
      // 权限验证：非超级管理员只能操作自己公司的用户
      if (!isSuperAdmin(user.role)) {
        if (formData.company_id !== user.company?.id) {
          toast.error('您只能操作自己公司的用户')
          setFormLoading(false)
          return
        }
        
        // 编辑时还需要验证被编辑的用户是否属于同一公司
        if (editingUser && editingUser.company_id !== user.company?.id) {
          toast.error('您只能编辑自己公司的用户')
          setFormLoading(false)
          return
        }
      }

      if (editingUser) {
        // 检查是否为班长/段长角色修改或生产线变更
        const oldRole = roles.find(role => role.id === editingUser.role_id)
        const newRole = roles.find(role => role.id === formData.role_id)
        const isProductionLineChanged = editingUser.production_line !== formData.production_line
        
        // 如果原来是班长或段长，且角色发生了变化，需要检查待审核数据
        if ((oldRole?.name === '班长' || oldRole?.name === '段长') && oldRole.id !== newRole?.id) {
          console.log('检测到班长/段长角色修改，检查待审核数据...')
          
          // 检查是否有待审核的工时记录
          let pendingRecordsQuery = supabase
            .from('timesheet_records')
            .select('id, user_id, status')
            .in('status', ['pending', '待审核', 'submitted', '已提交'])

          if (oldRole.name === '班长') {
            pendingRecordsQuery = pendingRecordsQuery.eq('supervisor_id', editingUser.id)
          } else if (oldRole.name === '段长') {
            pendingRecordsQuery = pendingRecordsQuery.eq('section_chief_id', editingUser.id)
          }

          const { data: pendingRecords, error: pendingError } = await pendingRecordsQuery

          if (pendingError) {
            console.error('检查待审核数据失败:', pendingError)
            throw new Error('检查待审核数据失败，请稍后重试')
          }

          if (pendingRecords && pendingRecords.length > 0) {
            // 查询详细信息并过滤有效记录
            const { data: detailedRecords } = await supabase
              .from('timesheet_records')
              .select(`
                id, user_id, status, work_date,
                user:users!user_id(id, name, is_active)
              `)
              .in('id', pendingRecords.map(r => r.id))
            
            const validRecords = detailedRecords?.filter(record => {
              const user = record.user as any
              const isUserActive = user?.is_active
              const hasValidDate = record.work_date && new Date(record.work_date) <= new Date()
              return isUserActive && hasValidDate
            }) || []

            if (validRecords.length > 0) {
              // 查找同生产线的其他相同角色用户作为接收人
              const { data: sameRoleUsers } = await supabase
                .from('users')
                .select('id, name, phone')
                .eq('company_id', editingUser.company_id)
                .eq('production_line', editingUser.production_line)
                .eq('role_id', editingUser.role_id)
                .eq('is_active', true)
                .neq('id', editingUser.id)

              if (!sameRoleUsers || sameRoleUsers.length === 0) {
                const userNames = [...new Set(validRecords.map(r => (r.user as any)?.name))].join('、')
                console.log('角色修改 - 没有找到接收人，显示错误提示')
                console.log('🚨 ERROR: 没有找到合适的接收人 - 角色修改')
                const errorMsg = `无法修改${oldRole.name}角色：还有${validRecords.length}条待审核的工时记录需要处理，但该生产线没有其他激活的${oldRole.name}可以接收这些数据。涉及员工：${userNames}。请先在该生产线添加其他${oldRole.name}或手动处理这些待审核数据。`
                console.log('🚨 ERROR MESSAGE:', errorMsg)
                toast.error(errorMsg)
                console.log('🚨 Toast.error 已调用')
                setFormLoading(false)
                return
              }

              // 设置角色修改确认对话框数据
              const userNames = [...new Set(validRecords.map(r => (r.user as any)?.name))]
              setRoleChangeData({
                user: editingUser,
                oldRole,
                newRole,
                pendingRecords: validRecords,
                sameRoleUsers: sameRoleUsers || [],
                userNames
              })
              setShowRoleChangeConfirm(true)
              setFormLoading(false)
              return
            }
          }
        }
        
        // 如果是班长或段长且生产线发生变更，需要检查并转移待审核数据
        if ((oldRole?.name === '班长' || oldRole?.name === '段长') && isProductionLineChanged) {
          console.log('检测到班长/段长生产线变更，检查待审核数据...')
          console.log('生产线变更详情:', {
            oldProductionLine: editingUser.production_line,
            newProductionLine: formData.production_line,
            role: oldRole.name,
            userId: editingUser.id
          })
          
          // 检查是否有待审核的工时记录
          let pendingRecordsQuery = supabase
            .from('timesheet_records')
            .select('id, user_id, status')

          if (oldRole.name === '班长') {
            pendingRecordsQuery = pendingRecordsQuery
              .eq('supervisor_id', editingUser.id)
              .in('status', ['pending', '待审核', 'submitted', '已提交'])
          } else if (oldRole.name === '段长') {
            pendingRecordsQuery = pendingRecordsQuery
              .eq('section_chief_id', editingUser.id)
              .in('status', ['approved'])
          }

          console.log('生产线变更 - 待审核数据查询条件:', {
            role: oldRole.name,
            userId: editingUser.id,
            statusFilter: oldRole.name === '班长' ? ['pending', '待审核', 'submitted', '已提交'] : ['approved']
          })

          const { data: pendingRecords, error: pendingError } = await pendingRecordsQuery

          console.log('生产线变更 - 待审核数据查询结果:', { pendingRecords, pendingError })

          if (pendingError) {
            console.error('检查待审核数据失败:', pendingError)
            throw new Error('检查待审核数据失败，请稍后重试')
          }

          if (pendingRecords && pendingRecords.length > 0) {
            console.log('生产线变更 - 找到待审核记录，查询详细信息...')
            // 查询详细信息并过滤有效记录
            const { data: detailedRecords } = await supabase
              .from('timesheet_records')
              .select(`
                id, user_id, status, work_date,
                user:users!user_id(id, name, is_active)
              `)
              .in('id', pendingRecords.map(r => r.id))
            
            console.log('生产线变更 - 详细记录查询结果:', detailedRecords)
            
            const validRecords = detailedRecords?.filter(record => {
              const user = record.user as any
              const isUserActive = user?.is_active
              const hasValidDate = record.work_date && new Date(record.work_date) <= new Date()
              console.log(`生产线变更 - 记录 ${record.id}: 用户激活=${isUserActive}, 有效日期=${hasValidDate}`)
              return isUserActive && hasValidDate
            }) || []

            console.log('生产线变更 - 有效记录数量:', validRecords.length)

            if (validRecords.length > 0) {
              console.log('生产线变更 - 查找原生产线接收人...')
              // 查找原生产线中相同角色的用户作为接收人
              const { data: sameRoleUsers, error: sameRoleError } = await supabase
                .from('users')
                .select('id, name, phone')
                .eq('company_id', editingUser.company_id)
                .eq('production_line', editingUser.production_line) // 原生产线
                .eq('role_id', editingUser.role_id)
                .eq('is_active', true)
                .neq('id', editingUser.id)

              console.log('生产线变更 - 接收人查询结果:', { sameRoleUsers, sameRoleError })
              console.log('生产线变更 - 查询条件:', {
                company_id: editingUser.company_id,
                production_line: editingUser.production_line,
                role_id: editingUser.role_id,
                exclude_user_id: editingUser.id
              })

              if (!sameRoleUsers || sameRoleUsers.length === 0) {
              const userNames = [...new Set(validRecords.map(r => (r.user as any)?.name))].join('、')
              console.log('生产线变更 - 没有找到接收人，显示错误提示')
              console.log('🚨 ERROR: 没有找到合适的接收人 - 生产线变更')
              const errorMsg = `无法更换生产线：还有${validRecords.length}条待审核的工时记录需要处理，但原生产线(${editingUser.production_line})没有其他激活的${oldRole.name}可以接收这些数据。涉及员工：${userNames}。请先在原生产线添加其他${oldRole.name}或手动处理这些待审核数据。`
              console.log('🚨 ERROR MESSAGE:', errorMsg)
              toast.error(errorMsg)
              console.log('🚨 Toast.error 已调用')
              setFormLoading(false)
              return
            }

              console.log('生产线变更 - 找到接收人，设置确认对话框')
              // 设置生产线变更确认对话框数据
              const userNames = [...new Set(validRecords.map(r => (r.user as any)?.name))]
              setProductionLineChangeData({
                user: editingUser,
                oldProductionLine: editingUser.production_line,
                newProductionLine: formData.production_line,
                role: oldRole,
                pendingRecords: validRecords,
                sameRoleUsers: sameRoleUsers || [],
                userNames
              })
              setShowProductionLineChangeConfirm(true)
              setFormLoading(false)
              console.log('生产线变更 - 确认对话框已设置，函数返回')
              return
            } else {
              console.log('生产线变更 - 没有有效的待审核记录，继续更新用户')
            }
          } else {
            console.log('生产线变更 - 没有找到待审核记录，继续更新用户')
          }
        }
        
        // 更新用户
        console.log('正在更新用户:', editingUser.id, '新数据:', formData)
        
        const { data, error } = await supabase
          .from('users')
          .update({
            phone: formData.phone,
            id_card: formData.id_card,
            name: formData.name,
            company_id: formData.company_id,
            role_id: formData.role_id,
            production_line: formData.production_line || null,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingUser.id)
          .select('*')

        console.log('更新操作详情:', { data, error, formData, userId: editingUser.id })
        
        if (error) {
          console.error('更新用户失败:', error)
          throw error
        }
        
        if (!data || data.length === 0) {
          console.error('更新操作没有返回数据，这通常表示权限问题或记录不存在')
          throw new Error('更新失败：无法获取更新后的数据，请检查权限设置')
        }
        
        console.log('更新成功，返回数据:', data)
      } else {
        // 检查手机号和身份证号是否已存在
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .or(`phone.eq.${formData.phone},id_card.eq.${formData.id_card}`)
          .single()

        if (existingUser) {
          throw new Error('手机号或身份证号已存在')
        }

        // 创建新用户（仅创建用户信息，不创建认证账号）
        // 为新用户生成默认密码哈希（默认密码：123456）
        const defaultPassword = '123456'
        const passwordHash = defaultPassword // 使用123456作为密码哈希
        
        const { data, error } = await supabase
          .from('users')
          .insert([{
            phone: formData.phone,
            password_hash: passwordHash,
            id_card: formData.id_card,
            name: formData.name,
            company_id: formData.company_id,
            role_id: formData.role_id,
            production_line: formData.production_line || null,
            is_active: formData.is_active
          }])
          .select('*')

        if (error) {
          console.error('创建用户失败:', error)
          throw error
        }
        
        if (!data || data.length === 0) {
          console.error('创建操作没有返回数据，这通常表示权限问题')
          throw new Error('创建失败：无法获取创建后的数据，请检查权限设置')
        }
        
        console.log('创建成功，返回数据:', data)
      }

      // 显示成功消息
      const successMessage = editingUser ? '用户信息更新成功！' : '用户创建成功！'
      console.log(successMessage)
      
      // 重新获取用户列表以确保数据同步
      console.log('重新获取用户列表...')
      await fetchData()
      resetForm()
      console.log('操作完成，表单已重置')
    } catch (error: any) {
      console.error('保存用户信息失败:', error)
      setError(error.message || '保存失败')
    } finally {
      setFormLoading(false)
    }
  }

  const handleEdit = (userData: UserData) => {
    // 权限验证：非超级管理员只能编辑自己公司的用户
    if (!isSuperAdmin(user.role)) {
      if (userData.company_id !== user.company?.id) {
        toast.error('您只能编辑自己公司的用户')
        return
      }
    }

    setEditingUser(userData)
    setFormData({
      phone: userData.phone,
      id_card: userData.id_card,
      name: userData.name,
      company_id: userData.company_id,
      role_id: userData.role_id,
      production_line: userData.production_line || '',
      is_active: userData.is_active
    })
    
    // 检查是否需要显示生产线选择
    const userRole = roles.find(role => role.id === userData.role_id)
    const shouldShowProductionLine = userRole?.name === '班长' || userRole?.name === '段长'
    setShowProductionLine(shouldShowProductionLine)
    
    // 如果需要显示生产线且有公司ID，获取生产线数据
    if (shouldShowProductionLine && userData.company_id) {
      fetchProductionLines(userData.company_id)
    }
    
    setShowForm(true)
  }

  const handleDelete = async (userData: UserData) => {
    console.log('handleDelete 函数被调用，用户数据:', userData)
    console.log('当前登录用户:', user)
    console.log('用户角色:', user?.role)
    
    try {
      // 权限验证：非超级管理员只能删除自己公司的用户
      if (!isSuperAdmin(user.role)) {
        console.log('非超级管理员，检查公司权限')
        if (userData.company_id !== user.company?.id) {
          console.log('权限检查失败：用户公司ID不匹配', userData.company_id, user.company?.id)
          toast.error('您只能删除自己公司的用户')
          return
        }
        console.log('权限检查通过')
      } else {
        console.log('超级管理员，跳过公司权限检查')
      }

      // 检查是否为超级管理员角色，超级管理员不能被删除
      const userRole = roles.find(role => role.id === userData.role_id)
      console.log('用户角色信息:', userRole)
      if (userRole && userRole.name === '超级管理员') {
        console.log('阻止删除超级管理员')
        toast.error('超级管理员角色不能被删除，这是系统保护机制')
        return
      }

    // 对于班长和段长，需要检查是否有待审核的工时记录
    // 生产经理和财务角色直接删除，不需要特殊处理
    if (userRole && (userRole.name === '班长' || userRole.name === '段长')) {
      try {
        console.log('检查班长/段长的待审核数据')
        
        // 首先查询所有相关的工时记录，检查实际状态值
        let allRecordsQuery = supabase
          .from('timesheet_records')
          .select('id, user_id, status')

        if (userRole.name === '班长') {
          allRecordsQuery = allRecordsQuery.eq('supervisor_id', userData.id)
        } else if (userRole.name === '段长') {
          allRecordsQuery = allRecordsQuery.eq('section_chief_id', userData.id)
        }

        const { data: allRecords, error: allRecordsError } = await allRecordsQuery
        console.log('所有相关工时记录:', allRecords, '错误:', allRecordsError)
        
        if (allRecords && allRecords.length > 0) {
          const statusCounts = allRecords.reduce((acc, record) => {
            acc[record.status] = (acc[record.status] || 0) + 1
            return acc
          }, {})
          console.log('状态统计:', statusCounts)
        }
        
        // 检查是否有待审核的工时记录 - 根据角色使用不同的状态值
        let pendingRecordsQuery = supabase
          .from('timesheet_records')
          .select('id, user_id, status')

        if (userRole.name === '班长') {
          // 班长需要审核的是已提交但未审核的记录
          pendingRecordsQuery = pendingRecordsQuery
            .in('status', ['pending', '待审核', 'submitted', '已提交'])
            .eq('supervisor_id', userData.id)
        } else if (userRole.name === '段长') {
          // 段长需要审核的是班长已审核但段长未审核的记录
          console.log('=== 段长删除调试开始 ===')
          console.log('段长用户信息:', { id: userData.id, name: userData.name, production_line: userData.production_line })
          
          // 先查询该段长相关的所有工时记录（不限状态）
          const { data: allRecords, error: allRecordsError } = await supabase
            .from('timesheet_records')
            .select('id, user_id, status, section_chief_id, supervisor_id, work_date, created_at')
            .eq('section_chief_id', userData.id)
          
          console.log('该段长的所有相关记录:', allRecords)
          console.log('查询所有记录的错误:', allRecordsError)
          
          if (allRecords) {
            console.log('记录总数:', allRecords.length)
            const statusCounts = allRecords.reduce((acc, record) => {
              acc[record.status] = (acc[record.status] || 0) + 1
              return acc
            }, {})
            console.log('各状态记录数量:', statusCounts)
            
            // 显示每条记录的详细信息
            allRecords.forEach(record => {
              console.log(`记录 ${record.id}: status=${record.status}, section_chief_id=${record.section_chief_id}, user_id=${record.user_id}, work_date=${record.work_date}`)
            })
          }
          
          // 现在执行原来的查询逻辑
          console.log('执行段长待审核记录查询，条件: status=approved, section_chief_id=', userData.id)
          pendingRecordsQuery = pendingRecordsQuery
            .eq('status', 'approved')
            .eq('section_chief_id', userData.id)
        }

        const { data: pendingRecords, error } = await pendingRecordsQuery

        console.log('待审核数据查询结果:', pendingRecords, '错误:', error)
        console.log('查询条件 - 角色:', userRole.name, '用户ID:', userData.id)
        
        if (userRole.name === '段长') {
          console.log('=== 段长待审核查询结果分析 ===')
          console.log('查询到的待审核记录数量:', pendingRecords?.length || 0)
          if (pendingRecords && pendingRecords.length > 0) {
            console.log('待审核记录详情:')
            pendingRecords.forEach(record => {
              console.log(`  记录 ${record.id}: status=${record.status}, user_id=${record.user_id}`)
            })
          } else {
            console.log('没有查询到待审核记录')
          }
          console.log('=== 段长删除调试结束 ===')
        }
        if (error) {
          console.error('检查待审核数据失败:', error)
          toast.error('检查待审核数据失败，请稍后重试')
          return
        }

        if (pendingRecords && pendingRecords.length > 0) {
          console.log('发现待审核数据，开始处理...', '数量:', pendingRecords.length)
          console.log('待审核记录详情:', pendingRecords.map(r => ({ id: r.id, status: r.status, user_id: r.user_id })))
          
          // 查询这些待审核记录的详细信息，包括用户信息和日期
          const { data: detailedRecords, error: detailError } = await supabase
            .from('timesheet_records')
            .select(`
              id, user_id, status, work_date, created_at, updated_at,
              user:users!user_id(id, name, is_active)
            `)
            .in('id', pendingRecords.map(r => r.id))
          
          console.log('待审核记录详细信息:', detailedRecords)
          
          if (detailError) {
            console.error('查询记录详情失败:', detailError)
          }
          
          // 检查记录有效性：过滤掉用户已被删除或无效的记录
          const validRecords = detailedRecords?.filter(record => {
            const user = record.user as any
            const isUserActive = user?.is_active
            const hasValidDate = record.work_date && new Date(record.work_date) <= new Date()
            console.log(`记录 ${record.id}: 用户激活=${isUserActive}, 有效日期=${hasValidDate}, 用户=${user?.name}`)
            return isUserActive && hasValidDate
          }) || []
          
          console.log('有效的待审核记录数量:', validRecords.length)
          console.log('有效记录详情:', validRecords)
          
          // 如果没有有效的待审核记录，继续删除流程
          if (validRecords.length === 0) {
            console.log('所有待审核记录都无效，继续删除流程')
            // 建议清理无效记录
            const invalidRecordIds = pendingRecords.filter(r => !validRecords.find(v => v.id === r.id)).map(r => r.id)
            if (invalidRecordIds.length > 0) {
              console.warn('发现无效的待审核记录，建议清理:', invalidRecordIds)
            }
          } else {
            // 使用有效记录继续处理
            const validPendingRecords = validRecords
            
            // 获取涉及的用户名称
            const userIds = [...new Set(validPendingRecords.map(record => record.user_id))]
            console.log('涉及的用户ID:', userIds)
            
            const { data: usersData } = await supabase
              .from('users')
              .select('name')
              .in('id', userIds)
            
            const userNames = usersData ? usersData.map(u => u.name) : []
            console.log('涉及的用户名称:', userNames)
            
            // 查找同生产线的其他相同角色用户作为接收人
            console.log('查找同生产线同角色用户，参数:', {
              company_id: userData.company_id,
              production_line: userData.production_line,
              role_id: userData.role_id,
              exclude_user_id: userData.id
            })
            
            const { data: sameRoleUsers, error: sameRoleError } = await supabase
              .from('users')
              .select('id, name, phone')
              .eq('company_id', userData.company_id)
              .eq('production_line', userData.production_line)
              .eq('role_id', userData.role_id)
              .eq('is_active', true)
              .neq('id', userData.id)

            console.log('同角色用户查询结果:', sameRoleUsers, '错误:', sameRoleError)

            if (sameRoleError) {
              console.error('查找同角色用户失败:', sameRoleError)
              toast.error('查找接收人失败，请稍后重试')
              return
            }

            if (!sameRoleUsers || sameRoleUsers.length === 0) {
              console.log('没有找到合适的接收人，显示错误提示')
              console.log('🚨 ERROR: 没有找到合适的接收人 - 用户删除')
              const errorMsg = `无法删除${userRole.name}：还有${validPendingRecords.length}条待审核的工时记录需要处理，但该生产线没有其他激活的${userRole.name}可以接收这些数据。涉及员工：${userNames.join('、')}。请先在该生产线添加其他${userRole.name}或手动处理这些待审核数据。`
              console.log('🚨 ERROR MESSAGE:', errorMsg)
              toast.error(errorMsg)
              console.log('🚨 Toast.error 已调用')
              return
            }

            console.log('找到接收人，准备设置删除确认对话框')
            // 存储待转移的数据信息，在删除确认对话框中处理
            setUserToDelete({...userData, role: userRole, pendingRecords: validPendingRecords, sameRoleUsers, userNames})
            console.log('设置userToDelete完成，准备显示删除确认对话框')
            setShowDeleteConfirm(true)
            console.log('删除确认对话框应该已显示')
            return
          }
        } else {
          console.log('没有发现待审核数据，继续删除流程')
        }
      } catch (error) {
        console.error('检查待审核数据时出错:', error)
        toast.error('检查待审核数据时出错，请稍后重试')
        return
      }
    }

    console.log('班长/段长没有待审核数据，直接显示删除确认对话框')
    // 对于员工、财务等其他角色，或者班长/段长没有待审核数据时，直接显示删除确认对话框
    console.log('显示删除确认对话框')
    setUserToDelete({...userData, role: userRole})
    console.log('设置userToDelete完成')
    setShowDeleteConfirm(true)
    console.log('删除确认对话框应该已显示')
    } catch (error: any) {
      console.error('handleDelete函数执行失败:', error)
      toast.error('操作失败：' + (error.message || '未知错误'))
    }
    console.log('handleDelete函数执行完成')
  }

  const [selectedReceiver, setSelectedReceiver] = useState('')

  const confirmDelete = async () => {
    if (!userToDelete) return

    try {
      console.log('正在删除用户:', userToDelete.id, userToDelete.name)
      
      // 使用userToDelete中已包含的角色信息
      const userRole = userToDelete.role
      
      // 如果是班长或段长且有待审核数据，先执行数据转移
      if (userToDelete.pendingRecords && userToDelete.pendingRecords.length > 0) {
        if (!selectedReceiver) {
          toast.error('请选择数据接收人')
          return
        }
        
        console.log('执行数据转移...')
        const fieldToUpdate = userRole?.name === '班长' ? 'supervisor_id' : 'section_chief_id'
        
        // 根据角色确定需要转移的记录状态
        const statusCondition = userRole?.name === '班长' 
          ? ['pending', '待审核', 'submitted', '已提交']
          : ['approved']
        
        const { error: transferError } = await supabase
          .from('timesheet_records')
          .update({ [fieldToUpdate]: selectedReceiver })
          .eq(fieldToUpdate, userToDelete.id)
          .in('status', statusCondition)

        if (transferError) {
          console.error('数据转移失败:', transferError)
          toast.error('数据转移失败，请稍后重试')
          return
        }
        
        const receiverName = userToDelete.sameRoleUsers?.find(u => u.id === selectedReceiver)?.name
        console.log(`数据转移成功：${userToDelete.pendingRecords.length}条记录转移给${receiverName}`)
      }
      
      // 使用事务性操作删除用户及相关数据
      console.log('开始事务性删除操作...')
      
      // 根据用户角色决定删除策略
      if (userRole?.name === '员工') {
        console.log('员工角色删除：保留历史数据但断开关联，彻底删除用户账户')
        
        // 第一步：断开timesheet_records表中的用户关联，保留历史工时记录
        console.log('断开工时记录中的用户关联...')
        const { error: timesheetUpdateError } = await supabase
          .from('timesheet_records')
          .update({ user_id: null })
          .eq('user_id', userToDelete.id)
        
        if (timesheetUpdateError) {
          console.error('断开工时记录用户关联失败:', timesheetUpdateError)
          throw new Error('断开工时记录关联失败：' + timesheetUpdateError.message)
        }
        
        // 第二步：断开approval_history表中的审核人关联，保留审批历史
        console.log('断开审批历史中的审核人关联...')
        const { error: approvalUpdateError } = await supabase
          .from('approval_history')
          .update({ approver_id: null })
          .eq('approver_id', userToDelete.id)
        
        if (approvalUpdateError) {
          console.error('断开审批历史审核人关联失败:', approvalUpdateError)
          throw new Error('断开审批历史关联失败：' + approvalUpdateError.message)
        }
        
        console.log('员工数据关联断开完成，准备删除用户账户')
        // 员工角色继续执行删除用户账户操作（不return，继续到下面的删除逻辑）
      } else {
        console.log('非员工角色删除：清理外键引用')
        // 第一步：清理timesheet_records表中的外键引用
        console.log('清理工时记录中的外键引用...')
        
        // 清理supervisor_id引用
        const { error: supervisorUpdateError } = await supabase
          .from('timesheet_records')
          .update({ supervisor_id: null })
          .eq('supervisor_id', userToDelete.id)
        
        if (supervisorUpdateError) {
          console.error('清理supervisor_id引用失败:', supervisorUpdateError)
          throw new Error('清理工时记录引用失败：' + supervisorUpdateError.message)
        }
        
        // 清理section_chief_id引用
        const { error: sectionChiefUpdateError } = await supabase
          .from('timesheet_records')
          .update({ section_chief_id: null })
          .eq('section_chief_id', userToDelete.id)
        
        if (sectionChiefUpdateError) {
          console.error('清理section_chief_id引用失败:', sectionChiefUpdateError)
          throw new Error('清理工时记录引用失败：' + sectionChiefUpdateError.message)
        }
        
        // 清理approval_history表中的approver_id引用
        const { error: approvalUpdateError } = await supabase
          .from('approval_history')
          .update({ approver_id: null })
          .eq('approver_id', userToDelete.id)
        
        if (approvalUpdateError) {
          console.error('清理审核历史引用失败:', approvalUpdateError)
          throw new Error('清理审核历史引用失败：' + approvalUpdateError.message)
        }
        
        console.log('外键引用清理完成')
      }
      
      // 第二步：在删除前更新所有历史记录中的姓名字段
      console.log('更新历史记录中的姓名字段...')
      const { error: updateNamesError } = await supabase.rpc('update_user_names_before_delete', {
        user_id_to_delete: userToDelete.id
      })
      
      if (updateNamesError) {
        console.error('更新姓名字段失败:', updateNamesError)
        throw new Error('更新历史记录姓名字段失败：' + updateNamesError.message)
      }
      
      console.log('历史记录姓名字段更新完成')
      
      // 第三步：硬删除用户记录
      console.log('执行硬删除用户...')
      const { data, error } = await supabase
        .from('users')
        .delete()
        .eq('id', userToDelete.id)
        .select('*')

      console.log('硬删除操作详情:', { data, error, userId: userToDelete.id })
      
      if (error) {
        console.error('硬删除用户失败:', error)
        throw error
      }
      
      console.log('硬删除成功:', userToDelete.name)
      
      // 显示成功消息
      if (userToDelete.pendingRecords && userToDelete.pendingRecords.length > 0) {
        const receiverName = userToDelete.sameRoleUsers?.find(u => u.id === selectedReceiver)?.name
        toast.success(`用户删除成功，已将${userToDelete.pendingRecords.length}条待审核工时记录转移给${receiverName}，历史记录已保留姓名信息`)
      } else {
        toast.success(`${userRole?.name || '用户'} ${userToDelete.name} 删除成功：用户账户已永久删除，历史记录已保留姓名信息`)
      }
      
      setShowDeleteConfirm(false)
      setUserToDelete(null)
      setSelectedReceiver('')
      await fetchData()
    } catch (error: any) {
      console.error('删除用户失败:', error)
      
      // 根据错误类型提供更友好的提示信息
      let errorMessage = '删除用户失败'
      
      if (error.message) {
        if (error.message.includes('foreign key constraint')) {
          errorMessage = '删除失败：该用户仍有关联的数据记录，请联系系统管理员'
        } else if (error.message.includes('permission denied')) {
          errorMessage = '删除失败：权限不足，请检查您的操作权限'
        } else if (error.message.includes('清理工时记录引用失败')) {
          errorMessage = '删除失败：清理工时记录关联数据时出错'
        } else if (error.message.includes('清理审核历史引用失败')) {
          errorMessage = '删除失败：清理审核历史数据时出错'
        } else {
          errorMessage = `删除失败：${error.message}`
        }
      }
      
      setError(errorMessage)
      toast.error(errorMessage)
      setShowDeleteConfirm(false)
      setUserToDelete(null)
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setUserToDelete(null)
  }

  const confirmRoleChange = async () => {
    if (!roleChangeData.user || !selectedRoleChangeReceiver) {
      toast.error('请选择数据接收人')
      return
    }

    try {
      console.log('执行角色修改数据转移...')
      
      // 执行数据转移
      const fieldToUpdate = roleChangeData.oldRole?.name === '班长' ? 'supervisor_id' : 'section_chief_id'
      
      const { error: transferError } = await supabase
        .from('timesheet_records')
        .update({ [fieldToUpdate]: selectedRoleChangeReceiver })
        .in('id', roleChangeData.pendingRecords.map(r => r.id))
      
      if (transferError) {
        console.error('数据转移失败:', transferError)
        throw new Error('数据转移失败，请稍后重试')
      }
      
      // 执行角色修改
      const { error: updateError } = await supabase
        .from('users')
        .update({
          phone: formData.phone,
          id_card: formData.id_card,
          name: formData.name,
          company_id: formData.company_id,
          role_id: formData.role_id,
          production_line: formData.production_line || null,
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', roleChangeData.user.id)
      
      if (updateError) {
        console.error('角色修改失败:', updateError)
        throw updateError
      }
      
      const receiverName = roleChangeData.sameRoleUsers.find(r => r.id === selectedRoleChangeReceiver)?.name
      toast.success(`角色修改成功！已将${roleChangeData.pendingRecords.length}条待审核数据转移给${receiverName}`)
      
      setShowRoleChangeConfirm(false)
      setRoleChangeData({ user: null, oldRole: null, newRole: null, pendingRecords: [], sameRoleUsers: [], userNames: [] })
      setSelectedRoleChangeReceiver('')
      resetForm()
      await fetchData()
    } catch (error: any) {
      console.error('角色修改失败:', error)
      toast.error(error.message || '角色修改失败')
    }
  }

  const cancelRoleChange = () => {
    setShowRoleChangeConfirm(false)
    setRoleChangeData({ user: null, oldRole: null, newRole: null, pendingRecords: [], sameRoleUsers: [], userNames: [] })
    setSelectedRoleChangeReceiver('')
    setFormLoading(false)
  }

  const confirmProductionLineChange = async () => {
    if (!productionLineChangeData.user || !selectedProductionLineChangeReceiver) {
      toast.error('请选择数据接收人')
      return
    }

    try {
      console.log('执行生产线变更数据转移...')
      
      // 如果有待审核数据，先执行数据转移
      if (productionLineChangeData.pendingRecords && productionLineChangeData.pendingRecords.length > 0) {
        console.log('执行数据转移...')
        const fieldToUpdate = productionLineChangeData.role?.name === '班长' ? 'supervisor_id' : 'section_chief_id'
        
        // 根据角色确定需要转移的记录状态
        const statusCondition = productionLineChangeData.role?.name === '班长' 
          ? ['pending', '待审核', 'submitted', '已提交']
          : ['approved']
        
        const { error: transferError } = await supabase
          .from('timesheet_records')
          .update({ [fieldToUpdate]: selectedProductionLineChangeReceiver })
          .eq(fieldToUpdate, productionLineChangeData.user.id)
          .in('status', statusCondition)
        
        if (transferError) {
          console.error('数据转移失败:', transferError)
          throw new Error('数据转移失败，请稍后重试')
        }
        
        // 添加审批历史记录
        console.log('添加审批历史记录...')
        const receiverName = productionLineChangeData.sameRoleUsers.find(r => r.id === selectedProductionLineChangeReceiver)?.name
        
        // 为每条转移的记录添加审批历史
        for (const record of productionLineChangeData.pendingRecords) {
          const { error: historyError } = await supabase
            .from('approval_history')
            .insert({
              timesheet_record_id: record.id,
              approver_id: user.id,
              approver_name: user.name,
              action: 'transfer',
              comment: `生产线变更：将审核权限从 ${productionLineChangeData.user.name}(${productionLineChangeData.oldProductionLine}) 转移给 ${receiverName}(${productionLineChangeData.oldProductionLine})`,
              created_at: new Date().toISOString()
            })
          
          if (historyError) {
            console.error('添加审批历史失败:', historyError)
            // 不抛出错误，继续执行，但记录日志
          }
        }
        
        console.log(`数据转移成功：${productionLineChangeData.pendingRecords.length}条记录转移给${receiverName}`)
      }
      
      // 执行生产线变更
      const { error: updateError } = await supabase
        .from('users')
        .update({
          phone: formData.phone,
          id_card: formData.id_card,
          name: formData.name,
          company_id: formData.company_id,
          role_id: formData.role_id,
          production_line: formData.production_line || null,
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', productionLineChangeData.user.id)
      
      if (updateError) {
        console.error('生产线变更失败:', updateError)
        throw updateError
      }
      
      // 显示成功消息
      if (productionLineChangeData.pendingRecords && productionLineChangeData.pendingRecords.length > 0) {
        const receiverName = productionLineChangeData.sameRoleUsers.find(r => r.id === selectedProductionLineChangeReceiver)?.name
        toast.success(`生产线变更成功！已将${productionLineChangeData.pendingRecords.length}条待审核数据转移给${receiverName}`)
      } else {
        toast.success('生产线变更成功！')
      }
      
      setShowProductionLineChangeConfirm(false)
      setProductionLineChangeData({ user: null, oldProductionLine: '', newProductionLine: '', role: null, pendingRecords: [], sameRoleUsers: [], userNames: [] })
      setSelectedProductionLineChangeReceiver('')
      resetForm()
      await fetchData()
    } catch (error: any) {
      console.error('生产线变更失败:', error)
      toast.error(error.message || '生产线变更失败')
    }
  }

  const cancelProductionLineChange = () => {
    setShowProductionLineChangeConfirm(false)
    setProductionLineChangeData({ user: null, oldProductionLine: '', newProductionLine: '', role: null, pendingRecords: [], sameRoleUsers: [], userNames: [] })
    setSelectedProductionLineChangeReceiver('')
    setFormLoading(false)
  }

  const handleStatusToggle = async (userData: UserData) => {
    const newStatus = !userData.is_active
    
    try {
      // 权限验证：非超级管理员只能修改自己公司用户的状态
      if (!isSuperAdmin(user.role)) {
        if (userData.company_id !== user.company?.id) {
          toast.error('您只能修改自己公司用户的状态')
          return
        }
      }

      console.log('正在切换用户状态:', userData.id, userData.name, '从', userData.is_active, '到', newStatus)
      
      const { data, error } = await supabase
        .from('users')
        .update({ 
          is_active: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', userData.id)
        .select('*')

      console.log('状态切换操作详情:', { data, error, userId: userData.id, newStatus })
      
      if (error) {
        console.error('更新用户状态失败:', error)
        throw error
      }
      
      if (!data || data.length === 0) {
        console.error('状态更新操作没有返回数据，这通常表示权限问题或记录不存在')
        throw new Error('状态更新失败：无法获取更新后的数据，请检查权限设置')
      }
      
      console.log('状态切换成功:', userData.name, '新状态:', newStatus)
      toast.success('用户状态更新成功')
      await fetchData()
    } catch (error: any) {
      console.error('更新用户状态失败:', error)
      setError(error.message || '更新状态失败')
      toast.error('更新用户状态失败')
    }
  }

  // 获取生产线数据
  const fetchProductionLines = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('processes')
        .select('production_line')
        .eq('company_id', companyId)
        .not('production_line', 'is', null)

      if (error) throw error

      // 去重并过滤空值
      const uniqueLines = [...new Set(data?.map(item => item.production_line).filter(Boolean) || [])]
      setProductionLines(uniqueLines)
    } catch (error) {
      console.error('获取生产线数据失败:', error)
      setProductionLines([])
    }
  }

  const resetForm = () => {
    const defaultFormData = {
      phone: '',
      id_card: '',
      name: '',
      company_id: '',
      role_id: '',
      production_line: '',
      is_active: false // 新用户默认为禁用状态
    }
    
    // 如果不是超级管理员，自动设置表单的公司为用户所属公司
    if (!isSuperAdmin(user.role) && user.company?.id) {
      defaultFormData.company_id = user.company.id
    }
    
    setFormData(defaultFormData)
    setEditingUser(null)
    setShowForm(false)
    setShowProductionLine(false)
    setProductionLines([])
    setError('')
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    setFormData({
      ...formData,
      [name]: value
    })

    // 当角色或公司发生变化时，处理生产线显示逻辑
    if (name === 'role_id') {
      const selectedRole = roles.find(role => role.id === value)
      const shouldShowProductionLine = selectedRole?.name === '班长' || selectedRole?.name === '段长'
      setShowProductionLine(shouldShowProductionLine)
      
      if (shouldShowProductionLine && formData.company_id) {
        fetchProductionLines(formData.company_id)
      } else {
        setProductionLines([])
        setFormData(prev => ({ ...prev, production_line: '' }))
      }
    }

    if (name === 'company_id') {
      if (showProductionLine && value) {
        fetchProductionLines(value)
      } else {
        setProductionLines([])
      }
      setFormData(prev => ({ ...prev, production_line: '' }))
    }
  }

  const filteredUsers = users.filter(userData =>
    userData.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    userData.phone.includes(searchTerm) ||
    userData.id_card.includes(searchTerm) ||
    (userData.company?.name && userData.company.name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-green-400 text-xl animate-pulse font-mono">
          加载中...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-green-300 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <User className="w-8 h-8 text-green-400 mr-3" />
              <h1 className="text-4xl font-bold text-green-400 font-mono">用户管理</h1>
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

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-400 rounded text-red-300">
            {error}
          </div>
        )}

        {/* Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-green-400 rounded text-green-300 placeholder-green-600 focus:outline-none focus:border-green-300 focus:ring-1 focus:ring-green-300 font-mono text-sm"
              placeholder="搜索用户姓名、手机号、身份证号或公司..."
            />
          </div>

          {/* Add Button */}
          <button
            onClick={() => {
              resetForm() // 重置表单确保新用户默认状态正确
              setShowForm(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-black font-bold rounded transition-colors font-mono"
          >
            <Plus className="w-4 h-4" />
            新增用户
          </button>
        </div>

        {/* User Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 border border-green-400 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-green-400 font-mono">
                  {editingUser ? '编辑用户' : '新增用户'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-green-400 hover:text-green-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-green-300 text-sm font-mono mb-1">
                      姓名 *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400 w-4 h-4" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full pl-10 pr-4 py-2 bg-black border border-green-400 rounded text-green-300 placeholder-green-600 focus:outline-none focus:border-green-300 focus:ring-1 focus:ring-green-300 font-mono text-sm"
                        placeholder="请输入姓名"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-green-300 text-sm font-mono mb-1">
                      手机号 *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400 w-4 h-4" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        className="w-full pl-10 pr-4 py-2 bg-black border border-green-400 rounded text-green-300 placeholder-green-600 focus:outline-none focus:border-green-300 focus:ring-1 focus:ring-green-300 font-mono text-sm"
                        placeholder="请输入手机号"
                        maxLength={11}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-green-300 text-sm font-mono mb-1">
                      身份证号 *
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400 w-4 h-4" />
                      <input
                        type="text"
                        name="id_card"
                        value={formData.id_card}
                        onChange={handleChange}
                        required
                        className="w-full pl-10 pr-4 py-2 bg-black border border-green-400 rounded text-green-300 placeholder-green-600 focus:outline-none focus:border-green-300 focus:ring-1 focus:ring-green-300 font-mono text-sm"
                        placeholder="请输入身份证号"
                        maxLength={18}
                      />
                    </div>
                  </div>



                  <div>
                    <label className="block text-green-300 text-sm font-mono mb-1">
                      所属公司 *
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400 w-4 h-4" />
                      {isSuperAdmin(user.role) && !editingUser ? (
                        <select
                          name="company_id"
                          value={formData.company_id}
                          onChange={handleChange}
                          required
                          className="w-full pl-10 pr-4 py-2 bg-black border border-green-400 rounded text-green-300 focus:outline-none focus:border-green-300 focus:ring-1 focus:ring-green-300 font-mono text-sm"
                        >
                          <option value="">请选择公司</option>
                          {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-green-400 rounded text-green-300 font-mono text-sm">
                          {companies.find(c => c.id === formData.company_id)?.name || user.company?.name || '当前公司'}
                          {editingUser && (
                            <span className="ml-2 text-yellow-400 text-xs">(编辑时不可修改)</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-green-300 text-sm font-mono mb-1">
                      用户角色 *
                    </label>
                    <div className="relative">
                      <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400 w-4 h-4" />
                      <select
                        name="role_id"
                        value={formData.role_id}
                        onChange={handleChange}
                        required
                        className="w-full pl-10 pr-4 py-2 bg-black border border-green-400 rounded text-green-300 focus:outline-none focus:border-green-300 focus:ring-1 focus:ring-green-300 font-mono text-sm"
                      >
                        <option value="">请选择角色</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Production Line - 仅在选择班长或段长时显示 */}
                  {showProductionLine && (
                    <div>
                      <label className="block text-green-300 text-sm font-mono mb-1">
                        生产线 *
                      </label>
                      <select
                        name="production_line"
                        value={formData.production_line || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-black border border-green-400 rounded text-green-300 focus:outline-none focus:border-green-300 focus:ring-1 focus:ring-green-300 font-mono text-sm"
                        required
                      >
                        <option value="">请选择生产线</option>
                        {productionLines.map((line) => (
                          <option key={line} value={line}>
                            {line}
                          </option>
                        ))}
                      </select>
                      {productionLines.length === 0 && formData.company_id && (
                        <div className="mt-1 text-yellow-400 text-xs font-mono">
                          该公司暂无可用生产线
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-green-300 text-sm font-mono mb-1">
                    用户状态
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400 w-4 h-4" />
                    <select
                      name="is_active"
                      value={formData.is_active.toString()}
                      onChange={(e) => setFormData({...formData, is_active: e.target.value === 'true'})}
                      className="w-full pl-10 pr-4 py-2 bg-black border border-green-400 rounded text-green-300 focus:outline-none focus:border-green-300 focus:ring-1 focus:ring-green-300 font-mono text-sm"
                    >
                      <option value="true">激活</option>
                      <option value="false">禁用</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-black font-bold rounded transition-colors font-mono"
                  >
                    <Save className="w-4 h-4" />
                    {formLoading ? '保存中...' : '保存'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded transition-colors font-mono"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-gray-900 border border-green-400 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-green-900/30">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-mono font-medium text-green-400 uppercase tracking-wider">姓名</th>
                <th className="px-4 py-3 text-left text-sm font-mono font-medium text-green-400 uppercase tracking-wider">
                  手机号
                </th>
                <th className="px-4 py-3 text-left text-sm font-mono font-medium text-green-400 uppercase tracking-wider">
                  身份证号
                </th>
                <th className="px-4 py-3 text-left text-sm font-mono font-medium text-green-400 uppercase tracking-wider">
                  公司
                </th>
                <th className="px-4 py-3 text-left text-sm font-mono font-medium text-green-400 uppercase tracking-wider">
                  角色
                </th>
                <th className="px-4 py-3 text-left text-sm font-mono font-medium text-green-400 uppercase tracking-wider">
                  生产线
                </th>
                <th className="px-4 py-3 text-left text-sm font-mono font-medium text-green-400 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-4 py-3 text-left text-sm font-mono font-medium text-green-400 uppercase tracking-wider">
                  操作
                </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-green-800">
                {filteredUsers.map((userData) => (
                  <tr key={userData.id} className="hover:bg-green-900/10">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-green-400 mr-2" />
                        <span className="text-sm font-mono font-medium text-green-300">
                          {userData.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-mono text-green-300">
                        {userData.phone}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-mono text-green-300">
                        {userData.id_card}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-mono text-green-300">
                        {userData.company?.name || '未分配'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-mono text-green-300">
                        {userData.role?.name || '未分配'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-mono text-green-300">
                        {userData.production_line || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => handleStatusToggle(userData)}
                        className={`inline-flex px-2 py-1 text-xs font-mono font-semibold rounded-full ${
                          userData.is_active
                            ? 'bg-green-900/50 text-green-300 border border-green-400'
                            : 'bg-red-900/50 text-red-300 border border-red-400'
                        }`}
                      >
                        {userData.is_active ? '激活' : '禁用'}
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(userData)}
                          className="text-green-400 hover:text-green-300 transition-colors"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(userData)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="删除"
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
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <User className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <p className="text-green-400 text-lg font-mono">
              {searchTerm ? '未找到匹配的用户' : '暂无用户数据'}
            </p>
            <p className="text-green-600 text-sm font-mono mt-2">
              {searchTerm ? '请尝试其他搜索关键词' : '点击上方按钮添加第一个用户'}
            </p>
          </div>
        )}

        {/* Role Change Confirmation Modal */}
        {showRoleChangeConfirm && roleChangeData && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 border border-yellow-400 rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="text-yellow-400 w-8 h-8" />
                <h2 className="text-xl font-bold text-yellow-400 font-mono">
                  确认角色修改
                </h2>
              </div>
              
              <div className="mb-6">
                <p className="text-green-300 font-mono mb-2">
                  确定要将用户 <span className="text-green-400 font-bold">"{roleChangeData.user.name}"</span> 的角色从 
                  <span className="text-blue-400 font-bold">"{roleChangeData.oldRole.name}"</span> 修改为 
                  <span className="text-purple-400 font-bold">"{roleChangeData.newRole.name}"</span> 吗？
                </p>
                
                {roleChangeData.pendingRecords && roleChangeData.pendingRecords.length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-yellow-300 font-mono text-sm p-3 bg-yellow-900/20 border border-yellow-600 rounded">
                      <p className="mb-1">⚠️ 数据转移：</p>
                      <p className="text-xs mb-2">检测到{roleChangeData.pendingRecords.length}条待审核工时记录需要转移。</p>
                      <p className="text-yellow-200 text-xs">
                        涉及员工：{roleChangeData.userNames?.join('、')}
                      </p>
                    </div>
                    <div>
                      <label className="block text-green-300 text-sm font-mono mb-2">
                        选择数据接收人：
                      </label>
                      <select
                        value={selectedRoleChangeReceiver}
                        onChange={(e) => setSelectedRoleChangeReceiver(e.target.value)}
                        className="w-full px-3 py-2 bg-black border border-green-400 rounded text-green-300 focus:outline-none focus:border-green-300 focus:ring-1 focus:ring-green-300 font-mono text-sm"
                        required
                      >
                        <option value="">请选择接收人</option>
                        {roleChangeData.sameRoleUsers?.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="text-green-300 font-mono text-sm mb-2 p-3 bg-green-900/20 border border-green-600 rounded">
                    <p className="mb-1">✅ 安全修改：</p>
                    <p className="text-xs">该{roleChangeData.oldRole.name}没有待审核的工时记录，可以安全修改角色。</p>
                  </div>
                )}
                
                <p className="text-yellow-300 font-mono text-sm mt-2">
                  角色修改后将影响用户的权限和功能访问。
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={confirmRoleChange}
                  disabled={roleChangeData.pendingRecords?.length > 0 && !selectedRoleChangeReceiver}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-yellow-800 disabled:cursor-not-allowed text-white font-bold rounded transition-colors font-mono"
                >
                  <Edit className="w-4 h-4" />
                  确认修改
                </button>
                <button
                  onClick={cancelRoleChange}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded transition-colors font-mono"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && userToDelete && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 border border-red-400 rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="text-red-400 w-8 h-8" />
                <h2 className="text-xl font-bold text-red-400 font-mono">
                  确认删除
                </h2>
              </div>
              
              <div className="mb-6">
                <p className="text-green-300 font-mono mb-2">
                  确定要删除用户 <span className="text-green-400 font-bold">"{userToDelete.name}"</span> 吗？
                </p>
                
                {/* 根据用户角色显示不同的删除影响提示 */}
                {userToDelete.role?.name === '员工' ? (
                  <div className="text-blue-300 font-mono text-sm mb-2 p-3 bg-blue-900/20 border border-blue-600 rounded">
                    <p className="mb-1">ℹ️ 员工处理影响：</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>保留历史工时记录和审批历史记录</li>
                      <li>断开数据关联，账户设为非激活状态</li>
                      <li>重新申请时不关联旧数据</li>
                    </ul>
                    <p className="text-blue-200 text-xs mt-2">员工处理对系统数据影响较小，数据完整性得到保护</p>
                  </div>
                ) : (userToDelete.role?.name === '班长' || userToDelete.role?.name === '段长') ? (
                  userToDelete.pendingRecords && userToDelete.pendingRecords.length > 0 ? (
                    <div className="space-y-3">
                      <div className="text-yellow-300 font-mono text-sm p-3 bg-yellow-900/20 border border-yellow-600 rounded">
                        <p className="mb-1">⚠️ 数据转移：</p>
                        <p className="text-xs mb-2">检测到{userToDelete.pendingRecords.length}条待审核工时记录需要转移。</p>
                        <p className="text-yellow-200 text-xs">
                          涉及员工：{userToDelete.userNames?.join('、')}
                        </p>
                      </div>
                      <div>
                        <label className="block text-green-300 text-sm font-mono mb-2">
                          选择数据接收人：
                        </label>
                        <select
                          value={selectedReceiver}
                          onChange={(e) => setSelectedReceiver(e.target.value)}
                          className="w-full px-3 py-2 bg-black border border-green-400 rounded text-green-300 focus:outline-none focus:border-green-300 focus:ring-1 focus:ring-green-300 font-mono text-sm"
                          required
                        >
                          <option value="">请选择接收人</option>
                          {userToDelete.sameRoleUsers?.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="text-green-300 font-mono text-sm mb-2 p-3 bg-green-900/20 border border-green-600 rounded">
                      <p className="mb-1">✅ 安全删除：</p>
                      <p className="text-xs">该{userToDelete.role?.name}没有待审核的工时记录，可以安全删除。</p>
                    </div>
                  )
                ) : (userToDelete.role?.name === '生产经理' || userToDelete.role?.name === '财务') ? (
                  <div className="text-purple-300 font-mono text-sm mb-2 p-3 bg-purple-900/20 border border-purple-600 rounded">
                    <p className="mb-1">ℹ️ {userToDelete.role?.name}删除影响：</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>直接删除用户账户，不影响工时数据</li>
                      <li>清理相关的审批历史记录引用</li>
                      <li>不需要数据转移或特殊处理</li>
                    </ul>
                    <p className="text-purple-200 text-xs mt-2">{userToDelete.role?.name}删除对工时管理系统影响较小</p>
                  </div>
                ) : (
                  <div className="text-yellow-300 font-mono text-sm mb-2 p-3 bg-yellow-900/20 border border-yellow-600 rounded">
                    <p className="mb-1">⚠️ 删除操作将会：</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>清理该用户在工时记录中的相关引用</li>
                      <li>删除该用户的审批历史记录</li>
                      <li>永久删除用户账户信息</li>
                    </ul>
                  </div>
                )}
                
                <p className="text-red-300 font-mono text-sm mt-2">
                  此操作不可恢复，请谨慎操作。
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={confirmDelete}
                  disabled={userToDelete.pendingRecords?.length > 0 && !selectedReceiver}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-bold rounded transition-colors font-mono"
                >
                  <Trash2 className="w-4 h-4" />
                  {userToDelete.role?.name === '员工' ? '确认处理' : '确认删除'}
                </button>
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded transition-colors font-mono"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Production Line Change Confirmation Modal */}
        {showProductionLineChangeConfirm && productionLineChangeData && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 border border-blue-400 rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="text-blue-400 w-8 h-8" />
                <h2 className="text-xl font-bold text-blue-400 font-mono">
                  确认生产线变更
                </h2>
              </div>
              
              <div className="mb-6">
                <p className="text-green-300 font-mono mb-2">
                  确定要将用户 <span className="text-green-400 font-bold">"{productionLineChangeData.user.name}"</span> 的生产线从 
                  <span className="text-blue-400 font-bold">"{productionLineChangeData.oldProductionLine}"</span> 变更为 
                  <span className="text-purple-400 font-bold">"{productionLineChangeData.newProductionLine}"</span> 吗？
                </p>
                
                {productionLineChangeData.pendingRecords && productionLineChangeData.pendingRecords.length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-yellow-300 font-mono text-sm p-3 bg-yellow-900/20 border border-yellow-600 rounded">
                      <p className="mb-1">⚠️ 数据转移：</p>
                      <p className="text-xs mb-2">检测到{productionLineChangeData.pendingRecords.length}条待审核工时记录需要转移到原生产线({productionLineChangeData.oldProductionLine})的相同角色下。</p>
                      <p className="text-yellow-200 text-xs">
                        涉及员工：{productionLineChangeData.userNames?.join('、')}
                      </p>
                    </div>
                    <div>
                      <label className="block text-green-300 text-sm font-mono mb-2">
                        选择原生产线的{productionLineChangeData.role?.name}作为数据接收人：
                      </label>
                      <select
                        value={selectedProductionLineChangeReceiver}
                        onChange={(e) => setSelectedProductionLineChangeReceiver(e.target.value)}
                        className="w-full px-3 py-2 bg-black border border-green-400 rounded text-green-300 focus:outline-none focus:border-green-300 focus:ring-1 focus:ring-green-300 font-mono text-sm"
                        required
                      >
                        <option value="">请选择接收人</option>
                        {productionLineChangeData.sameRoleUsers?.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="text-green-300 font-mono text-sm mb-2 p-3 bg-green-900/20 border border-green-600 rounded">
                    <p className="mb-1">✅ 安全变更：</p>
                    <p className="text-xs">该{productionLineChangeData.role?.name}没有待审核的工时记录，可以安全变更生产线。</p>
                  </div>
                )}
                
                <p className="text-blue-300 font-mono text-sm mt-2">
                  生产线变更后将影响用户的工作范围和审批权限。
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={confirmProductionLineChange}
                  disabled={productionLineChangeData.pendingRecords?.length > 0 && !selectedProductionLineChangeReceiver}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold rounded transition-colors font-mono"
                >
                  <Edit className="w-4 h-4" />
                  确认变更
                </button>
                <button
                  onClick={cancelProductionLineChange}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded transition-colors font-mono"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}