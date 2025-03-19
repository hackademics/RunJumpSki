/**
 * @file src/core/debug/metrics/PerformanceMetricsManager.ts
 * @description Implementation of performance metrics collection and management.
 * 
 * @dependencies IPerformanceMetricsManager.ts
 */
import * as BABYLON from 'babylonjs';
import { IPerformanceMetricsManager, PerformanceMetrics, MetricsTimePoint } from './IPerformanceMetricsManager';

/**
 * Default metrics with initial values
 */
const DEFAULT_METRICS: PerformanceMetrics = {
  fps: 0,
  frameTime: 0,
  drawCalls: 0,
  activeVertices: 0,
  activeFaces: 0,
  textureCount: 0,
  custom: {}
};

/**
 * Implementation of the performance metrics manager
 */
export class PerformanceMetricsManager implements IPerformanceMetricsManager {
  private scene: BABYLON.Scene;
  private engine: BABYLON.Engine;
  private metrics: PerformanceMetrics;
  private metricsHistory: MetricsTimePoint[];
  private isRecording: boolean;
  private maxHistoryPoints: number;
  private lastUpdateTime: number;
  private updateInterval: number; // in ms
  private frameTimeBuffer: number[];
  private frameTimeBufferSize: number;

  /**
   * Creates a new PerformanceMetricsManager
   * @param scene The Babylon.js scene to monitor
   * @param updateInterval Interval between metrics updates in ms (default: 1000)
   */
  constructor(scene: BABYLON.Scene, updateInterval = 1000) {
    this.scene = scene;
    // Cast to BABYLON.Engine to fix type error
    this.engine = scene.getEngine() as BABYLON.Engine;
    this.metrics = { ...DEFAULT_METRICS };
    this.metricsHistory = [];
    this.isRecording = false;
    this.maxHistoryPoints = 300; // 5 minutes at 1 update per second by default
    this.lastUpdateTime = performance.now();
    this.updateInterval = updateInterval;
    this.frameTimeBuffer = [];
    this.frameTimeBufferSize = 60; // Average over ~1 second at 60fps
  }

  /**
   * Initialize the metrics manager
   */
  public initialize(): void {
    // Start with a clean metrics object
    this.metrics = { ...DEFAULT_METRICS };
    this.lastUpdateTime = performance.now();
  }

  /**
   * Update metrics with the latest data
   * @param deltaTime Time elapsed since last update in seconds
   */
  public update(deltaTime: number): void {
    // Track frame time in the buffer for averaging
    this.frameTimeBuffer.push(deltaTime * 1000); // Convert to ms
    if (this.frameTimeBuffer.length > this.frameTimeBufferSize) {
      this.frameTimeBuffer.shift();
    }

    // Only update metrics at specified interval
    const now = performance.now();
    if (now - this.lastUpdateTime < this.updateInterval) {
      return;
    }

    // Calculate average frame time from buffer
    const avgFrameTime = this.frameTimeBuffer.reduce((sum, time) => sum + time, 0) / 
      Math.max(1, this.frameTimeBuffer.length);

    // Update metrics
    this.metrics.fps = Math.round(1000 / Math.max(0.001, avgFrameTime));
    this.metrics.frameTime = parseFloat(avgFrameTime.toFixed(2));
    
    // Get Babylon.js specific metrics if available
    if (this.scene && this.engine) {
      // Access Babylon.js metrics safely with fallbacks
      this.metrics.drawCalls = (this.engine as any)._drawCalls || 0;
      this.metrics.activeVertices = this.scene.getTotalVertices() || 0;
      this.metrics.activeFaces = Math.round(this.scene.getActiveIndices() / 3) || 0; // Indices / 3 = faces
      this.metrics.textureCount = this.engine.scenes.reduce((count, s) => 
        count + s.textures.length, 0);
    }

    // Memory usage (if available in the browser)
    if (window.performance && (performance as any).memory) {
      const memoryInfo = (performance as any).memory;
      this.metrics.memoryUsage = Math.round(memoryInfo.usedJSHeapSize / (1024 * 1024)); // Convert to MB
    }

    // Record history if enabled
    if (this.isRecording) {
      this.recordMetricsPoint();
    }

    this.lastUpdateTime = now;
  }

  /**
   * Start recording metrics history
   * @param maxDataPoints Maximum number of historical data points to store
   */
  public startRecording(maxDataPoints?: number): void {
    this.isRecording = true;
    if (maxDataPoints !== undefined) {
      this.maxHistoryPoints = maxDataPoints;
    }
  }

  /**
   * Stop recording metrics history
   */
  public stopRecording(): void {
    this.isRecording = false;
  }

  /**
   * Clear the current metrics history data
   */
  public clearHistory(): void {
    this.metricsHistory = [];
  }

