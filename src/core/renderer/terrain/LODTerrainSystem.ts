/**
 * @file src/core/renderer/terrain/LODTerrainSystem.ts
 * @description Level-of-Detail system for terrain rendering
 * 
 * @dependencies babylonjs
 * @relatedFiles TerrainRenderer.ts, ITerrainRenderer.ts, TerrainMaterialSystem.ts
 */
import * as BABYLON from 'babylonjs';
import { Logger } from '../../utils/Logger';
import { ServiceLocator } from '../../base/ServiceLocator';

/**
 * Performance scaling levels for dynamic LOD adjustment
 */
export enum PerformanceLevel {
  ULTRA = 0,
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
  VERY_LOW = 4
}

/**
 * LOD configuration for terrain rendering
 */
export interface LODConfig {
  /** Whether to use dynamic LOD */
  enabled: boolean;
  /** Maximum LOD level to use (higher = lower quality) */
  maxLevel: number;
  /** Distance thresholds for each LOD level */
  distances: number[];
  /** Bias factor for LOD selection (higher = favor higher quality) */
  bias: number;
  /** Transition region size (to prevent popping) */
  transitionSize: number;
  /** Enable performance-based adaptive LOD adjustment */
  adaptiveQuality: boolean;
  /** Target framerate for adaptive quality adjustments */
  targetFramerate: number;
  /** Performance level override (null means auto) */
  performanceLevel: PerformanceLevel | null;
  /** How quickly to adjust LOD based on performance (0-1, higher = faster) */
  adaptationSpeed: number;
  /** How frequently to check performance in milliseconds */
  performanceCheckInterval: number;
}

/**
 * Default LOD configuration
 */
export const DEFAULT_LOD_CONFIG: LODConfig = {
  enabled: true,
  maxLevel: 4,
  distances: [50, 150, 300, 600],
  bias: 1.0,
  transitionSize: 10,
  adaptiveQuality: true,
  targetFramerate: 60,
  performanceLevel: null,
  adaptationSpeed: 0.1,
  performanceCheckInterval: 2000
};

/**
 * Performance presets for different hardware capabilities
 */
export const PERFORMANCE_PRESETS: Record<PerformanceLevel, Partial<LODConfig>> = {
  [PerformanceLevel.ULTRA]: {
    maxLevel: 3,
    distances: [80, 250, 500, 1000],
    bias: 1.5,
    transitionSize: 15
  },
  [PerformanceLevel.HIGH]: {
    maxLevel: 4,
    distances: [50, 150, 300, 600],
    bias: 1.0,
    transitionSize: 10
  },
  [PerformanceLevel.MEDIUM]: {
    maxLevel: 4,
    distances: [40, 120, 240, 480],
    bias: 0.8,
    transitionSize: 8
  },
  [PerformanceLevel.LOW]: {
    maxLevel: 5,
    distances: [30, 90, 180, 360, 720],
    bias: 0.6,
    transitionSize: 5
  },
  [PerformanceLevel.VERY_LOW]: {
    maxLevel: 5,
    distances: [20, 60, 120, 240, 480],
    bias: 0.4,
    transitionSize: 3
  }
};

/**
 * LOD level information
 */
export interface LODLevel {
  /** Level number (0 = highest quality) */
  level: number;
  /** Reduction factor for vertex density (power of 2) */
  reduction: number;
  /** Distance at which this LOD becomes active */
  distance: number;
  /** Vertex count for this LOD level (as a ratio of max) */
  vertexRatio: number;
}

/**
 * Level-of-Detail system for terrain rendering
 */
export class LODTerrainSystem {
  private scene: BABYLON.Scene;
  private camera: BABYLON.Camera;
  private config: LODConfig;
  private levels: LODLevel[] = [];
  private currentCameraPosition: BABYLON.Vector3 = new BABYLON.Vector3();
  private autoUpdateEnabled: boolean = true;
  private updateObserver: BABYLON.Observer<BABYLON.Scene> | null = null;
  private performanceObserver: BABYLON.Observer<BABYLON.Scene> | null = null;
  private frameRateHistory: number[] = [];
  private frameRateHistorySize: number = 20;
  private currentPerformanceLevel: PerformanceLevel = PerformanceLevel.HIGH;
  private lastPerformanceCheck: number = 0;
  private adaptiveBias: number = 1.0;
  private logger: Logger;
  
