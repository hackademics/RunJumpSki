/**
 * @file tests/unit/core/ecs/components/PhysicsComponent.test.ts
 * @description Unit tests for the PhysicsComponent.
 */

import * as BABYLON from 'babylonjs';
import { PhysicsComponent, PhysicsImpostorType } from '@core/ecs/components/PhysicsComponent';

// Mock Vector3 static methods
(BABYLON.Vector3 as any).Zero = () => new BABYLON.Vector3(0, 0, 0);

// Define a constant for trigger flag value
const DEFAULT_TRIGGER_FLAG = 4;

// Mock Matrix class
class MockMatrix {
  m = new Array(16).fill(0);
  
  constructor() {
    // Identity matrix
    this.m[0] = 1;
    this.m[5] = 1;
    this.m[10] = 1;
    this.m[15] = 1;
  }
  
  // Required for PhysicsComponent.syncTransform
  decompose(scaling: BABYLON.Vector3, rotation: BABYLON.Quaternion, position: BABYLON.Vector3) {
    // Set basic values for testing
    position.x = 0;
    position.y = 0;
    position.z = 0;
    
    scaling.x = 1;
    scaling.y = 1;
    scaling.z = 1;
    
    rotation.x = 0;
    rotation.y = 0;
    rotation.z = 0;
    rotation.w = 1;
    
    return true;
  }
  
  getRotationMatrix() {
    return new MockMatrix();
  }
}

// Create a fake PhysicsImpostor for testing.
class FakePhysicsImpostor {
  mesh: any;
  type: number;
  options: any;
  physicsBody: any;
  
  constructor(mesh: any, type: number, options: any) {
    this.mesh = mesh;
    this.type = type;
    this.options = options;
    this.physicsBody = {
      setGravity: jest.fn(),
      setMassProperties: jest.fn(),
      setLinearVelocity: jest.fn(),
      setAngularVelocity: jest.fn(),
      setDamping: jest.fn(),
      setSleepingThresholds: jest.fn(),
      setAngularFactor: jest.fn(),
      setLinearFactor: jest.fn(),
      setCollisionFlags: jest.fn()
    };
  }
  
  getParam(name: string) {
    return this.options[name];
  }
  
  setMass(mass: number) {
    this.options.mass = mass;
    return this;
  }
  
  setLinearVelocity(velocity: BABYLON.Vector3) {
    this.physicsBody.setLinearVelocity(velocity);
    return this;
  }
  
  setAngularVelocity(velocity: BABYLON.Vector3) {
    this.physicsBody.setAngularVelocity(velocity);
    return this;
  }
  
  registerOnPhysicsCollide(collider: any, callback: any) {
    return {
      dispose: jest.fn()
    };
  }
  
  dispose() {
    // Mock dispose method
  }
}

// Mock for Vector3
class MockVector3 {
  x: number;
  y: number;
  z: number;
  
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  
  copyFrom(vector: any) {
    this.x = vector.x;
    this.y = vector.y;
    this.z = vector.z;
    return this;
  }
  
  equals(other: MockVector3) {
    return this.x === other.x && this.y === other.y && this.z === other.z;
  }
  
  clone() {
    return new MockVector3(this.x, this.y, this.z);
  }
  
  set(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
  
  static Zero() {
    return new MockVector3(0, 0, 0);
  }
}

// Mock Quaternion
class MockQuaternion {
  x: number;
  y: number;
  z: number;
  w: number;
  
  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }
}

// Mock entity with required components
const mockTransform = {
  getWorldMatrix: jest.fn().mockReturnValue(new MockMatrix()),
  position: new BABYLON.Vector3(0, 0, 0),
  rotationQuaternion: { x: 0, y: 0, z: 0, w: 1 }
};

const mockMesh = {
  physicsImpostor: null,
  getBoundingInfo: jest.fn().mockReturnValue({
    boundingBox: {
      extendSize: new BABYLON.Vector3(1, 1, 1)
    }
  })
};

const mockEntity = {
  id: 'test-entity-1',
  hasComponent: jest.fn((type) => {
    if (type === 'transform') return true;
    if (type === 'mesh') return true;
    return false;
  }),
  getComponent: jest.fn((type) => {
    if (type === 'transform') return mockTransform;
    if (type === 'mesh') return {
      getMesh: () => mockMesh
    };
    return null;
  }),
  addComponent: jest.fn(),
  removeComponent: jest.fn(),
  dispose: jest.fn()
};

