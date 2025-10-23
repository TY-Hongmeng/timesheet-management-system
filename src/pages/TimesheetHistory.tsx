import React, { useState, useEffect } from 'react'
import { Search, Calendar, Filter, Eye, Download, RefreshCw, Clock, User, Building, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

interface ProductionLine {
  id: number
  name: string
}

interface WorkType {
  id: number
  name: string
}

interface Product {
  id: number
  name: string
  code: string
}

interface Process {
  id: string
  name: string
}

interface TimesheetRecordItem {
  id: string
  work_type: WorkType
  product: Product
  process: Process
  quantity: number
  unit: string
  unit_price: number
  total_amount: number
}

interface TimesheetRecord {
  id: string
  user_id: string
  record_date: string
  production_line: ProductionLine
  supervisor?: { name: string }
  section_chief?: { name: string }
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  items: TimesheetRecordItem[]
  total_amount?: number
}

interface SearchFilters {
  startDate: string
  endDate: string
  status: string
  productionLineId: string
  workTypeId: string
  productId: string
}

export default function TimesheetHistory() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  
  // 基础数据
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([])
  const [workTypes, setWorkTypes] = useState<WorkType[]>([])
  const [products, setProducts] = useState<Product[]>([])
  
  // 查询条件
  const [filters, setFilters] = useState<SearchFilters>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 默认30天前
    endDate: new Date().toISOString().split('T')[0], // 今天
    status: '',
    productionLineId: '',
    workTypeId: '',
    productId: ''
  })
  
  // 记录数据
  const [records, setRecords] = useState<TimesheetRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<TimesheetRecord | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  
  // 删除相关状态
  const [recordToDelete, setRecordToDelete] = useState<TimesheetRecord | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // 分页
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const pageSize = 10

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    searchRecords()
  }, [currentPage])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadProductionLines(),
        loadWorkTypes(),
        loadProducts()
      ])
      await searchRecords()
    } catch (error) {
      console.error('加载数据失败:', error)
      toast.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  const loadProductionLines = async () => {
    try {
      // 从processes表获取生产线信息
      const { data, error } = await supabase
        .from('processes')
        .select('production_line')
      
      if (error) throw error
      
      // 去重并格式化生产线数据
      const uniqueLines = data ? [...new Set(data.map(p => p.production_line).filter(Boolean))] : []
      const formattedLines = uniqueLines.map((name, index) => ({
        id: index + 1,
        name: name
      }))
      
      setProductionLines(formattedLines)
    } catch (error) {
      console.error('加载生产线失败:', error)
      setProductionLines([])
    }
  }

  const loadWorkTypes = async () => {
    const { data, error } = await supabase
      .from('work_types')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
    
    if (error) throw error
    setWorkTypes(data || [])
  }

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, code')
      .eq('is_active', true)
      .order('name')
    
    if (error) throw error
    setProducts(data || [])
  }

  const searchRecords = async (resetPage = false) => {
    if (!user) return
    
    try {
      setSearching(true)
      
      if (resetPage) {
        setCurrentPage(1)
      }
      
      const page = resetPage ? 1 : currentPage
      const offset = (page - 1) * pageSize
      
      // 构建查询条件
      let query = supabase
        .from('timesheet_records')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('record_date', filters.startDate)
        .lte('record_date', filters.endDate)
        .order('record_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)
      
      // 添加状态过滤
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      
      // 添加生产线过滤
      if (filters.productionLineId) {
        query = query.eq('production_line_id', parseInt(filters.productionLineId))
      }
      
      const { data, error, count } = await query
      
      if (error) throw error
      
      // 获取工时记录项
      const recordIds = data?.map(r => r.id) || []
      let itemsData = []
      if (recordIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from('timesheet_record_items')
          .select('*')
          .in('timesheet_record_id', recordIds)
        
        if (itemsError) throw itemsError
        itemsData = items || []
      }
      
      // 组合数据并计算每条记录的总金额
      const recordsWithItems = data?.map(record => {
        const items = itemsData.filter(item => item.timesheet_record_id === record.id)
        return {
          ...record,
          items: items,
          total_amount: items.reduce((sum: number, item: any) => 
            sum + (item.quantity * item.unit_price), 0) || 0
        }
      }) || []
      
      setRecords(recordsWithItems)
      setTotalRecords(count || 0)
      setTotalPages(Math.ceil((count || 0) / pageSize))
      
    } catch (error) {
      console.error('查询失败:', error)
      toast.error('查询失败，请重试')
    } finally {
      setSearching(false)
    }
  }

  const handleFilterChange = (field: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const handleSearch = () => {
    searchRecords(true)
  }

  const handleReset = () => {
    setFilters({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      status: '',
      productionLineId: '',
      workTypeId: '',
      productId: ''
    })
    setCurrentPage(1)
  }

  const viewDetail = (record: TimesheetRecord) => {
    setSelectedRecord(record)
    setShowDetail(true)
  }

  const handleDeleteClick = (record: TimesheetRecord) => {
    // 检查记录状态，只有草稿状态的记录可以删除
    if (record.status !== 'draft') {
      toast.error('只有草稿状态的工时记录可以删除')
      return
    }
    setRecordToDelete(record)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return
    
    try {
      setDeleting(true)
      
      // 由于数据库设置了ON DELETE CASCADE，删除主记录时会自动删除相关的明细记录和审核历史
      const { error } = await supabase
        .from('timesheet_records')
        .delete()
        .eq('id', recordToDelete.id)
        .eq('user_id', user?.id) // 确保只能删除自己的记录
      
      if (error) throw error
      
      toast.success('工时记录删除成功')
      
      // 刷新记录列表
      await searchRecords()
      
      // 关闭确认对话框
      setShowDeleteConfirm(false)
      setRecordToDelete(null)
      
    } catch (error) {
      console.error('删除工时记录失败:', error)
      toast.error('删除失败，请重试')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
    setRecordToDelete(null)
  }

  const exportData = async () => {
    try {
      // 这里可以实现导出功能
      toast.info('导出功能开发中...')
    } catch (error) {
      toast.error('导出失败')
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return '草稿'
      case 'submitted': return '已提交'
      case 'approved': return '已审核'
      case 'rejected': return '已拒绝'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-600 text-gray-300'
      case 'submitted': return 'bg-yellow-600 text-yellow-100'
      case 'approved': return 'bg-green-600 text-green-100'
      case 'rejected': return 'bg-red-600 text-red-100'
      default: return 'bg-gray-600 text-gray-300'
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

  return (
    <div className="min-h-screen bg-black text-green-300">
      {/* Header */}
      <header className="bg-gray-900 border-b border-green-400 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-green-400 font-mono flex items-center gap-2">
            <Clock className="w-8 h-8" />
            工时记录历史
          </h1>
          <p className="text-green-600 text-sm font-mono mt-1">
            TIMESHEET HISTORY MANAGEMENT
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* 查询条件 */}
        <div className="bg-gray-900 border border-green-400 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-green-400 font-mono mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            查询条件
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-green-300 font-mono text-sm mb-2">
                开始日期
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-green-600 rounded text-green-300 font-mono focus:outline-none focus:border-green-400"
              />
            </div>
            
            <div>
              <label className="block text-green-300 font-mono text-sm mb-2">
                结束日期
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-green-600 rounded text-green-300 font-mono focus:outline-none focus:border-green-400"
              />
            </div>
            
            <div>
              <label className="block text-green-300 font-mono text-sm mb-2">
                状态
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-green-600 rounded text-green-300 font-mono focus:outline-none focus:border-green-400"
              >
                <option value="">全部状态</option>
                <option value="draft">草稿</option>
                <option value="submitted">已提交</option>
                <option value="approved">已审核</option>
                <option value="rejected">已拒绝</option>
              </select>
            </div>
            
            <div>
              <label className="block text-green-300 font-mono text-sm mb-2">
                生产线
              </label>
              <select
                value={filters.productionLineId}
                onChange={(e) => handleFilterChange('productionLineId', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-green-600 rounded text-green-300 font-mono focus:outline-none focus:border-green-400"
              >
                <option value="">全部生产线</option>
                {productionLines.map(line => (
                  <option key={line.id} value={line.id}>{line.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-green-300 font-mono text-sm mb-2">
                工时类型
              </label>
              <select
                value={filters.workTypeId}
                onChange={(e) => handleFilterChange('workTypeId', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-green-600 rounded text-green-300 font-mono focus:outline-none focus:border-green-400"
              >
                <option value="">全部类型</option>
                {workTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-green-300 font-mono text-sm mb-2">
                产品
              </label>
              <select
                value={filters.productId}
                onChange={(e) => handleFilterChange('productId', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-green-600 rounded text-green-300 font-mono focus:outline-none focus:border-green-400"
              >
                <option value="">全部产品</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>{product.name} ({product.code})</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              disabled={searching}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white font-bold rounded transition-colors font-mono"
            >
              <Search className="w-4 h-4" />
              {searching ? '查询中...' : '查询'}
            </button>
            
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded transition-colors font-mono"
            >
              <RefreshCw className="w-4 h-4" />
              重置
            </button>
            
            <button
              onClick={exportData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded transition-colors font-mono"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="bg-gray-900 border border-green-400 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <div className="text-green-300 font-mono">
              共找到 <span className="text-green-400 font-bold">{totalRecords}</span> 条记录
            </div>
            <div className="text-green-300 font-mono">
              总金额: <span className="text-green-400 font-bold">￥{records.reduce((sum, record) => sum + (record.total_amount || 0), 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* 记录列表 */}
        <div className="bg-gray-900 border border-green-400 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800 border-b border-green-600">
                <tr>
                  <th className="px-4 py-3 text-left text-green-400 font-mono text-sm">记录日期</th>
                  <th className="px-4 py-3 text-left text-green-400 font-mono text-sm">生产线</th>
                  <th className="px-4 py-3 text-left text-green-400 font-mono text-sm">工时项数</th>
                  <th className="px-4 py-3 text-left text-green-400 font-mono text-sm">总金额</th>
                  <th className="px-4 py-3 text-left text-green-400 font-mono text-sm">状态</th>
                  <th className="px-4 py-3 text-left text-green-400 font-mono text-sm">创建时间</th>
                  <th className="px-4 py-3 text-left text-green-400 font-mono text-sm">操作</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center">
                      <Clock className="w-12 h-12 text-green-600 mx-auto mb-4" />
                      <p className="text-green-600 font-mono">暂无工时记录</p>
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id} className="border-b border-green-800 hover:bg-gray-800 transition-colors">
                      <td className="px-4 py-3 text-green-300 font-mono text-sm">
                        {record.record_date}
                      </td>
                      <td className="px-4 py-3 text-green-300 font-mono text-sm">
                        {record.production_line?.name}
                      </td>
                      <td className="px-4 py-3 text-green-300 font-mono text-sm">
                        {record.items?.length || 0}
                      </td>
                      <td className="px-4 py-3 text-green-300 font-mono text-sm">
                        ￥{(record.total_amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-mono ${getStatusColor(record.status)}`}>
                          {getStatusText(record.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-green-300 font-mono text-sm">
                        {new Date(record.created_at).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => viewDetail(record)}
                            className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {record.status === 'draft' && (
                            <button
                              onClick={() => handleDeleteClick(record)}
                              className="p-1 text-red-400 hover:text-red-300 transition-colors"
                              title="删除记录"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-green-300 font-mono rounded transition-colors"
            >
              上一页
            </button>
            
            <span className="text-green-300 font-mono">
              第 {currentPage} 页，共 {totalPages} 页
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-green-300 font-mono rounded transition-colors"
            >
              下一页
            </button>
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
      {showDetail && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-green-400 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-green-400 font-mono">
                  工时记录详情
                </h2>
                <button
                  onClick={() => setShowDetail(false)}
                  className="text-green-400 hover:text-green-300 transition-colors"
                >
                  ✕
                </button>
              </div>
              
              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <div className="text-green-300 font-mono text-sm">
                    <span className="text-green-600">记录日期:</span> {selectedRecord.record_date}
                  </div>
                  <div className="text-green-300 font-mono text-sm">
                    <span className="text-green-600">生产线:</span> {selectedRecord.production_line?.name}
                  </div>
                  <div className="text-green-300 font-mono text-sm">
                    <span className="text-green-600">班长:</span> {selectedRecord.supervisor?.name || '未指定'}
                  </div>
                  <div className="text-green-300 font-mono text-sm">
                    <span className="text-green-600">段长:</span> {selectedRecord.section_chief?.name || '未指定'}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-green-300 font-mono text-sm">
                    <span className="text-green-600">状态:</span> 
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(selectedRecord.status)}`}>
                      {getStatusText(selectedRecord.status)}
                    </span>
                  </div>
                  <div className="text-green-300 font-mono text-sm">
                    <span className="text-green-600">创建时间:</span> {new Date(selectedRecord.created_at).toLocaleString('zh-CN')}
                  </div>
                  <div className="text-green-300 font-mono text-sm">
                    <span className="text-green-600">更新时间:</span> {new Date(selectedRecord.updated_at).toLocaleString('zh-CN')}
                  </div>
                  <div className="text-green-300 font-mono text-sm">
                    <span className="text-green-600">总金额:</span> ￥{(selectedRecord.total_amount || 0).toFixed(2)}
                  </div>
                </div>
              </div>
              
              {/* 工时明细 */}
              <div>
                <h3 className="text-lg font-bold text-green-400 font-mono mb-4">
                  工时明细
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-800 border-b border-green-600">
                      <tr>
                        <th className="px-4 py-2 text-left text-green-400 font-mono text-sm">工时类型</th>
                        <th className="px-4 py-2 text-left text-green-400 font-mono text-sm">产品</th>
                        <th className="px-4 py-2 text-left text-green-400 font-mono text-sm">工序</th>
                        <th className="px-4 py-2 text-left text-green-400 font-mono text-sm">数量</th>
                        <th className="px-4 py-2 text-left text-green-400 font-mono text-sm">单位</th>
                        <th className="px-4 py-2 text-left text-green-400 font-mono text-sm">单价</th>
                        <th className="px-4 py-2 text-left text-green-400 font-mono text-sm">小计</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRecord.items?.map((item, index) => (
                        <tr key={item.id || index} className="border-b border-green-800">
                          <td className="px-4 py-2 text-green-300 font-mono text-sm">
                            {item.work_type?.name}
                          </td>
                          <td className="px-4 py-2 text-green-300 font-mono text-sm">
                            {item.product?.name} ({item.product?.code})
                          </td>
                          <td className="px-4 py-2 text-green-300 font-mono text-sm">
                            {item.process?.name}
                          </td>
                          <td className="px-4 py-2 text-green-300 font-mono text-sm">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-2 text-green-300 font-mono text-sm">
                            {item.unit}
                          </td>
                          <td className="px-4 py-2 text-green-300 font-mono text-sm">
                            ￥{item.unit_price.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-green-300 font-mono text-sm">
                            ￥{(item.quantity * item.unit_price).toFixed(2)}
                          </td>
                        </tr>
                      )) || []}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      {showDeleteConfirm && recordToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-red-400 rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-red-400 font-mono">
                  确认删除
                </h2>
                <button
                  onClick={handleDeleteCancel}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  disabled={deleting}
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-red-300 font-mono mb-2">
                  您确定要删除以下工时记录吗？
                </p>
                <div className="bg-gray-800 border border-red-600 rounded p-3">
                  <div className="text-green-300 font-mono text-sm space-y-1">
                    <div><span className="text-red-400">记录日期:</span> {recordToDelete.record_date}</div>
                    <div><span className="text-red-400">生产线:</span> {recordToDelete.production_line?.name}</div>
                    <div><span className="text-red-400">工时项数:</span> {recordToDelete.items?.length || 0}</div>
                    <div><span className="text-red-400">总金额:</span> ￥{(recordToDelete.total_amount || 0).toFixed(2)}</div>
                  </div>
                </div>
                <p className="text-red-400 font-mono text-sm mt-3">
                  ⚠️ 此操作将同时删除所有相关的工时明细和审核历史，且无法恢复！
                </p>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleDeleteCancel}
                  disabled={deleting}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-green-300 font-mono rounded transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white font-mono rounded transition-colors flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      删除中...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      确认删除
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}