  /**
   * Create a new LOD system for terrain
   * @param scene The scene to attach to
   * @param camera The primary camera for LOD calculations
   * @param config LOD configuration
   */
  constructor(
    scene: BABYLON.Scene,
    camera: BABYLON.Camera,
    config: Partial<LODConfig> = {}
  ) {
    this.scene = scene;
    this.camera = camera;
    this.config = { ...DEFAULT_LOD_CONFIG, ...config };
    
    // Initialize logger
    this.logger = new Logger('LODTerrainSystem');
    
    // Try to get the logger from ServiceLocator
    try {
      const serviceLocator = ServiceLocator.getInstance();
      if (serviceLocator.has('logger')) {
        this.logger = serviceLocator.get<Logger>('logger');
        this.logger.addTag('LODTerrainSystem');
      }
    } catch (e) {
      // Use default logger
    }
    
    // Set performance level based on config or auto-detect
    if (this.config.performanceLevel !== null) {
      this.currentPerformanceLevel = this.config.performanceLevel;
    } else {
      this.autoDetectPerformanceLevel();
    }
    
    // Apply performance preset to config
    this.applyPerformancePreset(this.currentPerformanceLevel);
    
    // Generate LOD levels
    this.generateLODLevels();
    
    // Setup auto-update
    this.setupAutoUpdate();
    
    // Setup performance monitoring
    if (this.config.adaptiveQuality) {
      this.setupPerformanceMonitoring();
    }
    
    this.logger.debug(`LODTerrainSystem initialized with performance level: ${PerformanceLevel[this.currentPerformanceLevel]}`);
  }
  
  /**
   * Auto-detect initial performance level based on device capabilities
   */
  private autoDetectPerformanceLevel(): void {
    // Start with HIGH as default
    let performanceLevel = PerformanceLevel.HIGH;
    
    // Try to detect based on device capabilities
    // Get an estimate of hardware capability (higher = weaker hardware)
    let hardwareScalingLevel = 1.0;
    
    try {
      // Get engine info (FPS, GPU info, etc)
      const fps = this.scene.getEngine().getFps();
      
      // Estimate based on current FPS if we have any
      if (typeof fps === 'number') {
        if (fps > 100) {
          hardwareScalingLevel = 0.6; // Very powerful
        } else if (fps > 75) {
          hardwareScalingLevel = 0.8; // Powerful
        } else if (fps > 45) {
          hardwareScalingLevel = 1.0; // Average
        } else if (fps > 30) {
          hardwareScalingLevel = 1.4; // Weak
        } else {
          hardwareScalingLevel = 1.8; // Very weak
        }
      }
      
      // Try to determine if WebGL 2.0 is available
      try {
        // Check WebGL version by checking if key WebGL 2.0 features are available
        const gl = this.scene.getEngine().getRenderingCanvas()?.getContext('webgl2');
        if (gl) {
          // WebGL 2.0 is available
          hardwareScalingLevel *= 0.9;
        }
      } catch (e) {
        // Unable to check WebGL version
      }
    } catch (e) {
      this.logger.warn('Failed to detect hardware capabilities, using default');
    }
    
    // Hardware scaling level is between 0.5 (powerful) and 2.0 (weak)
    if (hardwareScalingLevel <= 0.6) {
      performanceLevel = PerformanceLevel.ULTRA;
    } else if (hardwareScalingLevel <= 0.8) {
      performanceLevel = PerformanceLevel.HIGH;
    } else if (hardwareScalingLevel <= 1.2) {
      performanceLevel = PerformanceLevel.MEDIUM;
    } else if (hardwareScalingLevel <= 1.6) {
      performanceLevel = PerformanceLevel.LOW;
    } else {
      performanceLevel = PerformanceLevel.VERY_LOW;
    }
    
    this.currentPerformanceLevel = performanceLevel;
  }
  
