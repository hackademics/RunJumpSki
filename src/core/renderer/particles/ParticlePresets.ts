/**
 * @file src/core/renderer/particles/ParticlePresets.ts
 * @description Predefined particle effect presets for common game effects
 * 
 * @dependencies babylonjs
 * @relatedFiles ParticleSystemManager.ts, IParticleSystemManager.ts
 */
import * as BABYLON from 'babylonjs';
import { 
  ParticleEffectOptions, 
  ExplosionEffectOptions, 
  JetpackEffectOptions,
  SkiTrailEffectOptions,
  ProjectileTrailEffectOptions 
} from './IParticleSystemManager';

/**
 * Preset identifiers for common particle effect types
 */
export enum ParticlePresets {
  // Basic effects
  EXPLOSION = 'explosion',
  FLAME = 'flame',
  SMOKE = 'smoke',
  SPARK = 'spark',
  DUST = 'dust',
  DEBRIS = 'debris',
  SHOCKWAVE = 'shockwave',
  IMPACT = 'impact',
  
  // Weapon effects
  MUZZLE_FLASH = 'muzzleFlash',
  BULLET_TRAIL = 'bulletTrail',
  SPINFUSOR_TRAIL = 'spinfusorTrail',
  
  // Environment effects
  RAIN = 'rain',
  SNOW = 'snow',
  DUST_WIND = 'dustWind',
  LEAVES = 'leaves',
  
  // Player effects
  FOOTSTEP = 'footstep',
  BLOOD = 'blood',
  JETPACK = 'jetpack',
  SKI_TRAIL = 'skiTrail'
}

/**
 * Default base options for all particle effects
 */
export const DEFAULT_PARTICLE_OPTIONS: ParticleEffectOptions = {
  enabled: true,
  scale: 1.0,
  maxParticles: 1000,
  emitRate: 100,
  minLifeTime: 0.5,
  maxLifeTime: 1.5,
  loop: false,
  emitDuration: 0,
  startColor: new BABYLON.Color4(1, 1, 1, 1),
  endColor: new BABYLON.Color4(1, 1, 1, 0),
  minSize: 0.1,
  maxSize: 0.5,
  blendMode: BABYLON.ParticleSystem.BLENDMODE_STANDARD,
  direction: new BABYLON.Vector3(0, 1, 0),
  emitConeAngle: Math.PI / 6,
  minEmitPower: 1,
  maxEmitPower: 3,
  gravity: new BABYLON.Vector3(0, -9.8, 0),
  isLocal: false
};

// --------------------------------
// Explosion effect presets
// --------------------------------

/**
 * Default explosion effect options
 */
export const DEFAULT_EXPLOSION_OPTIONS: ExplosionEffectOptions = {
  ...DEFAULT_PARTICLE_OPTIONS,
  maxParticles: 500,
  emitRate: 500,
  minLifeTime: 0.3,
  maxLifeTime: 1.0,
  emitDuration: 0.2,
  startColor: new BABYLON.Color4(1, 0.7, 0.3, 1),
  endColor: new BABYLON.Color4(0.5, 0.1, 0.1, 0),
  minSize: 0.3,
  maxSize: 2,
  emitConeAngle: Math.PI,
  minEmitPower: 10,
  maxEmitPower: 20,
  radius: 3,
  duration: 1.0,
  includeSmoke: true,
  includeSparks: true,
  randomness: 0.4,
  includeShockwave: true,
  texturePath: 'assets/textures/particles/explosion.png'
};

/**
 * Small explosion preset
 */
export const SMALL_EXPLOSION_PRESET: ExplosionEffectOptions = {
  ...DEFAULT_EXPLOSION_OPTIONS,
  maxParticles: 200,
  emitRate: 200,
  minSize: 0.2,
  maxSize: 1,
  radius: 1.5,
  minEmitPower: 5,
  maxEmitPower: 10,
  includeShockwave: false
};

/**
 * Large explosion preset
 */
