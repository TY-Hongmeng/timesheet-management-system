import React from 'react'
import { CheckCircle, Clock, UserCheck, ArrowRight } from 'lucide-react'

interface RegistrationSuccessDialogProps {
  isOpen: boolean
  onClose: () => void
  userName: string
  userPhone: string
}

export default function RegistrationSuccessDialog({ 
  isOpen, 
  onClose, 
  userName, 
  userPhone 
}: RegistrationSuccessDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-green-400 rounded-lg shadow-2xl shadow-green-400/30 max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-900/50 to-green-800/50 border-b border-green-400/30 p-6 rounded-t-lg">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <CheckCircle className="w-16 h-16 text-green-400" />
              <div className="absolute inset-0 animate-ping">
                <CheckCircle className="w-16 h-16 text-green-400 opacity-30" />
              </div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-green-400 text-center font-mono">
            注册申请提交成功
          </h2>
          <p className="text-green-300 text-center text-sm font-mono mt-2">
            REGISTRATION SUBMITTED SUCCESSFULLY
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* User Info */}
          <div className="bg-black/50 border border-green-400/30 rounded-lg p-4">
            <h3 className="text-green-400 font-mono text-sm mb-3 flex items-center">
              <UserCheck className="w-4 h-4 mr-2" />
              申请人信息
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-green-300">姓名：</span>
                <span className="text-green-100 font-mono">{userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-300">手机号：</span>
                <span className="text-green-100 font-mono">{userPhone}</span>
              </div>
            </div>
          </div>

          {/* Status Info */}
          <div className="bg-yellow-900/20 border border-yellow-400/30 rounded-lg p-4">
            <h3 className="text-yellow-400 font-mono text-sm mb-3 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              当前状态
            </h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3 animate-pulse"></div>
                <span className="text-yellow-100 text-sm">账号状态：待激活</span>
              </div>
              <p className="text-yellow-200 text-xs leading-relaxed">
                您的账号已成功创建，但当前处于"待激活"状态。系统管理员将在1-2个工作日内审核您的申请。
              </p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-900/20 border border-blue-400/30 rounded-lg p-4">
            <h3 className="text-blue-400 font-mono text-sm mb-3">后续步骤</h3>
            <div className="space-y-2 text-xs text-blue-200">
              <div className="flex items-start">
                <ArrowRight className="w-3 h-3 mr-2 mt-0.5 text-blue-400 flex-shrink-0" />
                <span>请耐心等待系统管理员审核激活您的账号</span>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-3 h-3 mr-2 mt-0.5 text-blue-400 flex-shrink-0" />
                <span>账号激活后，您将可以使用注册的手机号和密码登录系统</span>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-3 h-3 mr-2 mt-0.5 text-blue-400 flex-shrink-0" />
                <span>如有疑问，请联系系统管理员或IT支持部门</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-4">
            <button
              onClick={onClose}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-mono py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
            >
              前往登录页面
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-800/50 border-t border-green-400/30 p-4 rounded-b-lg">
          <p className="text-green-300 text-xs text-center font-mono">
            工时管理系统 · TIMETRACK SYSTEM
          </p>
        </div>
      </div>
    </div>
  )
}