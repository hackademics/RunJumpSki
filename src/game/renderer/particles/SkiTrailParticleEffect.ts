/**
 * @file src/game/renderer/particles/SkiTrailParticleEffect.ts
 * @description Ski trail particle effects for different surfaces
 */

import * as BABYLON from 'babylonjs';

// Core engine imports
import { ParticleSystemManager } from '../../../core/renderer/particles/ParticleSystemManager';
import { IParticleSystemManager, ParticleSystemFromPresetOptions } from '../../../core/renderer/particles/IParticleSystemManager';
import { ParticlePresets } from '../../../core/renderer/particles/ParticlePresets';

// Component imports
import { IEntity } from '../../../core/ecs/IEntity';
import { ITransformComponent } from '../../../core/ecs/components/ITransformComponent';

// Error definitions
import { ComponentError } from '../../../core/utils/errors/ComponentError';

/**
 * Surface types for ski trails
 */
export enum SurfaceType {
    SNOW = 'snow',
    ICE = 'ice',
    GRASS = 'grass',
    DIRT = 'dirt',
    ROCK = 'rock',
    SAND = 'sand',
    METAL = 'metal'
}

/**
 * Configuration options for ski trail particle effects
 */
export interface SkiTrailParticleOptions {
    /** Position offset behind player (default 0,0,-0.3) */
    trailOffset: BABYLON.Vector3;
    /** Width of the trail (affects emission area) */
    trailWidth: number;
    /** Intensity of the effect (0.0-1.0) */
    intensity: number;
    /** Minimum player speed required for trail effect */
    minSpeed: number;
    /** Speed at which trail reaches full intensity */
    maxSpeed: number;
    /** Size of individual particles */
    particleSize: number;
    /** How long particles remain visible (seconds) */
    particleLifetime: number;
    /** Maximum number of active trail particles */
    maxParticles: number;
    /** Whether to emit particles only when near ground */
    groundOnly: boolean;
    /** Maximum height from ground to emit particles */
    maxGroundHeight: number;
    /** Optional alternate texture to use for particles */
    texture?: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_SKI_TRAIL_OPTIONS: SkiTrailParticleOptions = {
    trailOffset: new BABYLON.Vector3(0, -0.1, -0.3),
    trailWidth: 0.4,
    intensity: 1.0,
    minSpeed: 5.0,  // Units per second
    maxSpeed: 30.0, // Units per second
    particleSize: 0.2,
    particleLifetime: 1.0,
    maxParticles: 300,
    groundOnly: true,
    maxGroundHeight: 0.3
};

/**
 * Surface-specific configurations for ski trails
 */
export const SURFACE_CONFIGS: Record<SurfaceType, Partial<SkiTrailParticleOptions> & {
    color1: BABYLON.Color4;
    color2: BABYLON.Color4;
    emitRate: number;
}> = {
    [SurfaceType.SNOW]: {
        color1: new BABYLON.Color4(1.0, 1.0, 1.0, 0.8),
        color2: new BABYLON.Color4(0.9, 0.9, 0.9, 0),
        particleSize: 0.15,
        particleLifetime: 1.2,
        emitRate: 100
    },
    [SurfaceType.ICE]: {
        color1: new BABYLON.Color4(0.8, 0.9, 1.0, 0.5),
        color2: new BABYLON.Color4(0.8, 0.9, 1.0, 0),
        particleSize: 0.1,
        particleLifetime: 0.8,
        emitRate: 50
    },
    [SurfaceType.GRASS]: {
        color1: new BABYLON.Color4(0.4, 0.8, 0.3, 0.7),
        color2: new BABYLON.Color4(0.5, 0.7, 0.3, 0),
        particleSize: 0.2,
        particleLifetime: 1.5,
        emitRate: 120
    },
    [SurfaceType.DIRT]: {
        color1: new BABYLON.Color4(0.6, 0.4, 0.2, 0.8),
        color2: new BABYLON.Color4(0.5, 0.3, 0.1, 0),
        particleSize: 0.2,
        particleLifetime: 1.8,
        emitRate: 150
    },
    [SurfaceType.ROCK]: {
        color1: new BABYLON.Color4(0.5, 0.5, 0.5, 0.6),
        color2: new BABYLON.Color4(0.4, 0.4, 0.4, 0),
        particleSize: 0.15,
        particleLifetime: 1.0,
        emitRate: 80
    },
    [SurfaceType.SAND]: {
        color1: new BABYLON.Color4(0.9, 0.8, 0.6, 0.7),
        color2: new BABYLON.Color4(0.8, 0.7, 0.5, 0),
        particleSize: 0.2,
        particleLifetime: 2.0,
        emitRate: 180
    },
    [SurfaceType.METAL]: {
        color1: new BABYLON.Color4(0.7, 0.7, 0.7, 0.5),
        color2: new BABYLON.Color4(0.6, 0.6, 0.6, 0),
        particleSize: 0.1,
        particleLifetime: 0.6,
        emitRate: 60
    }
};

/**
 * Interface for SkiTrailParticleEffect
 */
export interface ISkiTrailParticleEffect {
    /**
     * Initialize the ski trail particle effect
     * @param scene The Babylon.js scene
     * @param targetEntity The entity to attach the trail to (usually the player)
     */
    initialize(scene: BABYLON.Scene, targetEntity: IEntity): void;
    
