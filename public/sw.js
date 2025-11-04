// Enhanced Service Worker for ERR_CONNECTION_RESET handling
// Service Worker 增强版 - 智能缓存策略 (强制更新版本)
const CACHE_NAME = 'timesheet-v1.4.4'
const STATIC_CACHE = 'timesheet-static-v1.4.4'
const DYNAMIC_CACHE = 'timesheet-dynamic-v1.4.4'
const OFFLINE_CACHE = 'timesheet-offline-v1.4.4'
const FIVEG_CACHE = 'timesheet-5g-v1.4.4'

// 统一的 BASE_PATH 检测（GitHub Pages 子路径适配）
const BASE_PATH = self.location.pathname.includes('/timesheet-management-system') ? '/timesheet-management-system' : ''

// 关键资源 - 必须缓存
const CRITICAL_RESOURCES = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/error-handler.html`
]

// 静态资源 - 长期缓存
const STATIC_RESOURCES = [
  `${BASE_PATH}/favicon.svg`,
  `${BASE_PATH}/assets/`,
  `${BASE_PATH}/src/main.tsx`,
  `${BASE_PATH}/src/App.tsx`,
  `${BASE_PATH}/src/index.css`
]

// 动态资源 - 网络优先
const DYNAMIC_RESOURCES = [
  `${BASE_PATH}/api/`,
  `${BASE_PATH}/auth/`,
  `${BASE_PATH}/data/`
]


// 需要缓存的核心资源
const CORE_ASSETS = [
    `${BASE_PATH}/`,
    `${BASE_PATH}/index.html`,
    `${BASE_PATH}/error-handler.html`,
    `${BASE_PATH}/mobile-performance-test.html`,
    `${BASE_PATH}/manifest.json`,
    `${BASE_PATH}/src/main.tsx`,
    `${BASE_PATH}/src/App.tsx`,
    `${BASE_PATH}/src/components/`,
    `${BASE_PATH}/src/utils/`,
    `${BASE_PATH}/src/styles/`
]

// 网络优先策略的资源
const NETWORK_FIRST_PATTERNS = [
    /\/api\//,
    /\.json$/,
    /\/src\/.*\.(ts|tsx|js|jsx)$/
]

// 缓存优先策略的资源
const CACHE_FIRST_PATTERNS = [
    /\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/,
    /\/assets\//,
    /\/static\//
]

// 安装事件 - 预缓存关键资源
self.addEventListener('install', event => {
  console.log('SW: Installing enhanced version...');
  
  event.waitUntil(
    Promise.all([
      // 缓存关键资源
      caches.open(STATIC_CACHE).then(cache => {
        console.log('SW: Caching critical resources');
        return cache.addAll(CRITICAL_RESOURCES);
      }),
      // 预缓存离线页面
      caches.open(OFFLINE_CACHE).then(cache => {
        console.log('SW: Caching offline resources');
        return cache.add(`${BASE_PATH}/error-handler.html`);
      })
    ])
    .then(() => {
      console.log('SW: Enhanced installation complete');
      return self.skipWaiting();
    })
    .catch(error => {
      console.error('SW: Installation failed:', error);
    })
  );
});

// 激活事件 - 强制清理所有旧缓存
self.addEventListener('activate', event => {
  console.log('SW: 强制激活新版本 v1.4.4...');
  
  event.waitUntil(
    Promise.all([
      // 1. 删除所有旧缓存（包括当前版本的缓存）
      caches.keys().then(cacheNames => {
        console.log('SW: 发现缓存:', cacheNames);
        return Promise.all(
          cacheNames.map(cacheName => {
            // 删除所有旧版本缓存
            if (!cacheName.includes('v1.4.4')) {
              console.log('SW: 删除旧缓存:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // 2. 立即接管所有客户端
      self.clients.claim(),
      
      // 3. 通知所有客户端刷新
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: 'v1.4.4',
            message: 'Service Worker 已更新，请刷新页面'
          });
        });
      })
    ])
    .then(() => {
      console.log('SW: v1.4.4 激活完成，所有旧缓存已清除');
    })
    .catch(error => {
      console.error('SW: 激活失败:', error);
    })
  );
});

// Fetch 事件 - 增强的智能缓存策略
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 只处理同源请求和关键的跨域资源
  if (url.origin !== self.location.origin && !isAllowedCrossOrigin(url)) {
    return;
  }

  console.log('SW: Handling enhanced fetch for:', url.pathname);

  // 检测5G网络并使用优化策略
  const connection = (typeof self !== 'undefined' && self.navigator && self.navigator.connection) ? self.navigator.connection : null;
  const is5GNetwork = connection && (connection.effectiveType === '4g' && connection.downlink && connection.downlink > 20);

  // 5G网络下使用专门的优化策略
  if (is5GNetwork) {
    event.respondWith(fiveGNetworkStrategy(request));
    return;
  }

  // 根据资源类型选择缓存策略
  if (isCriticalResource(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request));
  } else if (isStaticResource(url.pathname)) {
    event.respondWith(staleWhileRevalidateStrategy(request));
  } else if (isDynamicResource(url.pathname)) {
    event.respondWith(networkFirstStrategy(request));
  } else {
    event.respondWith(networkWithFallbackStrategy(request));
  }
});

// 处理导航请求（页面请求）
async function handleNavigationRequest(request) {
    try {
        // 尝试网络请求
        const networkResponse = await fetchWithRetry(request, 2);
        
        // 只缓存 GET 请求的成功响应
        if (networkResponse && networkResponse.ok && isCacheableRequest(request)) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
        
    } catch (error) {
        console.log('[SW] Navigation request failed:', error.message);
        
        // 只有 GET 请求才尝试从缓存获取
        if (isCacheableRequest(request)) {
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
                return cachedResponse;
            }
        }
        
        // 缓存也没有，返回错误页面
        return handleNetworkError(error, request);
    }
}

// 网络优先策略 - 增强版
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetchWithRetry(request, 2);
    
    // 只缓存 GET 请求的成功响应
    if (networkResponse && networkResponse.ok && isCacheableRequest(request)) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, networkResponse.clone());
      console.log('SW: Cached dynamic response for:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('SW: Network failed, trying cache for:', request.url);
    
    // 只有 GET 请求才尝试从缓存获取
    if (isCacheableRequest(request)) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        console.log('SW: Serving stale content for:', request.url);
        return cachedResponse;
      }
    }
    
    return await getOfflineResponse(request);
  }
}

// 网络回退策略
async function networkWithFallbackStrategy(request) {
  try {
    return await fetchWithRetry(request, 1);
  } catch (error) {
    console.log('SW: Network failed, checking cache for:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return await getOfflineResponse(request);
  }
}

// 缓存优先策略 - 增强版
async function cacheFirstStrategy(request) {
  try {
    // 只有 GET 请求才检查缓存
    if (isCacheableRequest(request)) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        console.log('SW: Cache hit for:', request.url);
        
        // 检查缓存是否过期（对于关键资源）
        const cacheDate = cachedResponse.headers.get('date');
        if (cacheDate) {
          const age = Date.now() - new Date(cacheDate).getTime();
          const maxAge = 24 * 60 * 60 * 1000; // 24小时
          
          if (age > maxAge) {
            console.log('SW: Cache expired, updating in background');
            // 后台更新缓存
            updateCacheInBackground(request);
          }
        }
        
        return cachedResponse;
      }
    }
    
    console.log('SW: Cache miss, fetching:', request.url);
    const networkResponse = await fetchWithRetry(request, 3);
    
    // 只缓存 GET 请求的成功响应
    if (networkResponse && networkResponse.ok && isCacheableRequest(request)) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, networkResponse.clone());
      console.log('SW: Cached new response for:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('SW: Cache-first strategy failed:', error);
    return await getOfflineResponse(request);
  }
}

// 过期重新验证策略
async function staleWhileRevalidateStrategy(request) {
    // 只有 GET 请求才使用缓存策略
    if (!isCacheableRequest(request)) {
        // 非 GET 请求直接返回网络响应
        return fetchWithRetry(request, 1);
    }
    
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    // 后台更新（只对 GET 请求）
    const networkResponsePromise = fetchWithRetry(request, 1)
        .then(networkResponse => {
            if (networkResponse.ok && isCacheableRequest(request)) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch(() => {
            // 网络失败，静默处理
            return null;
        });
    
    // 如果有缓存，立即返回缓存版本
    if (cachedResponse) {
        return cachedResponse;
    }
    
    // 没有缓存，等待网络响应
    return networkResponsePromise;
}

// 带重试的 fetch 函数
async function fetchWithRetry(request, retries = 2) {
    for (let i = 0; i <= retries; i++) {
        try {
            // 创建新的请求配置，添加连接重置处理
            const fetchOptions = {
                method: request.method,
                headers: new Headers(request.headers),
                mode: request.mode,
                credentials: request.credentials,
                cache: 'no-cache',
                redirect: 'follow'
            };
            
            // 避免使用被禁止的请求头，仅设置允许的头部
            fetchOptions.headers.set('Cache-Control', 'no-cache');
            
            // 设置超时
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            fetchOptions.signal = controller.signal;
            
            const response = await fetch(request.url, fetchOptions);
            clearTimeout(timeoutId);
            
            if (!response.ok && response.status >= 500) {
                throw new Error(`Server error: ${response.status}`);
            }
            
            return response;
            
        } catch (error) {
            console.log(`[SW] Fetch attempt ${i + 1} failed:`, error.message);
            
            if (i === retries) {
                throw error;
            }
            
            // 指数退避重试
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
    }
}

// 处理网络错误
async function handleNetworkError(error, request) {
    const url = new URL(request.url);
    
    // 构建错误页面 URL
    const errorUrl = new URL(`${BASE_PATH}/error-handler.html`, self.location.origin);
    errorUrl.searchParams.set('error', getErrorType(error));
    errorUrl.searchParams.set('message', error.message);
    errorUrl.searchParams.set('url', url.pathname);
    
    try {
        // 尝试获取错误页面
        const errorResponse = await caches.match(`${BASE_PATH}/error-handler.html`);
        if (errorResponse) {
            return errorResponse;
        }
        
        // 如果错误页面也没有缓存，返回基本的错误响应
        return new Response(
            createBasicErrorPage(error, url.pathname),
            {
                status: 503,
                statusText: 'Service Unavailable',
                headers: {
                    'Content-Type': 'text/html; charset=utf-8'
                }
            }
        );
        
    } catch (e) {
        // 最后的备用方案
        return new Response('网络连接错误，请检查网络设置后重试。', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: {
                'Content-Type': 'text/plain; charset=utf-8'
            }
        });
    }
}

// 获取错误类型
function getErrorType(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('connection_reset') || message.includes('err_connection_reset')) {
        return 'ERR_CONNECTION_RESET';
    } else if (message.includes('timeout') || message.includes('aborted')) {
        return 'ERR_TIMEOUT';
    } else if (message.includes('dns') || message.includes('name_not_resolved')) {
        return 'ERR_NAME_NOT_RESOLVED';
    } else if (message.includes('cors')) {
        return 'ERR_CORS';
    } else if (message.includes('ssl') || message.includes('certificate')) {
        return 'ERR_SSL_PROTOCOL_ERROR';
    } else {
        return 'ERR_NETWORK_FAILED';
    }
}

// 创建基本错误页面
function createBasicErrorPage(error, path) {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>网络连接错误</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: 20px;
        }
        .error-container {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        .error-icon { font-size: 60px; margin-bottom: 20px; }
        .error-title { font-size: 24px; color: #333; margin-bottom: 15px; }
        .error-message { color: #666; margin-bottom: 30px; line-height: 1.5; }
        .retry-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 10px;
            font-size: 16px;
            cursor: pointer;
            margin: 10px;
        }
        .retry-btn:hover { background: #0056b3; }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-icon">🚫</div>
        <h1 class="error-title">网络连接错误</h1>
        <p class="error-message">
            无法连接到服务器 (${getErrorType(error)})<br>
            请求路径: ${path}<br>
            错误详情: ${error.message}
        </p>
        <button class="retry-btn" onclick="window.location.reload()">重试</button>
        <button class="retry-btn" onclick="window.history.back()">返回</button>
    </div>
</body>
</html>
    `;
}

