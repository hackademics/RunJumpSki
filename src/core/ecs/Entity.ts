/**
 * @file src/core/ecs/Entity.ts
 * @description Implements the base Entity class for the Entity Component System
 * 
 * @dependencies IEntity, IComponent, Logger
 * @relatedFiles IEntity.ts, IComponent.ts
 */

import { v4 as uuidv4 } from 'uuid';
import { IEntity, EntityId } from './IEntity';
import { IComponent } from './IComponent';
import { Logger } from '../utils/Logger';
import { ComponentError } from '../utils/errors/ComponentError';

/**
 * Base implementation of the IEntity interface
 * 
 * @remarks
 * Provides a standard implementation for entity management in the game engine.
 * Handles component addition, retrieval, and lifecycle management.
 */
export class Entity implements IEntity {
  /**
   * Unique identifier for the entity
   */
  public readonly id: EntityId;

  /**
   * Map of components attached to this entity
   * @private
   */
  private components: Map<string, IComponent> = new Map();

  /**
   * Logger for tracking entity-related events and errors
   * @private
   */
  private logger: Logger;

  /**
   * Create a new entity
   * 
   * @param id Optional custom ID, generates a UUID if not provided
   */
  constructor(id?: string) {
    this.id = id || uuidv4();
    this.logger = new Logger(`Entity:${this.id}`);
  }

  /**
   * Add a component to the entity
   * 
   * @template T The type of component to add
   * @param component The component to be added
   * @returns The added component
   * @throws {ComponentError} If a component of the same type already exists
   */
  public addComponent<T extends IComponent>(component: T): T {
    // Check if component with this type already exists
    if (this.components.has(component.type)) {
      const error = new ComponentError(
        component.type, 
        this.id, 
        `Component of type ${component.type} already exists`
      );
      this.logger.error(error.message);
      throw error;
    }

    // Store the component
    this.components.set(component.type, component);

    try {
      // Initialize the component
      component.initialize(this);
      
      this.logger.debug(`Added component: ${component.type}`);
      return component;
    } catch (initError) {
      // Remove the component if initialization fails
      this.components.delete(component.type);
      const error = new ComponentError(
        component.type, 
        this.id, 
        `Failed to initialize component: ${initError instanceof Error ? initError.message : 'Unknown error'}`
      );
      this.logger.error(error.message);
      throw error;
    }
  }

  /**
   * Retrieve a component of a specific type from the entity
   * 
   * @template T The type of component to retrieve
   * @param type The string identifier of the component type
   * @returns The component of the specified type, or undefined if not found
   */
  public getComponent<T extends IComponent>(type: string): T | undefined {
    return this.components.get(type) as T | undefined;
  }

  /**
   * Remove a component from the entity
   * 
   * @param type The string identifier of the component type to remove
   * @returns Boolean indicating whether the component was successfully removed
   */
  public removeComponent(type: string): boolean {
    const component = this.components.get(type);
    
    if (component) {
      try {
        // Dispose of the component
        component.dispose();
        
        // Remove from the components map
        this.components.delete(type);
        
        this.logger.debug(`Removed component: ${type}`);
        return true;
      } catch (error) {
        this.logger.error(`Error removing component ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return false;
      }
    }
    
    return false;
  }

  /**
   * Update the entity and its components
   * 
   * @param deltaTime The time elapsed since the last update
   */
  public update(deltaTime: number): void {
    // Update each enabled component
    this.components.forEach(component => {
      if (component.isEnabled()) {
        try {
          component.update(deltaTime);
        } catch (error) {
          this.logger.error(`Error updating component ${component.type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    });
  }

  /**
   * Dispose of the entity and clean up its resources
   */
  public dispose(): void {
    // Dispose of all components
    this.components.forEach(component => {
      try {
        component.dispose();
      } catch (error) {
        this.logger.error(`Error disposing component ${component.type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Clear the components map
    this.components.clear();

    this.logger.debug('Entity disposed');
  }
}
