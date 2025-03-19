/**
 * @file src/core/debug/IDebugSystem.ts
 * @description Interface for DebugSystem, providing core debug functionalities.
 */

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
    destroy(): void;
  }
  