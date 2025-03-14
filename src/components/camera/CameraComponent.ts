/**
 * CameraComponent.ts
 * Camera component for first-person view
 */

import { Vector3 } from '../../types/common/Vector3';
import { Component } from '../Component';
import { ICameraComponent } from './ICameraComponent';
import { IEntity } from '../../entities/IEntity';
import { ShakeEffect } from './ShakeEffect';
import { Logger } from '../../utils/Logger';
import { MathUtils } from '../../utils/MathUtils';
import { GameConstants } from '../../config/Constants';
import { EventSystem } from '../../core/EventSystem';
import { GameEventType } from '../../types/events/EventTypes';

/**
 * Camera component options
 */
export interface CameraComponentOptions {
    /**
     * Camera offset from entity position
     */
    offset?: Vector3;
    
    /**
     * Field of view in radians
     */
    fov?: number;
    
    /**
     * Whether to use dynamic FOV based on speed
     */
    dynamicFov?: boolean;
    
    /**
     * Camera sensitivity multiplier
     */
    sensitivity?: number;
}

/**
 * Default camera component options
 */
const DEFAULT_OPTIONS: CameraComponentOptions = {
    offset: new Vector3(0, 1.7, 0), // Eye height for average person
    fov: MathUtils.toRadians(GameConstants.DEFAULT_FOV),
    dynamicFov: true,
    sensitivity: GameConstants.DEFAULT_MOUSE_SENSITIVITY
};

/**
 * Camera component for first-person view
 */
export class CameraComponent extends Component implements ICameraComponent {
    private logger: Logger;
    private eventSystem: EventSystem;
    
    // Camera properties
    private offset: Vector3;
    private fov: number;
    private dynamicFov: boolean;
    private sensitivity: number;
    
    // Camera state
    private pitch: number = 0;
    private shakeEffect?: ShakeEffect;
    private currentSpeed: number = 0;
    
    /**
     * Create a new camera component
     * @param options Camera component options
     */
    constructor(options: CameraComponentOptions = {}) {
        super('camera');
        
        this.logger = new Logger('CameraComponent');
        this.eventSystem = EventSystem.getInstance();
        
        // Apply options with defaults
        const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
        this.offset = mergedOptions.offset!.clone();
        this.fov = mergedOptions.fov!;
        this.dynamicFov = mergedOptions.dynamicFov!;
        this.sensitivity = mergedOptions.sensitivity!;
    }
    
    /**
     * Initialize the component
     * @param entity The entity this component belongs to
     */
    public init(entity: IEntity): void {
        super.init(entity);
        
        // Subscribe to events
        this.eventSystem.on(GameEventType.MOVEMENT_LAND, this.handleLanding.bind(this));
        
        this.logger.debug(`Initialized camera component for entity ${entity.id}`);
    }
    
    /**
     * Update the component
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        if (!this.entity) return;
        
        // Update shake effect
        this.updateShake(deltaTime);
        
        // Update dynamic FOV if enabled
        if (this.dynamicFov) {
            this.updateDynamicFov();
        }
    }
    
    /**
     * Dispose of the component
     */
    public dispose(): void {
        super.dispose();
        
        // Unsubscribe from events
        this.eventSystem.off(GameEventType.MOVEMENT_LAND, this.handleLanding.bind(this));
        
        this.logger.debug('Disposed camera component');
    }
    
    /**
     * Set camera offset from entity position
     * @param offset Offset vector
     */
    public setOffset(offset: Vector3): void {
        this.offset = offset.clone();
    }
    
    /**
     * Get camera offset
     * @returns Camera offset vector
     */
    public getOffset(): Vector3 {
        return this.offset.clone();
    }
    
    /**
     * Set field of view
     * @param fov Field of view in radians
     */
    public setFov(fov: number): void {
        this.fov = fov;
    }
    
    /**
     * Get field of view
     * @returns Field of view in radians
     */
    public getFov(): number {
        return this.fov;
    }
    
