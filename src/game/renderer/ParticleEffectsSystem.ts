/**
 * @file src/game/renderer/ParticleEffectsSystem.ts
 * @description Particle effects system that integrates pooled particle system manager for performance optimization
 */

import * as BABYLON from 'babylonjs';
import { System } from '../../core/base/System';
import { ISystem } from '../../core/base/ISystem';
import { ServiceLocator } from '../../core/base/ServiceLocator';
import { ILogger } from '../../core/utils/ILogger';
import { ISceneManager } from '../../core/renderer/ISceneManager';
import { PooledParticleSystemManager } from '../../core/renderer/particles/PooledParticleSystemManager';
import { ParticlePresets } from '../../core/renderer/particles/ParticlePresets';
import { JetpackParticleEffect, JetpackEffectState } from './particles/JetpackParticleEffect';
import { ExplosionParticleEffect, ExplosionType } from './particles/ExplosionParticleEffect';
import { SkiTrailParticleEffect, SurfaceType } from './particles/SkiTrailParticleEffect';
import { IEntity } from '../../core/ecs/IEntity';

/**
 * Configuration options for the particle effects system
 */
export interface ParticleEffectsSystemOptions {
  /** Initial size of the particle system pool */
  initialPoolSize: number;
  /** Maximum size of the particle system pool */
  maxPoolSize: number;
  /** Default particle limit per system */
  defaultParticleLimit: number;
  /** Whether to enable performance monitoring */
  enablePerformanceMonitoring: boolean;
  /** Enable adaptive quality based on performance */
  enableAdaptiveQuality: boolean;
}

/**
 * Default configuration for the particle effects system
 */
export const DEFAULT_PARTICLE_EFFECTS_SYSTEM_OPTIONS: ParticleEffectsSystemOptions = {
  initialPoolSize: 20,
  maxPoolSize: 100,
  defaultParticleLimit: 2000,
  enablePerformanceMonitoring: true,
  enableAdaptiveQuality: true
};

/**
 * Particle effects system that integrates pooled particle system manager for performance
 */
export class ParticleEffectsSystem extends System implements ISystem {
  /** System type identifier */
  public readonly type: string = 'particleEffectsSystem';

  /** Pooled particle system manager */
  private pooledParticleManager: PooledParticleSystemManager;

  /** Scene manager reference */
  private sceneManager: ISceneManager | null = null;
  
  /** Logger instance */
  private logger: ILogger | null = null;

  /** Current active scene */
  private scene: BABYLON.Scene | null = null;
  
  /** Specialized particle effect managers */
  private jetpackEffect: JetpackParticleEffect | null = null;
  private explosionEffect: ExplosionParticleEffect | null = null;
  private skiTrailEffect: SkiTrailParticleEffect | null = null;
  
  /** Effect ID tracking for management */
  private effectIds: Map<string, string> = new Map();
  
  /** Options for the particle effects system */
  private options: ParticleEffectsSystemOptions;

  /** Performance monitoring data */
  private performanceData = {
    activeParticleSystems: 0,
    totalParticleCount: 0,
    pooledParticleSystems: 0,
    particleCreationTimeMs: 0,
    lastUpdateTimeMs: 0,
    activeEffectCounts: {
      jetpack: 0,
      explosion: 0,
      skiTrail: 0
    }
  };

  /** Adaptive quality control */
  private qualityFactors = {
    /** Current quality factor (1.0 = full quality, 0.1 = minimum quality) */
    currentQuality: 1.0,
    /** Target FPS for adaptive quality */
    targetFPS: 60,
    /** Adjustment smoothing factor */
    smoothingFactor: 0.1,
    /** FPS history for quality decisions */
    fpsHistory: [] as number[]
  };

