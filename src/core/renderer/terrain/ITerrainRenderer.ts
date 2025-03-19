/**
 * @file src/core/renderer/terrain/ITerrainRenderer.ts
 * @description Interface for terrain rendering system with LOD and optimization features
 * 
 * @dependencies babylonjs
 * @relatedFiles TerrainRenderer.ts, LODTerrainSystem.ts, TerrainMaterialSystem.ts
 */
import * as BABYLON from 'babylonjs';
import { TerrainQuality } from './TerrainRenderer';

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
  
  /**
   * Set the terrain rendering quality
   * @param quality The quality level to set
   */
  setQuality(quality: TerrainQuality): void;
  
  /**
   * Set the view distance for terrain rendering
   * @param distance View distance in world units
   */
  setViewDistance(distance: number): void;
  
  /**
   * Get the default view distance for terrain rendering
   * @returns Default view distance in world units
   */
  getDefaultViewDistance(): number;
  
  /**
   * Set whether to render terrain in wireframe mode
   * @param enabled Whether wireframe mode should be enabled
   */
  setWireframe(enabled: boolean): void;
  
  /**
   * Check if wireframe mode is enabled
   * @returns Whether wireframe mode is currently enabled
   */
  isWireframe(): boolean;
  
  /**
   * Get the height at the specified x, z coordinates
   * @param x X coordinate in world space
   * @param z Z coordinate in world space
   * @returns Height at the specified coordinates
   */
  getHeightAt(x: number, z: number): number;
  
  /**
   * Get the surface normal at the specified x, z coordinates
   * @param x X coordinate in world space
   * @param z Z coordinate in world space
   * @returns Normal vector at the specified coordinates
   */
  getNormalAt(x: number, z: number): BABYLON.Vector3;
  
  /**
   * Get the slope at the specified x, z coordinates
   * @param x X coordinate in world space
   * @param z Z coordinate in world space
   * @returns Slope in radians at the specified coordinates
   */
  getSlopeAt(x: number, z: number): number;
  
  /**
   * Create the terrain geometry and materials
   */
  createTerrain(): void;
  
  /**
   * Update the terrain rendering
   * @param deltaTime Time since last update in seconds
   */
  update(deltaTime: number): void;
} 