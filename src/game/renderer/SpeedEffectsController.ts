/**
 * @file src/game/renderer/SpeedEffectsController.ts
 * @description Controller for dynamic visual effects based on player movement speed
 */

import * as BABYLON from 'babylonjs';

// Core engine imports
import { PostProcessingManager } from '../../core/renderer/effects/PostProcessingManager';
import { IPostProcessingManager } from '../../core/renderer/effects/IPostProcessingManager';

// Component imports
import { IEntity } from '../../core/ecs/IEntity';
import { ITransformComponent } from '../../core/ecs/components/ITransformComponent';

// Type definitions
import { ComponentError } from '../../types/errors/ComponentError';

/**
 * Configuration options for speed-based effects
 */
export interface SpeedEffectsOptions {
    /** Speed threshold for starting motion blur effect (units/second) */
    minSpeedForMotionBlur: number;
    /** Speed at which motion blur reaches maximum intensity (units/second) */
    maxSpeedForMotionBlur: number;
    /** Maximum motion blur strength (0.0 - 1.0) */
    maxMotionBlurStrength: number;
    /** Speed threshold for starting depth of field effect (units/second) */
    minSpeedForDepthOfField: number;
    /** Speed at which depth of field reaches maximum intensity (units/second) */
    maxSpeedForDepthOfField: number;
    /** Maximum depth of field blur strength (0.0 - 1.0) */
    maxDepthOfFieldStrength: number;
    /** Speed threshold for starting color grading effect (units/second) */
    minSpeedForColorGrading: number;
    /** Speed at which color grading reaches maximum intensity (units/second) */
    maxSpeedForColorGrading: number;
    /** Color shift amount at maximum speed (-1.0 - 1.0) */
    maxColorShiftAmount: number;
    /** Optional camera to use for effects (if not provided, will use scene.activeCamera) */
    camera?: BABYLON.Camera;
}

/**
 * Default configuration values
 */
export const DEFAULT_SPEED_EFFECTS_OPTIONS: SpeedEffectsOptions = {
    minSpeedForMotionBlur: 10,
    maxSpeedForMotionBlur: 40,
    maxMotionBlurStrength: 0.8,
    minSpeedForDepthOfField: 20,
    maxSpeedForDepthOfField: 50,
    maxDepthOfFieldStrength: 0.6,
    minSpeedForColorGrading: 15,
    maxSpeedForColorGrading: 45,
    maxColorShiftAmount: 0.4
};

/**
 * Interface for SpeedEffectsController
 */
export interface ISpeedEffectsController {
    /**
     * Initialize the speed effects controller
     * @param scene The Babylon.js scene
     * @param targetEntity The entity to track for speed (usually the player)
     */
    initialize(scene: BABYLON.Scene, targetEntity: IEntity): void;
    
    /**
     * Update effects based on current entity speed
     * @param deltaTime Time elapsed since last update
     */
    update(deltaTime: number): void;
    
    /**
     * Enable or disable all speed-based effects
     * @param enabled Whether effects should be enabled
     */
    setEnabled(enabled: boolean): void;
    
    /**
     * Set intensity scale for all effects (0.0 = no effects, 1.0 = full effects)
     * @param scale The intensity scale to apply
     */
    setIntensityScale(scale: number): void;
    
    /**
     * Dispose resources used by the controller
     */
    dispose(): void;
}

/**
 * Controller for dynamic visual effects based on player movement speed
 */
export class SpeedEffectsController implements ISpeedEffectsController {
    private scene: BABYLON.Scene | null = null;
    private targetEntity: IEntity | null = null;
    private transformComponent: ITransformComponent | null = null;
    private postProcessingManager: IPostProcessingManager | null = null;
    
    private options: SpeedEffectsOptions;
    private enabled: boolean = true;
    private intensityScale: number = 1.0;
    
    private lastPosition: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    private currentSpeed: number = 0;
    private smoothedSpeed: number = 0;
    private speedSmoothingFactor: number = 0.2;
    
    private motionBlurEffect: string | null = null;
    private depthOfFieldEffect: string | null = null;
    private colorCorrectionEffect: string | null = null;
    