  /**
   * Create a new particle effects system
   */
  constructor(options: Partial<ParticleEffectsSystemOptions> = {}) {
    super();
    this.options = { ...DEFAULT_PARTICLE_EFFECTS_SYSTEM_OPTIONS, ...options };
    
    // Create pooled particle system manager
    this.pooledParticleManager = new PooledParticleSystemManager();
  }

  /**
   * Initialize the particle effects system
   */
  public async init(): Promise<void> {
    // Get services using ServiceLocator
    const serviceLocator = ServiceLocator.getInstance();
    this.logger = serviceLocator.get<ILogger>('logger');
    this.logger?.info('[ParticleEffectsSystem] Initializing particle effects system with pooled particle manager');
    
    // Retrieve scene manager
    this.sceneManager = serviceLocator.get<ISceneManager>('sceneManager');
    if (!this.sceneManager) {
      this.logger?.error('[ParticleEffectsSystem] Scene manager not found');
      throw new Error('Scene manager not found');
    }
    
    // Get the current active scene
    this.scene = this.sceneManager.getActiveScene();
    if (!this.scene) {
      this.logger?.error('[ParticleEffectsSystem] No active scene found');
      throw new Error('No active scene found');
    }
    
    // Initialize the pooled particle manager
    this.pooledParticleManager.initialize(this.scene);
    
    // Create specialized effect managers
    this.jetpackEffect = new JetpackParticleEffect();
    this.explosionEffect = new ExplosionParticleEffect();
    this.skiTrailEffect = new SkiTrailParticleEffect();
    
    this.logger?.info('[ParticleEffectsSystem] Particle effects system initialized');
  }
  
  /**
   * Initialize jetpack effects for an entity
   * @param entity The entity to attach jetpack effects to
   */
  public initializeJetpackForEntity(entity: IEntity): void {
    if (!this.scene || !this.jetpackEffect) {
      this.logger?.error('[ParticleEffectsSystem] Cannot initialize jetpack - scene or effect not ready');
      return;
    }
    
    this.jetpackEffect.initialize(this.scene, entity);
    this.logger?.info(`[ParticleEffectsSystem] Initialized jetpack effect for entity ${entity.id}`);
  }
  
  /**
   * Initialize ski trail effects for an entity
   * @param entity The entity to attach ski trail effects to
   */
  public initializeSkiTrailForEntity(entity: IEntity): void {
    if (!this.scene || !this.skiTrailEffect) {
      this.logger?.error('[ParticleEffectsSystem] Cannot initialize ski trail - scene or effect not ready');
      return;
    }
    
    this.skiTrailEffect.initialize(this.scene, entity);
    this.logger?.info(`[ParticleEffectsSystem] Initialized ski trail effect for entity ${entity.id}`);
  }
  
  /**
   * Update the particle effects system
   */
  public update(deltaTime: number): void {
    const startTime = performance.now();
    
    if (!this.scene) {
      return;
    }
    
    // Update adaptive quality if enabled
    if (this.options.enableAdaptiveQuality) {
      this.updateAdaptiveQuality(deltaTime);
    }
    
    // Update performance monitoring data if enabled
    if (this.options.enablePerformanceMonitoring) {
      this.updatePerformanceMetrics();
      
      // Log performance data every few seconds (not every frame)
      if (Math.random() < 0.01) { // ~1% chance per frame to log
        this.logger?.debug(`[ParticleEffectsSystem] Performance: ` +
          `Quality: ${(this.qualityFactors.currentQuality * 100).toFixed(0)}%`);
      }
    }
    
    this.performanceData.lastUpdateTimeMs = performance.now() - startTime;
  }
  
  /**
   * Update jetpack effect
   * @param thrustLevel Normalized thrust level (0.0 - 1.0)
   * @param isActive Whether the jetpack is active
   */
  public updateJetpackEffect(thrustLevel: number, isActive: boolean): void {
    if (!this.jetpackEffect) {
      return;
    }
    
    this.jetpackEffect.update(0.016, thrustLevel, isActive);
  }
  
