/**
 * @file src/core/ecs/ComponentRegistry.ts
 * @description Provides a centralized registry for component types in the Entity Component System
 * 
 * @dependencies IComponent, Logger
 * @relatedFiles IComponent.ts, Component.ts
 */

import { IComponent } from './IComponent';
import { Logger } from '../utils/Logger';

/**
 * Type definition for a component constructor
 */
export type ComponentConstructor<T extends IComponent> = new (...args: any[]) => T;

/**
 * Represents metadata about a registered component type
 */
export interface ComponentMetadata {
  /**
   * Unique type identifier for the component
   */
  type: string;

  /**
   * Timestamp of registration
   */
  registeredAt: number;
}

/**
 * Manages registration and tracking of component types
 */
export class ComponentRegistry {
  /**
   * Singleton instance of the ComponentRegistry
   * @private
   */
  private static instance?: ComponentRegistry;

  /**
   * Map of registered component constructors
   * @private
   */
  private componentTypes: Map<string, ComponentConstructor<IComponent>> = new Map();

  /**
   * Map of component metadata
   * @private
   */
  private componentMetadata: Map<string, ComponentMetadata> = new Map();

  /**
   * Logger for tracking component registry events
   * @private
   */
  private logger: Logger;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.logger = new Logger('ComponentRegistry');
  }

  /**
   * Get the singleton instance of the ComponentRegistry
   * 
   * @returns The ComponentRegistry instance
   */
  public static getInstance(): ComponentRegistry {
    if (!ComponentRegistry.instance) {
      ComponentRegistry.instance = new ComponentRegistry();
    }
    return ComponentRegistry.instance;
  }

  /**
   * Register a new component type
   * 
   * @template T The type of component to register
   * @param componentConstructor The constructor for the component type
   * @throws {Error} If a component with the same type is already registered
   */
  public registerComponent<T extends IComponent>(
    componentConstructor: ComponentConstructor<T>
  ): void {
    // Create an instance to get the type
    const tempComponent = new componentConstructor({} as any);
    const type = tempComponent.type;

    // Check if component type is already registered
    if (this.componentTypes.has(type)) {
      const error = new Error(`Component type '${type}' is already registered`);
      this.logger.error(error.message);
      throw error;
    }

    // Register the component constructor
    this.componentTypes.set(type, componentConstructor);

    // Store metadata
    this.componentMetadata.set(type, {
      type,
      registeredAt: Date.now()
    });

    this.logger.debug(`Registered component type: ${type}`);
  }

  /**
   * Get the constructor for a registered component type
   * 
   * @template T The expected component type
   * @param type The type identifier of the component
   * @returns The component constructor, or undefined if not found
   */
  public getComponentConstructor<T extends IComponent>(
    type: string
  ): ComponentConstructor<T> | undefined {
    return this.componentTypes.get(type) as ComponentConstructor<T> | undefined;
  }

  /**
   * Check if a component type is registered
   * 
   * @param type The type identifier of the component
   * @returns Boolean indicating whether the component type is registered
   */
  public hasComponent(type: string): boolean {
    return this.componentTypes.has(type);
  }

  /**
   * Get metadata for a registered component type
   * 
   * @param type The type identifier of the component
   * @returns Component metadata, or undefined if not found
   */
  public getComponentMetadata(type: string): ComponentMetadata | undefined {
    return this.componentMetadata.get(type);
  }

  /**
   * Get all registered component types
   * 
   * @returns An array of registered component type identifiers
   */
  public getRegisteredComponentTypes(): string[] {
    return Array.from(this.componentTypes.keys());
  }

  /**
   * Clear all registered component types
   * 
   * @remarks Use with caution, typically only for testing or reset scenarios
   */
  public clear(): void {
    this.componentTypes.clear();
    this.componentMetadata.clear();
    this.logger.debug('Component registry cleared');
  }
}