/**
 * @file src/core/renderer/terrain/LODTerrainSystem.ts
 * @description Level-of-Detail system for terrain rendering
 * 
 * @dependencies babylonjs
 * @relatedFiles TerrainRenderer.ts, ITerrainRenderer.ts, TerrainMaterialSystem.ts
 */
import * as BABYLON from 'babylonjs';

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
}

/**
 * Default LOD configuration
 */
export const DEFAULT_LOD_CONFIG: LODConfig = {
  enabled: true,
  maxLevel: 4,
  distances: [50, 150, 300, 600],
  bias: 1.0,
  transitionSize: 10
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
    
    // Generate LOD levels
    this.generateLODLevels();
    
    // Setup auto-update
    this.setupAutoUpdate();
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
   * Calculate appropriate LOD level for a terrain chunk
   * @param chunkCenter Center position of the chunk
   * @param chunkRadius Radius/size of the chunk
   * @returns Appropriate LOD level (0 = highest quality)
   */
  public calculateLODLevel(chunkCenter: BABYLON.Vector3, chunkRadius: number): number {
    if (!this.config.enabled) {
      return 0; // Always highest quality if LOD is disabled
    }
    
    // Calculate distance to camera
    const distance = BABYLON.Vector3.Distance(chunkCenter, this.camera.position);
    
    // Apply size bias (larger chunks need higher quality)
    const adjustedDistance = distance / (chunkRadius * this.config.bias);
    
    // Find the appropriate LOD level based on distance
    for (let i = 0; i < this.levels.length; i++) {
      if (adjustedDistance < this.levels[i].distance) {
        return i;
      }
    }
    
    // If beyond all defined distances, use lowest detail
    return this.config.maxLevel;
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
    return (distance - transitionStart) / (transitionEnd - transitionStart);
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
  }
  
  /**
   * Enable or disable automatic updates
   * @param enabled Whether auto-update should be enabled
   */
  public setAutoUpdate(enabled: boolean): void {
    if (this.autoUpdateEnabled !== enabled) {
      this.autoUpdateEnabled = enabled;
      this.setupAutoUpdate();
    }
  }
  
  /**
   * Get the current LOD configuration
   * @returns Current configuration
   */
  public getConfig(): LODConfig {
    return { ...this.config };
  }
  
  /**
   * Dispose the LOD system and release resources
   */
  public dispose(): void {
    if (this.updateObserver) {
      this.scene.onBeforeRenderObservable.remove(this.updateObserver);
      this.updateObserver = null;
    }
  }
} 