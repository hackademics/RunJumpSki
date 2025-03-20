/**
 * @file tests/unit/core/ecs/components/CameraComponent.test.ts
 * @description Unit tests for CameraComponent
 */

import * as BABYLON from 'babylonjs';
import { CameraComponent } from '../../../../../src/core/ecs/components/CameraComponent';
import { ICameraComponent } from '../../../../../src/core/ecs/components/ICameraComponent';
import { TransformComponent } from '../../../../../src/core/ecs/components/TransformComponent';
import { Entity } from '../../../../../src/core/ecs/Entity';
import { IEntity } from '../../../../../src/core/ecs/IEntity';

// Mock BabylonJS objects
jest.mock('babylonjs');

describe('CameraComponent', () => {
    let component: CameraComponent;
    let entity: IEntity;
    let mockScene: BABYLON.Scene;
    let mockCamera: BABYLON.FreeCamera;
    let mockCanvas: HTMLCanvasElement;
    let mockEngine: BABYLON.Engine;

    beforeEach(() => {
        // Set up mocks
        mockCanvas = document.createElement('canvas');
        mockEngine = new BABYLON.Engine(mockCanvas);
        mockScene = new BABYLON.Scene(mockEngine);
        mockCamera = new BABYLON.FreeCamera('test-camera', new BABYLON.Vector3(0, 0, 0), mockScene);
        
        // Mock engine methods
        mockScene.getEngine = jest.fn().mockReturnValue(mockEngine);
        mockEngine.getRenderingCanvas = jest.fn().mockReturnValue(mockCanvas);
        
        // Set up entity and component
        entity = new Entity('test-entity');
        component = new CameraComponent({
            scene: mockScene,
            camera: mockCamera
        });
    });

    afterEach(() => {
        component.dispose();
        entity.dispose();
        jest.clearAllMocks();
    });

    test('should have correct type', () => {
        expect(component.type).toBe('camera');
    });

    test('should initialize properly', () => {
        // Spy on the component's init method to check if it's called with the entity
        const initSpy = jest.spyOn(component, 'init');
        component.initialize(entity);
        expect(initSpy).toHaveBeenCalledWith(entity);
    });
    
    test('should get and set camera instance', () => {
        const newCamera = new BABYLON.FreeCamera('new-camera', new BABYLON.Vector3(1, 2, 3), mockScene);
        
        // Initial camera should be the one we passed in constructor
        expect(component.getCamera()).toBe(mockCamera);
        
        // Set a new camera
        component.setCamera(newCamera);
        expect(component.getCamera()).toBe(newCamera);
        
        // Old camera should be disposed
        expect(mockCamera.dispose).toHaveBeenCalled();
    });
    
    test('should attach and detach control', () => {
        component.attachControl();
        expect(mockCamera.attachControl).toHaveBeenCalled();
        
        component.detachControl();
        expect(mockCamera.detachControl).toHaveBeenCalled();
    });
    
    test('should set as active camera', () => {
        component.setAsActiveCamera();
        expect(mockScene.activeCamera).toBe(mockCamera);
    });
    
    test('should get and set near/far clip planes', () => {
        component.setNearClip(0.5);
        expect(mockCamera.minZ).toBe(0.5);
        expect(component.getNearClip()).toBe(0.5);
        
        component.setFarClip(1000);
        expect(mockCamera.maxZ).toBe(1000);
        expect(component.getFarClip()).toBe(1000);
    });
    
    test('should get and set target transform', () => {
        const transform = new TransformComponent();
        
        // Initially null
        expect(component.getTargetTransform()).toBeNull();
        
        // Set transform
        component.setTargetTransform(transform);
        expect(component.getTargetTransform()).toBe(transform);
        
        // Clear transform
        component.setTargetTransform(null);
        expect(component.getTargetTransform()).toBeNull();
        
        transform.dispose();
    });
    
    test('should try to get transform component on init', () => {
        const transform = new TransformComponent();
        entity.addComponent(transform);
        
        // No target transform set initially
        expect(component.getTargetTransform()).toBeNull();
        
        // Init should look for transform component
        component.initialize(entity);
        expect(component.getTargetTransform()).toBe(transform);
    });
    
    test('should update camera position based on target transform', () => {
        const transform = new TransformComponent({
            position: new BABYLON.Vector3(10, 20, 30)
        });
        
        component.setTargetTransform(transform);
        component.update(0.016); // Update with 16ms delta time
        
        // Camera position should match transform position
        expect(mockCamera.position.x).toBe(10);
        expect(mockCamera.position.y).toBe(20);
        expect(mockCamera.position.z).toBe(30);
        
        transform.dispose();
    });
    
    test('should not update when disabled', () => {
        const transform = new TransformComponent({
            position: new BABYLON.Vector3(10, 20, 30)
        });
        
        component.setTargetTransform(transform);
        component.setEnabled(false);
        component.update(0.016);
        
        // Camera position should not change
        expect(mockCamera.position.x).toBe(0);
        expect(mockCamera.position.y).toBe(0);
        expect(mockCamera.position.z).toBe(0);
        
        transform.dispose();
    });
    
    test('should clean up resources on dispose', () => {
        const transform = new TransformComponent();
        component.setTargetTransform(transform);
        
        component.dispose();
        
        // Camera should be disposed
        expect(mockCamera.dispose).toHaveBeenCalled();
        
        // Target transform should be cleared
        expect(component.getTargetTransform()).toBeNull();
        
        transform.dispose();
    });
});


