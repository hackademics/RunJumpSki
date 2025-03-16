import { CoreSystemRegistry } from '../../../src/core/CoreSystemRegistry';
import { EventBus } from '../../../src/core/events/EventBus';
import { wait, runFrames } from '../helpers';
import * as BABYLON from 'babylonjs';

// Mock document and canvas for testing
const mockCanvas = {
  width: 800,
  height: 600,
  getContext: jest.fn(() => ({
    canvas: { width: 800, height: 600 }
  }))
};

// Mock document
global.document = {
  createElement: jest.fn(() => mockCanvas),
  getElementById: jest.fn(() => mockCanvas),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  }
} as any;

// Mock BabylonJS
jest.mock('babylonjs', () => {
  return {
    Engine: jest.fn().mockImplementation(() => ({
      runRenderLoop: jest.fn(),
      resize: jest.fn(),
      dispose: jest.fn()
    })),
    Scene: jest.fn().mockImplementation(() => ({
      render: jest.fn(),
      dispose: jest.fn(),
      enablePhysics: jest.fn(),
      createDefaultCameraOrLight: jest.fn(),
      createDefaultEnvironment: jest.fn(),
      createDefaultSkybox: jest.fn()
    })),
    Vector3: jest.fn().mockImplementation((x, y, z) => ({ x, y, z })),
    Mesh: {
      CreateBox: jest.fn().mockImplementation(() => ({
        position: { x: 0, y: 0, z: 0 }
      }))
    },
    PhysicsImpostor: jest.fn().mockImplementation(() => ({
      mass: 1,
      dispose: jest.fn()
    })),
    CannonJSPlugin: jest.fn()
  };
});

describe('Full Core Systems Pipeline', () => {
  let registry: CoreSystemRegistry;
  let eventBus: EventBus;
  
  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Get registry instance
    registry = CoreSystemRegistry.getInstance();
    
    // Initialize registry
    await registry.initialize();
    
    // Get event bus
    eventBus = registry.getSystem('eventBus');
  });
  
  afterEach(() => {
    // Clean up
    registry.dispose();
  });
  
  test('should initialize all core systems', () => {
    // Verify all core systems are initialized
    expect(registry.getSystem('logger')).toBeDefined();
    expect(registry.getSystem('eventBus')).toBeDefined();
    expect(registry.getSystem('physics')).toBeDefined();
    expect(registry.getSystem('renderer')).toBeDefined();
    expect(registry.getSystem('input')).toBeDefined();
    expect(registry.getSystem('audio')).toBeDefined();
    expect(registry.getSystem('assets')).toBeDefined();
    expect(registry.getSystem('movement')).toBeDefined();
    expect(registry.getSystem('state')).toBeDefined();
  });
  
  test('should process a complete game frame', async () => {
    // Spy on system updates
    const physicsSpy = jest.spyOn(registry.getSystem('physics'), 'update');
    const rendererSpy = jest.spyOn(registry.getSystem('renderer'), 'update');
    const inputSpy = jest.spyOn(registry.getSystem('input'), 'update');
    const movementSpy = jest.spyOn(registry.getSystem('movement'), 'update');
    
    // Update the registry (processes one frame)
    registry.update(1/60);
    
    // Verify all systems were updated
    expect(inputSpy).toHaveBeenCalledWith(1/60);
    expect(physicsSpy).toHaveBeenCalledWith(1/60);
    expect(movementSpy).toHaveBeenCalledWith(1/60);
    expect(rendererSpy).toHaveBeenCalledWith(1/60);
    
    // Verify update order (input before movement, physics before renderer)
    const inputCallOrder = inputSpy.mock.invocationCallOrder[0];
    const movementCallOrder = movementSpy.mock.invocationCallOrder[0];
    const physicsCallOrder = physicsSpy.mock.invocationCallOrder[0];
    const rendererCallOrder = rendererSpy.mock.invocationCallOrder[0];
    
    expect(inputCallOrder).toBeLessThan(movementCallOrder);
    expect(physicsCallOrder).toBeLessThan(rendererCallOrder);
  });
  
  test('should handle events across systems', async () => {
    // Spy on audio system
    const audioSpy = jest.spyOn(registry.getSystem('audio'), 'playSound');
    
    // Emit collision event
    eventBus.emit('physics:collision', {
      bodyA: { id: 'entity1' },
      bodyB: { id: 'entity2' },
      point: { x: 0, y: 0, z: 0 },
      normal: { x: 0, y: 1, z: 0 },
      impulse: 10
    });
    
    // Update registry
    registry.update(1/60);
    
    // Verify audio system responded to event
    expect(audioSpy).toHaveBeenCalled();
  });
  
  test('should maintain consistent state across multiple frames', async () => {
    // Create a test entity
    const entityId = 'test-entity';
    const position = { x: 0, y: 10, z: 0 };
    
    // Register entity with physics and movement systems
    const physicsSystem = registry.getSystem('physics');
    const movementSystem = registry.getSystem('movement');
    
    physicsSystem.registerEntity(entityId, {
      position,
      mass: 1,
      type: 'box'
    });
    
    movementSystem.registerEntity(entityId, {
      position,
      velocity: { x: 0, y: 0, z: 0 }
    });
    
    // Run multiple frames
    for (let i = 0; i < 10; i++) {
      registry.update(1/60);
      await wait(16); // Simulate 60fps
    }
    
    // Get positions from both systems
    const physicsPos = physicsSystem.getEntityPosition(entityId);
    const movementPos = movementSystem.getEntityPosition(entityId);
    
    // Verify positions are in sync
    expect(physicsPos.y).toBeCloseTo(movementPos.y, 2);
  });
  
  test('should handle system dependencies correctly', () => {
    // Verify systems with dependencies are initialized after their dependencies
    const loggerInitTime = registry.getSystemInitTime('logger');
    const eventBusInitTime = registry.getSystemInitTime('eventBus');
    const physicsInitTime = registry.getSystemInitTime('physics');
    const rendererInitTime = registry.getSystemInitTime('renderer');
    
    // Logger should be initialized first
    expect(loggerInitTime).toBeLessThan(eventBusInitTime);
    expect(loggerInitTime).toBeLessThan(physicsInitTime);
    expect(loggerInitTime).toBeLessThan(rendererInitTime);
    
    // EventBus should be initialized before systems that depend on it
    expect(eventBusInitTime).toBeLessThan(physicsInitTime);
    expect(eventBusInitTime).toBeLessThan(rendererInitTime);
  });
}); 