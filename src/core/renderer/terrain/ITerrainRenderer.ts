/**
 * @file src/core/renderer/terrain/ITerrainRenderer.ts
 * @description Interface for terrain rendering system with LOD and optimization features
 * 
 * @dependencies babylonjs
 * @relatedFiles TerrainRenderer.ts, LODTerrainSystem.ts, TerrainMaterialSystem.ts
 */
import * as BABYLON from 'babylonjs';

/**
 * Interface for terrain rendering system
 */
export interface ITerrainRenderer {
  /**
   * Initialize the terrain renderer
   * @param heightData The heightmap data (normalized 0-1)
   * @param width Width of the heightmap
   * @param height Height of the heightmap
   * @param terrainSize Physical size of the terrain (x, height, z)
   * @returns Promise that resolves when initialization is complete
   */
  initialize(
    heightData: Float32Array,
    width: number,
    height: number,
    terrainSize: BABYLON.Vector3
  ): Promise<void>;
  
  /**
   * Get the height at a specific world position
   * @param position The position to sample
   * @returns The terrain height at the position, or null if out of bounds
   */
  getHeightAtPosition(position: BABYLON.Vector3): number | null;
  
  /**
   * Apply a texture to the terrain based on slope and height
   * @param textures Array of texture file paths
   * @param slopeThresholds Array of slope thresholds (0-1) for each texture
   * @param heightThresholds Array of height thresholds (0-1) for each texture
   * @param tiling How many times to tile textures across the terrain
   */
  applyTexturesBySlope(
    textures: string[],
    slopeThresholds: number[],
    heightThresholds: number[],
    tiling?: number
  ): void;
  
  /**
   * Update terrain configuration
   * @param config New configuration options
   */
  updateConfig(config: Record<string, any>): void;
  
  /**
   * Get performance statistics
   * @returns Object with performance metrics
   */
  getStats(): Record<string, any>;
  
  /**
   * Release all resources
   */
  dispose(): void;
} 