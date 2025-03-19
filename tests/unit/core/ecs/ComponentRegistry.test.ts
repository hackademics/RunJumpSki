/**
 * @file tests/unit/core/ecs/ComponentRegistry.test.ts
 * @description Unit tests for the ComponentRegistry class
 */

import { ComponentRegistry } from '../../../../src/core/ecs/ComponentRegistry';
import { Component } from '../../../../src/core/ecs/Component';
import { ComponentOptions } from '../../../../src/core/ecs/IComponent';

// Test components for registration
class TestComponentA extends Component {
  public readonly type = 'test-a';
  
  constructor(options: ComponentOptions = { type: 'test-a' }) {
    super(options);
  }

  public update(deltaTime: number): void {}
}

class TestComponentB extends Component {
  public readonly type = 'test-b';
  
  constructor(options: ComponentOptions = { type: 'test-b' }) {
    super(options);
  }

  public update(deltaTime: number): void {}
}

describe('ComponentRegistry', () => {
  let registry: ComponentRegistry;

  beforeEach(() => {
    // Get a fresh singleton instance
    registry = ComponentRegistry.getInstance();
    
    // Clear any existing registrations before each test
    registry.clear();
  });

  describe('Singleton Instance', () => {
    test('should return the same instance multiple times', () => {
      const instance1 = ComponentRegistry.getInstance();
      const instance2 = ComponentRegistry.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Component Registration', () => {
    test('should register a component successfully', () => {
      registry.registerComponent(TestComponentA);
      
      expect(registry.hasComponent('test-a')).toBe(true);
    });

    test('should throw error when registering duplicate component type', () => {
      registry.registerComponent(TestComponentA);
      
      expect(() => {
        registry.registerComponent(TestComponentA);
      }).toThrow('Component type \'test-a\' is already registered');
    });

    test('should retrieve registered component constructor', () => {
      registry.registerComponent(TestComponentA);
      
      const constructor = registry.getComponentConstructor('test-a');
      expect(constructor).toBe(TestComponentA);
    });
  });

  describe('Component Metadata', () => {
    test('should store metadata when registering a component', () => {
      const beforeRegistration = Date.now();
      registry.registerComponent(TestComponentA);
      const afterRegistration = Date.now();
      
      const metadata = registry.getComponentMetadata('test-a');
      
      expect(metadata).toBeDefined();
      expect(metadata?.type).toBe('test-a');
      expect(metadata?.registeredAt).toBeGreaterThanOrEqual(beforeRegistration);
      expect(metadata?.registeredAt).toBeLessThanOrEqual(afterRegistration);
    });

    test('should return undefined for non-existent component metadata', () => {
      const metadata = registry.getComponentMetadata('non-existent');
      
      expect(metadata).toBeUndefined();
    });
  });

  describe('Component Type Queries', () => {
    test('should check if a component is registered', () => {
      expect(registry.hasComponent('test-a')).toBe(false);
      
      registry.registerComponent(TestComponentA);
      
      expect(registry.hasComponent('test-a')).toBe(true);
    });

    test('should get list of registered component types', () => {
      registry.registerComponent(TestComponentA);
      registry.registerComponent(TestComponentB);
      
      const registeredTypes = registry.getRegisteredComponentTypes();
      
      expect(registeredTypes).toHaveLength(2);
      expect(registeredTypes).toContain('test-a');
      expect(registeredTypes).toContain('test-b');
    });
  });

  describe('Registry Clearing', () => {
    test('should clear all registered components', () => {
      registry.registerComponent(TestComponentA);
      registry.registerComponent(TestComponentB);
      
      registry.clear();
      
      expect(registry.getRegisteredComponentTypes()).toHaveLength(0);
      expect(registry.hasComponent('test-a')).toBe(false);
      expect(registry.hasComponent('test-b')).toBe(false);
    });
  });
});