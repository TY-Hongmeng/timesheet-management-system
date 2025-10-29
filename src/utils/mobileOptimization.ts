// 移动端性能优化工具

// 检测移动设备
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
         window.innerWidth <= 768
}

// 检测网络连接类型
export const getConnectionType = (): string => {
  const connection = (navigator as any).connection || 
                    (navigator as any).mozConnection || 
                    (navigator as any).webkitConnection
  
  if (connection) {
    return connection.effectiveType || 'unknown'
  }
  
  return 'unknown'
}

// 检测是否为慢速连接
export const isSlowConnection = (): boolean => {
  const connectionType = getConnectionType()
  return ['slow-2g', '2g', '3g'].includes(connectionType)
}

// 获取当前页面的资源文件
const getCurrentAssets = () => {
  const scripts = Array.from(document.querySelectorAll('script[src]'))
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
  
  return {
    reactVendor: scripts.find(s => s.src.includes('react-vendor'))?.src || '',
    mainCSS: styles.find(s => s.href.includes('index-'))?.href || '',
    vendor: scripts.find(s => s.src.includes('vendor-'))?.src || ''
  }
}

// 移动端网络状态监控和重试机制
export const mobileNetworkManager = {
  retryCount: 0,
  maxRetries: 3,
  retryDelay: 2000,
  
  // 检测网络状态
  checkNetworkStatus: () => {
    return {
      online: navigator.onLine,
      connection: (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection,
      effectiveType: ((navigator as any).connection || {}).effectiveType || 'unknown'
    }
  },
  
  // 网络重试机制
  retryWithBackoff: async (fn: () => Promise<any>, context: string = 'operation') => {
    for (let attempt = 1; attempt <= mobileNetworkManager.maxRetries; attempt++) {
      try {
        console.log(`🔄 移动端网络重试 ${attempt}/${mobileNetworkManager.maxRetries} - ${context}`)
        const result = await fn()
        mobileNetworkManager.retryCount = 0 // 重置计数器
        return result
      } catch (error) {
        console.warn(`❌ 移动端网络重试失败 ${attempt}/${mobileNetworkManager.maxRetries}:`, error)
        
        if (attempt === mobileNetworkManager.maxRetries) {
          throw new Error(`移动端网络操作失败，已重试 ${mobileNetworkManager.maxRetries} 次: ${error}`)
        }
        
        // 指数退避延迟
        const delay = mobileNetworkManager.retryDelay * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  },
  
  // 网络状态变化监听
  setupNetworkMonitoring: () => {
    if (!isMobileDevice()) return
    
    window.addEventListener('online', () => {
      console.log('📶 移动端网络已恢复')
      mobileNetworkManager.retryCount = 0
      
      // 触发自定义事件
      window.dispatchEvent(new CustomEvent('mobileNetworkRestored', {
        detail: { timestamp: Date.now(), networkStatus: mobileNetworkManager.checkNetworkStatus() }
      }))
    })
    
    window.addEventListener('offline', () => {
      console.log('📵 移动端网络已断开')
      
      // 触发自定义事件
      window.dispatchEvent(new CustomEvent('mobileNetworkLost', {
        detail: { timestamp: Date.now() }
      }))
    })
    
    // 监听连接变化
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    if (connection) {
      connection.addEventListener('change', () => {
        const status = mobileNetworkManager.checkNetworkStatus()
        console.log('📡 移动端网络状态变化:', status)
        
        window.dispatchEvent(new CustomEvent('mobileConnectionChange', {
          detail: { 
            type: status.effectiveType === 'slow-2g' || status.effectiveType === '2g' ? 'slow' : 'fast',
            networkStatus: status,
            timestamp: Date.now()
          }
        }))
      })
    }
  }
}

// 移动端资源预加载策略 - 增强版
export const mobilePreloadStrategy = {
  // 关键资源立即预加载
  critical: () => {
    if (isMobileDevice() && !isSlowConnection()) {
      const assets = getCurrentAssets()
      
      // 预加载关键 CSS
      if (assets.mainCSS) {
        const criticalCSS = document.createElement('link')
        criticalCSS.rel = 'preload'
        criticalCSS.as = 'style'
        criticalCSS.href = assets.mainCSS
        criticalCSS.onload = () => console.log('✅ 移动端关键CSS预加载完成')
        criticalCSS.onerror = () => console.warn('❌ 移动端关键CSS预加载失败')
        document.head.appendChild(criticalCSS)
      }
      
      // 预加载 vendor JS
      if (assets.vendor) {
        const vendorJS = document.createElement('link')
        vendorJS.rel = 'modulepreload'
        vendorJS.href = assets.vendor
        vendorJS.onload = () => console.log('✅ 移动端Vendor JS预加载完成')
        vendorJS.onerror = () => console.warn('❌ 移动端Vendor JS预加载失败')
        document.head.appendChild(vendorJS)
      }
    }
  },
  
  // 延迟预加载非关键资源
  deferred: () => {
    if (isMobileDevice() && !isSlowConnection()) {
      setTimeout(() => {
        // 预加载图标字体
        const iconFont = document.createElement('link')
        iconFont.rel = 'preload'
        iconFont.as = 'font'
        iconFont.type = 'font/woff2'
        iconFont.crossOrigin = 'anonymous'
        iconFont.href = '/timesheet-management-system/fonts/icons.woff2'
        iconFont.onload = () => console.log('✅ 移动端图标字体预加载完成')
        iconFont.onerror = () => console.warn('❌ 移动端图标字体预加载失败')
        document.head.appendChild(iconFont)
      }, 2000)
    }
  },
  
  // 智能预加载下一页面
  smartPreload: (nextRoute: string) => {
    if (isMobileDevice() && !isSlowConnection()) {
      // 使用 Intersection Observer 检测用户意图
      const preloadTrigger = document.createElement('div')
      preloadTrigger.style.position = 'absolute'
      preloadTrigger.style.bottom = '100px'
      preloadTrigger.style.height = '1px'
      preloadTrigger.style.width = '100%'
      document.body.appendChild(preloadTrigger)
      
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // 用户接近页面底部，预加载下一页面
            import(/* webpackChunkName: "next-page" */ `@/pages/${nextRoute}`)
            observer.disconnect()
            document.body.removeChild(preloadTrigger)
          }
        })
      }, { threshold: 0.1 })
      
      observer.observe(preloadTrigger)
    }
  }
}