  /**
   * Get current metrics
   * @returns Current performance metrics
   */
  public getCurrentMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get historical metrics data points
   * @param count Number of most recent data points to return, returns all if not specified
   * @returns Array of historical metrics data points
   */
  public getMetricsHistory(count?: number): MetricsTimePoint[] {
    if (count === undefined || count >= this.metricsHistory.length) {
      return [...this.metricsHistory];
    }
    
    return this.metricsHistory.slice(-count);
  }

  /**
   * Register a custom metric with the manager
   * @param name Unique name for the custom metric
   * @param initialValue Initial value for the metric
   */
  public registerCustomMetric(name: string, initialValue: number): void {
    this.metrics.custom[name] = initialValue;
  }

  /**
   * Update a custom metric value
   * @param name Name of the custom metric
   * @param value New value for the metric
   */
  public updateCustomMetric(name: string, value: number): void {
    if (!(name in this.metrics.custom)) {
      this.registerCustomMetric(name, value);
      return;
    }
    
    this.metrics.custom[name] = value;
  }

  /**
   * Get average metrics over the specified time period
   * @param seconds Number of seconds to average over (from most recent)
   * @returns Average performance metrics over the specified period
   */
  public getAverageMetrics(seconds: number): PerformanceMetrics {
    if (this.metricsHistory.length === 0) {
      return { ...DEFAULT_METRICS };
    }

    const now = performance.now();
    const startTime = now - (seconds * 1000);
    
    // Filter history to the specified time range
    const relevantPoints = this.metricsHistory.filter(point => point.timestamp >= startTime);
    
    if (relevantPoints.length === 0) {
      return { ...DEFAULT_METRICS };
    }

    // Start with empty averages
    const avgMetrics: PerformanceMetrics = {
      fps: 0,
      frameTime: 0,
      drawCalls: 0,
      activeVertices: 0,
      activeFaces: 0,
      textureCount: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      custom: {}
    };

    // Sum all metrics
    relevantPoints.forEach(point => {
      const m = point.metrics;
      avgMetrics.fps += m.fps;
      avgMetrics.frameTime += m.frameTime;
      if (m.drawCalls !== undefined) avgMetrics.drawCalls! += m.drawCalls;
      if (m.activeVertices !== undefined) avgMetrics.activeVertices! += m.activeVertices;
      if (m.activeFaces !== undefined) avgMetrics.activeFaces! += m.activeFaces;
      if (m.textureCount !== undefined) avgMetrics.textureCount! += m.textureCount;
      if (m.cpuUsage !== undefined) avgMetrics.cpuUsage! += m.cpuUsage;
      if (m.memoryUsage !== undefined) avgMetrics.memoryUsage! += m.memoryUsage;
      
      // Sum custom metrics
      Object.keys(m.custom).forEach(key => {
        if (!(key in avgMetrics.custom)) {
          avgMetrics.custom[key] = 0;
        }
        avgMetrics.custom[key] += m.custom[key];
      });
    });

    // Calculate averages
    const count = relevantPoints.length;
    avgMetrics.fps = parseFloat((avgMetrics.fps / count).toFixed(1));
    avgMetrics.frameTime = parseFloat((avgMetrics.frameTime / count).toFixed(2));
    if (avgMetrics.drawCalls !== undefined) avgMetrics.drawCalls = Math.round(avgMetrics.drawCalls / count);
    if (avgMetrics.activeVertices !== undefined) avgMetrics.activeVertices = Math.round(avgMetrics.activeVertices / count);
    if (avgMetrics.activeFaces !== undefined) avgMetrics.activeFaces = Math.round(avgMetrics.activeFaces / count);
    if (avgMetrics.textureCount !== undefined) avgMetrics.textureCount = Math.round(avgMetrics.textureCount / count);
    if (avgMetrics.cpuUsage !== undefined) avgMetrics.cpuUsage = parseFloat((avgMetrics.cpuUsage / count).toFixed(1));
    if (avgMetrics.memoryUsage !== undefined) avgMetrics.memoryUsage = parseFloat((avgMetrics.memoryUsage / count).toFixed(1));
    
    // Average custom metrics
    Object.keys(avgMetrics.custom).forEach(key => {
      avgMetrics.custom[key] = parseFloat((avgMetrics.custom[key] / count).toFixed(2));
    });

    return avgMetrics;
  }

  /**
   * Export metrics history to JSON format
   * @returns JSON string of metrics history
   */
  public exportMetricsToJSON(): string {
    return JSON.stringify({
      currentMetrics: this.metrics,
      history: this.metricsHistory
    });
  }

  /**
   * Record a data point of the current metrics to history
   */
  private recordMetricsPoint(): void {
    const point: MetricsTimePoint = {
      timestamp: performance.now(),
      metrics: { ...this.metrics, custom: { ...this.metrics.custom } }
    };

    this.metricsHistory.push(point);

    // Maintain the maximum number of history points
    if (this.metricsHistory.length > this.maxHistoryPoints) {
      this.metricsHistory.shift();
    }
  }
} 