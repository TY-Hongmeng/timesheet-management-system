import React from 'react'

interface SkeletonLoaderProps {
  type?: 'page' | 'card' | 'list' | 'table' | 'form'
  lines?: number
  className?: string
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  type = 'page', 
  lines = 3,
  className = '' 
}) => {
  const baseClasses = "animate-pulse bg-gray-700 rounded"
  
  const renderPageSkeleton = () => (
    <div className={`space-y-6 p-6 ${className}`}>
      {/* 页面标题 */}
      <div className="space-y-3">
        <div className={`h-8 w-1/3 ${baseClasses}`} />
        <div className={`h-4 w-2/3 ${baseClasses}`} />
      </div>
      
      {/* 内容区域 */}
      <div className="space-y-4">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className={`h-4 w-full ${baseClasses}`} />
            <div className={`h-4 w-5/6 ${baseClasses}`} />
          </div>
        ))}
      </div>
      
      {/* 按钮区域 */}
      <div className="flex space-x-3">
        <div className={`h-10 w-24 ${baseClasses}`} />
        <div className={`h-10 w-20 ${baseClasses}`} />
      </div>
    </div>
  )

  const renderCardSkeleton = () => (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3 ${className}`}>
      <div className={`h-6 w-3/4 ${baseClasses}`} />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-4 w-full ${baseClasses}`} />
      ))}
      <div className={`h-8 w-1/3 ${baseClasses}`} />
    </div>
  )

  const renderListSkeleton = () => (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3">
          <div className={`h-10 w-10 rounded-full ${baseClasses}`} />
          <div className="flex-1 space-y-2">
            <div className={`h-4 w-3/4 ${baseClasses}`} />
            <div className={`h-3 w-1/2 ${baseClasses}`} />
          </div>
        </div>
      ))}
    </div>
  )

  const renderTableSkeleton = () => (
    <div className={`space-y-3 ${className}`}>
      {/* 表头 */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`h-6 ${baseClasses}`} />
        ))}
      </div>
      
      {/* 表格行 */}
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, j) => (
            <div key={j} className={`h-4 ${baseClasses}`} />
          ))}
        </div>
      ))}
    </div>
  )

  const renderFormSkeleton = () => (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className={`h-4 w-1/4 ${baseClasses}`} />
          <div className={`h-10 w-full ${baseClasses}`} />
        </div>
      ))}
      <div className={`h-10 w-1/3 ${baseClasses}`} />
    </div>
  )

  switch (type) {
    case 'card':
      return renderCardSkeleton()
    case 'list':
      return renderListSkeleton()
    case 'table':
      return renderTableSkeleton()
    case 'form':
      return renderFormSkeleton()
    default:
      return renderPageSkeleton()
  }
}

export default SkeletonLoader