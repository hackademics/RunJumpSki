/**
 * @file src/game/renderer/particles/JetpackParticleEffect.ts
 * @description Jetpack particle effects for player movement
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
 * Configuration options for jetpack particle effects
 */
export interface JetpackParticleOptions {
    /** Position offset from entity position (default: behind and below player) */
    positionOffset: BABYLON.Vector3;
    /** Direction of particle emission (default: upward) */
    direction: BABYLON.Vector3;
    /** Maximum number of particles to emit at full thrust */
    maxParticles: number;
    /** Particle size at emission */
    particleSize: number;
    /** Particle growth factor (1.0 = constant size) */
    sizeGrowthFactor: number;
    /** Base color for jetpack particles */
    baseColor: BABYLON.Color4;
    /** Secondary color for jetpack particles (for gradient) */
    secondaryColor: BABYLON.Color4;
    /** Minimum lifetime of particles in seconds */
    minLifeTime: number;
    /** Maximum lifetime of particles in seconds */
    maxLifeTime: number;
    /** Emit rate factor (higher = more particles per second) */
    emitRateFactor: number;
    /** Minimum particle emission power */
    minEmitPower: number;
    /** Maximum particle emission power */
    maxEmitPower: number;
    /** Particle system capacity */
    capacity: number;
    /** Optional texture to use for particles (default: built-in flame texture) */
    texture?: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_JETPACK_PARTICLE_OPTIONS: JetpackParticleOptions = {
    positionOffset: new BABYLON.Vector3(0, -0.5, -0.3),
    direction: new BABYLON.Vector3(0, 1, 0),
    maxParticles: 500,
    particleSize: 0.3,
    sizeGrowthFactor: 0.8,
    baseColor: new BABYLON.Color4(1.0, 0.5, 0.1, 1.0),      // Orange
    secondaryColor: new BABYLON.Color4(1.0, 0.9, 0.2, 0.0), // Yellow with alpha fadeout
    minLifeTime: 0.3,
    maxLifeTime: 0.8,
    emitRateFactor: 100,
    minEmitPower: 1,
    maxEmitPower: 3,
    capacity: 500
};

/**
 * Jetpack particle effect states
 */
export enum JetpackEffectState {
    OFF = 'off',
    IDLE = 'idle',
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    BOOST = 'boost'
}

/**
 * Interface for JetpackParticleEffect
 */
export interface IJetpackParticleEffect {
    /**
     * Initialize the jetpack particle effect
     * @param scene The Babylon.js scene
     * @param targetEntity The entity to attach particles to (usually the player)
     */
    initialize(scene: BABYLON.Scene, targetEntity: IEntity): void;
    
    /**
     * Update the jetpack particle effect
     * @param deltaTime Time elapsed since last update
     * @param thrustLevel Normalized thrust level (0.0 - 1.0)
     * @param isActive Whether the jetpack is active
     */
    update(deltaTime: number, thrustLevel: number, isActive: boolean): void;
    
    /**
     * Set the jetpack effect state directly
     * @param state The desired effect state
     */
    setState(state: JetpackEffectState): void;
    
    /**
     * Set visibility of the effect
     * @param visible Whether the effect should be visible
     */
    setVisible(visible: boolean): void;
    
    /**
     * Set the position offset relative to the entity
     * @param offset The position offset
     */
    setPositionOffset(offset: BABYLON.Vector3): void;
    
    /**
     * Dispose resources used by the effect
     */
    dispose(): void;
}

/**
 * Jetpack-specific particle effects
 */
export class JetpackParticleEffect implements IJetpackParticleEffect {
    private scene: BABYLON.Scene | null = null;
    private targetEntity: IEntity | null = null;
    private transformComponent: ITransformComponent | null = null;
    private particleSystemManager: IParticleSystemManager | null = null;
    
    private options: JetpackParticleOptions;
    private isVisible: boolean = true;
    private currentState: JetpackEffectState = JetpackEffectState.OFF;
    private lastThrustLevel: number = 0;
    
    // Particle system IDs
    private mainThrustParticles: string | null = null;
    private secondaryParticles: string | null = null;
    private sparkParticles: string | null = null;
    