// 移动端图片优化 - 增强版
export const optimizeImages = () => {
  if (isMobileDevice()) {
    // 懒加载图片
    const images = document.querySelectorAll('img[data-src]')
    
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            
            // 使用网络重试机制加载图片
            mobileNetworkManager.retryWithBackoff(async () => {
              return new Promise((resolve, reject) => {
                const tempImg = new Image()
                tempImg.onload = () => {
                  img.src = img.dataset.src!
                  img.removeAttribute('data-src')
                  console.log('✅ 移动端图片加载成功:', img.dataset.src)
                  resolve(tempImg)
                }
                tempImg.onerror = () => {
                  console.warn('❌ 移动端图片加载失败:', img.dataset.src)
                  reject(new Error(`图片加载失败: ${img.dataset.src}`))
                }
                tempImg.src = img.dataset.src!
              })
            }, `图片加载: ${img.dataset.src}`).catch(error => {
              console.error('移动端图片最终加载失败:', error)
              // 设置占位图片
              img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWbvueJh+WKoOi9veWksei0pTwvdGV4dD48L3N2Zz4='
            })
            
            imageObserver.unobserve(img)
          }
        })
      }, { 
        rootMargin: '50px',
        threshold: 0.1
      })
      
      images.forEach(img => imageObserver.observe(img))
    } else {
      // 降级方案 - 也使用重试机制
      images.forEach(img => {
        const image = img as HTMLImageElement
        mobileNetworkManager.retryWithBackoff(async () => {
          return new Promise((resolve, reject) => {
            const tempImg = new Image()
            tempImg.onload = () => {
              image.src = image.dataset.src!
              image.removeAttribute('data-src')
              resolve(tempImg)
            }
            tempImg.onerror = () => reject(new Error(`图片加载失败: ${image.dataset.src}`))
            tempImg.src = image.dataset.src!
          })
        }, `降级图片加载: ${image.dataset.src}`).catch(() => {
          // 设置占位图片
          image.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWbvueJh+WKoOi9veWksei0pTwvdGV4dD48L3N2Zz4='
        })
      })
    }
  }
}

// 移动端内存优化
export const mobileMemoryOptimization = {
  // 清理未使用的组件
  cleanupUnusedComponents: () => {
    if (isMobileDevice()) {
      // 清理 DOM 中的隐藏元素
      const hiddenElements = document.querySelectorAll('[style*="display: none"]')
      hiddenElements.forEach(el => {
        if (el.parentNode) {
          el.parentNode.removeChild(el)
        }
      })
    }
  },
  
  // 限制并发请求数量
  limitConcurrentRequests: (maxConcurrent: number = 3) => {
    if (isMobileDevice()) {
      // 实现请求队列管理
      let activeRequests = 0
      const requestQueue: Array<() => Promise<any>> = []
      
      const processQueue = async () => {
        if (activeRequests < maxConcurrent && requestQueue.length > 0) {
          const request = requestQueue.shift()
          if (request) {
            activeRequests++
            try {
              await request()
            } finally {
              activeRequests--
              processQueue()
            }
          }
        }
      }
      
      return {
        addRequest: (request: () => Promise<any>) => {
          requestQueue.push(request)
          processQueue()
        }
      }
    }
    
    return {
      addRequest: (request: () => Promise<any>) => request()
    }
  }
}

// 移动端缓存策略
export const mobileCacheStrategy = {
  // 设置移动端专用的缓存头
  setMobileCacheHeaders: () => {
    if (isMobileDevice()) {
      // 为移动端设置更激进的缓存策略
      const meta = document.createElement('meta')
      meta.httpEquiv = 'Cache-Control'
      meta.content = 'public, max-age=31536000, immutable'
      document.head.appendChild(meta)
    }
  },
  
  // 清理过期缓存
  cleanExpiredCache: async () => {
    if ('caches' in window && isMobileDevice()) {
      const cacheNames = await caches.keys()
      const expiredCaches = cacheNames.filter(name => 
        !name.includes('v1.2.0') // 当前版本
      )
      
      await Promise.all(
        expiredCaches.map(cacheName => caches.delete(cacheName))
      )
    }
  }
}

