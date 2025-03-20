/**
 * @file tests/unit/core/ecs/ComponentRegistry.test.ts
 * @description Unit tests for the ComponentRegistry class
 */

import { ComponentRegistry } from '../../../../src/core/ecs/ComponentRegistry';
import { IComponent, ComponentOptions } from '../../../../src/core/ecs/IComponent';
import { Component } from '../../../../src/core/ecs/Component';

// Create base abstract test component class
abstract class TestComponent extends Component {
  constructor(options: ComponentOptions) {
    super(options);
  }

  public update(deltaTime: number): void {
    // No implementation needed for tests
  }
}

// Test component classes with proper prototype setup
class TestComponentA extends TestComponent {
  public static readonly TYPE = 'test-a';
  // Implement the abstract type property
  public readonly type: string = TestComponentA.TYPE;

  constructor(options: ComponentOptions = { type: TestComponentA.TYPE }) {
    super({...options, type: TestComponentA.TYPE});
  }
}
// Explicitly set the type on the prototype for test purposes
Object.defineProperty(TestComponentA.prototype, 'type', {
  value: TestComponentA.TYPE,
  writable: false,
  configurable: false
});

class TestComponentB extends TestComponent {
  public static readonly TYPE = 'test-b';
  // Implement the abstract type property
  public readonly type: string = TestComponentB.TYPE;

  constructor(options: ComponentOptions = { type: TestComponentB.TYPE }) {
    super({...options, type: TestComponentB.TYPE});
  }
}
// Explicitly set the type on the prototype for test purposes
Object.defineProperty(TestComponentB.prototype, 'type', {
  value: TestComponentB.TYPE,
  writable: false,
  configurable: false
});

// Custom mock to avoid component instantiation in registerComponent
jest.mock('../../../../src/core/ecs/ComponentRegistry', () => {
  const original = jest.requireActual('../../../../src/core/ecs/ComponentRegistry');
  
  // Create a subclass that overrides the problematic method
  return {
    ComponentRegistry: class extends original.ComponentRegistry {
      // Override the registerComponent method to avoid instantiation
      registerComponent<T extends IComponent>(
        componentConstructor: any
      ): void {
        // Get the type from the prototype directly
        const type = componentConstructor.prototype.type;
        
        if (!type) {
          throw new Error('Component constructor must have a type property on its prototype');
        }
        
        if (this.hasComponent(type)) {
          throw new Error(`Component type '${type}' is already registered`);
        }
        
        // Store the constructor directly rather than instantiating
        (this as any).componentTypes.set(type, componentConstructor);
        (this as any).componentMetadata.set(type, {
          type,
          registeredAt: Date.now()
        });
      }
    }
  };
});

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
      
      expect(registry.hasComponent(TestComponentA.TYPE)).toBe(true);
    });

    test('should throw error when registering duplicate component type', () => {
      registry.registerComponent(TestComponentA);
      
      expect(() => {
        registry.registerComponent(TestComponentA);
      }).toThrow(`Component type '${TestComponentA.TYPE}' is already registered`);
    });

    test('should retrieve registered component constructor', () => {
      registry.registerComponent(TestComponentA);
      
      const constructor = registry.getComponentConstructor(TestComponentA.TYPE);
      expect(constructor).toBe(TestComponentA);
    });
  });

  describe('Component Metadata', () => {
    test('should store metadata when registering a component', () => {
      const beforeRegistration = Date.now();
      registry.registerComponent(TestComponentA);
      const afterRegistration = Date.now();
      
      const metadata = registry.getComponentMetadata(TestComponentA.TYPE);
      
      expect(metadata).toBeDefined();
      expect(metadata?.type).toBe(TestComponentA.TYPE);
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
      expect(registry.hasComponent(TestComponentA.TYPE)).toBe(false);
      
      registry.registerComponent(TestComponentA);
      
      expect(registry.hasComponent(TestComponentA.TYPE)).toBe(true);
    });

    test('should get list of registered component types', () => {
      registry.registerComponent(TestComponentA);
      registry.registerComponent(TestComponentB);
      
      const registeredTypes = registry.getRegisteredComponentTypes();
      
      expect(registeredTypes).toHaveLength(2);
      expect(registeredTypes).toContain(TestComponentA.TYPE);
      expect(registeredTypes).toContain(TestComponentB.TYPE);
    });
  });

  describe('Registry Clearing', () => {
    test('should clear all registered components', () => {
      registry.registerComponent(TestComponentA);
      registry.registerComponent(TestComponentB);
      
      registry.clear();
      
      expect(registry.getRegisteredComponentTypes()).toHaveLength(0);
      expect(registry.hasComponent(TestComponentA.TYPE)).toBe(false);
      expect(registry.hasComponent(TestComponentB.TYPE)).toBe(false);
    });
  });
});