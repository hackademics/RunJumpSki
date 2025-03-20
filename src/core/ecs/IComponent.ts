/**
 * @file src/core/ecs/IComponent.ts
 * @description Defines the core interface for components in the Entity Component System
 * 
 * @dependencies IEntity
 * @relatedFiles Entity.ts, IEntity.ts
 */

import { IEntity } from './IEntity';

/**
 * Options for component initialization and configuration
 */
export interface ComponentOptions {
  /**
   * Type identifier for the component
   */
  type: string;

  /**
   * Whether the component is initially enabled
   * @defaultValue true
   */
  enabled?: boolean;
}

/**
 * Interface defining the contract for components in the game engine
 * 
 * @remarks
 * Components are pure data/behavior containers that can be attached to entities.
 * They define specific aspects of an entity's functionality.
 */
export interface IComponent {
  /**
   * Unique type identifier for the component
   * @readonly
   */
  readonly type: string;

  /**
   * Initialize the component and attach it to an entity
   * 
   * @param entity The entity to which this component is being added
   */
  initialize(entity: IEntity): void;

  /**
   * Update the component's state
   * 
   * @param deltaTime The time elapsed since the last update
   */
  update(deltaTime: number): void;

  /**
   * Dispose of the component and clean up its resources
   */
  dispose(): void;

  /**
   * Check if the component is currently enabled
   * 
   * @returns Boolean indicating whether the component is enabled
   */
  isEnabled(): boolean;

  /**
   * Enable or disable the component
   * 
   * @param enabled Whether the component should be enabled
   */
  setEnabled(enabled: boolean): void;
}
