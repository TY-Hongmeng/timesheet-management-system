import React from 'react';
import { Edit, X } from 'lucide-react';

interface EditConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  currentQuantity?: number;
  newQuantity?: number;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

const EditConfirmDialog: React.FC<EditConfirmDialogProps> = ({
  isOpen,
  title = '确认修改数量',
  message = '您确定要修改数量吗？',
  currentQuantity,
  newQuantity,
  onConfirm,
  onCancel,
  confirmText = '确认修改',
  cancelText = '取消'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-600">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <Edit className="w-5 h-5 text-white" />
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
          
          {/* 数量变更信息 */}
          {(currentQuantity !== undefined && newQuantity !== undefined) && (
            <div className="bg-gray-700 rounded-lg p-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">当前数量：</span>
                <span className="text-white font-mono">{currentQuantity}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-400">修改为：</span>
                <span className="text-blue-400 font-mono font-bold">{newQuantity}</span>
              </div>
            </div>
          )}
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
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditConfirmDialog;