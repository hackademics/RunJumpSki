/**
 * @file tests/unit/core/ecs/components/PhysicsComponent.test.ts
 * @description Unit tests for PhysicsComponent
 */

import * as BABYLON from 'babylonjs';
import { PhysicsComponent, PhysicsImpostorType } from '../../../../../src/core/ecs/components/PhysicsComponent';
import { Entity } from '../../../../../src/core/ecs/Entity';
import { TransformComponent } from '../../../../../src/core/ecs/components/TransformComponent';
import { MeshComponent } from '../../../../../src/core/ecs/components/MeshComponent';

// Mock Babylon.js
jest.mock('babylonjs');

describe('PhysicsComponent', () => {
  // Mock objects
  let mockImpostor: jest.Mocked<BABYLON.PhysicsImpostor>;
  let mockPhysicsBody: jest.Mocked<any>;
  let mockMesh: jest.Mocked<BABYLON.AbstractMesh>;
  let mockScene: jest.Mocked<BABYLON.Scene>;
  let mockEngine: jest.Mocked<BABYLON.Engine>;
  let entity: Entity;
  let transformComponent: TransformComponent;
  let meshComponent: MeshComponent;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock physics body
    mockPhysicsBody = {
      setGravity: jest.fn(),
      setCollisionFlags: jest.fn()
    };
    
    // Create mock impostor
    mockImpostor = {
      dispose: jest.fn(),
      setMass: jest.fn(),
      setLinearVelocity: jest.fn(),
      setAngularVelocity: jest.fn(),
      applyImpulse: jest.fn(),
      applyForce: jest.fn(),
      object: mockMesh,
      getObjectCenter: jest.fn().mockReturnValue(new BABYLON.Vector3(0, 0, 0)),
      getLinearVelocity: jest.fn().mockReturnValue(new BABYLON.Vector3(0, 0, 0)),
      getAngularVelocity: jest.fn().mockReturnValue(new BABYLON.Vector3(0, 0, 0)),
      position: new BABYLON.Vector3(0, 0, 0),
      rotationQuaternion: new BABYLON.Quaternion(0, 0, 0, 1),
      physicsBody: mockPhysicsBody,
      setParam: jest.fn(),
      registerOnPhysicsCollide: jest.fn()
    } as unknown as jest.Mocked<BABYLON.PhysicsImpostor>;
    
    // Create mock mesh
    mockMesh = {
      name: 'mock-mesh',
      physicsImpostor: mockImpostor,
      position: new BABYLON.Vector3(0, 0, 0),
      rotationQuaternion: new BABYLON.Quaternion(0, 0, 0, 1),
      scaling: new BABYLON.Vector3(1, 1, 1),
      isVisible: true
    } as unknown as jest.Mocked<BABYLON.AbstractMesh>;
    
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
    (BABYLON.MeshBuilder.CreateBox as jest.Mock) = jest.fn().mockReturnValue(mockMesh);
    
    // Mock BABYLON.PhysicsImpostor constructor
    (BABYLON.PhysicsImpostor as unknown as jest.Mock) = jest.fn().mockImplementation(() => mockImpostor);
    
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
    
    // Add mesh component
    meshComponent = new MeshComponent({ mesh: mockMesh });
    entity.addComponent(meshComponent);
  });
  
  test('should have type "physics"', () => {
    const component = new PhysicsComponent();
    expect(component.type).toBe('physics');
  });
  
  test('should initialize with default options', () => {
    const component = new PhysicsComponent();
    
    expect(component.getMass()).toBe(1.0);
    expect(component.getRestitution()).toBe(0.2);
    expect(component.getFriction()).toBe(0.2);
    expect(component.isGravityEnabled()).toBe(true);
    expect(component.isTrigger()).toBe(false);
    expect(component.getLinearVelocity()).toEqual(new BABYLON.Vector3(0, 0, 0));
    expect(component.getAngularVelocity()).toEqual(new BABYLON.Vector3(0, 0, 0));
    expect(component.getImpostor()).toBeNull();
  });
  
  test('should initialize with custom options', () => {
    const component = new PhysicsComponent({
      impostorType: PhysicsImpostorType.Sphere,
      mass: 2.0,
      restitution: 0.5,
      friction: 0.3,
      gravityEnabled: false,
      isTrigger: true,
      linearVelocity: new BABYLON.Vector3(1, 0, 0),
      angularVelocity: new BABYLON.Vector3(0, 1, 0)
    });
    
    expect(component.getMass()).toBe(2.0);
    expect(component.getRestitution()).toBe(0.5);
    expect(component.getFriction()).toBe(0.3);
    expect(component.isGravityEnabled()).toBe(false);
    expect(component.isTrigger()).toBe(true);
    expect(component.getLinearVelocity()).toEqual(new BABYLON.Vector3(1, 0, 0));
    expect(component.getAngularVelocity()).toEqual(new BABYLON.Vector3(0, 1, 0));
  });
  
  test('should create impostor on initialization', () => {
    const component = new PhysicsComponent();
    component.init(entity);
    
    // Verify impostor creation
    expect(BABYLON.PhysicsImpostor).toHaveBeenCalled();
    expect(component.getImpostor()).not.toBeNull();
  });
  
  test('should not create impostor when createImpostorOnInit is false', () => {
    const component = new PhysicsComponent({ createImpostorOnInit: false });
    component.init(entity);
    
    // Verify impostor was not created
    expect(component.getImpostor()).toBeNull();
  });
  
  test('should create impostor manually', () => {
    const component = new PhysicsComponent({ createImpostorOnInit: false });
    component.init(entity);
    
    // Manually create impostor
    component.createImpostor();
    
    // Verify impostor creation
    expect(BABYLON.PhysicsImpostor).toHaveBeenCalled();
    expect(component.getImpostor()).not.toBeNull();
  });
  
  test('should set and get mass', () => {
    const component = new PhysicsComponent();
    component.init(entity);
    
    component.setMass(5.0);
    
    expect(component.getMass()).toBe(5.0);
    expect(mockImpostor.setMass).toHaveBeenCalledWith(5.0);
  });
  
  test('should clamp negative mass to 0', () => {
    const component = new PhysicsComponent();
    component.init(entity);
    
    component.setMass(-1.0);
    
    expect(component.getMass()).toBe(0);
  });
  
  test('should set and get restitution', () => {
    const component = new PhysicsComponent();
    component.init(entity);
    
    component.setRestitution(0.7);
    
    expect(component.getRestitution()).toBe(0.7);
    expect(mockImpostor.setParam).toHaveBeenCalledWith('restitution', 0.7);
  });
  
  test('should clamp restitution between 0 and 1', () => {
    const component = new PhysicsComponent();
    component.init(entity);
    
    component.setRestitution(-0.5);
    expect(component.getRestitution()).toBe(0);
    
    component.setRestitution(1.5);
    expect(component.getRestitution()).toBe(1);
  });
  
  test('should set and get friction', () => {
    const component = new PhysicsComponent();
    component.init(entity);
    
    component.setFriction(0.8);
    
    expect(component.getFriction()).toBe(0.8);
    expect(mockImpostor.setParam).toHaveBeenCalledWith('friction', 0.8);
  });
  
  test('should clamp friction between 0 and 1', () => {
    const component = new PhysicsComponent();
    component.init(entity);
    
    component.setFriction(-0.5);
    expect(component.getFriction()).toBe(0);
    
    component.setFriction(1.5);
    expect(component.getFriction()).toBe(1);
  });
  
  test('should set and get linear velocity', () => {
    const component = new PhysicsComponent();
    component.init(entity);
    
    const velocity = new BABYLON.Vector3(1, 2, 3);
    component.setLinearVelocity(velocity);
    
    expect(component.getLinearVelocity()).toEqual(velocity);
    expect(mockImpostor.setLinearVelocity).toHaveBeenCalledWith(velocity);
  });
  
  test('should set and get angular velocity', () => {
    const component = new PhysicsComponent();
    component.init(entity);
    
    const velocity = new BABYLON.Vector3(1, 2, 3);
    component.setAngularVelocity(velocity);
    
    expect(component.getAngularVelocity()).toEqual(velocity);
    expect(mockImpostor.setAngularVelocity).toHaveBeenCalledWith(velocity);
  });
  
  test('should apply impulse force', () => {
    const component = new PhysicsComponent();
    component.init(entity);
    
    const force = new BABYLON.Vector3(10, 0, 0);
    component.applyImpulse(force);
    
    expect(mockImpostor.applyImpulse).toHaveBeenCalledWith(force, new BABYLON.Vector3(0, 0, 0));
  });
  
  test('should apply impulse force at a specific point', () => {
    const component = new PhysicsComponent();
    component.init(entity);
    
    const force = new BABYLON.Vector3(10, 0, 0);
    const point = new BABYLON.Vector3(1, 1, 1);
    component.applyImpulse(force, point);
    
    expect(mockImpostor.applyImpulse).toHaveBeenCalledWith(force, point);
  });
  
  test('should apply continuous force', () => {
    const component = new PhysicsComponent();
    component.init(entity);
    
    const force = new BABYLON.Vector3(10, 0, 0);
    component.applyForce(force);
    
    expect(mockImpostor.applyForce).toHaveBeenCalledWith(force, new BABYLON.Vector3(0, 0, 0));
  });
  
  test('should apply torque impulse', () => {
    const component = new PhysicsComponent();
    component.init(entity);
    
    const torque = new BABYLON.Vector3(0, 1, 0);
    component.applyTorqueImpulse(torque);
    
    expect(mockImpostor.applyImpulse).toHaveBeenCalled();
  });
  
  test('should set and get gravity enabled', () => {
    const component = new PhysicsComponent();
    component.init(entity);
    
    component.setGravityEnabled(false);
    
    expect(component.isGravityEnabled()).toBe(false);
    expect(mockPhysicsBody.setGravity).toHaveBeenCalled();
  });
  
  test('should set and get trigger state', () => {
    const component = new PhysicsComponent();
    component.init(entity);
    
    component.setTrigger(true);
    
    expect(component.isTrigger()).toBe(true);
    expect(mockPhysicsBody.setCollisionFlags).toHaveBeenCalled();
  });
  
  test('should lock motion axes', () => {
    const component = new PhysicsComponent();
    component.init(entity);
    
    // Mock linear velocity
    mockImpostor.getLinearVelocity.mockReturnValue(new BABYLON.Vector3(1, 2, 3));
    
    // Lock X and Y axes
    component.lockMotion(true, true, false);
    
    // Update component to apply constraints
    component.update(0.016);
    
    // Velocity should have been modified and applied with X and Y set to 0
    expect(mockImpostor.setLinearVelocity).toHaveBeenCalledWith(expect.objectContaining({
      x: 0,
      y: 0,
      z: 3
    }));
  });
  
  test('should lock rotation axes', () => {
    const component = new PhysicsComponent();
    component.init(entity);
    
    // Mock angular velocity
    mockImpostor.getAngularVelocity.mockReturnValue(new BABYLON.Vector3(1, 2, 3));
    
    // Lock Y and Z axes
    component.lockRotation(false, true, true);
    
    // Update component to apply constraints
    component.update(0.016);
    
    // Angular velocity should have been modified and applied with Y and Z set to 0
    expect(mockImpostor.setAngularVelocity).toHaveBeenCalledWith(expect.objectContaining({
      x: 1,
      y: 0,
      z: 0
    }));
  });
  
  test('should register collision callback', () => {
    const component = new PhysicsComponent();
    component.init(entity);
    
    const callback = jest.fn();
    component.onCollide(callback);
    
    expect(mockImpostor.registerOnPhysicsCollide).toHaveBeenCalledWith(null, callback);
  });
  
  test('should sync to transform', () => {
    const component = new PhysicsComponent();
    component.init(entity);
    
    // Set up transform spy
    const setPositionSpy = jest.spyOn(transformComponent, 'setPosition');
    const setRotationSpy = jest.spyOn(transformComponent, 'setRotation');
    
    // Create position and rotation for the mesh object instead of directly on the impostor
    mockMesh.position = new BABYLON.Vector3(5, 6, 7);
    mockMesh.rotationQuaternion = new BABYLON.Quaternion(0.1, 0.2, 0.3, 0.4);
    
    // Mock the toEulerAngles method to return expected values
    mockMesh.rotationQuaternion.toEulerAngles = jest.fn().mockReturnValue(new BABYLON.Vector3(0.1, 0.2, 0.3));
    
    // Sync from physics to transform
    component.syncToTransform();
    
    // Verify transform was updated with position
    expect(setPositionSpy).toHaveBeenCalledWith(5, 6, 7);
    // Verify rotation was set (with Euler angles, not quaternion)
    expect(setRotationSpy).toHaveBeenCalledWith(0.1, 0.2, 0.3);
  });
  
  test('should sync physics from transform', () => {
    const component = new PhysicsComponent();
    component.init(entity);
    
    // Sync from transform to physics
    component.syncTransform();
    
    // Verify mesh object was updated with transform's values
    expect(mockMesh.position).toEqual(new BABYLON.Vector3(1, 2, 3));
    expect(mockMesh.rotationQuaternion).not.toBeUndefined();
  });
  
  test('should auto-sync transform during update', () => {
    const component = new PhysicsComponent({ autoSyncTransform: true });
    component.init(entity);
    
    // Spy on syncToTransform
    const syncSpy = jest.spyOn(component, 'syncToTransform');
    
    // Update the component
    component.update(0.016);
    
    // Verify sync was called
    expect(syncSpy).toHaveBeenCalled();
  });
  
  test('should not sync transform when disabled', () => {
    const component = new PhysicsComponent();
    component.init(entity);
    
    // Spy on syncToTransform
    const syncSpy = jest.spyOn(component, 'syncToTransform');
    
    // Disable the component
    component.setEnabled(false);
    
    // Update the component
    component.update(0.016);
    
    // Verify sync was not called
    expect(syncSpy).not.toHaveBeenCalled();
  });
  
  test('should clean up resources on dispose', () => {
    const component = new PhysicsComponent();
    component.init(entity);
    
    component.dispose();
    
    // Verify impostor was disposed
    expect(mockImpostor.dispose).toHaveBeenCalled();
    
    // Verify the component no longer has a reference to the impostor
    expect(component.getImpostor()).toBeNull();
  });
});

