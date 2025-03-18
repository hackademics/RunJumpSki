/**
 * @file src/core/base/ISystem.ts
 * @description Interface for all engine systems
 */

/**
 * Options for initializing a system
 */
export interface SystemOptions {
  /**
   * Whether the system is enabled by default
   */
  enabled?: boolean;
  
  /**
   * Priority of the system (lower numbers execute first)
   */
  priority?: number;
  
  /**
   * Name of the system
   */
  name?: string;
}

/**
 * Interface for all engine systems
 * 
 * Systems are responsible for managing a specific aspect of the game engine,
 * such as rendering, physics, input, etc.
 */
export interface ISystem {
  /**
   * Unique name identifying the system
   */
  readonly name: string;
  
  /**
   * Priority of the system (lower numbers execute first)
   */
  readonly priority: number;
  
  /**
   * Whether the system is currently enabled
   */
  isEnabled(): boolean;
  
  /**
   * Enable or disable the system
   * @param enabled Whether the system should be enabled
   */
  setEnabled(enabled: boolean): void;
  
  /**
   * Initialize the system
   */
  initialize(): Promise<void>;
  
  /**
   * Update the system
   * @param deltaTime Time elapsed since the last update in seconds
   */
  update(deltaTime: number): void;
  
  /**
   * Clean up resources used by the system
   */
  dispose(): Promise<void>;
}
