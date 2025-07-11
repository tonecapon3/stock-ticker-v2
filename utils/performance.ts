/**
 * Checks if the performance API is available in the current environment
 * @returns {boolean} True if the performance API is available
 */
export function isPerformanceAvailable(): boolean {
  return typeof performance !== 'undefined';
}

/**
 * Type guard to check if performance.memory is available
 * @returns {boolean} True if performance.memory is available
 */
export function isMemoryInfoAvailable(): boolean {
  return isPerformanceAvailable() && 'memory' in performance;
}

/**
 * Safely retrieves the memory information from the performance API
 * This is a Chrome-specific API and may not be available in all browsers
 * 
 * @returns {MemoryInfo | null} Memory information object or null if not available
 * 
 * @example
 * // Example usage
 * const memoryInfo = getMemoryInfo();
 * if (memoryInfo) {
 *   console.log(`Used JS Heap: ${memoryInfo.usedJSHeapSize / (1024 * 1024)} MB`);
 * } else {
 *   console.log('Memory information not available');
 * }
 */
export function getMemoryInfo(): MemoryInfo | null {
  try {
    if (isMemoryInfoAvailable()) {
      return performance.memory as MemoryInfo;
    }
  } catch (error) {
    console.warn('Error accessing performance.memory:', error);
  }
  
  return null;
}

/**
 * Formats the memory size in bytes to a human-readable format
 * @param {number} bytes - The size in bytes
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted string with appropriate unit (KB, MB, GB)
 */
export function formatMemorySize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Retrieves formatted memory usage information
 * @returns {Object | null} Object containing formatted memory usage or null if not available
 */
export function getFormattedMemoryUsage(): { 
  used: string;
  total: string;
  limit: string;
  percentUsed: number;
} | null {
  const memoryInfo = getMemoryInfo();
  
  if (!memoryInfo) {
    return null;
  }
  
  const used = formatMemorySize(memoryInfo.usedJSHeapSize);
  const total = formatMemorySize(memoryInfo.totalJSHeapSize);
  const limit = formatMemorySize(memoryInfo.jsHeapSizeLimit);
  const percentUsed = Math.round((memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100);
  
  return {
    used,
    total,
    limit,
    percentUsed
  };
}