// 资源类型检测函数
function isCriticalResource(pathname) {
  return CRITICAL_RESOURCES.some(resource => 
    pathname === resource || pathname.endsWith(resource)
  );
}

function isStaticResource(pathname) {
  return STATIC_RESOURCES.some(resource => 
    pathname.includes(resource)
  ) || /\.(js|css|png|jpg|jpeg|svg|woff|woff2|ico)$/.test(pathname);
}

function isDynamicResource(pathname) {
  return DYNAMIC_RESOURCES.some(resource => 
    pathname.includes(resource)
  );
}

function isAllowedCrossOrigin(url) {
  // 允许的跨域资源
  const allowedDomains = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdn.jsdelivr.net',
    'unpkg.com'
  ];
  return allowedDomains.some(domain => url.hostname.includes(domain));
}

// 检查请求是否可缓存（只有 GET 请求可以缓存）
function isCacheableRequest(request) {
  return request.method === 'GET';
}

// 判断是否使用网络优先策略
function shouldUseNetworkFirst(url) {
    return NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname));
}

// 判断是否使用缓存优先策略
function shouldUseCacheFirst(url) {
    return CACHE_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname));
}

// 消息处理
self.removeEventListener && self.removeEventListener('message', () => {})
// 合并消息处理为一个监听器，处理所有消息类型
self.addEventListener('message', event => {
  const data = event.data || {}
  if (!data || !data.type) return

  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
    case 'SET_CACHE_STRATEGY':
      cacheStrategy = data.strategy
      console.log('SW: Cache strategy updated to:', data.strategy)
      if (data.strategy === '5G_OPTIMIZED') {
        apply5GOptimizations()
      }
      break
    case 'CLEAR_ALL_CACHES':
      clearAllCaches().then(() => {
        event.ports[0]?.postMessage({ success: true, message: '所有缓存已清除' })
      }).catch(error => {
        event.ports[0]?.postMessage({ success: false, error: error.message })
      })
      break
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0]?.postMessage({ success: true, data: status })
      })
      break
    default:
      console.log('[SW] 未知消息类型:', data.type)
  }
})

