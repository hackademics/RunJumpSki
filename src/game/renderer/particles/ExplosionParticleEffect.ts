/**
 * @file src/game/renderer/particles/ExplosionParticleEffect.ts
 * @description Explosion particle effects for weapons and impacts
 */

import * as BABYLON from 'babylonjs';

// Core engine imports
import { ParticleSystemManager } from '../../../core/renderer/particles/ParticleSystemManager';
import { IParticleSystemManager, ParticleSystemFromPresetOptions } from '../../../core/renderer/particles/IParticleSystemManager';
import { ParticlePresets } from '../../../core/renderer/particles/ParticlePresets';

/**
 * Configuration options for explosion particle effects
 */
export interface ExplosionParticleOptions {
    /** Position of the explosion */
    position: BABYLON.Vector3;
    /** Size scale of the explosion (1.0 = normal size) */
    sizeScale: number;
    /** Intensity of the explosion (affects particle count and lifetime) */
    intensity: number;
    /** Base color for explosion core */
    coreColor: BABYLON.Color4;
    /** Secondary color for explosion outer area */
    outerColor: BABYLON.Color4;
    /** Whether to include ground impact effect */
    includeGroundImpact: boolean;
    /** Whether to include smoke trail */
    includeSmokeTrail: boolean;
    /** Duration of the explosion effect in seconds */
    duration: number;
    /** Optional sound effect identifier to play */
    soundEffect?: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_EXPLOSION_PARTICLE_OPTIONS: ExplosionParticleOptions = {
    position: new BABYLON.Vector3(0, 0, 0),
    sizeScale: 1.0,
    intensity: 1.0,
    coreColor: new BABYLON.Color4(1.0, 0.7, 0.1, 1.0),      // Orange
    outerColor: new BABYLON.Color4(1.0, 0.3, 0.0, 0.0),     // Red fade
    includeGroundImpact: true,
    includeSmokeTrail: true,
    duration: 2.0
};

/**
 * Explosion types
 */
export enum ExplosionType {
    SMALL = 'small',
    MEDIUM = 'medium',
    LARGE = 'large',
    SPINFUSOR = 'spinfusor',
    GRENADE = 'grenade'
}

/**
 * Interface for ExplosionParticleEffect
 */
export interface IExplosionParticleEffect {
    /**
     * Create an explosion effect
     * @param scene The Babylon.js scene
     * @param type The type of explosion
     * @param options Configuration options for the explosion
     * @returns The explosion effect instance
     */
    createExplosion(scene: BABYLON.Scene, type: ExplosionType, options?: Partial<ExplosionParticleOptions>): void;
    
    /**
     * Create a custom explosion effect
     * @param scene The Babylon.js scene
     * @param options Configuration options for the explosion
     * @returns The explosion effect instance
     */
    createCustomExplosion(scene: BABYLON.Scene, options: ExplosionParticleOptions): void;
    
    /**
     * Dispose resources used by all active explosion effects
     */
    dispose(): void;
}

/**
 * Explosion particle effects for weapons and impacts
 */
export class ExplosionParticleEffect implements IExplosionParticleEffect {
    private scene: BABYLON.Scene | null = null;
    private particleSystemManager: IParticleSystemManager | null = null;
    
    // Track active explosion effects for cleanup
    private activeExplosions: Map<string, {
        systems: string[],
        timerId: number | null,
        creationTime: number
    }> = new Map();
    
    /**
     * Create a new ExplosionParticleEffect
     */
    constructor() {
        // Empty constructor
    }
    