    /**
     * Apply camera shake effect
     * @param intensity Shake intensity
     * @param duration Shake duration in seconds
     */
    public shake(intensity: number, duration: number): void {
        if (!this.shakeEffect) {
            this.shakeEffect = new ShakeEffect(intensity, duration);
        } else {
            this.shakeEffect.reset(intensity, duration);
        }
    }
    
    /**
     * Enable or disable dynamic FOV based on speed
     * @param enabled Whether dynamic FOV is enabled
     */
    public setDynamicFov(enabled: boolean): void {
        this.dynamicFov = enabled;
    }
    
    /**
     * Set camera pitch (vertical rotation)
     * @param pitch Pitch angle in radians
     */
    public setPitch(pitch: number): void {
        // Clamp pitch to prevent camera flipping
        const maxPitch = MathUtils.toRadians(85); // 85 degrees up/down limit
        this.pitch = MathUtils.clamp(pitch, -maxPitch, maxPitch);
    }
    
    /**
     * Get camera pitch
     * @returns Pitch angle in radians
     */
    public getPitch(): number {
        return this.pitch;
    }
    
    /**
     * Set camera sensitivity
     * @param sensitivity Camera sensitivity multiplier
     */
    public setSensitivity(sensitivity: number): void {
        this.sensitivity = sensitivity;
    }
    
    /**
     * Get camera sensitivity
     * @returns Camera sensitivity multiplier
     */
    public getSensitivity(): number {
        return this.sensitivity;
    }
    
    /**
     * Set current speed for dynamic FOV
     * @param speed Current speed
     */
    public setSpeed(speed: number): void {
        this.currentSpeed = speed;
    }
    
    /**
     * Update camera shake effect
     * @param deltaTime Time since last update in seconds
     */
    private updateShake(deltaTime: number): void {
        if (!this.shakeEffect) return;
        
        // Update shake effect and remove if finished
        const isActive = this.shakeEffect.update(deltaTime);
        if (!isActive) {
            this.shakeEffect = undefined;
        }
    }
    
    /**
     * Gets the current camera shake offset
     * @returns The camera shake offset vector
     */
    public getShakeOffset(): Vector3 {
        if (!this.shakeEffect) return Vector3.zero();
        return this.shakeEffect.getOffset();
    }
    
    /**
     * Update dynamic field of view based on speed
     */
    private updateDynamicFov(): void {
        // Calculate target FOV based on speed
        const baseFov = MathUtils.toRadians(GameConstants.DEFAULT_FOV);
        const maxFovIncrease = MathUtils.toRadians(20); // 20 degrees increase at max speed
        const speedThreshold = 10; // Speed at which FOV starts to increase
        const maxSpeed = 40; // Speed at which FOV reaches maximum
        
        let targetFov = baseFov;
        
        if (this.currentSpeed > speedThreshold) {
            // Calculate FOV increase based on speed
            const speedRatio = Math.min(1, (this.currentSpeed - speedThreshold) / (maxSpeed - speedThreshold));
            targetFov = baseFov + (maxFovIncrease * speedRatio);
        }
        
        // Smoothly interpolate current FOV to target
        this.fov = MathUtils.lerp(this.fov, targetFov, 0.1);
    }
    
    /**
     * Handle landing event
     * @param event Landing event data
     */
    private handleLanding(event: any): void {
        if (!this.entity) return;
        
        // Only apply shake if this is our entity
        if (event.entityId === Number(this.entity.id)) {
            // Apply camera shake based on impact force
            const impactForce = event.impactForce || 0;
            
            // Only shake for significant impacts
            if (impactForce > 5) {
                const intensity = Math.min(impactForce * 0.02, 0.2); // Cap at 0.2
                const duration = Math.min(impactForce * 0.05, 0.5); // Cap at 0.5 seconds
                this.shake(intensity, duration);
            }
        }
    }
} 