import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Calendar, Clock, User, Building, Package, Settings } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import { useModuleLoading, MODULE_IDS } from '../contexts/ModuleLoadingContext'
import { supabase, safeQuery, checkNetworkConnection } from '../lib/supabase'
import { isSuperAdmin } from '../utils/permissions'
import TimesheetConfirmDialog from '../components/TimesheetConfirmDialog'
import NavActions from '../components/NavActions'

interface ProductionLine {
  id: number
  name: string
  description?: string
  is_active: boolean
  company_id?: string // 添加公司ID字段，用于超级管理员权限处理
}

interface WorkType {
  id: number
  name: string
  description?: string
  is_active: boolean
}

interface Product {
  id: number
  name: string
  code: string
  specification?: string
  is_active: boolean
}

interface Process {
  id: string
  product_name: string // 产品名称
  company_id: string
  production_line: string // 生产线
  production_category: string // 生产类别
  product_process: string // 工序名称
  unit_price: number // 单价
  is_active: boolean
}

interface TimesheetRecordItem {
  id?: string
  work_type_id: number
  product_id: number
  process_id: string
  quantity: number
  total_amount?: number
}

interface TimesheetRecord {
  id?: string
  user_id: string
  record_date: string
  production_line_id: number
  supervisor_id: string | null
  section_chief_id: string | null
  shift_type: '白班' | '夜班' // 添加班次类型字段
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  items: TimesheetRecordItem[]
}

