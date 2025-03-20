/**
 * @file src/core/utils/PerformanceOptimizer.ts
 * @description Central performance optimization manager for various engine systems
 */

import * as BABYLON from 'babylonjs';
import { Logger } from './Logger';
import { ServiceLocator } from '../base/ServiceLocator';
import { LODTerrainSystem, PerformanceLevel as TerrainPerformanceLevel } from '../renderer/terrain/LODTerrainSystem';
import { ParticleSystemManager, ParticleQualityLevel } from '../renderer/particles/ParticleSystemManager';
import { SpatialPartitioningCollisionSystem } from '../physics/SpatialPartitioningCollisionSystem';

/**
 * Performance profile presets
 */
export enum PerformanceProfile {
  ULTRA = 0,
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
  VERY_LOW = 4,
  AUTO = 5
}

/**
 * Optimizer configuration
 */
export interface PerformanceOptimizerConfig {
  /** Initial performance profile */
  initialProfile: PerformanceProfile;
  /** Whether to use adaptive optimization */
  adaptiveOptimization: boolean;
  /** Target framerate for adaptive optimization */
  targetFramerate: number;
  /** How frequently to check performance (ms) */
  checkInterval: number;
  /** Systems to optimize */
  systems: {
    terrain: boolean;
    particles: boolean;
    physics: boolean;
    postProcessing: boolean;
    shadows: boolean;
  };
}

/**
 * Default optimizer configuration
 */
export const DEFAULT_OPTIMIZER_CONFIG: PerformanceOptimizerConfig = {
  initialProfile: PerformanceProfile.AUTO,
  adaptiveOptimization: true,
  targetFramerate: 60,
  checkInterval: 5000,
  systems: {
    terrain: true,
    particles: true,
    physics: true,
    postProcessing: true,
    shadows: true
  }
};

/**
 * Central manager for performance optimization across multiple systems
 */
export class PerformanceOptimizer {
  private scene: BABYLON.Scene;
  private config: PerformanceOptimizerConfig;
  private logger: Logger;
  
  // Managed systems
  private lodTerrainSystem: LODTerrainSystem | null = null;
  private particleManager: ParticleSystemManager | null = null;
  private collisionSystem: SpatialPartitioningCollisionSystem | null = null;
  
  // Performance monitoring
  private performanceObserver: BABYLON.Observer<BABYLON.Scene> | null = null;
  private frameRateHistory: number[] = [];
  private frameRateHistorySize: number = 30;
  private lastPerformanceCheck: number = 0;
  private currentProfile: PerformanceProfile;
  private autoProfileDetected: PerformanceProfile = PerformanceProfile.HIGH;
  
  // Post-processing and shadow configuration for each profile
  private postProcessingQuality: Record<PerformanceProfile, number> = {
    [PerformanceProfile.ULTRA]: 1.0,
    [PerformanceProfile.HIGH]: 0.8,
    [PerformanceProfile.MEDIUM]: 0.6,
    [PerformanceProfile.LOW]: 0.4,
    [PerformanceProfile.VERY_LOW]: 0.2,
    [PerformanceProfile.AUTO]: 0.8 // Will be overridden by detected profile
  };
  
  private shadowQuality: Record<PerformanceProfile, number> = {
    [PerformanceProfile.ULTRA]: 1024,
    [PerformanceProfile.HIGH]: 1024,
    [PerformanceProfile.MEDIUM]: 512,
    [PerformanceProfile.LOW]: 256,
    [PerformanceProfile.VERY_LOW]: 256,
    [PerformanceProfile.AUTO]: 1024 // Will be overridden by detected profile
  };
  
  /**
   * Create a new performance optimizer
   * @param scene The scene to optimize
   * @param config Optimizer configuration
   */
  constructor(scene: BABYLON.Scene, config: Partial<PerformanceOptimizerConfig> = {}) {
    this.scene = scene;
    this.config = { ...DEFAULT_OPTIMIZER_CONFIG, ...config };
    
    // Initialize logger
    this.logger = new Logger('PerformanceOptimizer');
    
    // Try to get the logger from ServiceLocator
    try {
      const serviceLocator = ServiceLocator.getInstance();
      if (serviceLocator.has('logger')) {
        this.logger = serviceLocator.get<Logger>('logger');
        this.logger.addTag('PerformanceOptimizer');
      }
    } catch (e) {
      // Use default logger
    }
    
    // Set initial profile
    this.currentProfile = this.config.initialProfile;
    if (this.currentProfile === PerformanceProfile.AUTO) {
      this.detectPerformanceProfile();
      this.currentProfile = this.autoProfileDetected;
    }
    
    this.logger.debug(`PerformanceOptimizer initialized with profile: ${PerformanceProfile[this.currentProfile]}`);
  }
  