    /**
     * Get type-specific options based on explosion type
     * @param type The explosion type
     * @returns Default options for the specified explosion type
     */
    private getTypeOptions(type: ExplosionType): Partial<ExplosionParticleOptions> {
        switch (type) {
            case ExplosionType.SMALL:
                return {
                    sizeScale: 0.6,
                    intensity: 0.6,
                    duration: 1.0
                };
            
            case ExplosionType.MEDIUM:
                return {
                    sizeScale: 1.0,
                    intensity: 1.0,
                    duration: 1.5
                };
            
            case ExplosionType.LARGE:
                return {
                    sizeScale: 1.5,
                    intensity: 1.3,
                    duration: 2.0
                };
            
            case ExplosionType.SPINFUSOR:
                return {
                    sizeScale: 1.2,
                    intensity: 1.1,
                    coreColor: new BABYLON.Color4(0.2, 0.6, 1.0, 1.0),   // Blue
                    outerColor: new BABYLON.Color4(0.5, 0.8, 1.0, 0.0),  // Light blue fade
                    duration: 1.8
                };
            
            case ExplosionType.GRENADE:
                return {
                    sizeScale: 1.0,
                    intensity: 1.2,
                    coreColor: new BABYLON.Color4(0.8, 0.8, 0.2, 1.0),   // Yellow
                    outerColor: new BABYLON.Color4(1.0, 0.5, 0.1, 0.0),  // Orange fade
                    duration: 2.0
                };
            
            default:
                return {};
        }
    }
    
    /**
     * Create an explosion effect
     * @param scene The Babylon.js scene
     * @param type The type of explosion
     * @param options Configuration options for the explosion
     */
    public createExplosion(scene: BABYLON.Scene, type: ExplosionType, options: Partial<ExplosionParticleOptions> = {}): void {
        // Merge type-specific options with default options and provided options
        const mergedOptions: ExplosionParticleOptions = {
            ...DEFAULT_EXPLOSION_PARTICLE_OPTIONS,
            ...this.getTypeOptions(type),
            ...options,
            position: options.position 
                ? options.position.clone() 
                : DEFAULT_EXPLOSION_PARTICLE_OPTIONS.position.clone(),
            coreColor: options.coreColor || this.getTypeOptions(type).coreColor || DEFAULT_EXPLOSION_PARTICLE_OPTIONS.coreColor.clone(),
            outerColor: options.outerColor || this.getTypeOptions(type).outerColor || DEFAULT_EXPLOSION_PARTICLE_OPTIONS.outerColor.clone()
        };
        
        // Create explosion with merged options
        this.createCustomExplosion(scene, mergedOptions);
    }
    