// 清除所有缓存的函数
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    console.log('[SW] 准备清除缓存:', cacheNames);
    
    await Promise.all(
      cacheNames.map(cacheName => {
        console.log('[SW] 删除缓存:', cacheName);
        return caches.delete(cacheName);
      })
    );
    
    console.log('[SW] 所有缓存已清除');
    return true;
  } catch (error) {
    console.error('[SW] 清除缓存失败:', error);
    throw error;
  }
}

// 获取缓存状态
async function getCacheStatus() {
  try {
    const cacheNames = await caches.keys();
    const status = {
      version: 'v1.4.4',
      caches: cacheNames,
      totalCaches: cacheNames.length,
      timestamp: new Date().toISOString()
    };
    
    return status;
  } catch (error) {
    console.error('[SW] 获取缓存状态失败:', error);
    return { error: error.message };
  }
}

console.log('[SW] Service Worker loaded successfully - v1.4.4 (彻底重置版)');
// 合并后的消息处理在此之上
// 补充缺失的辅助函数与事件监听器

// 后台同步（如果支持）
if ('sync' in self.registration) {
  self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
      event.waitUntil(doBackgroundSync())
    }
  })
}

// 后台同步处理
async function doBackgroundSync() {
  try {
    console.log('[SW] Background sync triggered')
    // TODO: 在此处理离线数据的回传
  } catch (error) {
    console.error('[SW] Background sync failed:', error)
  }
}

