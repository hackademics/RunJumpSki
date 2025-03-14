/**
 * TerrainTypes.ts
 * Defines interfaces and types for the terrain system
 */

import { Vector3 } from '../common/Vector3';
import { SurfaceType } from '../events/EventTypes';

/**
 * Represents a point on the terrain with position and surface information
 */
export interface TerrainPoint {
    /**
     * Position of the point in world space
     */
    position: Vector3;
    
    /**
     * Surface normal at this point
     */
    normal: Vector3;
    
    /**
     * Surface type at this point
     */
    surfaceType: SurfaceType;
    
    /**
     * Slope angle in degrees at this point
     */
    slope: number;
}

/**
 * Represents a chunk of terrain data
 */
export interface TerrainChunk {
    /**
     * Unique identifier for the chunk
     */
    id: string;
    
    /**
     * Position of the chunk in the world (bottom-left corner)
     */
    position: Vector3;
    
    /**
     * Width of the chunk in world units
     */
    width: number;
    
    /**
     * Depth of the chunk in world units
     */
    depth: number;
    
    /**
     * Height data for the chunk
     * 2D array of height values
     */
    heightMap: number[][];
    
    /**
     * Surface type data for the chunk
     * 2D array of surface types
     */
    surfaceMap: SurfaceType[][];
    
    /**
     * Normal data for the chunk
     * 2D array of normal vectors
     */
    normalMap: Vector3[][];
    
    /**
     * Whether this chunk has been modified since last update
     */
    isDirty: boolean;
}

/**
 * Options for terrain generation
 */
export interface TerrainGenerationOptions {
    /**
     * Width of the terrain in world units
     */
    width: number;
    
    /**
     * Depth of the terrain in world units
     */
    depth: number;
    
    /**
     * Maximum height of the terrain
     */
    maxHeight: number;
    
    /**
     * Resolution of the terrain (vertices per unit)
     */
    resolution: number;
    
    /**
     * Noise generation parameters
     */
    noise?: {
        /**
         * Number of octaves for noise generation
         */
        octaves: number;
        
        /**
         * Persistence for noise generation
         */
        persistence: number;
        
        /**
         * Scale for noise generation
         */
        scale: number;
        
        /**
         * Seed for random generation
         */
        seed: number;
    };
    
    /**
     * Path to a height map image to use for generation
     * If provided, noise parameters are ignored
     */
    heightMapPath?: string;
    
    /**
     * Whether to apply physics to the terrain
     */
    applyPhysics?: boolean;
}

/**
 * Interface for the terrain system
 */
export interface ITerrainSystem {
    /**
     * Initialize the terrain system
     */
    initialize(): void;
    
    /**
     * Generate terrain using the provided options
     * @param options Options for terrain generation
     */
    generateTerrain(options: TerrainGenerationOptions): void;
    
    /**
     * Generate terrain from a height map image
     * @param heightMapPath Path to the height map image
     * @param options Options for terrain generation
     */
    generateFromHeightMap(heightMapPath: string, options: TerrainGenerationOptions): void;
    
    /**
     * Generate terrain procedurally using noise functions
     * @param options Options for terrain generation
     */
    generateProcedural(options: TerrainGenerationOptions): void;
    
    /**
     * Get the terrain height at the specified world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     * @returns Height at the specified position, or null if out of bounds
     */
    getHeightAt(x: number, z: number): number | null;
    
    /**
     * Get the terrain normal at the specified world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     * @returns Normal vector at the specified position, or null if out of bounds
     */
    getNormalAt(x: number, z: number): Vector3 | null;
    
    /**
     * Get the surface type at the specified world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     * @returns Surface type at the specified position, or DEFAULT if out of bounds
     */
    getSurfaceTypeAt(x: number, z: number): SurfaceType;
    
    /**
     * Get complete terrain data at the specified world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     * @returns TerrainPoint with position, normal, and surface information, or null if out of bounds
     */
    getTerrainPointAt(x: number, z: number): TerrainPoint | null;
    
    /**
     * Modify the terrain height at the specified world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     * @param height New height value
     * @returns Whether the modification was successful
     */
    setHeightAt(x: number, z: number, height: number): boolean;
    
    /**
     * Modify the surface type at the specified world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     * @param surfaceType New surface type
     * @returns Whether the modification was successful
     */
    setSurfaceTypeAt(x: number, z: number, surfaceType: SurfaceType): boolean;
    
    /**
     * Update the terrain system
     * @param deltaTime Time since last update in seconds
     */
    update(deltaTime: number): void;
    
    /**
     * Render the terrain
     */
    render(): void;
    
    /**
     * Clean up resources used by the terrain system
     */
    cleanup(): void;
}

/**
 * Interface for the terrain component
 */
export interface ITerrainComponent {
    /**
     * Get the terrain height at the specified world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     * @returns Height at the specified position, or null if out of bounds
     */
    getHeightAt(x: number, z: number): number | null;
    
    /**
     * Get the terrain normal at the specified world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     * @returns Normal vector at the specified position, or null if out of bounds
     */
    getNormalAt(x: number, z: number): Vector3 | null;
    
    /**
     * Get the surface type at the specified world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     * @returns Surface type at the specified position, or DEFAULT if out of bounds
     */
    getSurfaceTypeAt(x: number, z: number): SurfaceType;
    
    /**
     * Get complete terrain data at the specified world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     * @returns TerrainPoint with position, normal, and surface information, or null if out of bounds
     */
    getTerrainPointAt(x: number, z: number): TerrainPoint | null;
} 