    /**
     * Create a new SpeedEffectsController with the given options
     * @param options Configuration options for speed effects
     */
    constructor(options: Partial<SpeedEffectsOptions> = {}) {
        this.options = { ...DEFAULT_SPEED_EFFECTS_OPTIONS, ...options };
    }
    
    /**
     * Initialize the speed effects controller
     * @param scene The Babylon.js scene
     * @param targetEntity The entity to track for speed (usually the player)
     */
    public initialize(scene: BABYLON.Scene, targetEntity: IEntity): void {
        this.scene = scene;
        this.targetEntity = targetEntity;
        
        // Get required components
        this.transformComponent = targetEntity.getComponent<ITransformComponent>('transform');
        if (!this.transformComponent) {
            throw new ComponentError('speedEffectsController', targetEntity.id, 'Entity must have a transform component');
        }
        
        // Create post-processing manager
        this.postProcessingManager = new PostProcessingManager(scene);
        
        // Store initial position
        this.lastPosition = this.transformComponent.getPosition().clone();
        
        // Setup post-processing effects
        this.setupEffects();
    }
    
    /**
     * Setup all post-processing effects
     */
    private setupEffects(): void {
        if (!this.scene || !this.postProcessingManager) {
            return;
        }
        
        const camera = this.options.camera || this.scene.activeCamera;
        if (!camera) {
            console.warn('SpeedEffectsController: No camera available for effects');
            return;
        }
        
        // Create motion blur effect with minimum intensity
        this.motionBlurEffect = this.postProcessingManager.addMotionBlurEffect({
            camera,
            intensity: 0,
            samplingMode: BABYLON.Texture.BILINEAR_SAMPLINGMODE,
            isEnabled: this.enabled
        });
        
        // Create depth of field effect with minimum intensity
        this.depthOfFieldEffect = this.postProcessingManager.addDepthOfFieldEffect({
            camera,
            focalLength: 150,
            fStop: 1.4,
            focusDistance: 2000,
            focalDepth: 10,
            maxBlurLevel: 0, // Start with no blur
            isEnabled: this.enabled
        });
        
        // Create color correction effect
        this.colorCorrectionEffect = this.postProcessingManager.addColorCorrectionEffect({
            camera,
            saturation: 1.0,
            contrast: 1.0,
            exposure: 1.0,
            isEnabled: this.enabled
        });
    }
    
    /**
     * Update effects based on current entity speed
     * @param deltaTime Time elapsed since last update
     */
    public update(deltaTime: number): void {
        if (!this.enabled || !this.transformComponent || !this.postProcessingManager) {
            return;
        }
        
        // Calculate current speed
        const currentPosition = this.transformComponent.getPosition();
        const displacement = BABYLON.Vector3.Distance(currentPosition, this.lastPosition);
        const instantSpeed = displacement / Math.max(deltaTime, 0.001); // Avoid division by zero
        
        // Smooth the speed to avoid jarring effect changes
        this.smoothedSpeed = this.smoothedSpeed + this.speedSmoothingFactor * (instantSpeed - this.smoothedSpeed);
        this.currentSpeed = this.smoothedSpeed;
        
        // Store current position for next frame
        this.lastPosition.copyFrom(currentPosition);
        
        // Update motion blur based on speed
        this.updateMotionBlur();
        
        // Update depth of field based on speed
        this.updateDepthOfField();
        
        // Update color correction based on speed
        this.updateColorCorrection();
    }
    
    /**
     * Update motion blur effect based on current speed
     */
    private updateMotionBlur(): void {
        if (!this.postProcessingManager || !this.motionBlurEffect) {
            return;
        }
        
        // Calculate motion blur intensity based on speed
        let motionBlurIntensity = 0;
        
        if (this.currentSpeed > this.options.minSpeedForMotionBlur) {
            const speedFactor = Math.min(
                (this.currentSpeed - this.options.minSpeedForMotionBlur) / 
                (this.options.maxSpeedForMotionBlur - this.options.minSpeedForMotionBlur),
                1.0
            );
            
            motionBlurIntensity = speedFactor * this.options.maxMotionBlurStrength * this.intensityScale;
        }
        
        // Update motion blur effect
        this.postProcessingManager.updateMotionBlurEffect(
            this.motionBlurEffect,
            { intensity: motionBlurIntensity }
        );
    }
    