export const LARGE_EXPLOSION_PRESET: ExplosionEffectOptions = {
  ...DEFAULT_EXPLOSION_OPTIONS,
  maxParticles: 800,
  emitRate: 800,
  minSize: 0.5,
  maxSize: 3,
  radius: 6,
  minEmitPower: 15,
  maxEmitPower: 30
};

/**
 * Spinfusor explosion preset
 */
export const SPINFUSOR_EXPLOSION_PRESET: ExplosionEffectOptions = {
  ...DEFAULT_EXPLOSION_OPTIONS,
  maxParticles: 600,
  emitRate: 600,
  startColor: new BABYLON.Color4(0.2, 0.4, 1, 1),
  endColor: new BABYLON.Color4(0.1, 0.2, 0.5, 0),
  radius: 4,
  texturePath: 'assets/textures/particles/spinfusor_explosion.png'
};

// --------------------------------
// Jetpack effect presets
// --------------------------------

/**
 * Default jetpack effect options
 */
export const DEFAULT_JETPACK_OPTIONS: JetpackEffectOptions = {
  ...DEFAULT_PARTICLE_OPTIONS,
  maxParticles: 300,
  emitRate: 150,
  minLifeTime: 0.1,
  maxLifeTime: 0.5,
  startColor: new BABYLON.Color4(1, 0.7, 0.2, 0.8),
  endColor: new BABYLON.Color4(0.3, 0.3, 0.3, 0),
  minSize: 0.1,
  maxSize: 0.5,
  emitConeAngle: Math.PI / 8,
  minEmitPower: 5,
  maxEmitPower: 10,
  loop: true,
  length: 2,
  intensity: 1,
  heatDistortion: true,
  emitLight: true,
  lightIntensity: 2,
  lightColor: new BABYLON.Color3(1, 0.6, 0.1),
  isLocal: true,
  texturePath: 'assets/textures/particles/jetpack_flame.png'
};

/**
 * Low-power jetpack preset
 */
export const LOW_POWER_JETPACK_PRESET: JetpackEffectOptions = {
  ...DEFAULT_JETPACK_OPTIONS,
  maxParticles: 100,
  emitRate: 80,
  minSize: 0.05,
  maxSize: 0.3,
  length: 1,
  intensity: 0.5,
  lightIntensity: 1
};

/**
 * High-power jetpack preset
 */
export const HIGH_POWER_JETPACK_PRESET: JetpackEffectOptions = {
  ...DEFAULT_JETPACK_OPTIONS,
  maxParticles: 500,
  emitRate: 250,
  minSize: 0.15,
  maxSize: 0.7,
  length: 3,
  intensity: 1.5,
  lightIntensity: 3
};

// --------------------------------
// Ski trail effect presets
// --------------------------------

/**
 * Default ski trail effect options
 */
export const DEFAULT_SKI_TRAIL_OPTIONS: SkiTrailEffectOptions = {
  ...DEFAULT_PARTICLE_OPTIONS,
  maxParticles: 200,
  emitRate: 50,
  minLifeTime: 0.5,
  maxLifeTime: 1.5,
  startColor: new BABYLON.Color4(1, 1, 1, 0.6),
  endColor: new BABYLON.Color4(1, 1, 1, 0),
  minSize: 0.1,
  maxSize: 0.3,
  emitConeAngle: Math.PI / 12,
  minEmitPower: 0.2,
  maxEmitPower: 0.5,
  loop: true,
  terrainType: 'snow',
  speed: 0,
  width: 0.5,
  fadeTime: 2.0,
  minSpeed: 5,
  texturePath: 'assets/textures/particles/dust.png'
};

/**
 * Snow ski trail preset
 */
export const SNOW_SKI_TRAIL_PRESET: SkiTrailEffectOptions = {
  ...DEFAULT_SKI_TRAIL_OPTIONS,
  terrainType: 'snow',
  startColor: new BABYLON.Color4(0.95, 0.95, 1, 0.7),
  endColor: new BABYLON.Color4(0.95, 0.95, 1, 0)
};

