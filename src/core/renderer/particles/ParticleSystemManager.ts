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
  ProjectileTrailEffectOptions,
  ParticleSystemFromPresetOptions
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
import { ResourceTracker, ResourceType } from '../../utils/ResourceTracker';
import { Logger } from '../../utils/Logger';
import { ServiceLocator } from '../../base/ServiceLocator';

/**
 * Available quality levels for particle effects
 */
export enum ParticleQualityLevel {
  ULTRA = 0,
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
  VERY_LOW = 4
}

/**
 * Configuration for particle system quality scaling
 */
export interface ParticleQualityConfig {
  /** Current quality level */
  qualityLevel: ParticleQualityLevel;
  /** Whether to use adaptive quality based on performance */
  adaptiveQuality: boolean;
  /** Target framerate for adaptive quality */
  targetFramerate: number;
  /** How quickly to adapt to performance changes (0-1) */
  adaptationSpeed: number;
  /** How frequently to check performance (ms) */
  checkInterval: number;
  /** Scale factors for each quality level */
  scalingFactors: Record<ParticleQualityLevel, number>;
}

/**
 * Default quality configuration
 */
export const DEFAULT_PARTICLE_QUALITY_CONFIG: ParticleQualityConfig = {
  qualityLevel: ParticleQualityLevel.HIGH,
  adaptiveQuality: true,
  targetFramerate: 60,
  adaptationSpeed: 0.2,
  checkInterval: 3000,
  scalingFactors: {
    [ParticleQualityLevel.ULTRA]: 1.25,
    [ParticleQualityLevel.HIGH]: 1.0,
    [ParticleQualityLevel.MEDIUM]: 0.75,
    [ParticleQualityLevel.LOW]: 0.5,
    [ParticleQualityLevel.VERY_LOW]: 0.3
  }
};

/**
 * Extended particle system interface with custom properties
 * used by special effect particle systems
 */
interface ExtendedParticleSystem extends BABYLON.IParticleSystem {
  /** Reference to a light emitted by jetpack effects */
  _jetpackLight?: BABYLON.Light;
  /** Reference to heat distortion effect */
  _heatDistortion?: BABYLON.HighlightLayer;
  /** Reference to distortion effect for projectiles */
  _distortionEffect?: BABYLON.HighlightLayer;
  /** Original unscaled options */
  _originalOptions?: ParticleEffectOptions;
}

/**
 * Manager for creating and controlling particle systems
 */
export class ParticleSystemManager implements IParticleSystemManager {
  private scene: BABYLON.Scene | null = null;
  private particleSystems: Map<string, BABYLON.ParticleSystem> = new Map();
  private particleTypes: Map<string, ParticleEffectType> = new Map();
  private nextId = 1;
  private resourceTracker: ResourceTracker;
  private logger: Logger;
  
  // Performance monitoring and quality scaling
  private qualityConfig: ParticleQualityConfig;
  private performanceObserver: BABYLON.Observer<BABYLON.Scene> | null = null;
  private frameRateHistory: number[] = [];
  private frameRateHistorySize: number = 10;
  private lastPerformanceCheck: number = 0;
  private currentScalingFactor: number = 1.0;
  
  /**
   * Creates a new ParticleSystemManager
   * @param resourceTracker Optional ResourceTracker instance to use
   * @param qualityConfig Optional quality configuration
   */
  constructor(
    resourceTracker?: ResourceTracker,
    qualityConfig?: Partial<ParticleQualityConfig>
  ) {
    // Use provided ResourceTracker or create a new one
    this.resourceTracker = resourceTracker || new ResourceTracker();
    
    // Initialize default logger
    this.logger = new Logger('ParticleSystemManager');
    
    // Initialize quality config
    this.qualityConfig = { ...DEFAULT_PARTICLE_QUALITY_CONFIG, ...qualityConfig };
    this.currentScalingFactor = this.qualityConfig.scalingFactors[this.qualityConfig.qualityLevel];
    
    // Try to get logger from ServiceLocator
    try {
      const serviceLocator = ServiceLocator.getInstance();
      if (serviceLocator.has('logger')) {
        this.logger = serviceLocator.get<Logger>('logger');
        // Add our context tag
        this.logger.addTag('ParticleSystemManager');
      }
    } catch (e) {
      this.logger.warn('Logger not available from ServiceLocator, using default logger');
    }
    
    this.logger.debug(`ParticleSystemManager initialized with quality level: ${ParticleQualityLevel[this.qualityConfig.qualityLevel]}`);
  }
  
