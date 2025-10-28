// Service Worker for mobile optimization with Safari compatibility
const CACHE_NAME = 'timesheet-v1.3.0'
const STATIC_CACHE = 'static-v1.3.0'
const DYNAMIC_CACHE = 'dynamic-v1.3.0'

// 开发环境检测
const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1'

// Safari 兼容性检测
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

// 需要缓存的静态资源 - Safari 优化
const STATIC_ASSETS = [
  '/timesheet-management-system/',
  '/timesheet-management-system/index.html',
  '/timesheet-management-system/manifest.json'
]

// 需要网络优先的资源 - 减少 Safari 缓存冲突
const NETWORK_FIRST = [
  '/api/',
  'supabase.co',
  '/timesheet-management-system/js/excel-'
]

// 缓存优先的资源 - Safari 安全策略
const CACHE_FIRST = [
  '/timesheet-management-system/js/react-',
  '/timesheet-management-system/js/vendor-',
  '/timesheet-management-system/css/',
  '/timesheet-management-system/images/'
]

// Safari 网络超时配置
const NETWORK_TIMEOUT = isSafari ? 8000 : 5000
const CACHE_TIMEOUT = 3000

self.addEventListener('install', event => {
  if (isDev) {
    console.log('Service Worker installing...')
  }
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        if (isDev) {
          console.log('Caching static assets')
        }
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  if (isDev) {
    console.log('Service Worker activating...')
  }
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              if (isDev) {
                console.log('Deleting old cache:', cacheName)
              }
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // 跳过非 GET 请求
  if (request.method !== 'GET') {
    return
  }

  // 跳过 chrome-extension 和其他协议
  if (!url.protocol.startsWith('http')) {
    return
  }

  // API 请求 - 网络优先
  if (NETWORK_FIRST.some(pattern => request.url.includes(pattern))) {
    event.respondWith(networkFirst(request))
    return
  }

  // 静态资源 - 缓存优先
  if (CACHE_FIRST.some(pattern => request.url.includes(pattern))) {
    event.respondWith(cacheFirst(request))
    return
  }

  // 其他请求 - 网络优先，缓存备用
  event.respondWith(networkFirst(request))
})

// 网络优先策略 - Safari 优化版本
async function networkFirst(request) {
  try {
    // Safari 网络请求超时处理
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT)
    
    const networkResponse = await fetch(request, {
      signal: controller.signal,
      credentials: 'same-origin', // Safari 安全策略
      mode: 'cors',
      cache: isSafari ? 'no-cache' : 'default' // Safari 缓存策略
    })
    
    clearTimeout(timeoutId)
    
    // 只缓存成功的响应
    if (networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE)
      // Safari 异步缓存，避免阻塞
      cache.put(request, networkResponse.clone()).catch(err => {
        if (isDev) {
          console.warn('Cache put failed:', err)
        }
      })
    }
    
    return networkResponse
  } catch (error) {
    if (isDev) {
      console.log('Network failed, trying cache:', request.url, error.message)
      
      // Safari 特殊错误处理
      if (error.name === 'AbortError') {
        console.log('Request timeout, falling back to cache')
      }
    }
    
    const cachedResponse = await caches.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    // 如果是导航请求，返回离线页面
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/timesheet-management-system/index.html')
      if (offlinePage) {
        return offlinePage
      }
    }
    
    // Safari 友好的错误响应
    if (isSafari && request.destination === 'document') {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>网络连接问题</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 50px; }
            .error { color: #ff3b30; margin: 20px 0; }
            .retry { background: #007aff; color: white; border: none; padding: 10px 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>网络连接问题</h1>
          <p class="error">无法连接到服务器，请检查网络连接</p>
          <button class="retry" onclick="location.reload()">重试</button>
        </body>
        </html>
      `, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }
    
    throw error
  }
}

// 缓存优先策略 - Safari 优化版本
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    // Safari 后台更新缓存 - 非阻塞
    if (!isSafari || Math.random() > 0.7) { // Safari 降低后台更新频率
      fetch(request, {
        credentials: 'same-origin',
        mode: 'cors',
        cache: 'no-cache'
      }).then(response => {
        if (response.status === 200) {
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, response).catch(err => {
          if (isDev) {
            console.warn('Background cache update failed:', err)
          }
        })
          })
        }
      }).catch(() => {
        // 静默失败
      })
    }
    
    return cachedResponse
  }
  
  try {
    // Safari 网络请求优化
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT)
    
    const networkResponse = await fetch(request, {
      signal: controller.signal,
      credentials: 'same-origin',
      mode: 'cors',
      cache: isSafari ? 'no-cache' : 'default'
    })
    
    clearTimeout(timeoutId)
    
    if (networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone()).catch(err => {
        console.warn('Cache put failed:', err)
      })
    }
    
    return networkResponse
  } catch (error) {
    if (isDev) {
      console.log('Cache and network both failed for:', request.url, error.message)
    }
    
    // Safari 特殊处理 - 返回基础响应而不是抛出错误
    if (isSafari && (request.destination === 'script' || request.destination === 'style')) {
      return new Response('', {
        status: 200,
        headers: {
          'Content-Type': request.destination === 'script' ? 'application/javascript' : 'text/css'
        }
      })
    }
    
    throw error
  }
}

// 清理旧缓存
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      )
    }).then(() => {
      event.ports[0].postMessage({ success: true })
    })
  }
})