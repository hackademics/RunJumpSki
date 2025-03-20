/**
 * @file src/core/renderer/AdaptiveRenderingSystem.ts
 * @description Adaptive rendering quality system that dynamically adjusts graphics settings
 * based on performance metrics to maintain target framerates.
 */

import * as BABYLON from 'babylonjs';
import { IPerformanceMetricsManager } from '../debug/metrics/IPerformanceMetricsManager';
import { TerrainQuality } from './terrain/TerrainRenderer';
import { ITerrainRenderer } from './terrain/ITerrainRenderer';
import { IParticleSystemManager } from './particles/IParticleSystemManager';
import { IPostProcessingManager } from './effects/IPostProcessingManager';
import { Logger } from '../utils/Logger';
import { ServiceLocator } from '../base/ServiceLocator';

/**
 * Performance thresholds for automatic quality adjustments
 */
export interface PerformanceThresholds {
  /** Target FPS to maintain */
  targetFPS: number;
  /** Low threshold below which quality will be decreased */
  lowThresholdFPS: number;
  /** High threshold above which quality will be increased */
  highThresholdFPS: number;
  /** Critical threshold below which immediate action is taken */
  criticalThresholdFPS: number;
}

/**
 * Default performance thresholds
 */
export const DEFAULT_PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
  targetFPS: 60,
  lowThresholdFPS: 45,
  highThresholdFPS: 75,
  criticalThresholdFPS: 30
};

/**
 * Configuration for adaptive rendering
 */
export interface AdaptiveRenderingConfig {
  /** Whether adaptive rendering is enabled */
  enabled: boolean;
  /** Performance thresholds for adjustments */
  thresholds: PerformanceThresholds;
  /** Time in seconds to average FPS over for stability */
  averagingPeriod: number;
  /** Minimum time between quality adjustments in seconds */
  adjustmentCooldown: number;
  /** Whether to apply adjustments to terrain rendering */
  adaptTerrain: boolean;
  /** Whether to apply adjustments to particle systems */
  adaptParticles: boolean;
  /** Whether to apply adjustments to post-processing effects */
  adaptPostProcessing: boolean;
  /** Whether to show debug/notification messages about quality changes */
  showQualityChangeNotifications: boolean;
  /** Number of samples to take before making an adjustment */
  samplesBeforeAdjustment: number;
}

/**
 * Default configuration for adaptive rendering
 */
export const DEFAULT_ADAPTIVE_RENDERING_CONFIG: AdaptiveRenderingConfig = {
  enabled: true,
  thresholds: DEFAULT_PERFORMANCE_THRESHOLDS,
  averagingPeriod: 3, // 3 seconds
  adjustmentCooldown: 5, // 5 seconds
  adaptTerrain: true,
  adaptParticles: true,
  adaptPostProcessing: true,
  showQualityChangeNotifications: true,
  samplesBeforeAdjustment: 5
};

/**
 * Quality level for adaptive adjustments
 */
export enum QualityLevel {
  VERY_LOW = 0,
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  ULTRA = 4
}

/**
 * Settings for each quality level
 */
export interface QualitySettings {
  /** Terrain quality level */
  terrainQuality: TerrainQuality;
  /** Particle system multiplier (1.0 = 100%) */
  particleMultiplier: number;
  /** Maximum number of active particle systems */
  maxParticleSystems: number;
  /** Whether to use post-processing effects */
  usePostProcessing: boolean;
  /** Shadow map size */
  shadowMapSize: number;
  /** View distance multiplier */
  viewDistanceMultiplier: number;
  /** Whether to use ambient occlusion */
  useAmbientOcclusion: boolean;
  /** Whether to use bloom effect */
  useBloom: boolean;
  /** Whether to use depth of field */
  useDepthOfField: boolean;
}

/**
 * Definition of quality settings for each quality level
 */
