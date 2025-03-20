/**
 * @file src/core/renderer/particles/PooledParticleSystemManager.ts
 * @description Pooled particle system manager that reuses particle system objects
 */

import * as BABYLON from 'babylonjs';
import { 
  IParticleSystemManager, 
  ParticleEffectType,
  ParticleEffectOptions,
  ExplosionEffectOptions,
  JetpackEffectOptions,
  SkiTrailEffectOptions,
  ProjectileTrailEffectOptions,
  ExtendedParticleEffectOptions,
  ParticleSystemFromPresetOptions
} from './IParticleSystemManager';
import { ObjectPool, IPoolable, IPoolObjectFactory } from '../../utils/ObjectPool';

/**
 * Extended particle system with sprite sheet properties
 */
interface SpriteSheetParticleSystem extends BABYLON.IParticleSystem {
  /** Width of a sprite cell */
  cellWidth?: number;
  /** Height of a sprite cell */
  cellHeight?: number;
}

// Define the configuration type for particle effects
type ParticleEffectConfig = ExtendedParticleEffectOptions & {
  // Additional properties specific to our implementation
  duration?: number;
  capacity?: number;
  textureName?: string;
  lifetime?: number;
  // Callback when effect completes
  onCompleted?: (id: string) => void;
  // Flag to use GPU particles when possible
  useGPU?: boolean;
  // Animation sheet properties
  isAnimationSheetEnabled?: boolean;
  spriteRandomStartCell?: boolean;
  spriteCellWidth?: number;
  spriteCellHeight?: number;
  startSpriteCellID?: number;
  endSpriteCellID?: number;
  spriteCellChangeSpeed?: number;
  updateSpeed?: number;
  targetStopDuration?: number;
  billboardMode?: number;
  manualEmitCount?: number;
  renderingGroupId?: number;
};

/**
 * Internal class for poolable particle system
 */
class PoolableParticleSystem implements IPoolable {
  /** The Babylon.js particle system */
  public particleSystem?: BABYLON.ParticleSystem | BABYLON.GPUParticleSystem;
  /** Configuration for this particle effect */
  public config?: ParticleEffectConfig;
  /** ID of this effect */
  public id: string = '';
  /** Scene reference */
  public scene?: BABYLON.Scene;
  /** Name of the effect */
  public effectName: string = '';
  /** Whether this effect is active */
  public isActive: boolean = false;
  /** Whether the effect should loop */
  public isLooping: boolean = false;
  /** Whether the effect should be disposed after completion */
  public autoDispose: boolean = false;
  /** The emitter object for this particle system */
  public emitter?: BABYLON.AbstractMesh | BABYLON.Vector3;
  /** Type of particle effect */
  public effectType?: ParticleEffectType;
  
  /**
   * Resets the particle system for reuse
   */
  public reset(): void {
    // Stop and dispose the particle system
    if (this.particleSystem) {
      this.particleSystem.stop();
      this.particleSystem.dispose();
      this.particleSystem = undefined;
    }
    
    // Reset properties
    this.id = '';
    this.effectName = '';
    this.config = undefined;
    this.isActive = false;
    this.isLooping = false;
    this.autoDispose = false;
    this.emitter = undefined;
    this.effectType = undefined;
  }
  
  /**
   * Initialize with new values
   */
  public initialize(
    id: string,
    effectName: string,
    emitter: BABYLON.AbstractMesh | BABYLON.Vector3,
    scene: BABYLON.Scene,
    config: ParticleEffectConfig,
    effectType: ParticleEffectType,
    isLooping: boolean = false,
    autoDispose: boolean = true
  ): void {
    this.id = id;
    this.effectName = effectName;
    this.emitter = emitter;
    this.scene = scene;
    this.config = config;
    this.isLooping = isLooping;
    this.autoDispose = autoDispose;
    this.effectType = effectType;
    
    // Create the particle system
    this.createParticleSystem();
  }
  