    /**
     * Create a new JetpackParticleEffect with the given options
     * @param options Configuration options for jetpack particles
     */
    constructor(options: Partial<JetpackParticleOptions> = {}) {
        this.options = {
            ...DEFAULT_JETPACK_PARTICLE_OPTIONS,
            ...options,
            positionOffset: options.positionOffset 
                ? options.positionOffset 
                : DEFAULT_JETPACK_PARTICLE_OPTIONS.positionOffset.clone(),
            direction: options.direction
                ? options.direction
                : DEFAULT_JETPACK_PARTICLE_OPTIONS.direction.clone(),
            baseColor: options.baseColor
                ? options.baseColor
                : DEFAULT_JETPACK_PARTICLE_OPTIONS.baseColor.clone(),
            secondaryColor: options.secondaryColor
                ? options.secondaryColor
                : DEFAULT_JETPACK_PARTICLE_OPTIONS.secondaryColor.clone()
        };
    }
    
    /**
     * Initialize the jetpack particle effect
     * @param scene The Babylon.js scene
     * @param targetEntity The entity to attach particles to (usually the player)
     */
    public initialize(scene: BABYLON.Scene, targetEntity: IEntity): void {
        this.scene = scene;
        this.targetEntity = targetEntity;
        
        // Get the transform component
        this.transformComponent = targetEntity.getComponent<ITransformComponent>('transform') || null;
        
        // Create the particle system manager
        this.particleSystemManager = new ParticleSystemManager();
        
        // Initialize it with the scene
        if (scene) {
            this.particleSystemManager.initialize(scene);
        }
        
        // Create particle systems
        this.createParticleSystems();
        
        // Set initial state (off)
        this.setState(JetpackEffectState.OFF);
    }
    
    /**
     * Create all particle systems for the jetpack effect
     */
    private createParticleSystems(): void {
        if (!this.scene || !this.particleSystemManager) {
            return;
        }
        
        // Get entity position
        const entityPosition = this.transformComponent!.getPosition();
        const emitterPosition = entityPosition.add(this.options.positionOffset);
        
        // Create main thrust particles (using flame preset as base)
        this.mainThrustParticles = this.particleSystemManager.createParticleSystemFromPreset({
            preset: ParticlePresets.FLAME,
            emitter: emitterPosition,
            capacity: this.options.capacity,
            updatePositionWithEmitter: true,
            customizations: {
                minSize: this.options.particleSize * 0.8,
                maxSize: this.options.particleSize * 1.2,
                color1: this.options.baseColor,
                color2: this.options.secondaryColor,
                minEmitPower: this.options.minEmitPower,
                maxEmitPower: this.options.maxEmitPower,
                direction1: this.options.direction.scale(0.9),
                direction2: this.options.direction.scale(1.1),
                minLifeTime: this.options.minLifeTime,
                maxLifeTime: this.options.maxLifeTime,
                emitRate: 0  // Start with no emission (off state)
            }
        });
        
        // Create secondary particles (smoke effect)
        this.secondaryParticles = this.particleSystemManager.createParticleSystemFromPreset({
            preset: ParticlePresets.SMOKE,
            emitter: emitterPosition,
            capacity: Math.floor(this.options.capacity * 0.3),
            updatePositionWithEmitter: true,
            customizations: {
                minSize: this.options.particleSize * 0.5,
                maxSize: this.options.particleSize * 1.5,
                color1: new BABYLON.Color4(0.3, 0.3, 0.3, 0.2),
                color2: new BABYLON.Color4(0.5, 0.5, 0.5, 0),
                minEmitPower: this.options.minEmitPower * 0.5,
                maxEmitPower: this.options.maxEmitPower * 0.7,
                direction1: this.options.direction.scale(0.7),
                direction2: this.options.direction.scale(0.9),
                minLifeTime: this.options.minLifeTime * 2,
                maxLifeTime: this.options.maxLifeTime * 3,
                emitRate: 0  // Start with no emission (off state)
            }
        });
        
        // Create spark particles
        this.sparkParticles = this.particleSystemManager.createParticleSystemFromPreset({
            preset: ParticlePresets.SPARK,
            emitter: emitterPosition,
            capacity: Math.floor(this.options.capacity * 0.1),
            updatePositionWithEmitter: true,
            customizations: {
                minSize: this.options.particleSize * 0.1,
                maxSize: this.options.particleSize * 0.2,
                color1: new BABYLON.Color4(1, 0.9, 0.3, 1),
                color2: new BABYLON.Color4(1, 0.5, 0.1, 1),
                minEmitPower: this.options.minEmitPower * 2,
                maxEmitPower: this.options.maxEmitPower * 3,
                direction1: this.options.direction.scale(0.8),
                direction2: this.options.direction.scale(1.2),
                minLifeTime: this.options.minLifeTime * 0.5,
                maxLifeTime: this.options.maxLifeTime * 0.7,
                emitRate: 0  // Start with no emission (off state)
            }
        });
    }
    
