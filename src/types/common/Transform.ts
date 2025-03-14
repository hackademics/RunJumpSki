/**
 * Transform.ts
 * Represents position, rotation, and scale of an entity
 * 
 * TODO: Consider implementing quaternion-based rotation to avoid gimbal lock
 * in future iterations of the engine.
 */

import { Vector3 } from './Vector3';
import { MathUtils } from '../../utils/MathUtils';

export class Transform {
    /**
     * Position vector
     */
    public position: Vector3;
    
    /**
     * Rotation vector (in radians)
     */
    public rotation: Vector3;
    
    /**
     * Scale vector
     */
    public scale: Vector3;
    
    /**
     * Cached forward direction vector
     * @private
     */
    private _forward: Vector3;
    
    /**
     * Cached right direction vector
     * @private
     */
    private _right: Vector3;
    
    /**
     * Cached up direction vector
     * @private
     */
    private _up: Vector3;
    
    /**
     * Whether the cached direction vectors need to be updated
     * @private
     */
    private _dirtyCache: boolean;

    /**
     * Create a new Transform
     * @param position Position vector
     * @param rotation Rotation vector (in radians)
     * @param scale Scale vector
     */
    constructor(
        position: Vector3 = new Vector3(0, 0, 0),
        rotation: Vector3 = new Vector3(0, 0, 0),
        scale: Vector3 = new Vector3(1, 1, 1)
    ) {
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
        this._forward = new Vector3(0, 0, 1);
        this._right = new Vector3(1, 0, 0);
        this._up = new Vector3(0, 1, 0);
        this._dirtyCache = true;
    }

    /**
     * Set the rotation directly
     * @param x Pitch (rotation around X axis) in radians
     * @param y Yaw (rotation around Y axis) in radians
     * @param z Roll (rotation around Z axis) in radians
     */
    public setRotation(x: number, y: number, z: number): void {
        this.rotation.set(x, y, z);
        this._dirtyCache = true;
        this.normalizeRotation();
    }

    /**
     * Update the cached direction vectors if needed
     * @private
     */
    private updateDirectionVectors(): void {
        if (!this._dirtyCache) {
            return;
        }
        
        // Calculate forward direction based on Y rotation (yaw) and X rotation (pitch)
        const yaw = this.rotation.y;
        const pitch = this.rotation.x;
        
        this._forward.set(
            Math.sin(yaw) * Math.cos(pitch),
            -Math.sin(pitch),
            Math.cos(yaw) * Math.cos(pitch)
        ).normalizeInPlace();
        
        // Right is perpendicular to forward in the horizontal plane
        // This accounts for yaw (Y rotation)
        this._right.set(
            Math.cos(yaw),
            0,
            -Math.sin(yaw)
        ).normalizeInPlace();
        
        // Up is the cross product of forward and right
        // Create a temporary vector for the cross product
        const tempCross = this._right.cross(this._forward.scale(-1)).normalize();
        this._up.set(tempCross.x, tempCross.y, tempCross.z);
        
        this._dirtyCache = false;
    }

    /**
     * Get the forward direction vector based on rotation
     */
    public getForwardVector(): Vector3 {
        this.updateDirectionVectors();
        return this._forward.clone();
    }

    /**
     * Get the right direction vector based on rotation
     */
    public getRightVector(): Vector3 {
        this.updateDirectionVectors();
        return this._right.clone();
    }

    /**
     * Get the up direction vector based on rotation
     */
    public getUpVector(): Vector3 {
        this.updateDirectionVectors();
        return this._up.clone();
    }

    /**
     * Move in the specified direction by the specified distance
     * @param direction Direction to move in
     * @param distance Distance to move
     */
    public move(direction: Vector3, distance: number): void {
        const movement = direction.normalize().scale(distance);
        this.position.addInPlace(movement);
    }

    /**
     * Move forward by the specified distance
     * @param distance Distance to move
     */
    public moveForward(distance: number): void {
        const movement = this._forward.clone().scaleInPlace(distance);
        this.position.addInPlace(movement);
    }

    /**
     * Move right by the specified distance
     * @param distance Distance to move
     */
    public moveRight(distance: number): void {
        const movement = this._right.clone().scaleInPlace(distance);
        this.position.addInPlace(movement);
    }

    /**
     * Move up by the specified distance
     * @param distance Distance to move
     */
    public moveUp(distance: number): void {
        const movement = new Vector3(0, distance, 0);
        this.position.addInPlace(movement);
    }

    /**
     * Rotate around the specified axis by the specified angle
     * @param axis Axis to rotate around
     * @param angle Angle to rotate by in radians
     */
    public rotate(axis: Vector3, angle: number): void {
        // Handle special cases for common axes
        if (axis.equals(Vector3.up())) {
            // Rotate around Y axis (yaw)
            this.rotation.y += angle;
        } else if (axis.equals(Vector3.right())) {
            // Rotate around X axis (pitch)
            this.rotation.x += angle;
        } else if (axis.equals(Vector3.forward())) {
            // Rotate around Z axis (roll)
            this.rotation.z += angle;
        } else {
            // General case - use quaternion
            // ... existing code ...
        }
        
        // Update direction vectors
        this.updateDirectionVectors();
    }
    
    /**
     * Normalize rotation angles to stay within proper ranges
     * This helps prevent issues with very large rotation values
     */
    private normalizeRotation(): void {
        const TWO_PI = Math.PI * 2;
        
        // Keep angles in the range [0, 2π)
        this.rotation.x = ((this.rotation.x % TWO_PI) + TWO_PI) % TWO_PI;
        this.rotation.y = ((this.rotation.y % TWO_PI) + TWO_PI) % TWO_PI;
        this.rotation.z = ((this.rotation.z % TWO_PI) + TWO_PI) % TWO_PI;
    }

    /**
     * Look at the specified target
     * @param target Target to look at
     */
    public lookAt(target: Vector3): void {
        // Calculate direction to target
        const direction = target.subtract(this.position).normalize();
        
        // Calculate rotation from direction
        // Assuming Y-up coordinate system
        
        // Calculate yaw (rotation around Y axis)
        this.rotation.y = Math.atan2(direction.x, direction.z);
        
        // Calculate pitch (rotation around X axis)
        const horizontalDistance = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
        this.rotation.x = -Math.atan2(direction.y, horizontalDistance);
        
        // Update direction vectors
        this.updateDirectionVectors();
    }

    /**
     * Clone this transform
     */
    public clone(): Transform {
        return new Transform(
            this.position.clone(),
            this.rotation.clone(),
            this.scale.clone()
        );
    }

    /**
     * Copy values from another transform
     * @param other Transform to copy from
     */
    public copyFrom(other: Transform): Transform {
        this.position.copyFrom(other.position);
        this.rotation.copyFrom(other.rotation);
        this.scale.copyFrom(other.scale);
        this._dirtyCache = true;
        return this;
    }

    /**
     * Convert to string representation
     */
    public toString(): string {
        return `Transform(pos=${this.position}, rot=${this.rotation}, scale=${this.scale})`;
    }
}
