// 移动端兼容性 polyfills
// 为老旧移动浏览器提供必要的 polyfill 支持

// Array.from polyfill
if (!Array.from) {
  Array.from = (function () {
    const toStr = Object.prototype.toString;
    const isCallable = function (fn: any) {
      return typeof fn === 'function' || toStr.call(fn) === '[object Function]';
    };
    const toInteger = function (value: any) {
      const number = Number(value);
      if (isNaN(number)) { return 0; }
      if (number === 0 || !isFinite(number)) { return number; }
      return (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
    };
    const maxSafeInteger = Math.pow(2, 53) - 1;
    const toLength = function (value: any) {
      const len = toInteger(value);
      return Math.min(Math.max(len, 0), maxSafeInteger);
    };

    return function from(arrayLike: any, mapFn?: any, thisArg?: any) {
      const C = this;
      const items = Object(arrayLike);
      if (arrayLike == null) {
        throw new TypeError('Array.from requires an array-like object - not null or undefined');
      }
      const mapFunction = mapFn === undefined ? undefined : mapFn;
      if (typeof mapFunction !== 'undefined') {
        if (!isCallable(mapFunction)) {
          throw new TypeError('Array.from: when provided, the second argument must be a function');
        }
        if (arguments.length > 2) {
          thisArg = arguments[2];
        }
      }
      const len = toLength(items.length);
      const A = isCallable(C) ? Object(new C(len)) : new Array(len);
      let k = 0;
      let kValue;
      while (k < len) {
        kValue = items[k];
        if (mapFunction) {
          A[k] = typeof thisArg === 'undefined' ? mapFunction(kValue, k) : mapFunction.call(thisArg, kValue, k);
        } else {
          A[k] = kValue;
        }
        k += 1;
      }
      A.length = len;
      return A;
    };
  }());
}

// Array.includes polyfill
if (!Array.prototype.includes) {
  Array.prototype.includes = function(searchElement: any, fromIndex?: number) {
    'use strict';
    if (this == null) {
      throw new TypeError('Array.prototype.includes called on null or undefined');
    }

    const O = Object(this);
    const len = parseInt(O.length) || 0;
    if (len === 0) {
      return false;
    }
    const n = parseInt(String(fromIndex)) || 0;
    let k;
    if (n >= 0) {
      k = n;
    } else {
      k = len + n;
      if (k < 0) {k = 0;}
    }
    let currentElement;
    while (k < len) {
      currentElement = O[k];
      if (searchElement === currentElement ||
         (searchElement !== searchElement && currentElement !== currentElement)) {
        return true;
      }
      k++;
    }
    return false;
  };
}

// String.includes polyfill
if (!String.prototype.includes) {
  String.prototype.includes = function(search: string, start?: number) {
    'use strict';
    if (typeof start !== 'number') {
      start = 0;
    }
    
    if (start + search.length > this.length) {
      return false;
    } else {
      return this.indexOf(search, start) !== -1;
    }
  };
}

// String.startsWith polyfill
if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(searchString: string, position?: number) {
    position = position || 0;
    return this.substr(position, searchString.length) === searchString;
  };
}

// String.endsWith polyfill
if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(searchString: string, length?: number) {
    if (length === undefined || length > this.length) {
      length = this.length;
    }
    return this.substring(length - searchString.length, length) === searchString;
  };
}

