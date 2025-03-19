/**
 * @file src/core/physics/ITerrainCollider.ts
 * @description Interface for terrain collision detection and surface information.
 */

import * as BABYLON from 'babylonjs';

/**
 * Terrain surface data at a specific point
 */
export interface TerrainSurfaceInfo {
  /**
   * Whether there is terrain at the given position
   */
  exists: boolean;
  
  /**
   * Height of the terrain at the given position
   */
  height: number;
  
  /**
   * Surface normal at the given position
   */
  normal: BABYLON.Vector3;
  
  /**
   * Slope angle in radians
   */
  slope: number;
  
  /**
   * Surface material type at the given position
   */
  materialType?: string;
  
  /**
   * Surface friction coefficient
   */
  friction: number;
}

/**
 * Ray hit information for terrain
 */
export interface TerrainRaycastHit {
  /**
   * Whether the ray hit any terrain
   */
  hit: boolean;
  
  /**
   * Position of the hit in world space
   */
  position: BABYLON.Vector3;
  
  /**
   * Surface normal at the hit position
   */
  normal: BABYLON.Vector3;
  
  /**
   * Distance from the ray origin to the hit point
   */
  distance: number;
  
  /**
   * Terrain surface data at the hit point
   */
  surfaceInfo: TerrainSurfaceInfo;
}

/**
 * Heightmap-based terrain data
 */
export interface HeightmapData {
  /**
   * Width of the heightmap
   */
  width: number;
  
  /**
   * Height of the heightmap
   */
  height: number;
  
  /**
   * Raw height data as a flat array
   */
  heights: Float32Array;
  
  /**
   * Minimum height value in the heightmap
   */
  minHeight: number;
  
  /**
   * Maximum height value in the heightmap
   */
  maxHeight: number;
  
  /**
   * Horizontal scale (x/z) of the heightmap
   */
  scale: BABYLON.Vector2;
  
  /**
   * Vertical scale (y) of the heightmap
   */
  verticalScale: number;
}

/**
 * Interface for terrain collision detection
 */
export interface ITerrainCollider {
  /**
   * Initializes the terrain collider.
   * @param scene The Babylon.js scene
   */
  initialize(scene: BABYLON.Scene): void;
  
  /**
   * Updates the terrain collider.
   * @param deltaTime Time elapsed since the last update
   */
  update(deltaTime: number): void;
  
  /**
   * Sets the terrain heightmap data.
   * @param heightmapData The heightmap data
   */
  setHeightmapData(heightmapData: HeightmapData): void;
  
  /**
   * Sets the terrain mesh.
   * @param terrainMesh The terrain mesh to use for collision
   */
  setTerrainMesh(terrainMesh: BABYLON.Mesh): void;
  
  /**
   * Gets the height of the terrain at the given position.
   * @param position The position to check
   * @returns The height at the given position, or null if outside terrain bounds
   */
  getHeightAt(position: BABYLON.Vector2 | BABYLON.Vector3): number | null;
  
  /**
   * Gets terrain surface information at the given position.
   * @param position The position to check
   * @returns Surface information at the given position
   */
  getSurfaceInfoAt(position: BABYLON.Vector2 | BABYLON.Vector3): TerrainSurfaceInfo;
  
  /**
   * Performs a raycast against the terrain.
   * @param from The starting position of the ray
   * @param direction The direction of the ray
   * @param maxDistance The maximum distance of the ray
   * @returns Information about the hit, or null if no hit occurred
   */
  raycast(from: BABYLON.Vector3, direction: BABYLON.Vector3, maxDistance?: number): TerrainRaycastHit | null;
  
  /**
   * Checks if an object is on the ground.
   * @param position The position to check
   * @param radius The radius of the object
   * @param height The height of the object above its center
   * @returns The ground position and normal if on ground, null otherwise
   */
  checkGrounded(
    position: BABYLON.Vector3,
    radius: number,
    height: number
  ): { position: BABYLON.Vector3; normal: BABYLON.Vector3; surfaceInfo: TerrainSurfaceInfo } | null;
  
  /**
   * Gets the physics impostor for the terrain.
   * @returns The physics impostor for the terrain, if any
   */
  getTerrainImpostor(): BABYLON.PhysicsImpostor | null;
  
  /**
   * Performs a sphere cast against the terrain.
   * @param from The starting position of the sphere
   * @param to The end position of the sphere
   * @param radius The radius of the sphere
   * @returns Information about the hit, or null if no hit occurred
   */
  sphereCast(from: BABYLON.Vector3, to: BABYLON.Vector3, radius: number): TerrainRaycastHit | null;
  
  /**
   * Registers a callback for when an object hits the terrain.
   * @param callback The callback to invoke
   * @returns An ID that can be used to unregister the callback
   */
  registerTerrainHitCallback(
    callback: (hit: { object: BABYLON.AbstractMesh; surfaceInfo: TerrainSurfaceInfo }) => void
  ): string;
  
  /**
   * Unregisters a terrain hit callback.
   * @param id The ID of the callback to unregister
   */
  unregisterTerrainHitCallback(id: string): void;
  
  /**
   * Adds a terrain material type with its properties.
   * @param name The name of the material type
   * @param friction The friction coefficient of the material
   * @param region The region in the terrain where this material applies (x1, z1, x2, z2) or null for texture-based
   */
  addTerrainMaterial(name: string, friction: number, region?: { x1: number; z1: number; x2: number; z2: number }): void;
  
  /**
   * Cleans up resources used by the terrain collider.
   */
  dispose(): void;
}
