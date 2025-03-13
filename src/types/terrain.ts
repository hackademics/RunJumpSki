import { Vector3, Color3, Mesh, Scene } from '@babylonjs/core';
import { SurfaceType } from './physics';

/**
 * Height map data interface
 */
export interface HeightMapData {
    /**
     * Width of the height map
     */
    width: number;

    /**
     * Height of the height map
     */
    height: number;

    /**
     * Normalized height data (0-1)
     */
    data: Float32Array;
}

/**
 * Surface map data interface
 */
export interface SurfaceMapData {
    /**
     * Width of the surface map
     */
    width: number;

    /**
     * Height of the surface map
     */
    height: number;

    /**
     * Surface type data
     */
    data: Uint8Array;
}

/**
 * Terrain chunk data interface
 */
export interface TerrainChunkData {
    /**
     * X position in chunk grid
     */
    x: number;

    /**
     * Z position in chunk grid
     */
    z: number;

    /**
     * Height map data for the chunk
     */
    heightMap: HeightMapData;

    /**
     * Surface map data for the chunk
     */
    surfaceMap?: SurfaceMapData;
}

/**
 * Terrain generation parameters
 */
export interface TerrainGenerationParams {
    /**
     * Terrain width in world units
     */
    width: number;

    /**
     * Terrain depth in world units
     */
    depth: number;

    /**
     * Resolution of the terrain (vertices per unit)
     */
    resolution: number;

    /**
     * Maximum height of the terrain
     */
    maxHeight: number;

    /**
     * Whether to use random generation
     */
    random: boolean;

    /**
     * Seed for random generation
     */
    seed?: number;

    /**
     * Number of noise octaves to use
     */
    octaves?: number;

    /**
     * Noise persistence (0-1)
     */
    persistence?: number;

    /**
     * Noise scale factor
     */
    scale?: number;

    /**
     * Whether to use chunks
     */
    useChunks?: boolean;

    /**
     * Chunk size in world units (if using chunks)
     */
    chunkSize?: number;
}

/**
 * Terrain modification options
 */
export interface TerrainModificationOptions {
    /**
     * Center position of the modification
     */
    position: Vector3;

    /**
     * Radius of the modification
     */
    radius: number;

    /**
     * Strength of the modification
     */
    strength: number;

    /**
     * Type of modification
     */
    type: 'raise' | 'lower' | 'flatten' | 'smooth' | 'noise';

    /**
     * Target height for flatten operation
     */
    targetHeight?: number;

    /**
     * Surface type to apply
     */
    surfaceType?: SurfaceType;
}

/**
 * Terrain path point interface
 */
export interface TerrainPathPoint {
    /**
     * Position of the path point
     */
    position: Vector3;

    /**
     * Width of the path at this point
     */
    width: number;

    /**
     * Surface type for the path
     */
    surfaceType: SurfaceType;
}

/**
 * Terrain path generation options
 */
export interface TerrainPathOptions {
    /**
     * Path points
     */
    points: TerrainPathPoint[];

    /**
     * Whether to smooth terrain along the path
     */
    smooth?: boolean;

    /**
     * Smoothing radius around path
     */
    smoothRadius?: number;

    /**
     * Whether to flatten the path
     */
    flatten?: boolean;

    /**
     * Path elevation above surrounding terrain
     */
    elevation?: number;
}

/**
 * Terrain feature placement options
 */
export interface TerrainFeaturePlacementOptions {
    /**
     * Position for the feature
     */
    position: Vector3;

    /**
     * Rotation of the feature in radians
     */
    rotation?: Vector3;

    /**
     * Scale of the feature
     */
    scale?: Vector3;

    /**
     * Whether to adjust the terrain to match the feature
     */
    adjustTerrain?: boolean;

    /**
     * Smoothing radius if adjusting terrain
     */
    smoothRadius?: number;
}

/**
 * Terrain material options
 */
export interface TerrainMaterialOptions {
    /**
     * Base diffuse color
     */
    baseColor?: Color3;

    /**
     * UV scale for textures
     */
    uvScale?: number;

    /**
     * Whether to use triplanar mapping
     */
    triplanar?: boolean;

    /**
     * Whether to use surface type colorization
     */
    colorBySurface?: boolean;

    /**
     * Whether to use tessellation
     */
    tessellation?: boolean;

    /**
     * Maximum tessellation subdivisions
     */
    maxTessellation?: number;
}

/**
 * Terrain chunk interface
 */
export interface ITerrainChunk {
    /**
     * X position in chunk grid
     */
    x: number;

    /**
     * Z position in chunk grid
     */
    z: number;

    /**
     * Get the mesh for this chunk
     */
    getMesh(): Mesh;

    /**
     * Get height at a specific world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     */
    getHeightAt(x: number, z: number): number;

    /**
     * Get normal at a specific world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     */
    getNormalAt(x: number, z: number): Vector3;