  /**
   * Apply a performance preset to the current configuration
   */
  private applyPerformancePreset(level: PerformanceLevel): void {
    const preset = PERFORMANCE_PRESETS[level];
    
    // Apply preset to config
    this.config = { ...this.config, ...preset };
    
    // Set adaptive bias based on performance level
    this.adaptiveBias = 1.0 - (level * 0.15);
  }
  
  /**
   * Generate LOD level information
   */
  private generateLODLevels(): void {
    this.levels = [];
    
    // Create LOD levels (0 is highest quality)
    for (let i = 0; i <= this.config.maxLevel; i++) {
      const reduction = Math.pow(2, i);
      const distance = i < this.config.distances.length 
        ? this.config.distances[i] 
        : (this.config.distances[this.config.distances.length - 1] * (i - this.config.distances.length + 2));
      
      const level: LODLevel = {
        level: i,
        reduction,
        distance,
        vertexRatio: 1 / (reduction * reduction)
      };
      
      this.levels.push(level);
    }
    
    this.logger.debug(`Generated ${this.levels.length} LOD levels`);
  }
  
  /**
   * Setup auto-update system
   */
  private setupAutoUpdate(): void {
    // Remove any existing observer
    if (this.updateObserver) {
      this.scene.onBeforeRenderObservable.remove(this.updateObserver);
      this.updateObserver = null;
    }
    
    // Add new observer if auto-update is enabled
    if (this.autoUpdateEnabled) {
      this.updateObserver = this.scene.onBeforeRenderObservable.add(() => {
        // Only update if camera has moved significantly
        if (BABYLON.Vector3.Distance(this.camera.position, this.currentCameraPosition) > 1) {
          this.currentCameraPosition.copyFrom(this.camera.position);
          // Any additional update logic could go here
        }
      });
    }
  }
  
