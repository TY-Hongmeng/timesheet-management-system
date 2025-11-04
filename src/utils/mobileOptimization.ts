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
  const scripts = Array.from(document.querySelectorAll('script[src]')) as HTMLScriptElement[]
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[]
  
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

// 移动端预加载策略 - 增强版
export const mobilePreloadStrategy = {
  // 关键资源立即预加载 - 智能优先级
  critical: () => {
    if (!isMobileDevice()) return
    
    const assets = getCurrentAssets()
    const networkStatus = mobileNetworkManager.checkNetworkStatus()
    const isSlowNetwork = ['slow-2g', '2g', '3g'].includes(networkStatus.effectiveType)
    
    // 根据网络状况调整预加载策略
    const preloadPriority = isSlowNetwork ? ['mainCSS'] : ['mainCSS', 'vendor', 'react']
    
    preloadPriority.forEach(assetType => {
      const assetUrl = assets[assetType as keyof typeof assets]
      if (assetUrl) {
        const link = document.createElement('link')
        link.rel = 'preload'
        link.as = assetType === 'mainCSS' ? 'style' : 'script'
        link.href = assetUrl
        
        // 添加错误处理和重试
        link.onerror = () => {
          console.warn(`❌ 预加载失败: ${assetType}`)
          // 使用网络重试机制
          mobileNetworkManager.retryWithBackoff(async () => {
            const retryLink = document.createElement('link')
            retryLink.rel = 'preload'
            retryLink.as = link.as
            retryLink.href = link.href
            document.head.appendChild(retryLink)
            return retryLink
          }, `预加载${assetType}`)
        }
        
        document.head.appendChild(link)
      }
    })
    
    console.log(`🚀 移动端关键资源预加载完成 (网络: ${networkStatus.effectiveType})`)
  },

  // 延迟预加载非关键资源 - 智能调度
  deferred: () => {
    if (!isMobileDevice()) return
    
    const networkStatus = mobileNetworkManager.checkNetworkStatus()
    const isSlowNetwork = ['slow-2g', '2g', '3g'].includes(networkStatus.effectiveType)
    
    // 根据网络状况调整延迟时间
    const delayTime = isSlowNetwork ? 5000 : 2000
    
    setTimeout(() => {
      if (!navigator.onLine) return // 检查网络状态
      
      // 预加载图标字体
      const iconFont = document.createElement('link')
      iconFont.rel = 'preload'
      iconFont.as = 'font'
      iconFont.type = 'font/woff2'
      iconFont.crossOrigin = 'anonymous'
      iconFont.href = '/timesheet-management-system/fonts/icons.woff2'
      
      iconFont.onerror = () => {
        console.warn('❌ 图标字体预加载失败')
      }
      
      document.head.appendChild(iconFont)
      
      // 预加载常用页面组件
      if (!isSlowNetwork) {
        const commonRoutes = ['Dashboard', 'TimesheetRecord', 'Reports']
        commonRoutes.forEach(route => {
          mobilePreloadStrategy.smartPreload(route)
        })
      }
    }, delayTime)
  },

  // 智能预加载下一个可能访问的页面 - 增强版
  smartPreload: (nextRoute: string) => {
    if (!isMobileDevice()) return
    
    const networkStatus = mobileNetworkManager.checkNetworkStatus()
    const isSlowNetwork = ['slow-2g', '2g', '3g'].includes(networkStatus.effectiveType)
    
    if (isSlowNetwork) {
      console.log(`⏸️ 慢速网络，跳过预加载: ${nextRoute}`)
      return
    }
    
    // 使用 IntersectionObserver 预加载路由组件
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // 使用网络重试机制动态导入
          mobileNetworkManager.retryWithBackoff(async () => {
            return import(/* webpackChunkName: "next-page" */ `@/pages/${nextRoute}`)
          }, `预加载路由${nextRoute}`).then(() => {
            console.log(`✅ 成功预加载路由: ${nextRoute}`)
          }).catch((error) => {
            console.warn(`❌ 预加载路由失败: ${nextRoute}`, error)
          })
          
          observer.disconnect()
        }
      })
    }, { 
      threshold: 0.1,
      rootMargin: '50px' // 提前50px开始预加载
    })
    
    // 使用 Intersection Observer 检测用户意图
    const preloadTrigger = document.createElement('div')
    preloadTrigger.style.position = 'absolute'
    preloadTrigger.style.bottom = '100px'
    preloadTrigger.style.height = '1px'
    preloadTrigger.style.width = '100%'
    document.body.appendChild(preloadTrigger)
    
    observer.observe(preloadTrigger)
  },

  // 微信环境特殊优化
  wechatOptimization: () => {
    const isWechat = /MicroMessenger/i.test(navigator.userAgent)
    if (!isWechat) return
    
    console.log('🔧 检测到微信环境，启用特殊优化')
    
    // 微信内置浏览器特殊处理
    // 1. 禁用某些可能导致问题的预加载
    const metaTag = document.createElement('meta')
    metaTag.name = 'format-detection'
    metaTag.content = 'telephone=no'
    document.head.appendChild(metaTag)
    
    // 2. 优化微信分享
    const shareMetaTitle = document.createElement('meta')
    shareMetaTitle.setAttribute('property', 'og:title')
    shareMetaTitle.content = '工时管理系统'
    document.head.appendChild(shareMetaTitle)
    
    // 3. 微信环境下的性能监控
    window.addEventListener('load', () => {
      setTimeout(() => {
        const loadTime = performance.now()
        console.log(`📊 微信环境加载时间: ${loadTime.toFixed(2)}ms`)
        
        // 如果加载时间过长，触发优化
        if (loadTime > 3000) {
          console.warn('⚠️ 微信环境加载较慢，启用紧急优化')
          mobilePreloadStrategy.emergencyOptimization()
        }
      }, 100)
    })
  },

  // 紧急优化模式
  emergencyOptimization: () => {
    console.log('🚨 启用紧急优化模式')
    
    // 1. 清理不必要的预加载
    document.querySelectorAll('link[rel="preload"]').forEach((link: Element) => {
      const linkElement = link as HTMLLinkElement
      if (!linkElement.href.includes('index-') && !linkElement.href.includes('react')) {
        linkElement.remove()
      }
    })
    
    // 2. 延迟非关键脚本
    document.querySelectorAll('script[src]').forEach((script: Element) => {
      const scriptElement = script as HTMLScriptElement
      if (!scriptElement.src.includes('react') && !scriptElement.src.includes('index-')) {
        scriptElement.defer = true
      }
    })
    
    // 3. 启用激进的图片懒加载
    document.querySelectorAll('img').forEach(img => {
      if (!img.loading) {
        img.loading = 'lazy'
      }
    })
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
    
    // 优先检测微信环境并启用特殊优化
    mobilePreloadStrategy.wechatOptimization()
    
    // 设置网络监控
    mobileNetworkManager.setupNetworkMonitoring()
    
    // 设置全局错误处理
    mobileErrorRecovery.setupGlobalErrorHandling()
    
    // 启动关键资源预加载 - 立即执行
    mobilePreloadStrategy.critical()
    
    // 启用内存优化 - 立即执行
    mobileMemoryOptimization.cleanupUnusedComponents()
    mobileMemoryOptimization.limitConcurrentRequests(2) // 微信环境下降低并发数
    
    // 延迟启动非关键优化 - 根据网络状况调整延迟
    const networkStatus = mobileNetworkManager.checkNetworkStatus()
    const isSlowNetwork = ['slow-2g', '2g', '3g'].includes(networkStatus.effectiveType)
    const delayTime = isSlowNetwork ? 3000 : 1000
    
    setTimeout(() => {
      mobilePreloadStrategy.deferred()
      optimizeImages()
      mobileCacheStrategy.setMobileCacheHeaders()
      mobilePerformanceMonitor.measureFirstContentfulPaint()
      mobilePerformanceMonitor.monitorMemoryUsage()
    }, delayTime)
    
    // 清理过期缓存 - 延迟更长时间
    setTimeout(() => {
      mobileCacheStrategy.cleanExpiredCache()
    }, 8000)
    
    // 监听网络状态变化
    window.addEventListener('mobileNetworkRestored', () => {
      console.log('📶 网络恢复，重置错误计数')
      mobileErrorRecovery.resetErrorCount()
      
      // 网络恢复后立即启动预加载
      mobilePreloadStrategy.critical()
    })
    
    window.addEventListener('mobileNetworkLost', () => {
      console.log('📵 网络断开，显示离线提示')
      // 可以在这里显示离线提示UI
    })
    
    // 页面可见性变化监听 - 优化后台性能
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('📱 页面进入后台，暂停非关键操作')
        // 暂停一些非关键的定时器和请求
      } else {
        console.log('📱 页面回到前台，恢复操作')
        // 恢复操作
        mobilePerformanceMonitor.monitorMemoryUsage()
      }
    })
    
    console.log(`✅ 移动端优化初始化完成 (网络: ${networkStatus.effectiveType})`)
  }
}