/**
 * Dirt ski trail preset
 */
export const DIRT_SKI_TRAIL_PRESET: SkiTrailEffectOptions = {
  ...DEFAULT_SKI_TRAIL_OPTIONS,
  terrainType: 'dirt',
  startColor: new BABYLON.Color4(0.6, 0.5, 0.4, 0.7),
  endColor: new BABYLON.Color4(0.6, 0.5, 0.4, 0)
};

/**
 * Sand ski trail preset
 */
export const SAND_SKI_TRAIL_PRESET: SkiTrailEffectOptions = {
  ...DEFAULT_SKI_TRAIL_OPTIONS,
  terrainType: 'sand',
  startColor: new BABYLON.Color4(0.9, 0.8, 0.6, 0.7),
  endColor: new BABYLON.Color4(0.9, 0.8, 0.6, 0)
};

// --------------------------------
// Projectile trail effect presets
// --------------------------------

/**
 * Default projectile trail effect options
 */
export const DEFAULT_PROJECTILE_TRAIL_OPTIONS: ProjectileTrailEffectOptions = {
  ...DEFAULT_PARTICLE_OPTIONS,
  maxParticles: 100,
  emitRate: 60,
  minLifeTime: 0.2,
  maxLifeTime: 0.5,
  startColor: new BABYLON.Color4(1, 1, 1, 0.7),
  endColor: new BABYLON.Color4(0.5, 0.5, 0.5, 0),
  minSize: 0.05,
  maxSize: 0.2,
  emitConeAngle: Math.PI / 20,
  minEmitPower: 0.1,
  maxEmitPower: 0.3,
  loop: true,
  length: 1.5,
  distortion: false,
  weaponType: 'default',
  texturePath: 'assets/textures/particles/smoke.png'
};

/**
 * Spinfusor projectile trail preset
 */
export const SPINFUSOR_TRAIL_PRESET: ProjectileTrailEffectOptions = {
  ...DEFAULT_PROJECTILE_TRAIL_OPTIONS,
  startColor: new BABYLON.Color4(0.2, 0.4, 1, 0.7),
  endColor: new BABYLON.Color4(0.1, 0.2, 0.5, 0),
  length: 2,
  distortion: true,
  weaponType: 'spinfusor',
  texturePath: 'assets/textures/particles/spinfusor_trail.png'
};

/**
 * Grenade trail preset
 */
export const GRENADE_TRAIL_PRESET: ProjectileTrailEffectOptions = {
  ...DEFAULT_PROJECTILE_TRAIL_OPTIONS,
  maxParticles: 50,
  emitRate: 30,
  startColor: new BABYLON.Color4(0.7, 0.7, 0.7, 0.5),
  endColor: new BABYLON.Color4(0.5, 0.5, 0.5, 0),
  length: 0.8,
  weaponType: 'grenade'
};

// --------------------------------
// Additional effect presets
// --------------------------------

/**
 * Default dust impact effect options
 */
export const DEFAULT_DUST_OPTIONS: ParticleEffectOptions = {
  ...DEFAULT_PARTICLE_OPTIONS,
  maxParticles: 30,
  emitRate: 100,
  minLifeTime: 0.3,
  maxLifeTime: 1.0,
  emitDuration: 0.1,
  startColor: new BABYLON.Color4(0.8, 0.8, 0.8, 0.6),
  endColor: new BABYLON.Color4(0.8, 0.8, 0.8, 0),
  minSize: 0.2,
  maxSize: 0.8,
  emitConeAngle: Math.PI / 4,
  minEmitPower: 0.5,
  maxEmitPower: 1.5,
  texturePath: 'assets/textures/particles/dust.png'
};

/**
 * Default muzzle flash effect options
 */
