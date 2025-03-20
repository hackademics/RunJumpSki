/**
 * @file src/core/debug/DebugSystem.ts
 * @description Core debug system that integrates performance monitoring, debug rendering, and GUI.
 * 
 * @dependencies IDebugSystem.ts, IPerformanceMonitor.ts, IDebugRenderer.ts, IDebugGUI.ts
 * @relatedFiles IDebugSystem.ts, IPerformanceMonitor.ts, IDebugRenderer.ts, IDebugGUI.ts
 */
import * as BABYLON from 'babylonjs';
import { IDebugSystem } from "./IDebugSystem";
import { IPerformanceMonitor } from "./IPerformanceMonitor";
import { IDebugRenderer } from "./IDebugRenderer";
import { IDebugGUI } from "./IDebugGUI";
import { PerformanceDisplayComponent } from "../../game/ui/debug/PerformanceDisplayComponent";

export class DebugSystem implements IDebugSystem {
  private performanceMonitor: IPerformanceMonitor;
  private debugRenderer: IDebugRenderer;
  private debugGUI: IDebugGUI;
  private scene: BABYLON.Scene;
  private performanceDisplay: PerformanceDisplayComponent | null = null;
  private updateInterval: number = 500; // ms
  private lastUpdateTime: number = 0;

  constructor(
    scene: BABYLON.Scene,
    performanceMonitor: IPerformanceMonitor,
    debugRenderer: IDebugRenderer,
    debugGUI: IDebugGUI
  ) {
    this.scene = scene;
    this.performanceMonitor = performanceMonitor;
    this.debugRenderer = debugRenderer;
    this.debugGUI = debugGUI;
    
    // Set the scene on the performance monitor
    this.performanceMonitor.setScene(scene);
  }

  public initialize(): void {
    this.performanceMonitor.startMonitoring();
    this.debugGUI.showGUI();
    
    // Create and initialize the performance display
    this.performanceDisplay = new PerformanceDisplayComponent(this.scene, {
      updateInterval: this.updateInterval,
      visible: true,
      position: 'top-right'
    });
    this.performanceDisplay.initialize();
    
    this.lastUpdateTime = performance.now();
    
    console.log("DebugSystem initialized");
  }

  public update(deltaTime: number): void {
    // Always update the performance monitor
    this.performanceMonitor.update(deltaTime);
    
    // Update display at specified interval
    const now = performance.now();
    if (now - this.lastUpdateTime >= this.updateInterval) {
      this.lastUpdateTime = now;
      
      // Update performance display
      if (this.performanceDisplay) {
        this.performanceDisplay.update(this.performanceMonitor.getMetrics());
      }
      
      // Update debug GUI and renderer
      this.debugRenderer.renderDebugInfo();
      this.debugGUI.updateGUI();
    }
  }

  public dispose(): void {
    this.performanceMonitor.stopMonitoring();
    this.debugGUI.hideGUI();
    
    // Dispose of performance display
    if (this.performanceDisplay) {
      this.performanceDisplay.dispose();
      this.performanceDisplay = null;
    }
    
    console.log("DebugSystem destroyed");
  }
  
  /**
   * Toggle the visibility of the performance display
   */
  public togglePerformanceDisplay(): void {
    if (this.performanceDisplay) {
      this.performanceDisplay.toggle();
    }
  }
  
  /**
   * Get the performance monitor
   * @returns The performance monitor instance
   */
  public getPerformanceMonitor(): IPerformanceMonitor {
    return this.performanceMonitor;
  }
  
  /**
   * Get the performance display component
   * @returns The performance display component
   */
  public getPerformanceDisplay(): PerformanceDisplayComponent | null {
    return this.performanceDisplay;
  }
  
  /**
   * Configure the performance display
   * @param options Performance display options
   */
  public configurePerformanceDisplay(options: any): void {
    if (this.performanceDisplay) {
      this.performanceDisplay.configure(options);
    }
  }
}