    /**
     * Update the ski trail effect
     * @param deltaTime Time elapsed since last update
     * @param currentSpeed Current speed of the entity
     * @param isSkiing Whether the entity is currently skiing
     * @param surfaceType The type of surface the entity is skiing on
     * @param distanceToGround Distance from entity to the ground
     */
    update(
        deltaTime: number, 
        currentSpeed: number, 
        isSkiing: boolean, 
        surfaceType: SurfaceType, 
        distanceToGround: number
    ): void;
    
    /**
     * Set the trail visibility
     * @param visible Whether the trail should be visible
     */
    setVisible(visible: boolean): void;
    
    /**
     * Set the trail intensity scale (0.0 = no trail, 1.0 = full intensity)
     * @param scale The intensity scale to apply
     */
    setIntensityScale(scale: number): void;
    
    /**
     * Dispose resources used by the effect
     */
    dispose(): void;
}

/**
 * Particle effects for ski trails on different surfaces
 */
export class SkiTrailParticleEffect implements ISkiTrailParticleEffect {
    private scene: BABYLON.Scene | null = null;
    private targetEntity: IEntity | null = null;
    private transformComponent: ITransformComponent | null = null;
    private particleSystemManager: IParticleSystemManager | null = null;
    
    private options: SkiTrailParticleOptions;
    private isVisible: boolean = true;
    private intensityScale: number = 1.0;
    
    // Current state
    private currentSurfaceType: SurfaceType = SurfaceType.SNOW;
    private lastPosition: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    private trailPoints: BABYLON.Vector3[] = [];
    private isEmitting: boolean = false;
    
    // Particle system IDs for each surface type
    private particleSystems: Map<SurfaceType, string> = new Map();
    
    /**
     * Create a new SkiTrailParticleEffect with the given options
     * @param options Configuration options for ski trail particles
     */
    constructor(options: Partial<SkiTrailParticleOptions> = {}) {
        this.options = {
            ...DEFAULT_SKI_TRAIL_OPTIONS,
            ...options,
            trailOffset: options.trailOffset 
                ? options.trailOffset.clone() 
                : DEFAULT_SKI_TRAIL_OPTIONS.trailOffset.clone()
        };
    }
    
    /**
     * Initialize the ski trail particle effect
     * @param scene The Babylon.js scene
     * @param targetEntity The entity to attach the trail to (usually the player)
     */
    public initialize(scene: BABYLON.Scene, targetEntity: IEntity): void {
        this.scene = scene;
        this.targetEntity = targetEntity;
        
        // Get required components
        this.transformComponent = targetEntity.getComponent<ITransformComponent>('transform');
        if (!this.transformComponent) {
            throw new ComponentError('skiTrailParticleEffect', targetEntity.id, 'Entity must have a transform component');
        }
        
        // Create particle system manager
        this.particleSystemManager = new ParticleSystemManager(scene);
        
        // Create particle systems for each surface type
        this.createParticleSystems();
        
        // Store initial position
        this.lastPosition = this.transformComponent.getPosition().clone();
        
        // Initial state - not emitting
        this.setEmitting(false);
    }
    
