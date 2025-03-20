/**
 * @file tests/unit/core/ecs/components/ColliderComponent.test.ts
 * @description Unit tests for ColliderComponent
 */

import * as BABYLON from 'babylonjs';
import { ColliderComponent, ColliderType } from '../../../../../src/core/ecs/components/ColliderComponent';
import { Entity } from '../../../../../src/core/ecs/Entity';
import { TransformComponent } from '../../../../../src/core/ecs/components/TransformComponent';

// Mock Babylon.js
jest.mock('babylonjs');

describe('ColliderComponent', () => {
  // Mock objects
  let mockImpostor: jest.Mocked<BABYLON.PhysicsImpostor>;
  let mockPhysicsBody: jest.Mocked<any>;
  let mockBoxMesh: jest.Mocked<BABYLON.AbstractMesh>;
  let mockSphereMesh: jest.Mocked<BABYLON.AbstractMesh>;
  let mockCylinderMesh: jest.Mocked<BABYLON.AbstractMesh>;
  let mockCapsuleMesh: jest.Mocked<BABYLON.AbstractMesh>;
  let mockMaterial: jest.Mocked<BABYLON.StandardMaterial>;
  let mockScene: jest.Mocked<BABYLON.Scene>;
  let mockEngine: jest.Mocked<BABYLON.Engine>;
  let mockActionManager: jest.Mocked<BABYLON.ActionManager>;
  let entity: Entity;
  let transformComponent: TransformComponent;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock physics body
    mockPhysicsBody = {
      setCollisionFlags: jest.fn()
    };
    
    // Create mock impostor
    mockImpostor = {
      dispose: jest.fn(),
      friction: 0.3,
      restitution: 0.2,
      physicsBody: mockPhysicsBody,
      registerOnPhysicsCollide: jest.fn()
    } as unknown as jest.Mocked<BABYLON.PhysicsImpostor>;
    
    // Create mock material
    mockMaterial = {
      diffuseColor: new BABYLON.Color3(0, 1, 0),
      alpha: 0.3
    } as unknown as jest.Mocked<BABYLON.StandardMaterial>;
    
    // Create mock action manager
    mockActionManager = {
      registerAction: jest.fn()
    } as unknown as jest.Mocked<BABYLON.ActionManager>;
    
    // Create mock meshes
    const createMockMesh = (name: string): jest.Mocked<BABYLON.AbstractMesh> => {
      return {
        name,
        position: new BABYLON.Vector3(0, 0, 0),
        scaling: new BABYLON.Vector3(1, 1, 1),
        rotation: new BABYLON.Vector3(0, 0, 0),
        rotationQuaternion: new BABYLON.Quaternion(0, 0, 0, 1),
        material: null,
        physicsImpostor: null,
        isVisible: false,
        checkCollisions: false,
        dispose: jest.fn(),
        getScene: jest.fn().mockReturnValue(mockScene),
        getBoundingInfo: jest.fn().mockReturnValue({
          boundingBox: {
            minimum: new BABYLON.Vector3(-0.5, -0.5, -0.5),
            maximum: new BABYLON.Vector3(0.5, 0.5, 0.5),
            center: new BABYLON.Vector3(0, 0, 0)
          }
        }),
        getWorldMatrix: jest.fn().mockReturnValue({
          clone: jest.fn().mockReturnValue({
            invert: jest.fn().mockReturnValue(BABYLON.Matrix.Identity())
          })
        }),
        actionManager: null
      } as unknown as jest.Mocked<BABYLON.AbstractMesh>;
    };
    
    mockBoxMesh = createMockMesh('mock-box');
    mockSphereMesh = createMockMesh('mock-sphere');
    mockCylinderMesh = createMockMesh('mock-cylinder');
    mockCapsuleMesh = createMockMesh('mock-capsule');
    
    // Create mock scene
    mockScene = {
      name: 'mock-scene'
    } as unknown as jest.Mocked<BABYLON.Scene>;
    
    // Create mock engine
    mockEngine = {
      scenes: [mockScene]
    } as unknown as jest.Mocked<BABYLON.Engine>;
    
    // Mock BABYLON.Engine.Instances
    (BABYLON.Engine as any).Instances = [mockEngine];
    
    // Mock BABYLON.MeshBuilder methods
    (BABYLON.MeshBuilder.CreateBox as jest.Mock) = jest.fn().mockReturnValue(mockBoxMesh);
    (BABYLON.MeshBuilder.CreateSphere as jest.Mock) = jest.fn().mockReturnValue(mockSphereMesh);
    (BABYLON.MeshBuilder.CreateCylinder as jest.Mock) = jest.fn().mockReturnValue(mockCylinderMesh);
    (BABYLON.MeshBuilder.CreateCapsule as jest.Mock) = jest.fn().mockReturnValue(mockCapsuleMesh);
    
    // Mock BABYLON.PhysicsImpostor constructor
    (BABYLON.PhysicsImpostor as unknown as jest.Mock) = jest.fn().mockImplementation(() => mockImpostor);
    
    // Mock BABYLON.StandardMaterial constructor
    (BABYLON.StandardMaterial as unknown as jest.Mock) = jest.fn().mockImplementation(() => mockMaterial);
    
    // Mock BABYLON.ActionManager constructor
    (BABYLON.ActionManager as unknown as jest.Mock) = jest.fn().mockImplementation(() => mockActionManager);
    
    // Mock BABYLON.ExecuteCodeAction constructor
    (BABYLON.ExecuteCodeAction as unknown as jest.Mock) = jest.fn();
    
    // Mock BABYLON.Vector3.TransformCoordinates
    (BABYLON.Vector3.TransformCoordinates as jest.Mock) = jest.fn().mockImplementation((vector) => vector);
    
    // Create entity with transform component
    entity = new Entity();
    transformComponent = new TransformComponent();
    entity.addComponent(transformComponent);
    
    // Mock transformComponent.getWorldMatrix
    jest.spyOn(transformComponent, 'getWorldMatrix').mockReturnValue({
      decompose: jest.fn((scaling, rotation, position) => {
        position.copyFrom(new BABYLON.Vector3(1, 2, 3));
        rotation.copyFrom(new BABYLON.Quaternion(0, 0, 0, 1));
        scaling.copyFrom(new BABYLON.Vector3(1, 1, 1));
      })
    } as any);
  });
  
  test('should have type "collider"', () => {
    const component = new ColliderComponent();
    expect(component.type).toBe('collider');
  });
  
  test('should initialize with default options', () => {
    const component = new ColliderComponent();
    
    expect(component.getColliderType()).toBe(ColliderType.Box);
    expect(component.getSize()).toEqual(new BABYLON.Vector3(1, 1, 1));
    expect(component.getOffset()).toEqual(new BABYLON.Vector3(0, 0, 0));
    expect(component.isTrigger()).toBe(false);
    expect(component.isVisible()).toBe(false);
    expect(component.getCollisionMesh()).toBeNull();
  });
  
  test('should initialize with custom options', () => {
    const component = new ColliderComponent({
      type: ColliderType.Sphere,
      size: new BABYLON.Vector3(2, 2, 2),
      offset: new BABYLON.Vector3(0, 1, 0),
      isTrigger: true,
      isVisible: true,
      material: {
        friction: 0.5,
        restitution: 0.7
      }
    });
    
    expect(component.getColliderType()).toBe(ColliderType.Sphere);
    expect(component.getSize()).toEqual(new BABYLON.Vector3(2, 2, 2));
    expect(component.getOffset()).toEqual(new BABYLON.Vector3(0, 1, 0));
    expect(component.isTrigger()).toBe(true);
    expect(component.isVisible()).toBe(true);
  });
  
  test('should create collision mesh on initialization', () => {
    const component = new ColliderComponent({ type: ColliderType.Box });
    component.init(entity);
    
    // Verify mesh was created
    expect(BABYLON.MeshBuilder.CreateBox).toHaveBeenCalled();
    expect(component.getCollisionMesh()).not.toBeNull();
  });
  
  test('should create different collision mesh types', () => {
    // Box collider
    const boxComponent = new ColliderComponent({ type: ColliderType.Box });
    boxComponent.init(entity);
    expect(BABYLON.MeshBuilder.CreateBox).toHaveBeenCalled();
    
    // Reset call counts
    jest.clearAllMocks();
    
    // Sphere collider
    const sphereComponent = new ColliderComponent({ type: ColliderType.Sphere });
    sphereComponent.init(entity);
    expect(BABYLON.MeshBuilder.CreateSphere).toHaveBeenCalled();
    
    // Reset call counts
    jest.clearAllMocks();
    
    // Cylinder collider
    const cylinderComponent = new ColliderComponent({ type: ColliderType.Cylinder });
    cylinderComponent.init(entity);
    expect(BABYLON.MeshBuilder.CreateCylinder).toHaveBeenCalled();
    
    // Reset call counts
    jest.clearAllMocks();
    
    // Capsule collider
    const capsuleComponent = new ColliderComponent({ type: ColliderType.Capsule });
    capsuleComponent.init(entity);
    expect(BABYLON.MeshBuilder.CreateCapsule).toHaveBeenCalled();
  });
  
  test('should create physics impostor for collision mesh', () => {
    const component = new ColliderComponent();
    component.init(entity);
    
    // Verify physics impostor was created
    expect(BABYLON.PhysicsImpostor).toHaveBeenCalled();
  });
  
  test('should set and get size', () => {
    const component = new ColliderComponent();
    component.init(entity);
    
    const newSize = new BABYLON.Vector3(2, 3, 4);
    component.setSize(newSize);
    
    expect(component.getSize()).toEqual(newSize);
    
    // Verify mesh scaling was updated
    expect(mockBoxMesh.scaling).toEqual(newSize);
  });
  
  test('should set and get offset', () => {
    const component = new ColliderComponent();
    component.init(entity);
    
    const newOffset = new BABYLON.Vector3(1, 2, 3);
    component.setOffset(newOffset);
    
    expect(component.getOffset()).toEqual(newOffset);
    
    // Offset is applied during updateTransform
    expect(component.updateTransform).toBeDefined();
  });
  
  test('should set and get visibility', () => {
    const component = new ColliderComponent();
    component.init(entity);
    
    component.setVisible(true);
    
    expect(component.isVisible()).toBe(true);
    expect(mockBoxMesh.isVisible).toBe(true);
    
    // Should create a material when made visible
    expect(BABYLON.StandardMaterial).toHaveBeenCalled();
    expect(mockBoxMesh.material).toBe(mockMaterial);
  });
  
  test('should set and get trigger state', () => {
    const component = new ColliderComponent();
    component.init(entity);
    
    // Set physics impostor on mock mesh
    mockBoxMesh.physicsImpostor = mockImpostor;
    
    component.setTrigger(true);
    
    expect(component.isTrigger()).toBe(true);
    expect(mockPhysicsBody.setCollisionFlags).toHaveBeenCalled();
  });
  
  test('should register collision callback', () => {
    const component = new ColliderComponent();
    component.init(entity);
    
    // Set physics impostor on mock mesh
    mockBoxMesh.physicsImpostor = mockImpostor;
    
    const callback = jest.fn();
    component.onCollision(callback);
    
    // Should register with physics system
    expect(mockImpostor.registerOnPhysicsCollide).toHaveBeenCalled();
    
    // Should create an action manager
    expect(BABYLON.ActionManager).toHaveBeenCalled();
    expect(mockActionManager.registerAction).toHaveBeenCalled();
  });
  
  test('should check if point is inside box collider', () => {
    const component = new ColliderComponent({ type: ColliderType.Box });
    component.init(entity);
    
    // Point inside box
    expect(component.containsPoint(new BABYLON.Vector3(0, 0, 0))).toBe(true);
    
    // Point outside box
    expect(component.containsPoint(new BABYLON.Vector3(10, 10, 10))).toBe(false);
  });
  
  test('should check if point is inside sphere collider', () => {
    const component = new ColliderComponent({ type: ColliderType.Sphere });
    component.init(entity);
    
    // Mock the check for sphere differently
    (BABYLON.Vector3.prototype as any).length = jest.fn()
      .mockImplementation(function(this: BABYLON.Vector3) {
        // this refers to the vector
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
      });
    
    // Point inside sphere (at center)
    expect(component.containsPoint(new BABYLON.Vector3(0, 0, 0))).toBe(true);
    
    // Point outside sphere
    expect(component.containsPoint(new BABYLON.Vector3(1, 1, 1))).toBe(false);
  });
  
  test('should fit collider to a mesh', () => {
    const component = new ColliderComponent();
    component.init(entity);
    
    const targetMesh = mockBoxMesh;
    
    component.fitToMesh(targetMesh);
    
    // Should update size and offset
    expect(component.getSize()).toEqual(new BABYLON.Vector3(1, 1, 1));
    expect(component.getOffset()).toEqual(new BABYLON.Vector3(0, 0, 0));
  });
  
  test('should update transform from entity', () => {
    const component = new ColliderComponent();
    component.init(entity);
    
    // Spy on actual methods
    const mockCopyFrom = jest.fn();
    (mockBoxMesh.position as any).copyFrom = mockCopyFrom;
    
    // Update transform
    component.updateTransform();
    
    // Verify transform was updated from entity
    expect(mockCopyFrom).toHaveBeenCalled();
  });
  
  test('should update transform during update', () => {
    const component = new ColliderComponent();
    component.init(entity);
    
    // Spy on updateTransform
    const updateSpy = jest.spyOn(component, 'updateTransform');
    
    // Update the component
    component.update(0.016);
    
    // Verify updateTransform was called
    expect(updateSpy).toHaveBeenCalled();
  });
  
  test('should not update when disabled', () => {
    const component = new ColliderComponent();
    component.init(entity);
    
    // Spy on updateTransform
    const updateSpy = jest.spyOn(component, 'updateTransform');
    
    // Disable the component
    component.setEnabled(false);
    
    // Update the component
    component.update(0.016);
    
    // Verify updateTransform was not called
    expect(updateSpy).not.toHaveBeenCalled();
  });
  
  test('should clean up resources on dispose', () => {
    const component = new ColliderComponent();
    component.init(entity);
    
    // Get a reference to the mesh
    const mesh = component.getCollisionMesh();
    
    component.dispose();
    
    // Verify mesh was disposed
    expect(mesh?.dispose).toHaveBeenCalled();
    
    // Verify the component no longer has a reference to the mesh
    expect(component.getCollisionMesh()).toBeNull();
  });
});

