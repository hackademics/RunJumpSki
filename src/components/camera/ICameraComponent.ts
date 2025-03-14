/**
 * ICameraComponent.ts
 * Interface for camera components
 */

import { Vector3 } from '../../types/common/Vector3';
import { IComponent } from '../../entities/IEntity';

/**
 * Camera component interface
 */
export interface ICameraComponent extends IComponent {
    /**
     * Update camera
     * @param deltaTime Time since last update in seconds
     */
    update(deltaTime: number): void;

    /**
     * Set camera offset from entity position
     * @param offset Offset vector
     */
    setOffset(offset: Vector3): void;

    /**
     * Get camera offset
     * @returns Camera offset vector
     */
    getOffset(): Vector3;

    /**
     * Set field of view
     * @param fov Field of view in radians
     */
    setFov(fov: number): void;

    /**
     * Get field of view
     * @returns Field of view in radians
     */
    getFov(): number;

    /**
     * Apply camera shake effect
     * @param intensity Shake intensity
     * @param duration Shake duration in seconds
     */
    shake(intensity: number, duration: number): void;

    /**
     * Enable or disable dynamic FOV based on speed
     * @param enabled Whether dynamic FOV is enabled
     */
    setDynamicFov(enabled: boolean): void;

    /**
     * Set camera pitch (vertical rotation)
     * @param pitch Pitch angle in radians
     */
    setPitch(pitch: number): void;

    /**
     * Get camera pitch
     * @returns Pitch angle in radians
     */
    getPitch(): number;

    /**
     * Set camera sensitivity
     * @param sensitivity Camera sensitivity multiplier
     */
    setSensitivity(sensitivity: number): void;

    /**
     * Get camera sensitivity
     * @returns Camera sensitivity multiplier
     */
    getSensitivity(): number;
} 