    /**
     * Get surface type at a specific world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     */
    getSurfaceTypeAt(x: number, z: number): SurfaceType;

    /**
     * Modify the terrain chunk
     * @param options Modification options
     */
    modify(options: TerrainModificationOptions): void;

    /**
     * Update chunk mesh after modifications
     */
    updateMesh(): void;

    /**
     * Check if a position is within this chunk
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     */
    containsPoint(x: number, z: number): boolean;

    /**
     * Get chunk bounds in world space
     */
    getBounds(): {
        minX: number;
        maxX: number;
        minZ: number;
        maxZ: number;
    };

    /**
     * Clean up resources
     */
    dispose(): void;
}

/**
 * Terrain manager interface
 */
export interface ITerrainManager {
    /**
     * Generate terrain from parameters
     * @param params Generation parameters
     */
    generateTerrain(params: TerrainGenerationParams): Promise<void>;

    /**
     * Load terrain from height map
     * @param heightMapData Height map data
     * @param surfaceMapData Optional surface map data
     */
    loadFromHeightMap(heightMapData: HeightMapData, surfaceMapData?: SurfaceMapData): Promise<void>;

    /**
     * Save terrain to height map
     */
    saveToHeightMap(): Promise<{ heightMap: HeightMapData; surfaceMap: SurfaceMapData }>;

    /**
     * Get height at a specific world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     */
    getHeightAt(x: number, z: number): number;

    /**
     * Get normal at a specific world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     */
    getNormalAt(x: number, z: number): Vector3;

    /**
     * Get surface type at a specific world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     */
    getSurfaceTypeAt(x: number, z: number): SurfaceType;

    /**
     * Get terrain data at a specific world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     */
    getTerrainDataAt(x: number, z: number): {
        height: number;
        normal: Vector3;
        surfaceType: SurfaceType;
    };

    /**
     * Modify the terrain
     * @param options Modification options
     */
    modifyTerrain(options: TerrainModificationOptions): Promise<void>;

    /**
     * Create a path on the terrain
     * @param options Path generation options
     */
    createPath(options: TerrainPathOptions): Promise<void>;

    /**
     * Place a feature on the terrain
     * @param featureId Feature identifier
     * @param options Placement options
     */
    placeFeature(featureId: string, options: TerrainFeaturePlacementOptions): Promise<void>;

    /**
     * Set terrain material options
     * @param options Material options
     */
    setMaterialOptions(options: TerrainMaterialOptions): void;

    /**
     * Get the terrain mesh
     */
    getMesh(): Mesh;

    /**
     * Get terrain dimensions
     */
    getDimensions(): {
        width: number;
        depth: number;
        maxHeight: number;
    };

    /**
     * Get chunk at a specific world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     */
    getChunkAt(x: number, z: number): ITerrainChunk | null;

    /**
     * Check if a position is within the terrain bounds
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     */
    isInBounds(x: number, z: number): boolean;

    /**
     * Clean up resources
     */
    dispose(): void;
}

/**
 * Noise generator interface for terrain generation
 */
export interface INoiseGenerator {
    /**
     * Set the seed for the noise generator
     * @param seed Seed value
     */
    setSeed(seed: number | string): void;

    /**
     * Get noise value at 2D position
     * @param x X coordinate
     * @param y Y coordinate
     */
    noise2D(x: number, y: number): number;

    /**
     * Get noise value at 3D position
     * @param x X coordinate
     * @param y Y coordinate
     * @param z Z coordinate
     */
    noise3D(x: number, y: number, z: number): number;

    /**
     * Get fractal noise at 2D position
     * @param x X coordinate
     * @param y Y coordinate
     * @param octaves Number of octaves
     * @param persistence Persistence value (0-1)
     * @param scale Scale factor
     */
    fractal2D(x: number, y: number, octaves: number, persistence: number, scale: number): number;

    /**
     * Get fractal noise at 3D position
     * @param x X coordinate
     * @param y Y coordinate
     * @param z Z coordinate
     * @param octaves Number of octaves
     * @param persistence Persistence value (0-1)
     * @param scale Scale factor
     */
    fractal3D(x: number, y: number, z: number, octaves: number, persistence: number, scale: number): number;
}

/**
 * Terrain raycast result interface
 */
export interface TerrainRaycastResult {
    /**
     * Whether the ray hit the terrain
     */
    hit: boolean;

    /**
     * Position of the hit
     */
    position?: Vector3;

    /**
     * Normal at the hit position
     */
    normal?: Vector3;

    /**
     * Distance to the hit
     */
    distance?: number;

    /**
     * Surface type at the hit position
     */
    surfaceType?: SurfaceType;
}

/**
 * Terrain raycast function signature
 */
export type TerrainRaycast = (
    origin: Vector3,
    direction: Vector3,
    maxDistance: number
) => TerrainRaycastResult; 