  /**
   * Initialize the particle manager
   * @param scene BABYLON Scene to use
   */
  public initialize(scene: BABYLON.Scene): void {
    this.scene = scene;
    
    // Setup performance monitoring if adaptive quality is enabled
    if (this.qualityConfig.adaptiveQuality) {
      this.setupPerformanceMonitoring();
    }
  }
  
  /**
   * Setup performance monitoring for adaptive particle quality
   */
  private setupPerformanceMonitoring(): void {
    if (!this.scene) {
      return;
    }
    
    // Remove existing observer if any
    if (this.performanceObserver) {
      this.scene.onAfterRenderObservable.remove(this.performanceObserver);
      this.performanceObserver = null;
    }
    
    // Add new observer
    this.performanceObserver = this.scene.onAfterRenderObservable.add(() => {
      // Get current frame rate
      const fps = Math.round(this.scene!.getEngine().getFps());
      
      // Add to history
      this.frameRateHistory.push(fps);
      
      // Keep history at specified size
      if (this.frameRateHistory.length > this.frameRateHistorySize) {
        this.frameRateHistory.shift();
      }
      
      // Check if it's time to evaluate performance
      const currentTime = performance.now();
      if (currentTime - this.lastPerformanceCheck >= this.qualityConfig.checkInterval) {
        this.evaluateParticleQuality();
        this.lastPerformanceCheck = currentTime;
      }
    });
  }
  
  /**
   * Evaluate performance and adjust particle quality settings if needed
   */
  private evaluateParticleQuality(): void {
    if (!this.qualityConfig.adaptiveQuality || this.frameRateHistory.length < 5) {
      return;
    }
    
    // Calculate average FPS
    const avgFps = this.frameRateHistory.reduce((sum, fps) => sum + fps, 0) / this.frameRateHistory.length;
    
    // Calculate variance to detect unstable frame rates
    let variance = 0;
    for (const fps of this.frameRateHistory) {
      variance += Math.pow(fps - avgFps, 2);
    }
    variance /= this.frameRateHistory.length;
    
    // Determine if we need to adjust quality
    const targetFps = this.qualityConfig.targetFramerate;
    const fpsRatio = avgFps / targetFps;
    
    let newQualityLevel = this.qualityConfig.qualityLevel;
    
    if (fpsRatio < 0.65) {
      // Significantly under target FPS, decrease quality by two levels
      newQualityLevel = Math.min(ParticleQualityLevel.VERY_LOW, newQualityLevel + 2);
    } else if (fpsRatio < 0.85) {
      // Under target FPS, decrease quality by one level
      newQualityLevel = Math.min(ParticleQualityLevel.VERY_LOW, newQualityLevel + 1);
    } else if (fpsRatio > 1.5 && variance < 100) {
      // Significantly over target FPS and stable, increase quality by two levels
      newQualityLevel = Math.max(ParticleQualityLevel.ULTRA, newQualityLevel - 2);
    } else if (fpsRatio > 1.2 && variance < 50) {
      // Over target FPS and stable, increase quality by one level
      newQualityLevel = Math.max(ParticleQualityLevel.ULTRA, newQualityLevel - 1);
    }
    
    // Apply new quality level if changed
    if (newQualityLevel !== this.qualityConfig.qualityLevel) {
      this.setQualityLevel(newQualityLevel);
      this.logger.debug(`Adjusted particle quality to: ${ParticleQualityLevel[newQualityLevel]} (FPS: ${avgFps.toFixed(1)}, Target: ${targetFps})`);
    }
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
      this.logger.error('Scene not initialized');
      return null;
    }
    