describe('PhysicsComponent', () => {
  let physicsComponent: PhysicsComponent;
  let originalPhysicsImpostor: any;
  let originalVector3: any;
  let originalQuaternion: any;
  let originalMatrix: any;
  
  beforeAll(() => {
    // Backup the original Babylon classes
    originalPhysicsImpostor = BABYLON.PhysicsImpostor;
    originalVector3 = BABYLON.Vector3;
    originalQuaternion = BABYLON.Quaternion;
    originalMatrix = BABYLON.Matrix;
    
    // Override with our fake implementation for testing
    (BABYLON as any).PhysicsImpostor = FakePhysicsImpostor;
    (BABYLON as any).Vector3 = MockVector3;
    (BABYLON as any).Quaternion = MockQuaternion;
    (BABYLON as any).Matrix = MockMatrix;
    
    // Define the necessary constants
    (BABYLON.PhysicsImpostor as any).BoxImpostor = 1;
    (BABYLON.PhysicsImpostor as any).SphereImpostor = 2;
    
    // Set up Vector3 static methods
    (BABYLON.Vector3 as any).Zero = () => new MockVector3(0, 0, 0);
  });

  afterAll(() => {
    // Restore the original Babylon classes
    (BABYLON as any).PhysicsImpostor = originalPhysicsImpostor;
    (BABYLON as any).Vector3 = originalVector3;
    (BABYLON as any).Quaternion = originalQuaternion;
    (BABYLON as any).Matrix = originalMatrix;
  });

  beforeEach(() => {
    // Reset mock mesh's physicsImpostor
    mockMesh.physicsImpostor = null;
    
    // Create a new PhysicsComponent with test parameters
    physicsComponent = new PhysicsComponent({
      mass: 2,
      friction: 0.3,
      restitution: 0.8,
      impostorType: PhysicsImpostorType.Box,
      createImpostorOnInitialize: false // Don't create impostor automatically so we can test it explicitly
    });
    
    // Initialize the component with our mock entity
    physicsComponent.initialize(mockEntity as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should create a physics impostor with correct parameters', () => {
    // Force creation of the impostor
    (physicsComponent as any).createImpostor();
    
    // Verify the impostor was created with correct parameters
    const impostor = (physicsComponent as any).impostor;
    expect(impostor).not.toBeNull();
    expect(impostor.getParam('mass')).toBe(2);
    expect(impostor.getParam('friction')).toBe(0.3);
    expect(impostor.getParam('restitution')).toBe(0.8);
  });
  
  test('should set mass correctly', () => {
    // Force creation of the impostor
    (physicsComponent as any).createImpostor();
    
    // Set the mass
    physicsComponent.setMass(5);
    
    // Verify the mass was updated
    const impostor = (physicsComponent as any).impostor;
    expect(impostor.getParam('mass')).toBe(5);
  });
  
  test('should set linear velocity', () => {
    // Force creation of the impostor
    (physicsComponent as any).createImpostor();
    
    // Set the velocity
    const velocity = new BABYLON.Vector3(1, 2, 3);
    physicsComponent.setLinearVelocity(velocity);
    
    // Verify setLinearVelocity was called on the impostor
    expect((physicsComponent as any).impostor.physicsBody.setLinearVelocity).toHaveBeenCalled();
  });
  
  test('should set angular velocity', () => {
    // Force creation of the impostor
    (physicsComponent as any).createImpostor();
    
    // Set the velocity
    const velocity = new BABYLON.Vector3(1, 2, 3);
    physicsComponent.setAngularVelocity(velocity);
    
    // Verify setAngularVelocity was called on the impostor
    expect((physicsComponent as any).impostor.physicsBody.setAngularVelocity).toHaveBeenCalled();
  });
  
  test('should dispose properly', () => {
    // Force creation of the impostor
    (physicsComponent as any).createImpostor();
    
    // Mock the dispose method
    const spy = jest.spyOn((physicsComponent as any).impostor, 'dispose');
    
    // Dispose the component
    physicsComponent.dispose();
    
    // Verify dispose was called
    expect(spy).toHaveBeenCalled();
  });
});
