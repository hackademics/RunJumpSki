/**
 * @file src/core/ecs/EntityManager.ts
 * @description Manages entities in the game engine's Entity Component System
 * 
 * @dependencies IEntity, Entity, Logger
 * @relatedFiles IEntity.ts, Entity.ts
 */

import { IEntity, EntityId } from './IEntity';
import { Entity } from './Entity';
import { Logger } from '../utils/Logger';
import { EventBus } from '../events/EventBus';
import { System } from '../base/System';
import { SystemOptions } from '../base/ISystem';
import { LogLevel } from '../utils/ILogger';

/**
 * Configuration options for the EntityManager
 */
export interface EntityManagerOptions {
  /**
   * Maximum number of entities allowed
   * @defaultValue Infinity
   */
  maxEntities?: number;

  /**
   * Whether to enable debug logging
   * @defaultValue false
   */
  debug?: boolean;
}

/**
 * Default configuration for the EntityManager
 */
const DEFAULT_OPTIONS: Required<EntityManagerOptions> = {
  maxEntities: Infinity,
  debug: false
};

/**
 * Manages the lifecycle and collection of entities in the game engine
 */
export class EntityManager extends System {
  /**
   * Collection of active entities
   * @private
   */
  private entities: Map<EntityId, IEntity> = new Map();

  /**
   * Logger for tracking entity management events
   * @private
   */
  private logger: Logger;

  /**
   * Event bus for publishing entity-related events
   * @private
   */
  private eventBus: EventBus;

  /**
   * Configuration options for the entity manager
   * @private
   */
  private options: Required<EntityManagerOptions>;

  /**
   * Create a new EntityManager
   * 
   * @param options Configuration options for the entity manager
   */
  constructor(options: EntityManagerOptions = {}) {
    super({ name: 'EntityManager' });

    // Merge provided options with defaults
    this.options = { ...DEFAULT_OPTIONS, ...options } as Required<EntityManagerOptions>;

    // Initialize logger
    this.logger = new Logger('EntityManager', this.options.debug ? LogLevel.DEBUG : LogLevel.INFO);

    // Get event bus instance
    this.eventBus = EventBus.getInstance();
  }

  /**
   * Create a new entity
   * 
   * @param id Optional custom ID for the entity
   * @returns The newly created entity
   * @throws {Error} If maximum entity limit is reached
   */
  public createEntity(id?: string): IEntity {
    // Check entity limit
    if (this.entities.size >= this.options.maxEntities) {
      const error = new Error('Maximum number of entities reached');
      this.logger.error(error.message);
      throw error;
    }

    // Create new entity
    const entity = new Entity(id);

    // Add to entities collection
    this.entities.set(entity.id, entity);

    // Log entity creation
    this.logger.debug(`Created entity: ${entity.id}`);

    // Emit entity creation event
    this.eventBus.dispatch('entity:created', { 
      entityId: entity.id 
    });

    return entity;
  }

  /**
   * Get an entity by its ID
   * 
   * @param id The ID of the entity to retrieve
   * @returns The entity with the specified ID, or undefined if not found
   */
  public getEntity(id: EntityId): IEntity | undefined {
    return this.entities.get(id);
  }

  /**
   * Remove an entity from the manager
   * 
   * @param id The ID of the entity to remove
   * @returns Boolean indicating whether the entity was successfully removed
   */
  public removeEntity(id: EntityId): boolean {
    const entity = this.entities.get(id);

    if (entity) {
      try {
        // Dispose of the entity
        entity.dispose();

        // Remove from entities collection
        this.entities.delete(id);

        // Log entity removal
        this.logger.debug(`Removed entity: ${id}`);

        // Emit entity removal event
        this.eventBus.dispatch('entity:removed', {
          entityId: id
        });

        return true;
      } catch (error) {
        this.logger.error(`Error removing entity ${id}: ${error}`);
        return false;
      }
    }

    return false;
  }

  /**
   * Update all active entities
   * 
   * @param deltaTime The time elapsed since the last update
   */
  public override update(deltaTime: number): void {
    // Update each entity
    this.entities.forEach(entity => {
      try {
        entity.update(deltaTime);
      } catch (error) {
        this.logger.error(`Error updating entity ${entity.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  /**
   * Get the total number of active entities
   * 
   * @returns The number of entities in the manager
   */
  public getEntityCount(): number {
    return this.entities.size;
  }

  /**
   * Clear all entities from the manager
   */
  public clear(): void {
    // Dispose of all entities
    this.entities.forEach(entity => {
      try {
        entity.dispose();
      } catch (error) {
        this.logger.error(`Error disposing entity ${entity.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Clear the entities collection
    this.entities.clear();

    this.logger.debug('Cleared all entities');

    // Emit entities cleared event
    this.eventBus.dispatch('entities:cleared', {});
  }

  /**
   * Get all entities that match a filter condition
   * 
   * @param filter A function to filter entities
   * @returns An array of entities that match the filter
   */
  public findEntities(filter: (entity: IEntity) => boolean): IEntity[] {
    return Array.from(this.entities.values()).filter(filter);
  }
}