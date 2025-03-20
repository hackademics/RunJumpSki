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
  return {
    initialize: jest.fn(),
    update: jest.fn(),
    setGravity: jest.fn(),
    dispose: jest.fn(),
    getPhysicsEngine: jest.fn().mockReturnValue({
      _impostors: new Set()
    }),
    createImpostor: jest.fn(),
    applyForce: jest.fn(),
    applyImpulse: jest.fn(),
    createJoint: jest.fn(),
    registerOnCollide: jest.fn()
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
    executeNativeFunction: jest.fn(),
    registerOnPhysicsCollide: jest.fn(),
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
      expect(mockPhysicsSystem.getPhysicsEngine).toHaveBeenCalled();
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
    
    it('should return null when physics engine does not support raycast', () => {
      collisionSystem.initialize(mockPhysicsSystem);
      
      // Physics engine returns null for raycast
      (mockPhysicsSystem.getPhysicsEngine as jest.Mock).mockReturnValueOnce({
        raycast: null
      });
      
      console.warn = jest.fn();
      
      const from = new BABYLON.Vector3(0, 0, 0);
      const to = new BABYLON.Vector3(10, 0, 0);
      
      const result = collisionSystem.raycast(from, to);
      
      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('does not support raycast'));
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
      
      // Spy on clear methods
      const clearSpy = jest.spyOn(Map.prototype, 'clear');
      
      collisionSystem.dispose();
      
      // Verify that clear was called at least 3 times (once for each Map in the class)
      expect(clearSpy).toHaveBeenCalledTimes(3);
      
      // Verify that the physics system was set to null
      expect(() => {
        collisionSystem.update(0.016);
      }).toThrow();
      
      clearSpy.mockRestore();
    });
  });
});

