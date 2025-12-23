import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { RotateCcw, Clock, AlertTriangle, CheckCircle, Package, FileText, Settings, RefreshCw, Trash2, ArrowLeft, Filter, Search } from 'lucide-react'
import { 
  getRecycleBinItems, 
  restoreFromRecycleBin, 
  formatDeletedTime,
  isItemExpired,
  getRemainingDays,
  RecycleBinItem,
  RecycleBinItemType
} from '@/utils/recycleBin'
import { useModuleLoading, MODULE_IDS } from '@/contexts/ModuleLoadingContext'
import { toast } from 'sonner'

interface PaginationState {
  page: number
  pageSize: number
  total: number
}

export default function RecycleBin() {
  const [items, setItems] = useState<RecycleBinItem[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    total: 0
  })
  const [activeTab, setActiveTab] = useState<string>('timesheet_record')
  const [filters, setFilters] = useState<{ search: string; startDate: string; endDate: string }>({
    search: '',
    startDate: '',
    endDate: ''
  })
  const { markModuleAsLoaded } = useModuleLoading()

  // 获取回收站数据
  const fetchRecycleBinData = useCallback(async () => {
    try {
      setLoading(true)
      
      // 构造过滤条件
      const appliedFilters: any = {}
      if (activeTab !== 'all') {
        appliedFilters.itemType = activeTab as RecycleBinItemType
      }
      if (filters.search) appliedFilters.search = filters.search
      if (filters.startDate) appliedFilters.startDate = filters.startDate
      if (filters.endDate) appliedFilters.endDate = filters.endDate
      
      // 调用简化后的getRecycleBinItems函数
      const { data, total, error } = await getRecycleBinItems(
        appliedFilters,
        {
          page: pagination.page,
          pageSize: pagination.pageSize
        }
      )

      if (error) {
        console.error('获取回收站数据失败:', error)
        return
      }
      
      console.log('获取回收站数据成功:', {
        itemCount: data.length,
        total: total || 0
      })
      
      // 打印前两个数据项，查看实际结构
      if (data.length > 0) {
        console.log('=== 回收站数据结构示例 ===')
        console.log('第1个数据项:', data[0])
        console.log('第1个数据项的item_data:', data[0].item_data)
        if (data.length > 1) {
          console.log('第2个数据项:', data[1])
          console.log('第2个数据项的item_data:', data[1].item_data)
        }
      }

      setItems(data)
      setPagination(prev => ({ ...prev, total: total || 0 }))
    } catch (error) {
      console.error('获取回收站数据异常:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.pageSize, activeTab, filters.search, filters.startDate, filters.endDate])

  useEffect(() => {
    markModuleAsLoaded(MODULE_IDS.RECYCLE_BIN || MODULE_IDS.HISTORY)
    fetchRecycleBinData()
  }, [fetchRecycleBinData])

  // 恢复确认弹窗状态
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState<{
    recycleId: string
    displayTitle: string
    userName?: string
    workDate?: string
    productionLine?: string
    productionCategory?: string
    productName?: string
    processName?: string
  } | null>(null)

  const openRestoreModal = (item: RecycleBinItem) => {
    const d: any = item.item_data || {}
    const displayTitle = item.item_type === 'process'
      ? `${d.product_name || ''} | ${d.product_process || ''}`
      : `${d.product_name || ''} | ${d.product_process || d.process_name || ''}`
    setRestoreTarget({
      recycleId: (item as any)?.parent_recycle_bin_id || item.id,
      displayTitle,
      userName: d.user_name || d.employee_name || '',
      workDate: (d.work_date || d.record_date || d.date) ? new Date(d.work_date || d.record_date || d.date).toLocaleDateString() : '',
      productionLine: d.production_line || d.processes?.production_line || d.process?.production_line || '',
      productionCategory: d.production_category || d.processes?.production_category || d.process?.production_category || '',
      productName: d.product_name || d.processes?.product_name || d.process?.product_name || '',
      processName: d.product_process || d.processes?.product_process || d.process?.product_process || d.process_name || ''
    })
    setShowRestoreModal(true)
  }

  const confirmRestore = async () => {
    if (!restoreTarget) return
    try {
      const { success, error } = await restoreFromRecycleBin(restoreTarget.recycleId)
      if (success) {
        await fetchRecycleBinData()
        setShowRestoreModal(false)
        setRestoreTarget(null)
        toast.success('项目恢复成功')
      } else {
        toast.error(`恢复失败：${error?.message || '未知错误'}`)
      }
    } catch (e: any) {
      console.error('恢复项目异常:', e)
      toast.error('恢复项目时发生异常')
    }
  }

  const cancelRestore = () => {
    setShowRestoreModal(false)
    setRestoreTarget(null)
  }

  // 获取项目图标
  const getItemIcon = (itemType: RecycleBinItemType) => {
    switch (itemType) {
      case 'timesheet_record':
        return <FileText className="w-4 h-4" />
      case 'process':
        return <Settings className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  // 获取项目类型名称
  const getItemTypeName = (itemType: RecycleBinItemType) => {
    switch (itemType) {
      case 'timesheet_record':
        return '工时记录'
      case 'process':
        return '工序'
      default:
        return '未知类型'
    }
  }

  // 获取项目显示名称
  const getItemDisplayName = (item: RecycleBinItem) => {
    const data = item.item_data
    
    switch (item.item_type) {
      case 'timesheet_record':
        // 工时记录：显示详细信息
        const userName = data.user_name || data.employee_name || '未知用户'
        const recordDate = data.date ? new Date(data.date).toLocaleDateString() : '未知日期'
        return `${userName} - ${recordDate} 工时记录`
      
      case 'process':
        // 工序：显示详细信息
        const processFullName = data.product_process || data.process_number || '未知工序'
        const productName = data.product_name || '未知产品'
        const productionLine = data.production_line || '未知生产线'
        return `${productionLine} - ${productName} - ${processFullName} 工序`
      
      default:
        return `${item.item_type} - ${item.item_id.slice(0, 8)}`
    }
  }
  
  // 获取删除者信息
  const getDeleterInfo = (item: RecycleBinItem) => {
    // 尝试从不同来源获取删除者信息
    if ((item as any).deleted_by_name) {
      return (item as any).deleted_by_name
    }
    if (item.deleter?.name) {
      return item.deleter.name
    }
    return item.deleted_by.slice(0, 8) // 显示删除者ID的前8位
  }
  
  // 获取删除时间
  const getDeletedTime = (item: RecycleBinItem) => {
    return new Date(item.deleted_at).toLocaleString()
  }
  
  // 获取状态中文显示
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '待班长审核';
      case 'approved':
        return '待段长审核';
      case 'section_chief_approved':
        return '已通过';
      case 'rejected':
        return '已拒绝';
      case 'draft':
        return '草稿';
      default:
        return status;
    }
  }

  // 刷新数据
  const handleRefresh = () => {
    fetchRecycleBinData()
  }

  const handleFilterChange = (field: 'search' | 'startDate' | 'endDate', value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const handleSearchClick = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchRecycleBinData()
  }

  const handleResetFilters = () => {
    setFilters({ search: '', startDate: '', endDate: '' })
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchRecycleBinData()
  }

  return (
    <div className="min-h-screen bg-black text-green-300 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-xl sm:text-4xl font-bold text-green-400 font-mono mb-2">回收站</h1>
            <p className="text-green-600 font-mono">管理和恢复被删除的工时记录和工序</p>
          </div>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 text-green-300 border border-green-400 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 font-mono text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">返回控制台</span>
            <span className="sm:hidden">返回</span>
          </Link>
        </div>

        {/* 标签页 */}
        <div className="mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => { setActiveTab('timesheet_record'); setPagination(prev=>({ ...prev, page: 1 })) }}
              className={`px-4 py-2 rounded-lg font-mono text-sm ${activeTab==='timesheet_record' ? 'bg-green-700 text-white' : 'bg-gray-800 text-green-300 hover:bg-gray-700'}`}
            >删除的工时记录</button>
            <button
              onClick={() => { setActiveTab('process'); setPagination(prev=>({ ...prev, page: 1 })) }}
              className={`px-4 py-2 rounded-lg font-mono text-sm ${activeTab==='process' ? 'bg-green-700 text-white' : 'bg-gray-800 text-green-300 hover:bg-gray-700'}`}
            >删除的工序记录</button>
          </div>
        </div>

        {/* 筛选条件 */}
        <div className="bg-gray-900 border border-green-400 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-green-400 font-mono mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            筛选条件
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-green-300 font-mono text-sm mb-2">关键词</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="员工/产品/工序/生产线"
                className="w-full px-3 py-2 bg-gray-800 border border-green-600 rounded text-green-300 font-mono focus:outline-none focus:border-green-400"
              />
            </div>
            <div>
              <label className="block text-green-300 font-mono text-sm mb-2">开始日期</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-green-600 rounded text-green-300 font-mono focus:outline-none focus:border-green-400"
              />
            </div>
            <div>
              <label className="block text-green-300 font-mono text-sm mb-2">结束日期</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-green-600 rounded text-green-300 font-mono focus:outline-none focus:border-green-400"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSearchClick}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded transition-colors font-mono"
            >
              <Search className="w-4 h-4" />
              查询
            </button>
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded transition-colors font-mono"
            >
              <RefreshCw className="w-4 h-4" />
              重置
            </button>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="px-4 py-2 rounded-lg flex items-center gap-2 bg-gray-800 text-green-300 hover:bg-gray-700 font-mono text-sm"
                title="刷新列表"
              >
                <RefreshCw className="w-4 h-4" />
                刷新
              </button>
            </div>
          </div>
        </div>

        {/* 项目列表 */}
        <div className="bg-gray-900 rounded-lg border border-green-400">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              加载中...
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Trash2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">回收站为空</p>
              <p className="text-sm">被删除的项目将在这里显示</p>
            </div>
          ) : (
            <>              {/* 列表头部 */}
              <div className="px-6 py-4 border-b border-gray-700">
                <div className="flex items-center justify-end">
                  <span className="text-sm text-green-600">
                    共 {pagination.total} 个项目，当前显示 {items.length} 个
                  </span>
                </div>
              </div>

              {/* 项目列表 - 表格形式 */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  {/* 表格头部 */}
                  <thead className="bg-gray-700">
                    <tr>
                      
                      {/* 工时记录表头 */}
                      {activeTab === 'timesheet_record' && (
                        <>
                          <th className="px-4 py-2 text-left text-green-300 font-mono text-sm">工作日期</th>
                          <th className="px-4 py-2 text-left text-green-300 font-mono text-sm">班次</th>
                          <th className="px-4 py-2 text-left text-green-300 font-mono text-sm">员工姓名</th>
                          <th className="px-4 py-2 text-left text-green-300 font-mono text-sm">生产线</th>
                          <th className="px-4 py-2 text-left text-green-300 font-mono text-sm">生产类别</th>
                          <th className="px-4 py-2 text-left text-green-300 font-mono text-sm">产品名称</th>
                          <th className="px-4 py-2 text-left text-green-300 font-mono text-sm">工序名称</th>
                          <th className="px-4 py-2 text-left text-green-300 font-mono text-sm">数量</th>
                          <th className="px-4 py-2 text-left text-green-300 font-mono text-sm">单价</th>
                          <th className="px-4 py-2 text-left text-green-300 font-mono text-sm">金额</th>
                          <th className="px-4 py-2 text-left text-green-300 font-mono text-sm">状态</th>
                          <th className="px-4 py-2 text-left text-green-300 font-mono text-sm">班长</th>
                          <th className="px-4 py-2 text-left text-green-300 font-mono text-sm">段长</th>
                        </>
                      )}
                      
                      {/* 工序记录表头 */}
                      {activeTab === 'process' && (
                        <>
                          <th className="px-4 py-2 text-left text-green-300 font-mono text-sm">公司</th>
                          <th className="px-4 py-2 text-left text-green-300 font-mono text-sm">生产线</th>
                          <th className="px-4 py-2 text-left text-green-300 font-mono text-sm">工时类型</th>
                          <th className="px-4 py-2 text-left text-green-300 font-mono text-sm">产品名称</th>
                          <th className="px-4 py-2 text-left text-green-300 font-mono text-sm">产品工序</th>
                          <th className="px-4 py-2 text-left text-green-300 font-mono text-sm">单价</th>
                          <th className="px-4 py-2 text-left text-green-300 font-mono text-sm">生效年月</th>
                        </>
                      )}
                      
                      {/* 通用表头 */}
                      <th className="px-4 py-2 text-left text-green-300 font-mono text-sm">删除时间</th>
                      <th className="px-4 py-2 text-left text-green-300 font-mono text-sm">删除人</th>
                      <th className="px-4 py-2 text-left text-green-300 font-mono text-sm">剩余天数</th>
                      <th className="px-4 py-2 text-left text-green-300 font-mono text-sm">操作</th>
                    </tr>
                  </thead>
                  
                  {/* 表格内容 */}
                  <tbody className="divide-y divide-gray-800">
                    {items.map((item) => {
                      const isExpired = isItemExpired(item.expires_at)
                      const deleter = getDeleterInfo(item)
                      const deletedTime = getDeletedTime(item)
                      const data = item.item_data
                      
                      return (
                        <tr key={item.id} className="hover:bg-gray-800 transition-colors">
                          
                          {/* 工时记录内容 */}
                          {(item.item_type === 'timesheet_record' || 
                            item.item_type === 'timesheet_record_item' ||
                            item.original_table === 'timesheet_records' ||
                            item.original_table === 'timesheet_record_items') && (
                            <>
                              <td className="px-4 py-3 text-sm text-green-300">
                                {data.record_date ? new Date(data.record_date).toLocaleDateString() : (data.date ? new Date(data.date).toLocaleDateString() : '')}
                              </td>
                              <td className="px-4 py-3 text-sm text-green-300">
                                {data.shift_type || ''}
                              </td>
                              <td className="px-4 py-3 text-sm text-green-300">
                                {data.user_name || data.employee_name || ''}
                              </td>
                              <td className="px-4 py-3 text-sm text-green-300">
                                {data.production_line || data.processes?.production_line || data.process?.production_line || ''}
                              </td>
                              <td className="px-4 py-3 text-sm text-green-300">
                                {data.production_category || data.processes?.production_category || data.process?.production_category || ''}
                              </td>
                              <td className="px-4 py-3 text-sm text-green-300">
                                {data.product_name || data.processes?.product_name || data.process?.product_name || ''}
                              </td>
                              <td className="px-4 py-3 text-sm text-green-300">
                                {data.product_process || data.processes?.product_process || data.process?.product_process || data.process_name || ''}
                              </td>
                              <td className="px-4 py-3 text-sm text-green-300">
                                {data.quantity ?? data.items?.[0]?.quantity ?? ''}
                              </td>
                              <td className="px-4 py-3 text-sm text-green-300">
                                {data.unit_price != null ? Number(data.unit_price).toFixed(3) : (data.items?.[0]?.unit_price != null ? Number(data.items?.[0]?.unit_price).toFixed(3) : '')}
                              </td>
                              <td className="px-4 py-3 text-sm text-green-300">
                                {data.amount != null ? Number(data.amount).toFixed(2) : (data.items?.[0]?.amount != null ? Number(data.items?.[0]?.amount).toFixed(2) : '')}
                              </td>
                              <td className="px-4 py-3 text-sm text-green-300">
                                {getStatusText(data.status)}
                              </td>
                              <td className="px-4 py-3 text-sm text-green-300">
                                {data.supervisor_name || data.supervisor?.name || ''}
                              </td>
                              <td className="px-4 py-3 text-sm text-green-300">
                                {data.section_chief_name || data.section_chief?.name || ''}
                              </td>
                            </>
                          )}
                          
                          {/* 工序记录内容 */}
                          {(item.item_type === 'process' || item.original_table === 'processes') && (
                            <>
                              <td className="px-4 py-3 text-sm text-green-300">
                                {data.company_name || '未知公司'}
                              </td>
                              <td className="px-4 py-3 text-sm text-green-300">
                                {data.production_line || '未知生产线'}
                              </td>
                              <td className="px-4 py-3 text-sm text-green-300">
                                {data.production_category || '未知类型'}
                              </td>
                              <td className="px-4 py-3 text-sm text-green-300">
                                {data.product_name || '未知产品'}
                              </td>
                              <td className="px-4 py-3 text-sm text-green-300">
                                {data.product_process || '未知工序'}
                              </td>
                              <td className="px-4 py-3 text-sm text-green-300">
                                {data.unit_price != null ? data.unit_price.toFixed(3) : '未定义'}
                              </td>
                              <td className="px-4 py-3 text-sm text-green-300">
                                {data.effective_date || '未知'}
                              </td>
                            </>
                          )}
                          
                          {/* 通用内容 */}
                          <td className="px-4 py-3 text-sm text-green-600">
                            {deletedTime}
                          </td>
                          <td className="px-4 py-3 text-sm text-green-600">
                            {deleter}
                          </td>
                          <td className="px-4 py-3 text-sm text-green-300">
                            {getRemainingDays(item.expires_at)} 天
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => openRestoreModal(item)}
                                className="p-1 text-green-400 hover:bg-green-900 rounded-lg transition-colors"
                                title="恢复项目"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* 分页 */}
              {pagination.total > pagination.pageSize && (
                <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    显示第 {(pagination.page - 1) * pagination.pageSize + 1} 到{' '}
                    {Math.min(pagination.page * pagination.pageSize, pagination.total)} 项，
                    共 {pagination.total} 项
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page <= 1}
                      className="px-3 py-1 border border-green-600 text-green-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800"
                    >
                      上一页
                    </button>
                    
                    <span className="text-sm text-gray-700">
                      第 {pagination.page} 页
                    </span>
                    
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page * pagination.pageSize >= pagination.total}
                      className="px-3 py-1 border border-green-600 text-green-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {/* 恢复确认对话框 */}
      {showRestoreModal && restoreTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-green-400 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-green-900 rounded-full flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-100">确认恢复</h3>
                <p className="text-sm text-gray-400">该数据将恢复到原来的位置</p>
              </div>
            </div>
            <div className="bg-gray-700 border border-gray-600 p-3 rounded-lg mb-6">
              <div className="text-sm space-y-2">
                {restoreTarget.displayTitle && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">项目:</span>
                    <span className="font-medium text-gray-200 text-right">{restoreTarget.displayTitle}</span>
                  </div>
                )}
                {restoreTarget.userName && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">员工姓名:</span>
                    <span className="font-medium text-gray-200">{restoreTarget.userName}</span>
                  </div>
                )}
                {restoreTarget.workDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">工作日期:</span>
                    <span className="font-medium text-gray-200">{restoreTarget.workDate}</span>
                  </div>
                )}
                {(restoreTarget.productionLine || restoreTarget.productionCategory) && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">生产信息:</span>
                    <span className="font-medium text-gray-200 text-right">{[restoreTarget.productionLine, restoreTarget.productionCategory].filter(Boolean).join(' | ')}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelRestore}
                className="px-4 py-2 text-gray-300 hover:text-gray-100 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmRestore}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                确认恢复
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