    /**
     * Create particle systems for all surface types
     */
    private createParticleSystems(): void {
        if (!this.scene || !this.particleSystemManager) {
            return;
        }
        
        // Get entity position
        const entityPosition = this.transformComponent!.getPosition().clone();
        
        // Calculate emitter position
        const emitterPosition = entityPosition.add(this.options.trailOffset);
        
        // Create a particle system for each surface type
        Object.values(SurfaceType).forEach((surfaceType) => {
            // Get surface-specific config
            const surfaceConfig = SURFACE_CONFIGS[surfaceType];
            
            // Create trail particle system
            const system = this.createParticleSystem(
                surfaceType,
                emitterPosition,
                surfaceConfig
            );
            
            if (system) {
                this.particleSystems.set(surfaceType, system);
            }
        });
    }
    
    /**
     * Create a particle system for a specific surface type
     * @param surfaceType The surface type
     * @param emitterPosition Initial emitter position
     * @param surfaceConfig Surface-specific configuration
     * @returns The particle system ID
     */
    private createParticleSystem(
        surfaceType: SurfaceType,
        emitterPosition: BABYLON.Vector3,
        surfaceConfig: typeof SURFACE_CONFIGS[SurfaceType]
    ): string | null {
        if (!this.particleSystemManager || !this.scene) {
            return null;
        }
        
        // Create a unique name for this system
        const systemName = `ski-trail-${surfaceType}-${Date.now()}`;
        
        // Create the particle system
        const particleSystem = new BABYLON.ParticleSystem(systemName, this.options.maxParticles, this.scene);
        
        // Configure base properties
        particleSystem.emitter = emitterPosition;
        particleSystem.minEmitBox = new BABYLON.Vector3(-this.options.trailWidth / 2, 0, 0);
        particleSystem.maxEmitBox = new BABYLON.Vector3(this.options.trailWidth / 2, 0, 0);
        
        // Set particle properties
        particleSystem.color1 = surfaceConfig.color1;
        particleSystem.color2 = surfaceConfig.color2;
        particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0);
        
        // Set particle size
        const particleSize = surfaceConfig.particleSize || this.options.particleSize;
        particleSystem.minSize = particleSize * 0.7;
        particleSystem.maxSize = particleSize * 1.3;
        
        // Set lifetime
        const lifetime = surfaceConfig.particleLifetime || this.options.particleLifetime;
        particleSystem.minLifeTime = lifetime * 0.7;
        particleSystem.maxLifeTime = lifetime * 1.3;
        
        // Set emission rate
        particleSystem.emitRate = 0; // Start with no emission
        particleSystem.manualEmitCount = 0;
        
        // Set direction
        particleSystem.direction1 = new BABYLON.Vector3(-0.2, 0.1, -0.2);
        particleSystem.direction2 = new BABYLON.Vector3(0.2, 0.5, 0.2);
        
        // Set power (speed)
        particleSystem.minEmitPower = 0.1;
        particleSystem.maxEmitPower = 0.5;
        
        // Set physics
        particleSystem.gravity = new BABYLON.Vector3(0, -0.5, 0);
        
        // Set blending
        particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
        
        // Set texture
        if (this.options.texture) {
            particleSystem.particleTexture = new BABYLON.Texture(this.options.texture, this.scene);
        } else {
            // Use a default texture based on surface type
            const defaultTexture = this.getDefaultTextureForSurface(surfaceType);
            particleSystem.particleTexture = new BABYLON.Texture(defaultTexture, this.scene);
        }
        
        // Initialize but don't start emitting
        particleSystem.start();
        particleSystem.isEmitting = false;
        
        // Register with particle system manager
        return this.particleSystemManager.registerExternalParticleSystem(systemName, particleSystem);
    }
    
