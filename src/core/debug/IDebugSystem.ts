/**
 * @file src/core/debug/IDebugSystem.ts
 * @description Interface for DebugSystem, providing core debug functionalities.
 */
import { IPerformanceMonitor } from "./IPerformanceMonitor";
import { PerformanceDisplayComponent } from "../../game/ui/debug/PerformanceDisplayComponent";

export interface IDebugSystem {
    /**
     * Initializes the debug system.
     */
    initialize(): void;
  
    /**
     * Updates the debug system (e.g., refreshes metrics and GUI).
     * @param deltaTime - Time elapsed since last update in seconds.
     */
    update(deltaTime: number): void;
  
    /**
     * Destroys the debug system and cleans up resources.
     */
    dispose(): void;
  
    /**
     * Toggle the visibility of the performance display
     */
    togglePerformanceDisplay(): void;
  
    /**
     * Get the performance monitor
     * @returns The performance monitor instance
     */
    getPerformanceMonitor(): IPerformanceMonitor;
  
    /**
     * Get the performance display component
     * @returns The performance display component
     */
    getPerformanceDisplay(): PerformanceDisplayComponent | null;
  
    /**
     * Configure the performance display
     * @param options Performance display options
     */
    configurePerformanceDisplay(options: any): void;
}
  
