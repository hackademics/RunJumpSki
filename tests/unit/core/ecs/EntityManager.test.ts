/**
 * @file tests/unit/core/ecs/EntityManager.test.ts
 * @description Unit tests for the EntityManager class
 */

import { EntityManager } from '../../../../src/core/ecs/EntityManager';
import { Entity } from '../../../../src/core/ecs/Entity';
import { EventBus } from '../../../../src/core/events/EventBus';

describe('EntityManager', () => {
  let entityManager: EntityManager;
  let eventBus: EventBus;

  beforeEach(() => {
    entityManager = new EntityManager({ debug: true });
    eventBus = EventBus.getInstance();
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
      const eventSpy = jest.spyOn(eventBus, 'emit');
      
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
      const eventSpy = jest.spyOn(eventBus, 'emit');
      
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
    test('should update all entities', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();
      
      const updateSpy1 = jest.spyOn(entity1, 'update');
      const updateSpy2 = jest.spyOn(entity2, 'update');
      
      const deltaTime = 0.16;
      entityManager.update(deltaTime);
      
      expect(updateSpy1).toHaveBeenCalledWith(deltaTime);
      expect(updateSpy2).toHaveBeenCalledWith(deltaTime);
    });
  });

  describe('Advanced Entity Management', () => {
    test('should find entities using filter', () => {
      const entity1 = entityManager.createEntity('entity1');
      const entity2 = entityManager.createEntity('entity2');
      
      const filteredEntities = entityManager.findEntities(
        entity => entity.id.includes('entity1')
      );
      
      expect(filteredEntities).toHaveLength(1);
      expect(filteredEntities[0]).toBe(entity1);
    });

    test('should clear all entities', () => {
      entityManager.createEntity();
      entityManager.createEntity();
      
      const eventSpy = jest.spyOn(eventBus, 'emit');
      
      entityManager.clear();
      
      expect(entityManager.getEntityCount()).toBe(0);
      expect(eventSpy).toHaveBeenCalledWith('entities:cleared', {});
    });
  });
});