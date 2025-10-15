// Service Worker for mobile optimization
const CACHE_NAME = 'timesheet-v1.2.0'
const STATIC_CACHE = 'static-v1.2.0'
const DYNAMIC_CACHE = 'dynamic-v1.2.0'

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/timesheet-management-system/',
  '/timesheet-management-system/index.html',
  '/timesheet-management-system/manifest.json'
]

// 需要网络优先的资源
const NETWORK_FIRST = [
  '/api/',
  '/timesheet-management-system/js/excel-'
]

// 缓存优先的资源
const CACHE_FIRST = [
  '/timesheet-management-system/js/react-',
  '/timesheet-management-system/js/vendor-',
  '/timesheet-management-system/css/',
  '/timesheet-management-system/images/'
]

self.addEventListener('install', event => {
  console.log('Service Worker installing...')
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  console.log('Service Worker activating...')
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName)
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

// 网络优先策略
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request)
    
    // 只缓存成功的响应
    if (networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('Network failed, trying cache:', request.url)
    const cachedResponse = await caches.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    // 如果是导航请求，返回离线页面
    if (request.mode === 'navigate') {
      return caches.match('/timesheet-management-system/index.html')
    }
    
    throw error
  }
}

// 缓存优先策略
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    // 后台更新缓存
    fetch(request).then(response => {
      if (response.status === 200) {
        const cache = caches.open(DYNAMIC_CACHE)
        cache.then(c => c.put(request, response))
      }
    }).catch(() => {
      // 静默失败
    })
    
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('Cache and network both failed for:', request.url)
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