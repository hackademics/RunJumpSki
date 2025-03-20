/**
 * @file src/game/renderer/SpeedEffectsController.ts
 * @description Manages visual effects based on player speed
 * 
 * @dependencies babylonjs, IEntity, ITransformComponent, IPostProcessingManager, PostProcessingManager
 * @relatedFiles PostProcessingManager.ts, IPostProcessingManager.ts
 */

import * as BABYLON from 'babylonjs';

// Core engine imports
import { PostProcessingManager } from '../../core/renderer/effects/PostProcessingManager';
import { IPostProcessingManager, PostProcessEffectType } from '../../core/renderer/effects/IPostProcessingManager';
import { Logger } from '../../core/utils/Logger';
import { ServiceLocator } from '../../core/base/ServiceLocator';

// Component imports
import { IEntity } from '../../core/ecs/IEntity';
import { ITransformComponent } from '../../core/ecs/components/ITransformComponent';

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
    private camera: BABYLON.Camera | null = null;
    
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
    
    private logger: Logger;
    
    /**
     * Creates a new SpeedEffectsController with the provided options
     * @param options Configuration options
     */
    constructor(options: Partial<SpeedEffectsOptions> = {}) {
        this.options = { ...DEFAULT_SPEED_EFFECTS_OPTIONS, ...options };
        
        // Initialize logger with default instance
        this.logger = new Logger('SpeedEffectsController');
        
        // Try to get the logger from ServiceLocator
        try {
            const serviceLocator = ServiceLocator.getInstance();
            if (serviceLocator.has('logger')) {
                this.logger = serviceLocator.get<Logger>('logger');
                // Add context tag
                this.logger.addTag('SpeedEffectsController');
            }
        } catch (e) {
            this.logger.warn(`Failed to get logger from ServiceLocator: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
        
        this.logger.debug('SpeedEffectsController created');
    }
    
    /**
     * Initialize the speed effects controller
     * @param scene The Babylon.js scene
     * @param targetEntity The entity to track for speed (usually the player)
     */
    public initialize(scene: BABYLON.Scene, targetEntity: IEntity): void {
        this.scene = scene;
        this.targetEntity = targetEntity;
        
        // Get transform component
        this.transformComponent = targetEntity.getComponent<ITransformComponent>('transform') || null;
        
        // Create post-processing manager
        this.postProcessingManager = new PostProcessingManager();
        
        // Initialize it with the scene
        if (scene) {
            const camera = this.options.camera || scene.activeCamera;
            if (camera) {
                // Initialize with just the scene (following the interface)
                this.postProcessingManager.initialize(scene);
                this.camera = camera;
                
                // Store initial position if we have a transform component
                if (this.transformComponent) {
                    this.lastPosition = this.transformComponent.getPosition().clone();
                }
                
                // Setup post-processing effects
                this.setupEffects();
            } else {
                console.error("SpeedEffectsController: No camera available for effects");
            }
        }
    }
    
    /**
     * Initializes the post-processing effects
     */
    private setupEffects(): void {
        if (!this.scene) return;
        
        // Get camera for effects
        const camera = this.options.camera || this.scene.activeCamera;
        if (!camera) {
            this.logger.error("No camera available for effects");
            return;
        }
        
        // Create post-processing manager if needed
        if (!this.postProcessingManager) {
            // Use constructor overload that accepts scene and use initialize with the camera
            this.postProcessingManager = new PostProcessingManager();
            this.postProcessingManager.initialize(this.scene);
        }
        
        // Setup motion blur effect
        this.postProcessingManager.configureMotionBlur({
            intensity: 0,
            enabled: this.enabled
        });
        this.motionBlurEffect = PostProcessEffectType.MOTION_BLUR;
        
        // Setup depth of field effect
        this.postProcessingManager.configureDepthOfField({
            focalLength: 150,
            fStop: 1.4,
            focusDistance: 2000,
            enabled: this.enabled
        });
        this.depthOfFieldEffect = PostProcessEffectType.DEPTH_OF_FIELD;
        
        // Setup color correction effect
        this.postProcessingManager.configureColorCorrection({
            saturation: 1.0,
            contrast: 1.0,
            exposure: 1.0,
            enabled: this.enabled
        });
        this.colorCorrectionEffect = PostProcessEffectType.COLOR_CORRECTION;
    }
    
    /**
     * Update effects based on current entity speed
     * @param deltaTime Time elapsed since last update
     */
    public update(deltaTime: number): void {
        if (!this.scene || !this.enabled || !this.transformComponent || !this.postProcessingManager) {
            return;
        }
        
        const camera = this.options.camera || this.scene.activeCamera;
        if (!camera) {
            this.logger.warn('No camera available for effects');
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
        if (!this.postProcessingManager || this.motionBlurEffect === null) {
            return;
        }
        
        // Calculate motion blur intensity based on speed
        let blurIntensity = 0;
        
        if (this.smoothedSpeed > this.options.minSpeedForMotionBlur) {
            // Map speed to intensity (0.0 - 1.0)
            const speedFactor = Math.min(
                (this.smoothedSpeed - this.options.minSpeedForMotionBlur) / 
                (this.options.maxSpeedForMotionBlur - this.options.minSpeedForMotionBlur),
                1.0
            );
            
            // Apply intensity scale and max strength
            blurIntensity = speedFactor * this.options.maxMotionBlurStrength * this.intensityScale;
        }
        
        // Update the motion blur effect
        this.postProcessingManager.configureMotionBlur({
            intensity: blurIntensity
        });
    }
    
    /**
     * Update depth of field effect based on current speed
     */
    private updateDepthOfField(): void {
        if (!this.postProcessingManager || this.depthOfFieldEffect === null) {
            return;
        }
        
        // Calculate depth of field intensity based on speed
        let dofStrength = 0;
        
        if (this.smoothedSpeed > this.options.minSpeedForDepthOfField) {
            // Map speed to intensity (0.0 - 1.0)
            const speedFactor = Math.min(
                (this.smoothedSpeed - this.options.minSpeedForDepthOfField) / 
                (this.options.maxSpeedForDepthOfField - this.options.minSpeedForDepthOfField),
                1.0
            );
            
            // Apply intensity scale and max strength
            dofStrength = speedFactor * this.options.maxDepthOfFieldStrength * this.intensityScale;
        }
        
        // Update the depth of field effect
        this.postProcessingManager.configureDepthOfField({
            focusDistance: 2000 - dofStrength * 1500, // Reduce focus distance with speed
            fStop: Math.max(1.4 - dofStrength, 0.5)  // Lower f-stop (more blur) with speed
        });
    }
    
    /**
     * Update color correction effect based on current speed
     */
    private updateColorCorrection(): void {
        if (!this.postProcessingManager || this.colorCorrectionEffect === null) {
            return;
        }
        
        // Calculate color shift intensity based on speed
        let colorShiftIntensity = 0;
        
        if (this.smoothedSpeed > this.options.minSpeedForColorGrading) {
            // Map speed to intensity (0.0 - 1.0)
            const speedFactor = Math.min(
                (this.smoothedSpeed - this.options.minSpeedForColorGrading) / 
                (this.options.maxSpeedForColorGrading - this.options.minSpeedForColorGrading),
                1.0
            );
            
            // Apply intensity scale and max shift amount
            colorShiftIntensity = speedFactor * this.options.maxColorShiftAmount * this.intensityScale;
        }
        
        // Update the color correction effect
        this.postProcessingManager.configureColorCorrection({
            saturation: 1.0 + colorShiftIntensity * 0.2,  // Increase saturation with speed
            contrast: 1.0 + colorShiftIntensity * 0.3,    // Increase contrast with speed
            exposure: 1.0 + colorShiftIntensity * 0.1     // Slight exposure boost with speed
        });
    }
    
    /**
     * Enable or disable all speed-based effects
     * @param enabled Whether effects should be enabled
     */
    public setEnabled(enabled: boolean): void {
        if (this.enabled === enabled) {
            return;
        }
        
        this.enabled = enabled;
        
        // Update all effects
        if (this.postProcessingManager) {
            if (this.motionBlurEffect !== null) {
                if (enabled) {
                    this.postProcessingManager.enableEffect(PostProcessEffectType.MOTION_BLUR);
                } else {
                    this.postProcessingManager.disableEffect(PostProcessEffectType.MOTION_BLUR);
                }
            }
            
            if (this.depthOfFieldEffect !== null) {
                if (enabled) {
                    this.postProcessingManager.enableEffect(PostProcessEffectType.DEPTH_OF_FIELD);
                } else {
                    this.postProcessingManager.disableEffect(PostProcessEffectType.DEPTH_OF_FIELD);
                }
            }
            
            if (this.colorCorrectionEffect !== null) {
                if (enabled) {
                    this.postProcessingManager.enableEffect(PostProcessEffectType.COLOR_CORRECTION);
                } else {
                    this.postProcessingManager.disableEffect(PostProcessEffectType.COLOR_CORRECTION);
                }
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
            if (this.motionBlurEffect !== null) {
                this.postProcessingManager.removeEffect(PostProcessEffectType.MOTION_BLUR);
            }
            
            if (this.depthOfFieldEffect !== null) {
                this.postProcessingManager.removeEffect(PostProcessEffectType.DEPTH_OF_FIELD);
            }
            
            if (this.colorCorrectionEffect !== null) {
                this.postProcessingManager.removeEffect(PostProcessEffectType.COLOR_CORRECTION);
            }
            
            // Dispose the post-processing manager
            this.postProcessingManager.dispose();
            this.postProcessingManager = null;
        }
        
        this.targetEntity = null;
        this.transformComponent = null;
        this.scene = null;
    }
} 