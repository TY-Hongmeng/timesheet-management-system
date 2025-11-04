import React from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, ArrowLeft } from 'lucide-react';

interface NavActionsProps {
  onRefresh: () => void | Promise<void>;
  refreshing: boolean;
  backTo?: string;
  className?: string;
}

// 统一的导航按钮组件：深色圆角按钮 + 霓虹绿边框，统一图标与文案
const NavActions: React.FC<NavActionsProps> = ({ onRefresh, refreshing, backTo = '/dashboard', className = '' }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="flex items-center gap-2 px-2 py-1 sm:px-4 sm:py-2 bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 disabled:opacity-60 text-green-300 border border-green-400 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 font-mono text-sm sm:text-base disabled:cursor-not-allowed"
        title="刷新"
      >
        <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${refreshing ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline">{refreshing ? '刷新中...' : '刷新'}</span>
        <span className="sm:hidden">{refreshing ? '...' : '刷新'}</span>
      </button>

      <Link
        to={backTo}
        className="flex items-center gap-2 px-2 py-1 sm:px-4 sm:py-2 bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 text-green-300 border border-green-400 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 font-mono text-sm sm:text-base"
        title="返回"
      >
        <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="hidden sm:inline">返回控制台</span>
        <span className="sm:hidden">返回</span>
      </Link>
    </div>
  );
};

export default NavActions;