    /**
     * Get the default texture path for a specific surface type
     * @param surfaceType The surface type
     * @returns Path to the texture
     */
    private getDefaultTextureForSurface(surfaceType: SurfaceType): string {
        switch (surfaceType) {
            case SurfaceType.SNOW:
                return 'textures/particles/snowflake.png';
            case SurfaceType.ICE:
                return 'textures/particles/ice_particle.png';
            case SurfaceType.GRASS:
                return 'textures/particles/grass_particle.png';
            case SurfaceType.DIRT:
                return 'textures/particles/dirt_particle.png';
            case SurfaceType.ROCK:
                return 'textures/particles/rock_particle.png';
            case SurfaceType.SAND:
                return 'textures/particles/sand_particle.png';
            case SurfaceType.METAL:
                return 'textures/particles/spark.png';
            default:
                return 'textures/particles/particle.png';
        }
    }
    
    /**
     * Update the ski trail effect
     * @param deltaTime Time elapsed since last update
     * @param currentSpeed Current speed of the entity
     * @param isSkiing Whether the entity is currently skiing
     * @param surfaceType The type of surface the entity is skiing on
     * @param distanceToGround Distance from entity to the ground
     */
    public update(
        deltaTime: number, 
        currentSpeed: number, 
        isSkiing: boolean, 
        surfaceType: SurfaceType, 
        distanceToGround: number
    ): void {
        if (!this.transformComponent || !this.particleSystemManager) {
            return;
        }
        
        // Check if we should emit particles
        const shouldEmit = this.shouldEmitParticles(
            isSkiing, 
            currentSpeed, 
            distanceToGround
        );
        
        // Set emitting state
        this.setEmitting(shouldEmit);
        
        // Update current surface type
        if (this.currentSurfaceType !== surfaceType) {
            this.setSurfaceType(surfaceType);
        }
        
        // Update emitter position to follow entity
        this.updateEmitterPosition();
        
        // Update emission rate based on speed
        if (shouldEmit) {
            this.updateEmissionRate(currentSpeed);
        }
    }
    
