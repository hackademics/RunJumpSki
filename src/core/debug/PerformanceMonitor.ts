/**
 * @file src/core/debug/PerformanceMonitor.ts
 * @description Tracks performance metrics such as FPS.
 * 
 * @dependencies IPerformanceMonitor.ts
 * @relatedFiles IPerformanceMonitor.ts, IPerformanceMetricsManager.ts
 */
import * as BABYLON from 'babylonjs';
import { IPerformanceMonitor } from "./IPerformanceMonitor";
import { PerformanceMetricsManager } from "./metrics/PerformanceMetricsManager";
import { PerformanceMetrics } from "./metrics/IPerformanceMetricsManager";

export class PerformanceMonitor implements IPerformanceMonitor {
  private metricsManager: PerformanceMetricsManager | null = null;
  private isMonitoring: boolean = false;
  private scene: BABYLON.Scene | null = null;

  constructor(scene?: BABYLON.Scene) {
    if (scene) {
      this.scene = scene;
      this.metricsManager = new PerformanceMetricsManager(scene);
    }
  }

  /**
   * Sets the scene to monitor
   * @param scene The Babylon.js scene to monitor
   */
  public setScene(scene: BABYLON.Scene): void {
    this.scene = scene;
    this.metricsManager = new PerformanceMetricsManager(scene);
    
    if (this.isMonitoring) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  public startMonitoring(): void {
    if (!this.scene || !this.metricsManager) {
      console.warn("PerformanceMonitor: Cannot start monitoring without a scene. Use setScene() first.");
      return;
    }

    this.isMonitoring = true;
    this.metricsManager.initialize();
    this.metricsManager.startRecording();
    console.log("Performance monitoring started");
  }

  public update(deltaTime: number): void {
    if (!this.isMonitoring || !this.metricsManager) return;
    
    this.metricsManager.update(deltaTime);
  }

  public stopMonitoring(): void {
    if (this.metricsManager) {
      this.metricsManager.stopRecording();
    }
    this.isMonitoring = false;
    console.log("Performance monitoring stopped");
  }

  public getMetrics(): PerformanceMetrics {
    if (!this.metricsManager) {
      return {
        fps: 0,
        frameTime: 0,
        custom: {}
      };
    }
    return this.metricsManager.getCurrentMetrics();
  }

  /**
   * Get the metrics manager instance
   * @returns The PerformanceMetricsManager instance
   */
  public getMetricsManager(): PerformanceMetricsManager | null {
    return this.metricsManager;
  }

  /**
   * Register a custom metric to track
   * @param name The name of the metric
   * @param initialValue The initial value
   */
  public registerCustomMetric(name: string, initialValue: number): void {
    if (!this.metricsManager) return;
    this.metricsManager.registerCustomMetric(name, initialValue);
  }

  /**
   * Update a custom metric value
   * @param name The name of the metric
   * @param value The new value
   */
  public updateCustomMetric(name: string, value: number): void {
    if (!this.metricsManager) return;
    this.metricsManager.updateCustomMetric(name, value);
  }

  /**
   * Get the average metrics over a time period
   * @param seconds Number of seconds to average over
   * @returns The average metrics
   */
  public getAverageMetrics(seconds: number): PerformanceMetrics {
    if (!this.metricsManager) {
      return {
        fps: 0,
        frameTime: 0,
        custom: {}
      };
    }
    return this.metricsManager.getAverageMetrics(seconds);
  }
}