  /**
   * Creates the particle system based on configuration
   */
  private createParticleSystem(): void {
    if (!this.scene || !this.config) return;
    
    // Create the particle system
    this.particleSystem = new BABYLON.ParticleSystem(
      `particle_system_${this.id}`,
      this.config.capacity || 1000,
      this.scene
    );
    
    // Set the emitter
    this.particleSystem.emitter = this.emitter || null;
    
    // Apply configuration
    this.applyConfiguration();
    
    // Set whether it should loop
    // Ensure the duration is a number or default to 0 if looping, a default value if not
    const duration = this.isLooping ? 0 : (this.config.duration !== undefined ? this.config.duration : 5);
    this.particleSystem.targetStopDuration = duration;
    
    // If not looping and auto-dispose is set, register an observer for when particles end
    if (!this.isLooping && this.autoDispose) {
      this.particleSystem.onStoppedObservable.add(() => {
        if (this.isActive) {
          this.isActive = false;
          // Wait for all particles to be gone before disposing
          // Ensure lifetime is a number or default to a reasonable value
          const lifetime = this.config && this.config.lifetime !== undefined ? this.config.lifetime : 1000;
          
          // Use type assertion to avoid "possibly undefined" errors
          // We know config exists here since we're in the particle system context
          const config = this.config as ParticleEffectConfig;
          setTimeout(() => {
            if (config.onCompleted) {
              config.onCompleted(this.id);
            }
          }, lifetime);
        }
      });
    }
  }
  
  /**
   * Apply configuration to the particle system
   */
  private applyConfiguration(): void {
    if (!this.particleSystem || !this.config || !this.scene) return;
    
    const ps = this.particleSystem;
    const config = this.config;
    
    // Basic setup
    ps.name = `${this.effectName}_${this.id}`;
    ps.renderingGroupId = config.renderingGroupId || 0;
    
    // Particles count and lifetime
    ps.minEmitBox = config.minEmitBox ? new BABYLON.Vector3(
      config.minEmitBox.x,
      config.minEmitBox.y,
      config.minEmitBox.z
    ) : new BABYLON.Vector3(-0.1, -0.1, -0.1);
    
    ps.maxEmitBox = config.maxEmitBox ? new BABYLON.Vector3(
      config.maxEmitBox.x,
      config.maxEmitBox.y,
      config.maxEmitBox.z
    ) : new BABYLON.Vector3(0.1, 0.1, 0.1);
    
    // Emission rate
    ps.emitRate = config.emitRate || 100;
    if (config.manualEmitCount !== undefined && typeof ps.manualEmitCount === 'number') {
      ps.manualEmitCount = config.manualEmitCount;
    }
    
    // Particle lifetime
    ps.minLifeTime = config.minLifeTime || 0.5;
    ps.maxLifeTime = config.maxLifeTime || 2.0;
    
    // Particle size
    ps.minSize = config.minSize || 0.1;
    ps.maxSize = config.maxSize || 0.5;
    
    // Particle color
    if (config.color1) ps.color1 = new BABYLON.Color4(
      config.color1.r, config.color1.g, config.color1.b, config.color1.a
    );
    if (config.color2) ps.color2 = new BABYLON.Color4(
      config.color2.r, config.color2.g, config.color2.b, config.color2.a
    );
    if (config.colorDead) ps.colorDead = new BABYLON.Color4(
      config.colorDead.r, config.colorDead.g, config.colorDead.b, config.colorDead.a
    );
    
    // Direction and velocity
    ps.direction1 = config.direction1 ? new BABYLON.Vector3(
      config.direction1.x, config.direction1.y, config.direction1.z
    ) : new BABYLON.Vector3(-1, 1, -1);
    
    ps.direction2 = config.direction2 ? new BABYLON.Vector3(
      config.direction2.x, config.direction2.y, config.direction2.z
    ) : new BABYLON.Vector3(1, 1, 1);
    
    ps.minEmitPower = config.minEmitPower || 1;
    ps.maxEmitPower = config.maxEmitPower || 3;
    
    // Blending mode
    ps.blendMode = config.blendMode || BABYLON.ParticleSystem.BLENDMODE_STANDARD;
    
    // Gravity
    if (config.gravity) {
      ps.gravity = new BABYLON.Vector3(
        config.gravity.x, config.gravity.y, config.gravity.z
      );
    }
    
    // Rotation
    ps.minAngularSpeed = config.minAngularSpeed || 0;
    ps.maxAngularSpeed = config.maxAngularSpeed || Math.PI;
    
    // Texture
    if (config.textureName && this.scene) {
      ps.particleTexture = new BABYLON.Texture(config.textureName, this.scene);
    }
    
    // Additional configuration options
    if (config.updateSpeed !== undefined) ps.updateSpeed = config.updateSpeed;
    
    // Safely handle targetStopDuration
    if (config.targetStopDuration !== undefined) {
      ps.targetStopDuration = config.targetStopDuration;
    }
    
    if (config.billboardMode !== undefined) ps.billboardMode = config.billboardMode;
    
    // Advanced effects
    if (config.isAnimationSheetEnabled !== undefined) {
      ps.isAnimationSheetEnabled = config.isAnimationSheetEnabled;
      if (config.spriteRandomStartCell !== undefined) {
        ps.spriteRandomStartCell = config.spriteRandomStartCell;
      }
      if (config.spriteCellWidth !== undefined && config.spriteCellHeight !== undefined) {
        // Handle sprite cell dimensions using BabylonJS API
        if ('cellWidth' in ps) {
          (ps as SpriteSheetParticleSystem).cellWidth = config.spriteCellWidth;
          (ps as SpriteSheetParticleSystem).cellHeight = config.spriteCellHeight;
        }
      }
      if (config.startSpriteCellID !== undefined) ps.startSpriteCellID = config.startSpriteCellID;
      if (config.endSpriteCellID !== undefined) ps.endSpriteCellID = config.endSpriteCellID;
      if (config.spriteCellChangeSpeed !== undefined) ps.spriteCellChangeSpeed = config.spriteCellChangeSpeed;
    }
    
    // GPU particles if supported
    if (config.useGPU && BABYLON.GPUParticleSystem.IsSupported && this.scene) {
      // The existing PS cannot be converted to GPU, so create a new one
      const gpuPS = new BABYLON.GPUParticleSystem(
        ps.name,
        { capacity: ps.getCapacity() },
        this.scene
      );
      
      // Copy properties from the standard PS
      gpuPS.emitter = ps.emitter;
      gpuPS.minEmitBox = ps.minEmitBox;
      gpuPS.maxEmitBox = ps.maxEmitBox;
      gpuPS.color1 = ps.color1;
      gpuPS.color2 = ps.color2;
      gpuPS.colorDead = ps.colorDead;
      gpuPS.minSize = ps.minSize;
      gpuPS.maxSize = ps.maxSize;
      gpuPS.minLifeTime = ps.minLifeTime;
      gpuPS.maxLifeTime = ps.maxLifeTime;
      gpuPS.emitRate = ps.emitRate;
      gpuPS.minEmitPower = ps.minEmitPower;
      gpuPS.maxEmitPower = ps.maxEmitPower;
      gpuPS.direction1 = ps.direction1;
      gpuPS.direction2 = ps.direction2;
      gpuPS.gravity = ps.gravity;
      gpuPS.blendMode = ps.blendMode;
      gpuPS.renderingGroupId = ps.renderingGroupId;
      gpuPS.targetStopDuration = ps.targetStopDuration;
      gpuPS.particleTexture = ps.particleTexture;
      
      // Dispose old system and replace with GPU version
      ps.dispose();
      this.particleSystem = gpuPS;
    }
  }
  