  /**
   * Set jetpack effect state directly
   * @param state Jetpack effect state
   */
  public setJetpackState(state: JetpackEffectState): void {
    if (!this.jetpackEffect) {
      return;
    }
    
    this.jetpackEffect.setState(state);
  }
  
  /**
   * Create an explosion effect at the specified position
   * @param position Position to create explosion
   * @param radius Radius of the explosion
   * @param intensity Effect intensity multiplier
   */
  public createExplosion(
    position: BABYLON.Vector3,
    radius: number = 5.0,
    intensity: number = 1.0
  ): string {
    if (!this.scene || !this.explosionEffect) {
      this.logger?.error('[ParticleEffectsSystem] Cannot create explosion - scene or effect not ready');
      return '';
    }
    
    const startTime = performance.now();
    
    // Apply quality factor if adaptive quality is enabled
    const adjustedIntensity = this.options.enableAdaptiveQuality 
      ? intensity * this.qualityFactors.currentQuality
      : intensity;
    
    // Create explosion effect ID
    const effectId = `explosion_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Create the explosion - we'll use the MEDIUM type and adjust based on radius
    const explosionType = radius <= 3.0 
      ? ExplosionType.SMALL 
      : (radius <= 7.0 ? ExplosionType.MEDIUM : ExplosionType.LARGE);
    
    // Create explosion with appropriate options
    this.explosionEffect.createExplosion(this.scene, explosionType, {
      position: position,
      intensity: adjustedIntensity,
      sizeScale: radius / 5.0 // Normalize to medium explosion (radius 5.0)
    });
    
    if (this.options.enablePerformanceMonitoring) {
      this.performanceData.activeEffectCounts.explosion++;
      this.performanceData.particleCreationTimeMs = performance.now() - startTime;
    }
    
    // Track the effect
    this.effectIds.set(effectId, 'explosion');
    
    return effectId;
  }
  
  /**
   * Update ski trail effect
   * @param direction Movement direction
   * @param speed Current speed
   * @param isSkiing Whether the player is skiing
   * @param surfaceType Surface type being skied on
   * @param distanceToGround Distance from player to ground
   */
  public updateSkiTrail(
    direction: BABYLON.Vector3,
    speed: number,
    isSkiing: boolean = true,
    surfaceType: SurfaceType = SurfaceType.SNOW,
    distanceToGround: number = 0.0
  ): void {
    if (!this.skiTrailEffect) {
      return;
    }
    
    const startTime = performance.now();
    
    // Apply quality factor if adaptive quality is enabled
    const adjustedSpeed = this.options.enableAdaptiveQuality 
      ? speed * this.qualityFactors.currentQuality
      : speed;
    
    // Update the ski trail with current parameters
    this.skiTrailEffect.update(
      0.016, // Default delta time if not provided
      adjustedSpeed,
      isSkiing,
      surfaceType,
      distanceToGround
    );
    
    if (this.options.enablePerformanceMonitoring) {
      // Only increment counter first time
      if (!this.performanceData.activeEffectCounts.skiTrail && isSkiing) {
        this.performanceData.activeEffectCounts.skiTrail++;
      }
      this.performanceData.particleCreationTimeMs = performance.now() - startTime;
    }
  }
  
  /**
   * Stop a specific particle effect
   * @param effectId ID of the effect to stop
   */
  public stopEffect(effectId: string): void {
    const effectType = this.effectIds.get(effectId);
    if (!effectType) {
      this.logger?.warn(`[ParticleEffectsSystem] Could not find effect with ID: ${effectId}`);
      return;
    }
    
    // Handle based on effect type
    switch (effectType) {
      case 'jetpack':
        if (this.jetpackEffect) {
          this.jetpackEffect.setState(JetpackEffectState.OFF);
          this.performanceData.activeEffectCounts.jetpack--;
        }
        break;
        
      case 'explosion':
        // Explosions auto-stop, just update the count
        this.performanceData.activeEffectCounts.explosion--;
        break;
        
      case 'skiTrail':
        if (this.skiTrailEffect) {
          // Stop the ski trail by updating with zero speed/not skiing
          this.skiTrailEffect.update(0.016, 0, false, SurfaceType.SNOW, 0);
          this.performanceData.activeEffectCounts.skiTrail--;
        }
        break;
    }
    
    // Remove from tracking
    this.effectIds.delete(effectId);
  }
  
  /**
   * Get current particle system performance data
   */
  public getPerformanceData() {
    return { ...this.performanceData };
  }
  
  /**
   * Get current quality factor
   */
  public getCurrentQuality(): number {
    return this.qualityFactors.currentQuality;
  }
  
  /**
   * Set quality factor manually (overrides adaptive quality)
   */
  public setQualityFactor(quality: number): void {
    this.qualityFactors.currentQuality = Math.max(0.1, Math.min(1.0, quality));
    
    this.logger?.info(`[ParticleEffectsSystem] Quality factor set to ${(this.qualityFactors.currentQuality * 100).toFixed(0)}%`);
  }
  
  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    // For now, just track active effect counts since we don't have direct access to particle counts
    this.performanceData.activeParticleSystems = 
      this.performanceData.activeEffectCounts.jetpack +
      this.performanceData.activeEffectCounts.explosion +
      this.performanceData.activeEffectCounts.skiTrail;
  }
  
  /**
   * Update adaptive quality based on performance
   */
  private updateAdaptiveQuality(deltaTime: number): void {
    if (!this.scene) {
      return;
    }
    
    // Get current FPS 
    const currentFPS = 1000 / (deltaTime * 1000); // Convert deltaTime to ms
    
    // Add to history (keeping last 30 frames)
    this.qualityFactors.fpsHistory.push(currentFPS);
    if (this.qualityFactors.fpsHistory.length > 30) {
      this.qualityFactors.fpsHistory.shift();
    }
    
    // Only adjust after we have enough history
    if (this.qualityFactors.fpsHistory.length < 10) {
      return;
    }
    
    // Calculate average FPS
    const avgFPS = this.qualityFactors.fpsHistory.reduce((sum, fps) => sum + fps, 0) / 
      this.qualityFactors.fpsHistory.length;
    
    // Adjust quality factor based on performance
    if (avgFPS < this.qualityFactors.targetFPS * 0.9) {
      // Performance is poor, reduce quality
      const reduction = this.qualityFactors.smoothingFactor * 
        Math.min(0.5, (this.qualityFactors.targetFPS - avgFPS) / this.qualityFactors.targetFPS);
      
      this.qualityFactors.currentQuality = Math.max(
        0.1, 
        this.qualityFactors.currentQuality - reduction
      );
    }
    else if (avgFPS > this.qualityFactors.targetFPS * 1.1 && 
             this.qualityFactors.currentQuality < 1.0) {
      // Performance is good, try to increase quality
      const increase = this.qualityFactors.smoothingFactor * 0.1;
      
      this.qualityFactors.currentQuality = Math.min(
        1.0, 
        this.qualityFactors.currentQuality + increase
      );
    }
  }
  
  /**
   * Clean up resources
   */
  public async dispose(): Promise<void> {
    this.logger?.info('[ParticleEffectsSystem] Disposing particle effects system');
    
    if (this.jetpackEffect) {
      this.jetpackEffect.dispose();
      this.jetpackEffect = null;
    }
    
    if (this.explosionEffect) {
      this.explosionEffect.dispose();
      this.explosionEffect = null;
    }
    
    if (this.skiTrailEffect) {
      this.skiTrailEffect.dispose();
      this.skiTrailEffect = null;
    }
    
    // Clear effect tracking
    this.effectIds.clear();
    
    this.logger?.info('[ParticleEffectsSystem] Particle effects system disposed');
  }
} 