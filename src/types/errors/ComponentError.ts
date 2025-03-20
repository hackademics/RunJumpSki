/**
 * @file src/types/errors/ComponentError.ts
 * @description Error class for component-related errors
 */

/**
 * Error thrown by components when an operation fails
 */
export class ComponentError extends Error {
  /**
   * Create a component error
   * 
   * @param componentType - Type of component that threw the error
   * @param entityId - ID of the entity related to the error (optional)
   * @param message - Error message
   */
  constructor(
    public readonly componentType: string,
    public readonly entityId: string | undefined,
    message: string
  ) {
    super(`${componentType}${entityId ? ` (${entityId})` : ''}: ${message}`);
    this.name = 'ComponentError';
  }
} 