  /**
   * Initialize optimization for a terrain LOD system
   * @param lodSystem The terrain LOD system to optimize
   */
  public initializeTerrainOptimization(lodSystem: LODTerrainSystem): void {
    this.lodTerrainSystem = lodSystem;
    this.applyTerrainOptimization();
    this.logger.debug('Terrain optimization initialized');
  }
  
  /**
   * Initialize optimization for a particle system manager
   * @param particleManager The particle system manager to optimize
   */
  public initializeParticleOptimization(particleManager: ParticleSystemManager): void {
    this.particleManager = particleManager;
    this.applyParticleOptimization();
    this.logger.debug('Particle optimization initialized');
  }
  
  /**
   * Initialize optimization for a collision system
   * @param collisionSystem The collision system to optimize
   */
  public initializePhysicsOptimization(collisionSystem: SpatialPartitioningCollisionSystem): void {
    this.collisionSystem = collisionSystem;
    this.applyPhysicsOptimization();
    this.logger.debug('Physics optimization initialized');
  }
  
  /**
   * Detect appropriate performance profile based on hardware capabilities
   */
  private detectPerformanceProfile(): void {
    // Start with HIGH as default
    let detectedProfile = PerformanceProfile.HIGH;
    
    try {
      // Get engine
      const engine = this.scene.getEngine();
      
      // Try to estimate based on FPS
      const fps = engine.getFps();
      
      if (fps > 100) {
        detectedProfile = PerformanceProfile.ULTRA;
      } else if (fps > 75) {
        detectedProfile = PerformanceProfile.HIGH;
      } else if (fps > 45) {
        detectedProfile = PerformanceProfile.MEDIUM;
      } else if (fps > 30) {
        detectedProfile = PerformanceProfile.LOW;
      } else {
        detectedProfile = PerformanceProfile.VERY_LOW;
      }

      // Additional hardware capability checks
      // Check hardware instancing support as a proxy for better hardware
      const hardwareInstancingSupported = engine.getCaps().instancedArrays;
      
      // If low FPS but good hardware capabilities, maybe hardware is capable but running something intensive
      if (fps < 45 && hardwareInstancingSupported) {
        // Slightly increase our estimate in this case
        if (detectedProfile > PerformanceProfile.MEDIUM) {
          detectedProfile = PerformanceProfile.MEDIUM;
        }
      }
      // If limited hardware capabilities, cap at MEDIUM regardless of FPS
      else if (!hardwareInstancingSupported && detectedProfile < PerformanceProfile.MEDIUM) {
        detectedProfile = PerformanceProfile.MEDIUM;
      }
    } catch (e) {
      this.logger.warn('Failed to detect performance profile, using default');
    }
    
    this.autoProfileDetected = detectedProfile;
    this.logger.debug(`Auto-detected performance profile: ${PerformanceProfile[detectedProfile]}`);
  }
  
  /**
   * Start adaptive performance optimization
   */
  public startAdaptiveOptimization(): void {
    if (!this.config.adaptiveOptimization) {
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
      const fps = Math.round(this.scene.getEngine().getFps());
      
      // Add to history
      this.frameRateHistory.push(fps);
      
      // Keep history at specified size
      if (this.frameRateHistory.length > this.frameRateHistorySize) {
        this.frameRateHistory.shift();
      }
      
      // Check if it's time to evaluate performance
      const currentTime = performance.now();
      if (currentTime - this.lastPerformanceCheck >= this.config.checkInterval) {
        this.evaluatePerformance();
        this.lastPerformanceCheck = currentTime;
      }
    });
    
