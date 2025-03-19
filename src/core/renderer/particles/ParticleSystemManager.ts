/**
 * @file src/core/renderer/particles/ParticleSystemManager.ts
 * @description Implementation of particle system manager for creating and managing particle effects
 * 
 * @dependencies babylonjs
 * @relatedFiles IParticleSystemManager.ts, ParticlePresets.ts
 */
import * as BABYLON from 'babylonjs';
import { 
  IParticleSystemManager, 
  ParticleEffectType,
  ParticleEffectOptions,
  ExplosionEffectOptions,
  JetpackEffectOptions,
  SkiTrailEffectOptions,
  ProjectileTrailEffectOptions
} from './IParticleSystemManager';
import {
  DEFAULT_PARTICLE_OPTIONS,
  DEFAULT_EXPLOSION_OPTIONS,
  DEFAULT_JETPACK_OPTIONS,
  DEFAULT_SKI_TRAIL_OPTIONS,
  DEFAULT_PROJECTILE_TRAIL_OPTIONS,
  DEFAULT_DUST_OPTIONS,
  DEFAULT_MUZZLE_FLASH_OPTIONS,
  DEFAULT_IMPACT_SPARK_OPTIONS,
  scaleParticleEffect
} from './ParticlePresets';

/**
 * Manager for creating and controlling particle systems
 */
export class ParticleSystemManager implements IParticleSystemManager {
  private scene: BABYLON.Scene | null = null;
  private particleSystems: Map<string, BABYLON.ParticleSystem> = new Map();
  private particleTypes: Map<string, ParticleEffectType> = new Map();
  private nextId = 1;
  
  /**
   * Initialize the particle manager
   * @param scene BABYLON Scene to use
   */
  public initialize(scene: BABYLON.Scene): void {
    this.scene = scene;
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
      console.error('ParticleSystemManager: Scene not initialized');
      return null;
    }
    
