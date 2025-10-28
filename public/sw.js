// Service Worker for mobile optimization with enhanced cache management
const CACHE_NAME = 'timesheet-v1.4.0'
const STATIC_CACHE = 'static-v1.4.0'
const DYNAMIC_CACHE = 'dynamic-v1.4.0'

// 移动端检测
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

// 需要缓存的静态资源 - 减少移动端问题
const STATIC_ASSETS = [
  '/timesheet-management-system/',
  '/timesheet-management-system/index.html',
  '/timesheet-management-system/manifest.json'
]

// 需要网络优先的资源 - 避免缓存冲突
const NETWORK_FIRST = [
  '/api/',
  'supabase.co',
  '/timesheet-management-system/assets/js/',
  '/timesheet-management-system/assets/css/'
]

// 移动端网络超时配置
const NETWORK_TIMEOUT = isMobile ? 10000 : 5000
const CACHE_TIMEOUT = 2000

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

// 网络优先策略 - 移动端优化
const networkFirst = async (request) => {
  try {
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), NETWORK_TIMEOUT)
      )
    ])
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
      return networkResponse
    }
  } catch (error) {
    console.log('Network failed, trying cache:', error)
  }
  
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }
  
  throw new Error('No network and no cache')
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