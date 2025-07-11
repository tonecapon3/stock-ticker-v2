/**
 * Chrome-specific memory info interface
 * This API is non-standard and specific to Chromium-based browsers.
 */
interface MemoryInfo {
  /**
   * The maximum size of the heap, in bytes, that is available to the context.
   */
  jsHeapSizeLimit: number;
  
  /**
   * The total allocated heap size, in bytes.
   */
  totalJSHeapSize: number;
  
  /**
   * The currently active segment of JS heap, in bytes.
   */
  usedJSHeapSize: number;
}

/**
 * Extend the Performance interface to include the Chrome-specific memory property
 */
interface Performance {
  /**
   * Chrome-specific memory info object
   * @deprecated This is a non-standard API that is only supported in Chromium-based browsers.
   * Use with caution and provide fallbacks for other browsers.
   */
  readonly memory?: MemoryInfo;
}