  /**
   * Start the particle effect
   */
  public start(): boolean {
    if (!this.particleSystem) return false;
    
    this.isActive = true;
    this.particleSystem.start();
    return true;
  }
  
  /**
   * Stop the particle effect
   */
  public stop(immediate: boolean = false): boolean {
    if (!this.particleSystem) return false;
    
    this.isActive = false;
    if (immediate) {
      this.particleSystem.reset();
    } else {
      this.particleSystem.stop();
    }
    return true;
  }
  
  /**
   * Restart the particle effect
   */
  public restart(): boolean {
    if (!this.particleSystem) return false;
    
    this.particleSystem.reset();
    return this.start();
  }
  
  /**
   * Update the position of the emitter
   */
  public updatePosition(position: BABYLON.Vector3): boolean {
    if (!this.emitter) return false;
    
    if (this.emitter instanceof BABYLON.AbstractMesh) {
      this.emitter.position = position.clone();
    } else if (this.emitter instanceof BABYLON.Vector3) {
      this.emitter.copyFrom(position);
    }
    return true;
  }
  
  /**
   * Get the particle system
   */
  public getParticleSystem(): BABYLON.IParticleSystem | null {
    return this.particleSystem || null;
  }
}

/**
 * Factory for creating poolable particle systems
 */
class ParticleSystemFactory implements IPoolObjectFactory<PoolableParticleSystem> {
  create(): PoolableParticleSystem {
    return new PoolableParticleSystem();
  }
}

/**
 * Manager for pooled particle systems
 */
export class PooledParticleSystemManager implements IParticleSystemManager {
  /** Scene reference */
  private scene: BABYLON.Scene | null = null;
  
  /** Pool of particle systems */
  private particleSystemPool: ObjectPool<PoolableParticleSystem>;
  
  /** Map of active particle systems by ID */
  private activeEffects: Map<string, PoolableParticleSystem> = new Map();
  
  /** Map of registered effect configurations by name */
  private effectTemplates: Map<string, ParticleEffectConfig> = new Map();
  
  /** Counter for generating unique IDs */
  private nextId: number = 0;
  