    /**
     * Update the jetpack particle effect
     * @param deltaTime Time elapsed since last update
     * @param thrustLevel Normalized thrust level (0.0 - 1.0)
     * @param isActive Whether the jetpack is active
     */
    public update(deltaTime: number, thrustLevel: number, isActive: boolean): void {
        // Normalize thrust level
        thrustLevel = Math.max(0, Math.min(1, thrustLevel));
        
        // If not active, set to off regardless of thrust level
        if (!isActive) {
            this.setState(JetpackEffectState.OFF);
            return;
        }
        
        // Store last thrust level for interpolation
        this.lastThrustLevel = thrustLevel;
        
        // Determine state based on thrust level
        if (thrustLevel < 0.1) {
            this.setState(JetpackEffectState.IDLE);
        } else if (thrustLevel < 0.4) {
            this.setState(JetpackEffectState.LOW);
        } else if (thrustLevel < 0.7) {
            this.setState(JetpackEffectState.MEDIUM);
        } else if (thrustLevel < 0.9) {
            this.setState(JetpackEffectState.HIGH);
        } else {
            this.setState(JetpackEffectState.BOOST);
        }
        
        // Update emitter position to follow entity
        this.updateEmitterPosition();
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
            this.options.positionOffset, 
            rotationMatrix
        );
        
        // Calculate new emitter position
        const emitterPosition = entityPosition.add(transformedOffset);
        
        // Update all particle system emitters
        if (this.mainThrustParticles) {
            this.particleSystemManager.updateEmitterPosition(
                this.mainThrustParticles, 
                emitterPosition
            );
        }
        
        if (this.secondaryParticles) {
            this.particleSystemManager.updateEmitterPosition(
                this.secondaryParticles, 
                emitterPosition
            );
        }
        
        if (this.sparkParticles) {
            this.particleSystemManager.updateEmitterPosition(
                this.sparkParticles, 
                emitterPosition
            );
        }
    }
    