    /**
     * Create a custom explosion effect
     * @param scene The Babylon.js scene
     * @param options Configuration options for the explosion
     */
    public createCustomExplosion(scene: BABYLON.Scene, options: ExplosionParticleOptions): void {
        this.scene = scene;
        
        // Create particle system manager
        this.particleSystemManager = new ParticleSystemManager();
        
        // Initialize it with the scene
        if (scene) {
            this.particleSystemManager.initialize(scene);
        }
        
        // Create unique ID for this explosion
        const explosionId = `explosion-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // Track systems for this explosion
        const systems: string[] = [];
        
        // Create core explosion particles
        const coreParticlesId = this.createCoreExplosion(options, explosionId);
        if (coreParticlesId) {
            systems.push(coreParticlesId);
        }
        
        // Create shockwave particles
        const shockwaveParticlesId = this.createShockwave(options, explosionId);
        if (shockwaveParticlesId) {
            systems.push(shockwaveParticlesId);
        }
        
        // Create debris particles
        const debrisParticlesId = this.createDebris(options, explosionId);
        if (debrisParticlesId) {
            systems.push(debrisParticlesId);
        }
        
        // Create smoke trail if requested
        if (options.includeSmokeTrail) {
            const smokeParticlesId = this.createSmokeTrail(options, explosionId);
            if (smokeParticlesId) {
                systems.push(smokeParticlesId);
            }
        }
        
        // Create ground impact if requested
        if (options.includeGroundImpact) {
            const groundImpactParticlesId = this.createGroundImpact(options, explosionId);
            if (groundImpactParticlesId) {
                systems.push(groundImpactParticlesId);
            }
        }
        
        // Create sparkle particles
        const sparkleParticlesId = this.createSparkles(options, explosionId);
        if (sparkleParticlesId) {
            systems.push(sparkleParticlesId);
        }
        
        // Set up cleanup timer
        const timerId = window.setTimeout(() => {
            this.cleanupExplosion(explosionId);
        }, options.duration * 1000);
        
        // Store explosion data
        this.activeExplosions.set(explosionId, {
            systems,
            timerId,
            creationTime: Date.now()
        });
    }
    
    /**
     * Create core explosion particles
     * @param options Explosion options
     * @param explosionId Unique ID for the explosion
     * @returns The particle system ID
     */
    private createCoreExplosion(options: ExplosionParticleOptions, explosionId: string): string | null {
        if (!this.particleSystemManager) {
            return null;
        }
        
        // Calculate particle count based on intensity and size
        const particleCount = Math.floor(300 * options.intensity * options.sizeScale);
        
        // Create core explosion particles
        return this.particleSystemManager.createParticleSystemFromPreset({
            preset: 'EXPLOSION',
            emitter: options.position,
            capacity: particleCount,
            updatePositionWithEmitter: false,
            customizations: {
                particleTexture: 'explosion',
                minSize: 1.0 * options.sizeScale,
                maxSize: 5.0 * options.sizeScale,
                color1: options.coreColor,
                color2: options.outerColor,
                minEmitPower: 1 * options.intensity,
                maxEmitPower: 3 * options.intensity,
                minLifeTime: 0.2,
                maxLifeTime: 0.8 * options.duration,
                emitRate: 0,
                minEmitBox: new BABYLON.Vector3(-0.1, -0.1, -0.1).scale(options.sizeScale),
                maxEmitBox: new BABYLON.Vector3(0.1, 0.1, 0.1).scale(options.sizeScale),
                direction1: new BABYLON.Vector3(-1, -1, -1),
                direction2: new BABYLON.Vector3(1, 1, 1),
                minAngularSpeed: 0,
                maxAngularSpeed: Math.PI * 2,
                blendMode: BABYLON.ParticleSystem.BLENDMODE_ADD,
                gravity: new BABYLON.Vector3(0, -0.5, 0),
                startSpriteCellID: 0,
                endSpriteCellID: 0,
                spriteCellWidth: 0,
                spriteCellHeight: 0,
                minScaleX: 1.0,
                maxScaleX: 1.0,
                minScaleY: 1.0,
                maxScaleY: 1.0
            }
        });
    }
    
    /**
     * Create shockwave particles
     * @param options Explosion options
     * @param explosionId Unique ID for the explosion
     * @returns The particle system ID
     */
    private createShockwave(options: ExplosionParticleOptions, explosionId: string): string | null {
        if (!this.particleSystemManager) {
            return null;
        }
        
        // Create horizontal shockwave particles
        return this.particleSystemManager.createParticleSystemFromPreset({
            preset: 'SHOCKWAVE',
            emitter: options.position,
            capacity: 20,
            updatePositionWithEmitter: false,
            customizations: {
                particleTexture: 'explosion',
                minSize: 0.1 * options.sizeScale,
                maxSize: 8.0 * options.sizeScale, 
                color1: new BABYLON.Color4(0.8, 0.8, 0.8, 0.1),
                color2: new BABYLON.Color4(0.6, 0.6, 0.6, 0),
                minEmitPower: 0,
                maxEmitPower: 0,
                minLifeTime: 0.2,
                maxLifeTime: 0.6 * options.duration,
                emitRate: 0,
                minEmitBox: new BABYLON.Vector3(0, 0, 0),
                maxEmitBox: new BABYLON.Vector3(0, 0, 0),
                direction1: new BABYLON.Vector3(0, 0, 0),
                direction2: new BABYLON.Vector3(0, 0, 0),
                minAngularSpeed: 0,
                maxAngularSpeed: 0,
                blendMode: BABYLON.ParticleSystem.BLENDMODE_STANDARD,
                gravity: new BABYLON.Vector3(0, 0, 0)
            }
        });
    }
    
    /**
     * Create debris particles
     * @param options Explosion options
     * @param explosionId Unique ID for the explosion
     * @returns The particle system ID
     */
    private createDebris(options: ExplosionParticleOptions, explosionId: string): string | null {
        if (!this.particleSystemManager) {
            return null;
        }
        
        // Calculate particle count based on intensity
        const particleCount = Math.floor(50 * options.intensity * options.sizeScale);
        
        // Create debris particles
        return this.particleSystemManager.createParticleSystemFromPreset({
            preset: 'DEBRIS',
            emitter: options.position,
            capacity: particleCount,
            updatePositionWithEmitter: false,
            customizations: {
                particleTexture: 'debris',
                minSize: 0.05 * options.sizeScale,
                maxSize: 0.3 * options.sizeScale,
                color1: new BABYLON.Color4(0.7, 0.7, 0.7, 1.0),
                color2: new BABYLON.Color4(0.4, 0.4, 0.4, 0.6),
                minEmitPower: 4 * options.intensity,
                maxEmitPower: 8 * options.intensity,
                minLifeTime: 0.8,
                maxLifeTime: 1.5 * options.duration,
                emitRate: 0,
                minEmitBox: new BABYLON.Vector3(-0.1, -0.1, -0.1).scale(options.sizeScale),
                maxEmitBox: new BABYLON.Vector3(0.1, 0.1, 0.1).scale(options.sizeScale),
                direction1: new BABYLON.Vector3(-1, 0.5, -1),
                direction2: new BABYLON.Vector3(1, 2, 1),
                minAngularSpeed: Math.PI,
                maxAngularSpeed: Math.PI * 4,
                blendMode: BABYLON.ParticleSystem.BLENDMODE_STANDARD,
                gravity: new BABYLON.Vector3(0, -9.8, 0)
            }
        });
    }
    
    /**
     * Create smoke trail particles
     * @param options Explosion options
     * @param explosionId Unique ID for the explosion
     * @returns The particle system ID
     */
    private createSmokeTrail(options: ExplosionParticleOptions, explosionId: string): string | null {
        if (!this.particleSystemManager) {
            return null;
        }
        
        // Create smoke particles
        return this.particleSystemManager.createParticleSystemFromPreset({
            preset: 'SMOKE',
            emitter: options.position,
            capacity: Math.floor(100 * options.sizeScale),
            updatePositionWithEmitter: false,
            customizations: {
                particleTexture: 'smoke',
                minSize: 0.5 * options.sizeScale,
                maxSize: 2.0 * options.sizeScale,
                color1: new BABYLON.Color4(0.2, 0.2, 0.2, 0.4),
                color2: new BABYLON.Color4(0.4, 0.4, 0.4, 0),
                minEmitPower: 0.5,
                maxEmitPower: 1.5,
                minLifeTime: 0.8 * options.duration,
                maxLifeTime: 2.0 * options.duration,
                emitRate: 0,
                minEmitBox: new BABYLON.Vector3(-0.2, -0.2, -0.2).scale(options.sizeScale),
                maxEmitBox: new BABYLON.Vector3(0.2, 0.2, 0.2).scale(options.sizeScale),
                direction1: new BABYLON.Vector3(-0.5, 0.5, -0.5),
                direction2: new BABYLON.Vector3(0.5, 1.5, 0.5),
                minAngularSpeed: 0,
                maxAngularSpeed: Math.PI / 4,
                blendMode: BABYLON.ParticleSystem.BLENDMODE_STANDARD,
                gravity: new BABYLON.Vector3(0, 0.05, 0)
            }
        });
    }
    
    /**
     * Create ground impact particles
     * @param options Explosion options
     * @param explosionId Unique ID for the explosion
     * @returns The particle system ID
     */
    private createGroundImpact(options: ExplosionParticleOptions, explosionId: string): string | null {
        if (!this.particleSystemManager || !this.scene) {
            return null;
        }
        
        // Check if explosion is near ground (basic check)
        // In a real implementation, you would use a ray cast to detect ground
        if (options.position.y > 1.0) {
            return null; // Not near ground
        }
        
        // Adjust position to be at ground level
        const groundPosition = options.position.clone();
        groundPosition.y = 0.05; // Slightly above ground
        
        // Create ground impact particles
        return this.particleSystemManager.createParticleSystemFromPreset({
            preset: 'IMPACT',
            emitter: groundPosition,
            capacity: Math.floor(80 * options.sizeScale),
            updatePositionWithEmitter: false,
            customizations: {
                particleTexture: 'dust',
                minSize: 0.5 * options.sizeScale,
                maxSize: 3.0 * options.sizeScale,
                color1: new BABYLON.Color4(0.5, 0.5, 0.5, 0.8),
                color2: new BABYLON.Color4(0.4, 0.4, 0.4, 0),
                minEmitPower: 1.5 * options.intensity,
                maxEmitPower: 3.0 * options.intensity,
                minLifeTime: 0.5,
                maxLifeTime: 1.2 * options.duration,
                emitRate: 0,
                minEmitBox: new BABYLON.Vector3(-0.1, 0, -0.1).scale(options.sizeScale),
                maxEmitBox: new BABYLON.Vector3(0.1, 0, 0.1).scale(options.sizeScale),
                direction1: new BABYLON.Vector3(-0.5, 0.5, -0.5),
                direction2: new BABYLON.Vector3(0.5, 1, 0.5),
                minAngularSpeed: 0,
                maxAngularSpeed: Math.PI / 2,
                blendMode: BABYLON.ParticleSystem.BLENDMODE_STANDARD,
                gravity: new BABYLON.Vector3(0, -0.1, 0)
            }
        });
    }
    
    /**
     * Create sparkle particles
     * @param options Explosion options
     * @param explosionId Unique ID for the explosion
     * @returns The particle system ID
     */
    private createSparkles(options: ExplosionParticleOptions, explosionId: string): string | null {
        if (!this.particleSystemManager) {
            return null;
        }
        
        // Calculate particle count based on intensity
        const particleCount = Math.floor(50 * options.intensity * options.sizeScale);
        
        // Create sparkle particles
        return this.particleSystemManager.createParticleSystemFromPreset({
            preset: 'SPARK',
            emitter: options.position,
            capacity: particleCount,
            updatePositionWithEmitter: false,
            customizations: {
                particleTexture: 'spark',
                minSize: 0.05 * options.sizeScale,
                maxSize: 0.15 * options.sizeScale,
                color1: options.coreColor.clone(),
                color2: new BABYLON.Color4(1, 1, 1, 0),
                minEmitPower: 3 * options.intensity,
                maxEmitPower: 8 * options.intensity,
                minLifeTime: 0.2,
                maxLifeTime: 0.6 * options.duration,
                emitRate: 0,
                minEmitBox: new BABYLON.Vector3(-0.1, -0.1, -0.1).scale(options.sizeScale),
                maxEmitBox: new BABYLON.Vector3(0.1, 0.1, 0.1).scale(options.sizeScale),
                direction1: new BABYLON.Vector3(-1, -1, -1),
                direction2: new BABYLON.Vector3(1, 1, 1),
                minAngularSpeed: 0,
                maxAngularSpeed: 0,
                blendMode: BABYLON.ParticleSystem.BLENDMODE_ADD,
                gravity: new BABYLON.Vector3(0, -2, 0)
            }
        });
    }
    
    /**
     * Clean up a specific explosion
     * @param explosionId The explosion ID to clean up
     */
    private cleanupExplosion(explosionId: string): void {
        const explosion = this.activeExplosions.get(explosionId);
        if (!explosion || !this.particleSystemManager) {
            return;
        }
        
        // Clear timer if it exists
        if (explosion.timerId !== null) {
            clearTimeout(explosion.timerId);
        }
        
        // Remove all particle systems for this explosion
        explosion.systems.forEach(systemId => {
            this.particleSystemManager?.removeParticleSystem(systemId);
        });
        
        // Remove from tracking
        this.activeExplosions.delete(explosionId);
    }
    
    /**
     * Dispose resources used by all active explosion effects
     */
    public dispose(): void {
        // Clear all timers
        this.activeExplosions.forEach(explosion => {
            if (explosion.timerId !== null) {
                clearTimeout(explosion.timerId);
            }
        });
        
        // Dispose particle system manager
        if (this.particleSystemManager) {
            this.particleSystemManager.dispose();
            this.particleSystemManager = null;
        }
        
        // Clear tracking
        this.activeExplosions.clear();
        
        this.scene = null;
    }
} 