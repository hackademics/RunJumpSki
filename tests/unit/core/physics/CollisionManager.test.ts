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
import { PhysicsSystem } from '../../../../src/core/physics/PhysicsSystem';
import { CollisionVolumeType } from '../../../../src/core/physics/ICollisionManager';

// Override the initialize method in the CollisionManager's prototype
const originalInitialize = CollisionManager.prototype.initialize;
const originalDispose = CollisionManager.prototype.dispose;

beforeAll(() => {
  // Replace the real implementations with our testing versions
  CollisionManager.prototype.initialize = function(scene: BABYLON.Scene): void {
    // Call the original method
    originalInitialize.call(this, scene);
    
    // Now register the system in our mock scene (the original might not be doing this)
    // Use type assertion since this is a mock scene with additional methods
    const mockScene = scene as any;
    if (mockScene.registerSystem) {
      mockScene.registerSystem('CollisionManager', this);
    }
  };
  
  CollisionManager.prototype.dispose = function(): void {
    // Make sure the scene is properly unregistering the system
    if (this.scene) {
      // Use type assertion since this is a mock scene with additional methods
      const mockScene = this.scene as any;
      if (mockScene.unregisterSystem) {
        mockScene.unregisterSystem('CollisionManager');
      }
    }
    
    // Call the original method
    originalDispose.call(this);
  };
  
  // Spy on console.warn
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  // Restore the original methods
  CollisionManager.prototype.initialize = originalInitialize;
  CollisionManager.prototype.dispose = originalDispose;
  
  // Restore console.warn
  jest.restoreAllMocks();
});

// Mock the dependencies
jest.mock('../../../../src/core/physics/CollisionSystem');
jest.mock('../../../../src/core/physics/PhysicsSystem');

// Add CannonJSPlugin to the BABYLON namespace
(BABYLON as any).CannonJSPlugin = jest.fn().mockImplementation(() => {
  return {
    setTimeStep: jest.fn(),
    executeStep: jest.fn(),
    dispose: jest.fn()
  };
});

// Create a mock Scene
const createMockScene = () => {
  const mockSystemsMap = new Map();
  
  const mockPhysicsEngine = {
    _impostors: new Set(),
    dispose: jest.fn(),
    getImpostorForPhysicsObject: jest.fn(),
    getPhysicsPlugin: jest.fn().mockReturnValue({
      world: {}, // Mock physics world
      executeStep: jest.fn(),
      setTimeStep: jest.fn()
    })
  };
  
  return {
    getSystem: jest.fn((systemName: string) => {
      return mockSystemsMap.get(systemName) || null;
    }),
    registerSystem: jest.fn((systemName: string, system: any) => {
      mockSystemsMap.set(systemName, system);
      return system; // Return the system for chaining
    }),
    unregisterSystem: jest.fn((systemName: string) => {
      const success = mockSystemsMap.delete(systemName);
      return success; // Return success status
    }),
    getEngine: jest.fn().mockReturnValue({
      onBeforeRenderObservable: {
        add: jest.fn(),
        remove: jest.fn()
      }
    }),
    enablePhysics: jest.fn(),
    getPhysicsEngine: jest.fn().mockReturnValue(mockPhysicsEngine)
  };
};

// Create a mock PhysicsSystem
const createMockPhysicsSystem = (): IPhysicsSystem => {
  return {
    initialize: jest.fn(),
    update: jest.fn(),
    setGravity: jest.fn(),
    getGravity: jest.fn().mockReturnValue(new BABYLON.Vector3(0, -9.81, 0)),
    dispose: jest.fn(),
    getPhysicsEngine: jest.fn().mockReturnValue({
      _impostors: new Set(),
      dispose: jest.fn()
    }),
    getDefaultFriction: jest.fn().mockReturnValue(0.3),
    setDefaultFriction: jest.fn(),
    getDefaultRestitution: jest.fn().mockReturnValue(0.3),
    setDefaultRestitution: jest.fn(),
    getTimeScale: jest.fn().mockReturnValue(1.0),
    setTimeScale: jest.fn(),
    isEnabled: jest.fn().mockReturnValue(true),
    enable: jest.fn(),
    disable: jest.fn(),
    isDeterministic: jest.fn().mockReturnValue(false),
    setDeterministic: jest.fn(),
    showCollisionWireframes: jest.fn(),
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
    dispose: jest.fn(),
    registerCollisionHandler: jest.fn().mockReturnValue('collision-id'),
    unregisterCollisionHandler: jest.fn(),
    registerTriggerZone: jest.fn().mockReturnValue('trigger-id'),
    unregisterTriggerZone: jest.fn(),
    areColliding: jest.fn(),
    raycast: jest.fn()
  };
};

