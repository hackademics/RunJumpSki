/**
 * @file src/core/ecs/components/TransformComponent.ts
 * @description Implementation of the TransformComponent that handles entity positioning
 */

import * as BABYLON from 'babylonjs';
import { Component } from '../Component';
import { IEntity } from '../IEntity';
import { ITransformComponent } from './ITransformComponent';

/**
 * Configuration options for TransformComponent
 */
export interface TransformComponentOptions {
    /**
     * Initial position
     */
    position?: BABYLON.Vector3;
    
    /**
     * Initial rotation (in radians)
     */
    rotation?: BABYLON.Vector3;
    
    /**
     * Initial scale
     */
    scale?: BABYLON.Vector3;
    
    /**
     * Parent transform component
     */
    parent?: ITransformComponent;
}

/**
 * Default options for TransformComponent
 */
export const DEFAULT_TRANSFORMCOMPONENT_OPTIONS: TransformComponentOptions = {
    position: new BABYLON.Vector3(0, 0, 0),
    rotation: new BABYLON.Vector3(0, 0, 0),
    scale: new BABYLON.Vector3(1, 1, 1)
};

/**
 * Implementation of Transform component
 * Handles entity positioning, rotation, and scale in 3D space
 */
export class TransformComponent extends Component implements ITransformComponent {
    public readonly type: string = 'transform';
    
    /**
     * Current position
     */
    private position: BABYLON.Vector3;
    
    /**
     * Current rotation (in radians)
     */
    private rotation: BABYLON.Vector3;
    
    /**
     * Current scale
     */
    private scale: BABYLON.Vector3;
    
    /**
     * Parent transform component
     */
    private parent: ITransformComponent | null = null;
    
    /**
     * Local transformation matrix
     */
    private localMatrix: BABYLON.Matrix = BABYLON.Matrix.Identity();
    
    /**
     * World transformation matrix
     */
    private worldMatrix: BABYLON.Matrix = BABYLON.Matrix.Identity();
    
    /**
     * Whether the matrices need recalculation
     */
    private dirty: boolean = true;

    /**
     * Create a new TransformComponent
     */
    constructor(options: Partial<TransformComponentOptions> = {}) {
        super({ type: 'transform' });
        
        // Merge with default options
        const config = { ...DEFAULT_TRANSFORMCOMPONENT_OPTIONS, ...options };
        
        this.position = config.position ? config.position.clone() : new BABYLON.Vector3(0, 0, 0);
        this.rotation = config.rotation ? config.rotation.clone() : new BABYLON.Vector3(0, 0, 0);
        this.scale = config.scale ? config.scale.clone() : new BABYLON.Vector3(1, 1, 1);
        
        if (config.parent) {
            this.parent = config.parent;
        }
        
        this.markDirty();
    }

    /**
     * Initialize the component
     */
    public override initialize(entity: IEntity): void {
        super.initialize(entity);
    }

    /**
     * Update the component
     */
    public override update(deltaTime: number): void {
        if (!this.isEnabled()) return;
        
        if (this.dirty) {
            this.updateMatrices();
        }
    }

    /**
     * Clean up resources
     */
    public override dispose(): void {
        this.parent = null;
        super.dispose();
    }
    
    /**
     * Get the current position
     */
    public getPosition(): BABYLON.Vector3 {
        return this.position.clone();
    }
    
    /**
     * Set the position
     */
    public setPosition(positionOrX: BABYLON.Vector3 | number, y?: number, z?: number): void {
        if (positionOrX instanceof BABYLON.Vector3) {
            this.position.copyFrom(positionOrX);
        } else if (typeof y === 'number' && typeof z === 'number') {
            this.position.set(positionOrX, y, z);
        }
        
        this.markDirty();
    }
    
    /**
     * Get the current rotation
     */
    public getRotation(): BABYLON.Vector3 {
        return this.rotation.clone();
    }
    
    /**
     * Set the rotation
     */
    public setRotation(rotationOrX: BABYLON.Vector3 | number, y?: number, z?: number): void {
        if (rotationOrX instanceof BABYLON.Vector3) {
            this.rotation.copyFrom(rotationOrX);
        } else if (typeof y === 'number' && typeof z === 'number') {
            this.rotation.set(rotationOrX, y, z);
        }
        
        this.markDirty();
    }
    
    /**
     * Get the current scale
     */
    public getScale(): BABYLON.Vector3 {
        return this.scale.clone();
    }
    