export const DEFAULT_MUZZLE_FLASH_OPTIONS: ParticleEffectOptions = {
  ...DEFAULT_PARTICLE_OPTIONS,
  maxParticles: 20,
  emitRate: 60,
  minLifeTime: 0.05,
  maxLifeTime: 0.1,
  emitDuration: 0.05,
  startColor: new BABYLON.Color4(1, 0.8, 0.4, 1),
  endColor: new BABYLON.Color4(1, 0.5, 0.2, 0),
  minSize: 0.1,
  maxSize: 0.3,
  emitConeAngle: Math.PI / 8,
  minEmitPower: 2,
  maxEmitPower: 4,
  texturePath: 'assets/textures/particles/muzzle_flash.png'
};

/**
 * Default impact spark effect options
 */
export const DEFAULT_IMPACT_SPARK_OPTIONS: ParticleEffectOptions = {
  ...DEFAULT_PARTICLE_OPTIONS,
  maxParticles: 50,
  emitRate: 200,
  minLifeTime: 0.1,
  maxLifeTime: 0.3,
  emitDuration: 0.1,
  startColor: new BABYLON.Color4(1, 0.9, 0.5, 1),
  endColor: new BABYLON.Color4(1, 0.7, 0.3, 0),
  minSize: 0.05,
  maxSize: 0.15,
  emitConeAngle: Math.PI / 2,
  minEmitPower: 2,
  maxEmitPower: 5,
  texturePath: 'assets/textures/particles/spark.png'
};

/**
 * Get terrain-specific ski trail preset based on terrain type
 * @param terrainType Type of terrain
 * @returns Appropriate ski trail preset for the terrain
 */
export function getSkiTrailPresetForTerrain(terrainType: string): SkiTrailEffectOptions {
  switch (terrainType.toLowerCase()) {
    case 'snow':
      return SNOW_SKI_TRAIL_PRESET;
    case 'dirt':
    case 'mud':
      return DIRT_SKI_TRAIL_PRESET;
    case 'sand':
      return SAND_SKI_TRAIL_PRESET;
    default:
      // Default to snow
      return SNOW_SKI_TRAIL_PRESET;
  }
}

/**
 * Get explosion preset based on size and type
 * @param size Size of explosion ('small', 'medium', 'large')
 * @param type Type of explosion (e.g., 'spinfusor')
 * @returns Appropriate explosion preset
 */
export function getExplosionPreset(size: string, type?: string): ExplosionEffectOptions {
  // Check for specific weapon type first
  if (type === 'spinfusor') {
    return SPINFUSOR_EXPLOSION_PRESET;
  }
  
  // Otherwise determine by size
  switch (size.toLowerCase()) {
    case 'small':
      return SMALL_EXPLOSION_PRESET;
    case 'large':
      return LARGE_EXPLOSION_PRESET;
    case 'medium':
    default:
      return DEFAULT_EXPLOSION_OPTIONS;
  }
}

/**
 * Scale a particle effect options based on intensity
 * @param baseOptions Base options to scale
 * @param intensity Intensity factor (1.0 = 100% normal size/power)
 * @returns Scaled options
 */
export function scaleParticleEffect<T extends ParticleEffectOptions>(
  baseOptions: T, 
  intensity: number
): T {
  const scaled = { ...baseOptions };
  
  // Don't allow negative intensity
  const factor = Math.max(0, intensity);
  
  // Scale particle count and emission rate
  if (scaled.maxParticles !== undefined) {
    scaled.maxParticles = Math.round(scaled.maxParticles * factor);
  }
  
  if (scaled.emitRate !== undefined) {
    scaled.emitRate = scaled.emitRate * factor;
  }
  
  // Scale sizes
  if (scaled.minSize !== undefined) {
    scaled.minSize = scaled.minSize * factor;
  }
  
  if (scaled.maxSize !== undefined) {
    scaled.maxSize = scaled.maxSize * factor;
  }
  
  // Scale power
  if (scaled.minEmitPower !== undefined) {
    scaled.minEmitPower = scaled.minEmitPower * factor;
  }
  
  if (scaled.maxEmitPower !== undefined) {
    scaled.maxEmitPower = scaled.maxEmitPower * factor;
  }
  
  return scaled;
} 