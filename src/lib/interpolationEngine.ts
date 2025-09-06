/**
 * Interpolation Engine for Stock Price Smoothing
 * 
 * This module provides smooth price transitions between API updates
 * by generating intermediate values and micro-fluctuations
 */

import { PricePoint } from './types';

export interface InterpolationConfig {
  // Interpolation settings
  steps: number; // Number of intermediate steps between API updates
  easingFunction: 'linear' | 'easeInOut' | 'easeOut' | 'easeIn';
  
  // Micro-fluctuation settings
  microFluctuationEnabled: boolean;
  microFluctuationRange: number; // Percentage range for micro-fluctuations (e.g., 0.1 = ±0.1%)
  fluctuationFrequency: number; // How often to apply fluctuations (0.0 to 1.0)
  
  // Smoothing settings
  smoothingFactor: number; // 0.0 to 1.0, higher = smoother transitions
  noiseReduction: boolean; // Apply noise reduction to prevent jittery movements
}

export interface InterpolatedPricePoint extends PricePoint {
  isInterpolated: boolean;
  sourceApiPrice?: number; // The original API price this was derived from
  interpolationStep?: number; // Which step in the interpolation (0 to steps-1)
}

export class InterpolationEngine {
  private config: InterpolationConfig;
  private lastApiPrices: Map<string, number> = new Map();
  private targetApiPrices: Map<string, number> = new Map();
  private interpolationStartTime: Map<string, number> = new Map();
  private currentStep: Map<string, number> = new Map();
  
