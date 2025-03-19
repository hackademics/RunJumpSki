/**
 * @file src/core/debug/metrics/IPerformanceMetricsManager.ts
 * @description Interface for performance metrics management system.
 */

/**
 * Performance metrics data structure
 */
export interface PerformanceMetrics {
  /**
   * Frames per second
   */
  fps: number;
  
  /**
   * Milliseconds per frame
   */
  frameTime: number;
  
  /**
   * CPU usage percentage
   */
  cpuUsage?: number;
  
  /**
   * Memory usage in MB
   */
  memoryUsage?: number;
  
  /**
   * Total number of draw calls per frame
   */
  drawCalls?: number;
  
  /**
   * Total active vertices being rendered
   */
  activeVertices?: number;
  
  /**
   * Total active faces being rendered
   */
  activeFaces?: number;
  
  /**
   * Number of active textures
   */
  textureCount?: number;
  
  /**
   * Custom metrics can be added to this object
   */
  custom: Record<string, number>;
}

/**
 * Time-series data point for metrics history
 */
export interface MetricsTimePoint {
  /**
   * Timestamp when the metrics were recorded
   */
  timestamp: number;
  
  /**
   * Metrics data at this time point
   */
  metrics: PerformanceMetrics;
}

/**
 * Interface for the performance metrics manager
 */
export interface IPerformanceMetricsManager {
  /**
   * Initialize the metrics manager
   */
  initialize(): void;
  
  /**
   * Update metrics with the latest data
   * @param deltaTime Time elapsed since last update in seconds
   */
  update(deltaTime: number): void;

  /**
   * Start recording metrics history
   * @param maxDataPoints Maximum number of historical data points to store
   */
  startRecording(maxDataPoints?: number): void;

  /**
   * Stop recording metrics history
   */
  stopRecording(): void;

  /**
   * Clear the current metrics history data
   */
  clearHistory(): void;

  /**
   * Get current metrics
   * @returns Current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics;

  /**
   * Get historical metrics data points
   * @param count Number of most recent data points to return, returns all if not specified
   * @returns Array of historical metrics data points
   */
  getMetricsHistory(count?: number): MetricsTimePoint[];

  /**
   * Register a custom metric with the manager
   * @param name Unique name for the custom metric
   * @param initialValue Initial value for the metric
   */
  registerCustomMetric(name: string, initialValue: number): void;

  /**
   * Update a custom metric value
   * @param name Name of the custom metric
   * @param value New value for the metric
   */
  updateCustomMetric(name: string, value: number): void;

  /**
   * Get average metrics over the specified time period
   * @param seconds Number of seconds to average over (from most recent)
   * @returns Average performance metrics over the specified period
   */
  getAverageMetrics(seconds: number): PerformanceMetrics;

  /**
   * Export metrics history to JSON format
   * @returns JSON string of metrics history
   */
  exportMetricsToJSON(): string;
} 