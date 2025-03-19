import { Engine } from '../src/core/base/Engine';
import { ISystem } from '../src/core/base/ISystem';
import { System } from '../src/core/base/System';
import { ServiceLocator } from '../src/core/base/ServiceLocator';

// Mock System implementation for testing
class MockSystem extends System {
  updateCalled = false;
  initializeCalled = false;
  shutdownCalled = false;
  priority = 0;
  
  constructor(priority = 0) {
    super();
    this.priority = priority;
  }
  
  update(deltaTime: number): void {
    this.updateCalled = true;
  }
  
  initialize(): void {
    this.initializeCalled = true;
  }
  
  shutdown(): void {
    this.shutdownCalled = true;
  }
}

// Error throwing system for testing error handling
class ErrorSystem extends System {
  throwOnInitialize = false;
  throwOnUpdate = false;
  throwOnShutdown = false;
  
  initialize(): void {
    if (this.throwOnInitialize) {
      throw new Error('Initialize error');
    }
  }
  
  update(deltaTime: number): void {
    if (this.throwOnUpdate) {
      throw new Error('Update error');
    }
  }
  
  shutdown(): void {
    if (this.throwOnShutdown) {
      throw new Error('Shutdown error');
    }
  }
}

describe('Engine', () => {
  let engine: Engine;
  
  beforeEach(() => {
    // Reset ServiceLocator to avoid test interference
    ServiceLocator.reset();
    engine = new Engine();
  });
  
  afterEach(() => {
    // Clean up
    engine.shutdown();
  });
  
  test('should initialize correctly', () => {
    expect(engine).toBeInstanceOf(Engine);
    expect(engine.isRunning()).toBe(false);
  });
  
  test('should register and initialize systems', () => {
    const system = new MockSystem();
    engine.registerSystem(system);
    
    engine.initialize();
    
    expect(system.initializeCalled).toBe(true);
    expect(engine.isRunning()).toBe(true);
  });
  
  test('should handle errors during system initialization', () => {
    const errorSystem = new ErrorSystem();
    errorSystem.throwOnInitialize = true;
    
    engine.registerSystem(errorSystem);
    
    expect(() => {
      engine.initialize();
    }).toThrow('Initialize error');
    
    // Engine should not be running if initialization fails
    expect(engine.isRunning()).toBe(false);
  });
  
  test('should update registered systems', () => {
    const system = new MockSystem();
    engine.registerSystem(system);
    engine.initialize();
    
    engine.update(16.67); // Simulate ~60fps
    
    expect(system.updateCalled).toBe(true);
  });
  
  test('should not update systems if engine is not running', () => {
    const system = new MockSystem();
    engine.registerSystem(system);
    // Intentionally not calling initialize()
    
    engine.update(16.67);
    
    expect(system.updateCalled).toBe(false);
  });
  
  test('should handle errors during system update', () => {
    const errorSystem = new ErrorSystem();
    errorSystem.throwOnUpdate = true;
    
    engine.registerSystem(errorSystem);
    engine.initialize();
    
    expect(() => {
      engine.update(16.67);
    }).toThrow('Update error');
  });
  
  test('should update systems in priority order', () => {
    const updateOrder: number[] = [];
    
    class PrioritySystem extends System {
      id: number;
      
      constructor(id: number, priority: number) {
        super();
        this.id = id;
        this.priority = priority;
      }
      
      update(deltaTime: number): void {
        updateOrder.push(this.id);
      }
    }
    
    const system1 = new PrioritySystem(1, 10);
    const system2 = new PrioritySystem(2, 5);
    const system3 = new PrioritySystem(3, 20);
    
    engine.registerSystem(system1);
    engine.registerSystem(system2);
    engine.registerSystem(system3);
    engine.initialize();
    
    engine.update(16.67);
    
    // Systems should be updated in ascending priority order
    expect(updateOrder).toEqual([2, 1, 3]);
  });
  
  test('should shutdown systems in reverse priority order', () => {
    const shutdownOrder: number[] = [];
    
    class PrioritySystem extends System {
      id: number;
      
      constructor(id: number, priority: number) {
        super();
        this.id = id;
        this.priority = priority;
      }
      
      shutdown(): void {
        shutdownOrder.push(this.id);
      }
    }
    
    const system1 = new PrioritySystem(1, 10);
    const system2 = new PrioritySystem(2, 5);
    const system3 = new PrioritySystem(3, 20);
    
    engine.registerSystem(system1);
    engine.registerSystem(system2);
    engine.registerSystem(system3);
    engine.initialize();
    
    engine.shutdown();
    
    // Systems should be shut down in descending priority order
    expect(shutdownOrder).toEqual([3, 1, 2]);
    expect(engine.isRunning()).toBe(false);
  });
  
  test('should handle errors during system shutdown', () => {
    const errorSystem = new ErrorSystem();
    errorSystem.throwOnShutdown = true;
    
    const normalSystem = new MockSystem();
    
    engine.registerSystem(errorSystem);
    engine.registerSystem(normalSystem);
    engine.initialize();
    
    expect(() => {
      engine.shutdown();
    }).toThrow('Shutdown error');
    
    // Even if one system fails to shut down, others should still be attempted
    expect(normalSystem.shutdownCalled).toBe(true);
    expect(engine.isRunning()).toBe(false);
  });
  
  test('should unregister systems correctly', () => {
    const system = new MockSystem();
    engine.registerSystem(system);
    engine.initialize();
    
    expect(engine.unregisterSystem(system)).toBe(true);
    
    // Reset the flag to check if update is called again
    system.updateCalled = false;
    
    engine.update(16.67);
    
    expect(system.updateCalled).toBe(false);
  });
  
  test('should return false when trying to unregister a non-registered system', () => {
    const system = new MockSystem();
    // Not registering the system
    
    expect(engine.unregisterSystem(system)).toBe(false);
  });
  
  test('should pause and resume updates', () => {
    const system = new MockSystem();
    engine.registerSystem(system);
    engine.initialize();
    
    // Pause the engine
    engine.pause();
    
    engine.update(16.67);
    expect(system.updateCalled).toBe(false);
    
    // Resume the engine
    engine.resume();
    
    engine.update(16.67);
    expect(system.updateCalled).toBe(true);
  });
  
  test('should register system with ServiceLocator', () => {
    class TestSystem extends System implements ITestSystem {
      test(): void {}
    }
    
    interface ITestSystem extends ISystem {
      test(): void;
    }
    
    const system = new TestSystem();
    engine.registerSystem(system);
    
    // The system should be registered with ServiceLocator
    const retrievedSystem = ServiceLocator.resolve<ITestSystem>(ITestSystem);
    expect(retrievedSystem).toBe(system);
  });
});