    this.logger.debug('Adaptive optimization started');
  }
  
  /**
   * Stop adaptive performance optimization
   */
  public stopAdaptiveOptimization(): void {
    if (this.performanceObserver) {
      this.scene.onAfterRenderObservable.remove(this.performanceObserver);
      this.performanceObserver = null;
    }
    
    this.logger.debug('Adaptive optimization stopped');
  }
  
  /**
   * Evaluate performance and adjust settings if needed
   */
  private evaluatePerformance(): void {
    if (this.frameRateHistory.length < 10) {
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
    const targetFps = this.config.targetFramerate;
    const fpsRatio = avgFps / targetFps;
    
    let newProfile = this.currentProfile;
    
    if (fpsRatio < 0.65) {
      // Significantly under target FPS, decrease quality by two levels
      newProfile = Math.min(PerformanceProfile.VERY_LOW, this.currentProfile + 2);
    } else if (fpsRatio < 0.85) {
      // Under target FPS, decrease quality by one level
      newProfile = Math.min(PerformanceProfile.VERY_LOW, this.currentProfile + 1);
    } else if (fpsRatio > 1.5 && variance < 100) {
      // Significantly over target FPS and stable, increase quality by two levels
      newProfile = Math.max(PerformanceProfile.ULTRA, this.currentProfile - 2);
    } else if (fpsRatio > 1.2 && variance < 50) {
      // Over target FPS and stable, increase quality by one level
      newProfile = Math.max(PerformanceProfile.ULTRA, this.currentProfile - 1);
    }
    
    // Apply new profile if changed
    if (newProfile !== this.currentProfile) {
      this.setPerformanceProfile(newProfile);
      this.logger.debug(`Adjusted performance profile to: ${PerformanceProfile[newProfile]} (FPS: ${avgFps.toFixed(1)}, Target: ${targetFps})`);
    }
  }
  
  /**
   * Set a specific performance profile
   * @param profile The performance profile to use
   */
  public setPerformanceProfile(profile: PerformanceProfile): void {
    if (profile === PerformanceProfile.AUTO) {
      this.detectPerformanceProfile();
      profile = this.autoProfileDetected;
    }
    
    this.currentProfile = profile;
    
    // Apply optimizations to all systems
    this.applyAllOptimizations();
    
    this.logger.debug(`Set performance profile to: ${PerformanceProfile[profile]}`);
  }
  
  /**
   * Apply all optimization settings based on current profile
   */
  private applyAllOptimizations(): void {
    if (this.config.systems.terrain) {
      this.applyTerrainOptimization();
    }
    
    if (this.config.systems.particles) {
      this.applyParticleOptimization();
    }
    
    if (this.config.systems.physics) {
      this.applyPhysicsOptimization();
    }
    
    if (this.config.systems.postProcessing) {
      this.applyPostProcessingOptimization();
    }
    
    if (this.config.systems.shadows) {
      this.applyShadowOptimization();
    }
  }
  
  /**
   * Apply terrain optimization based on current profile
   */
  private applyTerrainOptimization(): void {
    if (!this.lodTerrainSystem) {
      return;
    }
    
    // Map our performance profile to terrain performance level
    const terrainLevel = this.mapToTerrainPerformanceLevel(this.currentProfile);
    
    // Apply to terrain system
    this.lodTerrainSystem.setPerformanceLevel(terrainLevel);
    this.lodTerrainSystem.setAdaptiveQuality(false); // We handle adaptive quality centrally
  }
  
  /**
   * Apply particle optimization based on current profile
   */
  private applyParticleOptimization(): void {
    if (!this.particleManager) {
      return;
    }
    
    // Map our performance profile to particle quality level
    const particleLevel = this.mapToParticleQualityLevel(this.currentProfile);
    
    // Apply to particle manager
    this.particleManager.setQualityLevel(particleLevel);
    this.particleManager.setAdaptiveQuality(false); // We handle adaptive quality centrally
  }
  
  /**
   * Apply physics optimization based on current profile
   */
  private applyPhysicsOptimization(): void {
    if (!this.collisionSystem) {
      return;
    }
    
    // Configure spatial partitioning based on profile
    switch (this.currentProfile) {
      case PerformanceProfile.ULTRA:
        this.collisionSystem.setUseSpatialPartitioning(true);
        break;
      case PerformanceProfile.HIGH:
        this.collisionSystem.setUseSpatialPartitioning(true);
        break;
      case PerformanceProfile.MEDIUM:
        this.collisionSystem.setUseSpatialPartitioning(true);
        break;
      case PerformanceProfile.LOW:
        this.collisionSystem.setUseSpatialPartitioning(true);
        break;
      case PerformanceProfile.VERY_LOW:
        this.collisionSystem.setUseSpatialPartitioning(true);
        break;
    }
  }
  
  /**
   * Apply post-processing optimization based on current profile
   */
  private applyPostProcessingOptimization(): void {
    // Adjust post-processing effects
    // This would need to be implemented with the specific post-processing system
    const quality = this.postProcessingQuality[this.currentProfile];
    
    // Example of what this might look like:
    try {
      const postProcesses = this.scene.postProcesses;
      if (postProcesses) {
        for (let i = 0; i < postProcesses.length; i++) {
          const postProcess = postProcesses[i];
          
          // Adjust quality of each post-process
          if ('quality' in postProcess) {
            (postProcess as any).quality = quality;
          }
        }
      }
      
      // Also handle default pipelines
      if (this.scene.imageProcessingConfiguration) {
        // Adjust quality based on profile
        if (quality < 0.5) {
          // Disable more expensive effects at low quality
          this.scene.imageProcessingConfiguration.isEnabled = quality > 0.2;
        }
      }
    } catch (e) {
      this.logger.warn('Error optimizing post-processing: ' + e);
    }
  }
  
  /**
   * Apply shadow optimization based on current profile
   */
  private applyShadowOptimization(): void {
    try {
      // Get shadow generators
      const lights = this.scene.lights;
      const shadowMapSize = this.shadowQuality[this.currentProfile];
      
      for (const light of lights) {
        const shadowGenerator = light.getShadowGenerator();
        if (shadowGenerator) {
          // Get shadow map safely
          const shadowMap = shadowGenerator.getShadowMap();
          if (shadowMap) {
            // Adjust shadow map refresh rate
            shadowMap.refreshRate = this.currentProfile > PerformanceProfile.MEDIUM ? 1 : 2;
          }
          
          // If we have access to the internal shadow map size
          if ('_mapSize' in shadowGenerator) {
            (shadowGenerator as any)._mapSize = shadowMapSize;
          }
          
          // Adjust shadow quality based on profile using type assertion for specialized generator types
          // We check for these properties first to avoid type errors
          const shadowGenAny = shadowGenerator as any;
          
          if (this.currentProfile >= PerformanceProfile.LOW) {
            // Lower quality, use cheaper filtering
            if ('usePercentageCloserFiltering' in shadowGenAny) {
              shadowGenAny.usePercentageCloserFiltering = false;
            }
            if ('usePoissonSampling' in shadowGenAny) {
              shadowGenAny.usePoissonSampling = true;
            }
          } else {
            // Higher quality
            if ('usePercentageCloserFiltering' in shadowGenAny) {
              shadowGenAny.usePercentageCloserFiltering = true;
            }
            if ('usePoissonSampling' in shadowGenAny) {
              shadowGenAny.usePoissonSampling = false;
            }
          }
        }
      }
    } catch (e) {
      this.logger.warn('Error optimizing shadows: ' + e);
    }
  }
  
  /**
   * Map our performance profile to terrain performance level
   */
  private mapToTerrainPerformanceLevel(profile: PerformanceProfile): TerrainPerformanceLevel {
    switch (profile) {
      case PerformanceProfile.ULTRA:
        return TerrainPerformanceLevel.ULTRA;
      case PerformanceProfile.HIGH:
        return TerrainPerformanceLevel.HIGH;
      case PerformanceProfile.MEDIUM:
        return TerrainPerformanceLevel.MEDIUM;
      case PerformanceProfile.LOW:
        return TerrainPerformanceLevel.LOW;
      case PerformanceProfile.VERY_LOW:
        return TerrainPerformanceLevel.VERY_LOW;
      default:
        return TerrainPerformanceLevel.HIGH;
    }
  }
  
  /**
   * Map our performance profile to particle quality level
   */
  private mapToParticleQualityLevel(profile: PerformanceProfile): ParticleQualityLevel {
    switch (profile) {
      case PerformanceProfile.ULTRA:
        return ParticleQualityLevel.ULTRA;
      case PerformanceProfile.HIGH:
        return ParticleQualityLevel.HIGH;
      case PerformanceProfile.MEDIUM:
        return ParticleQualityLevel.MEDIUM;
      case PerformanceProfile.LOW:
        return ParticleQualityLevel.LOW;
      case PerformanceProfile.VERY_LOW:
        return ParticleQualityLevel.VERY_LOW;
      default:
        return ParticleQualityLevel.HIGH;
    }
  }
  
  /**
   * Get current performance profile
   */
  public getCurrentProfile(): PerformanceProfile {
    return this.currentProfile;
  }
  
  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): {
    currentProfile: PerformanceProfile;
    profileName: string;
    averageFps: number;
    targetFps: number;
    adaptiveOptimization: boolean;
  } {
    const avgFps = this.frameRateHistory.length > 0
      ? this.frameRateHistory.reduce((sum, fps) => sum + fps, 0) / this.frameRateHistory.length
      : 0;
      
    return {
      currentProfile: this.currentProfile,
      profileName: PerformanceProfile[this.currentProfile],
      averageFps: avgFps,
      targetFps: this.config.targetFramerate,
      adaptiveOptimization: this.config.adaptiveOptimization
    };
  }
  
  /**
   * Dispose of resources
   */
  public dispose(): void {
    if (this.performanceObserver) {
      this.scene.onAfterRenderObservable.remove(this.performanceObserver);
      this.performanceObserver = null;
    }
  }
} 