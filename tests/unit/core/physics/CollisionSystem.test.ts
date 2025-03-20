/**
 * @file tests/unit/core/physics/CollisionSystem.test.ts
 * @description Unit tests for the CollisionSystem class.
 */

import * as BABYLON from 'babylonjs';
import { CollisionSystem } from '../../../../src/core/physics/CollisionSystem';
import { ICollisionSystem, CollisionInfo, CollisionFilter } from '../../../../src/core/physics/ICollisionSystem';
import { IPhysicsSystem } from '../../../../src/core/physics/IPhysicsSystem';

// Create a mock PhysicsSystem
const createMockPhysicsSystem = (): IPhysicsSystem => {
  const mockImpostors = new Set();
  
  return {
    initialize: jest.fn(),
    update: jest.fn(),
    setGravity: jest.fn(),
    getGravity: jest.fn().mockReturnValue(new BABYLON.Vector3(0, -9.81, 0)),
    dispose: jest.fn(),
    getPhysicsEngine: jest.fn().mockReturnValue({
      _impostors: mockImpostors,
      raycast: jest.fn().mockReturnValue(null)
    }),
    getDefaultFriction: jest.fn().mockReturnValue(0.3),
    setDefaultFriction: jest.fn(),
    getDefaultRestitution: jest.fn().mockReturnValue(0.2),
    setDefaultRestitution: jest.fn(),
    getTimeScale: jest.fn().mockReturnValue(1.0),
    setTimeScale: jest.fn(),
    isEnabled: jest.fn().mockReturnValue(true),
    enable: jest.fn(),
    disable: jest.fn(),
    isDeterministic: jest.fn().mockReturnValue(false),
    setDeterministic: jest.fn(),
    showCollisionWireframes: jest.fn(),
    createImpostor: jest.fn().mockImplementation((mesh, type, options) => {
      const impostor = createMockImpostor(mesh.id || 'mock-impostor');
      mockImpostors.add(impostor);
      return impostor;
    }),
    applyForce: jest.fn(),
    applyImpulse: jest.fn(),
    createJoint: jest.fn(),
    registerOnCollide: jest.fn().mockImplementation((impostor1, impostor2, callback) => {
      // Store reference to callback for testing
      impostor1.collisionCallback = callback;
      return { impostor1, impostor2, callback };
    })
  };
};

// Create a mock PhysicsImpostor
const createMockImpostor = (id: string = 'test-impostor'): BABYLON.PhysicsImpostor => {
  return {
    object: {
      id,
      name: `object-${id}`,
      getBoundingInfo: () => ({
        boundingBox: {
          minimumWorld: new BABYLON.Vector3(-1, -1, -1),
          maximumWorld: new BABYLON.Vector3(1, 1, 1),
          centerWorld: new BABYLON.Vector3(0, 0, 0)
        }
      }),
      metadata: {}
    } as any,
    physicsBody: { /* mock physics body */ },
    executeNativeFunction: jest.fn().mockImplementation((callback) => {
      // Call the callback with a mock physics body that has the setTrigger method
      callback({ setTrigger: jest.fn() });
    }),
    registerOnPhysicsCollide: jest.fn().mockImplementation((impostors, callback) => {
      return {
        disconnect: jest.fn()
      };
    }),
    dispose: jest.fn()
  } as unknown as BABYLON.PhysicsImpostor;
};

