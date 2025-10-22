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

// 移动端资源预加载策略
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
        document.head.appendChild(criticalCSS)
      }
      
      // 预加载 vendor JS
      if (assets.vendor) {
        const vendorJS = document.createElement('link')
        vendorJS.rel = 'modulepreload'
        vendorJS.href = assets.vendor
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

// 移动端图片优化
export const optimizeImages = () => {
  if (isMobileDevice()) {
    // 懒加载图片
    const images = document.querySelectorAll('img[data-src]')
    
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            img.src = img.dataset.src || ''
            img.classList.remove('lazy')
            imageObserver.unobserve(img)
          }
        })
      })
      
      images.forEach(img => imageObserver.observe(img))
    } else {
      // 降级方案
      images.forEach(img => {
        const imgElement = img as HTMLImageElement
        imgElement.src = imgElement.dataset.src || ''
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

// 初始化移动端优化
export const initMobileOptimization = () => {
  if (isMobileDevice()) {
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
    
    // 清理过期缓存
    setTimeout(() => {
      mobileCacheStrategy.cleanExpiredCache()
    }, 5000)
  }
}