    /**
     * Determine if particles should be emitted
     * @param isSkiing Whether the entity is skiing
     * @param currentSpeed Current speed of the entity
     * @param distanceToGround Distance from entity to ground
     * @returns Whether particles should be emitted
     */
    private shouldEmitParticles(
        isSkiing: boolean, 
        currentSpeed: number, 
        distanceToGround: number
    ): boolean {
        // Must be skiing
        if (!isSkiing) {
            return false;
        }
        
        // Must be above minimum speed
        if (currentSpeed < this.options.minSpeed) {
            return false;
        }
        
        // Must be near ground if groundOnly is true
        if (this.options.groundOnly && distanceToGround > this.options.maxGroundHeight) {
            return false;
        }
        
        // Must be visible
        if (!this.isVisible) {
            return false;
        }
        
        // Must have non-zero intensity
        if (this.intensityScale <= 0) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Set the emitting state of all particle systems
     * @param emitting Whether particles should be emitted
     */
    private setEmitting(emitting: boolean): void {
        if (this.isEmitting === emitting) {
            return; // No change
        }
        
        this.isEmitting = emitting;
        
        // Update all particle systems
        this.particleSystems.forEach((systemId, surfaceType) => {
            // Only the current surface type should emit
            const shouldEmit = emitting && surfaceType === this.currentSurfaceType;
            
            if (this.particleSystemManager) {
                this.particleSystemManager.setEmitting(systemId, shouldEmit);
            }
        });
    }
    
    /**
     * Set the current surface type
     * @param surfaceType The new surface type
     */
    private setSurfaceType(surfaceType: SurfaceType): void {
        // Disable emission for previous surface type
        const previousSystemId = this.particleSystems.get(this.currentSurfaceType);
        if (previousSystemId && this.particleSystemManager) {
            this.particleSystemManager.setEmitting(previousSystemId, false);
        }
        
        // Update current surface type
        this.currentSurfaceType = surfaceType;
        
        // Enable emission for new surface type if we're emitting
        if (this.isEmitting) {
            const newSystemId = this.particleSystems.get(surfaceType);
            if (newSystemId && this.particleSystemManager) {
                this.particleSystemManager.setEmitting(newSystemId, true);
            }
        }
    }
    
    /**
     * Update emission rate based on speed
     * @param currentSpeed Current speed of the entity
     */
    private updateEmissionRate(currentSpeed: number): void {
        if (!this.particleSystemManager) {
            return;
        }
        
        // Get the system ID for the current surface type
        const systemId = this.particleSystems.get(this.currentSurfaceType);
        if (!systemId) {
            return;
        }
        
        // Get surface-specific config
        const surfaceConfig = SURFACE_CONFIGS[this.currentSurfaceType];
        
        // Calculate emission rate based on speed
        let speedFactor = 0;
        if (currentSpeed >= this.options.maxSpeed) {
            speedFactor = 1.0;
        } else if (currentSpeed > this.options.minSpeed) {
            speedFactor = (currentSpeed - this.options.minSpeed) / 
                (this.options.maxSpeed - this.options.minSpeed);
        }
        
        // Calculate final emission rate
        const emitRate = surfaceConfig.emitRate * speedFactor * this.intensityScale * this.options.intensity;
        
        // Update emission rate
        this.particleSystemManager.updateEmitRate(systemId, emitRate);
    }
    
    /**
     * Update the position of particle emitters
     */
    private updateEmitterPosition(): void {
        if (!this.transformComponent || !this.particleSystemManager) {
            return;
        }
        
        // Get current entity position and rotation
        const entityPosition = this.transformComponent.getPosition();
        const entityRotation = this.transformComponent.getRotation();
        
        // Create rotation matrix from entity rotation
        const rotationMatrix = BABYLON.Matrix.RotationYawPitchRoll(
            entityRotation.y, 
            entityRotation.x, 
            entityRotation.z
        );
        
        // Transform offset vector by rotation
        const transformedOffset = BABYLON.Vector3.TransformCoordinates(
            this.options.trailOffset, 
            rotationMatrix
        );
        
        // Calculate new emitter position
        const emitterPosition = entityPosition.add(transformedOffset);
        
        // Only update emitter for current surface type to save performance
        const systemId = this.particleSystems.get(this.currentSurfaceType);
        if (systemId && this.particleSystemManager) {
            this.particleSystemManager.updateEmitterPosition(systemId, emitterPosition);
        }
    }
    
    /**
     * Set the trail visibility
     * @param visible Whether the trail should be visible
     */
    public setVisible(visible: boolean): void {
        this.isVisible = visible;
        
        if (!this.particleSystemManager) {
            return;
        }
        
        // Update all systems
        this.particleSystems.forEach((systemId) => {
            this.particleSystemManager?.setSystemVisible(systemId, visible);
        });
        
        // If not visible, stop emission
        if (!visible) {
            this.setEmitting(false);
        }
    }
    
    /**
     * Set the trail intensity scale (0.0 = no trail, 1.0 = full intensity)
     * @param scale The intensity scale to apply
     */
    public setIntensityScale(scale: number): void {
        this.intensityScale = Math.max(0, Math.min(scale, 1));
        
        // Update emission rate if currently emitting
        if (this.isEmitting) {
            // We don't know the current speed here, so we use a default value
            // The next update() call will correct this
            this.updateEmissionRate(this.options.maxSpeed);
        }
    }
    
    /**
     * Dispose resources used by the effect
     */
    public dispose(): void {
        if (this.particleSystemManager) {
            // Dispose all particle systems
            this.particleSystems.forEach((systemId) => {
                this.particleSystemManager?.removeParticleSystem(systemId);
            });
            
            // Dispose particle system manager
            this.particleSystemManager.dispose();
            this.particleSystemManager = null;
        }
        
        // Clear tracking
        this.particleSystems.clear();
        this.trailPoints = [];
        
        this.scene = null;
        this.targetEntity = null;
        this.transformComponent = null;
    }
} 