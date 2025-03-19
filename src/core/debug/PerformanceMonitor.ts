/**
 * @file src/core/debug/PerformanceMonitor.ts
 * @description Tracks performance metrics such as FPS.
 * 
 * @dependencies IPerformanceMonitor.ts
 * @relatedFiles IPerformanceMonitor.ts
 */
import { IPerformanceMonitor } from "./IPerformanceMonitor";

export class PerformanceMonitor implements IPerformanceMonitor {
  private startTime: number;
  private frameCount: number;
  private metrics: { fps: number };

  constructor() {
    this.startTime = 0;
    this.frameCount = 0;
    this.metrics = { fps: 0 };
  }

  public startMonitoring(): void {
    this.startTime = performance.now();
    this.frameCount = 0;
    console.log("Performance monitoring started");
  }

  public update(deltaTime: number): void {
    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.startTime;
    if (elapsed >= 1000) {
      this.metrics.fps = (this.frameCount * 1000) / elapsed;
      this.frameCount = 0;
      this.startTime = now;
    }
  }

  public stopMonitoring(): void {
    console.log("Performance monitoring stopped");
  }

  public getMetrics(): any {
    return this.metrics;
  }
}
