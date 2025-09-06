/**
 * Performance Monitor for Adaptive Stock Ticker Updates
 * 
 * Monitors frame rates, memory usage, and system performance to
 * adapt update frequencies and animation quality dynamically
 */

export interface PerformanceMetrics {
  averageFrameTime: number; // in milliseconds
  frameRate: number; // frames per second
  memoryUsage: number; // percentage (0-100)
  memoryUsedMB: number; // memory in MB
  cpuLoad: number; // estimated CPU load percentage (0-100)
  updateLatency: number; // average update processing time
  isLowPowerMode: boolean; // device in low power mode
}

export interface PerformanceThresholds {
  targetFrameRate: number; // Target FPS (usually 60)
  minFrameRate: number; // Minimum acceptable FPS (usually 30)
  maxMemoryUsage: number; // Maximum memory percentage
  maxCpuLoad: number; // Maximum CPU load percentage
  maxUpdateLatency: number; // Maximum acceptable update latency
}

export interface AdaptiveSettings {
  updateInterval: number; // Local update interval in ms
  interpolationSteps: number; // Number of interpolation steps
  enableMicroFluctuations: boolean;
  enableSmoothing: boolean;
  chartAnimationDuration: number; // Chart animation duration in ms
  enableAdvancedAnimations: boolean;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private thresholds: PerformanceThresholds;
  private frameTimeHistory: number[] = [];
  private updateTimeHistory: number[] = [];
  private maxHistoryLength = 30;
  private lastFrameTime = 0;
  private animationFrameId: number | null = null;
  private isMonitoring = false;
  private performanceObserver: PerformanceObserver | null = null;
  
  constructor(thresholds: Partial<PerformanceThresholds> = {}) {
    this.thresholds = {
      targetFrameRate: 60,
      minFrameRate: 30,
      maxMemoryUsage: 75,
      maxCpuLoad: 70,
      maxUpdateLatency: 50,
      ...thresholds
    };
    
    this.metrics = {
      averageFrameTime: 16.67, // 60fps baseline
      frameRate: 60,
      memoryUsage: 0,
      memoryUsedMB: 0,
      cpuLoad: 0,
      updateLatency: 0,
      isLowPowerMode: false
    };
    
    this.setupPerformanceObserver();
  }

  /**
   * Start monitoring performance
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.lastFrameTime = performance.now();
    this.monitorFrameRate();
    this.detectLowPowerMode();
  }

  /**
   * Stop monitoring performance
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    this.updateMemoryMetrics();
    this.updateCpuEstimate();
    return { ...this.metrics };
  }

  /**
   * Record the time taken for an update operation
   */
  recordUpdateTime(startTime: number): void {
    const updateTime = performance.now() - startTime;
    this.updateTimeHistory.push(updateTime);
    
    if (this.updateTimeHistory.length > this.maxHistoryLength) {
      this.updateTimeHistory.shift();
    }
    
    this.metrics.updateLatency = this.updateTimeHistory.reduce((a, b) => a + b, 0) / this.updateTimeHistory.length;
  }

  /**
   * Get adaptive settings based on current performance
   */
  getAdaptiveSettings(): AdaptiveSettings {
    const metrics = this.getMetrics();
    
    // Base settings for optimal performance
    let settings: AdaptiveSettings = {
      updateInterval: 375, // 375ms (3000ms/8 steps)
      interpolationSteps: 8,
      enableMicroFluctuations: true,
      enableSmoothing: true,
      chartAnimationDuration: 200,
      enableAdvancedAnimations: true
    };

    // Adjust based on frame rate
    if (metrics.frameRate < this.thresholds.minFrameRate) {
      // Poor frame rate - reduce quality for better performance
      settings.updateInterval = 500; // Slower updates
      settings.interpolationSteps = 4; // Fewer steps
      settings.enableMicroFluctuations = false;
      settings.enableSmoothing = false;
      settings.chartAnimationDuration = 100;
      settings.enableAdvancedAnimations = false;
    } else if (metrics.frameRate < this.thresholds.targetFrameRate * 0.8) {
      // Moderate frame rate - some reduction
      settings.updateInterval = 400;
      settings.interpolationSteps = 6;
      settings.chartAnimationDuration = 150;
    }

    // Adjust based on memory usage
    if (metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      settings.updateInterval = Math.max(settings.updateInterval, 500);
      settings.interpolationSteps = Math.min(settings.interpolationSteps, 4);
      settings.enableMicroFluctuations = false;
      settings.enableAdvancedAnimations = false;
    }

    // Adjust based on CPU load
    if (metrics.cpuLoad > this.thresholds.maxCpuLoad) {
      settings.updateInterval = Math.max(settings.updateInterval, 600);
      settings.interpolationSteps = Math.min(settings.interpolationSteps, 3);
      settings.enableSmoothing = false;
      settings.chartAnimationDuration = 50;
    }

    // Adjust for low power mode
    if (metrics.isLowPowerMode) {
      settings.updateInterval = 1000; // Very slow updates
      settings.interpolationSteps = 2; // Minimal interpolation
      settings.enableMicroFluctuations = false;
      settings.enableSmoothing = false;
      settings.chartAnimationDuration = 0; // No animations
      settings.enableAdvancedAnimations = false;
    }

    // High-performance optimizations
    if (metrics.frameRate >= this.thresholds.targetFrameRate && 
        metrics.memoryUsage < 50 && 
        metrics.cpuLoad < 40) {
      settings.updateInterval = 250; // Faster updates
      settings.interpolationSteps = 12; // More steps for smoother animation
      settings.chartAnimationDuration = 300;
    }

    return settings;
  }

