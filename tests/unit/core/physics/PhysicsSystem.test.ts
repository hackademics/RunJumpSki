/**
 * @file tests/unit/core/physics/PhysicsSystem.test.ts
 * @description Unit tests for the PhysicsSystem class.
 */

import * as BABYLON from 'babylonjs';
import { PhysicsSystem } from '../../../../src/core/physics/PhysicsSystem';

// Mock Babylon.js classes
jest.mock('babylonjs', () => {
  // Helper to create mock objects with spies for all methods
  const createMockWithSpies = (methods: string[]) => {
    const mock = {};
    methods.forEach(method => {
      mock[method] = jest.fn();
    });
    return mock;
  };

  const mockPhysicsEngine = createMockWithSpies(['dispose', 'setGravity']);
  
  const mockPhysicsImpostor = {
    dispose: jest.fn(),
    applyForce: jest.fn(),
    applyImpulse: jest.fn(),
    addJoint: jest.fn(),
    registerOnPhysicsCollide: jest.fn(),
    getObjectCenter: jest.fn().mockReturnValue({ x: 0, y: 0, z: 0 })
  };

  const mockScene = {
    enablePhysics: jest.fn(),
    getPhysicsEngine: jest.fn().mockReturnValue(mockPhysicsEngine),
  };

  // Create a mock PhysicsJoint constructor and add constant properties
  const mockPhysicsJoint = jest.fn().mockImplementation(() => ({
    // Mock PhysicsJoint properties and methods
  }));
  mockPhysicsJoint.BallAndSocketJoint = 0;
  mockPhysicsJoint.DistanceJoint = 1;
  mockPhysicsJoint.HingeJoint = 2;
  mockPhysicsJoint.SliderJoint = 3;
  mockPhysicsJoint.WheelJoint = 4;

  return {
    Scene: jest.fn().mockImplementation(() => mockScene),
    Vector3: jest.fn().mockImplementation((x, y, z) => ({ x, y, z })),
    CannonJSPlugin: jest.fn(),
    PhysicsImpostor: jest.fn().mockImplementation(() => mockPhysicsImpostor),
    PhysicsJoint: mockPhysicsJoint,
    AbstractMesh: jest.fn(),
    __mockScene: mockScene,
    __mockPhysicsEngine: mockPhysicsEngine,
    __mockPhysicsImpostor: mockPhysicsImpostor,
  };
});