    try {
      // Generate a unique ID for this effect
      const id = `${type}_${this.nextId++}`;
      let particleSystem: BABYLON.ParticleSystem | null = null;
      
      // Store original unscaled options
      const originalOptions = options ? { ...options } : undefined;
      
      // Apply quality scaling to options
      const qualityScaledOptions = this.applyQualityScaling(type, options);
      
      // Create appropriate effect type
      switch (type) {
        case ParticleEffectType.EXPLOSION:
          particleSystem = this.createExplosionEffect(
            emitter instanceof BABYLON.Vector3 ? emitter : emitter.position,
            qualityScaledOptions as ExplosionEffectOptions
          );
          break;
          
        case ParticleEffectType.JETPACK:
          if (emitter instanceof BABYLON.AbstractMesh) {
            particleSystem = this.createJetpackEffectInternal(
              emitter,
              qualityScaledOptions as JetpackEffectOptions
            );
          } else {
            this.logger.error('Jetpack effects require a mesh emitter');
            return null;
          }
          break;
          
        case ParticleEffectType.SKI_TRAIL:
          if (emitter instanceof BABYLON.AbstractMesh) {
            particleSystem = this.createSkiTrailEffectInternal(
              emitter,
              qualityScaledOptions as SkiTrailEffectOptions
            );
          } else {
            this.logger.error('Ski trail effects require a mesh emitter');
            return null;
          }
          break;
          
        case ParticleEffectType.PROJECTILE_TRAIL:
          if (emitter instanceof BABYLON.AbstractMesh) {
            particleSystem = this.createProjectileTrailEffectInternal(
              emitter,
              qualityScaledOptions as ProjectileTrailEffectOptions
            );
          } else {
            this.logger.error('Projectile trail effects require a mesh emitter');
            return null;
          }
          break;
          
        case ParticleEffectType.DUST:
          particleSystem = this.createBasicEffect(
            type,
            emitter,
            { ...DEFAULT_DUST_OPTIONS, ...qualityScaledOptions }
          );
          break;
          
        case ParticleEffectType.MUZZLE_FLASH:
          particleSystem = this.createBasicEffect(
            type,
            emitter,
            { ...DEFAULT_MUZZLE_FLASH_OPTIONS, ...qualityScaledOptions }
          );
          break;
          
        case ParticleEffectType.IMPACT_SPARK:
          particleSystem = this.createBasicEffect(
            type,
            emitter,
            { ...DEFAULT_IMPACT_SPARK_OPTIONS, ...qualityScaledOptions }
          );
          break;
          
        case ParticleEffectType.SMOKE:
          particleSystem = this.createBasicEffect(
            type,
            emitter,
            qualityScaledOptions
          );
          break;
          
        case ParticleEffectType.CUSTOM:
          particleSystem = this.createBasicEffect(
            type,
            emitter,
            qualityScaledOptions
          );
          break;
          
        default:
          this.logger.warn(`Unknown effect type ${type}`);
          return null;
      }
      
      if (particleSystem) {
        // Store original options for future quality adjustments
        (particleSystem as ExtendedParticleSystem)._originalOptions = originalOptions;
        
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
      this.logger.error(`Error creating effect ${type}`, error as Error);
      return null;
    }
  }
  
