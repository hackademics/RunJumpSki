/**
 * @file src/core/ecs/Component.ts
 * @description Implements the base Component class for the Entity Component System
 * 
 * @dependencies IComponent, IEntity, Logger
 * @relatedFiles IComponent.ts, IEntity.ts
 */

import { IComponent, ComponentOptions } from './IComponent';
import { IEntity } from './IEntity';
import { Logger } from '../utils/Logger';
import { ComponentError } from '../utils/errors/ComponentError';

/**
 * Abstract base class for components in the game engine
 * 
 * @remarks
 * Provides a standard implementation for component lifecycle and management
 * Subclasses should override update() method with specific behavior
 */
export abstract class Component implements IComponent {
  /**
   * Unique type identifier for the component
   * @readonly
   */
  public abstract readonly type: string;

  /**
   * The entity this component is attached to
   * @protected
   */
  protected entity?: IEntity;

  /**
   * Logger for tracking component-related events and errors
   * @protected
   */
  protected logger: Logger;

  /**
   * Indicates whether the component is currently enabled
   * @private
   */
  private enabled: boolean;

  /**
   * Create a new component
   * 
   * @param options Configuration options for the component
   */
  constructor(options: ComponentOptions) {
    // Ensure type is provided
    if (!options.type) {
      throw new Error('Component must have a type');
    }

    // Initialize logger
    this.logger = new Logger(`Component:${options.type}`);

    // Set enabled state, defaulting to true if not specified
    this.enabled = options.enabled ?? true;
  }

  /**
   * Initialize the component and attach it to an entity
   * 
   * @param entity The entity to which this component is being added
   * @throws {ComponentError} If initialization fails
   */
  public init(entity: IEntity): void {
    try {
      // Store reference to the entity
      this.entity = entity;

      // Log initialization
      this.logger.debug(`Initialized on entity ${entity.id}`);
    } catch (error) {
      const initError = new ComponentError(
        this.type, 
        entity.id, 
        `Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      this.logger.error(initError.message);
      throw initError;
    }
  }

  /**
   * Update the component's state
   * 
   * @param deltaTime The time elapsed since the last update
   * @remarks Subclasses should override this method with specific update logic
   */
  public abstract update(deltaTime: number): void;

  /**
   * Dispose of the component and clean up its resources
   */
  public dispose(): void {
    try {
      // Clear entity reference
      this.entity = undefined;

      // Log disposal
      this.logger.debug('Component disposed');
    } catch (error) {
      this.logger.error(`Error during disposal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if the component is currently enabled
   * 
   * @returns Boolean indicating whether the component is enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable or disable the component
   * 
   * @param enabled Whether the component should be enabled
   */
  public setEnabled(enabled: boolean): void {
    if (this.enabled !== enabled) {
      this.enabled = enabled;
      this.logger.debug(`Component ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Get the entity this component is attached to
   * 
   * @returns The attached entity, or undefined if not attached
   * @throws {ComponentError} If trying to access entity before initialization
   */
  protected getEntity(): IEntity {
    if (!this.entity) {
      throw new ComponentError(
        this.type, 
        'unknown', 
        'Attempting to access entity before initialization'
      );
    }
    return this.entity;
  }
}