    /**
     * Set the jetpack effect state directly
     * @param state The desired effect state
     */
    public setState(state: JetpackEffectState): void {
        if (state === this.currentState) {
            return;
        }
        
        this.currentState = state;
        
        if (!this.particleSystemManager) {
            return;
        }
        
        // Configure particle systems based on state
        switch (state) {
            case JetpackEffectState.OFF:
                // Turn off all particle systems
                if (this.mainThrustParticles) {
                    this.particleSystemManager.updateEmitRate(this.mainThrustParticles, 0);
                }
                if (this.secondaryParticles) {
                    this.particleSystemManager.updateEmitRate(this.secondaryParticles, 0);
                }
                if (this.sparkParticles) {
                    this.particleSystemManager.updateEmitRate(this.sparkParticles, 0);
                }
                break;
                
            case JetpackEffectState.IDLE:
                // Minimal particles, just idle effect
                if (this.mainThrustParticles) {
                    this.particleSystemManager.updateEmitRate(
                        this.mainThrustParticles, 
                        this.options.emitRateFactor * 0.1
                    );
                }
                if (this.secondaryParticles) {
                    this.particleSystemManager.updateEmitRate(
                        this.secondaryParticles, 
                        this.options.emitRateFactor * 0.05
                    );
                }
                if (this.sparkParticles) {
                    this.particleSystemManager.updateEmitRate(this.sparkParticles, 0);
                }
                break;
                
            case JetpackEffectState.LOW:
                // Low thrust
                if (this.mainThrustParticles) {
                    this.particleSystemManager.updateEmitRate(
                        this.mainThrustParticles, 
                        this.options.emitRateFactor * 0.3
                    );
                }
                if (this.secondaryParticles) {
                    this.particleSystemManager.updateEmitRate(
                        this.secondaryParticles, 
                        this.options.emitRateFactor * 0.15
                    );
                }
                if (this.sparkParticles) {
                    this.particleSystemManager.updateEmitRate(
                        this.sparkParticles, 
                        this.options.emitRateFactor * 0.05
                    );
                }
                break;
                
            case JetpackEffectState.MEDIUM:
                // Medium thrust
                if (this.mainThrustParticles) {
                    this.particleSystemManager.updateEmitRate(
                        this.mainThrustParticles, 
                        this.options.emitRateFactor * 0.6
                    );
                }
                if (this.secondaryParticles) {
                    this.particleSystemManager.updateEmitRate(
                        this.secondaryParticles, 
                        this.options.emitRateFactor * 0.3
                    );
                }
                if (this.sparkParticles) {
                    this.particleSystemManager.updateEmitRate(
                        this.sparkParticles, 
                        this.options.emitRateFactor * 0.15
                    );
                }
                break;
                
            case JetpackEffectState.HIGH:
                // High thrust
                if (this.mainThrustParticles) {
                    this.particleSystemManager.updateEmitRate(
                        this.mainThrustParticles, 
                        this.options.emitRateFactor * 0.8
                    );
                }
                if (this.secondaryParticles) {
                    this.particleSystemManager.updateEmitRate(
                        this.secondaryParticles, 
                        this.options.emitRateFactor * 0.5
                    );
                }
                if (this.sparkParticles) {
                    this.particleSystemManager.updateEmitRate(
                        this.sparkParticles, 
                        this.options.emitRateFactor * 0.3
                    );
                }
                break;
                
            case JetpackEffectState.BOOST:
                // Maximum thrust
                if (this.mainThrustParticles) {
                    this.particleSystemManager.updateEmitRate(
                        this.mainThrustParticles, 
                        this.options.emitRateFactor
                    );
                }
                if (this.secondaryParticles) {
                    this.particleSystemManager.updateEmitRate(
                        this.secondaryParticles, 
                        this.options.emitRateFactor * 0.7
                    );
                }
                if (this.sparkParticles) {
                    this.particleSystemManager.updateEmitRate(
                        this.sparkParticles, 
                        this.options.emitRateFactor * 0.5
                    );
                }
                break;
        }
    }
    
    /**
     * Set visibility of the effect
     * @param visible Whether the effect should be visible
     */
    public setVisible(visible: boolean): void {
        this.isVisible = visible;
        
        if (!this.particleSystemManager) {
            return;
        }
        
        // If not visible, turn off particles but maintain state
        if (!visible) {
            if (this.mainThrustParticles) {
                this.particleSystemManager.setSystemVisible(this.mainThrustParticles, false);
            }
            if (this.secondaryParticles) {
                this.particleSystemManager.setSystemVisible(this.secondaryParticles, false);
            }
            if (this.sparkParticles) {
                this.particleSystemManager.setSystemVisible(this.sparkParticles, false);
            }
        } else {
            // Restore visibility based on current state
            if (this.mainThrustParticles) {
                this.particleSystemManager.setSystemVisible(this.mainThrustParticles, true);
            }
            if (this.secondaryParticles) {
                this.particleSystemManager.setSystemVisible(this.secondaryParticles, true);
            }
            if (this.sparkParticles) {
                this.particleSystemManager.setSystemVisible(this.sparkParticles, true);
            }
        }
    }
    
    /**
     * Set the position offset relative to the entity
     * @param offset The position offset
     */
    public setPositionOffset(offset: BABYLON.Vector3): void {
        this.options.positionOffset = offset.clone();
        this.updateEmitterPosition();
    }
    
    /**
     * Dispose resources used by the effect
     */
    public dispose(): void {
        if (this.particleSystemManager) {
            if (this.mainThrustParticles) {
                this.particleSystemManager.removeParticleSystem(this.mainThrustParticles);
                this.mainThrustParticles = null;
            }
            
            if (this.secondaryParticles) {
                this.particleSystemManager.removeParticleSystem(this.secondaryParticles);
                this.secondaryParticles = null;
            }
            
            if (this.sparkParticles) {
                this.particleSystemManager.removeParticleSystem(this.sparkParticles);
                this.sparkParticles = null;
            }
            
            this.particleSystemManager.dispose();
            this.particleSystemManager = null;
        }
        
        this.scene = null;
        this.targetEntity = null;
        this.transformComponent = null;
    }
} 