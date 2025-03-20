/**
 * @file tests/unit/core/ecs/components/TransformComponent.test.ts
 * @description Unit tests for TransformComponent
 */

import * as BABYLON from 'babylonjs';
import { TransformComponent } from '../../../../../src/core/ecs/components/TransformComponent';
import { ITransformComponent } from '../../../../../src/core/ecs/components/ITransformComponent';
import { Entity } from '../../../../../src/core/ecs/Entity';
import { IEntity } from '../../../../../src/core/ecs/IEntity';

describe('TransformComponent', () => {
    let component: TransformComponent;
    let entity: IEntity;

    beforeEach(() => {
        entity = new Entity('test-entity');
        component = new TransformComponent();
    });

    afterEach(() => {
        component.dispose();
        entity.dispose();
    });

    test('should have correct type', () => {
        expect(component.type).toBe('transform');
    });

    test('should initialize properly', () => {
        component.init(entity);
        expect(component.entity).toBe(entity);
    });

    test('should initialize with default position, rotation, and scale', () => {
        const position = component.getPosition();
        const rotation = component.getRotation();
        const scale = component.getScale();
        
        expect(position.equals(new BABYLON.Vector3(0, 0, 0))).toBe(true);
        expect(rotation.equals(new BABYLON.Vector3(0, 0, 0))).toBe(true);
        expect(scale.equals(new BABYLON.Vector3(1, 1, 1))).toBe(true);
    });
    
    test('should initialize with custom position, rotation, and scale', () => {
        const customPosition = new BABYLON.Vector3(1, 2, 3);
        const customRotation = new BABYLON.Vector3(0.1, 0.2, 0.3);
        const customScale = new BABYLON.Vector3(2, 3, 4);
        
        const customComponent = new TransformComponent({
            position: customPosition,
            rotation: customRotation,
            scale: customScale
        });
        
        expect(customComponent.getPosition().equals(customPosition)).toBe(true);
        expect(customComponent.getRotation().equals(customRotation)).toBe(true);
        expect(customComponent.getScale().equals(customScale)).toBe(true);
        
        customComponent.dispose();
    });
    
    test('should set and get position correctly with Vector3', () => {
        const newPosition = new BABYLON.Vector3(5, 10, 15);
        component.setPosition(newPosition);
        
        const position = component.getPosition();
        expect(position.equals(newPosition)).toBe(true);
        
        // Original Vector3 should not be modified (clone check)
        expect(position).not.toBe(newPosition);
    });
    
    test('should set and get position correctly with coordinates', () => {
        component.setPosition(5, 10, 15);
        
        const position = component.getPosition();
        expect(position.equals(new BABYLON.Vector3(5, 10, 15))).toBe(true);
    });
    
    test('should set and get rotation correctly with Vector3', () => {
        const newRotation = new BABYLON.Vector3(0.5, 1.0, 1.5);
        component.setRotation(newRotation);
        
        const rotation = component.getRotation();
        expect(rotation.equals(newRotation)).toBe(true);
        
        // Original Vector3 should not be modified (clone check)
        expect(rotation).not.toBe(newRotation);
    });
    
    test('should set and get rotation correctly with coordinates', () => {
        component.setRotation(0.5, 1.0, 1.5);
        
        const rotation = component.getRotation();
        expect(rotation.equals(new BABYLON.Vector3(0.5, 1.0, 1.5))).toBe(true);
    });
    
    test('should set and get scale correctly with Vector3', () => {
        const newScale = new BABYLON.Vector3(2, 3, 4);
        component.setScale(newScale);
        
        const scale = component.getScale();
        expect(scale.equals(newScale)).toBe(true);
        
        // Original Vector3 should not be modified (clone check)
        expect(scale).not.toBe(newScale);
    });
    
    test('should set and get scale correctly with coordinates', () => {
        component.setScale(2, 3, 4);
        
        const scale = component.getScale();
        expect(scale.equals(new BABYLON.Vector3(2, 3, 4))).toBe(true);
    });
    
    test('should set uniform scale correctly', () => {
        component.setScale(2);
        
        const scale = component.getScale();
        expect(scale.equals(new BABYLON.Vector3(2, 2, 2))).toBe(true);
    });
    
    test('should translate correctly with Vector3', () => {
        component.setPosition(1, 2, 3);
        component.translate(new BABYLON.Vector3(4, 5, 6));
        
        const position = component.getPosition();
        expect(position.equals(new BABYLON.Vector3(5, 7, 9))).toBe(true);
    });
    
    test('should translate correctly with coordinates', () => {
        component.setPosition(1, 2, 3);
        component.translate(4, 5, 6);
        
        const position = component.getPosition();
        expect(position.equals(new BABYLON.Vector3(5, 7, 9))).toBe(true);
    });
    
    test('should rotate correctly with Vector3', () => {
        component.setRotation(0.1, 0.2, 0.3);
        component.rotate(new BABYLON.Vector3(0.4, 0.5, 0.6));
        
        const rotation = component.getRotation();
        expect(rotation.equals(new BABYLON.Vector3(0.5, 0.7, 0.9))).toBe(true);
    });
    
    test('should rotate correctly with coordinates', () => {
        component.setRotation(0.1, 0.2, 0.3);
        component.rotate(0.4, 0.5, 0.6);
        
        const rotation = component.getRotation();
        expect(rotation.equals(new BABYLON.Vector3(0.5, 0.7, 0.9))).toBe(true);
    });
    
    test('should lookAt target correctly', () => {
        component.setPosition(0, 0, 0);
        component.lookAt(new BABYLON.Vector3(0, 0, 10)); // Looking down the positive Z axis
        
        // Forward should point to z+ (approximately)
        const forward = component.getForward();
        expect(forward.x).toBeCloseTo(0);
        expect(forward.y).toBeCloseTo(0);
        expect(forward.z).toBeCloseTo(1);
    });
    
    test('should calculate local matrix correctly', () => {
        component.setPosition(1, 2, 3);
        
        const localMatrix = component.getLocalMatrix();
        
        // Position should be in the last column of the matrix
        expect(localMatrix.getTranslationToRef(new BABYLON.Vector3()).equals(
            new BABYLON.Vector3(1, 2, 3)
        )).toBe(true);
    });
    
    test('should calculate world matrix correctly', () => {
        const parentComponent = new TransformComponent({
            position: new BABYLON.Vector3(10, 0, 0)
        });
        
        component.setPosition(0, 5, 0);
        component.setParent(parentComponent);
        
        const worldMatrix = component.getWorldMatrix();
        const worldPosition = new BABYLON.Vector3();
        worldMatrix.getTranslationToRef(worldPosition);
        
        // World position should include parent's position
        expect(worldPosition.equals(new BABYLON.Vector3(10, 5, 0))).toBe(true);
        
        parentComponent.dispose();
    });
    
    test('should calculate direction vectors correctly', () => {
        component.setPosition(0, 0, 0);
        component.setRotation(0, 0, 0);
        
        const forward = component.getForward();
        const right = component.getRight();
        const up = component.getUp();
        
        // With default rotation, forward should be z+, right should be x+, up should be y+
        expect(forward.x).toBeCloseTo(0);
        expect(forward.y).toBeCloseTo(0);
        expect(forward.z).toBeCloseTo(1);
        
        expect(right.x).toBeCloseTo(1);
        expect(right.y).toBeCloseTo(0);
        expect(right.z).toBeCloseTo(0);
        
        expect(up.x).toBeCloseTo(0);
        expect(up.y).toBeCloseTo(1);
        expect(up.z).toBeCloseTo(0);
    });
    
    test('should handle parent-child relationships', () => {
        const parentTransform = new TransformComponent({
            position: new BABYLON.Vector3(10, 0, 0)
        });
        
        component.setPosition(0, 5, 0);
        
        // Initially no parent
        expect(component.getParent()).toBeNull();
        
        // Set parent and check
        component.setParent(parentTransform);
        expect(component.getParent()).toBe(parentTransform);
        
        // World position should include parent's translation
        const worldPosition = component.getWorldMatrix().getTranslation();
        expect(worldPosition.equals(new BABYLON.Vector3(10, 5, 0))).toBe(true);
        
        // Clear parent and check
        component.setParent(null);
        expect(component.getParent()).toBeNull();
        
        parentTransform.dispose();
    });
});