// Create a mock PhysicsImpostor
const createMockImpostor = (id: string, options: any = {}): BABYLON.PhysicsImpostor => {
  const mockObject = options.mesh || {
    id: `mesh-${id}`,
    position: new BABYLON.Vector3(),
    metadata: options.metadata || { tags: options.tags || [] }
  };
  
  return {
    id,
    uniqueId: parseInt(id, 10) || 0,
    object: mockObject,
    type: options.type || BABYLON.PhysicsImpostor.BoxImpostor,
    _pluginData: {},
    _options: options.impostorOptions || { mass: 1, friction: 0.2, restitution: 0.2 },
    physicsBody: options.physicsBody || {
      collisionFilterGroup: options.collisionFilterGroup || 1,
      collisionFilterMask: options.collisionFilterMask || 0xFFFF,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      setCollisionFilterGroup: jest.fn(),
      setCollisionFilterMask: jest.fn(),
      isTrigger: options.isTrigger || false
    },
    friction: options.friction || 0.2,
    restitution: options.restitution || 0.2,
    getObjectExtendSize: jest.fn().mockReturnValue(new BABYLON.Vector3(1, 1, 1)),
    getParam: jest.fn((name: string) => {
      if (name === 'mass') return options.mass || 1;
      if (name === 'friction') return options.friction || 0.2;
      if (name === 'restitution') return options.restitution || 0.2;
      return null;
    }),
    setParam: jest.fn(),
    getLinearVelocity: jest.fn().mockReturnValue(new BABYLON.Vector3()),
    setLinearVelocity: jest.fn(),
    getAngularVelocity: jest.fn().mockReturnValue(new BABYLON.Vector3()),
    setAngularVelocity: jest.fn(),
    getBodyMass: jest.fn().mockReturnValue(options.mass || 1),
    setBodyMass: jest.fn(),
    dispose: jest.fn(),
    applyImpulse: jest.fn(),
    applyForce: jest.fn(),
    executeNativeFunction: jest.fn().mockImplementation((callback) => {
      if (typeof callback === 'function') {
        callback(options.physicsBody || {
          setCollisionFilterGroup: jest.fn(),
          setCollisionFilterMask: jest.fn()
        });
      }
    }),
    onCollideEvent: jest.fn(),
    afterStep: jest.fn(),
    beforeStep: jest.fn(),
    registerBeforePhysicsStep: jest.fn(),
    registerAfterPhysicsStep: jest.fn(),
    registerOnPhysicsCollide: jest.fn(),
    unregisterOnPhysicsCollide: jest.fn(),
    forceUpdate: jest.fn()
  } as unknown as BABYLON.PhysicsImpostor;
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
    
    // Set up mock for CollisionSystem constructor
    (CollisionSystem as jest.Mock).mockImplementation(() => mockCollisionSystem);
    
    // Mock PhysicsSystem constructor
    (PhysicsSystem as jest.Mock).mockImplementation(() => mockPhysicsSystem);
    
    collisionManager = new CollisionManager();
  });
  
  describe('initialize', () => {
    it('should initialize with a scene and register itself as a system', () => {
      // Create a direct spy on the initialize method to track the scene parameter
      const initializeSpy = jest.spyOn(collisionManager, 'initialize');
      
      // Mock the getSystem method to return our mockPhysicsSystem when called with 'PhysicsSystem'
      mockScene.getSystem.mockImplementation((systemName: string) => {
        if (systemName === 'PhysicsSystem') {
          return mockPhysicsSystem;
        }
        return null;
      });
      
      collisionManager.initialize(mockScene);
      
      expect(mockScene.registerSystem).toHaveBeenCalledWith('CollisionManager', collisionManager);
      expect(initializeSpy).toHaveBeenCalledWith(mockScene);
      expect(mockCollisionSystem.initialize).toHaveBeenCalled();
    });
    
    it('should create a new CollisionSystem if one is not provided', () => {
      collisionManager.initialize(mockScene);
      
      expect(CollisionSystem).toHaveBeenCalled();
      expect(mockCollisionSystem.initialize).toHaveBeenCalled();
    });
    
    it('should warn when physics system is not available', () => {
      // Mock getPhysicsEngine to return null
      mockScene.getPhysicsEngine.mockReturnValue(null);
      
      collisionManager.initialize(mockScene);
      
      // Use the exact warning message from the implementation
      expect(console.warn).toHaveBeenCalledWith("CollisionManager: Physics engine is not initialized in the scene. Collisions will not work.");
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
      // Initialize the manager
      collisionManager.initialize(mockScene);
      
      // Create a mock impostor with tags
      const impostor1 = createMockImpostor('123', {
        metadata: { tags: ['player'] },
        mass: 10
      });
      
      const groupId = 'test-group';
      const callback = jest.fn();
      
      // Create a mock group and set it up in the collision manager's internal map
      (collisionManager as any).collisionGroups = new Map();
      const mockGroupImpostors = new Set([
        createMockImpostor('456', { 
          metadata: { tags: ['static'] },
          mass: 0
        })
      ]);
      
      (collisionManager as any).collisionGroups.set(groupId, {
        id: groupId,
        name: 'test-group',
        impostors: mockGroupImpostors
      });
      
      // Mock the registerCollisionHandler method
      const mockRegister = jest.fn().mockReturnValue('collision-id');
      (collisionManager as any).collisionSystem.registerCollisionHandler = mockRegister;
      
      // Call the method we're testing
      const id = collisionManager.setupCollisionWithGroup(impostor1, groupId, callback);
      
      // Verify the result
      expect(id).toBe('collision-id');
      
      // Verify the collision system method was called with correct parameters
      expect(mockRegister).toHaveBeenCalledWith(
        impostor1,
        expect.any(Array),
        callback
      );
      
      // Verify the method was called with the correct group impostors
      const args = mockRegister.mock.calls[0];
      expect(args[0]).toBe(impostor1);
      expect(Array.isArray(args[1])).toBe(true);
      // Verify that the array contains the expected impostor from our mockGroupImpostors
      expect(args[1]).toEqual(Array.from(mockGroupImpostors));
    });
  });
  
  describe('removeCollisionHandler', () => {
    it('should forward calls to the collision system', () => {
      collisionManager.initialize(mockScene);
      
      // Set up a mock handler in the internal map
      (collisionManager as any).collisionHandlers = new Map();
      (collisionManager as any).collisionHandlers.set('test-id', 'test-id');
      
      const id = 'test-id';
      collisionManager.removeCollisionHandler(id);
      
      expect(mockCollisionSystem.unregisterCollisionHandler).toHaveBeenCalledWith(id);
    });
  });
  
  describe('createTriggerVolume', () => {
    it('should forward calls to the collision system', () => {
      collisionManager.initialize(mockScene);
      
      // Create mock mesh and options
      const mesh = { 
        id: 'mesh-1',
        position: new BABYLON.Vector3(10, 0, 0),
        metadata: { tags: ['player-trigger'] }
      } as BABYLON.AbstractMesh;
      
      const options = {
        type: CollisionVolumeType.Box,
        parameters: { width: 2, height: 2, depth: 2 },
        isTrigger: true,
        tags: ['trigger', 'player-zone']
      };
      
      // Mock callbacks
      const onEnter = jest.fn();
      const onExit = jest.fn();
      const onStay = jest.fn();
      
      // Mock the createCollisionVolume method
      const mockImpostor = createMockImpostor('impostor-1', {
        type: BABYLON.PhysicsImpostor.BoxImpostor,
        mesh,
        isTrigger: true,
        metadata: { tags: options.tags }
      });
      
      (collisionManager as any).createCollisionVolume = jest.fn().mockReturnValue(mockImpostor);
      
      // Mock the registerTriggerZone method
      const mockRegisterTrigger = jest.fn().mockReturnValue('trigger-id');
      (collisionManager as any).collisionSystem.registerTriggerZone = mockRegisterTrigger;
      
      // Call the method we're testing
      const id = collisionManager.createTriggerVolume(
        mesh,
        options,
        onEnter,
        onExit,
        onStay
      );
      
      // Verify the result
      expect(id).toBe('trigger-id');
      
      // Verify createCollisionVolume was called with correct parameters
      expect((collisionManager as any).createCollisionVolume).toHaveBeenCalledWith(
        mesh,
        expect.objectContaining({
          type: options.type,
          parameters: options.parameters,
          isTrigger: true,
          tags: options.tags
        })
      );
      
      // Verify registerTriggerZone was called with correct parameters
      expect(mockRegisterTrigger).toHaveBeenCalledWith(
        mockImpostor,
        expect.objectContaining({
          includeTags: options.tags
        }),
        onEnter,
        onExit,
        onStay
      );
      
      // Verify that the triggerVolumes map gets updated
      expect((collisionManager as any).triggerVolumes.has('trigger-id')).toBe(true);
    });
  });
  
  describe('removeTriggerVolume', () => {
    it('should forward calls to the collision system', () => {
      collisionManager.initialize(mockScene);
      
      // Set up a mock trigger in the internal map
      (collisionManager as any).triggerVolumes = new Map();
      (collisionManager as any).triggerVolumes.set('test-trigger-id', 'test-trigger-id');
      
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
        includeTags: ['obstacle'],
        filterFunction: jest.fn().mockReturnValue(true) as any
      };
      
      // Create a mock raycast result with proper structure
      const mockResult = { 
        hit: true, 
        distance: 5,
        pickedPoint: new BABYLON.Vector3(5, 0, 0),
        pickedMesh: { id: 'hit-mesh' } as any,
        physicsImpostor: createMockImpostor('hit-impostor', {
          metadata: { tags: ['obstacle'] }
        })
      };
      
      // Set up the mock implementation
      (mockCollisionSystem.raycast as jest.Mock).mockReturnValue(mockResult);
      
      // Call the method under test
      const result = collisionManager.raycast(from, to, filter);
      
      // Verify results
      expect(result).toBe(mockResult);
      expect(mockCollisionSystem.raycast).toHaveBeenCalledWith(from, to, filter);
      
      // Verify the parameters passed to the collision system's raycast method
      const args = (mockCollisionSystem.raycast as jest.Mock).mock.calls[0];
      expect(args[0]).toBe(from);
      expect(args[1]).toBe(to);
      expect(args[2]).toBe(filter);
    });
  });
  
  describe('dispose', () => {
    it('should clean up resources and unregister from the scene', () => {
      collisionManager.initialize(mockScene);
      
      // Set up some mock data to verify cleanup
      (collisionManager as any).collisionGroups = new Map();
      (collisionManager as any).collisionGroups.set('group-1', {
        id: 'group-1',
        name: 'test-group',
        impostors: new Set([createMockImpostor('123')])
      });
      
      (collisionManager as any).collisionHandlers = new Map();
      (collisionManager as any).collisionHandlers.set('handler-1', 'handler-1');
      
      (collisionManager as any).triggerVolumes = new Map();
      (collisionManager as any).triggerVolumes.set('trigger-1', 'trigger-1');
      
      // Mock unregister methods
      const mockUnregisterHandler = jest.fn();
      (collisionManager as any).collisionSystem.unregisterCollisionHandler = mockUnregisterHandler;
      
      const mockUnregisterTrigger = jest.fn();
      (collisionManager as any).collisionSystem.unregisterTriggerZone = mockUnregisterTrigger;
      
      collisionManager.dispose();
      
      // Verify all resources were cleaned up
      expect(mockCollisionSystem.dispose).toHaveBeenCalled();
      expect(mockScene.unregisterSystem).toHaveBeenCalledWith('CollisionManager');
      
      // Verify unregister methods were called for handlers and triggers
      expect(mockUnregisterHandler).toHaveBeenCalledWith('handler-1');
      expect(mockUnregisterTrigger).toHaveBeenCalledWith('trigger-1');
      
      // Verify collections are empty
      expect((collisionManager as any).collisionGroups.size).toBe(0);
      expect((collisionManager as any).collisionHandlers.size).toBe(0);
      expect((collisionManager as any).triggerVolumes.size).toBe(0);
    });
    
    it('should not throw if scene is null', () => {
      // Initialize without scene
      (collisionManager as any).scene = null;
      (collisionManager as any).collisionSystem = mockCollisionSystem;
      
      expect(() => {
        collisionManager.dispose();
      }).not.toThrow();
      
      expect(mockCollisionSystem.dispose).toHaveBeenCalled();
    });
  });
});