  constructor(config: Partial<InterpolationConfig> = {}) {
    this.config = {
      steps: 8, // 8 steps between API updates for smooth movement
      easingFunction: 'easeInOut',
      microFluctuationEnabled: true,
      microFluctuationRange: 0.08, // ±0.08% micro-fluctuations
      fluctuationFrequency: 0.6, // 60% chance of micro-fluctuation per step
      smoothingFactor: 0.7,
      noiseReduction: true,
      ...config
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<InterpolationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set a new API price target for interpolation
   */
  setApiPrice(symbol: string, newApiPrice: number): void {
    const currentPrice = this.lastApiPrices.get(symbol) || newApiPrice;
    
    this.lastApiPrices.set(symbol, currentPrice);
    this.targetApiPrices.set(symbol, newApiPrice);
    this.interpolationStartTime.set(symbol, Date.now());
    this.currentStep.set(symbol, 0);
  }

  /**
   * Get the next interpolated price for a symbol
   */
  getInterpolatedPrice(symbol: string): InterpolatedPricePoint {
    const lastPrice = this.lastApiPrices.get(symbol);
    const targetPrice = this.targetApiPrices.get(symbol);
    const step = this.currentStep.get(symbol) || 0;
    
    if (!lastPrice || !targetPrice) {
      // No interpolation data available, return as-is
      return {
        timestamp: new Date(),
        price: targetPrice || lastPrice || 100,
        isInterpolated: false
      };
    }

    // Calculate interpolation progress (0.0 to 1.0)
    const progress = Math.min(step / this.config.steps, 1.0);
    
    // Apply easing function
    const easedProgress = this.applyEasing(progress, this.config.easingFunction);
    
    // Calculate base interpolated price
    const basePrice = lastPrice + (targetPrice - lastPrice) * easedProgress;
    
    // Apply micro-fluctuations if enabled
    let finalPrice = basePrice;
    if (this.config.microFluctuationEnabled && Math.random() < this.config.fluctuationFrequency) {
      const fluctuation = this.generateMicroFluctuation(basePrice);
      finalPrice = basePrice + fluctuation;
    }
    
    // Apply smoothing if noise reduction is enabled
    if (this.config.noiseReduction) {
      finalPrice = this.applySmoothing(symbol, finalPrice);
    }
    
    // Increment step for next call
    this.currentStep.set(symbol, step + 1);
    
    // If we've completed all interpolation steps, reset for next API update
    if (step >= this.config.steps) {
      this.lastApiPrices.set(symbol, targetPrice);
      this.currentStep.set(symbol, 0);
    }

    return {
      timestamp: new Date(),
      price: finalPrice,
      isInterpolated: true,
      sourceApiPrice: targetPrice,
      interpolationStep: step
    };
  }

  /**
   * Generate a local price update with micro-fluctuations (for offline mode)
   */
  generateLocalPrice(symbol: string, currentPrice: number): InterpolatedPricePoint {
    // Generate a small trend for more realistic movement
    const trendDirection = Math.random() < 0.5 ? -1 : 1;
    const trendStrength = Math.random() * 0.3; // Up to 0.3% trend
    
    // Apply micro-fluctuations
    const fluctuation = this.generateMicroFluctuation(currentPrice);
    const trend = currentPrice * (trendDirection * trendStrength / 100);
    
    const newPrice = currentPrice + trend + fluctuation;
    
    // Apply smoothing
    const smoothedPrice = this.config.noiseReduction 
      ? this.applySmoothing(symbol, newPrice) 
      : newPrice;

    return {
      timestamp: new Date(),
      price: smoothedPrice,
      isInterpolated: false // This is a local generation, not interpolation
    };
  }

  /**
   * Apply easing function to interpolation progress
   */
  private applyEasing(t: number, easingFunction: string): number {
    switch (easingFunction) {
      case 'linear':
        return t;
      case 'easeIn':
        return t * t;
      case 'easeOut':
        return 1 - Math.pow(1 - t, 2);
      case 'easeInOut':
      default:
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }
  }

  /**
   * Generate micro-fluctuation for realistic price movement
   */
  private generateMicroFluctuation(basePrice: number): number {
    // Generate random fluctuation within the specified range
    const fluctuationPercent = (Math.random() - 0.5) * 2 * this.config.microFluctuationRange;
    return basePrice * (fluctuationPercent / 100);
  }

  /**
   * Apply smoothing to reduce jittery movements
   */
  private applySmoothing(symbol: string, newPrice: number): number {
    const lastSmoothedPrice = this.getLastSmoothedPrice(symbol);
    if (!lastSmoothedPrice) {
      this.setLastSmoothedPrice(symbol, newPrice);
      return newPrice;
    }
    
    // Apply exponential moving average for smoothing
    const smoothedPrice = lastSmoothedPrice + 
      (newPrice - lastSmoothedPrice) * (1 - this.config.smoothingFactor);
    
    this.setLastSmoothedPrice(symbol, smoothedPrice);
    return smoothedPrice;
  }

  private lastSmoothedPrices: Map<string, number> = new Map();

  private getLastSmoothedPrice(symbol: string): number | undefined {
    return this.lastSmoothedPrices.get(symbol);
  }

  private setLastSmoothedPrice(symbol: string, price: number): void {
    this.lastSmoothedPrices.set(symbol, price);
  }

  /**
   * Get interpolation status for a symbol
   */
  getInterpolationStatus(symbol: string): {
    isInterpolating: boolean;
    progress: number;
    step: number;
    totalSteps: number;
  } {
    const step = this.currentStep.get(symbol) || 0;
    const hasTarget = this.targetApiPrices.has(symbol);
    
    return {
      isInterpolating: hasTarget && step < this.config.steps,
      progress: hasTarget ? Math.min(step / this.config.steps, 1.0) : 0,
      step,
      totalSteps: this.config.steps
    };
  }

  /**
   * Reset interpolation state for a symbol
   */
  resetInterpolation(symbol: string): void {
    this.lastApiPrices.delete(symbol);
    this.targetApiPrices.delete(symbol);
    this.interpolationStartTime.delete(symbol);
    this.currentStep.delete(symbol);
    this.lastSmoothedPrices.delete(symbol);
  }

  /**
   * Get recommended update frequency based on interpolation steps
   */
  getRecommendedLocalUpdateInterval(): number {
    // If we have 8 steps and API updates every 3000ms,
    // local updates should be every 3000/8 = 375ms for smooth transitions
    // Note: API interval can be 100ms-5000ms (user configurable)
    const apiUpdateInterval = 3000; // ms (default)
    return Math.max(250, Math.floor(apiUpdateInterval / this.config.steps));
  }

  /**
   * Adapt configuration based on performance metrics
   */
  adaptConfiguration(performanceMetrics: {
    averageFrameTime: number;
    memoryUsage: number;
    cpuLoad: number;
  }): void {
    const { averageFrameTime, memoryUsage, cpuLoad } = performanceMetrics;
    
    // If performance is poor, reduce complexity
    if (averageFrameTime > 32 || memoryUsage > 80 || cpuLoad > 70) {
      // Reduce interpolation steps for better performance
      this.config.steps = Math.max(4, this.config.steps - 1);
      this.config.microFluctuationEnabled = false;
      this.config.noiseReduction = false;
    } else if (averageFrameTime < 16 && memoryUsage < 50 && cpuLoad < 40) {
      // Performance is good, can increase quality
      this.config.steps = Math.min(12, this.config.steps + 1);
      this.config.microFluctuationEnabled = true;
      this.config.noiseReduction = true;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): InterpolationConfig {
    return { ...this.config };
  }
}

// Default interpolation engine instance
export const defaultInterpolationEngine = new InterpolationEngine();
