/**
 * @file tests/unit/core/physics/PhysicsManager.test.ts
 * @description Unit tests for the PhysicsManager class.
 */

import * as BABYLON from 'babylonjs';
import { PhysicsManager, PhysicsOptions, DEFAULT_PHYSICS_OPTIONS } from '../../../../src/core/physics/PhysicsManager';
import { IPhysicsSystem } from '../../../../src/core/physics/IPhysicsSystem';

// Create a mock PhysicsSystem
const createMockPhysicsSystem = (): IPhysicsSystem => {
  return {
    initialize: jest.fn(),
    update: jest.fn(),
    setGravity: jest.fn(),
    dispose: jest.fn(),
    getPhysicsEngine: jest.fn().mockReturnValue({}),
    createImpostor: jest.fn().mockReturnValue({
      setLinearVelocity: jest.fn(),
      setAngularVelocity: jest.fn(),
      physicsBody: {},
      executeNativeFunction: jest.fn(),
    }),
    applyForce: jest.fn(),
    applyImpulse: jest.fn(),
    createJoint: jest.fn().mockReturnValue({}),
    registerOnCollide: jest.fn()
  };
};

// Mock Babylon.js
jest.mock('babylonjs', () => {
  return {
    Vector3: jest.fn().mockImplementation((x, y, z) => ({ x, y, z })),
    Scene: jest.fn(),
    AbstractMesh: jest.fn(),
    PhysicsImpostor: {
      BoxImpostor: 1,
      SphereImpostor: 2,
    },
    PhysicsJoint: {
      BallAndSocketJoint: 0,
      DistanceJoint: 1,
    }
  };
});