  /**
   * Check if performance is acceptable
   */
  isPerformanceAcceptable(): boolean {
    const metrics = this.getMetrics();
    
    return (
      metrics.frameRate >= this.thresholds.minFrameRate &&
      metrics.memoryUsage <= this.thresholds.maxMemoryUsage &&
      metrics.cpuLoad <= this.thresholds.maxCpuLoad &&
      metrics.updateLatency <= this.thresholds.maxUpdateLatency
    );
  }

  /**
   * Get performance level (0-100)
   */
  getPerformanceLevel(): number {
    const metrics = this.getMetrics();
    
    const frameRateScore = Math.min(100, (metrics.frameRate / this.thresholds.targetFrameRate) * 100);
    const memoryScore = Math.max(0, 100 - metrics.memoryUsage);
    const cpuScore = Math.max(0, 100 - metrics.cpuLoad);
    const latencyScore = Math.max(0, 100 - (metrics.updateLatency / this.thresholds.maxUpdateLatency) * 100);
    
    return (frameRateScore + memoryScore + cpuScore + latencyScore) / 4;
  }

  /**
   * Monitor frame rate using requestAnimationFrame
   */
  private monitorFrameRate(): void {
    if (!this.isMonitoring) return;
    
    const currentTime = performance.now();
    const frameTime = currentTime - this.lastFrameTime;
    
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > this.maxHistoryLength) {
      this.frameTimeHistory.shift();
    }
    
    // Calculate average frame time and frame rate
    this.metrics.averageFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    this.metrics.frameRate = 1000 / this.metrics.averageFrameTime;
    
    this.lastFrameTime = currentTime;
    
    this.animationFrameId = requestAnimationFrame(() => this.monitorFrameRate());
  }

  /**
   * Update memory metrics
   */
  private updateMemoryMetrics(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsedMB = Math.round(memory.usedJSHeapSize / (1024 * 1024));
      this.metrics.memoryUsage = Math.min(100, (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
    }
  }

  /**
   * Estimate CPU load based on frame timing consistency
   */
  private updateCpuEstimate(): void {
    if (this.frameTimeHistory.length < 5) return;
    
    // Calculate frame time variance as a proxy for CPU load
    const avgFrameTime = this.metrics.averageFrameTime;
    const variance = this.frameTimeHistory.reduce((sum, time) => {
      return sum + Math.pow(time - avgFrameTime, 2);
    }, 0) / this.frameTimeHistory.length;
    
    const standardDeviation = Math.sqrt(variance);
    
    // Higher variance indicates more CPU load (frame timing inconsistency)
    this.metrics.cpuLoad = Math.min(100, (standardDeviation / avgFrameTime) * 200);
  }

  /**
   * Detect if device is in low power mode
   */
  private detectLowPowerMode(): void {
    // Use the Battery API if available
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        // Consider low power mode if battery is low and not charging
        this.metrics.isLowPowerMode = battery.level < 0.2 && !battery.charging;
      }).catch(() => {
        // Battery API not available, use performance indicators
        this.metrics.isLowPowerMode = this.metrics.frameRate < 20;
      });
    } else {
      // Fallback: consider low power mode if performance is very poor
      this.metrics.isLowPowerMode = this.metrics.frameRate < 20 && this.metrics.cpuLoad > 80;
    }
  }

  /**
   * Setup Performance Observer for additional metrics
   */
  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          // Process performance entries if needed
          // This can be extended to monitor specific operations
        });
        
        this.performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });
      } catch (error) {
        console.warn('PerformanceObserver not supported or failed to initialize:', error);
      }
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopMonitoring();
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
  }
}

// Global performance monitor instance
export const globalPerformanceMonitor = new PerformanceMonitor();
