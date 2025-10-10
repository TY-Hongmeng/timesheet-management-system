import React from 'react'
import { X } from 'lucide-react'

interface TimesheetRecord {
  record_date: string
  production_line_id: number | null
  supervisor_id: string | null
  section_chief_id: string | null
}

interface TimesheetItem {
  work_type_id: number
  product_id: number
  process_id: string
  quantity: number
}

interface TimesheetConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  record: TimesheetRecord
  items: TimesheetItem[]
  productionLines: Array<{ id: number; name: string }>
  supervisors: Array<{ id: number; name: string }>
  sectionLeaders: Array<{ id: number; name: string }>
  workTypes: Array<{ id: number; name: string }>
  products: Array<{ id: number; name: string }>
  processes: Array<{ id: string; product_process: string }>
}

export default function TimesheetConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  record,
  items,
  productionLines,
  supervisors,
  sectionLeaders,
  workTypes,
  products,
  processes
}: TimesheetConfirmDialogProps) {
  if (!isOpen) return null

  const getProductionLineName = (id: number | null) => {
    if (!id) return '未选择'
    return productionLines.find(line => line.id === id)?.name || '未知生产线'
  }

  const getSupervisorName = (id: string | null) => {
    if (!id) return '未选择'
    return supervisors.find(supervisor => supervisor.id.toString() === id)?.name || '未知班长'
  }

  const getSectionLeaderName = (id: string | null) => {
    if (!id) return '未选择'
    return sectionLeaders.find(leader => leader.id.toString() === id)?.name || '未知段长'
  }

  const getWorkTypeName = (id: number) => {
    return workTypes.find(type => type.id === id)?.name || '未知工时类型'
  }

  const getProductName = (id: number) => {
    return products.find(product => product.id === id)?.name || '未知产品'
  }

  const getProcessName = (id: string) => {
    return processes.find(process => process.id === id)?.product_process || '未知工序'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-green-400 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-green-400">确认提交工时记录</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* 基本信息 */}
          <div className="bg-gray-800 border border-green-400 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-300 mb-4">基本信息</h3>
            <div className="space-y-2">
              {/* 记录日期和生产线一行 */}
              <div className="flex justify-between">
                <div>
                  <span className="text-green-300 font-medium">记录日期：</span>
                  <span className="text-white">{record.record_date}</span>
                </div>
                <div>
                  <span className="text-green-300 font-medium">生产线：</span>
                  <span className="text-white">{getProductionLineName(record.production_line_id)}</span>
                </div>
              </div>
              {/* 班长和段长一行 */}
              <div className="flex justify-between">
                <div>
                  <span className="text-green-300 font-medium">班长：</span>
                  <span className="text-white">{getSupervisorName(record.supervisor_id)}</span>
                </div>
                <div>
                  <span className="text-green-300 font-medium">段长：</span>
                  <span className="text-white">{getSectionLeaderName(record.section_chief_id)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 工时记录项 */}
          <div className="bg-gray-800 border border-green-400 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-300 mb-4">工时记录项 ({items.length}项)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-green-400">
                    <th className="text-left text-green-300 py-2 px-2">序号</th>
                    <th className="text-left text-green-300 py-2 px-2">工时类型</th>
                    <th className="text-left text-green-300 py-2 px-2">产品名称</th>
                    <th className="text-left text-green-300 py-2 px-2">工序名称</th>
                    <th className="text-left text-green-300 py-2 px-2">数量</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-600">
                      <td className="py-2 px-2 text-white">{index + 1}</td>
                      <td className="py-2 px-2 text-white">{getWorkTypeName(item.work_type_id)}</td>
                      <td className="py-2 px-2 text-white">{getProductName(item.product_id)}</td>
                      <td className="py-2 px-2 text-white">{getProcessName(item.process_id)}</td>
                      <td className="py-2 px-2 text-white">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 重要提示 */}
          <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-2 mb-4">
            <p className="text-yellow-300 text-xs">
              ⚠️ 数据提交后将不可修改，请仔细核对以上信息是否正确。数据确认提交后，需要等待班长和段长审核通过。
            </p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
          >
            确认提交
          </button>
        </div>
      </div>
    </div>
  )
}