  /**
   * Constructor for the pooled particle system manager
   * @param scene Scene to use for particle systems
   * @param initialPoolSize Initial size of the particle system pool
   * @param maxPoolSize Maximum size of the pool (0 for unlimited)
   */
  constructor(initialPoolSize: number = 20, maxPoolSize: number = 100) {
    // Create the particle system pool
    this.particleSystemPool = new ObjectPool<PoolableParticleSystem>(
      new ParticleSystemFactory(),
      initialPoolSize,
      maxPoolSize
    );
  }
  
  /**
   * Initialize the particle system manager
   */
  public initialize(scene: BABYLON.Scene): void {
    this.scene = scene;
  }
  
  /**
   * Register a particle effect configuration
   * @param name Name of the effect
   * @param config Configuration for the effect
   */
  public registerEffect(name: string, config: ParticleEffectConfig): void {
    this.effectTemplates.set(name, config);
  }
  
  /**
   * Create a particle system effect
   * @param type Type of particle effect to create
   * @param emitter Mesh or position to emit from
   * @param options Effect options
   * @returns ID of the created effect or null if failed
   */
  public createEffect(
    type: ParticleEffectType,
    emitter: BABYLON.AbstractMesh | BABYLON.Vector3,
    options?: ParticleEffectOptions
  ): string | null {
    if (!this.scene) {
      console.error("PooledParticleSystemManager: Not initialized");
      return null;
    }
    
    // Create a unique ID for this effect
    const id = `effect_${this.nextId++}`;
    
    // Convert options to our internal config format
    const config: ParticleEffectConfig = {
      ...options,
      // Default values can be added here
    };
    
    // Get a particle system from the pool
    const pooledPS = this.particleSystemPool.get();
    
    // Initialize the particle system
    pooledPS.initialize(
      id,
      type.toString(),
      emitter,
      this.scene,
      config,
      type,
      options?.loop || false,
      true
    );
    
    // Start the effect
    pooledPS.start();
    
    // Add to active effects
    this.activeEffects.set(id, pooledPS);
    
    return id;
  }
  
  /**
   * Register an external particle system with the manager
   * @param name Name for the particle system
   * @param particleSystem The particle system to register
   * @returns ID of the registered particle system
   */
  public registerExternalParticleSystem(name: string, particleSystem: BABYLON.ParticleSystem): string {
    // Not implemented in pooled version - would need different approach
    throw new Error("Method not implemented.");
  }
  
  /**
   * Set whether a particle system is emitting
   * @param id ID of the particle system
   * @param emitting Whether the system should emit particles
   * @returns Whether the operation was successful
   */
  public setEmitting(id: string, emitting: boolean): boolean {
    const effect = this.activeEffects.get(id);
    if (!effect) return false;
    
    if (emitting) {
      return effect.start();
    } else {
      return effect.stop(false);
    }
  }
  
  /**
   * Get a particle system by ID
   * @param id ID of the particle system
   * @returns The particle system or null if not found
   */
  public getParticleSystem(id: string): BABYLON.IParticleSystem | null {
    const effect = this.activeEffects.get(id);
    return effect ? effect.getParticleSystem() : null;
  }
  
  /**
   * Get all particle systems of a specific type
   * @param type Type of particle systems to get
   * @returns Array of particle systems matching the type
   */
  public getParticleSystemsByType(type: ParticleEffectType): BABYLON.IParticleSystem[] {
    const matchingSystems: BABYLON.IParticleSystem[] = [];
    
    this.activeEffects.forEach(effect => {
      if (effect.effectType === type) {
        const ps = effect.getParticleSystem();
        if (ps) matchingSystems.push(ps);
      }
    });
    
    return matchingSystems;
  }
  
  /**
   * Start a particle effect
   * @param id ID of the effect to start
   * @returns True if successfully started
   */
  public startEffect(id: string): boolean {
    const effect = this.activeEffects.get(id);
    if (!effect) return false;
    
    return effect.start();
  }
  
  /**
   * Stop a particle effect
   * @param id ID of the effect to stop
   * @param immediate Whether to stop immediately or let particles finish their lifecycle
   * @returns True if successfully stopped
   */
  public stopEffect(id: string, immediate: boolean = false): boolean {
    const effect = this.activeEffects.get(id);
    if (!effect) return false;
    
    const result = effect.stop(immediate);
    
    // If not auto-dispose, effect will be kept in activeEffects
    if (!effect.autoDispose) return result;
    
    // Otherwise remove from active effects and return to pool
    this.activeEffects.delete(id);
    this.particleSystemPool.release(effect);
    
    return result;
  }
  