describe('CollisionSystem', () => {
  let collisionSystem: CollisionSystem;
  let mockPhysicsSystem: IPhysicsSystem;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockPhysicsSystem = createMockPhysicsSystem();
    collisionSystem = new CollisionSystem();
  });
  
  describe('initialize', () => {
    it('should initialize with a physics system', () => {
      collisionSystem.initialize(mockPhysicsSystem);
      // The initialize method initializes private properties but doesn't call getPhysicsEngine
      // Assert that initialization works without errors
      expect(mockPhysicsSystem.initialize).not.toHaveBeenCalled(); // It shouldn't call initialize on the physics system
      expect(() => collisionSystem.update(0.016)).not.toThrow(); // Should not throw after initialization
    });
  });
  
  describe('update', () => {
    it('should update without errors when initialized', () => {
      collisionSystem.initialize(mockPhysicsSystem);
      expect(() => collisionSystem.update(0.016)).not.toThrow();
    });
    
    it('should log a warning when physics system is not initialized', () => {
      console.warn = jest.fn();
      
      collisionSystem.update(0.016);
      
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('not initialized'));
    });
  });
  
  describe('registerCollisionHandler', () => {
    it('should throw when physics system is not initialized', () => {
      const impostor1 = createMockImpostor('1');
      const impostor2 = createMockImpostor('2');
      const callback = jest.fn();
      
      expect(() => {
        collisionSystem.registerCollisionHandler(impostor1, impostor2, callback);
      }).toThrow('physics system is not initialized');
    });
    
    it('should register a collision handler between two impostors', () => {
      collisionSystem.initialize(mockPhysicsSystem);
      
      const impostor1 = createMockImpostor('1');
      const impostor2 = createMockImpostor('2');
      const callback = jest.fn();
      
      const id = collisionSystem.registerCollisionHandler(impostor1, impostor2, callback);
      
      expect(id).toBeDefined();
      expect(mockPhysicsSystem.registerOnCollide).toHaveBeenCalled();
    });
    
    it('should register a collision handler for an array of impostors', () => {
      collisionSystem.initialize(mockPhysicsSystem);
      
      const impostor1 = createMockImpostor('1');
      const impostor2 = createMockImpostor('2');
      const impostor3 = createMockImpostor('3');
      const callback = jest.fn();
      
      const id = collisionSystem.registerCollisionHandler([impostor1, impostor2], impostor3, callback);
      
      expect(id).toBeDefined();
      expect(mockPhysicsSystem.registerOnCollide).toHaveBeenCalledTimes(2);
    });
    
    it('should register a collision handler with any object when second parameter is null', () => {
      collisionSystem.initialize(mockPhysicsSystem);
      
      const impostor = createMockImpostor();
      const callback = jest.fn();
      
      const id = collisionSystem.registerCollisionHandler(impostor, null, callback);
      
      expect(id).toBeDefined();
      expect(impostor.registerOnPhysicsCollide).toHaveBeenCalled();
    });
  });
  
  describe('unregisterCollisionHandler', () => {
    it('should not throw when handler ID does not exist', () => {
      expect(() => {
        collisionSystem.unregisterCollisionHandler('non-existent-id');
      }).not.toThrow();
    });
    
    it('should unregister an existing handler', () => {
      collisionSystem.initialize(mockPhysicsSystem);
      
      const impostor1 = createMockImpostor('1');
      const impostor2 = createMockImpostor('2');
      const callback = jest.fn();
      
      const id = collisionSystem.registerCollisionHandler(impostor1, impostor2, callback);
      console.warn = jest.fn();
      
      collisionSystem.unregisterCollisionHandler(id);
      
      expect(console.warn).not.toHaveBeenCalled();
    });
  });
  
  describe('registerTriggerZone', () => {
    it('should throw when physics system is not initialized', () => {
      const impostor = createMockImpostor();
      const callback = jest.fn();
      
      expect(() => {
        collisionSystem.registerTriggerZone(impostor, undefined, callback);
      }).toThrow('physics system is not initialized');
    });
    
    it('should register a trigger zone', () => {
      collisionSystem.initialize(mockPhysicsSystem);
      
      const triggerImpostor = createMockImpostor('trigger');
      const onEnter = jest.fn();
      const onExit = jest.fn();
      const onStay = jest.fn();
      
      const id = collisionSystem.registerTriggerZone(
        triggerImpostor,
        undefined,
        onEnter,
        onExit,
        onStay
      );
      
      expect(id).toBeDefined();
      expect(triggerImpostor.executeNativeFunction).toHaveBeenCalled();
    });
  });
  
  describe('unregisterTriggerZone', () => {
    it('should not throw when trigger ID does not exist', () => {
      expect(() => {
        collisionSystem.unregisterTriggerZone('non-existent-id');
      }).not.toThrow();
    });
    
    it('should unregister an existing trigger zone', () => {
      collisionSystem.initialize(mockPhysicsSystem);
      
      const triggerImpostor = createMockImpostor('trigger');
      const onEnter = jest.fn();
      
      const id = collisionSystem.registerTriggerZone(
        triggerImpostor,
        undefined,
        onEnter
      );
      
      console.warn = jest.fn();
      
      collisionSystem.unregisterTriggerZone(id);
      
      expect(console.warn).not.toHaveBeenCalled();
    });
  });
  
  describe('areColliding', () => {
    it('should detect collision between overlapping bounding boxes', () => {
      const impostor1 = createMockImpostor('1');
      const impostor2 = createMockImpostor('2');
      
      // These should overlap as they are at the same position
      const isColliding = collisionSystem.areColliding(impostor1, impostor2);
      
      expect(isColliding).toBe(true);
    });
    
    it('should return false when objects are not colliding', () => {
      const impostor1 = createMockImpostor('1');
      const impostor2 = createMockImpostor('2');
      
      // Move the second object far away
      (impostor2.object as any).getBoundingInfo = () => ({
        boundingBox: {
          minimumWorld: new BABYLON.Vector3(5, 5, 5),
          maximumWorld: new BABYLON.Vector3(7, 7, 7),
          centerWorld: new BABYLON.Vector3(6, 6, 6)
        }
      });
      
      const isColliding = collisionSystem.areColliding(impostor1, impostor2);
      
      expect(isColliding).toBe(false);
    });
    
    it('should return false when an object has no mesh', () => {
      const impostor1 = createMockImpostor('1');
      const impostor2 = { ...createMockImpostor('2'), object: null };
      
      const isColliding = collisionSystem.areColliding(impostor1, impostor2 as any);
      
      expect(isColliding).toBe(false);
    });
  });
  
  describe('raycast', () => {
    it('should throw when physics system is not initialized', () => {
      const from = new BABYLON.Vector3(0, 0, 0);
      const to = new BABYLON.Vector3(10, 0, 0);
      
      expect(() => {
        collisionSystem.raycast(from, to);
      }).toThrow('physics system is not initialized');
    });
    
    // Test for physics engine without raycast support
    test('should return null when physics engine does not support raycast', () => {
      const collisionSystem = new CollisionSystem();
      collisionSystem.initialize(mockPhysicsSystem);
      
      // Mock the getPhysicsEngine to return a mock physics engine
      jest.spyOn(mockPhysicsSystem, 'getPhysicsEngine').mockReturnValue({
        raycast: null
      } as any);
      
      // Test the raycast function
      const from = new BABYLON.Vector3(0, 0, 0);
      const to = new BABYLON.Vector3(10, 0, 0);
      
      const result = collisionSystem.raycast(from, to);
      
      // Expecting null since the physics engine doesn't support raycast
      expect(result).toBeNull();
    });
  });
  
  describe('destroy', () => {
    it('should clear all data structures and set physics system to null', () => {
      collisionSystem.initialize(mockPhysicsSystem);
      
      // Register some collision handlers and trigger zones to have data to clean up
      const impostor1 = createMockImpostor('1');
      const impostor2 = createMockImpostor('2');
      
      collisionSystem.registerCollisionHandler(impostor1, impostor2, jest.fn());
      collisionSystem.registerTriggerZone(impostor1, undefined, jest.fn());
      
      // In our implementation, we can't spy on the Map.prototype.clear method directly
      // because the CollisionSystem class uses private Map instances.
      // Instead, we'll check that the system behaves as expected after disposal.
      
      // Mock console.log to verify it was called with the right message
      console.log = jest.fn();
      
      collisionSystem.dispose();
      
      // Verify console.log was called with "CollisionSystem destroyed"
      expect(console.log).toHaveBeenCalledWith("CollisionSystem destroyed");
      
      // After disposal, update should not access the physics system
      // Instead, we'll verify that calling update doesn't throw but just logs a warning
      console.warn = jest.fn();
      collisionSystem.update(0.016);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('not initialized'));
      
      // We should also verify that trying to use other methods will throw errors
      // since physicsSystem is null
      expect(() => {
        collisionSystem.registerCollisionHandler(impostor1, impostor2, jest.fn());
      }).toThrow();
    });
  });
});