describe('PhysicsManager', () => {
  let physicsManager: PhysicsManager;
  let mockPhysicsSystem: IPhysicsSystem;
  let mockScene: BABYLON.Scene;
  let mockMesh: BABYLON.AbstractMesh;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPhysicsSystem = createMockPhysicsSystem();
    mockScene = new BABYLON.Scene(null as any);
    mockMesh = { uniqueId: '123', name: 'testMesh' } as any as BABYLON.AbstractMesh;
    
    physicsManager = new PhysicsManager(mockPhysicsSystem);
  });

  describe('constructor', () => {
    it('should use the provided physics system', () => {
      const manager = new PhysicsManager(mockPhysicsSystem);
      expect(manager.getPhysicsSystem()).toBe(mockPhysicsSystem);
    });
    
    it('should apply default options if none provided', () => {
      const manager = new PhysicsManager(mockPhysicsSystem);
      manager.initialize(mockScene);
      expect(mockPhysicsSystem.setGravity).toHaveBeenCalledWith(DEFAULT_PHYSICS_OPTIONS.gravity);
    });
    
    it('should merge custom options with defaults', () => {
      const customOptions: Partial<PhysicsOptions> = {
        gravity: new BABYLON.Vector3(0, -15, 0),
        defaultMass: 2.0
      };
      
      const manager = new PhysicsManager(mockPhysicsSystem, customOptions);
      manager.initialize(mockScene);
      expect(mockPhysicsSystem.setGravity).toHaveBeenCalledWith(customOptions.gravity);
    });
  });

  describe('initialize', () => {
    it('should initialize the physics system', () => {
      physicsManager.initialize(mockScene);
      expect(mockPhysicsSystem.initialize).toHaveBeenCalledWith(mockScene);
    });
    
    it('should configure physics with default options', () => {
      physicsManager.initialize(mockScene);
      expect(mockPhysicsSystem.setGravity).toHaveBeenCalledWith(DEFAULT_PHYSICS_OPTIONS.gravity);
    });
  });

  describe('update', () => {
    it('should update the physics system', () => {
      const deltaTime = 0.016; // ~60fps
      physicsManager.update(deltaTime);
      expect(mockPhysicsSystem.update).toHaveBeenCalledWith(deltaTime);
    });
  });

  describe('createBody', () => {
    it('should create a physics impostor via physics system', () => {
      const options = { mass: 1, friction: 0.5, restitution: 0.3 };
      physicsManager.createBody(mockMesh, BABYLON.PhysicsImpostor.BoxImpostor, options);
      
      expect(mockPhysicsSystem.createImpostor).toHaveBeenCalledWith(
        mockMesh,
        BABYLON.PhysicsImpostor.BoxImpostor,
        options
      );
    });
  });

  describe('createStaticCollider', () => {
    it('should create a static collider with mass 0', () => {
      physicsManager.createStaticCollider(mockMesh, BABYLON.PhysicsImpostor.BoxImpostor);
      
      expect(mockPhysicsSystem.createImpostor).toHaveBeenCalledWith(
        mockMesh,
        BABYLON.PhysicsImpostor.BoxImpostor,
        expect.objectContaining({ mass: 0 })
      );
    });
  });

  describe('createKinematicBody', () => {
    it('should create a kinematic body', () => {
      const impostor = physicsManager.createKinematicBody(
        mockMesh,
        BABYLON.PhysicsImpostor.BoxImpostor,
        0.001
      );
      
      expect(mockPhysicsSystem.createImpostor).toHaveBeenCalledWith(
        mockMesh,
        BABYLON.PhysicsImpostor.BoxImpostor,
        expect.objectContaining({ mass: 0.001 })
      );
      
      // Verify executeNativeFunction was called to set kinematic
      expect(impostor.executeNativeFunction).toHaveBeenCalled();
    });
    
    it('should use default mass if not provided', () => {
      physicsManager.createKinematicBody(mockMesh, BABYLON.PhysicsImpostor.BoxImpostor);
      
      expect(mockPhysicsSystem.createImpostor).toHaveBeenCalledWith(
        mockMesh,
        BABYLON.PhysicsImpostor.BoxImpostor,
        expect.objectContaining({ mass: 0.001 }) // Default value
      );
    });
  });

  describe('createDynamicBody', () => {
    it('should create a dynamic body with specified parameters', () => {
      physicsManager.createDynamicBody(
        mockMesh,
        BABYLON.PhysicsImpostor.BoxImpostor,
        2.0,
        0.5,
        0.7
      );
      
      expect(mockPhysicsSystem.createImpostor).toHaveBeenCalledWith(
        mockMesh,
        BABYLON.PhysicsImpostor.BoxImpostor,
        expect.objectContaining({
          mass: 2.0,
          restitution: 0.5,
          friction: 0.7
        })
      );
    });
    
    it('should use default values if not provided', () => {
      physicsManager.createDynamicBody(mockMesh, BABYLON.PhysicsImpostor.BoxImpostor);
      
      expect(mockPhysicsSystem.createImpostor).toHaveBeenCalledWith(
        mockMesh,
        BABYLON.PhysicsImpostor.BoxImpostor,
        expect.objectContaining({
          mass: DEFAULT_PHYSICS_OPTIONS.defaultMass,
          restitution: DEFAULT_PHYSICS_OPTIONS.defaultRestitution,
          friction: DEFAULT_PHYSICS_OPTIONS.defaultFriction
        })
      );
    });
  });

  describe('registerCollision', () => {
    it('should register collision with specific impostor', () => {
      const impostor1 = mockPhysicsSystem.createImpostor(
        mockMesh,
        BABYLON.PhysicsImpostor.BoxImpostor,
        { mass: 1 }
      );
      
      const impostor2 = mockPhysicsSystem.createImpostor(
        mockMesh,
        BABYLON.PhysicsImpostor.BoxImpostor,
        { mass: 1 }
      );
      
      const callback = jest.fn();
      
      physicsManager.registerCollision(impostor1, impostor2, callback);
      
      expect(mockPhysicsSystem.registerOnCollide).toHaveBeenCalledWith(
        impostor1,
        impostor2,
        callback
      );
    });
    
    it('should register collision with any other impostor if null is provided', () => {
      const impostor = mockPhysicsSystem.createImpostor(
        mockMesh,
        BABYLON.PhysicsImpostor.BoxImpostor,
        { mass: 1 }
      );
      
      const callback = jest.fn();
      
      physicsManager.registerCollision(impostor, null, callback);
      
      // Should use registerOnPhysicsCollide on the impostor itself with an empty array
      expect(impostor.registerOnPhysicsCollide).toHaveBeenCalled();
    });
  });

  describe('createConstraint', () => {
    it('should create a joint between bodies', () => {
      const mainBody = mockPhysicsSystem.createImpostor(
        mockMesh,
        BABYLON.PhysicsImpostor.BoxImpostor,
        { mass: 1 }
      );
      
      const connectedBody = mockPhysicsSystem.createImpostor(
        mockMesh,
        BABYLON.PhysicsImpostor.BoxImpostor,
        { mass: 1 }
      );
      
      const options = {
        pivotA: new BABYLON.Vector3(0, 1, 0),
        pivotB: new BABYLON.Vector3(0, -1, 0)
      };
      
      physicsManager.createConstraint(
        BABYLON.PhysicsJoint.BallAndSocketJoint,
        mainBody,
        connectedBody,
        options
      );
      
      expect(mockPhysicsSystem.createJoint).toHaveBeenCalledWith(
        BABYLON.PhysicsJoint.BallAndSocketJoint,
        mainBody,
        connectedBody,
        options
      );
    });
  });

  describe('applyForce & applyImpulse', () => {
    it('should apply force to a body', () => {
      const body = mockPhysicsSystem.createImpostor(
        mockMesh,
        BABYLON.PhysicsImpostor.BoxImpostor,
        { mass: 1 }
      );
      
      const force = new BABYLON.Vector3(10, 0, 0);
      const contactPoint = new BABYLON.Vector3(0, 1, 0);
      
      physicsManager.applyForce(body, force, contactPoint);
      
      expect(mockPhysicsSystem.applyForce).toHaveBeenCalledWith(
        body,
        force,
        contactPoint
      );
    });
    
    it('should apply impulse to a body', () => {
      const body = mockPhysicsSystem.createImpostor(
        mockMesh,
        BABYLON.PhysicsImpostor.BoxImpostor,
        { mass: 1 }
      );
      
      const impulse = new BABYLON.Vector3(10, 0, 0);
      const contactPoint = new BABYLON.Vector3(0, 1, 0);
      
      physicsManager.applyImpulse(body, impulse, contactPoint);
      
      expect(mockPhysicsSystem.applyImpulse).toHaveBeenCalledWith(
        body,
        impulse,
        contactPoint
      );
    });
  });

  describe('setLinearVelocity & setAngularVelocity', () => {
    it('should set linear velocity on a body', () => {
      const body = mockPhysicsSystem.createImpostor(
        mockMesh,
        BABYLON.PhysicsImpostor.BoxImpostor,
        { mass: 1 }
      );
      
      const velocity = new BABYLON.Vector3(5, 0, 0);
      
      physicsManager.setLinearVelocity(body, velocity);
      
      expect(body.setLinearVelocity).toHaveBeenCalledWith(velocity);
    });
    
    it('should set angular velocity on a body', () => {
      const body = mockPhysicsSystem.createImpostor(
        mockMesh,
        BABYLON.PhysicsImpostor.BoxImpostor,
        { mass: 1 }
      );
      
      const velocity = new BABYLON.Vector3(0, 2, 0);
      
      physicsManager.setAngularVelocity(body, velocity);
      
      expect(body.setAngularVelocity).toHaveBeenCalledWith(velocity);
    });
  });

  describe('dispose', () => {
    it('should destroy the physics system', () => {
      physicsManager.dispose();
      expect(mockPhysicsSystem.destroy).toHaveBeenCalled();
    });
  });
});

