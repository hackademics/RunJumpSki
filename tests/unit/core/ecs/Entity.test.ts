/**
 * @file tests/unit/core/ecs/Entity.test.ts
 * @description Unit tests for the Entity class
 */

import { Entity } from '../../../../src/core/ecs/Entity';
import { Component } from '../../../../src/core/ecs/Component';
import { ComponentError } from '../../../../src/core/utils/errors/ComponentError';

// Mock uuid library
jest.mock('uuid', () => ({
  v4: jest.fn()
    .mockReturnValueOnce('mock-uuid-1')
    .mockReturnValueOnce('mock-uuid-2')
    .mockReturnValue('mock-uuid-3')
}));

// Mock Component for testing
class TestComponent extends Component {
  public readonly type = 'test';
  private value = 0;

  constructor() {
    super({ type: 'test' });
  }

  public update(deltaTime: number): void {
    this.value += deltaTime;
  }

  public getValue(): number {
    return this.value;
  }
}

// Create a unique component for each test to avoid duplicate component issues
class AnotherTestComponent extends Component {
  public readonly type = 'another-test';
  
  constructor() {
    super({ type: 'another-test' });
  }
  
  public update(): void {}
}

describe('Entity', () => {
  let entity: Entity;

  beforeEach(() => {
    jest.clearAllMocks();
    entity = new Entity();
  });

  describe('Constructor', () => {
    test('should generate a unique ID if not provided', () => {
      const entity1 = new Entity();
      const entity2 = new Entity();
      
      expect(entity1.id).toBeDefined();
      expect(entity2.id).toBeDefined();
      expect(entity1.id).not.toEqual(entity2.id);
    });

    test('should use provided ID if given', () => {
      const customId = 'custom-entity-id';
      const entity = new Entity(customId);
      
      expect(entity.id).toEqual(customId);
    });
  });

  describe('Component Management', () => {
    test('should add a component successfully', () => {
      const component = new TestComponent();
      const addedComponent = entity.addComponent(component);
      
      expect(addedComponent).toBe(component);
      expect(entity.getComponent('test')).toBe(component);
    });

    test('should throw error when adding duplicate component', () => {
      const component1 = new TestComponent();
      const component2 = new TestComponent();
      
      entity.addComponent(component1);
      
      expect(() => entity.addComponent(component2)).toThrow(ComponentError);
    });

    test('should retrieve a specific component', () => {
      const component = new TestComponent();
      entity.addComponent(component);
      
      const retrievedComponent = entity.getComponent<TestComponent>('test');
      expect(retrievedComponent).toBe(component);
    });

    test('should remove a component', () => {
      const component = new TestComponent();
      entity.addComponent(component);
      
      const result = entity.removeComponent('test');
      
      expect(result).toBe(true);
      expect(entity.getComponent('test')).toBeUndefined();
    });

    test('should return false when removing non-existent component', () => {
      const result = entity.removeComponent('non-existent');
      
      expect(result).toBe(false);
    });
  });

  describe('Update and Dispose', () => {
    test('should update all components', () => {
      const component1 = new TestComponent();
      const component2 = new AnotherTestComponent();
      
      const spy1 = jest.spyOn(component1, 'update');
      const spy2 = jest.spyOn(component2, 'update');
      
      entity.addComponent(component1);
      entity.addComponent(component2);
      
      const deltaTime = 0.16;
      entity.update(deltaTime);
      
      expect(spy1).toHaveBeenCalledWith(deltaTime);
      expect(spy2).toHaveBeenCalledWith(deltaTime);
    });

    test('should dispose of all components', () => {
      const component1 = new TestComponent();
      const component2 = new AnotherTestComponent();
      
      const spy1 = jest.spyOn(component1, 'dispose');
      const spy2 = jest.spyOn(component2, 'dispose');
      
      entity.addComponent(component1);
      entity.addComponent(component2);
      
      entity.dispose();
      
      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
      expect(entity.getComponent('test')).toBeUndefined();
    });
  });
});