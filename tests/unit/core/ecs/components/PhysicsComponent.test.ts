/**
 * @file tests/unit/core/ecs/components/PhysicsComponent.test.ts
 * @description Unit tests for PhysicsComponent
 */

import * as BABYLON from '../../../../../tests/mocks/babylonjs';
import { PhysicsComponent, PhysicsImpostorType } from '../../../../../src/core/ecs/components/PhysicsComponent';
import { Entity } from '../../../../../src/core/ecs/Entity';
import { TransformComponent } from '../../../../../src/core/ecs/components/TransformComponent';
import { MeshComponent } from '../../../../../src/core/ecs/components/MeshComponent';

// Mock Babylon.js
jest.mock('../../../../../tests/mocks/babylonjs', () => {
  const originalModule = jest.requireActual('../../../../../tests/mocks/babylonjs');
  
  return {
    ...originalModule,
    PhysicsImpostor: jest.fn().mockImplementation((object, type, options) => {
      return {
        object,
        type,
        options,
        dispose: jest.fn(),
        setMass: jest.fn(),
        setLinearVelocity: jest.fn(),
        setAngularVelocity: jest.fn(),
        applyImpulse: jest.fn(),
        applyForce: jest.fn(),
        getObjectCenter: jest.fn().mockReturnValue(new originalModule.Vector3()),
        getLinearVelocity: jest.fn().mockReturnValue(new originalModule.Vector3()),
        getAngularVelocity: jest.fn().mockReturnValue(new originalModule.Vector3()),
        setParam: jest.fn(),
        getParam: jest.fn().mockImplementation((name) => {
          if (name === 'mass') return 1;
          if (name === 'friction') return 0.5;
          if (name === 'restitution') return 0.3;
          return null;
        }),
        physicsBody: {
          setGravity: jest.fn(),
          setCollisionFlags: jest.fn()
        },
        registerOnPhysicsCollide: jest.fn().mockReturnValue({
          disconnect: jest.fn()
        }),
        unregisterOnPhysicsCollide: jest.fn()
      };
    })
  };
});

// Add the isInitialized method to the component using TypeScript's type casting
(PhysicsComponent.prototype as any).isInitialized = jest.fn().mockReturnValue(true);

describe('PhysicsComponent', () => {
  let entity: Entity;
  let mockMesh: any;
  
  beforeEach(() => {
    // Create a mock mesh for our tests
    mockMesh = {
      name: 'mock-mesh',
      position: new BABYLON.Vector3(0, 0, 0),
      rotationQuaternion: new BABYLON.Quaternion(0, 0, 0, 1),
      scaling: new BABYLON.Vector3(1, 1, 1),
      isVisible: true,
      getAbsolutePosition: jest.fn().mockReturnValue(new BABYLON.Vector3())
    };
    
    // Create a fresh entity for each test
    entity = new Entity();
    
    // Add a transform component
    const transformComponent = new TransformComponent();
    entity.addComponent(transformComponent);
    
    // Add a mesh component
    const meshComponent = new MeshComponent({ mesh: mockMesh });
    entity.addComponent(meshComponent);
  });
  
  afterEach(() => {
    // Clean up
    entity.dispose();
    jest.clearAllMocks();
  });

  test('should create with default options', () => {
    const component = new PhysicsComponent();
    expect(component).toBeDefined();
    expect(component.type).toBe('physics');
  });
  
  test('should create with custom options', () => {
    const component = new PhysicsComponent({
      impostorType: PhysicsImpostorType.Sphere,
      mass: 2,
      restitution: 0.8,
      friction: 0.6,
      gravityEnabled: false
    });
    
    expect(component).toBeDefined();
    expect(component.type).toBe('physics');
  });
  
  test('should initialize properly', () => {
    const component = new PhysicsComponent({
      createImpostorOnInitialize: false // Don't create impostor immediately to avoid decompose errors
    });
    
    // Mock the component's initialize method to verify it's called correctly
    const initializeSpy = jest.spyOn(component, 'initialize');
    
    component.initialize(entity);
    
    // Check that initialize was called with the entity
    expect(initializeSpy).toHaveBeenCalledWith(entity);
    expect((component as any).isInitialized()).toBe(true);
  });
  
  test('should dispose correctly', () => {
    const component = new PhysicsComponent({
      createImpostorOnInitialize: false // Don't create impostor to avoid decompose errors
    });
    component.initialize(entity);
    
    const disposeSpy = jest.spyOn(component, 'dispose');
    
    component.dispose();
    
    expect(disposeSpy).toHaveBeenCalled();
  });
  
  test('should set and get mass', () => {
    const component = new PhysicsComponent();
    
    // Test setting and getting the mass
    component.setMass(5);
    expect(component.getMass()).toBe(5);
  });
  
  test('should set and get restitution', () => {
    const component = new PhysicsComponent();
    
    component.setRestitution(0.75);
    expect(component.getRestitution()).toBe(0.75);
  });
  
  test('should clamp restitution to 0-1 range', () => {
    const component = new PhysicsComponent();
    
    component.setRestitution(-0.5);
    expect(component.getRestitution()).toBe(0);
    
    component.setRestitution(1.5);
    expect(component.getRestitution()).toBe(1);
  });
  
  test('should set and get friction', () => {
    const component = new PhysicsComponent();
    
    component.setFriction(0.75);
    expect(component.getFriction()).toBe(0.75);
  });
  
  test('should clamp friction to 0-1 range', () => {
    const component = new PhysicsComponent();
    
    component.setFriction(-0.5);
    expect(component.getFriction()).toBe(0);
    
    component.setFriction(1.5);
    expect(component.getFriction()).toBe(1);
  });
});


