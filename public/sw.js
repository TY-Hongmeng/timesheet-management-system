// Service Worker for enhanced caching strategy
const CACHE_VERSION = 'v2';
const STATIC_CACHE_NAME = `timesheet-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `timesheet-dynamic-${CACHE_VERSION}`;
const OFFLINE_CACHE_NAME = `timesheet-offline-${CACHE_VERSION}`;

// 关键静态资源缓存列表（优先级最高）
const CRITICAL_ASSETS = [
  '/timesheet-management-system/',
  '/timesheet-management-system/index.html',
  '/timesheet-management-system/favicon.svg',
  '/timesheet-management-system/manifest.json'
];

// 扩展静态资源缓存列表
const STATIC_ASSETS = [
  ...CRITICAL_ASSETS,
  // 可以在这里添加其他静态资源
];

// 离线页面内容
const OFFLINE_PAGE = '/timesheet-management-system/index.html';

// 缓存配置
const CACHE_CONFIG = {
  maxAge: 24 * 60 * 60 * 1000, // 24小时
  maxEntries: 100,
  networkTimeoutSeconds: 10, // 网络超时时间
  retryAttempts: 3,
  retryDelay: 1000
};

// 工具函数：带重试的网络请求
async function fetchWithRetry(request, retries = CACHE_CONFIG.retryAttempts) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CACHE_CONFIG.networkTimeoutSeconds * 1000);
      
      const response = await fetch(request, { 
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return response;
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      console.warn(`Fetch attempt ${i + 1} failed:`, error.message);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, CACHE_CONFIG.retryDelay * (i + 1)));
    }
  }
}

// 工具函数：清理过期缓存
async function cleanupExpiredCache(cacheName) {
  const cache = await caches.open(cacheName);
  const requests = await cache.keys();
  const now = Date.now();
  
  for (const request of requests) {
    const response = await cache.match(request);
    if (response) {
      const cachedTime = response.headers.get('sw-cached-time');
      if (cachedTime && (now - parseInt(cachedTime)) > CACHE_CONFIG.maxAge) {
        await cache.delete(request);
        console.log('Deleted expired cache:', request.url);
      }
    }
  }
}

// 安装事件 - 缓存关键资源
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    Promise.all([
      // 缓存关键静态资源
      caches.open(STATIC_CACHE_NAME).then(async (cache) => {
        console.log('Caching critical assets');
        try {
          // 优先缓存关键资源
          await cache.addAll(CRITICAL_ASSETS);
          console.log('Critical assets cached successfully');
          
          // 尝试缓存其他静态资源（失败不影响安装）
          const otherAssets = STATIC_ASSETS.filter(asset => !CRITICAL_ASSETS.includes(asset));
          if (otherAssets.length > 0) {
            try {
              await cache.addAll(otherAssets);
              console.log('Additional assets cached successfully');
            } catch (error) {
              console.warn('Some additional assets failed to cache:', error);
            }
          }
        } catch (error) {
          console.error('Failed to cache critical assets:', error);
          throw error;
        }
      }),
      
      // 预创建其他缓存
      caches.open(DYNAMIC_CACHE_NAME),
      caches.open(OFFLINE_CACHE_NAME)
    ]).then(() => {
      console.log('Service Worker installation completed');
      return self.skipWaiting();
    })
  );
});

// 激活事件 - 清理旧缓存和过期内容
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    Promise.all([
      // 清理旧版本缓存
      caches.keys().then((cacheNames) => {
        const validCacheNames = [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME, OFFLINE_CACHE_NAME];
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!validCacheNames.includes(cacheName)) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // 清理过期的动态缓存
      cleanupExpiredCache(DYNAMIC_CACHE_NAME),
      
      // 限制缓存条目数量
      limitCacheSize(DYNAMIC_CACHE_NAME, CACHE_CONFIG.maxEntries)
    ]).then(() => {
      console.log('Service Worker activation completed');
      return self.clients.claim();
    })
  );
});

// 工具函数：限制缓存大小
async function limitCacheSize(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const requests = await cache.keys();
  
  if (requests.length > maxEntries) {
    const requestsToDelete = requests.slice(0, requests.length - maxEntries);
    await Promise.all(requestsToDelete.map(request => cache.delete(request)));
    console.log(`Deleted ${requestsToDelete.length} old cache entries from ${cacheName}`);
  }
}

// 工具函数：添加缓存时间戳
function addCacheTimestamp(response) {
  const headers = new Headers(response.headers);
  headers.set('sw-cached-time', Date.now().toString());
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  });
}

// 工具函数：检查网络连接质量
function isSlowConnection() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection) {
    return ['slow-2g', '2g'].includes(connection.effectiveType);
  }
  return false;
}

// 拦截请求 - 实现智能缓存策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理同源请求和特定的外部资源
  if (url.origin !== location.origin && !url.hostname.includes('supabase')) {
    return;
  }

  // HTML 文件 - 智能网络优先策略
  if (request.destination === 'document') {
    event.respondWith(
      handleDocumentRequest(request)
    );
    return;
  }

  // 静态资源 - 缓存优先策略（带网络更新）
  if (request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'image' ||
      request.url.includes('/assets/') ||
      request.url.includes('.js') ||
      request.url.includes('.css')) {
    event.respondWith(
      handleStaticAssetRequest(request)
    );
    return;
  }

  // API 请求 - 智能网络优先策略
  if (request.url.includes('/api/') || request.url.includes('supabase')) {
    event.respondWith(
      handleApiRequest(request)
    );
    return;
  }

  // 其他请求 - 默认策略
  event.respondWith(
    handleDefaultRequest(request)
  );
});

// 处理文档请求
async function handleDocumentRequest(request) {
  try {
    // 尝试网络请求（带超时）
    const networkResponse = await fetchWithRetry(request);
    
    // 缓存成功的响应
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const responseToCache = addCacheTimestamp(networkResponse.clone());
    cache.put(request, responseToCache);
    
    return networkResponse;
  } catch (error) {
    console.warn('Network request failed for document:', error.message);
    
    // 网络失败时从缓存获取
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('Serving document from cache');
      return cachedResponse;
    }
    
    // 如果没有缓存，返回离线页面
    const offlineResponse = await caches.match(OFFLINE_PAGE);
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // 最后的备选方案
    return new Response('应用暂时无法访问，请检查网络连接', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

// 处理静态资源请求
async function handleStaticAssetRequest(request) {
  // 首先检查缓存
  const cachedResponse = await caches.match(request);
  
  // 如果是慢速连接且有缓存，直接返回缓存
  if (cachedResponse && isSlowConnection()) {
    console.log('Serving from cache due to slow connection:', request.url);
    return cachedResponse;
  }
  
  // 如果有缓存，先返回缓存，同时在后台更新
  if (cachedResponse) {
    // 后台更新缓存
    fetchWithRetry(request).then(async (response) => {
      if (response && response.ok) {
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        const responseToCache = addCacheTimestamp(response.clone());
        cache.put(request, responseToCache);
      }
    }).catch(() => {
      // 静默失败，不影响用户体验
    });
    
    return cachedResponse;
  }
  
  // 没有缓存时尝试网络请求
  try {
    const networkResponse = await fetchWithRetry(request);
    
    // 缓存成功的响应
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      const responseToCache = addCacheTimestamp(networkResponse.clone());
      cache.put(request, responseToCache);
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('Failed to fetch static asset:', request.url, error.message);
    
    // 返回一个占位符响应或者抛出错误
    if (request.destination === 'image') {
      // 为图片返回一个简单的占位符
      return new Response('', { status: 404 });
    }
    
    throw error;
  }
}

// 处理 API 请求
async function handleApiRequest(request) {
  try {
    // API 请求优先使用网络
    const networkResponse = await fetchWithRetry(request);
    
    // 只缓存成功的 GET 请求
    if (request.method === 'GET' && networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      const responseToCache = addCacheTimestamp(networkResponse.clone());
      cache.put(request, responseToCache);
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('API request failed:', request.url, error.message);
    
    // 网络失败时尝试从缓存获取（仅限 GET 请求）
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        console.log('Serving API response from cache');
        // 添加一个头部标识这是缓存的响应
        const headers = new Headers(cachedResponse.headers);
        headers.set('X-Served-From-Cache', 'true');
        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers: headers
        });
      }
    }
    
    // 返回网络错误响应
    return new Response(JSON.stringify({
      error: '网络连接失败',
      message: '请检查网络连接后重试',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}

// 处理默认请求
async function handleDefaultRequest(request) {
  try {
    return await fetchWithRetry(request);
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// 消息处理
self.addEventListener('message', (event) => {
  const { data } = event;
  
  if (!data) return;
  
  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0]?.postMessage({ type: 'CACHE_STATUS', data: status });
      });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0]?.postMessage({ type: 'CACHE_CLEARED' });
      });
      break;
      
    case 'FORCE_UPDATE':
      forceUpdate().then(() => {
        event.ports[0]?.postMessage({ type: 'UPDATE_COMPLETED' });
      });
      break;
      
    default:
      console.log('Unknown message type:', data.type);
  }
});

// 获取缓存状态
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    status[cacheName] = {
      count: keys.length,
      urls: keys.map(request => request.url)
    };
  }
  
  return status;
}

// 清理所有缓存
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
  console.log('All caches cleared');
}

// 强制更新
async function forceUpdate() {
  // 清理动态缓存
  await caches.delete(DYNAMIC_CACHE_NAME);
  
  // 重新缓存关键资源
  const cache = await caches.open(STATIC_CACHE_NAME);
  await cache.addAll(CRITICAL_ASSETS);
  
  console.log('Force update completed');
}

// 定期清理过期缓存
setInterval(() => {
  cleanupExpiredCache(DYNAMIC_CACHE_NAME).catch(console.error);
}, 60 * 60 * 1000); // 每小时清理一次