    /**
     * Update depth of field effect based on current speed
     */
    private updateDepthOfField(): void {
        if (!this.postProcessingManager || !this.depthOfFieldEffect) {
            return;
        }
        
        // Calculate depth of field intensity based on speed
        let maxBlurLevel = 0;
        
        if (this.currentSpeed > this.options.minSpeedForDepthOfField) {
            const speedFactor = Math.min(
                (this.currentSpeed - this.options.minSpeedForDepthOfField) / 
                (this.options.maxSpeedForDepthOfField - this.options.minSpeedForDepthOfField),
                1.0
            );
            
            // Scale from 0-5 for maxBlurLevel (Babylon.js DOF parameter)
            maxBlurLevel = Math.floor(speedFactor * 5 * this.options.maxDepthOfFieldStrength * this.intensityScale);
        }
        
        // Update depth of field effect
        this.postProcessingManager.updateDepthOfFieldEffect(
            this.depthOfFieldEffect,
            { maxBlurLevel }
        );
    }
    
    /**
     * Update color correction effect based on current speed
     */
    private updateColorCorrection(): void {
        if (!this.postProcessingManager || !this.colorCorrectionEffect) {
            return;
        }
        
        // Default values
        let saturation = 1.0;
        let contrast = 1.0;
        let exposure = 1.0;
        
        if (this.currentSpeed > this.options.minSpeedForColorGrading) {
            const speedFactor = Math.min(
                (this.currentSpeed - this.options.minSpeedForColorGrading) / 
                (this.options.maxSpeedForColorGrading - this.options.minSpeedForColorGrading),
                1.0
            );
            
            // Scale effect by speed factor
            const effectIntensity = speedFactor * this.options.maxColorShiftAmount * this.intensityScale;
            
            // Increase saturation and contrast with speed
            saturation = 1.0 + effectIntensity;
            contrast = 1.0 + effectIntensity * 0.5;
            exposure = 1.0 + effectIntensity * 0.2;
        }
        
        // Update color correction effect
        this.postProcessingManager.updateColorCorrectionEffect(
            this.colorCorrectionEffect,
            { saturation, contrast, exposure }
        );
    }
    
    /**
     * Enable or disable all speed-based effects
     * @param enabled Whether effects should be enabled
     */
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        
        if (this.postProcessingManager) {
            if (this.motionBlurEffect) {
                this.postProcessingManager.setEffectEnabled(this.motionBlurEffect, enabled);
            }
            
            if (this.depthOfFieldEffect) {
                this.postProcessingManager.setEffectEnabled(this.depthOfFieldEffect, enabled);
            }
            
            if (this.colorCorrectionEffect) {
                this.postProcessingManager.setEffectEnabled(this.colorCorrectionEffect, enabled);
            }
        }
    }
    
    /**
     * Set intensity scale for all effects (0.0 = no effects, 1.0 = full effects)
     * @param scale The intensity scale to apply
     */
    public setIntensityScale(scale: number): void {
        this.intensityScale = Math.max(0, Math.min(scale, 1));
        
        // Force update all effects to apply new scale
        this.updateMotionBlur();
        this.updateDepthOfField();
        this.updateColorCorrection();
    }
    
    /**
     * Dispose resources used by the controller
     */
    public dispose(): void {
        if (this.postProcessingManager) {
            if (this.motionBlurEffect) {
                this.postProcessingManager.removeEffect(this.motionBlurEffect);
                this.motionBlurEffect = null;
            }
            
            if (this.depthOfFieldEffect) {
                this.postProcessingManager.removeEffect(this.depthOfFieldEffect);
                this.depthOfFieldEffect = null;
            }
            
            if (this.colorCorrectionEffect) {
                this.postProcessingManager.removeEffect(this.colorCorrectionEffect);
                this.colorCorrectionEffect = null;
            }
            
            this.postProcessingManager.dispose();
            this.postProcessingManager = null;
        }
        
        this.scene = null;
        this.targetEntity = null;
        this.transformComponent = null;
    }
} 