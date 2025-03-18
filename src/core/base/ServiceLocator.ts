/**
 * @file src/core/base/ServiceLocator.ts
 * @description Dependency injection container
 */

/**
 * Dependency injection container
 * The ServiceLocator provides a central registry for services
 * and dependencies, allowing for loose coupling between components.
 */
export class ServiceLocator {
  /**
   * Singleton instance
   */
  private static instance: ServiceLocator;
  
  /**
   * Map of registered services
   */
  private services: Map<string, any> = new Map();
  
  /**
   * Private constructor to prevent direct instantiation
   */
  private constructor() {}
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ServiceLocator {
    if (!ServiceLocator.instance) {
      ServiceLocator.instance = new ServiceLocator();
    }
    return ServiceLocator.instance;
  }
  
  /**
   * Register a service
   * @param key Unique identifier for the service
   * @param service The service instance
   */
  public register<T>(key: string, service: T): void {
    if (this.services.has(key)) {
      console.warn(`Service '${key}' is being overwritten`);
    }
    this.services.set(key, service);
  }
  
  /**
   * Get a service
   * @param key Unique identifier for the service
   * @returns The service instance
   * @throws Error if the service is not found
   */
  public get<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service not found: ${key}`);
    }
    return service as T;
  }
  
  /**
   * Check if a service exists
   * @param key Unique identifier for the service
   * @returns Whether the service exists
   */
  public has(key: string): boolean {
    return this.services.has(key);
  }
  
  /**
   * Remove a service
   * @param key Unique identifier for the service
   * @returns Whether the service was removed
   */
  public remove(key: string): boolean {
    return this.services.delete(key);
  }
  
  /**
   * Clear all services
   * Primarily used for testing
   */
  public clear(): void {
    this.services.clear();
  }
}
