// 资源加载优化器
import { networkManager } from './enhancedNetworkManager'

export class ResourceLoadOptimizer {
  private loadedResources = new Set<string>()
  private failedResources = new Set<string>()
  private loadingQueue: Array<{ url: string; priority: number; callback?: () => void }> = []
  private isProcessingQueue = false

  constructor() {
    this.setupResourceMonitoring()
  }

  private setupResourceMonitoring() {
    // 监听资源加载错误
    window.addEventListener('error', (event) => {
      if (event.target && (event.target as any).src) {
        const url = (event.target as any).src
        console.warn('🚨 Resource load failed:', url)
        this.failedResources.add(url)
        this.handleResourceError(url, event.target as HTMLElement)
      }
    }, true)

    // 监听网络状态变化
    networkManager.addNetworkListener((online) => {
      if (online && this.failedResources.size > 0) {
        console.log('🔄 Network restored, retrying failed resources')
        this.retryFailedResources()
      }
    })
  }

  // 智能资源加载
  public async loadResource(url: string, options: {
    priority?: number
    timeout?: number
    retries?: number
    fallback?: string
    critical?: boolean
  } = {}): Promise<boolean> {
    const {
      priority = 1,
      timeout = networkManager.getRecommendedTimeout(),
      retries = 3,
      fallback,
      critical = false
    } = options

    if (this.loadedResources.has(url)) {
      return true
    }

    try {
      return await networkManager.retryWithBackoff(async () => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        try {
          const response = await fetch(url, {
            signal: controller.signal,
            cache: networkManager.shouldUseLowSpeedMode() ? 'force-cache' : 'default'
          })

          clearTimeout(timeoutId)

          if (response.ok) {
            this.loadedResources.add(url)
            this.failedResources.delete(url)
            return true
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
        } catch (error) {
          clearTimeout(timeoutId)
          throw error
        }
      }, `load resource: ${url}`)

    } catch (error) {
      console.error(`❌ Failed to load resource: ${url}`, error)
      this.failedResources.add(url)

      // 尝试加载备用资源
      if (fallback) {
        console.log(`🔄 Trying fallback resource: ${fallback}`)
        return this.loadResource(fallback, { ...options, fallback: undefined })
      }

      // 如果是关键资源，抛出错误
      if (critical) {
        throw new Error(`Critical resource failed to load: ${url}`)
      }

      return false
    }
  }

  // 预加载关键资源 - 增强版
  public async preloadCriticalResources(): Promise<void> {
    const criticalResources = this.getCriticalResources()
    
    console.log('🚀 Preloading critical resources:', criticalResources.length)

    // 根据网络质量调整并发数
    const connectionInfo = networkManager.getConnectionInfo()
    const concurrency = connectionInfo.quality === 'slow' ? 2 : 4

    // 分批加载以避免过载
    for (let i = 0; i < criticalResources.length; i += concurrency) {
      const batch = criticalResources.slice(i, i + concurrency)
      
      const loadPromises = batch.map(resource => 
        this.loadResource(resource.url, {
          priority: resource.priority,
          critical: true,
          timeout: networkManager.shouldUseLowSpeedMode() ? 20000 : 10000
        }).catch(error => {
          console.warn(`⚠️ Critical resource failed: ${resource.url}`, error)
          return false
        })
      )

      try {
        await Promise.all(loadPromises)
        console.log(`✅ Batch ${Math.floor(i/concurrency) + 1} loaded successfully`)
        
        // 在慢网络下添加延迟
        if (connectionInfo.quality === 'slow' && i + concurrency < criticalResources.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      } catch (error) {
        console.error('🚨 Critical resource batch failed:', error)
      }
    }
    
    console.log('🎯 Critical resource preloading completed')
  }

  private getCriticalResources() {
    const isLocalDev = window.location.hostname === 'localhost'
    
    if (isLocalDev) {
      return [
        { url: '/src/main.tsx', priority: 10 },
        { url: '/src/App.tsx', priority: 9 },
        { url: '/src/index.css', priority: 8 }
      ]
    } else {
      return [
        { url: '/timesheet-management-system/assets/index.js', priority: 10 },
        { url: '/timesheet-management-system/assets/index.css', priority: 9 },
        { url: '/timesheet-management-system/manifest.json', priority: 8 }
      ]
    }
  }

  // 处理资源加载错误
  private handleResourceError(url: string, element: HTMLElement) {
    const tagName = element.tagName.toLowerCase()
    
    switch (tagName) {
      case 'script':
        this.handleScriptError(url, element as HTMLScriptElement)
        break
      case 'link':
        this.handleStyleError(url, element as HTMLLinkElement)
        break
      case 'img':
        this.handleImageError(url, element as HTMLImageElement)
        break
      default:
        console.warn('🤷 Unknown resource type failed:', tagName, url)
    }
  }

  private handleScriptError(url: string, script: HTMLScriptElement) {
    console.log('🔧 Handling script error:', url)
    
    // 尝试重新加载脚本
    setTimeout(() => {
      if (networkManager.getConnectionInfo().isOnline) {
        const newScript = document.createElement('script')
        newScript.src = url
        newScript.async = script.async
        newScript.defer = script.defer
        
        newScript.onload = () => {
          console.log('✅ Script reloaded successfully:', url)
          this.loadedResources.add(url)
          this.failedResources.delete(url)
        }
        
        newScript.onerror = () => {
          console.error('❌ Script reload failed:', url)
        }
        
        script.parentNode?.replaceChild(newScript, script)
      }
    }, networkManager.shouldUseLowSpeedMode() ? 5000 : 2000)
  }

  private handleStyleError(url: string, link: HTMLLinkElement) {
    console.log('🎨 Handling style error:', url)
    
    // 尝试重新加载样式
    setTimeout(() => {
      if (networkManager.getConnectionInfo().isOnline) {
        const newLink = document.createElement('link')
        newLink.rel = link.rel
        newLink.href = url
        newLink.type = link.type
        
        newLink.onload = () => {
          console.log('✅ Style reloaded successfully:', url)
          this.loadedResources.add(url)
          this.failedResources.delete(url)
        }
        
        newLink.onerror = () => {
          console.error('❌ Style reload failed:', url)
        }
        
        link.parentNode?.replaceChild(newLink, link)
      }
    }, networkManager.shouldUseLowSpeedMode() ? 3000 : 1000)
  }

  private handleImageError(url: string, img: HTMLImageElement) {
    console.log('🖼️ Handling image error:', url)
    
    // 设置占位符
    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIEVycm9yPC90ZXh0Pjwvc3ZnPg=='
    img.alt = 'Image failed to load'
  }

  // 重试失败的资源
  private async retryFailedResources() {
    const failedUrls = Array.from(this.failedResources)
    this.failedResources.clear()

    for (const url of failedUrls) {
      try {
        await this.loadResource(url, { priority: 1, retries: 2 })
      } catch (error) {
        console.warn('🔄 Retry failed for resource:', url)
      }
    }
  }

  // 获取加载统计
  public getLoadStats() {
    return {
      loaded: this.loadedResources.size,
      failed: this.failedResources.size,
      successRate: this.loadedResources.size / (this.loadedResources.size + this.failedResources.size) * 100
    }
  }

  // 清理资源缓存
  public clearCache() {
    this.loadedResources.clear()
    this.failedResources.clear()
    console.log('🧹 Resource cache cleared')
  }
}

// 全局实例
export const resourceOptimizer = new ResourceLoadOptimizer()