// Object.assign polyfill
if (typeof Object.assign !== 'function') {
  Object.assign = function(target: any) {
    if (target == null) {
      throw new TypeError('Cannot convert undefined or null to object');
    }

    const to = Object(target);
    const sources = Array.prototype.slice.call(arguments, 1);

    for (let index = 0; index < sources.length; index++) {
      const nextSource = sources[index];

      if (nextSource != null) {
        for (const nextKey in nextSource) {
          if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
    }
    return to;
  };
}

// Promise polyfill (简化版)
if (typeof Promise === 'undefined') {
  (window as any).Promise = class Promise {
    private state: 'pending' | 'fulfilled' | 'rejected' = 'pending';
    private value: any;
    private handlers: Array<{
      onFulfilled?: (value: any) => any;
      onRejected?: (reason: any) => any;
      resolve: (value: any) => void;
      reject: (reason: any) => void;
    }> = [];

    constructor(executor: (resolve: (value: any) => void, reject: (reason: any) => void) => void) {
      try {
        executor(this.resolve.bind(this), this.reject.bind(this));
      } catch (error) {
        this.reject(error);
      }
    }

    private resolve(value: any) {
      if (this.state === 'pending') {
        this.state = 'fulfilled';
        this.value = value;
        this.handlers.forEach(handler => this.handle(handler));
        this.handlers = [];
      }
    }

    private reject(reason: any) {
      if (this.state === 'pending') {
        this.state = 'rejected';
        this.value = reason;
        this.handlers.forEach(handler => this.handle(handler));
        this.handlers = [];
      }
    }

    private handle(handler: any) {
      if (this.state === 'pending') {
        this.handlers.push(handler);
      } else {
        if (this.state === 'fulfilled' && typeof handler.onFulfilled === 'function') {
          handler.onFulfilled(this.value);
        }
        if (this.state === 'rejected' && typeof handler.onRejected === 'function') {
          handler.onRejected(this.value);
        }
      }
    }

    then(onFulfilled?: (value: any) => any, onRejected?: (reason: any) => any) {
      return new Promise((resolve, reject) => {
        this.handle({
          onFulfilled: (value: any) => {
            if (typeof onFulfilled === 'function') {
              try {
                resolve(onFulfilled(value));
              } catch (error) {
                reject(error);
              }
            } else {
              resolve(value);
            }
          },
          onRejected: (reason: any) => {
            if (typeof onRejected === 'function') {
              try {
                resolve(onRejected(reason));
              } catch (error) {
                reject(error);
              }
            } else {
              reject(reason);
            }
          },
          resolve,
          reject
        });
      });
    }

    catch(onRejected: (reason: any) => any) {
      return this.then(undefined, onRejected);
    }

    static resolve(value: any) {
      return new Promise(resolve => resolve(value));
    }

    static reject(reason: any) {
      return new Promise((_, reject) => reject(reason));
    }

    static all(promises: Promise[]) {
      return new Promise((resolve, reject) => {
        if (promises.length === 0) {
          resolve([]);
          return;
        }

        const results: any[] = [];
        let completed = 0;

        promises.forEach((promise, index) => {
          promise.then(value => {
            results[index] = value;
            completed++;
            if (completed === promises.length) {
              resolve(results);
            }
          }).catch(reject);
        });
      });
    }
  };
}

// fetch polyfill (简化版)
if (typeof fetch === 'undefined') {
  (window as any).fetch = function(url: string, options: any = {}) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.open(options.method || 'GET', url);
      
      if (options.headers) {
        Object.keys(options.headers).forEach(key => {
          xhr.setRequestHeader(key, options.headers[key]);
        });
      }
      
      xhr.onload = () => {
        const response = {
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          statusText: xhr.statusText,
          json: () => Promise.resolve(JSON.parse(xhr.responseText)),
          text: () => Promise.resolve(xhr.responseText)
        };
        resolve(response);
      };
      
      xhr.onerror = () => reject(new Error('Network error'));
      
      xhr.send(options.body);
    });
  };
}

// IntersectionObserver polyfill (简化版)
if (typeof IntersectionObserver === 'undefined') {
  (window as any).IntersectionObserver = class IntersectionObserver {
    private callback: (entries: any[]) => void;
    private options: any;
    private targets: Element[] = [];

    constructor(callback: (entries: any[]) => void, options: any = {}) {
      this.callback = callback;
      this.options = options;
      
      // 简化实现：立即触发回调
      setTimeout(() => {
        this.checkIntersections();
      }, 100);
    }

    observe(target: Element) {
      this.targets.push(target);
    }

    unobserve(target: Element) {
      const index = this.targets.indexOf(target);
      if (index > -1) {
        this.targets.splice(index, 1);
      }
    }

    disconnect() {
      this.targets = [];
    }

    private checkIntersections() {
      const entries = this.targets.map(target => ({
        target,
        isIntersecting: true, // 简化实现：总是返回true
        intersectionRatio: 1
      }));
      
      if (entries.length > 0) {
        this.callback(entries);
      }
    }
  };
}

// 移动端特定的兼容性检测和修复
export const initMobileCompatibility = () => {
  // 检测并修复移动端特有问题
  
  // 修复iOS Safari的100vh问题
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', () => {
      setTimeout(setVH, 100);
    });
  }
  
  // 修复Android WebView的touch事件问题
  if (/Android/.test(navigator.userAgent)) {
    document.addEventListener('touchstart', () => {}, { passive: true });
  }
  
  // 修复老版本浏览器的console问题
  if (typeof console === 'undefined') {
    (window as any).console = {
      log: () => {},
      warn: () => {},
      error: () => {},
      info: () => {},
      debug: () => {}
    };
  }
  
  // 修复requestAnimationFrame
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      return window.setTimeout(callback, 1000 / 60);
    };
  }
  
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = (id: number) => {
      clearTimeout(id);
    };
  }
};

// 导出兼容性检测函数
export const checkBrowserCompatibility = () => {
  const compatibility = {
    es6: true,
    fetch: typeof fetch !== 'undefined',
    promise: typeof Promise !== 'undefined',
    intersectionObserver: typeof IntersectionObserver !== 'undefined',
    serviceWorker: 'serviceWorker' in navigator,
    localStorage: (() => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
      } catch {
        return false;
      }
    })(),
    flexbox: CSS.supports('display', 'flex'),
    grid: CSS.supports('display', 'grid')
  };
  
  console.log('浏览器兼容性检测结果:', compatibility);
  return compatibility;
};