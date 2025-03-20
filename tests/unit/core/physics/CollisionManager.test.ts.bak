/**
 * @file tests/unit/core/physics/CollisionManager.test.ts
 * @description Unit tests for the CollisionManager class.
 */

import * as BABYLON from 'babylonjs';
import { CollisionManager } from '../../../../src/core/physics/CollisionManager';
import { ICollisionManager } from '../../../../src/core/physics/ICollisionManager';
import { CollisionSystem } from '../../../../src/core/physics/CollisionSystem';
import { ICollisionSystem, CollisionFilter } from '../../../../src/core/physics/ICollisionSystem';
import { IPhysicsSystem } from '../../../../src/core/physics/IPhysicsSystem';

// Mock the dependencies
jest.mock('../../../../src/core/physics/CollisionSystem');

// Create a mock Scene
const createMockScene = () => {
  return {
    getSystem: jest.fn().mockReturnValue(null),
    registerSystem: jest.fn(),
    unregisterSystem: jest.fn(),
    getEngine: jest.fn().mockReturnValue({
      onBeforeRenderObservable: {
        add: jest.fn(),
        remove: jest.fn()
      }
    })
  };
};

// Create a mock PhysicsSystem
const createMockPhysicsSystem = (): IPhysicsSystem => {
  return {
    initialize: jest.fn(),
    update: jest.fn(),
    setGravity: jest.fn(),
    destroy: jest.fn(),
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

// Create a mock CollisionSystem
const createMockCollisionSystem = (): ICollisionSystem => {
  return {
    initialize: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    registerCollisionHandler: jest.fn().mockReturnValue('collision-id'),
    unregisterCollisionHandler: jest.fn(),
    registerTriggerZone: jest.fn().mockReturnValue('trigger-id'),
    unregisterTriggerZone: jest.fn(),
    areColliding: jest.fn(),
    raycast: jest.fn()
  };
};

describe('CollisionManager', () => {
  let collisionManager: CollisionManager;
  let mockScene: any;
  let mockPhysicsSystem: IPhysicsSystem;
  let mockCollisionSystem: ICollisionSystem;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset CollisionSystem mock
    (CollisionSystem as jest.Mock).mockClear();
    
    mockScene = createMockScene();
    mockPhysicsSystem = createMockPhysicsSystem();
    mockCollisionSystem = createMockCollisionSystem();
    
    // Mock getSystem to return the physics system when requested
    (mockScene.getSystem as jest.Mock).mockImplementation((systemName: string) => {
      if (systemName === 'PhysicsSystem') {
        return mockPhysicsSystem;
      }
      return null;
    });
    
    // Set up mock for CollisionSystem constructor
    (CollisionSystem as jest.Mock).mockImplementation(() => mockCollisionSystem);
    
    collisionManager = new CollisionManager();
  });
  
  describe('initialize', () => {
    it('should initialize with a scene and register itself as a system', () => {
      collisionManager.initialize(mockScene);
      
      expect(mockScene.registerSystem).toHaveBeenCalledWith('CollisionManager', collisionManager);
      expect(mockScene.getSystem).toHaveBeenCalledWith('PhysicsSystem');
    });
    
    it('should create a new CollisionSystem if one is not provided', () => {
      collisionManager.initialize(mockScene);
      
      expect(CollisionSystem).toHaveBeenCalled();
      expect(mockCollisionSystem.initialize).toHaveBeenCalledWith(mockPhysicsSystem);
    });
    
    it('should warn when physics system is not available', () => {
      // Mock getSystem to return null for PhysicsSystem
      (mockScene.getSystem as jest.Mock).mockReturnValue(null);
      
      console.warn = jest.fn();
      
      collisionManager.initialize(mockScene);
      
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Physics engine not initialized'));
    });
  });
  
  describe('update', () => {
    it('should update the collision system with delta time', () => {
      collisionManager.initialize(mockScene);
      
      const deltaTime = 0.016;
      collisionManager.update(deltaTime);
      
      expect(mockCollisionSystem.update).toHaveBeenCalledWith(deltaTime);
    });
  });
  
  describe('setupCollisionWithGroup', () => {
    it('should forward calls to the collision system', () => {
      collisionManager.initialize(mockScene);
      
      const impostor1 = {} as BABYLON.PhysicsImpostor;
      const groupId = 'test-group';
      const callback = jest.fn();
      
      (collisionManager as any).collisionSystem.registerCollisionHandler = jest.fn().mockReturnValue('collision-id');
      
      const id = (collisionManager as any).setupCollisionWithGroup(impostor1, groupId, callback);
      
      expect(mockCollisionSystem.registerCollisionHandler).toHaveBeenCalled();
    });
  });
  
  describe('removeCollisionHandler', () => {
    it('should forward calls to the collision system', () => {
      collisionManager.initialize(mockScene);
      
      const id = 'test-id';
      collisionManager.removeCollisionHandler(id);
      
      expect(mockCollisionSystem.unregisterCollisionHandler).toHaveBeenCalledWith(id);
    });
  });
  
  describe('createTriggerVolume', () => {
    it('should forward calls to the collision system', () => {
      collisionManager.initialize(mockScene);
      
      const mesh = {} as BABYLON.AbstractMesh;
      const options = {
        type: { value: 'box' } as any,
        parameters: { width: 1, height: 1, depth: 1 }
      } as any;
      const onEnter = jest.fn();
      const onExit = jest.fn();
      const onStay = jest.fn();
      
      (collisionManager as any).collisionSystem.registerTriggerZone = jest.fn().mockReturnValue('trigger-id');
      
      const id = (collisionManager as any).createTriggerVolume(
        mesh,
        options,
        onEnter,
        onExit,
        onStay
      );
      
      expect(mockCollisionSystem.registerTriggerZone).toHaveBeenCalled();
    });
  });
  
  describe('removeTriggerVolume', () => {
    it('should forward calls to the collision system', () => {
      collisionManager.initialize(mockScene);
      
      const id = 'test-trigger-id';
      collisionManager.removeTriggerVolume(id);
      
      expect(mockCollisionSystem.unregisterTriggerZone).toHaveBeenCalledWith(id);
    });
  });
  
  describe('raycast', () => {
    it('should forward calls to the collision system', () => {
      collisionManager.initialize(mockScene);
      
      const from = new BABYLON.Vector3(0, 0, 0);
      const to = new BABYLON.Vector3(10, 0, 0);
      const filter: CollisionFilter = {
        filterFunction: jest.fn() as any
      };
      
      const mockResult = { hit: true, distance: 5 };
      (mockCollisionSystem.raycast as jest.Mock).mockReturnValue(mockResult);
      
      const result = collisionManager.raycast(from, to, filter);
      
      expect(result).toBe(mockResult);
      expect(mockCollisionSystem.raycast).toHaveBeenCalledWith(from, to, filter);
    });
  });
  
  describe('dispose', () => {
    it('should clean up resources and unregister from the scene', () => {
      collisionManager.initialize(mockScene);
      
      collisionManager.dispose();
      
      expect(mockCollisionSystem.destroy).toHaveBeenCalled();
      expect(mockScene.unregisterSystem).toHaveBeenCalledWith('CollisionManager');
    });
    
    it('should not throw if scene is null', () => {
      // Initialize without scene
      (collisionManager as any).scene = null;
      (collisionManager as any).collisionSystem = mockCollisionSystem;
      
      expect(() => {
        collisionManager.dispose();
      }).not.toThrow();
      
      expect(mockCollisionSystem.destroy).toHaveBeenCalled();
    });
  });
});