export const QUALITY_SETTINGS: Record<QualityLevel, QualitySettings> = {
  [QualityLevel.VERY_LOW]: {
    terrainQuality: TerrainQuality.LOW,
    particleMultiplier: 0.25,
    maxParticleSystems: 10,
    usePostProcessing: false,
    shadowMapSize: 512,
    viewDistanceMultiplier: 0.5,
    useAmbientOcclusion: false,
    useBloom: false,
    useDepthOfField: false
  },
  [QualityLevel.LOW]: {
    terrainQuality: TerrainQuality.LOW,
    particleMultiplier: 0.5,
    maxParticleSystems: 20,
    usePostProcessing: true,
    shadowMapSize: 1024,
    viewDistanceMultiplier: 0.75,
    useAmbientOcclusion: false,
    useBloom: false,
    useDepthOfField: false
  },
  [QualityLevel.MEDIUM]: {
    terrainQuality: TerrainQuality.MEDIUM,
    particleMultiplier: 1.0,
    maxParticleSystems: 30,
    usePostProcessing: true,
    shadowMapSize: 1024,
    viewDistanceMultiplier: 1.0,
    useAmbientOcclusion: true,
    useBloom: true,
    useDepthOfField: false
  },
  [QualityLevel.HIGH]: {
    terrainQuality: TerrainQuality.HIGH,
    particleMultiplier: 1.5,
    maxParticleSystems: 50,
    usePostProcessing: true,
    shadowMapSize: 2048,
    viewDistanceMultiplier: 1.25,
    useAmbientOcclusion: true,
    useBloom: true,
    useDepthOfField: true
  },
  [QualityLevel.ULTRA]: {
    terrainQuality: TerrainQuality.ULTRA,
    particleMultiplier: 2.0,
    maxParticleSystems: 100,
    usePostProcessing: true,
    shadowMapSize: 4096,
    viewDistanceMultiplier: 1.5,
    useAmbientOcclusion: true,
    useBloom: true,
    useDepthOfField: true
  }
};

/**
 * Adaptive rendering system that automatically adjusts quality settings
 * based on performance metrics
 */
export class AdaptiveRenderingSystem {
  /** Performance metrics manager */
  private metricsManager: IPerformanceMetricsManager;
  
  /** Configuration */
  private config: AdaptiveRenderingConfig;
  
  /** Current quality level */
  private currentQualityLevel: QualityLevel = QualityLevel.MEDIUM;
  
  /** Time of last adjustment */
  private lastAdjustmentTime: number = 0;
  
  /** Scene reference */
  private scene: BABYLON.Scene;
  
  /** Terrain renderer reference (optional) */
  private terrainRenderer?: ITerrainRenderer;
  
  /** Particle system manager reference (optional) */
  private particleSystemManager?: IParticleSystemManager;
  
  /** Post-processing manager reference (optional) */
  private postProcessingManager?: IPostProcessingManager;
  
  /** Performance sample buffer for stability */
  private performanceSamples: number[] = [];
  
  /** Whether system is in adjustment cooldown period */
  private inCooldown: boolean = false;
  
  /** Cooldown timer */
  private cooldownTimer: number = 0;
  
  /** Custom callback for quality changes */
  private onQualityChangeCallback?: (newLevel: QualityLevel, oldLevel: QualityLevel) => void;

  private logger: Logger;

  /**
   * Creates a new adaptive rendering system
   * @param scene The scene to manage
   * @param metricsManager Performance metrics manager
   * @param config Configuration (optional, uses defaults if not provided)
   */
  constructor(
    scene: BABYLON.Scene,
    metricsManager: IPerformanceMetricsManager,
    config?: Partial<AdaptiveRenderingConfig>
  ) {
    this.scene = scene;
    this.metricsManager = metricsManager;
    this.config = { ...DEFAULT_ADAPTIVE_RENDERING_CONFIG, ...config };
    
    // Initialize logger
    this.logger = new Logger('AdaptiveRenderingSystem');
    
    // Try to get logger from ServiceLocator if available
    try {
      const serviceLocator = ServiceLocator.getInstance();
      if (serviceLocator.has('logger')) {
        this.logger = serviceLocator.get<Logger>('logger');
        // Add context tag
        this.logger.addTag('AdaptiveRenderingSystem');
      }
    } catch (e) {
      // If service locator is not available, we'll use the default logger
    }
  }

  /**
   * Initialize the adaptive rendering system
   * @param terrainRenderer Optional terrain renderer to adjust
   * @param particleSystemManager Optional particle system manager to adjust
   * @param postProcessingManager Optional post-processing manager to adjust
   */
  public initialize(
    terrainRenderer?: ITerrainRenderer,
    particleSystemManager?: IParticleSystemManager,
    postProcessingManager?: IPostProcessingManager
  ): void {
    this.terrainRenderer = terrainRenderer;
    this.particleSystemManager = particleSystemManager;
    this.postProcessingManager = postProcessingManager;
    
    // Apply initial quality settings
    this.applyCurrentQualitySettings();
  }