  /**
   * Update a particle effect with new options
   * @param id ID of the effect to update
   * @param options New effect options
   * @returns True if update was successful
   */
  public updateEffect(id: string, options: ParticleEffectOptions): boolean {
    // Not efficiently implemented in pooled version
    // Would need to recreate the effect
    return false;
  }
  
  /**
   * Create an explosion effect at a position
   * @param position Position for the explosion
   * @param options Explosion effect options
   * @returns ID of the created effect
   */
  public createExplosion(position: BABYLON.Vector3, options?: ExplosionEffectOptions): string | null {
    return this.createEffect(ParticleEffectType.EXPLOSION, position, options);
  }
  
  /**
   * Create a jetpack effect attached to a mesh
   * @param emitter Mesh to attach the jetpack effect to
   * @param options Jetpack effect options
   * @returns ID of the created effect
   */
  public createJetpackEffect(emitter: BABYLON.AbstractMesh, options?: JetpackEffectOptions): string | null {
    return this.createEffect(ParticleEffectType.JETPACK, emitter, options);
  }
  
  /**
   * Create a ski trail effect
   * @param emitter Mesh to emit the ski trail from
   * @param options Ski trail effect options
   * @returns ID of the created effect
   */
  public createSkiTrailEffect(emitter: BABYLON.AbstractMesh, options?: SkiTrailEffectOptions): string | null {
    return this.createEffect(ParticleEffectType.SKI_TRAIL, emitter, options);
  }
  
  /**
   * Create a projectile trail effect
   * @param emitter Mesh to emit the projectile trail from
   * @param options Projectile trail effect options 
   * @returns ID of the created effect
   */
  public createProjectileTrailEffect(emitter: BABYLON.AbstractMesh, options?: ProjectileTrailEffectOptions): string | null {
    return this.createEffect(ParticleEffectType.PROJECTILE_TRAIL, emitter, options);
  }
  
  /**
   * Dispose of a particle effect
   * @param id ID of the effect to dispose
   * @returns True if successfully disposed
   */
  public disposeEffect(id: string): boolean {
    const effect = this.activeEffects.get(id);
    if (!effect) return false;
    
    effect.stop(true);
    this.activeEffects.delete(id);
    this.particleSystemPool.release(effect);
    
    return true;
  }
  
  /**
   * Dispose of all particle effects
   */
  public disposeAll(): void {
    // Stop all active effects
    this.activeEffects.forEach((effect) => {
      effect.stop(true);
      this.particleSystemPool.release(effect);
    });
    
    // Clear active effects map
    this.activeEffects.clear();
  }
  
  /**
   * Create a particle system from a predefined preset with customizations
   * @param options Options for creating the particle system from preset
   * @returns ID of the created particle system
   */
  public createParticleSystemFromPreset(options: ParticleSystemFromPresetOptions): string | null {
    // Not implemented in pooled version
    return null;
  }
  
  /**
   * Update the emitter position of a particle system
   * @param id ID of the particle system
   * @param position New position for the emitter
   * @returns Whether the update was successful
   */
  public updateEmitterPosition(id: string, position: BABYLON.Vector3): boolean {
    const effect = this.activeEffects.get(id);
    if (!effect) return false;
    
    return effect.updatePosition(position);
  }
  
  /**
   * Update the emit rate of a particle system
   * @param id ID of the particle system
   * @param emitRate New emit rate (particles per second)
   * @returns Whether the update was successful
   */
  public updateEmitRate(id: string, emitRate: number): boolean {
    const ps = this.getParticleSystem(id);
    if (!ps) return false;
    
    ps.emitRate = emitRate;
    return true;
  }
  
  /**
   * Set visibility of a particle system
   * @param id ID of the particle system
   * @param visible Whether the particle system should be visible
   * @returns Whether the visibility change was successful
   */
  public setSystemVisible(id: string, visible: boolean): boolean {
    // Not directly implementable with standard ParticleSystem
    return false;
  }
  
  /**
   * Remove a particle system
   * @param id ID of the particle system to remove
   * @returns Whether the removal was successful
   */
  public removeParticleSystem(id: string): boolean {
    return this.disposeEffect(id);
  }
  
  /**
   * Dispose of the ParticleSystemManager and all managed particle systems
   */
  public dispose(): void {
    this.disposeAll();
  }
  
  /**
   * Get the statistics of the particle system pool
   * @returns Object with pool statistics
   */
  public getPoolStats(): { total: number, available: number, active: number } {
    return {
      total: this.particleSystemPool.getSize(),
      available: this.particleSystemPool.available(),
      active: this.activeEffects.size
    };
  }
} 