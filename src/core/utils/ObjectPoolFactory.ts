/**
 * @file src/core/utils/ObjectPoolFactory.ts
 * @description Utility for creating and managing object pools for components and other reusable objects
 */

import { ObjectPool, IPoolObjectFactory, IPoolable } from './ObjectPool';
import { Component } from '../ecs/Component';
import { Logger } from './Logger';

/**
 * Poolable component interface that extends Component and IPoolable
 */
export interface IPoolableComponent extends Component, IPoolable {}

/**
 * Options for creating a component pool
 */
export interface ComponentPoolOptions {
  /**
   * Initial size of the pool
   */
  initialSize?: number;
  
  /**
   * Maximum size of the pool (0 for unlimited)
   */
  maxSize?: number;
  
  /**
   * Custom reset function for components
   */
  resetFn?: (component: Component) => void;
}

/**
 * Default options for component pools
 */
export const DEFAULT_COMPONENT_POOL_OPTIONS: ComponentPoolOptions = {
  initialSize: 10,
  maxSize: 100
};

/**
 * Factory for creating component object pools
 */
export class ObjectPoolFactory {
  private static pools: Map<string, ObjectPool<any>> = new Map();
  private static logger: Logger = new Logger('ObjectPoolFactory');
  
  /**
   * Create or retrieve a pool for a specific component type
   * 
   * @param componentType The component type identifier
   * @param factory Factory function to create the component
   * @param options Pool configuration options
   * @returns The object pool for the component type
   */
  public static getComponentPool<T extends Component & IPoolable>(
    componentType: string,
    factory: IPoolObjectFactory<T>,
    options: Partial<ComponentPoolOptions> = {}
  ): ObjectPool<T> {
    // Check if pool already exists
    const poolKey = `component:${componentType}`;
    if (this.pools.has(poolKey)) {
      return this.pools.get(poolKey) as ObjectPool<T>;
    }
    
    // Merge with default options
    const config = { ...DEFAULT_COMPONENT_POOL_OPTIONS, ...options };
    
    // Create a new pool
    const pool = new ObjectPool<T>(
      factory, 
      config.initialSize,
      config.maxSize,
      config.resetFn as (obj: T) => void
    );
    
    // Store the pool
    this.pools.set(poolKey, pool);
    
    this.logger.debug(`Created component pool for type: ${componentType}`);
    return pool;
  }
  
  /**
   * Create a generic object pool
   * 
   * @param poolKey A unique identifier for the pool
   * @param factory Factory function to create objects
   * @param initialSize Initial size of the pool
   * @param maxSize Maximum size of the pool
   * @param resetFn Optional function to reset objects
   * @returns The created object pool
   */
  public static createPool<T>(
    poolKey: string,
    factory: IPoolObjectFactory<T>,
    initialSize: number = 0,
    maxSize: number = 1000,
    resetFn?: (obj: T) => void
  ): ObjectPool<T> {
    // Check if pool already exists
    if (this.pools.has(poolKey)) {
      return this.pools.get(poolKey) as ObjectPool<T>;
    }
    
    // Create a new pool
    const pool = new ObjectPool<T>(factory, initialSize, maxSize, resetFn);
    
    // Store the pool
    this.pools.set(poolKey, pool);
    
    this.logger.debug(`Created object pool: ${poolKey}`);
    return pool;
  }
  
  /**
   * Get an existing pool by key
   * 
   * @param poolKey The unique identifier for the pool
   * @returns The pool instance or undefined if not found
   */
  public static getPool<T>(poolKey: string): ObjectPool<T> | undefined {
    return this.pools.get(poolKey) as ObjectPool<T> | undefined;
  }
  
  /**
   * Check if a pool exists
   * 
   * @param poolKey The unique identifier for the pool
   * @returns True if the pool exists
   */
  public static hasPool(poolKey: string): boolean {
    return this.pools.has(poolKey);
  }
  
  /**
   * Remove a pool
   * 
   * @param poolKey The unique identifier for the pool
   * @returns True if the pool was successfully removed
   */
  public static removePool(poolKey: string): boolean {
    if (!this.pools.has(poolKey)) {
      return false;
    }
    
    // Clear the pool before removing it
    const pool = this.pools.get(poolKey);
    if (pool) {
      pool.clear();
    }
    
    // Remove from the map
    const result = this.pools.delete(poolKey);
    if (result) {
      this.logger.debug(`Removed object pool: ${poolKey}`);
    }
    
    return result;
  }
  
  /**
   * Clear all pools
   */
  public static clearAllPools(): void {
    // Clear each pool
    this.pools.forEach(pool => pool.clear());
    
    // Clear the pools map
    this.pools.clear();
    
    this.logger.debug('All object pools cleared');
  }
  
  /**
   * Get statistics for all pools
   * 
   * @returns An object with pool statistics
   */
  public static getPoolStats(): { [key: string]: { total: number, available: number } } {
    const stats: { [key: string]: { total: number, available: number } } = {};
    
    this.pools.forEach((pool, key) => {
      stats[key] = {
        total: pool.getSize(),
        available: pool.available()
      };
    });
    
    return stats;
  }
} 