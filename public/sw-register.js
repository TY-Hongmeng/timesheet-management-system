// Service Worker 强制重置脚本 - v1.4.1
console.log('SW: 开始彻底重置 Service Worker...');

// 1. 首先注销所有现有的 Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    console.log('SW: 找到', registrations.length, '个已注册的 Service Worker');
    
    // 注销所有现有的 Service Worker
    const unregisterPromises = registrations.map(registration => {
      console.log('SW: 注销 Service Worker:', registration.scope);
      return registration.unregister();
    });
    
    return Promise.all(unregisterPromises);
  }).then(() => {
    console.log('SW: 所有旧的 Service Worker 已注销');
    
    // 2. 清除所有缓存
    return caches.keys();
  }).then(cacheNames => {
    console.log('SW: 找到', cacheNames.length, '个缓存');
    
    const deletePromises = cacheNames.map(cacheName => {
      console.log('SW: 删除缓存:', cacheName);
      return caches.delete(cacheName);
    });
    
    return Promise.all(deletePromises);
  }).then(() => {
    console.log('SW: 所有缓存已清除');
    
    // 3. 等待一下，然后重新注册
    return new Promise(resolve => setTimeout(resolve, 2000));
  }).then(() => {
    console.log('SW: 开始重新注册 Service Worker v1.4.1...');
    
    // 4. 重新注册新的 Service Worker
    return navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none' // 强制不使用缓存
    });
  }).then(registration => {
    console.log('SW: Service Worker v1.4.1 注册成功');
    
    // 5. 强制立即激活
    if (registration.waiting) {
      console.log('SW: 发现等待中的 Service Worker，强制激活...');
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    
    // 6. 监听更新事件
    registration.addEventListener('updatefound', () => {
      console.log('SW: 检测到 Service Worker 更新');
      const newWorker = registration.installing;
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'activated') {
          console.log('SW: 新版本已激活，刷新页面...');
          window.location.reload();
        }
      });
    });
    
    // 7. 监听控制器变化
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('SW: Service Worker 控制器已更改，刷新页面...');
      window.location.reload();
    });
    
  }).catch(error => {
    console.error('SW: Service Worker 重置失败:', error);
  });
}

// 全局函数：手动清除所有缓存
window.clearServiceWorkerCaches = function() {
  console.log('SW: 手动清除所有缓存...');
  
  return caches.keys().then(cacheNames => {
    const deletePromises = cacheNames.map(cacheName => {
      console.log('SW: 删除缓存:', cacheName);
      return caches.delete(cacheName);
    });
    
    return Promise.all(deletePromises);
  }).then(() => {
    console.log('SW: 所有缓存已手动清除');
    
    // 通知 Service Worker 清除缓存
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_ALL_CACHES'
      });
    }
    
    // 刷新页面
    window.location.reload();
  }).catch(error => {
    console.error('SW: 手动清除缓存失败:', error);
  });
};

// 全局函数：获取 Service Worker 状态
window.getServiceWorkerStatus = function() {
  if (!('serviceWorker' in navigator)) {
    return Promise.resolve({ supported: false });
  }
  
  return navigator.serviceWorker.getRegistrations().then(registrations => {
    return caches.keys().then(cacheNames => {
      return {
        supported: true,
        registrations: registrations.length,
        caches: cacheNames.length,
        controller: !!navigator.serviceWorker.controller,
        ready: navigator.serviceWorker.ready
      };
    });
  });
};

console.log('SW: Service Worker 重置脚本加载完成 - v1.4.1');