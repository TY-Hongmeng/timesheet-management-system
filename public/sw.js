// 移动端优化的 Service Worker - 增强缓存管理和网络容错
const CACHE_NAME = 'timesheet-v1.5.0'
const STATIC_CACHE = 'static-v1.5.0'
const DYNAMIC_CACHE = 'dynamic-v1.5.0'
const OFFLINE_CACHE = 'offline-v1.5.0'

// 移动端检测和网络状态
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
const isSlowConnection = () => {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  return connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')
}

// 移动端关键资源 - 优先缓存
const CRITICAL_ASSETS = [
  '/timesheet-management-system/',
  '/timesheet-management-system/index.html',
  '/timesheet-management-system/manifest.json',
  '/timesheet-management-system/favicon.svg'
]

// 移动端静态资源 - 长期缓存
const STATIC_ASSETS = [
  '/timesheet-management-system/assets/',
  '/timesheet-management-system/src/'
]

// 需要网络优先的资源 - 避免缓存冲突
const NETWORK_FIRST = [
  '/api/',
  'supabase.co',
  '/timesheet-management-system/assets/js/',
  '/timesheet-management-system/assets/css/'
]

// 移动端网络超时配置 - 根据设备和网络调整
const NETWORK_TIMEOUT = isMobile ? (isSlowConnection() ? 15000 : 8000) : 5000
const CACHE_TIMEOUT = isMobile ? 3000 : 2000
const RETRY_ATTEMPTS = isMobile ? 3 : 2

// 清理旧缓存
const clearOldCaches = async () => {
  const cacheNames = await caches.keys()
  const oldCaches = cacheNames.filter(name => 
    name !== CACHE_NAME && 
    name !== STATIC_CACHE && 
    name !== DYNAMIC_CACHE
  )
  
  return Promise.all(
    oldCaches.map(name => {
      console.log('Deleting old cache:', name)
      return caches.delete(name)
    })
  )
}

self.addEventListener('install', event => {
  console.log('Service Worker installing...')
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE)
        .then(cache => {
          console.log('Caching static assets')
          return cache.addAll(STATIC_ASSETS)
        }),
      clearOldCaches()
    ]).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  console.log('Service Worker activating...')
  event.waitUntil(
    Promise.all([
      clearOldCaches(),
      self.clients.claim()
    ])
  )
})

// 移动端优化的网络优先策略 - 增强重试和容错
const networkFirst = async (request) => {
  let lastError = null
  
  // 移动端多次重试机制
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      console.log(`Network attempt ${attempt}/${RETRY_ATTEMPTS} for:`, request.url)
      
      const networkResponse = await Promise.race([
        fetch(request.clone(), {
          mode: 'cors',
          credentials: 'same-origin',
          cache: 'no-cache'
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), NETWORK_TIMEOUT)
        )
      ])
      
      if (networkResponse.ok) {
        // 成功响应，缓存并返回
        const cache = await caches.open(DYNAMIC_CACHE)
        cache.put(request.clone(), networkResponse.clone())
        console.log('Network success, cached response for:', request.url)
        return networkResponse
      } else {
        lastError = new Error(`HTTP ${networkResponse.status}`)
        console.log(`Network response not ok (${networkResponse.status}), attempt ${attempt}`)
      }
    } catch (error) {
      lastError = error
      console.log(`Network attempt ${attempt} failed:`, error.message)
      
      // 移动端在重试前等待
      if (attempt < RETRY_ATTEMPTS && isMobile) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }
  }
  
  console.log('All network attempts failed, trying cache for:', request.url)
  
  // 所有网络尝试失败，尝试缓存
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    console.log('Cache hit for:', request.url)
    return cachedResponse
  }
  
  // 移动端特殊处理 - 返回离线页面或友好错误
  if (isMobile && request.mode === 'navigate') {
    const offlineResponse = await caches.match('/timesheet-management-system/404.html')
    if (offlineResponse) {
      return offlineResponse
    }
  }
  
  console.log('No cache available, returning error for:', request.url)
  return new Response(
    JSON.stringify({
      error: 'Network unavailable',
      message: '网络连接失败，请检查网络后重试',
      timestamp: new Date().toISOString()
    }),
    { 
      status: 408,
      statusText: 'Request Timeout',
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    }
  )
}

// 缓存优先策略 - 移动端优化
const cacheFirst = async (request) => {
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.log('Cache and network failed:', error)
    throw error
  }
}

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)
  
  // 跳过非 HTTP 请求
  if (!request.url.startsWith('http')) {
    return
  }
  
  // 跳过 Chrome 扩展请求
  if (url.protocol === 'chrome-extension:') {
    return
  }
  
  // API 请求使用网络优先
  if (NETWORK_FIRST.some(pattern => request.url.includes(pattern))) {
    event.respondWith(networkFirst(request))
    return
  }
  
  // 静态资源使用缓存优先
  if (request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'image') {
    event.respondWith(cacheFirst(request))
    return
  }
  
  // HTML 页面使用网络优先
  if (request.destination === 'document') {
    event.respondWith(networkFirst(request))
    return
  }
  
  // 其他请求直接通过网络
  event.respondWith(fetch(request))
})

// 移动端内存管理
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE) {
              console.log('Clearing cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
    )
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// 错误处理
self.addEventListener('error', event => {
  console.error('Service Worker error:', event.error)
})

self.addEventListener('unhandledrejection', event => {
  console.error('Service Worker unhandled rejection:', event.reason)
})