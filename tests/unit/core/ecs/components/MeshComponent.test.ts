/**
 * @file tests/unit/core/ecs/components/MeshComponent.test.ts
 * @description Unit tests for MeshComponent
 */

import * as BABYLON from 'babylonjs';
import { MeshComponent } from '../../../../../src/core/ecs/components/MeshComponent';
import { Entity } from '../../../../../src/core/ecs/Entity';
import { TransformComponent } from '../../../../../src/core/ecs/components/TransformComponent';

// Mock Babylon.js
jest.mock('babylonjs');

describe('MeshComponent', () => {
  // Mock objects
  let mockMesh: jest.Mocked<BABYLON.AbstractMesh>;
  let mockMaterial: jest.Mocked<BABYLON.Material>;
  let mockStandardMaterial: jest.Mocked<BABYLON.StandardMaterial>;
  let mockPBRMaterial: jest.Mocked<BABYLON.PBRMaterial>;
  let mockScene: jest.Mocked<BABYLON.Scene>;
  let entity: Entity;
  let transformComponent: TransformComponent;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock mesh
    mockMesh = {
      name: 'mock-mesh',
      material: null,
      isVisible: true,
      visibility: 1,
      isPickable: true,
      receiveShadows: false,
      checkCollisions: false,
      layerMask: 0x0FFFFFFF,
      getChildren: jest.fn().mockReturnValue([]),
      isReady: jest.fn().mockReturnValue(true)
    } as unknown as jest.Mocked<BABYLON.AbstractMesh>;
    
    // Create mock materials
    mockMaterial = {
      name: 'mock-material'
    } as unknown as jest.Mocked<BABYLON.Material>;
    
    mockStandardMaterial = {
      name: 'mock-standard-material',
      diffuseColor: null,
      specularColor: null,
      emissiveColor: null,
      ambientColor: null,
      diffuseTexture: null
    } as unknown as jest.Mocked<BABYLON.StandardMaterial>;
    
    mockPBRMaterial = {
      name: 'mock-pbr-material',
      albedoColor: null,
      metallic: 0,
      roughness: 0
    } as unknown as jest.Mocked<BABYLON.PBRMaterial>;
    
    // Create mock scene
    mockScene = {
      name: 'mock-scene'
    } as unknown as jest.Mocked<BABYLON.Scene>;
    
    // Mock mesh builder methods
    (BABYLON.MeshBuilder.CreateBox as jest.Mock) = jest.fn().mockReturnValue(mockMesh);
    (BABYLON.MeshBuilder.CreateSphere as jest.Mock) = jest.fn().mockReturnValue(mockMesh);
    (BABYLON.MeshBuilder.CreateCylinder as jest.Mock) = jest.fn().mockReturnValue(mockMesh);
    (BABYLON.MeshBuilder.CreatePlane as jest.Mock) = jest.fn().mockReturnValue(mockMesh);
    (BABYLON.MeshBuilder.CreateGround as jest.Mock) = jest.fn().mockReturnValue(mockMesh);
    (BABYLON.MeshBuilder.CreateDisc as jest.Mock) = jest.fn().mockReturnValue(mockMesh);
    (BABYLON.MeshBuilder.CreateTorus as jest.Mock) = jest.fn().mockReturnValue(mockMesh);
    
    // Mock material constructors
    (BABYLON.StandardMaterial as unknown as jest.Mock) = jest.fn().mockImplementation(() => mockStandardMaterial);
    (BABYLON.PBRMaterial as unknown as jest.Mock) = jest.fn().mockImplementation(() => mockPBRMaterial);
    
    // Mock SceneLoader.ImportMesh
    (BABYLON.SceneLoader.ImportMesh as jest.Mock) = jest.fn().mockImplementation((meshNames, path, filename, scene, onSuccess) => {
      if (onSuccess) {
        onSuccess([mockMesh]);
      }
    });
    
    // Create entity with transform component
    entity = new Entity();
    transformComponent = new TransformComponent();
    entity.addComponent(transformComponent);
  });
  
  test('should have type "mesh"', () => {
    const component = new MeshComponent();
    expect(component.type).toBe('mesh');
  });
  
  test('should initialize with default options', () => {
    const component = new MeshComponent();
    
    expect(component.getMesh()).toBeNull();
    expect(component.getMaterial()).toBeNull();
    expect(component.isPickable()).toBe(true);
    expect(component.isCollisionEnabled()).toBe(true);
  });
  
  test('should initialize with custom options', () => {
    const component = new MeshComponent({
      mesh: mockMesh,
      material: mockMaterial,
      isPickable: false,
      collisionEnabled: false
    });
    
    expect(component.getMesh()).toBe(mockMesh);
    expect(component.getMaterial()).toBe(mockMaterial);
    expect(component.isPickable()).toBe(false);
    expect(component.isCollisionEnabled()).toBe(false);
  });
  
  test('should properly initialize with entity', () => {
    const component = new MeshComponent();
    const initSpy = jest.spyOn(component, 'init');
    
    component.initialize(entity);
    
    expect(initSpy).toHaveBeenCalledWith(entity);
  });
  
  test('should set and get mesh', () => {
    const component = new MeshComponent();
    
    component.setMesh(mockMesh);
    
    expect(component.getMesh()).toBe(mockMesh);
    expect(component.getSceneNode()).toBe(mockMesh); // Scene node should also be updated
  });
  
  test('should set and get material', () => {
    const component = new MeshComponent({ mesh: mockMesh });
    
    component.setMaterial(mockMaterial);
    
    expect(component.getMaterial()).toBe(mockMaterial);
    expect(mockMesh.material).toBe(mockMaterial); // Should apply material to mesh
  });
  
  test('should create box mesh', () => {
    const component = new MeshComponent();
    const mesh = component.createMesh('test-box', mockScene, 'box', { width: 2 });
    
    expect(BABYLON.MeshBuilder.CreateBox).toHaveBeenCalledWith('test-box', { width: 2 }, mockScene);
    expect(component.getMesh()).toBe(mockMesh);
    expect(mesh).toBe(mockMesh);
  });
  
  test('should create sphere mesh', () => {
    const component = new MeshComponent();
    component.createMesh('test-sphere', mockScene, 'sphere', { diameter: 2 });
    
    expect(BABYLON.MeshBuilder.CreateSphere).toHaveBeenCalledWith('test-sphere', { diameter: 2 }, mockScene);
    expect(component.getMesh()).toBe(mockMesh);
  });
  
  test('should create cylinder mesh', () => {
    const component = new MeshComponent();
    component.createMesh('test-cylinder', mockScene, 'cylinder', { height: 3 });
    
    expect(BABYLON.MeshBuilder.CreateCylinder).toHaveBeenCalledWith('test-cylinder', { height: 3 }, mockScene);
    expect(component.getMesh()).toBe(mockMesh);
  });
  
  test('should create plane mesh', () => {
    const component = new MeshComponent();
    component.createMesh('test-plane', mockScene, 'plane', { width: 5, height: 5 });
    
    expect(BABYLON.MeshBuilder.CreatePlane).toHaveBeenCalledWith('test-plane', { width: 5, height: 5 }, mockScene);
    expect(component.getMesh()).toBe(mockMesh);
  });
  
  test('should create ground mesh', () => {
    const component = new MeshComponent();
    component.createMesh('test-ground', mockScene, 'ground', { width: 10, height: 10 });
    
    expect(BABYLON.MeshBuilder.CreateGround).toHaveBeenCalledWith('test-ground', { width: 10, height: 10 }, mockScene);
    expect(component.getMesh()).toBe(mockMesh);
  });
  
  test('should create disk mesh', () => {
    const component = new MeshComponent();
    component.createMesh('test-disk', mockScene, 'disk', { radius: 2 });
    
    expect(BABYLON.MeshBuilder.CreateDisc).toHaveBeenCalledWith('test-disk', { radius: 2 }, mockScene);
    expect(component.getMesh()).toBe(mockMesh);
  });
  
  test('should create torus mesh', () => {
    const component = new MeshComponent();
    component.createMesh('test-torus', mockScene, 'torus', { diameter: 2, thickness: 0.5 });
    
    expect(BABYLON.MeshBuilder.CreateTorus).toHaveBeenCalledWith('test-torus', { diameter: 2, thickness: 0.5 }, mockScene);
    expect(component.getMesh()).toBe(mockMesh);
  });
  
  test('should default to box mesh for unknown mesh type', () => {
    const component = new MeshComponent();
    component.createMesh('test-unknown', mockScene, 'unknown', { width: 2 });
    
    expect(BABYLON.MeshBuilder.CreateBox).toHaveBeenCalledWith('test-unknown', { width: 2 }, mockScene);
    expect(component.getMesh()).toBe(mockMesh);
  });
  
  test('should load mesh from file', () => {
    const component = new MeshComponent();
    const onSuccessSpy = jest.fn();
    const onErrorSpy = jest.fn();
    
    component.loadMesh('test-loaded', mockScene, 'models/test.glb', onSuccessSpy, onErrorSpy);
    
    expect(BABYLON.SceneLoader.ImportMesh).toHaveBeenCalled();
    expect(component.getMesh()).toBe(mockMesh);
    expect(mockMesh.name).toBe('test-loaded'); // Should rename mesh
    expect(onSuccessSpy).toHaveBeenCalledWith(mockMesh);
    expect(onErrorSpy).not.toHaveBeenCalled();
  });
  
  test('should create standard material', () => {
    const component = new MeshComponent({ mesh: mockMesh });
    const options = {
      diffuseColor: new BABYLON.Color3(1, 0, 0),
      specularColor: new BABYLON.Color3(1, 1, 1)
    };
    
    const material = component.createMaterial('test-material', mockScene, 'standard', options);
    
    expect(BABYLON.StandardMaterial).toHaveBeenCalledWith('test-material', mockScene);
    expect(component.getMaterial()).toBe(mockStandardMaterial);
    expect(mockMesh.material).toBe(mockStandardMaterial);
    expect(material).toBe(mockStandardMaterial);
  });
  
  test('should create PBR material', () => {
    const component = new MeshComponent({ mesh: mockMesh });
    const options = {
      albedoColor: new BABYLON.Color3(1, 0, 0),
      metallic: 0.8,
      roughness: 0.2
    };
    
    component.createMaterial('test-material', mockScene, 'pbr', options);
    
    expect(BABYLON.PBRMaterial).toHaveBeenCalledWith('test-material', mockScene);
    expect(component.getMaterial()).toBe(mockPBRMaterial);
    expect(mockMesh.material).toBe(mockPBRMaterial);
  });
  
  test('should default to standard material for unknown material type', () => {
    const component = new MeshComponent({ mesh: mockMesh });
    
    component.createMaterial('test-material', mockScene, 'unknown');
    
    expect(BABYLON.StandardMaterial).toHaveBeenCalledWith('test-material', mockScene);
    expect(component.getMaterial()).toBe(mockStandardMaterial);
  });
  
  test('should check if mesh is ready', () => {
    const component = new MeshComponent({ mesh: mockMesh });
    
    expect(component.isReady()).toBe(true);
    
    // Test with null mesh
    component.setMesh(null);
    expect(component.isReady()).toBe(false);
  });
  
  test('should set and get pickable state', () => {
    const component = new MeshComponent({ mesh: mockMesh });
    
    component.setPickable(false);
    
    expect(component.isPickable()).toBe(false);
    expect(mockMesh.isPickable).toBe(false);
  });
  
  test('should set and get collision enabled state', () => {
    const component = new MeshComponent({ mesh: mockMesh });
    
    component.setCollisionEnabled(true);
    
    expect(component.isCollisionEnabled()).toBe(true);
    expect(mockMesh.checkCollisions).toBe(true);
  });
  
  test('should apply settings to new mesh', () => {
    const component = new MeshComponent({
      material: mockMaterial,
      isPickable: false,
      collisionEnabled: true
    });
    
    // Initially there's no mesh, so settings are just stored
    component.setMesh(mockMesh);
    
    // Verify settings were applied to the new mesh
    expect(mockMesh.material).toBe(mockMaterial);
    expect(mockMesh.isPickable).toBe(false);
    expect(mockMesh.checkCollisions).toBe(true);
  });
  
  test('should not update in disabled state', () => {
    const component = new MeshComponent({ mesh: mockMesh });
    const updateSpy = jest.spyOn(component, 'update');
    const applyTransformSpy = jest.spyOn(component, 'applyTransform');
    
    // Init with entity
    component.initialize(entity);
    
    // Disable component
    component.setEnabled(false);
    
    // Call update
    component.update(0.016);
    
    // Should call update but not apply transform since component is disabled
    expect(updateSpy).toHaveBeenCalledWith(0.016);
    expect(applyTransformSpy).not.toHaveBeenCalled();
  });
  
  test('should clean up resources on dispose', () => {
    const component = new MeshComponent({ mesh: mockMesh, material: mockMaterial });
    
    component.dispose();
    
    // Should clear references
    expect(component.getMesh()).toBeNull();
    expect(component.getMaterial()).toBeNull();
  });
});


