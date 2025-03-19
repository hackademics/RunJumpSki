/**
 * @file src/core/debug/DebugSystem.ts
 * @description Core debug system that integrates performance monitoring, debug rendering, and GUI.
 * 
 * @dependencies IDebugSystem.ts, IPerformanceMonitor.ts, IDebugRenderer.ts, IDebugGUI.ts
 * @relatedFiles IDebugSystem.ts, IPerformanceMonitor.ts, IDebugRenderer.ts, IDebugGUI.ts
 */
import { IDebugSystem } from "./IDebugSystem";
import { IPerformanceMonitor } from "./IPerformanceMonitor";
import { IDebugRenderer } from "./IDebugRenderer";
import { IDebugGUI } from "./IDebugGUI";

export class DebugSystem implements IDebugSystem {
  private performanceMonitor: IPerformanceMonitor;
  private debugRenderer: IDebugRenderer;
  private debugGUI: IDebugGUI;

  constructor(
    performanceMonitor: IPerformanceMonitor,
    debugRenderer: IDebugRenderer,
    debugGUI: IDebugGUI
  ) {
    this.performanceMonitor = performanceMonitor;
    this.debugRenderer = debugRenderer;
    this.debugGUI = debugGUI;
  }

  public initialize(): void {
    this.performanceMonitor.startMonitoring();
    this.debugGUI.showGUI();
    console.log("DebugSystem initialized");
  }

  public update(deltaTime: number): void {
    this.performanceMonitor.update(deltaTime);
    this.debugRenderer.renderDebugInfo();
    this.debugGUI.updateGUI();
  }

  public destroy(): void {
    this.performanceMonitor.stopMonitoring();
    this.debugGUI.hideGUI();
    console.log("DebugSystem destroyed");
  }
}