  /**
   * Apply quality scaling to particle effect options
   * @param type Type of particle effect 
   * @param options Original options
   * @returns Quality-scaled options
   */
  private applyQualityScaling(
    type: ParticleEffectType,
    options?: ParticleEffectOptions
  ): ParticleEffectOptions | undefined {
    if (!options) {
      return options;
    }
    
    // Skip scaling if it's already been applied or the scale is explicitly set
    if (options._qualityScaled) {
      return options;
    }
    
    // Clone the options to avoid modifying the original
    const scaledOptions = { ...options };
    
    // The scaling factor depends on the effect type and current quality level
    const baseFactor = this.currentScalingFactor;
    
    // Adjust based on effect type (more important effects get higher quality)
    let typeFactor = 1.0;
    switch (type) {
      case ParticleEffectType.EXPLOSION:
        // Explosions are visually important, so scale them less aggressively
        typeFactor = 1.1;
        break;
      case ParticleEffectType.PROJECTILE_TRAIL:
        // Projectile trails are important for gameplay, scale them less
        typeFactor = 1.05;
        break;
      case ParticleEffectType.JETPACK:
        // Jetpack effects are important for player feedback
        typeFactor = 1.0;
        break;
      case ParticleEffectType.DUST:
      case ParticleEffectType.SKI_TRAIL:
        // These are less critical, can be scaled more aggressively
        typeFactor = 0.9;
        break;
      default:
        typeFactor = 1.0;
    }
    
    // Calculate final factor, clamping to reasonable values
    const finalFactor = Math.max(0.2, Math.min(1.5, baseFactor * typeFactor));
    
    // Apply scaling using the utility function from ParticlePresets
    const result = scaleParticleEffect(scaledOptions, finalFactor);
    
    // Mark as quality scaled to prevent double-scaling
    result._qualityScaled = true;
    
    return result;
  }
  
  /**
   * Set the particle quality level
   * @param level New quality level
   */
  public setQualityLevel(level: ParticleQualityLevel): void {
    if (level === this.qualityConfig.qualityLevel) {
      return;
    }
    
    this.qualityConfig.qualityLevel = level;
    this.currentScalingFactor = this.qualityConfig.scalingFactors[level];
    
    // Update all existing particle systems
    this.updateAllParticleSystemsQuality();
    
    this.logger.debug(`Particle quality set to: ${ParticleQualityLevel[level]} (scale factor: ${this.currentScalingFactor})`);
  }
  