export default function TimesheetRecord() {
  const { user, isAuthenticated, refreshUser } = useAuth()
  const { markModuleAsLoaded } = useModuleLoading()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  
  // 基础数据
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([])
  const [workTypes, setWorkTypes] = useState<WorkType[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [processes, setProcesses] = useState<Process[]>([])
  const [users, setUsers] = useState<any[]>([])  
  const [supervisors, setSupervisors] = useState<any[]>([])  
  const [sectionLeaders, setSectionLeaders] = useState<any[]>([])  
  const [currentUserCompanyId, setCurrentUserCompanyId] = useState<string | null>(null)
  
  // 三级联动过滤后的数据
  const [filteredProducts, setFilteredProducts] = useState<string[]>([])
  const [filteredProcesses, setFilteredProcesses] = useState<Process[]>([])
  
  // 表单数据
  const [record, setRecord] = useState<TimesheetRecord>({
    user_id: user?.id || '',
    record_date: new Date().toISOString().split('T')[0],
    production_line_id: 0,
    supervisor_id: null,
    section_chief_id: null,
    shift_type: '白班', // 默认为白班
    status: 'draft',
    items: []
  })
  
  // 当前编辑的工时项
  const [currentItem, setCurrentItem] = useState<TimesheetRecordItem>({
    work_type_id: 0, // 初始化为0，避免硬编码
    product_id: 0,
    process_id: '',
    quantity: 0
  })
  
  // 三级联动选择的中间状态
  const [selectedProductName, setSelectedProductName] = useState<string>('')
  


  
  // 初始化一个空行
  const createEmptyItem = (): TimesheetRecordItem => {
    const workTypeId = workTypes.length > 0 ? workTypes[0].id : 1 // 默认使用1作为工时类型ID
    return {
      work_type_id: workTypeId,
      product_id: 0,
      process_id: '',
      quantity: 0
    }
  }

  // 多行表格状态
  const [tempItems, setTempItems] = useState<TimesheetRecordItem[]>([createEmptyItem()])
  
  // 产品名称输入状态
  const [productInputs, setProductInputs] = useState<{[key: number]: string}>({})
  
  // 产品下拉菜单显示状态
  const [showProductDropdown, setShowProductDropdown] = useState<{[key: number]: boolean}>({})
  
  // 生产线搜索状态
  const [productionLineSearch, setProductionLineSearch] = useState<string>('')
  const [showProductionLineDropdown, setShowProductionLineDropdown] = useState<boolean>(false)
  
  // 班长搜索状态
  const [supervisorSearch, setSupervisorSearch] = useState<string>('')
  const [showSupervisorDropdown, setShowSupervisorDropdown] = useState<boolean>(false)
  
  // 段长搜索状态
  const [sectionLeaderSearch, setSectionLeaderSearch] = useState<string>('')
  const [showSectionLeaderDropdown, setShowSectionLeaderDropdown] = useState<boolean>(false)
  
  // 班次搜索状态
  const [shiftSearch, setShiftSearch] = useState<string>('')
  const [showShiftDropdown, setShowShiftDropdown] = useState<boolean>(false)
  
  // 工时类型搜索状态
  const [workTypeInputs, setWorkTypeInputs] = useState<{[key: number]: string}>({})
  const [showWorkTypeDropdown, setShowWorkTypeDropdown] = useState<{[key: number]: boolean}>({})
  
  // 工序名称搜索状态
  const [processInputs, setProcessInputs] = useState<{[key: number]: string}>({})
  const [showProcessDropdown, setShowProcessDropdown] = useState<{[key: number]: boolean}>({})
  
  // 确认对话框状态
  const [showTimesheetConfirmDialog, setShowTimesheetConfirmDialog] = useState(false)
  
  // 刷新状态
  const [refreshing, setRefreshing] = useState(false)

  const runList = async <T,>(fn: () => Promise<{ data: T[] | null; error: any }>): Promise<T[]> => {
    const { data, error } = await safeQuery<T[]>(fn)
    if (error) throw error
    return data || []
  }

  const runSingle = async <T,>(fn: () => Promise<{ data: T | null; error: any }>): Promise<T> => {
    const { data, error } = await safeQuery<T>(fn)
    if (error) throw error
    return data as T
  }
  
  // 处理确认提交
  const handleConfirmSubmit = async () => {
    setShowTimesheetConfirmDialog(false)
    await handleSubmitRecord()
  }
  
  // 处理刷新
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      // 重置所有状态
      setRecord({
        user_id: user?.id || '',
        record_date: new Date().toISOString().split('T')[0],
        production_line_id: 0,
        supervisor_id: null,
        section_chief_id: null,
        shift_type: '白班',
        status: 'draft',
        items: []
      })
      setTempItems([createEmptyItem()])
      setProductInputs({})
      setShowProductDropdown({})
      setSelectedProductName('')
      setCurrentItem({
        work_type_id: 0,
        product_id: 0,
        process_id: '',
        quantity: 0
      })
      
      // 重新加载所有数据
      await loadInitialData()
      toast.success('数据已刷新')
    } catch (error) {
      toast.error('刷新失败，请重试')
    } finally {
      setRefreshing(false)
    }
  }

  const loadCurrentUserCompany = async () => {
    if (!user) return
    try {
      const userData = await runSingle<{ company_id: string }>(() =>
        supabase
          .from('users')
          .select('company_id')
          .eq('id', user.id)
          .single()
      )
      setCurrentUserCompanyId(userData.company_id)
    } catch {
      toast.error('获取用户公司信息失败')
    }
  }

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.production-line-dropdown')) {
        setShowProductionLineDropdown(false)
      }
      if (!target.closest('.supervisor-dropdown')) {
        setShowSupervisorDropdown(false)
      }
      if (!target.closest('.section-leader-dropdown')) {
        setShowSectionLeaderDropdown(false)
      }
      if (!target.closest('.shift-dropdown')) {
        setShowShiftDropdown(false)
      }
      if (!target.closest('.work-type-dropdown')) {
        setShowWorkTypeDropdown({})
      }
      if (!target.closest('.process-dropdown')) {
        setShowProcessDropdown({})
      }
      if (!target.closest('.product-dropdown')) {
        setShowProductDropdown({})
      }
    }

    const hasAnyDropdownOpen = showProductionLineDropdown || 
                               showSupervisorDropdown || 
                               showSectionLeaderDropdown || 
                               showShiftDropdown ||
                               Object.values(showWorkTypeDropdown).some(Boolean) ||
                               Object.values(showProcessDropdown).some(Boolean) ||
                               Object.values(showProductDropdown).some(Boolean)

    if (hasAnyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProductionLineDropdown, showSupervisorDropdown, showSectionLeaderDropdown, showShiftDropdown, showWorkTypeDropdown, showProcessDropdown, showProductDropdown])

  useEffect(() => {
    if (user) {
      loadInitialData()
    }
  }, [user])

  // 当生产线选择改变时，加载对应的班长和段长列表并重置班长和段长选择
  useEffect(() => {
    if (record.production_line_id) {
      // 先重置班长和段长选择
      setRecord(prev => ({ 
        ...prev, 
        supervisor_id: null, 
        section_chief_id: null 
      }))
      
      // 然后加载该生产线的班长和段长列表（自动填写逻辑会在loadSectionLeaders中执行）
      loadSupervisors(record.production_line_id.toString())
      loadSectionLeaders(record.production_line_id.toString())
    } else {
      // 如果没有选择生产线，清空班长和段长列表
      setSupervisors([])
      setSectionLeaders([])
      setRecord(prev => ({ 
        ...prev, 
        supervisor_id: null, 
        section_chief_id: null 
      }))
    }
  }, [record.production_line_id, productionLines])

  // 当生产线选择改变时，重新加载工时类型、产品和工序数据，并重置三级联动选择
  useEffect(() => {
    if (record.production_line_id) {
      // 重置三级联动的选择状态
      setCurrentItem(prev => ({
        ...prev,
        work_type_id: 0, // 重置为0，避免硬编码
        product_id: 0,
        process_id: ''
      }))
      setSelectedProductName('')
      
      // 重新加载基于生产线的数据（不要先清空，直接加载新数据）
      loadWorkTypes()
      loadProducts()
      loadProcesses()
      
    } else {
      console.log('🧹 清空所有三级联动数据')
      // 如果没有选择生产线，清空所有三级联动数据
      setWorkTypes([])
      setProducts([])
      setProcesses([])
      setCurrentItem(prev => ({
        ...prev,
        work_type_id: 0,
        product_id: 0,
        process_id: ''
      }))
      setSelectedProductName('')
    }
  }, [record.production_line_id, productionLines])

  // 自动填写生产线（当只有一个选项时）
  useEffect(() => {
    if (productionLines.length === 1 && record.production_line_id === 0) {
      setRecord(prev => ({ ...prev, production_line_id: productionLines[0].id }))
    }
  }, [productionLines, record.production_line_id])

  // 自动填写班长（当过滤后只有一个选项时）
  useEffect(() => {
    if (record.production_line_id && !record.supervisor_id && users.length > 0 && currentUserCompanyId) {
      const filteredSupervisors = users.filter(u => {
        // 首先过滤角色为班长的用户
        if (u.role?.name !== '班长') return false
        
        // 过滤同一公司的班长
        if (u.company_id !== currentUserCompanyId) return false
        
        // 如果选择了生产线，进一步过滤该生产线的班长
        if (record.production_line_id) {
          const selectedProductionLine = productionLines.find(line => line.id === record.production_line_id)
          if (selectedProductionLine) {
            // 检查该班长是否在选定的生产线工作
            const userProcesses = processes.filter(p => p.production_line === selectedProductionLine.name)
            // 如果该生产线有工序，则显示该班长
            return userProcesses.length > 0
          }
        }
        
        return true
      })
      
      if (filteredSupervisors.length === 1) {
        setRecord(prev => ({ ...prev, supervisor_id: filteredSupervisors[0].id }))
      }
    }
  }, [record.production_line_id, record.supervisor_id, users, currentUserCompanyId, productionLines, processes])

  // 自动填写段长（当过滤后只有一个选项时）
  useEffect(() => {
    if (record.production_line_id && !record.section_chief_id && users.length > 0 && currentUserCompanyId) {
      const filteredSectionChiefs = users.filter(u => {
        // 首先过滤角色为段长的用户
        if (u.role?.name !== '段长') return false
        
        // 过滤同一公司的段长
        if (u.company_id !== currentUserCompanyId) return false
        
        // 如果选择了生产线，进一步过滤该生产线的段长
        if (record.production_line_id) {
          const selectedProductionLine = productionLines.find(line => line.id === record.production_line_id)
          if (selectedProductionLine) {
            // 检查该段长是否在选定的生产线工作
            const userProcesses = processes.filter(p => p.production_line === selectedProductionLine.name)
            // 如果该生产线有工序，则显示该段长
            return userProcesses.length > 0
          }
        }
        
        return true
      })
      
      if (filteredSectionChiefs.length === 1) {
        setRecord(prev => ({ ...prev, section_chief_id: filteredSectionChiefs[0].id }))
      }
    }
  }, [record.production_line_id, record.section_chief_id, users, currentUserCompanyId, productionLines, processes])

  // 监控工时类型数据加载状态并触发初始联动
  useEffect(() => {
    // 确保工时类型数据、生产线信息和工序数据都已加载
    if (workTypes.length > 0 && record.production_line_id && processes.length > 0) {
      const workTypeExists = workTypes.find(wt => wt.id === currentItem.work_type_id)
      
      // 如果默认的工时类型ID=1不存在，但有其他工时类型，使用第一个工时类型
      if (!workTypeExists && workTypes.length > 0) {
        setCurrentItem(prev => ({ ...prev, work_type_id: workTypes[0].id }))
        return // 等待下次useEffect执行
      }
      
      // 工时类型数据加载完成后，触发工时类型变更逻辑以加载对应的产品数据
      if (workTypeExists) {
        const targetWorkTypeId = currentItem.work_type_id
        // 修复：传递数字类型而不是字符串
        handleWorkTypeChange(targetWorkTypeId)
      }
    }
  }, [workTypes, record.production_line_id, processes, currentItem.work_type_id])

  // 自动填写产品（当只有一个选项时）
  useEffect(() => {
    if (products.length === 1 && currentItem.product_id === 0) {
      setCurrentItem(prev => ({ ...prev, product_id: products[0].id }))
    }
  }, [products, currentItem.product_id])

  // 自动填写工序（当只有一个选项时）
  useEffect(() => {
    if (processes.length === 1 && currentItem.process_id === '') {
      setCurrentItem(prev => ({ ...prev, process_id: processes[0].id }))
    }
  }, [processes, currentItem.process_id])



  const loadInitialData = async () => {
    if (!user) {
      return
    }
    
    try {
      setLoading(true)
      
      // 首先加载基础数据
      await Promise.all([
        loadCurrentUserCompany(),
        loadProductionLines(), // 确保生产线数据被加载
        loadUsers(),

      ])
      
      // 注意：不在这里加载workTypes和products，因为它们依赖于生产线选择
      // 这些数据会在用户选择生产线后通过useEffect自动加载
      
      // 标记模块为已加载
      markModuleAsLoaded(MODULE_IDS.TIME_RECORD)
      
    } catch (error) {
      toast.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }



  const loadProductionLines = async () => {
    if (!user) {
      return
    }
    
    try {
      const isSuper = isSuperAdmin(user.role)
      
      console.log('🔍 TimesheetRecord.tsx - loadProductionLines: 用户角色:', user.role)
      console.log('🔍 TimesheetRecord.tsx - loadProductionLines: 是否为超级管理员:', isSuper)
      
      // 使用与ProcessManagement.tsx相同的查询逻辑：获取所有processes数据
      let query = supabase
        .from('processes')
        .select(`
          *,
          companies!inner(
            name
          )
        `)
        .order('created_at', { ascending: false })
      
      // 检查用户角色，如果是超级管理员，获取所有公司的生产线
      if (isSuper) {
        console.log('🔍 TimesheetRecord.tsx - loadProductionLines: 超级管理员模式，获取所有公司的生产线')
        // 超级管理员不需要添加公司过滤条件
      } else {
        // 首先获取当前用户的公司信息
        const userData = await runSingle<{ company_id: string }>(() =>
          supabase
            .from('users')
            .select('company_id')
            .eq('id', user.id)
            .single()
        )
        
        console.log('loadProductionLines: 用户公司ID:', userData.company_id)
        
        // 添加公司过滤条件
        query = query.eq('company_id', userData.company_id)
      }
      
      const data = await runList<any>(() => query)

      console.log('📊 TimesheetRecord.tsx - loadProductionLines: 查询到的原始数据:', data)
      console.log('📊 TimesheetRecord.tsx - loadProductionLines: 原始数据数量:', data?.length || 0)
      
      // 使用与ProcessManagement.tsx相同的生产线提取逻辑
      const processesWithCompanyName = (data || []).map(process => ({
        ...process,
        company_name: process.companies?.name || '未知公司'
      }))
      
      // 根据用户角色过滤数据
      let filteredProcesses
      if (isSuper) {
        filteredProcesses = processesWithCompanyName
      } else {
        // 获取用户公司ID
        const { data: userData } = await supabase
          .from('users')
          .select('company_id')
          .eq('id', user.id)
          .single()
        
        filteredProcesses = processesWithCompanyName.filter(p => p.company_id === userData?.company_id)
      }
      
      // 提取唯一的生产线并保留company_id信息
      const productionLineMap = new Map<string, { company_id: string, is_active: boolean }>()
      
      filteredProcesses.forEach(current => {
        if (current.production_line) {
          productionLineMap.set(current.production_line, {
            company_id: current.company_id,
            is_active: current.is_active
          })
        }
      })

      console.log('🗺️ TimesheetRecord.tsx - loadProductionLines: 生产线映射表:', Array.from(productionLineMap.entries()))
      
      const uniqueProductionLines: ProductionLine[] = Array.from(productionLineMap.entries()).map(([name, info], index) => ({
        id: index + 1, // 使用索引作为ID
        name: name,
        is_active: info.is_active,
        company_id: info.company_id // 保留company_id信息
      }))

      console.log('🎯 TimesheetRecord.tsx - loadProductionLines: 最终生产线列表:', uniqueProductionLines)
      console.log('🎯 TimesheetRecord.tsx - loadProductionLines: 最终生产线数量:', uniqueProductionLines.length)
      
      setProductionLines(uniqueProductionLines)
      
    } catch (error) {
      toast.error('加载生产线信息失败')
    }
  }

  const loadWorkTypes = async () => {
    if (!user) return
    
    try {
      // 如果没有选择生产线，清空工时类型
      if (!record.production_line_id) {
        setWorkTypes([])
        return
      }
      
      // 根据选择的生产线获取对应的生产线名称
      const selectedProductionLine = productionLines.find(line => line.id === record.production_line_id)
      if (!selectedProductionLine) {
        setWorkTypes([])
        return
      }
      
      const isSuper = isSuperAdmin(user.role)
      let companyId: string
      
      if (isSuper) {
        // 超级管理员使用选择的生产线对应的公司ID
        if (!selectedProductionLine.company_id) {
          console.error('loadWorkTypes: 生产线缺少company_id信息')
          setWorkTypes([])
          return
        }
        companyId = selectedProductionLine.company_id
      } else {
        // 普通用户使用自己的公司ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('company_id')
          .eq('id', user.id)
          .single()
        
        if (userError) {
          throw userError
        }
        companyId = userData.company_id
      }
      
      // 从processes表获取工时类型数据（production_category字段），根据生产线过滤
      const data = await runList<any>(() =>
        supabase
          .from('processes')
          .select('production_category')
          .eq('company_id', companyId)
          .eq('production_line', selectedProductionLine.name)
          .eq('is_active', true)
          .not('production_category', 'is', null)
      )
      
      // 去重并过滤有效的工时类型，排除数字值
      const uniqueWorkTypes = [...new Set(data?.map(item => item.production_category) || [])]
        .filter(category => category && isNaN(Number(category))) // 过滤掉数字值
        .sort()
      
      // 转换为workTypes格式
      const workTypesData = uniqueWorkTypes.map((category, index) => ({
        id: index + 1, // 使用索引作为ID
        name: category,
        is_active: true
      }))
      
      setWorkTypes(workTypesData)
      
    } catch (error) {
      toast.error('加载工时类型数据失败')
    }
  }

  const loadProducts = async () => {
    if (!user) return
    
    try {
      console.log('loadProducts: 开始加载产品数据，用户ID:', user.id)
      
      // 如果没有选择生产线，清空产品
      if (!record.production_line_id) {
        console.log('loadProducts: 未选择生产线，清空产品')
        setProducts([])
        return
      }
      
      // 根据选择的生产线获取对应的生产线名称
      const selectedProductionLine = productionLines.find(line => line.id === record.production_line_id)
      if (!selectedProductionLine) {
        console.log('loadProducts: 未找到对应的生产线信息')
        setProducts([])
        return
      }
      
      console.log('loadProducts: 当前选择的生产线:', selectedProductionLine.name)
      
      const isSuper = isSuperAdmin(user.role)
      let companyId: string
      
      if (isSuper) {
        // 超级管理员使用选择的生产线对应的公司ID
        if (!selectedProductionLine.company_id) {
          console.error('loadProducts: 生产线缺少company_id信息')
          setProducts([])
          return
        }
        companyId = selectedProductionLine.company_id
        console.log('loadProducts: 超级管理员使用生产线公司ID:', companyId)
      } else {
        // 普通用户使用自己的公司ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('company_id')
          .eq('id', user.id)
          .single()
        
        if (userError) {
          console.error('loadProducts: 获取用户公司信息失败:', userError)
          throw userError
        }
        companyId = userData.company_id
        console.log('loadProducts: 普通用户使用自己的公司ID:', companyId)
      }
      
      // 根据公司和选择的生产线获取产品数据
      const data = await runList<any>(() =>
        supabase
          .from('processes')
          .select('id, product_name, production_line')
          .eq('company_id', companyId)
          .eq('production_line', selectedProductionLine.name)
          .eq('is_active', true)
      )
      
      console.log('loadProducts: 查询到的原始产品数据:', data)
      
      // 去重并排序，创建Product对象数组
      const uniqueProductNames = [...new Set(data?.map(item => item.product_name) || [])]
        .filter(Boolean)
        .sort()
      
      const productObjects: Product[] = uniqueProductNames.map((name, index) => ({
        id: index + 1, // 临时ID，用于下拉框的key
        name: name,
        code: '',
        is_active: true
      }))
      
      console.log('loadProducts: 去重后的产品数据:', productObjects)
      setProducts(productObjects)
      
    } catch (error) {
      console.error('loadProducts: 加载产品数据失败:', error)
      toast.error('加载产品数据失败')
    }
  }

  const loadProcesses = async () => {
    if (!user) return
    
    try {
      console.log('loadProcesses: 开始加载工序数据，用户ID:', user.id)
      
      // 如果没有选择生产线，清空工序
      if (!record.production_line_id) {
        console.log('loadProcesses: 未选择生产线，清空工序')
        setProcesses([])
        return
      }
      
      // 根据选择的生产线获取对应的生产线名称
      const selectedProductionLine = productionLines.find(line => line.id === record.production_line_id)
      if (!selectedProductionLine) {
        console.log('loadProcesses: 未找到对应的生产线信息')
        setProcesses([])
        return
      }
      
      console.log('loadProcesses: 当前选择的生产线:', selectedProductionLine.name)
      
      const isSuper = isSuperAdmin(user.role)
      let companyId: string
      
      if (isSuper) {
        // 超级管理员使用选择的生产线对应的公司ID
        if (!selectedProductionLine.company_id) {
          console.error('loadProcesses: 生产线缺少company_id信息')
          setProcesses([])
          return
        }
        companyId = selectedProductionLine.company_id
        console.log('loadProcesses: 超级管理员使用生产线公司ID:', companyId)
      } else {
        // 普通用户使用自己的公司ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('company_id')
          .eq('id', user.id)
          .single()
        
        if (userError) {
          console.error('loadProcesses: 获取用户公司信息失败:', userError)
          throw userError
        }
        companyId = userData.company_id
        console.log('loadProcesses: 普通用户使用自己的公司ID:', companyId)
      }
      
      // 根据公司和选择的生产线获取工序数据，注意字段名要与数据库表结构一致
      const data = await runList<any>(() =>
        supabase
          .from('processes')
          .select('id, product_process, product_name, company_id, production_line, production_category, unit_price, is_active')
          .eq('company_id', companyId)
          .eq('production_line', selectedProductionLine.name)
          .eq('is_active', true)
          .order('product_process')
      )
      
      console.log('loadProcesses: 查询到的原始数据:', data)
      
      // 手动映射数据结构，确保字段名正确
      const processesData = data?.map(item => ({
        id: item.id,
        name: item.product_process, // 工序名称
        product_name: item.product_name, // 产品名称
        company_id: item.company_id,
        production_line: item.production_line, // 生产线
        production_category: item.production_category, // 生产类别
        product_process: item.product_process, // 工序名称（实际字段）
        unit_price: item.unit_price, // 单价
        is_active: item.is_active
      })) || []
      
      setProcesses(processesData)
      
    } catch (error) {
      toast.error('加载工序数据失败')
    }
  }

  const loadUsers = async () => {
    const data = await runList<any>(() =>
      supabase
        .from('users')
        .select('id, name, company_id, production_line, role:user_roles!inner(name)')
        .eq('is_active', true)
        .order('name')
    )
    setUsers(data || [])
  }

  // 根据选择的生产线加载班长列表
  const loadSupervisors = async (productionLineId: string) => {
    if (!productionLineId) {
      setSupervisors([])
      return
    }

    try {
      // 根据生产线ID找到生产线名称
      const selectedLine = productionLines.find(line => line.id === parseInt(productionLineId))
      if (!selectedLine) {
        setSupervisors([])
        return
      }
      
      // 查询该生产线下角色为班长的用户
      const data = await runList<any>(() =>
        supabase
          .from('users')
          .select(`
            id, 
            name, 
            production_line,
            role:user_roles!inner(name)
          `)
          .eq('production_line', selectedLine.name)
          .eq('user_roles.name', '班长')
          .eq('is_active', true)
          .order('name')
      )
      setSupervisors(data || [])
      
      // 自动填写功能：如果只有一个班长选项且用户未选择，则自动选择
      if (data && data.length === 1 && !record.supervisor_id) {
        setRecord(prev => ({ ...prev, supervisor_id: data[0].id }))
      }
      
    } catch (error) {
      toast.error('加载班长数据失败')
      setSupervisors([])
    }
  }

  // 根据选择的生产线加载段长列表
  const loadSectionLeaders = async (productionLineId: string) => {
    if (!productionLineId) {
      setSectionLeaders([])
      return
    }

    try {
      // 根据生产线ID找到生产线名称
      const selectedLine = productionLines.find(line => line.id === parseInt(productionLineId))
      if (!selectedLine) {
        setSectionLeaders([])
        return
      }
      
      console.log('loadSectionLeaders: 当前选择的生产线:', selectedLine.name)
      
      const isSuper = isSuperAdmin(user?.role)
      let companyId: string
      
      if (isSuper) {
        // 超级管理员使用选择的生产线对应的公司ID
        if (!selectedLine.company_id) {
          console.error('loadSectionLeaders: 生产线缺少company_id信息')
          setSectionLeaders([])
          return
        }
        companyId = selectedLine.company_id
        console.log('loadSectionLeaders: 超级管理员使用生产线公司ID:', companyId)
      } else {
        // 普通用户使用自己的公司ID
      const userData = await runSingle<{ company_id: string }>(() =>
        supabase
          .from('users')
          .select('company_id')
          .eq('id', user?.id)
          .single()
      )
        companyId = userData.company_id
        console.log('loadSectionLeaders: 普通用户使用自己的公司ID:', companyId)
      }
      
      // 查询该生产线下角色为段长的用户，添加公司过滤
      const data = await runList<any>(() =>
        supabase
          .from('users')
          .select(`
            id, 
            name, 
            production_line,
            company_id,
            role:user_roles!inner(name)
          `)
          .eq('production_line', selectedLine.name)
          .eq('company_id', companyId)
          .eq('user_roles.name', '段长')
          .eq('is_active', true)
          .order('name')
      )
      console.log('loadSectionLeaders: 查询到的段长数据:', data)
      setSectionLeaders(data || [])
      
      // 自动填写功能：如果只有一个段长选项且用户未选择，则自动选择
      if (data && data.length === 1 && !record.section_chief_id) {
        setRecord(prev => ({ ...prev, section_chief_id: data[0].id }))
      }
      
    } catch (error) {
      console.error('loadSectionLeaders: 加载段长数据失败:', error)
      toast.error('加载段长数据失败')
      setSectionLeaders([])
    }
  }



  const handleRecordChange = (field: keyof TimesheetRecord, value: any) => {
    setRecord(prev => {
      let processedValue = value
      
      // 对数字类型字段进行特殊处理，确保不会出现NaN
      if (field === 'production_line_id') {
        processedValue = parseInt(value) || 0
      } else if (field === 'supervisor_id' || field === 'section_chief_id') {
        // 对于可能为空的ID字段，保持原值或设为null
        processedValue = value || null
      }
      
      const newRecord = { ...prev, [field]: processedValue }
      
      // 如果改变的是生产线，重置班长和段长选择
      if (field === 'production_line_id') {
        newRecord.supervisor_id = null
        newRecord.section_chief_id = null
      }
      
      return newRecord
    })
  }

  const handleItemChange = (field: keyof TimesheetRecordItem, value: any) => {
    setCurrentItem(prev => ({ ...prev, [field]: value }))
  }

  // 处理工时类型选择变化
  const handleWorkTypeChange = (workTypeId: number) => {
    setCurrentItem(prev => ({
      ...prev,
      work_type_id: workTypeId,
      product_id: 0,
      process_id: ''
    }))
    setSelectedProductName('')
    
    if (workTypeId === 0) {
      setFilteredProducts([])
      setFilteredProcesses([])
      return
    }
    
    // 根据工时类型ID找到对应的工时类型名称
    const selectedWorkType = workTypes.find(wt => wt.id === workTypeId)
    if (!selectedWorkType) {
      console.error('handleWorkTypeChange: 未找到对应的工时类型:', workTypeId)
      setFilteredProducts([])
      setFilteredProcesses([])
      return
    }
    
    console.log('handleWorkTypeChange: 选择的工时类型名称:', selectedWorkType.name)
    
    // 根据选择的工时类型和用户的生产线过滤产品
    const userProductionLine = getUserProductionLine()
    console.log('handleWorkTypeChange: 用户生产线:', userProductionLine)
    console.log('handleWorkTypeChange: 所有工序数据:', processes)
    console.log('handleWorkTypeChange: 所有产品数据:', products)
    
    if (userProductionLine) {
      const filteredProcessesByLineAndType = processes.filter(p => {
        const lineMatch = p.production_line === userProductionLine
        const typeMatch = p.production_category === selectedWorkType.name
        const match = lineMatch && typeMatch
        console.log(`handleWorkTypeChange: 工序 ${p.product_process} 生产线匹配:${lineMatch} 工时类型匹配:${typeMatch} 总匹配:${match}`)
        return match
      })
      console.log('handleWorkTypeChange: 按生产线和工时类型过滤的工序:', filteredProcessesByLineAndType)
      
      const availableProducts = filteredProcessesByLineAndType
        .map(p => p.product_name)
        .filter((name, index, arr) => name && arr.indexOf(name) === index) // 去重并过滤空值
        .filter(Boolean) // 确保没有空值
      console.log('handleWorkTypeChange: 可用产品列表:', availableProducts)
      setFilteredProducts(availableProducts)
    } else {
      console.log('handleWorkTypeChange: 用户生产线为空，清空产品列表')
      setFilteredProducts([])
    }
    setFilteredProcesses([])
  }

  // 处理产品名称选择变化
  const handleProductNameChange = (productName: string) => {
    setSelectedProductName(productName)
    setCurrentItem(prev => ({
      ...prev,
      product_id: 0, // 重置product_id，因为现在用产品名称
      process_id: ''
    }))
    
    if (!productName) {
      setFilteredProcesses([])
      return
    }
    
    // 获取当前选择的工时类型
    const selectedWorkType = workTypes.find(wt => wt.id === currentItem.work_type_id)
    if (!selectedWorkType) {
      setFilteredProcesses([])
      return
    }
    
    // 根据选择的产品名称、用户的生产线和工时类型过滤工序
    const userProductionLine = getUserProductionLine()
    
    if (userProductionLine) {
      const availableProcesses = processes.filter(p => {
        const lineMatch = p.production_line === userProductionLine
        const productMatch = p.product_name === productName
        const typeMatch = p.production_category === selectedWorkType.name
        const isActive = p.is_active
        const match = lineMatch && productMatch && typeMatch && isActive
        return match
      })
      setFilteredProcesses(availableProcesses)
    } else {
      setFilteredProcesses([])
    }
  }

  // 获取用户的生产线信息
  const getUserProductionLine = () => {
    if (record.production_line_id) {
      const selectedLine = productionLines.find(line => line.id === record.production_line_id)
      return selectedLine?.name
    }
    return null
  }

  // 多行表格相关函数
  const addNewRow = () => {
    setTempItems(prev => [...prev, createEmptyItem()])
    // 为新行初始化产品输入状态
    const newIndex = tempItems.length
    setProductInputs(prev => ({ ...prev, [newIndex]: '' }))
    setShowProductDropdown(prev => ({ ...prev, [newIndex]: false }))
  }
  
  const removeTempRow = (index: number) => {
    setTempItems(prev => {
      const newItems = prev.filter((_, i) => i !== index)
      // 确保至少保留一行
      return newItems.length === 0 ? [createEmptyItem()] : newItems
    })
    
    // 清理对应的产品输入状态
    setProductInputs(prev => {
      const newInputs = { ...prev }
      delete newInputs[index]
      // 重新索引剩余的输入状态
      const reindexedInputs: { [key: number]: string } = {}
      Object.keys(newInputs)
        .map(k => parseInt(k))
        .filter(k => k > index)
        .forEach(k => {
          reindexedInputs[k - 1] = newInputs[k]
        })
      Object.keys(newInputs)
        .map(k => parseInt(k))
        .filter(k => k < index)
        .forEach(k => {
          reindexedInputs[k] = newInputs[k]
        })
      return reindexedInputs
    })
    
    setShowProductDropdown(prev => {
      const newDropdown = { ...prev }
      delete newDropdown[index]
      // 重新索引剩余的下拉菜单状态
      const reindexedDropdown: { [key: number]: boolean } = {}
      Object.keys(newDropdown)
        .map(k => parseInt(k))
        .filter(k => k > index)
        .forEach(k => {
          reindexedDropdown[k - 1] = newDropdown[k]
        })
      Object.keys(newDropdown)
        .map(k => parseInt(k))
        .filter(k => k < index)
        .forEach(k => {
          reindexedDropdown[k] = newDropdown[k]
        })
      return reindexedDropdown
    })
  }
  

  
  const handleTempItemChange = (index: number, field: keyof TimesheetRecordItem, value: any) => {
    setTempItems(prev => {
      const newItems = [...prev]
      let processedValue = value
      
      // 对不同类型的字段进行数据验证和处理，确保不会出现NaN
      if (field === 'work_type_id' || field === 'product_id') {
        processedValue = parseInt(value) || 0
      } else if (field === 'process_id') {
        processedValue = value || ''
      } else if (field === 'quantity') {
        processedValue = parseFloat(value) || 0
      }
      
      newItems[index] = { ...newItems[index], [field]: processedValue }
      
      // 如果是工时类型变化，需要重置产品和工序
      if (field === 'work_type_id') {
        newItems[index].product_id = 0
        newItems[index].process_id = ''
        // 清空对应的产品输入框
        setProductInputs(prev => ({ ...prev, [index]: '' }))
      }
      // 如果是产品变化，需要重置工序
      else if (field === 'product_id') {
        newItems[index].process_id = ''
      }
      
      return newItems
    })
  }
  
  const getProductsForWorkType = (workTypeId: number) => {
    if (!workTypeId || !record.production_line_id) return []
    
    const workType = workTypes.find(wt => wt.id === workTypeId)
    const userProductionLine = getUserProductionLine()
    
    if (!workType || !userProductionLine) return []
    
    // 获取符合条件的工序，然后提取唯一的产品名称
    const filteredProcesses = processes.filter(p => {
      return p.production_line === userProductionLine &&
             p.production_category === workType.name &&
             p.is_active
    })
    
    // 创建产品名称的唯一列表，使用产品名称的hash作为ID
    const uniqueProducts = [...new Set(filteredProcesses.map(p => p.product_name))]
    const availableProducts = uniqueProducts.map((name, index) => ({
      id: index + 1, // 使用简单的数字ID
      name: name
    }))
    
    return availableProducts
  }
  
  const getProcessesForProduct = (productId: number, workTypeId?: number) => {
    if (!productId) {
      return []
    }
    
    const userProductionLine = getUserProductionLine()
    if (!userProductionLine) {
      return []
    }
    
    // 获取当前工时类型对应的产品列表
    const availableProducts = workTypeId ? getProductsForWorkType(workTypeId) : []
    const selectedProduct = availableProducts.find(p => p.id === productId)
    
    if (!selectedProduct) {
      return []
    }
    
    // 根据产品名称过滤工序
    const filteredProcesses = processes.filter(p => 
      p.production_line === userProductionLine &&
      p.product_name === selectedProduct.name &&
      p.is_active
    )
    
    return filteredProcesses
  }
  
  const batchAddItems = () => {
    // 验证所有临时项目
    const validItems = tempItems.filter(item => {
      return item.work_type_id && item.process_id && item.quantity > 0
    })
    
    if (validItems.length === 0) {
      toast.error('请至少填写一行完整的工时记录')
      return
    }
    
    // 批量添加到正式记录中
    setRecord(prev => ({
      ...prev,
      items: [...prev.items, ...validItems.map(item => ({
        ...item,
        total_amount: item.quantity
      }))]
    }))
    
    // 清空临时数据
    setTempItems([])
    
    toast.success(`成功添加 ${validItems.length} 条工时记录`)
  }

  const addOrUpdateItem = () => {
    console.log('=== addOrUpdateItem 开始执行 ===')
    console.log('当前表单数据:', {
      work_type_id: currentItem.work_type_id,
      selectedProductName: selectedProductName,
      process_id: currentItem.process_id,
      quantity: currentItem.quantity,
      production_line_id: record.production_line_id
    })
    console.log('当前record.items长度:', record.items.length)
    console.log('当前record.items内容:', record.items)
    
    // 验证必填字段
    if (!currentItem.work_type_id) {
      console.log('验证失败: 未选择工时类型')
      toast.error('请选择工时类型')
      return
    }
    if (!selectedProductName) {
      console.log('验证失败: 未选择产品名称')
      toast.error('请选择产品名称')
      return
    }
    if (!currentItem.process_id) {
      toast.error('请选择工序名称')
      return
    }
    if (currentItem.quantity <= 0) {
      toast.error('请输入有效的数量（大于0）')
      return
    }

    // 从选中的工序中获取产品信息
    const selectedProcess = processes.find(p => p.id === currentItem.process_id)
    if (!selectedProcess) {
      toast.error('工序信息错误，请重新选择')
      return
    }
    
    // 使用简单的数字作为product_id（数据库中没有products表）
    const productId = 1 // 使用固定数字值，因为数据库表结构中product_id是integer类型
    
    const newItem = {
      ...currentItem,
      product_id: productId, // 使用正确的产品ID
      total_amount: currentItem.quantity
    }

    // 添加新项 - 每次点击都创建新的一行记录
    setRecord(prev => {
      const newItems = [...prev.items, newItem]
      const newRecord = { ...prev, items: newItems }
      return newRecord
    })
    
    // 添加成功后只重置数量，保留其他选择，方便连续添加相似记录
    setCurrentItem(prev => ({
      ...prev,
      quantity: 0
    }))
    
    toast.success(`工时记录已添加到第${record.items.length + 1}行，可继续添加更多记录`)
  }



  const saveRecord = async () => {
    if (!user) {
      toast.error('用户未登录')
      return
    }

    // 验证必填字段
    if (!record.production_line_id) {
      toast.error('请选择生产线')
      return
    }
    if (!record.supervisor_id) {
      toast.error('请选择班长')
      return
    }
    if (!record.section_chief_id) {
      toast.error('请选择段长')
      return
    }
    const finalItems = tempItems.filter(item => item.work_type_id && item.process_id && item.quantity > 0)
    if (finalItems.length === 0) {
      toast.error('请至少添加一条工时记录')
      return
    }
    
    // 验证工时记录项的必填字段
    for (let i = 0; i < record.items.length; i++) {
      const item = record.items[i]
      if (!item.work_type_id) {
        toast.error(`第${i + 1}条记录：请选择工作类型`)
        return
      }
      if (!item.product_id) {
        toast.error(`第${i + 1}条记录：请选择产品`)
        return
      }
      if (!item.process_id) {
        toast.error(`第${i + 1}条记录：请选择工序`)
        return
      }
      if (!item.quantity || item.quantity <= 0) {
        toast.error(`第${i + 1}条记录：请输入有效的数量`)
        return
      }
    }

    try {
      setLoading(true)
      
      // 保存工时记录
      const recordToInsert = {
        user_id: user.id, // 使用AuthContext中的用户ID
        record_date: record.record_date,
        production_line_id: record.production_line_id,
        supervisor_id: record.supervisor_id,
        section_chief_id: record.section_chief_id,
        status: 'draft'
      }
      
      const recordData = await runSingle<any>(() =>
        supabase
          .from('timesheet_records')
          .insert(recordToInsert)
          .select()
          .single()
      )

      // 保存工时记录项
      const itemsToInsert = finalItems.map(item => ({
        timesheet_record_id: recordData.id,
        work_type_id: item.work_type_id,
        product_id: item.product_id,
        process_id: item.process_id,
        quantity: item.quantity
        // total_amount是数据库生成列，不需要手动插入
      }))

      await safeQuery(() =>
        supabase
          .from('timesheet_record_items')
          .insert(itemsToInsert)
      )

      toast.success('工时记录保存成功')
      
      // 重置表单
      setRecord({
        user_id: user.id,
        record_date: new Date().toISOString().split('T')[0],
        production_line_id: 0,
        supervisor_id: null,
        section_chief_id: null,
        shift_type: '白班',
        status: 'draft',
        items: []
      })
      
    } catch (error: any) {
      // 提供更详细的错误信息
      let errorMessage = '保存工时记录失败'
      if (error?.code === '42501') {
        errorMessage = '权限不足：无法保存工时记录，请联系管理员检查数据库权限配置'
      } else if (error?.message) {
        errorMessage = `保存工时记录失败: ${error.message}`
      }
      
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitClick = () => {
    // 验证班长和段长是否已选择
    if (!record.supervisor_id) {
      toast.error('❌ 请选择班长', {
        duration: 4000,
        description: '班长是必填项，请在基本信息中选择班长'
      })
      return
    }
    
    if (!record.section_chief_id) {
      toast.error('❌ 请选择段长', {
        duration: 4000,
        description: '段长是必填项，请在基本信息中选择段长'
      })
      return
    }
    
    // 验证产品名称是否完整
    const validItems = tempItems.filter(item => {
      return item.work_type_id && item.process_id && item.quantity > 0
    })
    
    for (let i = 0; i < validItems.length; i++) {
      const item = validItems[i]
      const product = products.find(p => p.id === item.product_id)
      if (!product || !product.name || product.name.trim() === '') {
        toast.error('❌ 产品名称不完整', {
          duration: 4000,
          description: `第 ${tempItems.indexOf(item) + 1} 条记录的产品名称不完整，请重新选择产品`
        })
        return
      }
    }
    
    // 验证通过，打开确认弹窗
    setShowTimesheetConfirmDialog(true)
  }

  const handleSubmitRecord = async () => {
    // 首先将临时数据添加到正式记录中
    const validItems = tempItems.filter(item => {
      return item.work_type_id && item.process_id && item.quantity > 0
    })
    
    // 合并所有工时记录项（现有的 + 临时的）
    const allItems = [...record.items, ...validItems.map(item => ({
      ...item,
      total_amount: item.quantity
    }))]
    
    if (validItems.length > 0) {
      toast.success(`成功添加 ${validItems.length} 条工时记录`)
    }
    
    // 直接提交，传递合并后的记录项
    await submitForApproval(allItems)
  }

  const submitForApproval = async (itemsToSubmit?: TimesheetRecordItem[]) => {
    let recordToInsert: any
    
    if (!user) {
      toast.error('❌ 用户未登录，请重新登录后再试', {
        duration: 5000,
        description: '登录状态已过期，请刷新页面重新登录'
      })
      return
    }

    // 验证必填字段
    if (!record.supervisor_id) {
      toast.error('❌ 请选择班长', {
        duration: 4000,
        description: '班长是必填项，请在基本信息中选择班长'
      })
      return
    }
    
    if (!record.section_chief_id) {
      toast.error('❌ 请选择段长', {
        duration: 4000,
        description: '段长是必填项，请在基本信息中选择段长'
      })
      return
    }
    
    // 检查要提交的工时记录项
    const finalItems = itemsToSubmit || record.items
    if (finalItems.length === 0) {
      toast.error('❌ 请至少添加一条工时记录', {
        duration: 4000,
        description: '工时记录不能为空，请添加至少一条有效的工时记录'
      })
      return
    }
    
    // 显示提交中的提示
    toast.loading('🔄 正在提交工时记录，请稍候...', { 
      id: 'submit-loading',
      description: `正在提交 ${finalItems.length} 条工时记录到审核系统`
    })
    
    try {
      setLoading(true)
      
      const ok = await checkNetworkConnection()
      if (!ok) {
        toast.error('数据库连接失败，请检查网络连接')
        return
      }
      
      // 验证用户信息（移除邮箱相关认证）
      if (!user?.id) {
        toast.error('用户信息无效，请重新登录')
        return
      }
      
      // 使用自定义认证系统的用户ID，映射到正确的数据库字段
      recordToInsert = {
        user_id: user.id, // 使用自定义认证系统的用户ID
        work_date: record.record_date, // 数据库字段是work_date
        supervisor_id: record.supervisor_id,
        section_chief_id: record.section_chief_id, // 添加段长ID字段
        shift_type: record.shift_type, // 使用用户选择的班次类型
        status: 'pending' // 数据库中使用pending状态
      }
      

      
      const recordData = await runSingle<any>(() =>
        supabase
          .from('timesheet_records')
          .insert(recordToInsert)
          .select()
          .single()
      )

      // 保存工时记录项，映射到正确的数据库字段
      const finalItems = itemsToSubmit || record.items
      const itemsToInsert = finalItems.map(item => {
        // 从processes表获取实际单价
        const process = processes.find(p => p.id === item.process_id)
        const unitPrice = process && process.unit_price !== null ? parseFloat(process.unit_price.toString()) : 0 // 如果找不到工序或单价为null，不使用默认单价
        
        return {
          timesheet_record_id: recordData.id,
          process_id: item.process_id, // 数据库只有process_id字段
          quantity: item.quantity,
          unit_price: unitPrice,
          amount: item.quantity * unitPrice // 使用实际单价计算金额
        }
      })
      


      await safeQuery(() =>
        supabase
          .from('timesheet_record_items')
          .insert(itemsToInsert)
      )

      // 获取班长姓名用于显示
      const supervisor = supervisors.find(s => s.id === record.supervisor_id)
      const supervisorName = supervisor?.name || '未知班长'
      
      // 关闭加载提示并显示简洁的成功消息
      toast.dismiss('submit-loading')
      toast.success('数据提交成功返回首页', {
        duration: 1500
      })
      
      // 1.5秒后自动跳转到主页面
      setTimeout(() => {
        navigate('/dashboard')
      }, 1500)
      
      // 清空临时数据
      setTempItems([createEmptyItem()])
      
      // 重置表单
      setRecord({
        user_id: user.id,
        record_date: new Date().toISOString().split('T')[0],
        production_line_id: 0,
        supervisor_id: null,
        section_chief_id: null,
        shift_type: '白班',
        status: 'draft',
        items: []
      })
      
    } catch (error: any) {
      // 关闭加载提示
      toast.dismiss('submit-loading')
      
      // 提供更详细的错误信息
      let errorMessage = '❌ 工时记录提交失败'
      let errorDescription = '请检查网络连接后重试，如问题持续请联系管理员'
      
      if (error?.code === '42501') {
        errorMessage = '❌ 权限不足，提交失败'
        errorDescription = '您没有权限创建工时记录，请联系管理员检查数据库权限配置。如果您是新员工，可能需要管理员为您分配相应权限。'
      } else if (error?.code === '23502') {
        errorMessage = '❌ 数据验证失败'
        errorDescription = '提交的数据缺少必填字段，请检查所有必填项（生产线、班长、段长、工时记录项）是否已正确填写。'
      } else if (error?.code === '23503') {
        errorMessage = '❌ 数据关联错误'
        errorDescription = '您选择的生产线、班长或段长可能已被删除或无效，请重新选择后再试。如问题持续，请联系管理员。'
      } else if (error?.code === '42703') {
        errorMessage = '❌ 数据格式错误'
        errorDescription = '提交的数据格式不正确，这可能是系统版本问题，请联系技术支持。'
      } else if (error?.message?.includes('网络') || error?.message?.includes('连接')) {
        errorMessage = '❌ 网络连接失败'
        errorDescription = '无法连接到服务器，请检查您的网络连接，稍后再试。如果问题持续，请联系IT支持。'
      } else if (error?.message) {
        errorMessage = '❌ 提交失败'
        errorDescription = `错误详情: ${error.message}。请截图此错误信息并联系管理员。`
      }
      
      toast.error(errorMessage, {
        duration: 8000,
        description: errorDescription,
        action: {
          label: '重试',
          onClick: () => {
            // 重新打开确认对话框
            setShowTimesheetConfirmDialog(true)
          }
        }
      })
      
      console.error('工时记录提交失败:', {
        error,
        errorCode: error?.code,
        errorMessage: error?.message,
        timestamp: new Date().toISOString(),
        userId: user?.id,
        recordData: {
          production_line_id: record.production_line_id,
          supervisor_id: record.supervisor_id,
          section_chief_id: record.section_chief_id,
          itemsCount: finalItems.length
        }
      })
    } finally {
      setLoading(false)
    }
  }



  // 移除loading状态显示，直接渲染页面内容
  // if (loading) {
  //   return loading screen
  // }



  return (
    <div className="min-h-screen bg-black text-green-400 font-mono">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <div className="flex justify-between items-center mb-2 sm:mb-4">
            <div className="flex items-center">
              <Clock className="w-5 h-5 sm:w-8 sm:h-8 text-green-400 mr-2 sm:mr-3" />
              <h1 className="text-xl sm:text-4xl font-bold text-green-400 font-mono">工时记录</h1>
            </div>
            <NavActions onRefresh={handleRefresh} refreshing={refreshing} backTo="/dashboard" showClearCache={false} />
          </div>
          <div className="h-0.5 sm:h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent"></div>
        </div>
        <div className="space-y-3 sm:space-y-6">
          {/* 基本信息和添加工时记录 - 水平布局 */}
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-6">
            {/* 基本信息 */}
            <div className="bg-gray-900 border border-green-400 rounded-lg p-3 sm:p-6 flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-green-400 mb-2 sm:mb-4 flex items-center gap-2">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                基本信息
              </h2>
                
              {/* 基本信息 - 手机端优化布局：记录日期和生产线一行，班长和段长一行 */}
              <div className="space-y-3">
                {/* 第一行：记录日期和生产线 */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <label className="block text-green-300 text-xs font-medium mb-1">记录日期</label>
                    <input
                      type="date"
                      value={record.record_date}
                      onChange={(e) => handleRecordChange('record_date', e.target.value)}
                      className="w-full px-2 py-1.5 sm:px-3 sm:py-2 bg-gray-800 border border-green-400 text-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-300 text-xs sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-green-300 text-xs font-medium mb-1">
                      生产线 <span className="text-red-400">*</span>
                    </label>
                    <div className="relative production-line-dropdown">
                      <input
                        type="text"
                        value={productionLineSearch || productionLines.find(line => line.id === record.production_line_id)?.name || ''}
                        onChange={(e) => {
                          setProductionLineSearch(e.target.value);
                          setShowProductionLineDropdown(true);
                          // 如果输入为空，清除选择
                          if (!e.target.value) {
                            handleRecordChange('production_line_id', 0);
                          }
                        }}
                        onFocus={() => setShowProductionLineDropdown(true)}
                        placeholder="搜索或选择生产线"
                        className="w-full px-2 py-1.5 sm:px-3 sm:py-2 bg-gray-800 border border-green-400 text-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-300 text-xs sm:text-sm"
                      />
                      {showProductionLineDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-green-400 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {productionLines
                            .filter(line => {
                              // 如果搜索框为空或者只包含空格，显示所有生产线
                              const searchTerm = (productionLineSearch || '').trim();
                              if (!searchTerm) return true;
                              // 否则按搜索内容过滤
                              return line.name.toLowerCase().includes(searchTerm.toLowerCase());
                            })
                            .map((line) => (
                            <div
                              key={line.id}
                              onClick={() => {
                                handleRecordChange('production_line_id', line.id);
                                setProductionLineSearch('');
                                setShowProductionLineDropdown(false);
                              }}
                              className="px-2 py-1.5 sm:px-3 sm:py-2 text-green-300 hover:bg-gray-700 cursor-pointer border-b border-gray-600 last:border-b-0 text-xs sm:text-sm"
                            >
                              {line.name}
                            </div>
                          ))}
                          {productionLines.filter(line => {
                            const searchTerm = (productionLineSearch || '').trim();
                            if (!searchTerm) return true;
                            return line.name.toLowerCase().includes(searchTerm.toLowerCase());
                          }).length === 0 && (
                            <div className="px-2 py-1.5 sm:px-3 sm:py-2 text-gray-400 text-xs sm:text-sm">
                              未找到匹配的生产线
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* 第二行：班长和段长 */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <label className="block text-green-300 text-xs font-medium mb-1">
                      班长 <span className="text-red-400">*</span>
                    </label>
                    <div className="relative supervisor-dropdown">
                      <input
                        type="text"
                        value={supervisors.find(supervisor => supervisor.id === record.supervisor_id)?.name || supervisorSearch}
                        onChange={(e) => {
                          setSupervisorSearch(e.target.value);
                          setShowSupervisorDropdown(true);
                        }}
                        onFocus={() => setShowSupervisorDropdown(true)}
                        disabled={!record.production_line_id}
                        placeholder={!record.production_line_id ? '请先选择生产线' : '搜索或选择班长'}
                        className={`w-full px-2 py-1.5 sm:px-3 sm:py-2 bg-gray-800 border border-green-400 text-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-300 text-xs sm:text-sm ${
                          !record.production_line_id ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      />
                      {showSupervisorDropdown && record.production_line_id && (
                         <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-green-400 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {supervisors
                            .filter(supervisor => 
                              supervisor.name.toLowerCase().includes(supervisorSearch.toLowerCase())
                            )
                            .map((supervisor) => (
                            <div
                              key={supervisor.id}
                              onClick={() => {
                                handleRecordChange('supervisor_id', supervisor.id);
                                setSupervisorSearch('');
                                setShowSupervisorDropdown(false);
                              }}
                              className="px-2 py-1.5 sm:px-3 sm:py-2 text-green-300 hover:bg-gray-700 cursor-pointer border-b border-gray-600 last:border-b-0 text-xs sm:text-sm"
                            >
                              {supervisor.name}
                            </div>
                          ))}
                          {supervisors.filter(supervisor => 
                            supervisor.name.toLowerCase().includes(supervisorSearch.toLowerCase())
                          ).length === 0 && (
                            <div className="px-2 py-1.5 sm:px-3 sm:py-2 text-gray-400 text-xs sm:text-sm">
                              未找到匹配的班长
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-green-300 text-xs font-medium mb-1">
                      段长 <span className="text-red-400">*</span>
                    </label>
                    <div className="relative section-leader-dropdown">
                      <input
                        type="text"
                        value={sectionLeaders.find(leader => leader.id === record.section_chief_id)?.name || sectionLeaderSearch}
                        onChange={(e) => {
                          setSectionLeaderSearch(e.target.value);
                          setShowSectionLeaderDropdown(true);
                        }}
                        onFocus={() => setShowSectionLeaderDropdown(true)}
                        disabled={!record.production_line_id}
                        placeholder={!record.production_line_id ? '请先选择生产线' : '搜索或选择段长'}
                        className={`w-full px-2 py-1.5 sm:px-3 sm:py-2 bg-gray-800 border border-green-400 text-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-300 text-xs sm:text-sm ${
                          !record.production_line_id ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      />
                      {showSectionLeaderDropdown && record.production_line_id && (
                         <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-green-400 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {sectionLeaders
                            .filter(leader => 
                              leader.name.toLowerCase().includes(sectionLeaderSearch.toLowerCase())
                            )
                            .map((leader) => (
                            <div
                              key={leader.id}
                              onClick={() => {
                                handleRecordChange('section_chief_id', leader.id);
                                setSectionLeaderSearch('');
                                setShowSectionLeaderDropdown(false);
                              }}
                              className="px-2 py-1.5 sm:px-3 sm:py-2 text-green-300 hover:bg-gray-700 cursor-pointer border-b border-gray-600 last:border-b-0 text-xs sm:text-sm"
                            >
                              {leader.name}
                            </div>
                          ))}
                          {sectionLeaders.filter(leader => 
                            leader.name.toLowerCase().includes(sectionLeaderSearch.toLowerCase())
                          ).length === 0 && (
                            <div className="px-2 py-1.5 sm:px-3 sm:py-2 text-gray-400 text-xs sm:text-sm">
                              未找到匹配的段长
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* 第三行：班次选择 */}
                <div className="grid grid-cols-1 gap-2 sm:gap-4">
                  <div>
                    <label className="block text-green-300 text-xs font-medium mb-1">
                      班次 <span className="text-red-400">*</span>
                    </label>
                    <div className="relative shift-dropdown">
                      <input
                        type="text"
                        value={record.shift_type || shiftSearch}
                        onChange={(e) => {
                          setShiftSearch(e.target.value);
                          setShowShiftDropdown(true);
                        }}
                        onFocus={() => setShowShiftDropdown(true)}
                        placeholder="搜索或选择班次"
                        className="w-full px-2 py-1.5 sm:px-3 sm:py-2 bg-gray-800 border border-green-400 text-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-300 text-xs sm:text-sm"
                      />
                      {showShiftDropdown && (
                         <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-green-400 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {['白班', '夜班']
                            .filter(shift => 
                              shift.toLowerCase().includes(shiftSearch.toLowerCase())
                            )
                            .map((shift) => (
                            <div
                              key={shift}
                              onClick={() => {
                                handleRecordChange('shift_type', shift as '白班' | '夜班');
                                setShiftSearch('');
                                setShowShiftDropdown(false);
                              }}
                              className="px-2 py-1.5 sm:px-3 sm:py-2 text-green-300 hover:bg-gray-700 cursor-pointer border-b border-gray-600 last:border-b-0 text-xs sm:text-sm"
                            >
                              {shift}
                            </div>
                          ))}
                          {['白班', '夜班'].filter(shift => 
                            shift.toLowerCase().includes(shiftSearch.toLowerCase())
                          ).length === 0 && (
                            <div className="px-2 py-1.5 sm:px-3 sm:py-2 text-gray-400 text-xs sm:text-sm">
                              未找到匹配的班次
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 工时记录项添加 - 表单布局 */}
            <div className="bg-gray-900 border border-green-400 rounded-lg p-3 sm:p-6 flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-green-400 mb-2 sm:mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                添加记录
              </h2>
              

              
              {/* 记录项列表 - 优化为两列网格布局 */}
              <div className="space-y-3 sm:space-y-4">
                {tempItems.map((item, index) => (
                  <div key={index} className="bg-gray-800/50 p-3 sm:p-4 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-green-400 font-medium text-sm">记录 {index + 1}</span>
                      <button
                        onClick={() => removeTempRow(index)}
                        className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                        title="删除此行"
                      >
                        删除
                      </button>
                    </div>
                    
                    {/* 表单字段 - 手机端优化布局：工时类型和产品名称一行，工序名称和数量一行 */}
                    <div className="space-y-3">
                      {/* 第一行：工时类型和产品名称 */}
                      <div className="grid grid-cols-2 gap-2 sm:gap-4">
                        <div>
                          <label className="block text-green-300 text-xs font-medium mb-1">
                            工时类型 <span className="text-red-400">*</span>
                          </label>
                          <div className="relative work-type-dropdown">
                            <input
                              type="text"
                              value={workTypes.find(type => type.id === item.work_type_id)?.name || workTypeInputs[index] || ''}
                              onChange={(e) => {
                                setWorkTypeInputs(prev => ({ ...prev, [index]: e.target.value }));
                                setShowWorkTypeDropdown(prev => ({ ...prev, [index]: true }));
                              }}
                              onFocus={() => setShowWorkTypeDropdown(prev => ({ ...prev, [index]: true }))}
                              placeholder="搜索或选择工时类型"
                              className="w-full px-2 py-1.5 sm:px-3 sm:py-2 bg-gray-800 border border-green-400 text-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-300 text-xs sm:text-sm"
                            />
                            {showWorkTypeDropdown[index] && (
                               <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-green-400 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {workTypes
                                  .filter(type => 
                                    type.name.toLowerCase().includes((workTypeInputs[index] || '').toLowerCase())
                                  )
                                  .map((type) => (
                                  <div
                                    key={type.id}
                                    onClick={() => {
                                      handleTempItemChange(index, 'work_type_id', type.id);
                                      setWorkTypeInputs(prev => ({ ...prev, [index]: '' }));
                                      setShowWorkTypeDropdown(prev => ({ ...prev, [index]: false }));
                                    }}
                                    className="px-2 py-1.5 sm:px-3 sm:py-2 text-green-300 hover:bg-gray-700 cursor-pointer border-b border-gray-600 last:border-b-0 text-xs sm:text-sm"
                                  >
                                    {type.name}
                                  </div>
                                ))}
                                {workTypes.filter(type => 
                                  type.name.toLowerCase().includes((workTypeInputs[index] || '').toLowerCase())
                                ).length === 0 && (
                                  <div className="px-2 py-1.5 sm:px-3 sm:py-2 text-gray-400 text-xs sm:text-sm">
                                    未找到匹配的工时类型
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-green-300 text-xs font-medium mb-1">
                            产品名称 <span className="text-red-400">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={productInputs[index] || ''}
                              onChange={(e) => {
                                const inputValue = e.target.value
                                setProductInputs(prev => ({ ...prev, [index]: inputValue }))
                                
                                // 如果输入为空，清除选择
                                if (!inputValue) {
                                  handleTempItemChange(index, 'product_id', 0)
                                }
                              }}
                              onBlur={(e) => {
                                // 延迟隐藏下拉菜单，以便点击选项时能正常工作
                                setTimeout(() => {
                                  setShowProductDropdown(prev => ({ ...prev, [index]: false }))
                                }, 300)
                                
                                // 失去焦点时，如果输入的值完全匹配某个产品，则选择该产品
                                const inputValue = e.target.value
                                const exactMatch = getProductsForWorkType(item.work_type_id).find(p => 
                                  p.name === inputValue
                                )
                                if (exactMatch) {
                                  handleTempItemChange(index, 'product_id', exactMatch.id)
                                }
                              }}
                              onClick={(e) => {
                                // 点击输入框时显示下拉菜单
                                if (item.work_type_id) {
                                  e.currentTarget.focus()
                                  setShowProductDropdown(prev => ({ ...prev, [index]: true }))
                                }
                              }}
                              onFocus={() => {
                                if (item.work_type_id) {
                                  setShowProductDropdown(prev => ({ ...prev, [index]: true }))
                                }
                              }}
                              className={`w-full px-2 py-1.5 sm:px-3 sm:py-2 bg-gray-800 border border-green-400 text-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-300 text-xs sm:text-sm ${
                                !item.work_type_id ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                              placeholder={!item.work_type_id ? '请先选择工时类型' : '请输入产品名称'}
                              disabled={!item.work_type_id}
                            />
                            {/* 自定义下拉菜单 */}
                            {showProductDropdown[index] && item.work_type_id && (
                              <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-green-400 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {getProductsForWorkType(item.work_type_id)
                                  .filter(product => 
                                    product.name.toLowerCase().includes((productInputs[index] || '').toLowerCase())
                                  )
                                  .map((product) => (
                                  <div
                                    key={product.id}
                                    onMouseDown={(e) => {
                                      e.preventDefault(); // 防止触发input的onBlur
                                      setProductInputs(prev => ({ ...prev, [index]: product.name }))
                                      handleTempItemChange(index, 'product_id', product.id)
                                      setShowProductDropdown(prev => ({ ...prev, [index]: false }))
                                    }}
                                    className="px-2 py-1.5 sm:px-3 sm:py-2 text-green-300 hover:bg-gray-700 cursor-pointer border-b border-gray-600 last:border-b-0 text-xs sm:text-sm"
                                  >
                                    {product.name}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* 第二行：工序名称和数量 */}
                      <div className="grid grid-cols-2 gap-2 sm:gap-4">
                        <div>
                          <label className="block text-green-300 text-xs font-medium mb-1">
                            工序名称 <span className="text-red-400">*</span>
                          </label>
                          <div className="relative process-dropdown">
                            <input
                              type="text"
                              value={getProcessesForProduct(item.product_id, item.work_type_id).find(process => process.id === item.process_id)?.product_process || processInputs[index] || ''}
                              onChange={(e) => {
                                setProcessInputs(prev => ({ ...prev, [index]: e.target.value }));
                                setShowProcessDropdown(prev => ({ ...prev, [index]: true }));
                              }}
                              onFocus={() => setShowProcessDropdown(prev => ({ ...prev, [index]: true }))}
                              disabled={!item.product_id}
                              placeholder={!item.product_id ? '请先选择产品' : '搜索或选择工序名称'}
                              className={`w-full px-2 py-1.5 sm:px-3 sm:py-2 bg-gray-800 border border-green-400 text-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-300 text-xs sm:text-sm ${
                                !item.product_id ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            />
                            {showProcessDropdown[index] && item.product_id && (
                               <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-green-400 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {getProcessesForProduct(item.product_id, item.work_type_id)
                                  .filter(process => 
                                    process.product_process.toLowerCase().includes((processInputs[index] || '').toLowerCase())
                                  )
                                  .map((process) => (
                                  <div
                                    key={process.id}
                                    onClick={() => {
                                      handleTempItemChange(index, 'process_id', process.id);
                                      setProcessInputs(prev => ({ ...prev, [index]: '' }));
                                      setShowProcessDropdown(prev => ({ ...prev, [index]: false }));
                                    }}
                                    className="px-2 py-1.5 sm:px-3 sm:py-2 text-green-300 hover:bg-gray-700 cursor-pointer border-b border-gray-600 last:border-b-0 text-xs sm:text-sm"
                                  >
                                    {process.product_process}
                                  </div>
                                ))}
                                {getProcessesForProduct(item.product_id, item.work_type_id).filter(process => 
                                  process.product_process.toLowerCase().includes((processInputs[index] || '').toLowerCase())
                                ).length === 0 && (
                                  <div className="px-2 py-1.5 sm:px-3 sm:py-2 text-gray-400 text-xs sm:text-sm">
                                    未找到匹配的工序名称
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-green-300 text-xs font-medium mb-1">
                            数量 <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="number"
                            value={item.quantity || ''}
                            onChange={(e) => handleTempItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="w-full px-2 py-1.5 sm:px-3 sm:py-2 bg-gray-800 border border-green-400 text-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-300 text-xs sm:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="请输入数量"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* 操作按钮区域 - 手机端优化：添加新记录项和提交审核一行 */}
              <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-2 sm:flex sm:justify-between sm:items-center">
                <button
                  onClick={addNewRow}
                  className="px-2 py-2 sm:px-4 sm:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">添加新记录项</span>
                  <span className="sm:hidden">添加记录</span>
                </button>
                <button
                  onClick={handleSubmitClick}
                  className={`px-2 py-2 sm:px-6 sm:py-2 rounded-md focus:outline-none focus:ring-2 transition-colors text-xs sm:text-sm font-medium ${
                    tempItems.filter(item => item.work_type_id && item.process_id && item.quantity > 0).length === 0 || !record.supervisor_id || !record.section_chief_id
                      ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                  }`}
                  disabled={tempItems.filter(item => item.work_type_id && item.process_id && item.quantity > 0).length === 0 || !record.supervisor_id || !record.section_chief_id}
                >
                  提交审核
                </button>
              </div>
            </div>
          </div>



          {/* 右侧：最近记录 */}

        </div>
      </div>
      
      {/* 确认对话框 */}
      <TimesheetConfirmDialog
        isOpen={showTimesheetConfirmDialog}
        onClose={() => setShowTimesheetConfirmDialog(false)}
        onConfirm={handleConfirmSubmit}
        record={record}
        items={tempItems.filter(item => item.work_type_id && item.process_id && item.quantity > 0)}
        productionLines={productionLines}
        supervisors={supervisors}
        sectionLeaders={sectionLeaders}
        workTypes={workTypes}
        products={products}
        processes={processes}
      />
    </div>
  )
}
