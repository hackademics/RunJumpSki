/**
 * @file src/core/renderer/particles/IParticleSystemManager.ts
 * @description Interface for managing particle systems and effects
 * 
 * @dependencies babylonjs
 * @relatedFiles ParticleSystemManager.ts, ParticlePresets.ts
 */
import * as BABYLON from 'babylonjs';

/**
 * Types of particle effects available in the system
 */
export enum ParticleEffectType {
  /** Explosion effect */
  EXPLOSION = 'explosion',
  /** Jetpack thrust effect */
  JETPACK = 'jetpack',
  /** Ski trail effect */
  SKI_TRAIL = 'skiTrail',
  /** Dust effect for landing/impacts */
  DUST = 'dust',
  /** Projectile trail effect */
  PROJECTILE_TRAIL = 'projectileTrail',
  /** Muzzle flash effect */
  MUZZLE_FLASH = 'muzzleFlash',
  /** Impact spark effect */
  IMPACT_SPARK = 'impactSpark',
  /** Smoke trail effect */
  SMOKE = 'smoke',
  /** Generic custom effect */
  CUSTOM = 'custom'
}

/**
 * Base options for all particle effects
 */
export interface ParticleEffectOptions {
  /** Whether the effect is enabled */
  enabled?: boolean;
  /** Base scale for the effect (1.0 = normal size) */
  scale?: number;
  /** Maximum particles to emit */
  maxParticles?: number;
  /** Emission rate (particles per second) */
  emitRate?: number;
  /** Particle minimum lifetime in seconds */
  minLifeTime?: number;
  /** Particle maximum lifetime in seconds */
  maxLifeTime?: number;
  /** Whether the effect should loop */
  loop?: boolean;
  /** How long the system should emit particles (0 = forever) */
  emitDuration?: number;
  /** Color of particles (start) */
  startColor?: BABYLON.Color4;
  /** Color of particles (end) */
  endColor?: BABYLON.Color4;
  /** Size of particles (start) */
  minSize?: number;
  /** Size of particles (end) */
  maxSize?: number;
  /** Blendmode for the particles */
  blendMode?: number;
  /** Direction of emission (normalized vector) */
  direction?: BABYLON.Vector3;
  /** Angle of emission cone in radians */
  emitConeAngle?: number;
  /** Min emission power (speed) */
  minEmitPower?: number;
  /** Max emission power (speed) */
  maxEmitPower?: number;
  /** Gravity effect on particles */
  gravity?: BABYLON.Vector3;
  /** Custom capacity override */
  capacity?: number;
  /** Layer mask for visibility */
  layerMask?: number;
  /** Should emit on local axis */
  isLocal?: boolean;
  /** Optional texture path */
  texturePath?: string;
}

/**
 * Specific options for explosion effects
 */
export interface ExplosionEffectOptions extends ParticleEffectOptions {
  /** Explosion radius */
  radius?: number;
  /** Duration of the explosion in seconds */
  duration?: number;
  /** Adds secondary smoke after initial explosion */
  includeSmoke?: boolean;
  /** Adds secondary sparks after initial explosion */
  includeSparks?: boolean;
  /** How much to randomize explosion appearance (0-1) */
  randomness?: number;
  /** Whether to include a shockwave ring */
  includeShockwave?: boolean;
}

/**
 * Specific options for jetpack effects
 */
export interface JetpackEffectOptions extends ParticleEffectOptions {
  /** Jet length */
  length?: number;
  /** Intensity of the jetpack (0-1) */
  intensity?: number;
  /** Whether to emit heat distortion */
  heatDistortion?: boolean;
  /** Whether to emit light */
  emitLight?: boolean;
  /** Light intensity if light is emitted */
  lightIntensity?: number;
  /** Light color if light is emitted */
  lightColor?: BABYLON.Color3;
}

/**
 * Specific options for ski trail effects
 */
export interface SkiTrailEffectOptions extends ParticleEffectOptions {
  /** Type of terrain being skied on */
  terrainType?: string;
  /** Player speed for trail intensity */
  speed?: number;
  /** Width of the trail */
  width?: number;
  /** How long trails should remain visible */
  fadeTime?: number;
  /** Apply trails only above minimum speed */
  minSpeed?: number;
}

/**
 * Specific options for projectile trail effects
 */
export interface ProjectileTrailEffectOptions extends ParticleEffectOptions {
  /** Trail length */
  length?: number;
  /** Whether to include air distortion */
  distortion?: boolean;
  /** Weapon/projectile type */
  weaponType?: string;
}

/**
 * Extended particle effect options including texture and box emission properties
 */
export interface ExtendedParticleEffectOptions extends ParticleEffectOptions {
  /** Texture to use for particles */
  particleTexture?: string;
  /** Minimum box coordinates for emission */
  minEmitBox?: BABYLON.Vector3;
  /** Maximum box coordinates for emission */
  maxEmitBox?: BABYLON.Vector3;
  /** Start color for particles */
  color1?: BABYLON.Color4;
  /** End color for particles */
  color2?: BABYLON.Color4;
  /** Color when particles die */
  colorDead?: BABYLON.Color4;
  /** Direction vector 1 (creates a cone between direction1 and direction2) */
  direction1?: BABYLON.Vector3;
  /** Direction vector 2 (creates a cone between direction1 and direction2) */
  direction2?: BABYLON.Vector3;
  /** Minimum angular speed of particles */
  minAngularSpeed?: number;
  /** Maximum angular speed of particles */
  maxAngularSpeed?: number;
  /** Start sprite cell ID for animated sprites */
  startSpriteCellID?: number;
  /** End sprite cell ID for animated sprites */
  endSpriteCellID?: number;
  /** Width of sprite cell for animated sprites */
  spriteCellWidth?: number;
  /** Height of sprite cell for animated sprites */
  spriteCellHeight?: number;
  /** Minimum X scale for particles */
  minScaleX?: number;
  /** Maximum X scale for particles */
  maxScaleX?: number;
  /** Minimum Y scale for particles */
  minScaleY?: number;
  /** Maximum Y scale for particles */
  maxScaleY?: number;
}

