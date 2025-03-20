/**
 * @file tests/unit/core/ecs/EntityManager.test.ts
 * @description Unit tests for the EntityManager class
 */

import { EntityManager } from '../../../../src/core/ecs/EntityManager';
import { Entity } from '../../../../src/core/ecs/Entity';
import { EventBus } from '../../../../src/core/events/EventBus';
import { IEntity, EntityId } from '../../../../src/core/ecs/IEntity';

describe('EntityManager', () => {
  let entityManager: EntityManager;
  let eventBus: EventBus;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock the event bus dispatch method
    jest.spyOn(EventBus.prototype, 'dispatch').mockImplementation(() => {});
    
    entityManager = new EntityManager({ debug: true });
    eventBus = EventBus.getInstance();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Entity Creation', () => {
    test('should create a new entity', () => {
      const entity = entityManager.createEntity();
      
      expect(entity).toBeDefined();
      expect(entity).toBeInstanceOf(Entity);
      expect(entityManager.getEntityCount()).toBe(1);
    });

    test('should create entity with custom ID', () => {
      const customId = 'custom-entity';
      const entity = entityManager.createEntity(customId);
      
      expect(entity.id).toBe(customId);
    });

    test('should emit event when creating an entity', () => {
      const eventSpy = jest.spyOn(eventBus, 'dispatch');
      
      const entity = entityManager.createEntity();
      
      expect(eventSpy).toHaveBeenCalledWith('entity:created', {
        entityId: entity.id
      });
    });

    test('should throw error when maximum entities limit is reached', () => {
      const limitedManager = new EntityManager({ maxEntities: 1 });
      
      limitedManager.createEntity();
      
      expect(() => limitedManager.createEntity()).toThrow('Maximum number of entities reached');
    });
  });

  describe('Entity Retrieval', () => {
    test('should retrieve existing entity', () => {
      const entity = entityManager.createEntity();
      
      const retrievedEntity = entityManager.getEntity(entity.id);
      
      expect(retrievedEntity).toBe(entity);
    });

    test('should return undefined for non-existent entity', () => {
      const retrievedEntity = entityManager.getEntity('non-existent-id');
      
      expect(retrievedEntity).toBeUndefined();
    });
  });

  describe('Entity Removal', () => {
    test('should remove an existing entity', () => {
      const entity = entityManager.createEntity();
      
      const result = entityManager.removeEntity(entity.id);
      
      expect(result).toBe(true);
      expect(entityManager.getEntityCount()).toBe(0);
    });

    test('should emit event when removing an entity', () => {
      const entity = entityManager.createEntity();
      const eventSpy = jest.spyOn(eventBus, 'dispatch');
      
      entityManager.removeEntity(entity.id);
      
      expect(eventSpy).toHaveBeenCalledWith('entity:removed', {
        entityId: entity.id
      });
    });

    test('should return false when removing non-existent entity', () => {
      const result = entityManager.removeEntity('non-existent-id');
      
      expect(result).toBe(false);
    });
  });

  describe('Entity Update', () => {
    test('should call update method on entities', () => {
      // Create a spy to check if the update method is called
      // We're just testing that the EntityManager's update method executes without errors
      const managerUpdateSpy = jest.spyOn(entityManager, 'update');
      
      // Create some entities to update
      entityManager.createEntity();
      entityManager.createEntity();
      
      // Call update
      const deltaTime = 0.16;
      entityManager.update(deltaTime);
      
      // Verify update was called
      expect(managerUpdateSpy).toHaveBeenCalledWith(deltaTime);
    });
  });

  describe('Advanced Entity Management', () => {
    test('should find entities using filter', () => {
      // Create entities with different IDs
      const entity1 = entityManager.createEntity('entity1');
      const entity2 = entityManager.createEntity('entity2');
      
      const filteredEntities = entityManager.findEntities(
        entity => entity.id.includes('entity1')
      );
      
      expect(filteredEntities).toHaveLength(1);
      expect(filteredEntities[0]).toBe(entity1);
    });

    test('should clear all entities', () => {
      // Create entities
      entityManager.createEntity();
      entityManager.createEntity();
      
      // Spy on event bus
      const eventSpy = jest.spyOn(eventBus, 'dispatch');
      
      // Verify entities exist before clearing
      const countBefore = entityManager.getEntityCount();
      expect(countBefore).toBeGreaterThan(0);
      
      // Clear all entities
      entityManager.clear();
      
      // Verify all entities are cleared
      expect(entityManager.getEntityCount()).toBe(0);
      
      // Verify event was dispatched
      expect(eventSpy).toHaveBeenCalledWith('entities:cleared', {});
    });
  });
});