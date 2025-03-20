/**
 * @file tests/unit/core/ecs/components/RenderableComponent.test.ts
 * @description Unit tests for RenderableComponent
 */

import * as BABYLON from 'babylonjs';
import { RenderableComponent } from '../../../../../src/core/ecs/components/RenderableComponent';
import { Entity } from '../../../../../src/core/ecs/Entity';
import { TransformComponent } from '../../../../../src/core/ecs/components/TransformComponent';

// Mock Babylon.js
jest.mock('babylonjs');

describe('RenderableComponent', () => {
  // Mock objects
  let mockTransformNode: jest.Mocked<BABYLON.TransformNode>;
  let mockMesh: jest.Mocked<BABYLON.AbstractMesh>;
  let mockMaterial: jest.Mocked<BABYLON.Material>;
  let entity: Entity;
  let transformComponent: TransformComponent;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock scene node
    mockTransformNode = {
      position: { x: 0, y: 0, z: 0, copyFrom: jest.fn() },
      rotationQuaternion: { clone: jest.fn().mockReturnValue({}) },
      scaling: { x: 1, y: 1, z: 1, copyFrom: jest.fn() },
      getChildren: jest.fn().mockReturnValue([]),
    } as unknown as jest.Mocked<BABYLON.TransformNode>;
    
    // Create mock mesh
    mockMaterial = {} as jest.Mocked<BABYLON.Material>;
    mockMesh = {
      material: mockMaterial,
      isVisible: true,
      visibility: 1,
      receiveShadows: false,
      layerMask: 0x0FFFFFFF,
      getChildren: jest.fn().mockReturnValue([]),
    } as unknown as jest.Mocked<BABYLON.AbstractMesh>;
    
    // Create entity with transform component
    entity = new Entity();
    transformComponent = new TransformComponent();
    entity.addComponent(transformComponent);
    
    // Mock the getWorldMatrix method to return a Matrix
    jest.spyOn(transformComponent, 'getWorldMatrix').mockReturnValue({
      decompose: jest.fn((scaling, rotation, position) => {
        position.x = 1;
        position.y = 2;
        position.z = 3;
        rotation.x = 0;
        rotation.y = 0;
        rotation.z = 0;
        rotation.w = 1;
        scaling.x = 1;
        scaling.y = 1;
        scaling.z = 1;
      })
    } as any);
  });
  
  test('should have type "renderable"', () => {
    const component = new RenderableComponent();
    expect(component.type).toBe('renderable');
  });
  
  test('should initialize with default options', () => {
    const component = new RenderableComponent();
    
    expect(component.isVisible()).toBe(true);
    expect(component.getOpacity()).toBe(1.0);
    expect(component.getCastShadows()).toBe(true);
    expect(component.getReceiveShadows()).toBe(true);
    expect(component.getLayerMask()).toBe(0x0FFFFFFF);
    expect(component.getSceneNode()).toBeNull();
  });
  
  test('should initialize with custom options', () => {
    const component = new RenderableComponent({
      visible: false,
      opacity: 0.5,
      castShadows: false,
      receiveShadows: false,
      layerMask: 0xFF,
      sceneNode: mockTransformNode,
      autoApplyTransform: false
    });
    
    expect(component.isVisible()).toBe(false);
    expect(component.getOpacity()).toBe(0.5);
    expect(component.getCastShadows()).toBe(false);
    expect(component.getReceiveShadows()).toBe(false);
    expect(component.getLayerMask()).toBe(0xFF);
    expect(component.getSceneNode()).toBe(mockTransformNode);
  });
  
  test('should properly initialize with entity', () => {
    const component = new RenderableComponent();
    const initSpy = jest.spyOn(component, 'init');
    
    component.initialize(entity);
    
    expect(initSpy).toHaveBeenCalledWith(entity);
  });
  
  test('should set and get visibility', () => {
    const component = new RenderableComponent({ sceneNode: mockMesh });
    
    component.setVisible(false);
    
    expect(component.isVisible()).toBe(false);
    expect(mockMesh.isVisible).toBe(false);
  });
  
  test('should set visibility recursively', () => {
    // Create a child mesh
    const childMesh = {
      isVisible: true,
      getChildren: jest.fn().mockReturnValue([]),
    } as unknown as jest.Mocked<BABYLON.AbstractMesh>;
    
    // Update mockTransformNode to return the child
    mockTransformNode.getChildren = jest.fn().mockReturnValue([childMesh]);
    
    const component = new RenderableComponent({ sceneNode: mockTransformNode });
    
    component.setVisible(false);
    
    // Verify parent state
    expect(component.isVisible()).toBe(false);
    
    // Verify child state was updated
    expect(childMesh.isVisible).toBe(false);
  });
  
  test('should set and get opacity', () => {
    const component = new RenderableComponent({ sceneNode: mockMesh });
    
    component.setOpacity(0.5);
    
    expect(component.getOpacity()).toBe(0.5);
    expect(mockMesh.visibility).toBe(0.5);
  });
  
  test('should clamp opacity between 0 and 1', () => {
    const component = new RenderableComponent();
    
    component.setOpacity(-0.5);
    expect(component.getOpacity()).toBe(0);
    
    component.setOpacity(1.5);
    expect(component.getOpacity()).toBe(1);
  });
  
  test('should set opacity recursively', () => {
    // Create a child mesh
    const childMesh = {
      visibility: 1.0,
      getChildren: jest.fn().mockReturnValue([]),
    } as unknown as jest.Mocked<BABYLON.AbstractMesh>;
    
    // Update mockTransformNode to return the child
    mockTransformNode.getChildren = jest.fn().mockReturnValue([childMesh]);
    
    const component = new RenderableComponent({ sceneNode: mockTransformNode });
    
    component.setOpacity(0.5);
    
    // Verify opacity was propagated to child
    expect(childMesh.visibility).toBe(0.5);
  });
  
  test('should set and get cast shadows', () => {
    const component = new RenderableComponent({ sceneNode: mockMesh });
    
    component.setCastShadows(true);
    
    expect(component.getCastShadows()).toBe(true);
    expect(mockMesh.receiveShadows).toBe(true); // Note: Implementation maps castShadows to receiveShadows
  });
  
  test('should set and get receive shadows', () => {
    const component = new RenderableComponent({ sceneNode: mockMesh });
    
    component.setReceiveShadows(true);
    
    expect(component.getReceiveShadows()).toBe(true);
    expect(mockMesh.receiveShadows).toBe(true);
  });
  
  test('should set and get layer mask', () => {
    const component = new RenderableComponent({ sceneNode: mockMesh });
    
    component.setLayerMask(0x00FF);
    
    expect(component.getLayerMask()).toBe(0x00FF);
    expect(mockMesh.layerMask).toBe(0x00FF);
  });
  
  test('should set and get scene node', () => {
    const component = new RenderableComponent();
    
    component.setSceneNode(mockMesh);
    
    expect(component.getSceneNode()).toBe(mockMesh);
  });
  
  test('should apply transform from transform component', () => {
    const component = new RenderableComponent({ sceneNode: mockTransformNode });
    
    // Init with entity
    component.initialize(entity);
    
    // Apply transform
    component.applyTransform();
    
    // Verify transform was applied
    expect(mockTransformNode.position.copyFrom).toHaveBeenCalled();
    expect(mockTransformNode.rotationQuaternion?.clone).toHaveBeenCalled();
    expect(mockTransformNode.scaling.copyFrom).toHaveBeenCalled();
    expect(transformComponent.getWorldMatrix).toHaveBeenCalled();
  });
  
  test('should not apply transform when disabled', () => {
    const component = new RenderableComponent({ 
      sceneNode: mockTransformNode,
      autoApplyTransform: true
    });
    
    // Init with entity
    component.initialize(entity);
    
    // Disable component
    component.setEnabled(false);
    
    // Call update
    component.update(0.016);
    
    // Transform should not be applied because component is disabled
    expect(transformComponent.getWorldMatrix).not.toHaveBeenCalled();
  });
  
  test('should apply transform during update when autoApplyTransform is true', () => {
    const component = new RenderableComponent({ 
      sceneNode: mockTransformNode,
      autoApplyTransform: true
    });
    
    // Init with entity
    component.initialize(entity);
    
    // Call update
    component.update(0.016);
    
    // Verify transform was applied
    expect(transformComponent.getWorldMatrix).toHaveBeenCalled();
  });
  
  test('should not apply transform during update when autoApplyTransform is false', () => {
    const component = new RenderableComponent({ 
      sceneNode: mockTransformNode,
      autoApplyTransform: false
    });
    
    // Init with entity
    component.initialize(entity);
    
    // Call update
    component.update(0.016);
    
    // Transform should not be applied
    expect(transformComponent.getWorldMatrix).not.toHaveBeenCalled();
  });
  
  test('should clean up resources on dispose', () => {
    const component = new RenderableComponent({ sceneNode: mockTransformNode });
    
    component.dispose();
    
    // Scene node reference should be cleared
    expect(component.getSceneNode()).toBeNull();
  });
});