  /**
   * Enable or disable adaptive quality
   * @param enabled Whether adaptive quality should be enabled
   */
  public setAdaptiveQuality(enabled: boolean): void {
    if (enabled === this.qualityConfig.adaptiveQuality) {
      return;
    }
    
    this.qualityConfig.adaptiveQuality = enabled;
    
    if (enabled) {
      this.setupPerformanceMonitoring();
    } else if (this.performanceObserver && this.scene) {
      this.scene.onAfterRenderObservable.remove(this.performanceObserver);
      this.performanceObserver = null;
    }
    
    this.logger.debug(`Adaptive particle quality ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Set target framerate for adaptive quality
   * @param fps Target framerate
   */
  public setTargetFramerate(fps: number): void {
    this.qualityConfig.targetFramerate = Math.max(30, Math.min(120, fps));
  }
  
  /**
   * Update quality for all existing particle systems
   */
  private updateAllParticleSystemsQuality(): void {
    for (const [id, system] of this.particleSystems.entries()) {
      const originalOptions = (system as ExtendedParticleSystem)._originalOptions;
      const type = this.particleTypes.get(id) || ParticleEffectType.CUSTOM;
      
      if (originalOptions) {
        // Apply new quality scaling
        const scaledOptions = this.applyQualityScaling(type, originalOptions);
        
        // Update the particle system
        this.updateEffect(id, scaledOptions!);
      }
    }
  }
  
  /**
   * Get current particle quality configuration
   * @returns Current quality configuration
   */
  public getQualityConfig(): Readonly<ParticleQualityConfig> {
    return { ...this.qualityConfig };
  }
  
  /**
   * Create a basic particle system with standard configuration
   * @param type Type of effect
   * @param emitter Emitter mesh or position
   * @param options Configuration options
   * @returns Configured particle system
   */
  private createBasicEffect(
    type: ParticleEffectType,
    emitter: BABYLON.AbstractMesh | BABYLON.Vector3,
    options?: ParticleEffectOptions
  ): BABYLON.ParticleSystem {
    if (!this.scene) {
      throw new Error('Cannot create particle system: scene not initialized');
    }
    
    // Apply quality scaling to options
    const scaledOptions = this.applyQualityScaling(type, options);
    const config = scaledOptions || {};
    
    // Get emitter position for systems that need it
    const emitterPosition = emitter instanceof BABYLON.Vector3 
      ? emitter 
      : emitter.position;
    
    // Create basic particle system
    const particleSystem = new BABYLON.ParticleSystem(
      `particles_${type}_${this.nextId++}`,
      (config as any).capacity || 2000,
      this.scene
    );
    
    // Store original unscaled options for later quality adjustments
    (particleSystem as ExtendedParticleSystem)._originalOptions = options;
    
    // Set emitter
    particleSystem.emitter = emitter;
    
    // Common basic configuration
    particleSystem.minEmitPower = config.minEmitPower || 1;
    particleSystem.maxEmitPower = config.maxEmitPower || 5;
    particleSystem.minLifeTime = config.minLifeTime || 0.3;
    particleSystem.maxLifeTime = config.maxLifeTime || 1.5;
    particleSystem.emitRate = config.emitRate || 100;
    particleSystem.minSize = config.minSize || 0.1;
    particleSystem.maxSize = config.maxSize || 1.0;
    
    // Set color gradients if specified
    if ((config as any).colorGradient) {
      particleSystem.addColorGradient(0, (config as any).colorGradient.start || new BABYLON.Color4(1, 1, 1, 1));
      particleSystem.addColorGradient(1, (config as any).colorGradient.end || new BABYLON.Color4(1, 1, 1, 0));
    } else {
      // Default color is white with alpha fade
      particleSystem.addColorGradient(0, new BABYLON.Color4(1, 1, 1, 1));
      particleSystem.addColorGradient(1, new BABYLON.Color4(1, 1, 1, 0));
    }
    
    // Set optional parameters if specified
    if ((config as any).updateSpeed !== undefined) {
      particleSystem.updateSpeed = (config as any).updateSpeed;
    }
    
    if ((config as any).direction1) {
      particleSystem.direction1 = (config as any).direction1;
    }
    
    if ((config as any).direction2) {
      particleSystem.direction2 = (config as any).direction2;
    }
    
    if (config.gravity) {
      particleSystem.gravity = config.gravity;
    }
    
    // Set additional optional properties if specified
    if (config.blendMode !== undefined) {
      particleSystem.blendMode = config.blendMode;
    }
    
    // Apply layer mask if specified - using type casting to avoid TypeScript error
    // The property exists on ParticleSystem but might not be in the interface definition
    if ((config as any).layerMask !== undefined) {
      (particleSystem as any).layerMask = (config as any).layerMask;
    }
    
    // Set custom texture if specified
    if ((config as any).textureName) {
      const texture = new BABYLON.Texture((config as any).textureName, this.scene);
      particleSystem.particleTexture = texture;
      
      // Track texture resource
      this.resourceTracker.track(texture, {
        type: ResourceType.TEXTURE,
        id: `particle_texture_${particleSystem.name}`,
        group: 'particles'
      });
    } else {
      // Use default particle texture
      particleSystem.particleTexture = new BABYLON.Texture(
        "textures/flare.png", 
        this.scene
      );
    }
    
    // Set billboard mode if specified
    if ((config as any).billboardMode !== undefined) {
      particleSystem.billboardMode = (config as any).billboardMode;
    }
    
    // Apply necessary optimizations
    particleSystem.preWarmCycles = (config as any).preWarmCycles || 0;
    particleSystem.disposeOnStop = false; // We'll manage disposal
    
    // Track the particle system
    this.resourceTracker.track(particleSystem, {
      type: ResourceType.PARTICLE_SYSTEM,
      id: particleSystem.name,
      group: 'particles',
    });
    
    // Return the configured system
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
      this.logger.error(`Error updating effect ${id}`, error as Error);
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
      (particleSystem as ExtendedParticleSystem)._jetpackLight = light;
      
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
      (particleSystem as ExtendedParticleSystem)._heatDistortion = heatLayer;
    }
    
    // Add this after creating the jetpack light
    if (config.emitLight && (particleSystem as ExtendedParticleSystem)._jetpackLight) {
      // Track the light with ResourceTracker
      this.resourceTracker.trackMesh((particleSystem as ExtendedParticleSystem)._jetpackLight as any, {
        group: `jetpack_${this.nextId}`,
        metadata: { effectType: ParticleEffectType.JETPACK }
      });
    }
    
    // Add this after creating the heat distortion
    if (config.heatDistortion && (particleSystem as ExtendedParticleSystem)._heatDistortion) {
      const heatDistortion = (particleSystem as ExtendedParticleSystem)._heatDistortion;
      if (heatDistortion) {
        // Track the distortion effect with null check
        this.resourceTracker.track(heatDistortion, {
          type: ResourceType.OTHER,
          group: `jetpack_${this.nextId}`,
          metadata: { effectType: ParticleEffectType.JETPACK, subType: 'heatDistortion' }
        });
      }
    }
    
    // Track the created particle system
    this.resourceTracker.trackParticleSystem(particleSystem, {
      group: `jetpack_${this.nextId}`,
      metadata: { effectType: ParticleEffectType.JETPACK }
    });
    
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
      (particleSystem as ExtendedParticleSystem)._distortionEffect = distortionLayer;
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
   * @returns Whether the disposal was successful
   */
  public disposeEffect(id: string): boolean {
    try {
      const system = this.particleSystems.get(id);
      if (!system) {
        this.logWarning(`Effect with ID ${id} not found for disposal`);
        return false;
      }
      
      // Get the effect type for specialized cleanup
      const effectType = this.particleTypes.get(id);
      
      // Handle extended particle systems with special cleanup requirements
      const extendedSystem = system as ExtendedParticleSystem;
      
      // Remove from our tracking maps
      this.particleSystems.delete(id);
      this.particleTypes.delete(id);
      
      // Instead of manually disposing resources, let the ResourceTracker handle it
      // The ResourceTracker will dispose all associated resources
      
      // Get the resource ID from the tracker - it might be different from our ID
      // if the resource was registered in a batch
      const resourceId = `particle_${id}`;
      
      // Try to dispose by ID first
      let disposed = this.resourceTracker.disposeResource(id);
      
      // If that fails, try by the resource ID
      if (!disposed) {
        disposed = this.resourceTracker.disposeResource(resourceId);
      }
      
      // If that also fails, try disposing by group
      if (!disposed) {
        // Try to find a group specific to this effect
        const disposedCount = this.resourceTracker.disposeByFilter({
          predicate: resource => 
            resource.metadata?.particleId === id || 
            resource.group === `effect_${id}`
        });
        
        disposed = disposedCount > 0;
      }
      
      // As a last resort, manually dispose the resources
      if (!disposed) {
        this.logWarning(`Resource tracking disposal failed for ${id}, attempting manual disposal`);
        
        // Special handling for Jetpack effects
        if (effectType === ParticleEffectType.JETPACK) {
          if (extendedSystem._jetpackLight) {
            extendedSystem._jetpackLight.dispose();
          }
          
          if (extendedSystem._heatDistortion) {
            extendedSystem._heatDistortion.dispose();
          }
        }
        
        // Special handling for Projectile trails
        if (effectType === ParticleEffectType.PROJECTILE_TRAIL) {
          if (extendedSystem._distortionEffect) {
            extendedSystem._distortionEffect.dispose();
          }
        }
        
        // Dispose the particle system itself
        system.dispose();
      }
      
      return true;
    } catch (error) {
      this.logError(`Error disposing effect ${id}: ${error}`);
      return false;
    }
  }
  
  /**
   * Dispose of all particle effects
   */
  public disposeAll(): void {
    try {
      // Get all IDs before we start removing
      const ids = Array.from(this.particleSystems.keys());
      
      // Dispose each effect
      for (const id of ids) {
        this.disposeEffect(id);
      }
      
      // Also dispose any resources that might have been missed
      this.resourceTracker.disposeByFilter({
        predicate: resource => 
          resource.metadata?.effectType !== undefined || 
          resource.group?.startsWith('effect_') ||
          resource.group === 'particles'
      });
      
      // Clear maps
      this.particleSystems.clear();
      this.particleTypes.clear();
    } catch (error) {
      this.logError(`Error disposing all effects: ${error}`);
    }
  }

  /**
   * Register an external particle system with the manager
   * @param name Name for the particle system
   * @param particleSystem The particle system to register
   * @returns ID of the registered particle system
   */
  public registerExternalParticleSystem(name: string, particleSystem: BABYLON.ParticleSystem): string {
    const id = `external_${name}_${this.nextId++}`;
    this.particleSystems.set(id, particleSystem);
    this.particleTypes.set(id, ParticleEffectType.CUSTOM);
    
    // Track with resource tracker
    this.resourceTracker.trackParticleSystem(particleSystem, {
      id,
      group: 'external_particles',
      metadata: { effectType: ParticleEffectType.CUSTOM, name }
    });
    
    return id;
  }
  
  /**
   * Set whether a particle system is emitting
   * @param id ID of the particle system
   * @param emitting Whether the system should emit particles
   * @returns Whether the operation was successful
   */
  public setEmitting(id: string, emitting: boolean): boolean {
    const particleSystem = this.particleSystems.get(id);
    if (!particleSystem) {
      this.logger.warn(`Cannot set emitting state for unknown system ${id}`);
      return false;
    }
    
    if (emitting) {
      particleSystem.start();
    } else {
      particleSystem.stop();
    }
    
    return true;
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
  public createParticleSystemFromPreset(options: ParticleSystemFromPresetOptions): string | null {
    if (!this.scene) {
      this.logError('Scene not initialized');
      return null;
    }

    try {
      // Generate particle system ID
      const id = `preset_${options.preset}_${this.nextId++}`;
      
      // Determine the effect type based on preset name
      let effectType = ParticleEffectType.CUSTOM;
      
      // Convert string preset to enum if it matches a known type
      if (Object.values(ParticleEffectType).includes(options.preset as ParticleEffectType)) {
        effectType = options.preset as ParticleEffectType;
      }
      
      // Create particle system
      const particleSystemId = this.createEffect(
        effectType,
        options.emitter,
        options.customizations
      );
      
      if (particleSystemId) {
        const particleSystem = this.particleSystems.get(particleSystemId);
        
        // Track the particle system with ResourceTracker if it exists
        if (particleSystem) {
          this.resourceTracker.trackParticleSystem(particleSystem, {
            id,
            group: 'preset_particles',
            metadata: { 
              effectType: effectType,
              presetName: options.preset,
              effectId: id
            }
          });
        }
        
        return particleSystemId;
      }
      
      return null;
    } catch (error) {
      this.logError(`Error creating particle system from preset: ${error}`);
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
      this.logger.error(`Error updating emitter position for ${id}`, error as Error);
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
      this.logger.error(`Error updating emit rate for ${id}`, error as Error);
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
      this.logger.error(`Error setting visibility for ${id}`, error as Error);
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

  /**
   * Log a warning message
   * @param message The message to log
   */
  private logWarning(message: string): void {
    this.logger.warn(message);
  }
  
  /**
   * Log an error message
   * @param message The message to log
   */
  private logError(message: string): void {
    this.logger.error(message);
  }
} 