// 获取离线响应
async function getOfflineResponse(request) {
  // 如果是导航请求，返回离线页面
  if (request.mode === 'navigate' || request.destination === 'document') {
    const offlineResponse = await caches.match(`${BASE_PATH}/error-handler.html`)
    if (offlineResponse) {
      return offlineResponse
    }
  }

  // 尝试从任何缓存中获取
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    console.log('SW: Serving cached fallback for:', request.url)
    return cachedResponse
  }

  // 返回通用离线响应
  return new Response(
    JSON.stringify({
      error: 'Offline',
      message: 'This content is not available offline',
      timestamp: new Date().toISOString()
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

// 后台更新缓存
async function updateCacheInBackground(request) {
  try {
    // 只更新 GET 请求的缓存
    if (!isCacheableRequest(request)) return

    const networkResponse = await fetch(request)
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE)
      await cache.put(request, networkResponse)
      console.log('SW: Background cache update completed for:', request.url)
    }
  } catch (error) {
    console.warn('SW: Background cache update failed:', error)
  }
}

// 应用5G网络优化
async function apply5GOptimizations() {
  console.log('SW: Applying 5G network optimizations...')
  try {
    const cache = await caches.open(FIVEG_CACHE)
    const additionalResources = [
      '/src/utils/fiveGNetworkHandler.ts',
      '/src/utils/enhancedDNSResolver.ts',
      '/5g-compatibility-test.html'
    ]
    await cache.addAll(additionalResources)
    console.log('SW: 5G resources pre-cached')
  } catch (error) {
    console.error('SW: 5G optimization failed:', error)
  }
}

// 5G网络专用的fetch策略
async function fiveGNetworkStrategy(request) {
  const url = new URL(request.url)
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    const networkResponse = await fetch(request, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (networkResponse && networkResponse.ok && isCacheableRequest(request)) {
      const cache = await caches.open(FIVEG_CACHE)
      await cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.warn('SW: 5G network request failed, falling back to cache:', error)
    if (isCacheableRequest(request)) {
      const cachedResponse = await caches.match(request)
      if (cachedResponse) return cachedResponse
    }
    if (request.destination === 'document') {
      return caches.match(`${BASE_PATH}/error-handler.html`)
    }
    throw error
  }
}