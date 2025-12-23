import React from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface NavActionsProps {
  onRefresh: () => void | Promise<void>;
  refreshing: boolean;
  backTo?: string;
  className?: string;
  showClearCache?: boolean;
}

// 统一的导航按钮组件：深色圆角按钮 + 霓虹绿边框，统一图标与文案
const NavActions: React.FC<NavActionsProps> = ({ onRefresh, refreshing, backTo = '/dashboard', className = '', showClearCache = true }) => {
  const clearCaches = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready.catch(() => null)
        const controller = navigator.serviceWorker.controller
        if (controller) {
          const channel = new MessageChannel()
          channel.port1.onmessage = (event) => {
            if (event.data?.success) {
              toast.success('缓存已清除')
            } else {
              toast.error(event.data?.error || '清除缓存失败')
            }
          }
          controller.postMessage({ type: 'CLEAR_ALL_CACHES' }, [channel.port2])
        } else {
          // 没有SW控制，直接清理 Cache API
          const names = await caches.keys()
          await Promise.all(names.map(n => caches.delete(n)))
          toast.success('缓存已清除')
        }
      } else {
        toast.error('当前环境不支持缓存清理')
      }
    } catch (err: any) {
      toast.error('清除缓存失败')
      console.error('清除缓存失败:', err)
    }
  }
  return (
    <div className={`flex items中心 gap-2 ${className}`}>
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

      {showClearCache && (
        <button
          onClick={clearCaches}
          className="flex items-center gap-2 px-2 py-1 sm:px-4 sm:py-2 bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 text-green-300 border border-green-400 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 font-mono text-sm sm:text-base"
          title="清除缓存"
        >
          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">清除缓存</span>
          <span className="sm:hidden">清缓存</span>
        </button>
      )}
    </div>
  );
};

export default NavActions;
