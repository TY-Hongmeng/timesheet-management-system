import React from 'react'

interface MobileSkeletonProps {
  type?: 'dashboard' | 'list' | 'form' | 'table'
  rows?: number
}

export default function MobileSkeleton({ type = 'list', rows = 5 }: MobileSkeletonProps) {
  const renderDashboardSkeleton = () => (
    <div className="p-4 space-y-4">
      {/* 头部统计卡片 */}
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-gray-200 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
            <div className="h-6 bg-gray-300 rounded w-1/2"></div>
          </div>
        ))}
      </div>
      
      {/* 图表区域 */}
      <div className="bg-gray-200 rounded-lg h-48 animate-pulse"></div>
      
      {/* 列表区域 */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderListSkeleton = () => (
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg p-4 shadow-sm animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            </div>
            <div className="w-6 h-6 bg-gray-300 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  )

  const renderFormSkeleton = () => (
    <div className="p-4 space-y-6">
      {/* 表单标题 */}
      <div className="h-6 bg-gray-300 rounded w-1/2 animate-pulse"></div>
      
      {/* 表单字段 */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-300 rounded w-1/4 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      ))}
      
      {/* 按钮区域 */}
      <div className="flex space-x-3 pt-4">
        <div className="h-10 bg-blue-300 rounded-lg flex-1 animate-pulse"></div>
        <div className="h-10 bg-gray-300 rounded-lg flex-1 animate-pulse"></div>
      </div>
    </div>
  )

  const renderTableSkeleton = () => (
    <div className="p-4">
      {/* 表格头部 */}
      <div className="bg-gray-200 rounded-t-lg p-4 animate-pulse">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-300 rounded"></div>
          ))}
        </div>
      </div>
      
      {/* 表格行 */}
      <div className="bg-white rounded-b-lg overflow-hidden">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="border-b border-gray-200 p-4 animate-pulse">
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-3 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  switch (type) {
    case 'dashboard':
      return renderDashboardSkeleton()
    case 'form':
      return renderFormSkeleton()
    case 'table':
      return renderTableSkeleton()
    default:
      return renderListSkeleton()
  }
}

// 移动端专用的页面骨架屏
export const MobilePageSkeleton = ({ title }: { title?: string }) => (
  <div className="min-h-screen bg-gray-50">
    {/* 头部骨架 */}
    <div className="bg-white shadow-sm p-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-6 bg-gray-300 rounded w-32"></div>
        <div className="w-8 h-8 bg-gray-300 rounded"></div>
      </div>
    </div>
    
    {/* 内容骨架 */}
    <div className="p-4 space-y-4">
      {title && (
        <div className="h-8 bg-gray-300 rounded w-48 animate-pulse mb-6"></div>
      )}
      
      <MobileSkeleton type="list" rows={8} />
    </div>
  </div>
)

// 移动端卡片骨架屏
export const MobileCardSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="grid gap-4 p-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white rounded-lg p-4 shadow-sm animate-pulse">
        <div className="flex items-start space-x-3">
          <div className="w-12 h-12 bg-gray-300 rounded-lg"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            <div className="h-3 bg-gray-300 rounded w-2/3"></div>
          </div>
          <div className="w-6 h-6 bg-gray-300 rounded"></div>
        </div>
      </div>
    ))}
  </div>
)