  /**
   * Setup performance monitoring for adaptive quality
   */
  private setupPerformanceMonitoring(): void {
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
      if (currentTime - this.lastPerformanceCheck >= this.config.performanceCheckInterval) {
        this.evaluatePerformance();
        this.lastPerformanceCheck = currentTime;
      }
    });
  }
  
  /**
   * Evaluate performance and adjust LOD settings if needed
   */
  private evaluatePerformance(): void {
    if (!this.config.adaptiveQuality || this.frameRateHistory.length < 5) {
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
    
    // If performance level is manually set, don't auto-adjust
    if (this.config.performanceLevel !== null) {
      return;
    }
    
    // Adjust LOD bias based on performance
    if (fpsRatio < 0.7) {
      // Significantly under target FPS, decrease quality
      this.adjustQualityDown();
    } else if (fpsRatio < 0.85) {
      // Moderately under target FPS, slightly decrease quality
      this.adaptiveBias = Math.max(0.2, this.adaptiveBias - this.config.adaptationSpeed);
    } else if (fpsRatio > 1.3 && variance < 100) {
      // Significantly over target FPS and stable, increase quality
      this.adjustQualityUp();
    } else if (fpsRatio > 1.1 && variance < 50) {
      // Moderately over target FPS and stable, slightly increase quality
      this.adaptiveBias = Math.min(1.5, this.adaptiveBias + this.config.adaptationSpeed * 0.5);
    }
    
    this.logger.debug(`Performance: FPS=${avgFps.toFixed(1)}, Target=${targetFps}, Variance=${variance.toFixed(1)}, Bias=${this.adaptiveBias.toFixed(2)}`);
  }
  
  /**
   * Decrease quality level when performance is poor
   */
  private adjustQualityDown(): void {
    if (this.currentPerformanceLevel < PerformanceLevel.VERY_LOW) {
      this.currentPerformanceLevel++;
      this.applyPerformancePreset(this.currentPerformanceLevel);
      this.generateLODLevels();
      this.logger.debug(`Adjusted quality down to: ${PerformanceLevel[this.currentPerformanceLevel]}`);
    } else {
      // Already at lowest quality, try reducing bias further
      this.adaptiveBias = Math.max(0.1, this.adaptiveBias - this.config.adaptationSpeed * 2);
    }
  }
  
  /**
   * Increase quality level when performance is good
   */
  private adjustQualityUp(): void {
    if (this.currentPerformanceLevel > PerformanceLevel.ULTRA) {
      this.currentPerformanceLevel--;
      this.applyPerformancePreset(this.currentPerformanceLevel);
      this.generateLODLevels();
      this.logger.debug(`Adjusted quality up to: ${PerformanceLevel[this.currentPerformanceLevel]}`);
    } else {
      // Already at highest quality, try increasing bias further
      this.adaptiveBias = Math.min(1.8, this.adaptiveBias + this.config.adaptationSpeed);
    }
  }
  
  /**
   * Calculate the LOD level to use for a terrain chunk
   * @param chunkCenter The center point of the chunk
   * @param chunkRadius The radius of the chunk's bounding sphere
   * @returns The LOD level to use (0 = highest quality)
   */
  public calculateLODLevel(chunkCenter: BABYLON.Vector3, chunkRadius: number): number {
    if (!this.config.enabled) {
      return 0; // If LOD disabled, use highest quality
    }
    
    // Track camera movements to optimize LOD calculations
    if (!this.currentCameraPosition.equals(this.camera.position)) {
      this.currentCameraPosition.copyFrom(this.camera.position);
    }
    
    // Calculate distance from camera to chunk center
    const directionToChunk = chunkCenter.subtract(this.camera.position);
    const distanceToChunk = directionToChunk.length();
    
    // Factor in chunk radius to get approximate screen space coverage
    // This helps larger chunks maintain higher detail when close
    const adjustedDistance = Math.max(1, distanceToChunk - chunkRadius);
    
    // Account for adaptive bias (performance adjustments)
    const effectiveBias = this.config.bias * this.adaptiveBias;
    
    // Determine appropriate LOD level based on distance
    let lodLevel = 0;
    for (let i = 0; i < this.config.distances.length; i++) {
      const thresholdDistance = this.config.distances[i] * effectiveBias;
      if (adjustedDistance > thresholdDistance) {
        lodLevel = i + 1;
      } else {
        break;
      }
    }
    
    // Ensure we don't exceed the configured max level
    lodLevel = Math.min(lodLevel, this.config.maxLevel);
    
    return lodLevel;
  }
  
  /**
   * Calculate blending factor between two LOD levels for smooth transitions
   * @param distance Distance to camera
   * @param lowerLOD Lower LOD level (higher quality)
   * @param higherLOD Higher LOD level (lower quality)
   * @returns Blend factor between 0 (use lowerLOD) and 1 (use higherLOD)
   */
  public calculateLODBlendFactor(
    distance: number,
    lowerLOD: number,
    higherLOD: number
  ): number {
    if (!this.config.enabled || this.config.transitionSize <= 0) {
      return 0; // No blending if transitions disabled
    }
    
    // Get boundary distance between these LOD levels
    const boundaryDistance = this.levels[lowerLOD].distance;
    
    // Calculate how far into the transition zone we are
    const transitionStart = boundaryDistance - this.config.transitionSize / 2;
    const transitionEnd = boundaryDistance + this.config.transitionSize / 2;
    
    if (distance <= transitionStart) {
      return 0; // Fully use lower LOD (higher quality)
    }
    
    if (distance >= transitionEnd) {
      return 1; // Fully use higher LOD (lower quality)
    }
    
    // Calculate blend factor (0-1)
    const factor = (distance - transitionStart) / (transitionEnd - transitionStart);
    
    // Use smoother transition curve (ease in/out)
    return smoothStep(0, 1, factor);
  }
  
  /**
   * Get LOD level information
   * @param level LOD level (0 = highest quality)
   * @returns LOD level information or null if invalid
   */
  public getLODLevelInfo(level: number): LODLevel | null {
    if (level < 0 || level >= this.levels.length) {
      return null;
    }
    
    return this.levels[level];
  }
  
  /**
   * Get all LOD levels
   * @returns Array of all LOD levels
   */
  public getAllLODLevels(): LODLevel[] {
    return [...this.levels];
  }
  
  /**
   * Enable or disable LOD system
   * @param enabled Whether LOD should be enabled
   */
  public setEnabled(enabled: boolean): void {
    if (this.config.enabled !== enabled) {
      this.config.enabled = enabled;
    }
  }
  
  /**
   * Set performance level explicitly (overrides auto-detection)
   * @param level Performance level to use, or null for auto
   */
  public setPerformanceLevel(level: PerformanceLevel | null): void {
    // Set performance level
    this.config.performanceLevel = level;
    
    if (level !== null) {
      this.currentPerformanceLevel = level;
      this.applyPerformancePreset(level);
      this.generateLODLevels();
      this.logger.debug(`Manually set performance level to: ${PerformanceLevel[level]}`);
    } else {
      this.autoDetectPerformanceLevel();
      this.applyPerformancePreset(this.currentPerformanceLevel);
      this.generateLODLevels();
      this.logger.debug(`Switched to auto performance detection: ${PerformanceLevel[this.currentPerformanceLevel]}`);
    }
  }
  
  /**
   * Enable or disable adaptive quality
   * @param enabled Whether adaptive quality should be enabled
   */
  public setAdaptiveQuality(enabled: boolean): void {
    this.config.adaptiveQuality = enabled;
    
    if (enabled && !this.performanceObserver) {
      this.setupPerformanceMonitoring();
    } else if (!enabled && this.performanceObserver) {
      this.scene.onAfterRenderObservable.remove(this.performanceObserver);
      this.performanceObserver = null;
    }
  }
  
  /**
   * Update LOD configuration
   * @param config New configuration (partial)
   */
  public updateConfig(config: Partial<LODConfig>): void {
    // Store old config
    const oldConfig = { ...this.config };
    
    // Update config
    this.config = { ...this.config, ...config };
    
    // Regenerate levels if necessary
    if (
      config.maxLevel !== undefined || 
      config.distances !== undefined
    ) {
      this.generateLODLevels();
    }
    
    // Update auto-update if necessary
    if (config.enabled !== oldConfig.enabled) {
      this.setupAutoUpdate();
    }
    
    // Update performance monitoring if necessary
    if (
      config.adaptiveQuality !== oldConfig.adaptiveQuality ||
      config.performanceCheckInterval !== oldConfig.performanceCheckInterval
    ) {
      if (this.config.adaptiveQuality) {
        this.setupPerformanceMonitoring();
      }
    }
  }
  
  /**
   * Enable or disable auto-update
   * @param enabled Whether auto-update should be enabled
   */
  public setAutoUpdate(enabled: boolean): void {
    if (this.autoUpdateEnabled !== enabled) {
      this.autoUpdateEnabled = enabled;
      this.setupAutoUpdate();
    }
  }
  
  /**
   * Get current configuration
   * @returns Current LOD configuration
   */
  public getConfig(): LODConfig {
    return { ...this.config };
  }
  
  /**
   * Get current performance metrics
   * @returns Object with performance data
   */
  public getPerformanceMetrics(): {
    averageFps: number;
    targetFps: number;
    currentLevel: PerformanceLevel;
    levelName: string;
    adaptiveBias: number;
  } {
    const avgFps = this.frameRateHistory.length > 0
      ? this.frameRateHistory.reduce((sum, fps) => sum + fps, 0) / this.frameRateHistory.length
      : 0;
      
    return {
      averageFps: avgFps,
      targetFps: this.config.targetFramerate,
      currentLevel: this.currentPerformanceLevel,
      levelName: PerformanceLevel[this.currentPerformanceLevel],
      adaptiveBias: this.adaptiveBias
    };
  }
  
  /**
   * Dispose of resources
   */
  public dispose(): void {
    if (this.updateObserver) {
      this.scene.onBeforeRenderObservable.remove(this.updateObserver);
      this.updateObserver = null;
    }
    
    if (this.performanceObserver) {
      this.scene.onAfterRenderObservable.remove(this.performanceObserver);
      this.performanceObserver = null;
    }
  }
}

/**
 * Smooth step function for blending - Smoother than linear interpolation
 * @param min Minimum value
 * @param max Maximum value
 * @param x Input value (0-1)
 * @returns Smoothed value
 */
function smoothStep(min: number, max: number, x: number): number {
  if (x <= 0) return min;
  if (x >= 1) return max;
  
  // Use cubic interpolation: 3x² - 2x³
  const t = x * x * (3 - 2 * x);
  
  return min + t * (max - min);
} 