    try {
      // Generate a unique ID for this effect
      const id = `${type}_${this.nextId++}`;
      let particleSystem: BABYLON.ParticleSystem | null = null;
      
      // Create appropriate effect type
      switch (type) {
        case ParticleEffectType.EXPLOSION:
          particleSystem = this.createExplosionEffect(
            emitter instanceof BABYLON.Vector3 ? emitter : emitter.position,
            options as ExplosionEffectOptions
          );
          break;
          
        case ParticleEffectType.JETPACK:
          if (emitter instanceof BABYLON.AbstractMesh) {
            particleSystem = this.createJetpackEffectInternal(
              emitter,
              options as JetpackEffectOptions
            );
          } else {
            console.error('ParticleSystemManager: Jetpack effects require a mesh emitter');
            return null;
          }
          break;
          
        case ParticleEffectType.SKI_TRAIL:
          if (emitter instanceof BABYLON.AbstractMesh) {
            particleSystem = this.createSkiTrailEffectInternal(
              emitter,
              options as SkiTrailEffectOptions
            );
          } else {
            console.error('ParticleSystemManager: Ski trail effects require a mesh emitter');
            return null;
          }
          break;
          
        case ParticleEffectType.PROJECTILE_TRAIL:
          if (emitter instanceof BABYLON.AbstractMesh) {
            particleSystem = this.createProjectileTrailEffectInternal(
              emitter,
              options as ProjectileTrailEffectOptions
            );
          } else {
            console.error('ParticleSystemManager: Projectile trail effects require a mesh emitter');
            return null;
          }
          break;
          
        case ParticleEffectType.DUST:
          particleSystem = this.createBasicEffect(
            type,
            emitter,
            { ...DEFAULT_DUST_OPTIONS, ...options }
          );
          break;
          
        case ParticleEffectType.MUZZLE_FLASH:
          particleSystem = this.createBasicEffect(
            type,
            emitter,
            { ...DEFAULT_MUZZLE_FLASH_OPTIONS, ...options }
          );
          break;
          
        case ParticleEffectType.IMPACT_SPARK:
          particleSystem = this.createBasicEffect(
            type,
            emitter,
            { ...DEFAULT_IMPACT_SPARK_OPTIONS, ...options }
          );
          break;
          
        case ParticleEffectType.SMOKE:
          particleSystem = this.createBasicEffect(
            type,
            emitter,
            options
          );
          break;
          
        case ParticleEffectType.CUSTOM:
          particleSystem = this.createBasicEffect(
            type,
            emitter,
            options
          );
          break;
          
        default:
          console.warn(`ParticleSystemManager: Unknown effect type ${type}`);
          return null;
      }
      
      if (particleSystem) {
        // Store in our tracking maps
        this.particleSystems.set(id, particleSystem);
        this.particleTypes.set(id, type);
        
        // Start if enabled
        const effectOptions = options || {};
        if (effectOptions.enabled !== false) {
          particleSystem.start();
        }
        
        return id;
      }
      
      return null;
    } catch (error) {
      console.error(`ParticleSystemManager: Error creating effect ${type}`, error);
      return null;
    }
  }
  
  /**
   * Create a basic particle effect
   * @param type Type of effect
   * @param emitter Mesh or position emitter
   * @param options Effect options
   * @returns Created particle system
   */
  private createBasicEffect(
    type: ParticleEffectType,
    emitter: BABYLON.AbstractMesh | BABYLON.Vector3,
    options?: ParticleEffectOptions
  ): BABYLON.ParticleSystem {
    if (!this.scene) {
      throw new Error('Scene not initialized');
    }
    
    // Merge with default options
    const config = { ...DEFAULT_PARTICLE_OPTIONS, ...options };
    
    // Create particle system
    const particleSystem = new BABYLON.ParticleSystem(`${type}_system`, config.maxParticles || 2000, this.scene);
    
    // Set emitter
    if (emitter instanceof BABYLON.Vector3) {
      particleSystem.emitter = emitter;
    } else {
      particleSystem.emitter = emitter;
      
      // Only use local space for mesh emitters if specified
      if (config.isLocal) {
        particleSystem.isLocal = true;
      }
    }
    
    // Set basic properties
    particleSystem.minLifeTime = config.minLifeTime || 0.5;
    particleSystem.maxLifeTime = config.maxLifeTime || 1.5;
    particleSystem.minSize = config.minSize || 0.1;
    particleSystem.maxSize = config.maxSize || 0.5;
    particleSystem.emitRate = config.emitRate || 100;
    particleSystem.color1 = config.startColor || new BABYLON.Color4(1, 1, 1, 1);
    particleSystem.color2 = config.endColor || new BABYLON.Color4(1, 1, 1, 0);
    particleSystem.blendMode = config.blendMode || BABYLON.ParticleSystem.BLENDMODE_STANDARD;
    
    // Direction 
    const coneAngle = config.emitConeAngle || 0.5;
    particleSystem.direction1 = new BABYLON.Vector3(-coneAngle, 1, -coneAngle);
    particleSystem.direction2 = new BABYLON.Vector3(coneAngle, 1, coneAngle);
    
    if (config.direction) {
      // Override with specific direction if provided
      particleSystem.direction1 = new BABYLON.Vector3(
        config.direction.x - coneAngle,
        config.direction.y - coneAngle,
        config.direction.z - coneAngle
      );
      
      particleSystem.direction2 = new BABYLON.Vector3(
        config.direction.x + coneAngle,
        config.direction.y + coneAngle,
        config.direction.z + coneAngle
      );
    }
    
    // Power (speed)
    particleSystem.minEmitPower = config.minEmitPower || 1;
    particleSystem.maxEmitPower = config.maxEmitPower || 3;
    
    // Gravity
    if (config.gravity) {
      particleSystem.gravity = config.gravity;
    }
    
    // Loop or limited duration
    particleSystem.targetStopDuration = config.emitDuration || 0;
    particleSystem.disposeOnStop = false;
    
    // Add texture if specified
    if (config.texturePath) {
      particleSystem.particleTexture = new BABYLON.Texture(config.texturePath, this.scene);
    }
    
    // Layer mask if specified
    if (config.layerMask !== undefined) {
      particleSystem.layerMask = config.layerMask;
    }
    
    return particleSystem;
  }
  
  /**
   * Get a particle system by ID
   * @param id ID of the particle system
   * @returns The particle system or null if not found
   */
  public getParticleSystem(id: string): BABYLON.IParticleSystem | null {
    return this.particleSystems.get(id) || null;
  }
  
  /**
   * Get all particle systems of a specific type
   * @param type Type of particle systems to get
   * @returns Array of particle systems matching the type
   */
  public getParticleSystemsByType(type: ParticleEffectType): BABYLON.IParticleSystem[] {
    const systems: BABYLON.ParticleSystem[] = [];
    
    this.particleTypes.forEach((particleType, id) => {
      if (particleType === type) {
        const system = this.particleSystems.get(id);
        if (system) {
          systems.push(system);
        }
      }
    });
    
    return systems;
  }
  
  /**
   * Start a particle effect
   * @param id ID of the effect to start
   * @returns True if successfully started
   */
  public startEffect(id: string): boolean {
    const system = this.particleSystems.get(id);
    if (!system) {
      return false;
    }
    
    system.start();
    return true;
  }
  
  /**
   * Stop a particle effect
   * @param id ID of the effect to stop
   * @param immediate Whether to stop immediately or let particles finish their lifecycle
   * @returns True if successfully stopped
   */
  public stopEffect(id: string, immediate: boolean = false): boolean {
    const system = this.particleSystems.get(id);
    if (!system) {
      return false;
    }
    
    system.stop(immediate);
    return true;
  }
  
  /**
   * Update a particle effect with new options
   * @param id ID of the effect to update
   * @param options New effect options
   * @returns True if update was successful
   */
  public updateEffect(id: string, options: ParticleEffectOptions): boolean {
    const system = this.particleSystems.get(id);
    if (!system) {
      return false;
    }
    
    try {
      // Update common properties
      if (options.emitRate !== undefined) {
        system.emitRate = options.emitRate;
      }
      
      if (options.minLifeTime !== undefined) {
        system.minLifeTime = options.minLifeTime;
      }
      
      if (options.maxLifeTime !== undefined) {
        system.maxLifeTime = options.maxLifeTime;
      }
      
      if (options.minSize !== undefined) {
        system.minSize = options.minSize;
      }
      
      if (options.maxSize !== undefined) {
        system.maxSize = options.maxSize;
      }
      
      if (options.startColor) {
        system.color1 = options.startColor;
      }
      
      if (options.endColor) {
        system.color2 = options.endColor;
      }
      
      if (options.minEmitPower !== undefined) {
        system.minEmitPower = options.minEmitPower;
      }
      
      if (options.maxEmitPower !== undefined) {
        system.maxEmitPower = options.maxEmitPower;
      }
      
      if (options.gravity) {
        system.gravity = options.gravity;
      }
      
      // Update enabled state
      if (options.enabled !== undefined) {
        if (options.enabled) {
          system.start();
        } else {
          system.stop();
        }
      }
      
      return true;
    } catch (error) {
      console.error(`ParticleSystemManager: Error updating effect ${id}`, error);
      return false;
    }
  }
  
  /**
   * Create an explosion effect at a position
   * @param position Position for the explosion
   * @param options Explosion effect options
   * @returns Particle system for the explosion
   */
  private createExplosionEffect(
    position: BABYLON.Vector3,
    options?: ExplosionEffectOptions
  ): BABYLON.ParticleSystem {
    // Merge with default options
    const config = { ...DEFAULT_EXPLOSION_OPTIONS, ...options };
    
    // Create base particle system
    const particleSystem = this.createBasicEffect(
      ParticleEffectType.EXPLOSION,
      position,
      config
    );
    
    // Add specific explosion characteristics
    const radius = config.radius || 0.1;
    particleSystem.createSphereEmitter(radius);
    
    // Add gravity to push particles upward initially then fall
    particleSystem.gravity = new BABYLON.Vector3(0, 5, 0);
    
    // Randomize rotation
    particleSystem.minAngularSpeed = -2;
    particleSystem.maxAngularSpeed = 2;
    
    // Disable looping for explosion (one-time effect)
    particleSystem.disposeOnStop = true;
    particleSystem.targetStopDuration = config.duration || 1;
    
    // Add randomization to particle sizes
    if (config.randomness) {
      particleSystem.addSizeGradient(0, config.minSize || 0.1);
      particleSystem.addSizeGradient(0.3, (config.minSize || 0.1) * 3);
      particleSystem.addSizeGradient(0.5, (config.minSize || 0.1) * 2);
      particleSystem.addSizeGradient(1.0, config.minSize || 0.1);
    }
    
    return particleSystem;
  }
  
  /**
   * Create a jetpack effect attached to a mesh (internal implementation)
   * @param emitter Mesh to attach the jetpack effect to
   * @param options Jetpack effect options
   * @returns Particle system for the jetpack
   */
  private createJetpackEffectInternal(
    emitter: BABYLON.AbstractMesh,
    options?: JetpackEffectOptions
  ): BABYLON.ParticleSystem {
    if (!this.scene) {
      throw new Error('Scene not initialized');
    }
    
    // Merge with default options
    const config = { ...DEFAULT_JETPACK_OPTIONS, ...options };
    
    // Create base particle system - ensure it's in local space
    config.isLocal = true;
    
    const particleSystem = this.createBasicEffect(
      ParticleEffectType.JETPACK,
      emitter,
      config
    );
    
    // Setup specific jetpack characteristics
    particleSystem.minInitialRotation = 0;
    particleSystem.maxInitialRotation = Math.PI;
    
    // Custom jetpack emission (downward from character)
    const coneAngle = config.emitConeAngle || 0.2;
    particleSystem.direction1 = new BABYLON.Vector3(-coneAngle, -1, -coneAngle);
    particleSystem.direction2 = new BABYLON.Vector3(coneAngle, -1, coneAngle);
    
    // Add light if requested
    if (config.emitLight && this.scene) {
      const light = new BABYLON.PointLight(
        `jetpack_light_${this.nextId}`,
        new BABYLON.Vector3(0, 0, 0),
        this.scene
      );
      
      light.diffuse = config.lightColor || new BABYLON.Color3(1, 0.6, 0.1);
      light.intensity = config.lightIntensity || 2;
      light.range = 10;
      
      light.parent = emitter; // Attach to the same emitter
      
      // Save reference to the light for disposal later
      (particleSystem as any)._jetpackLight = light;
      
      // Position light slightly behind particle emitter
      light.position = new BABYLON.Vector3(0, -0.5, 0);
    }
    
    // Add heat distortion if requested
    if (config.heatDistortion && this.scene) {
      const heatLayer = new BABYLON.HighlightLayer("heatDistortion", this.scene);
      heatLayer.addMesh(emitter as BABYLON.Mesh, new BABYLON.Color3(1, 1, 1));
      
      // Add custom glow intensity
      heatLayer.blurHorizontalSize = 0.3;
      heatLayer.blurVerticalSize = 0.3;
      
      // Save reference for disposal
      (particleSystem as any)._heatDistortion = heatLayer;
    }
    
    return particleSystem;
  }
  
  /**
   * Create a ski trail effect (internal implementation)
   * @param emitter Mesh to emit the ski trail from
   * @param options Ski trail effect options
   * @returns Particle system for the ski trail
   */
  private createSkiTrailEffectInternal(
    emitter: BABYLON.AbstractMesh,
    options?: SkiTrailEffectOptions
  ): BABYLON.ParticleSystem {
    // Merge with default options
    const config = { ...DEFAULT_SKI_TRAIL_OPTIONS, ...options };
    
    // Create base particle system
    const particleSystem = this.createBasicEffect(
      ParticleEffectType.SKI_TRAIL,
      emitter,
      config
    );
    
    // Setup specific ski trail characteristics
    particleSystem.emitRate = Math.max(1, particleSystem.emitRate * ((config.speed || 1) / 10));
    
    // Emit slightly behind the player
    const width = config.width || 0.5;
    particleSystem.minEmitBox = new BABYLON.Vector3(-width, -0.1, -0.5);
    particleSystem.maxEmitBox = new BABYLON.Vector3(width, 0, 0.5);
    
    // Make particles stay on the ground
    particleSystem.gravity = new BABYLON.Vector3(0, -1, 0);
    
    // Ski trails should slowly fade away
    particleSystem.addColorGradient(0, config.startColor || new BABYLON.Color4(1, 1, 1, 0.6));
    particleSystem.addColorGradient(0.5, new BABYLON.Color4(
      (config.endColor?.r || 1), 
      (config.endColor?.g || 1), 
      (config.endColor?.b || 1), 
      0.3
    ));
    particleSystem.addColorGradient(1.0, config.endColor || new BABYLON.Color4(1, 1, 1, 0));
    
    return particleSystem;
  }
  
  /**
   * Create a projectile trail effect (internal implementation)
   * @param emitter Mesh to emit the projectile trail from
   * @param options Projectile trail effect options 
   * @returns Particle system for the projectile trail
   */
  private createProjectileTrailEffectInternal(
    emitter: BABYLON.AbstractMesh,
    options?: ProjectileTrailEffectOptions
  ): BABYLON.ParticleSystem {
    if (!this.scene) {
      throw new Error('Scene not initialized');
    }
    
    // Merge with default options
    const config = { ...DEFAULT_PROJECTILE_TRAIL_OPTIONS, ...options };
    
    // Create base particle system
    const particleSystem = this.createBasicEffect(
      ParticleEffectType.PROJECTILE_TRAIL,
      emitter,
      config
    );
    
    // Setup specific projectile trail characteristics
    particleSystem.minInitialRotation = 0;
    particleSystem.maxInitialRotation = Math.PI;
    
    // Emit behind the projectile
    const coneAngle = config.emitConeAngle || 0.2;
    particleSystem.direction1 = new BABYLON.Vector3(-coneAngle, -0.2, -coneAngle);
    particleSystem.direction2 = new BABYLON.Vector3(coneAngle, 0.2, coneAngle);
    
    // Add distortion if requested
    if (config.distortion && this.scene) {
      const distortionLayer = new BABYLON.HighlightLayer("projectileDistortion", this.scene);
      distortionLayer.addMesh(emitter as BABYLON.Mesh, new BABYLON.Color3(0.5, 0.5, 1.0));
      
      // Custom distortion appearance
      distortionLayer.blurHorizontalSize = 0.2;
      distortionLayer.blurVerticalSize = 0.2;
      
      // Save reference for disposal
      (particleSystem as any)._distortionEffect = distortionLayer;
    }
    
    return particleSystem;
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
    const system = this.particleSystems.get(id);
    if (!system) {
      return false;
    }
    
    try {
      // Dispose custom effects if any
      if ((system as any)._jetpackLight) {
        (system as any)._jetpackLight.dispose();
      }
      
      if ((system as any)._heatDistortion) {
        (system as any)._heatDistortion.dispose();
      }
      
      if ((system as any)._distortionEffect) {
        (system as any)._distortionEffect.dispose();
      }
      
      // Dispose the particle system
      system.dispose();
      
      // Remove from our maps
      this.particleSystems.delete(id);
      this.particleTypes.delete(id);
      
      return true;
    } catch (error) {
      console.error(`ParticleSystemManager: Error disposing effect ${id}`, error);
      return false;
    }
  }
  
  /**
   * Dispose of all particle effects
   */
  public disposeAll(): void {
    // Dispose all particle systems
    this.particleSystems.forEach(system => {
      system.dispose();
    });
    
    // Clear maps
    this.particleSystems.clear();
    this.particleTypes.clear();
  }

  /**
   * Dispose of the ParticleSystemManager and all managed particle systems
   */
  public dispose(): void {
    this.disposeAll();
    this.scene = null;
  }

  /**
   * Create a particle system from a predefined preset with customizations
   * @param options Options for creating the particle system from preset
   * @returns ID of the created particle system
   */
  public createParticleSystemFromPreset(options: any): string | null {
    if (!this.scene) {
      console.error('ParticleSystemManager: Scene not initialized');
      return null;
    }

    try {
      // Implementation would go here
      console.warn('ParticleSystemFromPreset not fully implemented');
      return null;
    } catch (error) {
      console.error('Error creating particle system from preset:', error);
      return null;
    }
  }

  /**
   * Update the emitter position of a particle system
   * @param id ID of the particle system
   * @param position New position for the emitter
   * @returns Whether the update was successful
   */
  public updateEmitterPosition(id: string, position: BABYLON.Vector3): boolean {
    const system = this.particleSystems.get(id);
    if (!system) {
      return false;
    }

    try {
      if (system.emitter instanceof BABYLON.Vector3) {
        (system.emitter as BABYLON.Vector3).copyFrom(position);
        return true;
      } else if (system.emitter instanceof BABYLON.AbstractMesh) {
        (system.emitter as BABYLON.AbstractMesh).position.copyFrom(position);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`ParticleSystemManager: Error updating emitter position for ${id}`, error);
      return false;
    }
  }

  /**
   * Update the emit rate of a particle system
   * @param id ID of the particle system
   * @param emitRate New emit rate (particles per second)
   * @returns Whether the update was successful
   */
  public updateEmitRate(id: string, emitRate: number): boolean {
    const system = this.particleSystems.get(id);
    if (!system) {
      return false;
    }

    try {
      system.emitRate = emitRate;
      return true;
    } catch (error) {
      console.error(`ParticleSystemManager: Error updating emit rate for ${id}`, error);
      return false;
    }
  }

  /**
   * Set visibility of a particle system
   * @param id ID of the particle system
   * @param visible Whether the particle system should be visible
   * @returns Whether the visibility change was successful
   */
  public setSystemVisible(id: string, visible: boolean): boolean {
    const system = this.particleSystems.get(id);
    if (!system) {
      return false;
    }

    try {
      if (visible) {
        if (!system.isStarted()) {
          system.start();
        }
      } else {
        if (system.isStarted()) {
          system.stop();
        }
      }
      return true;
    } catch (error) {
      console.error(`ParticleSystemManager: Error setting visibility for ${id}`, error);
      return false;
    }
  }

  /**
   * Remove a particle system
   * @param id ID of the particle system to remove
   * @returns Whether the removal was successful
   */
  public removeParticleSystem(id: string): boolean {
    return this.disposeEffect(id);
  }
} 