  /**
   * Update the adaptive rendering system
   * @param deltaTime Time since last update in seconds
   */
  public update(deltaTime: number): void {
    if (!this.config.enabled) return;
    
    // Update cooldown timer if in cooldown
    if (this.inCooldown) {
      this.cooldownTimer += deltaTime;
      if (this.cooldownTimer >= this.config.adjustmentCooldown) {
        this.inCooldown = false;
        this.cooldownTimer = 0;
      }
      return;
    }
    
    // Get current performance metrics
    const metrics = this.metricsManager.getCurrentMetrics();
    this.performanceSamples.push(metrics.fps);
    
    // Keep only the most recent samples
    if (this.performanceSamples.length > this.config.samplesBeforeAdjustment) {
      this.performanceSamples.shift();
    }
    
    // Don't adjust until we have enough samples
    if (this.performanceSamples.length < this.config.samplesBeforeAdjustment) {
      return;
    }
    
    // Calculate average FPS
    const avgFPS = this.calculateAverageFPS();
    
    // Handle critical performance issues immediately
    if (avgFPS < this.config.thresholds.criticalThresholdFPS) {
      this.decreaseQuality(true);
      return;
    }
    
    // Check if adjustment is needed
    if (avgFPS < this.config.thresholds.lowThresholdFPS) {
      this.decreaseQuality();
    } else if (avgFPS > this.config.thresholds.highThresholdFPS) {
      this.increaseQuality();
    }
  }

  /**
   * Calculate average FPS from samples
   */
  private calculateAverageFPS(): number {
    if (this.performanceSamples.length === 0) return 0;
    
    const sum = this.performanceSamples.reduce((a, b) => a + b, 0);
    return sum / this.performanceSamples.length;
  }

  /**
   * Decrease the quality level
   * @param isCritical Whether this is a critical adjustment (skips cooldown)
   */
  private decreaseQuality(isCritical: boolean = false): void {
    if (this.currentQualityLevel <= QualityLevel.VERY_LOW) return;
    
    const oldLevel = this.currentQualityLevel;
    this.currentQualityLevel--;
    this.applyCurrentQualitySettings();
    
    // Log quality change
    this.logger.info(`Decreased quality to ${QualityLevel[this.currentQualityLevel]}`);
    
    // Call quality change callback if set
    if (this.onQualityChangeCallback) {
      this.onQualityChangeCallback(this.currentQualityLevel, oldLevel);
    }
    
    // Set cooldown unless critical
    if (!isCritical) {
      this.startCooldown();
    }
    
    // Clear samples
    this.performanceSamples = [];
  }

  /**
   * Increase the quality level
   */
  private increaseQuality(): void {
    if (this.currentQualityLevel >= QualityLevel.ULTRA) return;
    
    const oldLevel = this.currentQualityLevel;
    this.currentQualityLevel++;
    this.applyCurrentQualitySettings();
    
    // Log quality change
    this.logger.info(`Increased quality to ${QualityLevel[this.currentQualityLevel]}`);
    
    // Call quality change callback if set
    if (this.onQualityChangeCallback) {
      this.onQualityChangeCallback(this.currentQualityLevel, oldLevel);
    }
    
    // Set cooldown
    this.startCooldown();
    
    // Clear samples
    this.performanceSamples = [];
  }

  /**
   * Start the adjustment cooldown period
   */
  private startCooldown(): void {
    this.inCooldown = true;
    this.cooldownTimer = 0;
    this.lastAdjustmentTime = performance.now();
  }

  /**
   * Apply the current quality level settings
   */
  private applyCurrentQualitySettings(): void {
    const settings = QUALITY_SETTINGS[this.currentQualityLevel];
    
    // Apply terrain settings if available
    if (this.terrainRenderer && this.config.adaptTerrain) {
      this.terrainRenderer.setQuality(settings.terrainQuality);
      this.terrainRenderer.setViewDistance(
        this.terrainRenderer.getDefaultViewDistance() * settings.viewDistanceMultiplier
      );
    }
    
    // Apply particle system settings if available
    if (this.particleSystemManager && this.config.adaptParticles) {
      // There's no direct API for this in the IParticleSystemManager
      // We'll need to implement a method in ParticleSystemManager to adjust capacity
      this.setParticleSystemQuality(settings.particleMultiplier);
    }
    
    // Apply post-processing settings if available
    if (this.postProcessingManager && this.config.adaptPostProcessing) {
      this.setPostProcessingQuality(settings);
    }
    
    // Apply general scene settings
    this.setSceneQuality(settings);
  }

