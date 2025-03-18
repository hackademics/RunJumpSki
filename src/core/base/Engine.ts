/**
 * @file src/core/base/Engine.ts
 * @description Main engine class that manages systems
 * 
 * @dependencies ISystem, ServiceLocator
 */

import { ISystem } from './ISystem';
import { ServiceLocator } from './ServiceLocator';

/**
 * Engine options
 */
export interface EngineOptions {
  /**
   * Whether to enable debug mode
   */
  debug?: boolean;
  
  /**
   * Target FPS (frames per second)
   */
  targetFPS?: number;
}

/**
 * Default engine options
 */
const DEFAULT_ENGINE_OPTIONS: EngineOptions = {
  debug: false,
  targetFPS: 60
};

/**
 * Main engine class that manages systems
 */
export class Engine {
  /**
   * Systems managed by the engine
   */
  private systems: ISystem[] = [];
  
  /**
   * Whether the engine is running
   */
  private running: boolean = false;
  
  /**
   * Last time the engine was updated
   */
  private lastTime: number = 0;
  
  /**
   * RequestAnimationFrame ID
   */
  private animationFrameId: number = 0;
  
  /**
   * Debug mode
   */
  private debug: boolean;
  
  /**
   * Target FPS (frames per second)
   */
  private targetFPS: number;
  
  /**
   * Target frame time in milliseconds
   */
  private targetFrameTime: number;
  
  /**
   * Create a new engine
   * @param options Engine options
   */
  constructor(options: EngineOptions = {}) {
    const mergedOptions = { ...DEFAULT_ENGINE_OPTIONS, ...options };
    
    this.debug = mergedOptions.debug !== undefined ? mergedOptions.debug : DEFAULT_ENGINE_OPTIONS.debug!;
    this.targetFPS = mergedOptions.targetFPS !== undefined ? mergedOptions.targetFPS : DEFAULT_ENGINE_OPTIONS.targetFPS!;
    this.targetFrameTime = 1000 / this.targetFPS;
    
    // Register the engine in the service locator
    ServiceLocator.getInstance().register('engine', this);
    
    if (this.debug) {
      console.log(`Engine created with target FPS: ${this.targetFPS}`);
    }
  }
  
  /**
   * Add a system to the engine
   * @param system The system to add
   * @returns The engine instance for chaining
   */
  public addSystem(system: ISystem): Engine {
    this.systems.push(system);
    // Sort systems by priority
    this.systems.sort((a, b) => a.priority - b.priority);
    
    if (this.debug) {
      console.log(`System added: ${system.name}`);
    }
    
    return this;
  }
  
  /**
   * Remove a system from the engine
   * @param systemName Name of the system to remove
   * @returns Whether the system was removed
   */
  public removeSystem(systemName: string): boolean {
    const index = this.systems.findIndex(system => system.name === systemName);
    if (index !== -1) {
      const [system] = this.systems.splice(index, 1);
      
      if (this.debug) {
        console.log(`System removed: ${system.name}`);
      }
      
      return true;
    }
    return false;
  }
  
  /**
   * Get a system by name
   * @param systemName Name of the system to get
   * @returns The system, or undefined if not found
   */
  public getSystem<T extends ISystem>(systemName: string): T | undefined {
    return this.systems.find(system => system.name === systemName) as T | undefined;
  }
  
  /**
   * Initialize all systems
   */
  public async initialize(): Promise<void> {
    if (this.debug) {
      console.log('Initializing engine...');
    }
    
    // Initialize each system
    for (const system of this.systems) {
      try {
        await system.initialize();
        if (this.debug) {
          console.log(`System initialized: ${system.name}`);
        }
      } catch (error) {
        console.error(`Failed to initialize system ${system.name}:`, error);
        throw error;
      }
    }
    
    if (this.debug) {
      console.log('Engine initialized');
    }
  }
  
  /**
   * Start the engine
   */
  public start(): void {
    if (this.running) {
      console.warn('Engine is already running');
      return;
    }
    
    this.running = true;
    this.lastTime = performance.now();
    
    if (this.debug) {
      console.log('Engine started');
    }
    
    this.tick();
  }
  
  /**
   * Stop the engine
   */
  public stop(): void {
    if (!this.running) {
      console.warn('Engine is not running');
      return;
    }
    
    this.running = false;
    cancelAnimationFrame(this.animationFrameId);
    
    if (this.debug) {
      console.log('Engine stopped');
    }
  }
  
  /**
   * Update all systems
   * @param deltaTime Time elapsed since the last update in seconds
   */
  private updateSystems(deltaTime: number): void {
    for (const system of this.systems) {
      if (system.isEnabled()) {
        try {
          system.update(deltaTime);
        } catch (error) {
          console.error(`Error updating system ${system.name}:`, error);
          // Continue with other systems rather than crashing the engine
        }
      }
    }
  }
  
  /**
   * Engine update tick
   */
  private tick(): void {
    if (!this.running) return;
    
    this.animationFrameId = requestAnimationFrame(() => this.tick());
    
    const currentTime = performance.now();
    const elapsedTime = currentTime - this.lastTime;
    
    // Limit frame rate if necessary
    if (elapsedTime >= this.targetFrameTime) {
      const deltaTime = elapsedTime / 1000; // Convert to seconds
      this.updateSystems(deltaTime);
      this.lastTime = currentTime;
    }
  }
  
  /**
   * Clean up all systems and dispose of resources
   */
  public async dispose(): Promise<void> {
    this.stop();
    
    if (this.debug) {
      console.log('Disposing engine...');
    }
    
    // Dispose each system
    for (const system of this.systems) {
      try {
        await system.dispose();
        if (this.debug) {
          console.log(`System disposed: ${system.name}`);
        }
      } catch (error) {
        console.error(`Error disposing system ${system.name}:`, error);
      }
    }
    
    // Clear the systems array
    this.systems = [];
    
    // Remove the engine from the service locator
    ServiceLocator.getInstance().remove('engine');
    
    if (this.debug) {
      console.log('Engine disposed');
    }
  }
  
  /**
   * Check if the engine is running
   */
  public isRunning(): boolean {
    return this.running;
  }
  
  /**
   * Get all systems
   */
  public getSystems(): ISystem[] {
    return [...this.systems];
  }
  
  /**
   * Set debug mode
   * @param debug Whether to enable debug mode
   */
  public setDebug(debug: boolean): void {
    this.debug = debug;
  }
  
  /**
   * Check if debug mode is enabled
   */
  public isDebug(): boolean {
    return this.debug;
  }
}