/**
 * Options for creating a particle system from a preset
 */
export interface ParticleSystemFromPresetOptions {
  /** The preset type to use as a base */
  preset: string;
  /** The emitter position or mesh */
  emitter: BABYLON.Vector3 | BABYLON.AbstractMesh;
  /** Maximum capacity for the particle system */
  capacity?: number;
  /** Whether to update particle position when emitter moves */
  updatePositionWithEmitter?: boolean;
  /** Custom property overrides for the preset */
  customizations?: Partial<ExtendedParticleEffectOptions>;
}

/**
 * Interface for managing particle systems
 */
export interface IParticleSystemManager {
  /**
   * Initialize the particle manager
   * @param scene BABYLON Scene to use for particle systems
   */
  initialize(scene: BABYLON.Scene): void;
  
  /**
   * Create a particle system effect
   * @param type Type of particle effect to create
   * @param emitter Mesh or position to emit from
   * @param options Effect options
   * @returns ID of the created effect or null if failed
   */
  createEffect(
    type: ParticleEffectType,
    emitter: BABYLON.AbstractMesh | BABYLON.Vector3,
    options?: ParticleEffectOptions
  ): string | null;
  
  /**
   * Get a particle system by ID
   * @param id ID of the particle system
   * @returns The particle system or null if not found
   */
  getParticleSystem(id: string): BABYLON.IParticleSystem | null;
  
  /**
   * Get all particle systems of a specific type
   * @param type Type of particle systems to get
   * @returns Array of particle systems matching the type
   */
  getParticleSystemsByType(type: ParticleEffectType): BABYLON.IParticleSystem[];
  
  /**
   * Start a particle effect
   * @param id ID of the effect to start
   * @returns True if successfully started
   */
  startEffect(id: string): boolean;
  
  /**
   * Stop a particle effect
   * @param id ID of the effect to stop
   * @param immediate Whether to stop immediately or let particles finish their lifecycle
   * @returns True if successfully stopped
   */
  stopEffect(id: string, immediate?: boolean): boolean;
  
  /**
   * Update a particle effect with new options
   * @param id ID of the effect to update
   * @param options New effect options
   * @returns True if update was successful
   */
  updateEffect(id: string, options: ParticleEffectOptions): boolean;
  
  /**
   * Create an explosion effect at a position
   * @param position Position for the explosion
   * @param options Explosion effect options
   * @returns ID of the created effect
   */
  createExplosion(position: BABYLON.Vector3, options?: ExplosionEffectOptions): string | null;
  
  /**
   * Create a jetpack effect attached to a mesh
   * @param emitter Mesh to attach the jetpack effect to
   * @param options Jetpack effect options
   * @returns ID of the created effect
   */
  createJetpackEffect(emitter: BABYLON.AbstractMesh, options?: JetpackEffectOptions): string | null;
  
  /**
   * Create a ski trail effect
   * @param emitter Mesh to emit the ski trail from
   * @param options Ski trail effect options
   * @returns ID of the created effect
   */
  createSkiTrailEffect(emitter: BABYLON.AbstractMesh, options?: SkiTrailEffectOptions): string | null;
  
  /**
   * Create a projectile trail effect
   * @param emitter Mesh to emit the projectile trail from
   * @param options Projectile trail effect options 
   * @returns ID of the created effect
   */
  createProjectileTrailEffect(emitter: BABYLON.AbstractMesh, options?: ProjectileTrailEffectOptions): string | null;
  
  /**
   * Dispose of a particle effect
   * @param id ID of the effect to dispose
   * @returns True if successfully disposed
   */
  disposeEffect(id: string): boolean;
  
  /**
   * Dispose of all particle effects
   */
  disposeAll(): void;
  
  /**
   * Create a particle system from a predefined preset with customizations
   * @param options Options for creating the particle system from preset
   * @returns ID of the created particle system
   */
  createParticleSystemFromPreset(options: ParticleSystemFromPresetOptions): string | null;
  
  /**
   * Update the emitter position of a particle system
   * @param id ID of the particle system
   * @param position New position for the emitter
   * @returns Whether the update was successful
   */
  updateEmitterPosition(id: string, position: BABYLON.Vector3): boolean;
  
  /**
   * Update the emit rate of a particle system
   * @param id ID of the particle system
   * @param emitRate New emit rate (particles per second)
   * @returns Whether the update was successful
   */
  updateEmitRate(id: string, emitRate: number): boolean;
  
  /**
   * Set visibility of a particle system
   * @param id ID of the particle system
   * @param visible Whether the particle system should be visible
   * @returns Whether the visibility change was successful
   */
  setSystemVisible(id: string, visible: boolean): boolean;
  
  /**
   * Remove a particle system
   * @param id ID of the particle system to remove
   * @returns Whether the removal was successful
   */
  removeParticleSystem(id: string): boolean;
  
  /**
   * Dispose of the ParticleSystemManager and all managed particle systems
   */
  dispose(): void;
} 