describe('PhysicsSystem', () => {
  let physicsSystem: PhysicsSystem;
  let mockScene: any;
  let mockPhysicsEngine: any;
  let mockPhysicsImpostor: any;
  let mockMesh: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Access the mock objects
    mockScene = (BABYLON as any).__mockScene;
    mockPhysicsEngine = (BABYLON as any).__mockPhysicsEngine;
    mockPhysicsImpostor = (BABYLON as any).__mockPhysicsImpostor;
    
    // Create a mock mesh
    mockMesh = {
      uniqueId: '123',
    };
    
    // Create a fresh instance for each test
    physicsSystem = new PhysicsSystem();
  });

  describe('initialize', () => {
    it('should initialize physics engine correctly', () => {
      physicsSystem.initialize(mockScene as BABYLON.Scene);
      
      // Verify the physics was enabled on the scene
      expect(mockScene.enablePhysics).toHaveBeenCalled();
      expect(BABYLON.CannonJSPlugin).toHaveBeenCalled();
    });
  });

  describe('setGravity', () => {
    it('should set gravity on the physics engine', () => {
      const gravity = new BABYLON.Vector3(0, -20, 0);
      
      physicsSystem.initialize(mockScene as BABYLON.Scene);
      physicsSystem.setGravity(gravity);
      
      expect(mockPhysicsEngine.setGravity).toHaveBeenCalledWith(gravity);
    });
    
    it('should not throw if physics engine is not initialized', () => {
      const gravity = new BABYLON.Vector3(0, -20, 0);
      
      expect(() => {
        physicsSystem.setGravity(gravity);
      }).not.toThrow();
    });
  });

  describe('getPhysicsEngine', () => {
    it('should return the physics engine instance', () => {
      physicsSystem.initialize(mockScene as BABYLON.Scene);
      const engine = physicsSystem.getPhysicsEngine();
      
      expect(engine).toBe(mockPhysicsEngine);
    });
    
    it('should return null if not initialized', () => {
      const engine = physicsSystem.getPhysicsEngine();
      expect(engine).toBeNull();
    });
  });

  describe('createImpostor', () => {
    it('should create and return a physics impostor', () => {
      physicsSystem.initialize(mockScene as BABYLON.Scene);
      
      const options = { mass: 1, friction: 0.5, restitution: 0.2 };
      const impostor = physicsSystem.createImpostor(
        mockMesh as BABYLON.AbstractMesh,
        BABYLON.PhysicsImpostor.BoxImpostor,
        options
      );
      
      expect(BABYLON.PhysicsImpostor).toHaveBeenCalledWith(
        mockMesh,
        BABYLON.PhysicsImpostor.BoxImpostor,
        options,
        mockScene
      );
      expect(impostor).toBe(mockPhysicsImpostor);
    });
    
    it('should throw error if scene is not initialized', () => {
      const options = { mass: 1, friction: 0.5, restitution: 0.2 };
      
      expect(() => {
        physicsSystem.createImpostor(
          mockMesh as BABYLON.AbstractMesh,
          BABYLON.PhysicsImpostor.BoxImpostor,
          options
        );
      }).toThrow("Physics system not initialized");
    });
  });

  describe('applyForce', () => {
    it('should apply force to the impostor', () => {
      const force = new BABYLON.Vector3(1, 0, 0);
      const contactPoint = new BABYLON.Vector3(0, 1, 0);
      
      physicsSystem.applyForce(
        mockPhysicsImpostor as BABYLON.PhysicsImpostor,
        force,
        contactPoint
      );
      
      expect(mockPhysicsImpostor.applyForce).toHaveBeenCalledWith(force, contactPoint);
    });
    
    it('should use object center if no contact point is provided', () => {
      const force = new BABYLON.Vector3(1, 0, 0);
      const objectCenter = new BABYLON.Vector3(0, 0, 0);
      mockPhysicsImpostor.getObjectCenter.mockReturnValue(objectCenter);
      
      physicsSystem.applyForce(
        mockPhysicsImpostor as BABYLON.PhysicsImpostor,
        force
      );
      
      expect(mockPhysicsImpostor.applyForce).toHaveBeenCalledWith(force, objectCenter);
    });
  });

  describe('applyImpulse', () => {
    it('should apply impulse to the impostor', () => {
      const impulse = new BABYLON.Vector3(1, 0, 0);
      const contactPoint = new BABYLON.Vector3(0, 1, 0);
      
      physicsSystem.applyImpulse(
        mockPhysicsImpostor as BABYLON.PhysicsImpostor,
        impulse,
        contactPoint
      );
      
      expect(mockPhysicsImpostor.applyImpulse).toHaveBeenCalledWith(impulse, contactPoint);
    });
  });

  describe('createJoint', () => {
    it('should create a physics joint and add it to the impostor', () => {
      const mainImpostor = mockPhysicsImpostor;
      const connectedImpostor = { ...mockPhysicsImpostor };
      const options = { pivotA: new BABYLON.Vector3(0, 1, 0) };
      
      physicsSystem.createJoint(
        BABYLON.PhysicsJoint.BallAndSocketJoint,
        mainImpostor as BABYLON.PhysicsImpostor,
        connectedImpostor as BABYLON.PhysicsImpostor,
        options
      );
      
      expect(BABYLON.PhysicsJoint).toHaveBeenCalledWith(
        BABYLON.PhysicsJoint.BallAndSocketJoint,
        options
      );
      expect(mainImpostor.addJoint).toHaveBeenCalled();
    });
    
    it('should throw on unsupported joint type', () => {
      const mainImpostor = mockPhysicsImpostor;
      const connectedImpostor = { ...mockPhysicsImpostor };
      const options = {};
      
      expect(() => {
        physicsSystem.createJoint(
          999, // Unsupported joint type
          mainImpostor as BABYLON.PhysicsImpostor,
          connectedImpostor as BABYLON.PhysicsImpostor,
          options
        );
      }).toThrow("Unsupported joint type");
    });
  });

  describe('registerOnCollide', () => {
    it('should register collision callback between impostors', () => {
      const impostor1 = mockPhysicsImpostor;
      const impostor2 = { ...mockPhysicsImpostor };
      const callback = jest.fn();
      
      physicsSystem.registerOnCollide(
        impostor1 as BABYLON.PhysicsImpostor,
        impostor2 as BABYLON.PhysicsImpostor,
        callback
      );
      
      expect(impostor1.registerOnPhysicsCollide).toHaveBeenCalledWith(impostor2, callback);
    });
  });

  describe('destroy', () => {
    it('should dispose the physics engine and clean up resources', () => {
      // Setup the physics system with impostors
      physicsSystem.initialize(mockScene as BABYLON.Scene);
      physicsSystem.createImpostor(
        mockMesh as BABYLON.AbstractMesh,
        BABYLON.PhysicsImpostor.BoxImpostor,
        { mass: 1 }
      );
      
      // Destroy the physics system
      physicsSystem.dispose();
      
      // Verify the physics engine was disposed
      expect(mockPhysicsEngine.dispose).toHaveBeenCalled();
      expect(mockPhysicsImpostor.dispose).toHaveBeenCalled();
    });
  });
});

