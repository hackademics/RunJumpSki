/**
 * @file tests/unit/core/ecs/Component.test.ts
 * @description Unit tests for the base Component class
 */

import { Component } from '../../../../src/core/ecs/Component';
import { IEntity } from '../../../../src/core/ecs/IEntity';
import { ComponentError } from '../../../../src/core/utils/errors/ComponentError';

// Concrete implementation of Component for testing
class TestComponent extends Component {
  public readonly type = 'test';

  constructor(options = { type: 'test', enabled: true }) {
    super(options);
  }

  public update(deltaTime: number): void {
    // Simulated update logic
  }

  // Expose protected method for testing
  public testGetEntity(): IEntity {
    return this.getEntity();
  }
}

describe('Component', () => {
  let mockEntity: IEntity;
  let component: TestComponent;

  beforeEach(() => {
    mockEntity = {
      id: 'test-entity',
      addComponent: jest.fn(),
      getComponent: jest.fn(),
      removeComponent: jest.fn(),
      update: jest.fn(),
      dispose: jest.fn()
    };

    component = new TestComponent();
  });

  describe('Constructor', () => {
    test('should throw error if no type is provided', () => {
      expect(() => {
        new TestComponent({ type: '' });
      }).toThrow('Component must have a type');
    });

    test('should be enabled by default', () => {
      expect(component.isEnabled()).toBe(true);
    });

    test('should respect provided enabled state', () => {
      const disabledComponent = new TestComponent({ type: 'test', enabled: false });
      expect(disabledComponent.isEnabled()).toBe(false);
    });
  });

  describe('Initialization', () => {
    test('should initialize with an entity', () => {
      component.init(mockEntity);
      
      // Try to get the entity (which would throw if not set)
      expect(() => component.testGetEntity()).not.toThrow();
    });

    test('should throw error when accessing entity before initialization', () => {
      expect(() => component.testGetEntity()).toThrow(ComponentError);
    });
  });

  describe('Enabled State Management', () => {
    test('should toggle enabled state', () => {
      expect(component.isEnabled()).toBe(true);
      
      component.setEnabled(false);
      expect(component.isEnabled()).toBe(false);
      
      component.setEnabled(true);
      expect(component.isEnabled()).toBe(true);
    });

    test('should not trigger state change if already in the same state', () => {
      const loggerSpy = jest.spyOn(component['logger'], 'debug');
      
      component.setEnabled(true);
      expect(loggerSpy).not.toHaveBeenCalled();
    });
  });

  describe('Lifecycle Methods', () => {
    test('should call init method', () => {
      const initSpy = jest.spyOn(component['logger'], 'debug');
      
      component.init(mockEntity);
      
      expect(initSpy).toHaveBeenCalledWith(expect.stringContaining('Initialized'));
    });

    test('should call dispose method', () => {
      const disposeSpy = jest.spyOn(component['logger'], 'debug');
      
      component.init(mockEntity);
      component.dispose();
      
      expect(disposeSpy).toHaveBeenCalledWith('Component disposed');
    });

    test('should handle update method', () => {
      const deltaTime = 0.16;
      const updateSpy = jest.spyOn(component, 'update');
      
      component.update(deltaTime);
      
      expect(updateSpy).toHaveBeenCalledWith(deltaTime);
    });
  });
});