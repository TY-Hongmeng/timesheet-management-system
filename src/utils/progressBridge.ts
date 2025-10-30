/**
 * 进度桥接管理器 - 连接HTML即时进度条和React进度条
 * 确保从页面加载到应用启动的无缝进度体验
 */

// 全局进度接口
interface GlobalProgress {
  update: (progress: number, phase?: string) => void;
  hide: () => void;
}

// 声明全局window对象上的instantProgress
declare global {
  interface Window {
    instantProgress?: GlobalProgress;
  }
}

export class ProgressBridge {
  private static instance: ProgressBridge;
  private currentProgress = 0;
  private isReactReady = false;
  private reactProgressCallback?: (progress: number, phase: string) => void;

  private constructor() {}

  static getInstance(): ProgressBridge {
    if (!ProgressBridge.instance) {
      ProgressBridge.instance = new ProgressBridge();
    }
    return ProgressBridge.instance;
  }

  /**
   * 更新进度 - 自动选择HTML或React进度条
   */
  updateProgress(progress: number, phase: string) {
    this.currentProgress = progress;

    if (!this.isReactReady && window.instantProgress) {
      // React还未准备好，使用HTML进度条
      console.log(`📊 HTML进度条更新: ${progress}% - ${phase}`)
      window.instantProgress.update(progress, phase);
    } else if (this.isReactReady && this.reactProgressCallback) {
      // React已准备好，使用React进度条
      console.log(`⚛️ React进度条更新: ${progress}% - ${phase}`)
      this.reactProgressCallback(progress, phase);
    } else {
      console.warn(`⚠️ 进度条更新失败: React准备状态=${this.isReactReady}, HTML进度条=${!!window.instantProgress}`)
    }
  }

  /**
   * 注册React进度回调
   */
  setReactProgressCallback(callback: (progress: number, phase: string) => void) {
    this.reactProgressCallback = callback;
    this.isReactReady = true;
    
    // 如果有当前进度，立即同步到React
    if (this.currentProgress > 0) {
      callback(this.currentProgress, '同步进度状态...');
    }
  }

  /**
   * 完成进度 - 隐藏所有进度条
   */
  complete() {
    this.updateProgress(100, '加载完成');
    
    setTimeout(() => {
      if (window.instantProgress) {
        window.instantProgress.hide();
      }
    }, 500);
  }

  /**
   * 获取当前进度
   */
  getCurrentProgress(): number {
    return this.currentProgress;
  }

  /**
   * 检查React是否准备就绪
   */
  isReactProgressReady(): boolean {
    return this.isReactReady;
  }
}

// 创建全局实例
export const progressBridge = ProgressBridge.getInstance();

// 便捷的更新函数，用于初始化阶段
export const updateInitProgress = (progress: number, phase: string) => {
  progressBridge.updateProgress(progress, phase);
};