// 移动端性能监控
export const mobilePerformanceMonitor = {
  // 监控首屏加载时间
  measureFirstContentfulPaint: () => {
    if (isMobileDevice() && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          if (entry.name === 'first-contentful-paint') {
            console.log(`移动端首屏加载时间: ${entry.startTime}ms`)
            
            // 如果加载时间过长，显示提示
            if (entry.startTime > 3000) {
              console.warn('移动端加载时间较长，建议优化')
            }
          }
        })
      })
      
      observer.observe({ entryTypes: ['paint'] })
    }
  },
  
  // 监控内存使用
  monitorMemoryUsage: () => {
    if (isMobileDevice() && 'memory' in performance) {
      const memory = (performance as any).memory
      const memoryInfo = {
        used: Math.round(memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1048576) // MB
      }
      
      console.log('移动端内存使用情况:', memoryInfo)
      
      // 内存使用过高时的警告
      if (memoryInfo.used / memoryInfo.limit > 0.8) {
        console.warn('移动端内存使用过高，建议清理')
        mobileMemoryOptimization.cleanupUnusedComponents()
      }
    }
  }
}

// 移动端错误监控和恢复机制
export const mobileErrorRecovery = {
  errorCount: 0,
  maxErrors: 5,
  
  // 错误处理和恢复
  handleError: (error: Error, context: string) => {
    mobileErrorRecovery.errorCount++
    console.error(`🚨 移动端错误 [${mobileErrorRecovery.errorCount}/${mobileErrorRecovery.maxErrors}] - ${context}:`, error)
    
    // 触发错误事件
    window.dispatchEvent(new CustomEvent('mobileError', {
      detail: { 
        error: error.message,
        context,
        count: mobileErrorRecovery.errorCount,
        timestamp: Date.now()
      }
    }))
    
    // 如果错误过多，尝试重载页面
    if (mobileErrorRecovery.errorCount >= mobileErrorRecovery.maxErrors) {
      console.warn('🔄 移动端错误过多，尝试重载页面...')
      setTimeout(() => {
        window.location.reload()
      }, 3000)
    }
  },
  
  // 重置错误计数
  resetErrorCount: () => {
    mobileErrorRecovery.errorCount = 0
    console.log('✅ 移动端错误计数已重置')
  },
  
  // 设置全局错误处理
  setupGlobalErrorHandling: () => {
    if (!isMobileDevice()) return
    
    // 捕获未处理的Promise错误
    window.addEventListener('unhandledrejection', (event) => {
      mobileErrorRecovery.handleError(new Error(event.reason), 'Promise rejection')
      event.preventDefault()
    })
    
    // 捕获JavaScript错误
    window.addEventListener('error', (event) => {
      mobileErrorRecovery.handleError(new Error(event.message), `JavaScript error at ${event.filename}:${event.lineno}`)
    })
    
    // 捕获资源加载错误
    window.addEventListener('error', (event) => {
      if (event.target && event.target !== window) {
        const target = event.target as HTMLElement
        mobileErrorRecovery.handleError(new Error(`资源加载失败: ${target.tagName}`), 'Resource loading')
      }
    }, true)
  }
}

// 初始化移动端优化 - 增强版
export const initMobileOptimization = () => {
  if (isMobileDevice()) {
    console.log('🚀 初始化移动端优化...')
    
    // 设置网络监控
    mobileNetworkManager.setupNetworkMonitoring()
    
    // 设置全局错误处理
    mobileErrorRecovery.setupGlobalErrorHandling()
    
    // 启动关键资源预加载
    mobilePreloadStrategy.critical()
    
    // 延迟启动非关键优化
    setTimeout(() => {
      mobilePreloadStrategy.deferred()
      optimizeImages()
      mobileCacheStrategy.setMobileCacheHeaders()
      mobilePerformanceMonitor.measureFirstContentfulPaint()
      mobilePerformanceMonitor.monitorMemoryUsage()
    }, 1000)
    
    // 启用内存优化
    mobileMemoryOptimization.cleanupUnusedComponents()
    mobileMemoryOptimization.limitConcurrentRequests()
    
    // 清理过期缓存
    setTimeout(() => {
      mobileCacheStrategy.cleanExpiredCache()
    }, 5000)
    
    // 监听网络状态变化
    window.addEventListener('mobileNetworkRestored', () => {
      console.log('📶 网络恢复，重置错误计数')
      mobileErrorRecovery.resetErrorCount()
    })
    
    window.addEventListener('mobileNetworkLost', () => {
      console.log('📵 网络断开，显示离线提示')
      // 可以在这里显示离线提示UI
    })
    
    console.log('✅ 移动端优化初始化完成')
  }
}