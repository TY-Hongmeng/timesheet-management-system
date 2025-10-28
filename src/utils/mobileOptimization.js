/**
 * 移动端优化配置和处理
 * 专门针对移动设备的网络连接和性能优化
 */

class MobileOptimization {
    constructor() {
        this.isMobile = this.detectMobileDevice();
        this.networkType = this.getNetworkType();
        this.isLowEndDevice = this.detectLowEndDevice();
        this.optimizationLevel = this.calculateOptimizationLevel();
        
        this.init();
    }
    
    /**
     * 检测是否为移动设备
     */
    detectMobileDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        const mobileKeywords = [
            'mobile', 'android', 'iphone', 'ipad', 'ipod', 
            'blackberry', 'windows phone', 'opera mini'
        ];
        
        return mobileKeywords.some(keyword => userAgent.includes(keyword)) ||
               window.innerWidth <= 768 ||
               ('ontouchstart' in window);
    }
    
    /**
     * 获取网络类型
     */
    getNetworkType() {
        const connection = navigator.connection || 
                          navigator.mozConnection || 
                          navigator.webkitConnection;
        
        if (!connection) return 'unknown';
        
        return {
            type: connection.effectiveType || 'unknown',
            downlink: connection.downlink || 0,
            rtt: connection.rtt || 0,
            saveData: connection.saveData || false
        };
    }
    
    /**
     * 检测是否为低端设备
     */
    detectLowEndDevice() {
        // 检查硬件并发数
        const cores = navigator.hardwareConcurrency || 1;
        
        // 检查内存（如果可用）
        const memory = navigator.deviceMemory || 1;
        
        // 检查用户代理中的低端设备标识
        const userAgent = navigator.userAgent.toLowerCase();
        const lowEndKeywords = ['android 4', 'android 5', 'android 6'];
        const hasLowEndUA = lowEndKeywords.some(keyword => userAgent.includes(keyword));
        
        return cores <= 2 || memory <= 2 || hasLowEndUA;
    }
    
    /**
     * 计算优化级别
     */
    calculateOptimizationLevel() {
        let level = 0;
        
        // 基于网络类型
        if (this.networkType.type === 'slow-2g' || this.networkType.type === '2g') {
            level += 3;
        } else if (this.networkType.type === '3g') {
            level += 2;
        } else if (this.networkType.type === '4g') {
            level += 1;
        }
        
        // 基于设备性能
        if (this.isLowEndDevice) {
            level += 2;
        }
        
        // 基于数据节省模式
        if (this.networkType.saveData) {
            level += 2;
        }
        
        return Math.min(level, 5); // 最高级别为5
    }
    
    /**
     * 初始化移动端优化
     */
    init() {
        if (!this.isMobile) return;
        
        if (import.meta.env.DEV) {
            console.log('🔧 Initializing mobile optimization:', {
                level: this.optimizationLevel,
                networkType: this.networkType.type,
                isLowEnd: this.isLowEndDevice
            });
        }
        
        this.applyOptimizations();
        this.setupNetworkListeners();
    }
    
    /**
     * 应用优化策略
     */
    applyOptimizations() {
        // 根据优化级别应用不同策略
        switch (this.optimizationLevel) {
            case 5: // 最高优化级别
                this.enableAggressiveOptimization();
                break;
            case 4:
                this.enableHighOptimization();
                break;
            case 3:
                this.enableMediumOptimization();
                break;
            case 2:
                this.enableLowOptimization();
                break;
            default:
                this.enableBasicOptimization();
        }
    }
    
    /**
     * 激进优化模式（最慢网络/最低端设备）
     */
    enableAggressiveOptimization() {
        // 禁用非关键功能
        this.disableNonCriticalFeatures();
        
        // 最小化资源加载
        this.minimizeResourceLoading();
        
        // 启用文本压缩
        this.enableTextCompression();
        
        // 延迟加载所有非关键内容
        this.enableLazyLoading();
        
        console.log('📱 Aggressive optimization enabled');
    }
    
    /**
     * 高级优化模式
     */
    enableHighOptimization() {
        this.minimizeResourceLoading();
        this.enableLazyLoading();
        this.optimizeImages();
        
        console.log('📱 High optimization enabled');
    }
    
    /**
     * 中等优化模式
     */
    enableMediumOptimization() {
        this.enableLazyLoading();
        this.optimizeImages();
        
        console.log('📱 Medium optimization enabled');
    }
    
    /**
     * 低级优化模式
     */
    enableLowOptimization() {
        this.optimizeImages();
        
        console.log('📱 Low optimization enabled');
    }
    
    /**
     * 基础优化模式
     */
    enableBasicOptimization() {
        // 基本的移动端适配
        this.setupViewport();
        
        console.log('📱 Basic optimization enabled');
    }
    
    /**
     * 禁用非关键功能
     */
    disableNonCriticalFeatures() {
        // 禁用动画
        const style = document.createElement('style');
        style.textContent = `
            *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        `;
        document.head.appendChild(style);
        
        // 禁用自动播放
        document.addEventListener('DOMContentLoaded', () => {
            const videos = document.querySelectorAll('video');
            videos.forEach(video => {
                video.autoplay = false;
                video.preload = 'none';
            });
        });
    }
    
    /**
     * 最小化资源加载
     */
    minimizeResourceLoading() {
        // 移除非关键CSS
        document.addEventListener('DOMContentLoaded', () => {
            const links = document.querySelectorAll('link[rel="stylesheet"]');
            links.forEach(link => {
                if (!link.href.includes('critical') && !link.href.includes('main')) {
                    link.media = 'print';
                    link.onload = function() { this.media = 'all'; };
                }
            });
        });
    }
    
    /**
     * 启用文本压缩
     */
    enableTextCompression() {
        // 请求头中添加压缩支持
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.active?.postMessage({
                    type: 'ENABLE_COMPRESSION',
                    level: 'aggressive'
                });
            });
        }
    }
    
    /**
     * 启用懒加载
     */
    enableLazyLoading() {
        // 图片懒加载
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            imageObserver.unobserve(img);
                        }
                    }
                });
            });
            
            document.addEventListener('DOMContentLoaded', () => {
                const lazyImages = document.querySelectorAll('img[data-src]');
                lazyImages.forEach(img => imageObserver.observe(img));
            });
        }
    }
    
    /**
     * 优化图片
     */
    optimizeImages() {
        document.addEventListener('DOMContentLoaded', () => {
            const images = document.querySelectorAll('img');
            images.forEach(img => {
                // 添加loading="lazy"
                if (!img.hasAttribute('loading')) {
                    img.loading = 'lazy';
                }
                
                // 对于高DPI屏幕，限制图片尺寸
                if (window.devicePixelRatio > 1) {
                    const maxWidth = Math.min(img.naturalWidth, window.innerWidth);
                    img.style.maxWidth = maxWidth + 'px';
                }
            });
        });
    }
    
    /**
     * 设置视口
     */
    setupViewport() {
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }
        
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    }
    
    /**
     * 设置网络监听器
     */
    setupNetworkListeners() {
        // 监听网络变化
        if ('connection' in navigator) {
            navigator.connection.addEventListener('change', () => {
                this.networkType = this.getNetworkType();
                this.optimizationLevel = this.calculateOptimizationLevel();
                this.applyOptimizations();
                
                console.log('📱 Network changed, reapplying optimizations:', {
                    type: this.networkType.type,
                    level: this.optimizationLevel
                });
            });
        }
        
        // 监听在线/离线状态
        window.addEventListener('online', () => {
            console.log('📱 Device back online');
            this.handleOnlineStatus(true);
        });
        
        window.addEventListener('offline', () => {
            console.log('📱 Device went offline');
            this.handleOnlineStatus(false);
        });
    }
    
    /**
     * 处理在线状态变化
     */
    handleOnlineStatus(isOnline) {
        if (isOnline) {
            // 恢复正常功能
            this.restoreFeatures();
        } else {
            // 启用离线模式
            this.enableOfflineMode();
        }
    }
    
    /**
     * 恢复功能
     */
    restoreFeatures() {
        // 恢复被禁用的功能
        const disabledElements = document.querySelectorAll('[data-mobile-disabled]');
        disabledElements.forEach(element => {
            element.removeAttribute('data-mobile-disabled');
            element.style.display = '';
        });
    }
    
    /**
     * 启用离线模式
     */
    enableOfflineMode() {
        // 隐藏需要网络的功能
        const networkElements = document.querySelectorAll('[data-requires-network]');
        networkElements.forEach(element => {
            element.setAttribute('data-mobile-disabled', 'true');
            element.style.display = 'none';
        });
        
        // 显示离线提示
        this.showOfflineNotification();
    }
    
    /**
     * 显示离线通知
     */
    showOfflineNotification() {
        const notification = document.createElement('div');
        notification.className = 'mobile-offline-notification';
        notification.innerHTML = `
            <div class="offline-content">
                📱 离线模式已启用
                <button onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #ff9800;
            color: white;
            padding: 10px;
            text-align: center;
            z-index: 10000;
            font-size: 14px;
        `;
        
        document.body.appendChild(notification);
        
        // 5秒后自动隐藏
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
    
    /**
     * 获取优化建议
     */
    getOptimizationRecommendations() {
        const recommendations = [];
        
        if (this.networkType.type === 'slow-2g' || this.networkType.type === '2g') {
            recommendations.push('检测到慢速网络，建议切换到WiFi或移动到信号更好的位置');
        }
        
        if (this.isLowEndDevice) {
            recommendations.push('检测到低端设备，已启用性能优化模式');
        }
        
        if (this.networkType.saveData) {
            recommendations.push('检测到数据节省模式，已减少资源加载');
        }
        
        if (this.isMobile && window.innerWidth < 400) {
            recommendations.push('屏幕较小，建议横屏使用以获得更好体验');
        }
        
        return recommendations;
    }
    
    /**
     * 获取当前状态
     */
    getStatus() {
        return {
            isMobile: this.isMobile,
            networkType: this.networkType,
            isLowEndDevice: this.isLowEndDevice,
            optimizationLevel: this.optimizationLevel,
            recommendations: this.getOptimizationRecommendations()
        };
    }
}

// 创建全局实例
const mobileOptimization = new MobileOptimization();

// 导出
export { mobileOptimization, MobileOptimization };