import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  employeeName?: string;
  workDate?: string;
  workProject?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  title = '确认删除',
  message = '您确定要删除以下工时记录吗？',
  employeeName,
  workDate,
  workProject,
  onConfirm,
  onCancel,
  confirmText = '确认删除',
  cancelText = '取消'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-600">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-300 mb-4">{message}</p>
          
          {/* 详细信息 */}
          {(employeeName || workDate || workProject) && (
            <div className="bg-gray-700 rounded-lg p-3 mb-4 space-y-2">
              {employeeName && (
                <div className="flex justify-between">
                  <span className="text-gray-400">员工姓名：</span>
                  <span className="text-white">{employeeName}</span>
                </div>
              )}
              {workDate && (
                <div className="flex justify-between">
                  <span className="text-gray-400">工作日期：</span>
                  <span className="text-white">{workDate}</span>
                </div>
              )}
              {workProject && (
                <div className="flex justify-between">
                  <span className="text-gray-400">工时项目：</span>
                  <span className="text-white">{workProject}</span>
                </div>
              )}
            </div>
          )}
          
          {/* 警告提示 */}
          <div className="flex items-center gap-2 p-3 bg-red-900 bg-opacity-20 border border-red-600 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-red-400 text-sm">删除后数据将无法恢复，请谨慎操作</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-600">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-300 bg-gray-600 border border-gray-500 rounded-md hover:bg-gray-500 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmDialog;