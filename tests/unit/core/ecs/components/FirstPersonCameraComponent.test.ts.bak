/**
 * @file tests/unit/core/ecs/components/FirstPersonCameraComponent.test.ts
 * @description Unit tests for FirstPersonCameraComponent
 */

import * as BABYLON from 'babylonjs';
import { FirstPersonCameraComponent } from '../../../../../src/core/ecs/components/FirstPersonCameraComponent';
import { IFirstPersonCameraComponent } from '../../../../../src/core/ecs/components/IFirstPersonCameraComponent';
import { TransformComponent } from '../../../../../src/core/ecs/components/TransformComponent';
import { Entity } from '../../../../../src/core/ecs/Entity';
import { IEntity } from '../../../../../src/core/ecs/IEntity';

// Mock BabylonJS objects
jest.mock('babylonjs');

describe('FirstPersonCameraComponent', () => {
    let component: FirstPersonCameraComponent;
    let entity: IEntity;
    let mockScene: BABYLON.Scene;
    let mockCamera: BABYLON.UniversalCamera;
    let mockCanvas: HTMLCanvasElement;
    let mockEngine: BABYLON.Engine;

    beforeEach(() => {
        // Set up mocks
        mockCanvas = document.createElement('canvas');
        mockEngine = new BABYLON.Engine(mockCanvas);
        mockScene = new BABYLON.Scene(mockEngine);
        mockCamera = new BABYLON.UniversalCamera('test-camera', new BABYLON.Vector3(0, 0, 0), mockScene);
        
        // Mock engine methods
        mockScene.getEngine = jest.fn().mockReturnValue(mockEngine);
        mockEngine.getRenderingCanvas = jest.fn().mockReturnValue(mockCanvas);
        
        // Set up entity and component
        entity = new Entity('test-entity');
        component = new FirstPersonCameraComponent({
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
        expect(component.type).toBe('firstPersonCamera');
    });

    test('should initialize properly', () => {
        const initSpy = jest.spyOn(component, 'init');
        component.init(entity);
        expect(initSpy).toHaveBeenCalledWith(entity);
    });
    
    test('should get and set movement speed', () => {
        // Test default value
        expect(component.getMovementSpeed()).toBeGreaterThan(0);
        
        // Test setting a new value
        component.setMovementSpeed(10);
        expect(component.getMovementSpeed()).toBe(10);
        
        // Should update camera speed
        expect(mockCamera.speed).toBe(10);
    });
    
    test('should get and set rotation speed', () => {
        // Test default value
        expect(component.getRotationSpeed()).toBeGreaterThan(0);
        
        // Test setting a new value
        component.setRotationSpeed(0.01);
        expect(component.getRotationSpeed()).toBe(0.01);
        
        // Should update camera angular sensitivity
        expect(mockCamera.angularSensibility).toBe(1 / 0.01);
    });
    
    test('should get and set inertia', () => {
        // Test default value
        expect(component.getInertia()).toBeGreaterThanOrEqual(0);
        expect(component.getInertia()).toBeLessThanOrEqual(1);
        
        // Test setting a new value
        component.setInertia(0.5);
        expect(component.getInertia()).toBe(0.5);
        
        // Should update camera inertia
        expect(mockCamera.inertia).toBe(0.5);
        
        // Should clamp values to 0-1 range
        component.setInertia(2);
        expect(component.getInertia()).toBe(1);
        
        component.setInertia(-1);
        expect(component.getInertia()).toBe(0);
    });
    
    test('should get and set angle limits', () => {
        // Get default limits
        const limits = component.getAngleLimits();
        expect(limits.min).toBeLessThan(0);  // Min should be negative (looking up)
        expect(limits.max).toBeGreaterThan(0); // Max should be positive (looking down)
        
        // Set new limits
        component.setAngleLimits(-0.5, 0.5);
        const newLimits = component.getAngleLimits();
        expect(newLimits.min).toBe(-0.5);
        expect(newLimits.max).toBe(0.5);
        
        // Check camera props are set properly
        expect((mockCamera as any).lowerBetaLimit).toBe(-0.5);
        expect((mockCamera as any).upperBetaLimit).toBe(0.5);
    });
    
    test('should get and set position offset', () => {
        // Default position offset should be above ground
        const defaultOffset = component.getPositionOffset();
        expect(defaultOffset.y).toBeGreaterThan(0);
        
        // Set a new offset
        const newOffset = new BABYLON.Vector3(0, 2, -1);
        component.setPositionOffset(newOffset);
        
        // Get should return a clone, not the same object
        const retrievedOffset = component.getPositionOffset();
        expect(retrievedOffset).not.toBe(newOffset);
        expect(retrievedOffset.equals(newOffset)).toBeTruthy();
    });
    
    test('should enable and disable controls', () => {
        // Should be enabled by default
        expect(component.isControlsEnabled()).toBeTruthy();
        
        // Spy on attachControl and detachControl
        const attachSpy = jest.spyOn(component, 'attachControl');
        const detachSpy = jest.spyOn(component, 'detachControl');
        
        // Disable controls
        component.enableControls(false);
        expect(component.isControlsEnabled()).toBeFalsy();
        expect(detachSpy).toHaveBeenCalled();
        
        // Enable controls
        component.enableControls(true);
        expect(component.isControlsEnabled()).toBeTruthy();
        expect(attachSpy).toHaveBeenCalled();
    });
    
    test('should update camera position with offset', () => {
        const transform = new TransformComponent({
            position: new BABYLON.Vector3(10, 0, 10)
        });
        
        // Set an offset and link to transform
        component.setPositionOffset(new BABYLON.Vector3(0, 2, 0));
        component.setTargetTransform(transform);
        
        // Update should apply position with offset
        component.update(0.016);
        
        // Position should be transform position + offset
        expect(mockCamera.position.x).toBe(10);
        expect(mockCamera.position.y).toBe(2);
        expect(mockCamera.position.z).toBe(10);
        
        transform.dispose();
    });
    
    test('should update camera rotation from target transform', () => {
        const transform = new TransformComponent({
            position: new BABYLON.Vector3(0, 0, 0),
            rotation: new BABYLON.Vector3(0, Math.PI / 2, 0) // 90 degrees Y rotation
        });
        
        component.setTargetTransform(transform);
        component.update(0.016);
        
        // Camera Y rotation should match transform's Y rotation
        expect((mockCamera as any).rotation.y).toBe(Math.PI / 2);
        
        transform.dispose();
    });
});

