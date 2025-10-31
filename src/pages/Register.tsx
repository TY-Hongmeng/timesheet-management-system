import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Company, UserRole } from '@/lib/supabase'
import { Phone, Lock, Eye, EyeOff, User, CreditCard, Building, UserCheck, Settings } from 'lucide-react'
import RegistrationSuccessDialog from '@/components/RegistrationSuccessDialog'

export default function Register() {
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    confirmPassword: '',
    id_card: '',
    name: '',
    company_id: '',
    role_id: '',
    production_line: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [companies, setCompanies] = useState<Company[]>([])
  const [roles, setRoles] = useState<UserRole[]>([])
  const [passwordError, setPasswordError] = useState('')
  const [loadingData, setLoadingData] = useState(true)
  const [productionLines, setProductionLines] = useState<string[]>([])
  const [showProductionLine, setShowProductionLine] = useState(false)
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  
  // 生产线搜索状态
  const [productionLineSearch, setProductionLineSearch] = useState<string>('')
  const [showProductionLineDropdown, setShowProductionLineDropdown] = useState<boolean>(false)
  
  // 公司搜索状态
  const [companySearch, setCompanySearch] = useState<string>('')
  const [showCompanyDropdown, setShowCompanyDropdown] = useState<boolean>(false)
  
  // 角色搜索状态
  const [roleSearch, setRoleSearch] = useState<string>('')
  const [showRoleDropdown, setShowRoleDropdown] = useState<boolean>(false)

  const { register } = useAuth()
  const navigate = useNavigate()

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.production-line-dropdown')) {
        setShowProductionLineDropdown(false)
      }
      if (!target.closest('.company-dropdown')) {
        setShowCompanyDropdown(false)
      }
      if (!target.closest('.role-dropdown')) {
        setShowRoleDropdown(false)
      }
    }

    if (showProductionLineDropdown || showCompanyDropdown || showRoleDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProductionLineDropdown, showCompanyDropdown, showRoleDropdown])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 获取公司列表
        const { data: companiesData, error: companiesError } = await supabase
          .from('companies')
          .select('*')
          .order('name')
        
        if (companiesError) throw companiesError

        // 获取角色列表（排除超级管理员）
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('*')
          .neq('name', '超级管理员')
          .order('name')
        
        if (rolesError) throw rolesError

        setCompanies(companiesData || [])
        setRoles(rolesData || [])
      } catch (error: any) {
        setError('获取数据失败，请重试')
      } finally {
        setLoadingData(false)
      }
    }

    fetchData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // 表单验证
    if (!formData.phone || !formData.password || !formData.id_card || !formData.name || !formData.company_id || !formData.role_id) {
      setError('请填写所有必填字段')
      setLoading(false)
      return
    }

    // 如果是班长或段长角色，检查是否选择了生产线
    if (showProductionLine && !formData.production_line) {
      setError('请选择生产线')
      setLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致')
      setPasswordError('两次输入的密码不一致')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('密码长度至少6位')
      setLoading(false)
      return
    }

    if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      setError('请输入正确的手机号码')
      setLoading(false)
      return
    }

    if (!/^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/.test(formData.id_card)) {
      setError('请输入正确的身份证号码')
      setLoading(false)
      return
    }

    // 🔍 注册前调试日志 - 检查localStorage状态
    console.log('🔍 [Register Debug] 注册前localStorage状态检查:')
    console.log('🔍 [Register Debug] defaultUserStatus原始值:', localStorage.getItem('defaultUserStatus'))
    console.log('🔍 [Register Debug] defaultUserStatus解析值:', JSON.parse(localStorage.getItem('defaultUserStatus') || 'false'))
    console.log('🔍 [Register Debug] 所有localStorage键:', Object.keys(localStorage))
    console.log('🔍 [Register Debug] 即将注册用户:', {
      phone: formData.phone,
      name: formData.name,
      company_id: formData.company_id,
      role_id: formData.role_id,
      production_line: showProductionLine ? formData.production_line : null
    })

    const result = await register({
      phone: formData.phone,
      password: formData.password,
      id_card: formData.id_card,
      name: formData.name,
      company_id: formData.company_id,
      role_id: formData.role_id,
      production_line: showProductionLine ? formData.production_line : null
    })
    
    if (result.success) {
      // 注册成功，显示专业对话框
      setError('')
      setShowSuccessDialog(true)
    } else {
      setError(result.error || '注册失败')
    }
    
    setLoading(false)
  }

  // 处理注册成功对话框关闭
  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false)
    navigate('/login')
  }

  // 获取生产线数据 - 统一使用与ProcessManagement.tsx相同的逻辑
  const fetchProductionLines = async (companyId: string) => {
    try {
      console.log('🔍 Register.tsx - fetchProductionLines: 开始获取生产线数据，公司ID:', companyId)
      
      // 使用与ProcessManagement.tsx相同的查询逻辑：获取所有processes数据
      const { data, error } = await supabase
        .from('processes')
        .select(`
          *,
          companies!inner(
            name
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      console.log('📊 Register.tsx - fetchProductionLines: 查询到的原始数据:', data)
      console.log('📊 Register.tsx - fetchProductionLines: 原始数据数量:', data?.length || 0)
      
      // 使用与ProcessManagement.tsx相同的生产线提取逻辑
      const processesWithCompanyName = (data || []).map(process => ({
        ...process,
        company_name: process.companies?.name || '未知公司'
      }))
      
      // 过滤当前公司的数据并提取唯一的生产线
      const filteredProcesses = processesWithCompanyName.filter(p => p.company_id === companyId)
      const uniqueLines = [...new Set(filteredProcesses.map(p => p.production_line).filter(Boolean))]
      
      console.log('🎯 Register.tsx - fetchProductionLines: 过滤后的工序数据数量:', filteredProcesses.length)
      console.log('🎯 Register.tsx - fetchProductionLines: 去重后的生产线:', uniqueLines)
      console.log('🎯 Register.tsx - fetchProductionLines: 去重后的生产线数量:', uniqueLines.length)
      
      setProductionLines(uniqueLines)
    } catch (error) {
      console.error('获取生产线数据失败:', error)
      setProductionLines([])
    }
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // 角色选择变化时的处理
    if (name === 'role_id') {
      const role = roles.find(r => r.id === value)
      setSelectedRole(role || null)
      
      // 检查是否是班长或段长角色
      const needProductionLine = role && (role.name === '班长' || role.name === '段长')
      setShowProductionLine(needProductionLine || false)
      
      // 如果需要显示生产线且已选择公司，则获取生产线数据
      if (needProductionLine && formData.company_id) {
        await fetchProductionLines(formData.company_id)
      }
      
      // 如果不需要生产线，清空生产线选择
      if (!needProductionLine) {
        setFormData(prev => ({ ...prev, production_line: '' }))
      }
    }
    
    // 公司选择变化时的处理
    if (name === 'company_id' && showProductionLine) {
      await fetchProductionLines(value)
      // 清空之前选择的生产线
      setFormData(prev => ({ ...prev, production_line: '' }))
    }
    
    // 实时验证密码确认
    if (name === 'confirmPassword' || name === 'password') {
      const password = name === 'password' ? value : formData.password
      const confirmPassword = name === 'confirmPassword' ? value : formData.confirmPassword
      
      if (confirmPassword && password !== confirmPassword) {
        setPasswordError('两次输入的密码不一致')
      } else {
        setPasswordError('')
      }
    }
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-green-400 text-xl animate-pulse font-mono">
          加载中...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-green-400 mb-2 font-mono">
            工时管理系统
          </h1>
          <p className="text-green-300 text-lg font-mono">
            TIMETRACK SYSTEM
          </p>
          <div className="mt-4 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent"></div>
        </div>

        {/* Register Form */}
        <div className="bg-gray-900 border border-green-400 rounded-lg p-8 shadow-lg shadow-green-400/20">
          <h2 className="text-2xl font-bold text-green-400 mb-6 text-center font-mono">
            用户注册
          </h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-400 rounded text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone Input */}
            <div>
              <label className="block text-green-300 text-sm font-mono mb-1">
                手机号码 *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400 w-4 h-4" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 bg-black border border-green-400 rounded text-green-300 placeholder-green-600 focus:outline-none focus:border-green-300 focus:ring-1 focus:ring-green-300 font-mono text-sm"
                  placeholder="请输入手机号码"
                  maxLength={11}
                />
              </div>
            </div>

            {/* ID Card Input */}
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
                  className="w-full pl-10 pr-4 py-2 bg-black border border-green-400 rounded text-green-300 placeholder-green-600 focus:outline-none focus:border-green-300 focus:ring-1 focus:ring-green-300 font-mono text-sm"
                  placeholder="请输入身份证号码"
                  maxLength={18}
                />
              </div>
            </div>

            {/* Name Input */}
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
                  className="w-full pl-10 pr-4 py-2 bg-black border border-green-400 rounded text-green-300 placeholder-green-600 focus:outline-none focus:border-green-300 focus:ring-1 focus:ring-green-300 font-mono text-sm"
                  placeholder="请输入真实姓名"
                />
              </div>
            </div>



            {/* Company Select */}
            <div>
              <label className="block text-green-300 text-sm font-mono mb-1">
                所属公司 *
              </label>
              <div className="relative company-dropdown">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400 w-4 h-4" />
                <input
                  type="text"
                  value={companySearch}
                  onChange={(e) => {
                    setCompanySearch(e.target.value);
                    setShowCompanyDropdown(true);
                    // 如果输入为空，清除选择
                    if (!e.target.value) {
                      setFormData(prev => ({ ...prev, company_id: '' }));
                    }
                  }}
                  onFocus={() => setShowCompanyDropdown(true)}
                  placeholder="搜索或选择公司"
                  className="w-full pl-10 pr-4 py-2 bg-black border border-green-400 rounded text-green-300 placeholder-green-600 focus:outline-none focus:border-green-300 focus:ring-1 focus:ring-green-300 font-mono text-sm"
                />
                {showCompanyDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-green-400 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {companies
                      .filter(company => 
                        company.name.toLowerCase().includes(companySearch.toLowerCase())
                      )
                      .map((company) => (
                      <div
                        key={company.id}
                        onClick={async () => {
                          setCompanySearch(company.name);
                          setFormData(prev => ({ ...prev, company_id: company.id }));
                          setShowCompanyDropdown(false);
                          
                          // 如果需要显示生产线，则获取生产线数据
                          if (showProductionLine) {
                            await fetchProductionLines(company.id);
                            // 清空之前选择的生产线
                            setFormData(prev => ({ ...prev, production_line: '' }));
                          }
                        }}
                        className="px-3 py-2 text-green-300 hover:bg-gray-700 cursor-pointer border-b border-gray-600 last:border-b-0 text-sm font-mono"
                      >
                        {company.name}
                      </div>
                    ))}
                    {companies.filter(company => 
                      company.name.toLowerCase().includes(companySearch.toLowerCase())
                    ).length === 0 && (
                      <div className="px-3 py-2 text-gray-400 text-sm font-mono">
                        未找到匹配的公司
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Role Select */}
            <div>
              <label className="block text-green-300 text-sm font-mono mb-1">
                用户角色 *
              </label>
              <div className="relative role-dropdown">
                <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400 w-4 h-4" />
                <input
                  type="text"
                  value={roleSearch}
                  onChange={(e) => {
                    setRoleSearch(e.target.value);
                    setShowRoleDropdown(true);
                    // 如果输入为空，清除选择
                    if (!e.target.value) {
                      setFormData(prev => ({ ...prev, role_id: '' }));
                      setSelectedRole(null);
                      setShowProductionLine(false);
                    }
                  }}
                  onFocus={() => setShowRoleDropdown(true)}
                  placeholder="搜索或选择角色"
                  className="w-full pl-10 pr-4 py-2 bg-black border border-green-400 rounded text-green-300 placeholder-green-600 focus:outline-none focus:border-green-300 focus:ring-1 focus:ring-green-300 font-mono text-sm"
                />
                {showRoleDropdown && (
                   <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-green-400 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {roles
                      .filter(role => 
                        role.name.toLowerCase().includes(roleSearch.toLowerCase())
                      )
                      .map((role) => (
                      <div
                        key={role.id}
                        onClick={async () => {
                          setRoleSearch(role.name);
                          setFormData(prev => ({ ...prev, role_id: role.id }));
                          setSelectedRole(role);
                          setShowRoleDropdown(false);
                          
                          // 检查是否是班长或段长角色
                          const needProductionLine = role.name === '班长' || role.name === '段长';
                          setShowProductionLine(needProductionLine);
                          
                          // 如果需要显示生产线且已选择公司，则获取生产线数据
                          if (needProductionLine && formData.company_id) {
                            await fetchProductionLines(formData.company_id);
                          }
                          
                          // 如果不需要生产线，清空生产线选择
                          if (!needProductionLine) {
                            setFormData(prev => ({ ...prev, production_line: '' }));
                          }
                        }}
                        className="px-3 py-2 text-green-300 hover:bg-gray-700 cursor-pointer border-b border-gray-600 last:border-b-0 text-sm font-mono"
                      >
                        {role.name}
                      </div>
                    ))}
                    {roles.filter(role => 
                      role.name.toLowerCase().includes(roleSearch.toLowerCase())
                    ).length === 0 && (
                      <div className="px-3 py-2 text-gray-400 text-sm font-mono">
                        未找到匹配的角色
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Production Line Select - 仅在选择班长或段长时显示 */}
            {showProductionLine && (
              <div>
                <label className="block text-green-300 text-sm font-mono mb-1">
                  生产线 *
                </label>
                <div className="relative production-line-dropdown">
                  <Settings className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400 w-4 h-4" />
                  <input
                    type="text"
                    value={formData.production_line}
                    onChange={(e) => {
                      setProductionLineSearch(e.target.value);
                      setFormData(prev => ({ ...prev, production_line: e.target.value }));
                      setShowProductionLineDropdown(true);
                    }}
                    onFocus={() => setShowProductionLineDropdown(true)}
                    placeholder="搜索或选择生产线"
                    className="w-full pl-10 pr-4 py-2 bg-black border border-green-400 rounded text-green-300 placeholder-green-600 focus:outline-none focus:border-green-300 focus:ring-1 focus:ring-green-300 font-mono text-sm"
                  />
                  {showProductionLineDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-green-400 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {productionLines
                        .filter(line => {
                          // 如果搜索框为空或者只包含空格，显示所有生产线
                          const searchTerm = (formData.production_line || '').trim();
                          if (!searchTerm) return true;
                          // 否则按搜索内容过滤
                          return line.toLowerCase().includes(searchTerm.toLowerCase());
                        })
                        .map((line) => (
                        <div
                          key={line}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, production_line: line }));
                            setProductionLineSearch('');
                            setShowProductionLineDropdown(false);
                          }}
                          className="px-3 py-2 text-green-300 hover:bg-gray-700 cursor-pointer border-b border-gray-600 last:border-b-0 text-sm font-mono"
                        >
                          {line}
                        </div>
                      ))}
                      {productionLines.filter(line => {
                        const searchTerm = (formData.production_line || '').trim();
                        if (!searchTerm) return true;
                        return line.toLowerCase().includes(searchTerm.toLowerCase());
                      }).length === 0 && (
                        <div className="px-3 py-2 text-gray-400 text-sm font-mono">
                          未找到匹配的生产线
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {productionLines.length === 0 && formData.company_id && (
                  <div className="mt-1 text-yellow-400 text-xs font-mono">
                    该公司暂无可用生产线
                  </div>
                )}
              </div>
            )}

            {/* Password Input */}
            <div>
              <label className="block text-green-300 text-sm font-mono mb-1">
                登录密码 *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400 w-4 h-4" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-10 py-2 bg-black border border-green-400 rounded text-green-300 placeholder-green-600 focus:outline-none focus:border-green-300 focus:ring-1 focus:ring-green-300 font-mono text-sm"
                  placeholder="请输入密码（至少6位）"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-400 hover:text-green-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-green-300 text-sm font-mono mb-1">
                确认密码 *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400 w-4 h-4" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-10 py-2 bg-black border rounded text-green-300 placeholder-green-600 focus:outline-none focus:ring-1 font-mono text-sm ${
                    passwordError ? 'border-red-400 focus:border-red-300 focus:ring-red-300' : 'border-green-400 focus:border-green-300 focus:ring-green-300'
                  }`}
                  placeholder="请再次输入密码"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-400 hover:text-green-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && (
                <div className="mt-1 text-red-400 text-xs font-mono">
                  {passwordError}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-black font-bold rounded-lg transition-colors duration-200 font-mono text-lg mt-6"
            >
              {loading ? '注册中...' : '注册'}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-green-400 hover:text-green-300 text-sm font-mono transition-colors"
            >
              已有账号？立即登录
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-green-600 text-xs font-mono">
          <p>&copy; 2024 工时管理系统. All rights reserved.</p>
        </div>
      </div>

      {/* Registration Success Dialog */}
      <RegistrationSuccessDialog
        isOpen={showSuccessDialog}
        onClose={handleSuccessDialogClose}
        userName={formData.name}
        userPhone={formData.phone}
      />
    </div>
  )
}