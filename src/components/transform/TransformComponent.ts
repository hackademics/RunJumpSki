import { Component } from '../Component';
import { Vector3, createVector3 } from '../../types/common/Vector3';
import { ITransformComponent, TransformComponentOptions } from './ITransformComponent';

/**
 * Default transform options
 */
const DEFAULT_TRANSFORM_OPTIONS: TransformComponentOptions = {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 }
};

/**
 * Transform component implementation
 */
export class TransformComponent extends Component implements ITransformComponent {
    public readonly type: string = 'transform';
    
    private position: Vector3;
    private rotation: Vector3;
    private scale: Vector3;
    
    /**
     * Create a new transform component
     */
    constructor(options: TransformComponentOptions = {}) {
        super({ type: 'transform' });
        
        // Apply defaults
        const config = { ...DEFAULT_TRANSFORM_OPTIONS, ...options };
        
        this.position = { ...config.position! };
        this.rotation = { ...config.rotation! };
        this.scale = { ...config.scale! };
    }
    
    /**
     * Update the component
     */
    public update(_deltaTime: number): void {
        // Transform doesn't need updating
    }
    
    /**
     * Get the current position
     */
    public getPosition(): Vector3 {
        return { ...this.position };
    }
    
    /**
     * Set the position
     */
    public setPosition(position: Vector3): void {
        this.position = { ...position };
    }
    
    /**
     * Get the current rotation
     */
    public getRotation(): Vector3 {
        return { ...this.rotation };
    }
    
    /**
     * Set the rotation
     */
    public setRotation(rotation: Vector3): void {
        this.rotation = { ...rotation };
    }
    
    /**
     * Get the current scale
     */
    public getScale(): Vector3 {
        return { ...this.scale };
    }
    
    /**
     * Set the scale
     */
    public setScale(scale: Vector3): void {
        this.scale = { ...scale };
    }
    
    /**
     * Get the forward direction vector
     */
    public getForward(): Vector3 {
        // Simple implementation - doesn't account for x and z rotation
        const angle = this.rotation.y;
        return createVector3(
            Math.sin(angle),
            0,
            Math.cos(angle)
        );
    }
    
    /**
     * Get the right direction vector
     */
    public getRight(): Vector3 {
        // Simple implementation - doesn't account for x and z rotation
        const angle = this.rotation.y;
        return createVector3(
            Math.sin(angle + Math.PI / 2),
            0,
            Math.cos(angle + Math.PI / 2)
        );
    }
    
    /**
     * Get the up direction vector
     */
    public getUp(): Vector3 {
        // Simple implementation - always returns world up
        return createVector3(0, 1, 0);
    }
}
