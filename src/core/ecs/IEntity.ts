/**
 * @file src/core/ecs/IEntity.ts
 * @description Defines the core interface for entities in the Entity Component System
 * 
 * @dependencies IComponent
 * @relatedFiles Entity.ts, Component.ts
 */

import { IComponent } from './IComponent';

/**
 * Represents a unique identifier for an entity
 */
export type EntityId = string;

/**
 * Interface defining the contract for entities in the game engine
 * 
 * @remarks
 * Entities are the basic building blocks of the game world.
 * They are containers for components that define their behavior and properties.
 */
export interface IEntity {
  /**
   * Unique identifier for the entity
   * @readonly
   */
  readonly id: EntityId;

  /**
   * Add a component to the entity
   * 
   * @template T The type of component to add
   * @param component The component to be added
   * @returns The added component
   */
  addComponent<T extends IComponent>(component: T): T;

  /**
   * Retrieve a component of a specific type from the entity
   * 
   * @template T The type of component to retrieve
   * @param type The string identifier of the component type
   * @returns The component of the specified type, or undefined if not found
   */
  getComponent<T extends IComponent>(type: string): T | undefined;

  /**
   * Remove a component from the entity
   * 
   * @param type The string identifier of the component type to remove
   * @returns Boolean indicating whether the component was successfully removed
   */
  removeComponent(type: string): boolean;

  /**
   * Update the entity and its components
   * 
   * @param deltaTime The time elapsed since the last update
   */
  update(deltaTime: number): void;

  /**
   * Dispose of the entity and clean up its resources
   */
  dispose(): void;
}