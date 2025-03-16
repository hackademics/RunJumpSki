import { Vector3 } from '../../types/common/Vector3';
import { IComponent } from '../../core/base/IComponent';
import { ComponentOptions } from '../../types/core/ComponentTypes';

/**
 * Transform component options
 */
export interface TransformComponentOptions {
    /**
     * Initial position
     */
    position?: Vector3;
    
    /**
     * Initial rotation (in radians)
     */
    rotation?: Vector3;
    
    /**
     * Initial scale
     */
    scale?: Vector3;
}

/**
 * Transform component interface
 */
export interface ITransformComponent extends IComponent {
    /**
     * Get the current position
     */
    getPosition(): Vector3;
    
    /**
     * Set the position
     */
    setPosition(position: Vector3): void;
    
    /**
     * Get the current rotation
     */
    getRotation(): Vector3;
    
    /**
     * Set the rotation
     */
    setRotation(rotation: Vector3): void;
    
    /**
     * Get the current scale
     */
    getScale(): Vector3;
    
    /**
     * Set the scale
     */
    setScale(scale: Vector3): void;
    
    /**
     * Get the forward direction vector
     */
    getForward(): Vector3;
    
    /**
     * Get the right direction vector
     */
    getRight(): Vector3;
    
    /**
     * Get the up direction vector
     */
    getUp(): Vector3;
}