  /**
   * Set particle system quality
   * @param multiplier Multiplier for particle counts (1.0 = 100%)
   */
  private setParticleSystemQuality(multiplier: number): void {
    // This would need to be implemented in the particle system manager
    // For now, we can just log it
    // Log quality change
    this.logger.info(`Set particle quality multiplier to ${multiplier}`);
  }

  /**
   * Set post-processing quality
   * @param settings Quality settings to apply
   */
  private setPostProcessingQuality(settings: QualitySettings): void {
    if (!this.postProcessingManager) return;
    
    this.postProcessingManager.enableBloom(settings.useBloom);
    this.postProcessingManager.enableDepthOfField(settings.useDepthOfField);
    this.postProcessingManager.enableAmbientOcclusion(settings.useAmbientOcclusion);
  }

  /**
   * Set general scene quality
   * @param settings Quality settings to apply
   */
  private setSceneQuality(settings: QualitySettings): void {
    // Set shadow quality
    this.scene.shadowsEnabled = settings.shadowMapSize > 0;
    
    // Update shadow generators
    this.scene.lights.forEach(light => {
      if (light.shadowEnabled && light.getShadowGenerator()) {
        const shadowGenerator = light.getShadowGenerator();
        if (shadowGenerator) {
          const shadowMap = shadowGenerator.getShadowMap();
          if (shadowMap) {
            shadowMap.refreshRate = 1;
          }
          
          // Update shadow map size if supported by the shadow generator type
          if ('useKernelBlur' in shadowGenerator && shadowGenerator instanceof BABYLON.ShadowGenerator) {
            shadowGenerator.mapSize = settings.shadowMapSize;
          }
        }
      }
    });
    
    // Adjust hardware scaling level based on quality
    let hardwareScalingLevel = 1;
    if (this.currentQualityLevel <= QualityLevel.LOW) {
      hardwareScalingLevel = 0.75;
    } else if (this.currentQualityLevel === QualityLevel.VERY_LOW) {
      hardwareScalingLevel = 0.5;
    }
    
    this.scene.getEngine().setHardwareScalingLevel(hardwareScalingLevel);
  }

  /**
   * Set a callback function to be called when quality level changes
   * @param callback Function to call with new and old quality levels
   */
  public onQualityChange(callback: (newLevel: QualityLevel, oldLevel: QualityLevel) => void): void {
    this.onQualityChangeCallback = callback;
  }

  /**
   * Set the current quality level manually
   * @param level Quality level to set
   */
  public setQualityLevel(level: QualityLevel): void {
    if (level === this.currentQualityLevel) return;
    
    const oldLevel = this.currentQualityLevel;
    this.currentQualityLevel = level;
    this.applyCurrentQualitySettings();
    
    // Log quality change
    this.logger.info(`Manually set quality to ${QualityLevel[this.currentQualityLevel]}`);
    
    // Call quality change callback if set
    if (this.onQualityChangeCallback) {
      this.onQualityChangeCallback(this.currentQualityLevel, oldLevel);
    }
    
    // Clear samples
    this.performanceSamples = [];
  }

  /**
   * Get the current quality level
   * @returns Current quality level
   */
  public getQualityLevel(): QualityLevel {
    return this.currentQualityLevel;
  }

  /**
   * Get the current quality settings
   * @returns Current quality settings
   */
  public getCurrentQualitySettings(): QualitySettings {
    return QUALITY_SETTINGS[this.currentQualityLevel];
  }

  /**
   * Enable or disable adaptive rendering
   * @param enabled Whether adaptive rendering should be enabled
   */
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Check if adaptive rendering is enabled
   * @returns Whether adaptive rendering is enabled
   */
  public isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Update configuration
   * @param config New configuration (partial)
   */
  public updateConfig(config: Partial<AdaptiveRenderingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   * @returns Current configuration
   */
  public getConfig(): AdaptiveRenderingConfig {
    return { ...this.config };
  }

  /**
   * Reset the adaptive rendering system
   */
  public reset(): void {
    this.currentQualityLevel = QualityLevel.MEDIUM;
    this.performanceSamples = [];
    this.inCooldown = false;
    this.cooldownTimer = 0;
    this.applyCurrentQualitySettings();
  }
} 