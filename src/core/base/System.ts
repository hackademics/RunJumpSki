/**
 * @file src/core/base/System.ts
 * @description Abstract base class for all systems
 * 
 * @dependencies ISystem
 */

import { ISystem, SystemOptions } from './ISystem';

/**
 * Default system options
 */
const DEFAULT_SYSTEM_OPTIONS: SystemOptions = {
  enabled: true,
  priority: 0,
  name: 'System'
};

/**
 * Abstract base class for all engine systems
 */
export abstract class System implements ISystem {
  /**
   * Unique name identifying the system
   */
  public readonly name: string;
  
  /**
   * Priority of the system (lower numbers execute first)
   */
  public readonly priority: number;
  
  /**
   * Whether the system is currently enabled
   */
  private enabled: boolean;
  
  /**
   * Create a new system
   * @param options Options for the system
   */
  constructor(options: SystemOptions = {}) {
    const mergedOptions = { ...DEFAULT_SYSTEM_OPTIONS, ...options };
    
    this.name = mergedOptions.name || this.constructor.name;
    this.priority = mergedOptions.priority !== undefined ? mergedOptions.priority : DEFAULT_SYSTEM_OPTIONS.priority!;
    this.enabled = mergedOptions.enabled !== undefined ? mergedOptions.enabled : DEFAULT_SYSTEM_OPTIONS.enabled!;
  }
  
  /**
   * Check if the system is enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Enable or disable the system
   * @param enabled Whether the system should be enabled
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * Initialize the system
   * This method should be overridden by subclasses to perform initialization
   */
  public async initialize(): Promise<void> {
    // Base implementation does nothing
  }
  
  /**
   * Update the system
   * This method should be overridden by subclasses to perform updates
   * @param deltaTime Time elapsed since the last update in seconds
   */
  public update(deltaTime: number): void {
    // Base implementation does nothing
  }
  
  /**
   * Clean up resources used by the system
   * This method should be overridden by subclasses to perform cleanup
   */
  public async dispose(): Promise<void> {
    // Base implementation does nothing
  }
}