    /**
     * Set the scale
     */
    public setScale(scaleOrX: BABYLON.Vector3 | number, y?: number, z?: number): void {
        if (scaleOrX instanceof BABYLON.Vector3) {
            this.scale.copyFrom(scaleOrX);
        } else if (typeof scaleOrX === 'number' && typeof y === 'undefined' && typeof z === 'undefined') {
            // Uniform scale
            this.scale.set(scaleOrX, scaleOrX, scaleOrX);
        } else if (typeof y === 'number' && typeof z === 'number') {
            this.scale.set(scaleOrX as number, y, z);
        }
        
        this.markDirty();
    }
    
    /**
     * Get the local matrix
     */
    public getLocalMatrix(): BABYLON.Matrix {
        if (this.dirty) {
            this.updateMatrices();
        }
        return this.localMatrix.clone();
    }
    
    /**
     * Get the world matrix
     */
    public getWorldMatrix(): BABYLON.Matrix {
        if (this.dirty) {
            this.updateMatrices();
        }
        return this.worldMatrix.clone();
    }
    
    /**
     * Move the entity relative to its current position
     */
    public translate(offsetOrX: BABYLON.Vector3 | number, y?: number, z?: number): void {
        if (offsetOrX instanceof BABYLON.Vector3) {
            this.position.addInPlace(offsetOrX);
        } else if (typeof y === 'number' && typeof z === 'number') {
            this.position.addInPlace(new BABYLON.Vector3(offsetOrX, y, z));
        }
        
        this.markDirty();
    }
    
    /**
     * Rotate the entity relative to its current rotation
     */
    public rotate(rotationOrX: BABYLON.Vector3 | number, y?: number, z?: number): void {
        if (rotationOrX instanceof BABYLON.Vector3) {
            this.rotation.addInPlace(rotationOrX);
        } else if (typeof y === 'number' && typeof z === 'number') {
            this.rotation.addInPlace(new BABYLON.Vector3(rotationOrX, y, z));
        }
        
        this.markDirty();
    }
    
    /**
     * Look at a specific target position
     */
    public lookAt(target: BABYLON.Vector3): void {
        // Calculate direction vector (target - position)
        const direction = target.subtract(this.position);
        
        // Set rotation based on direction vector
        // Y rotation (yaw) based on x and z
        this.rotation.y = Math.atan2(direction.x, direction.z);
        
        // X rotation (pitch) based on y and length of xz
        const xzLength = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
        this.rotation.x = -Math.atan2(direction.y, xzLength);
        
        // Keep z rotation (roll) as is
        
        this.markDirty();
    }
    
    /**
     * Get the forward direction vector
     */
    public getForward(): BABYLON.Vector3 {
        if (this.dirty) {
            this.updateMatrices();
        }
        
        // Forward is negative Z in right-handed coordinate system
        const forward = new BABYLON.Vector3(0, 0, 1);
        return BABYLON.Vector3.TransformNormal(forward, this.getWorldMatrix());
    }
    
    /**
     * Get the right direction vector
     */
    public getRight(): BABYLON.Vector3 {
        if (this.dirty) {
            this.updateMatrices();
        }
        
        const right = new BABYLON.Vector3(1, 0, 0);
        return BABYLON.Vector3.TransformNormal(right, this.getWorldMatrix());
    }
    
    /**
     * Get the up direction vector
     */
    public getUp(): BABYLON.Vector3 {
        if (this.dirty) {
            this.updateMatrices();
        }
        
        const up = new BABYLON.Vector3(0, 1, 0);
        return BABYLON.Vector3.TransformNormal(up, this.getWorldMatrix());
    }
    
    /**
     * Set the parent transform
     */
    public setParent(parent: ITransformComponent | null): void {
        this.parent = parent;
        this.markDirty();
    }
    
    /**
     * Get the parent transform
     */
    public getParent(): ITransformComponent | null {
        return this.parent;
    }
    
    /**
     * Mark matrices as needing recalculation
     */
    private markDirty(): void {
        this.dirty = true;
    }
    
    /**
     * Update transformation matrices
     */
    private updateMatrices(): void {
        // Create rotation quaternion from Euler angles
        const rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
            this.rotation.y,
            this.rotation.x,
            this.rotation.z
        );
        
        // Compose local transformation matrix
        this.localMatrix = BABYLON.Matrix.Compose(
            this.scale,
            rotationQuaternion,
            this.position
        );
        
        // Calculate world matrix based on parent if available
        if (this.parent) {
            const parentWorldMatrix = this.parent.getWorldMatrix();
            this.worldMatrix = this.localMatrix.multiply(parentWorldMatrix);
        } else {
            this.worldMatrix = this.localMatrix.clone();
        }
        
        this.dirty = false;
    }
}




