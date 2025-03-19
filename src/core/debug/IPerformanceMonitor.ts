/**
 * @file src/core/debug/IPerformanceMonitor.ts
 * @description Interface for PerformanceMonitor, which tracks performance metrics.
 */

export interface IPerformanceMonitor {
    /**
     * Starts performance monitoring.
     */
    startMonitoring(): void;
  
    /**
     * Updates performance metrics.
     * @param deltaTime - Time elapsed since last update in seconds.
     */
    update(deltaTime: number): void;
  
    /**
     * Stops performance monitoring.
     */
    stopMonitoring(): void;
  
    /**
     * Retrieves the current performance metrics.
     * @returns An object containing metrics (e.g., FPS).
     */
    getMetrics(): any;
  }
  