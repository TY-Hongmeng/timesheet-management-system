import React from 'react'
import { ArrowLeft, RefreshCw, LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

interface PageHeaderProps {
  title: string
  icon: LucideIcon
  subtitle?: string
  onRefresh?: () => void
  refreshing?: boolean
  backTo?: string
  backText?: string
  extraActions?: React.ReactNode
}

export default function PageHeader({
  title,
  icon: Icon,
  subtitle,
  onRefresh,
  refreshing = false,
  backTo = "/dashboard",
  backText = "返回控制台",
  extraActions
}: PageHeaderProps) {
  return (
    <div className="mb-4 sm:mb-8">
      <div className="flex justify-between items-center mb-2 sm:mb-4">
        <div className="flex items-center">
          <Icon className="w-5 h-5 sm:w-8 sm:h-8 text-green-400 mr-2 sm:mr-3" />
          <div>
            <h1 className="text-xl sm:text-4xl font-bold text-green-400 font-mono">{title}</h1>
            {subtitle && (
              <p className="text-sm sm:text-base text-green-300 mt-1 font-mono">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* 刷新按钮 */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center space-x-1 sm:space-x-2 px-2 py-1 sm:px-4 sm:py-2 bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 disabled:from-gray-600 disabled:to-gray-800 text-green-300 border border-green-400 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 font-mono text-sm sm:text-base disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{refreshing ? '刷新中...' : '刷新'}</span>
              <span className="sm:hidden">{refreshing ? '...' : '刷新'}</span>
            </button>
          )}
          
          {/* 额外操作按钮 */}
          {extraActions}
          
          {/* 返回按钮 */}
          <Link
            to={backTo}
            className="flex items-center space-x-1 sm:space-x-2 px-2 py-1 sm:px-4 sm:py-2 bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 text-green-300 border border-green-400 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 font-mono text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">{backText}</span>
            <span className="sm:hidden">返回</span>
          </Link>
        </div>
      </div>
      <div className="h-0.5 sm:h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent"></div>
    </div>
  )
}