/**
 * @file src/core/debug/IPerformanceMonitor.ts
 * @description Interface for PerformanceMonitor, which tracks performance metrics.
 */
import * as BABYLON from 'babylonjs';
import { PerformanceMetrics } from './metrics/IPerformanceMetricsManager';
import { PerformanceMetricsManager } from './metrics/PerformanceMetricsManager';

export interface IPerformanceMonitor {
    /**
     * Sets the scene to monitor
     * @param scene The Babylon.js scene to monitor
     */
    setScene(scene: BABYLON.Scene): void;
  
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
    getMetrics(): PerformanceMetrics;
  
    /**
     * Get the metrics manager instance
     * @returns The PerformanceMetricsManager instance
     */
    getMetricsManager(): PerformanceMetricsManager | null;
  
    /**
     * Register a custom metric to track
     * @param name The name of the metric
     * @param initialValue The initial value
     */
    registerCustomMetric(name: string, initialValue: number): void;
  
    /**
     * Update a custom metric value
     * @param name The name of the metric
     * @param value The new value
     */
    updateCustomMetric(name: string, value: number): void;
  
    /**
     * Get the average metrics over a time period
     * @param seconds Number of seconds to average over
     * @returns The average metrics
     */
    getAverageMetrics(seconds: number): PerformanceMetrics;
  }
  