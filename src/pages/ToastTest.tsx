import React from 'react';
import { toast } from 'sonner';

const ToastTest: React.FC = () => {
  const testErrorToast = () => {
    console.log('测试错误toast');
    toast.error('测试错误提示：没有找到合适的接收人', {
      description: '请确保目标生产线有相同角色的用户',
      duration: 5000
    });
  };

  const testSuccessToast = () => {
    console.log('测试成功toast');
    toast.success('测试成功提示');
  };

  const testWarningToast = () => {
    console.log('测试警告toast');
    toast.warning('测试警告提示');
  };

  const testInfoToast = () => {
    console.log('测试信息toast');
    toast.info('测试信息提示');
  };

  return (
    <div className="min-h-screen bg-black text-green-400 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Toast 功能测试</h1>
        
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={testErrorToast}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
          >
            测试错误提示
          </button>
          
          <button
            onClick={testSuccessToast}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded transition-colors"
          >
            测试成功提示
          </button>
          
          <button
            onClick={testWarningToast}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded transition-colors"
          >
            测试警告提示
          </button>
          
          <button
            onClick={testInfoToast}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
          >
            测试信息提示
          </button>
        </div>
        
        <div className="mt-8 p-4 border border-green-400/30 rounded">
          <h2 className="text-lg font-bold mb-4">使用说明：</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>点击按钮测试不同类型的toast提示</li>
            <li>toast应该出现在页面右上角</li>
            <li>如果没有看到提示，请检查浏览器控制台</li>
            <li>确保Toaster组件已正确配置在App.tsx中</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ToastTest;