/**
 * TerrainSystem.ts
 * Implements the terrain system for the game
 */

import { Vector3 } from '../../types/common/Vector3';
import { SurfaceType } from '../../types/events/EventTypes';
import { 
    ITerrainSystem, 
    TerrainGenerationOptions, 
    TerrainPoint, 
    TerrainChunk 
} from '../../types/terrain/TerrainTypes';
import { TerrainConfig } from '../../config/TerrainConfig';
import { Logger } from '../../utils/Logger';
import { generateUUID } from '../../utils/UUID';

/**
 * Terrain dimensions
 */
export interface TerrainDimensions {
    /**
     * Width of the terrain in world units
     */
    width: number;
    
    /**
     * Depth of the terrain in world units
     */
    depth: number;
    
    /**
     * Maximum height of the terrain in world units
     */
    maxHeight: number;
}

/**
 * Terrain system options
 */
export interface TerrainSystemOptions {
    /**
     * Width of the terrain in world units
     */
    width?: number;
    
    /**
     * Depth of the terrain in world units
     */
    depth?: number;
    
    /**
     * Maximum height of the terrain in world units
     */
    maxHeight?: number;
    
    // ... other existing options ...
}

/**
 * Implementation of the terrain system
 */
export class TerrainSystem implements ITerrainSystem {
    /**
     * Logger instance
     */
    private logger: Logger;
    
    /**
     * Terrain chunks
     */
    private chunks: Map<string, TerrainChunk>;
    
    /**
     * Whether the terrain system has been initialized
     */
    private initialized: boolean;
    
    /**
     * Noise function for procedural generation
     */
    private noise: (x: number, y: number) => number;
    
    /**
     * Width of the terrain
     */
    private width: number = 500;
    
    /**
     * Depth of the terrain
     */
    private depth: number = 500;
    
    /**
     * Maximum height of the terrain
     */
    private maxHeight: number = 100;
    
    /**
     * Creates a new TerrainSystem
     * @param options Terrain system options
     */
    constructor(options: TerrainSystemOptions = {}) {
        this.logger = new Logger('TerrainSystem');
        this.chunks = new Map<string, TerrainChunk>();
        this.initialized = false;
        
        // Initialize properties from options
        this.width = options.width || this.width;
        this.depth = options.depth || this.depth;
        this.maxHeight = options.maxHeight || this.maxHeight;
        
        // Simple Perlin noise implementation
        this.noise = (x: number, y: number) => {
            // This is a placeholder for a proper noise function
            // In a real implementation, we would use a library like simplex-noise
            return Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5 + 0.5;
        };
    }
    
    /**
     * Initialize the terrain system
     */
    public initialize(): void {
        if (this.initialized) {
            this.logger.warn('TerrainSystem already initialized');
            return;
        }
        
        this.logger.info('Initializing TerrainSystem');
        this.initialized = true;
    }
    
    /**
     * Generate terrain using the provided options
     * @param options Options for terrain generation
     */
    public generateTerrain(options: TerrainGenerationOptions): void {
        if (!this.initialized) {
            this.logger.error('TerrainSystem not initialized');
            return;
        }
        
        this.logger.info('Generating terrain', options);
        
        if (options.heightMapPath) {
            this.generateFromHeightMap(options.heightMapPath, options);
        } else {
            this.generateProcedural(options);
        }
    }
    
    /**
     * Generate terrain from a height map image
     * @param heightMapPath Path to the height map image
     * @param options Options for terrain generation
     */
    public generateFromHeightMap(heightMapPath: string, options: TerrainGenerationOptions): void {
        this.logger.info(`Generating terrain from height map: ${heightMapPath}`);
        
        // In a real implementation, we would load the image and use its pixel data
        // For now, we'll just generate procedural terrain
        this.generateProcedural(options);
    }
    
    /**
     * Generate terrain procedurally using noise functions
     * @param options Options for terrain generation
     */
    public generateProcedural(options: TerrainGenerationOptions): void {
        this.logger.info('Generating procedural terrain');
        
        const width = options.width || TerrainConfig.dimensions.width;
        const depth = options.depth || TerrainConfig.dimensions.depth;
        const maxHeight = options.maxHeight || TerrainConfig.dimensions.maxHeight;
        const resolution = options.resolution || TerrainConfig.dimensions.resolution;
        
        const noiseOptions = options.noise || TerrainConfig.noise;
        
        // Calculate grid dimensions
        const gridWidth = Math.ceil(width * resolution);
        const gridDepth = Math.ceil(depth * resolution);
        
        // Create a single chunk for now
        // In a real implementation, we would create multiple chunks
        const chunk: TerrainChunk = {
            id: generateUUID(),
            position: new Vector3(0, 0, 0),
            width,
            depth,
            heightMap: [],
            surfaceMap: [],
            normalMap: [],
            isDirty: true
        };
        
        // Generate height map
        for (let z = 0; z <= gridDepth; z++) {
            chunk.heightMap[z] = [];
            chunk.surfaceMap[z] = [];
            chunk.normalMap[z] = [];
            
            for (let x = 0; x <= gridWidth; x++) {
                // Calculate world coordinates
                const worldX = (x / resolution);
                const worldZ = (z / resolution);
                
                // Generate height using multiple octaves of noise
                let height = 0;
                let amplitude = 1;
                let frequency = 1;
                
                for (let i = 0; i < noiseOptions.octaves; i++) {
                    const noiseX = worldX * noiseOptions.scale * frequency;
                    const noiseZ = worldZ * noiseOptions.scale * frequency;
                    
                    height += this.noise(noiseX, noiseZ) * amplitude;
                    
                    amplitude *= noiseOptions.persistence;
                    frequency *= 2;
                }
                
                // Normalize height to [0, 1]
                height = Math.max(0, Math.min(1, height));
                
                // Scale height to maxHeight
                height *= maxHeight;
                
                // Store height
                chunk.heightMap[z][x] = height;
                
                // Determine surface type based on height and slope
                chunk.surfaceMap[z][x] = this.determineSurfaceType(height / maxHeight, 0);
                
                // Initialize normal (will be calculated later)
                chunk.normalMap[z][x] = new Vector3(0, 1, 0);
            }
        }
        
        // Calculate normals
        this.calculateNormals(chunk);
        
        // Add chunk to the map
        this.chunks.set(chunk.id, chunk);
        
        this.logger.info(`Generated terrain with ${gridWidth}x${gridDepth} vertices`);
    }
    
    /**
     * Calculate normals for a terrain chunk
     * @param chunk Terrain chunk
     */
    private calculateNormals(chunk: TerrainChunk): void {
        const gridWidth = chunk.heightMap[0].length - 1;
        const gridDepth = chunk.heightMap.length - 1;
        
        for (let z = 0; z <= gridDepth; z++) {
            for (let x = 0; x <= gridWidth; x++) {
                // Get heights of neighboring vertices
                const left = x > 0 ? chunk.heightMap[z][x - 1] : chunk.heightMap[z][x];
                const right = x < gridWidth ? chunk.heightMap[z][x + 1] : chunk.heightMap[z][x];
                const top = z > 0 ? chunk.heightMap[z - 1][x] : chunk.heightMap[z][x];
                const bottom = z < gridDepth ? chunk.heightMap[z + 1][x] : chunk.heightMap[z][x];
                
                // Calculate normal using central difference
                const normal = new Vector3(
                    left - right,
                    2.0,
                    top - bottom
                );
                
                // Normalize
                normal.normalize();
                
                // Store normal
                chunk.normalMap[z][x] = normal;
                
                // Calculate slope angle in degrees
                const slopeAngle = Math.acos(normal.y) * (180 / Math.PI);
                
                // Update surface type based on slope
                const normalizedHeight = chunk.heightMap[z][x] / chunk.width;
                chunk.surfaceMap[z][x] = this.determineSurfaceType(
                    normalizedHeight,
                    slopeAngle
                );
            }
        }
    }
    
    /**
     * Determine surface type based on height and slope
     * @param normalizedHeight Height normalized to [0, 1]
     * @param slopeAngle Slope angle in degrees
     * @returns Surface type
     */
    private determineSurfaceType(normalizedHeight: number, slopeAngle: number): SurfaceType {
        try {
            // Normalize height to [0, 1] if it's outside that range
            normalizedHeight = Math.max(0, Math.min(1, normalizedHeight));
            
            // Get height-based probabilities
            let heightProbs;
            if (normalizedHeight < 0.3) {
                heightProbs = TerrainConfig.surfaces.heightProbabilities.low;
            } else if (normalizedHeight < 0.7) {
                heightProbs = TerrainConfig.surfaces.heightProbabilities.medium;
            } else {
                heightProbs = TerrainConfig.surfaces.heightProbabilities.high;
            }
            
            // Get slope-based probabilities
            let slopeProbs;
            if (slopeAngle < 15) {
                slopeProbs = TerrainConfig.surfaces.slopeProbabilities.flat;
            } else if (slopeAngle < 30) {
                slopeProbs = TerrainConfig.surfaces.slopeProbabilities.medium;
            } else if (slopeAngle < 45) {
                slopeProbs = TerrainConfig.surfaces.slopeProbabilities.steep;
            } else {
                slopeProbs = TerrainConfig.surfaces.slopeProbabilities.verysteep;
            }
            
            // Combine probabilities (simple average for now)
            const combinedProbs = new Map<SurfaceType, number>();
            
            // Add probabilities for each surface type
            // Use string keys to access the probability objects
            if (heightProbs[SurfaceType.SNOW] !== undefined && slopeProbs[SurfaceType.SNOW] !== undefined) {
                combinedProbs.set(SurfaceType.SNOW, 
                    (heightProbs[SurfaceType.SNOW] + slopeProbs[SurfaceType.SNOW]) / 2);
            }
            
            if (heightProbs[SurfaceType.ICE] !== undefined && slopeProbs[SurfaceType.ICE] !== undefined) {
                combinedProbs.set(SurfaceType.ICE, 
                    (heightProbs[SurfaceType.ICE] + slopeProbs[SurfaceType.ICE]) / 2);
            }
            
            if (heightProbs[SurfaceType.ROCK] !== undefined && slopeProbs[SurfaceType.ROCK] !== undefined) {
                combinedProbs.set(SurfaceType.ROCK, 
                    (heightProbs[SurfaceType.ROCK] + slopeProbs[SurfaceType.ROCK]) / 2);
            }
            
            // If no valid surface types were found, return default
            if (combinedProbs.size === 0) {
                return SurfaceType.DEFAULT;
            }
            
            // Determine surface type based on probabilities
            const random = Math.random();
            let cumulativeProbability = 0;
            
            // Sort surface types by probability (highest first)
            const sortedEntries = Array.from(combinedProbs.entries())
                .sort((a, b) => b[1] - a[1]);
            
            for (const [surfaceType, probability] of sortedEntries) {
                cumulativeProbability += probability;
                
                if (random <= cumulativeProbability) {
                    return surfaceType;
                }
            }
            
            // Default to snow
            return SurfaceType.SNOW;
        } catch (error) {
            this.logger.error(`Error determining surface type: ${error}`);
            return SurfaceType.DEFAULT;
        }
    }
    
    /**
     * Get the terrain height at the specified world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     * @returns Height at the specified position, or null if out of bounds
     */
    public getHeightAt(x: number, z: number): number | null {
        const terrainPoint = this.getTerrainPointAt(x, z);
        return terrainPoint ? terrainPoint.position.y : null;
    }
    
    /**
     * Get the terrain normal at the specified world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     * @returns Normal vector at the specified position, or null if out of bounds
     */
    public getNormalAt(x: number, z: number): Vector3 | null {
        const terrainPoint = this.getTerrainPointAt(x, z);
        return terrainPoint ? terrainPoint.normal : null;
    }
    
    /**
     * Get the surface type at the specified world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     * @returns Surface type at the specified position, or DEFAULT if out of bounds
     */
    public getSurfaceTypeAt(x: number, z: number): SurfaceType {
        const terrainPoint = this.getTerrainPointAt(x, z);
        return terrainPoint ? terrainPoint.surfaceType : SurfaceType.DEFAULT;
    }
    
    /**
     * Get complete terrain data at the specified world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     * @returns TerrainPoint with position, normal, and surface information, or null if out of bounds
     */
    public getTerrainPointAt(x: number, z: number): TerrainPoint | null {
        // Find the chunk that contains the point
        // For now, we only have one chunk
        if (this.chunks.size === 0) {
            return null;
        }
        
        const chunk = this.chunks.values().next().value as TerrainChunk;
        
        // Check if the point is within the chunk bounds
        if (x < 0 || x >= chunk.width || z < 0 || z >= chunk.depth) {
            return null;
        }
        
        // Calculate grid coordinates
        const resolution = TerrainConfig.dimensions.resolution;
        const gridX = Math.floor(x * resolution);
        const gridZ = Math.floor(z * resolution);
        
        // Get the four surrounding grid points
        const x0 = gridX;
        const x1 = Math.min(gridX + 1, chunk.heightMap[0].length - 1);
        const z0 = gridZ;
        const z1 = Math.min(gridZ + 1, chunk.heightMap.length - 1);
        
        // Get heights at the four points
        const h00 = chunk.heightMap[z0][x0];
        const h10 = chunk.heightMap[z0][x1];
        const h01 = chunk.heightMap[z1][x0];
        const h11 = chunk.heightMap[z1][x1];
        
        // Calculate interpolation factors
        const fx = (x * resolution) - x0;
        const fz = (z * resolution) - z0;
        
        // Bilinear interpolation of height
        const height = 
            h00 * (1 - fx) * (1 - fz) +
            h10 * fx * (1 - fz) +
            h01 * (1 - fx) * fz +
            h11 * fx * fz;
        
        // Get normals at the four points
        const n00 = chunk.normalMap[z0][x0];
        const n10 = chunk.normalMap[z0][x1];
        const n01 = chunk.normalMap[z1][x0];
        const n11 = chunk.normalMap[z1][x1];
        
        // Bilinear interpolation of normal
        const normal = new Vector3(
            n00.x * (1 - fx) * (1 - fz) + n10.x * fx * (1 - fz) + n01.x * (1 - fx) * fz + n11.x * fx * fz,
            n00.y * (1 - fx) * (1 - fz) + n10.y * fx * (1 - fz) + n01.y * (1 - fx) * fz + n11.y * fx * fz,
            n00.z * (1 - fx) * (1 - fz) + n10.z * fx * (1 - fz) + n01.z * (1 - fx) * fz + n11.z * fx * fz
        );
        
        // Normalize the interpolated normal
        normal.normalize();
        
        // Get surface types at the four points
        const s00 = chunk.surfaceMap[z0][x0];
        const s10 = chunk.surfaceMap[z0][x1];
        const s01 = chunk.surfaceMap[z1][x0];
        const s11 = chunk.surfaceMap[z1][x1];
        
        // Determine the dominant surface type
        const surfaceCounts = new Map<SurfaceType, number>();
        surfaceCounts.set(s00, (surfaceCounts.get(s00) || 0) + (1 - fx) * (1 - fz));
        surfaceCounts.set(s10, (surfaceCounts.get(s10) || 0) + fx * (1 - fz));
        surfaceCounts.set(s01, (surfaceCounts.get(s01) || 0) + (1 - fx) * fz);
        surfaceCounts.set(s11, (surfaceCounts.get(s11) || 0) + fx * fz);
        
        let dominantSurface = SurfaceType.DEFAULT;
        let maxCount = 0;
        
        surfaceCounts.forEach((count, surface) => {
            if (count > maxCount) {
                maxCount = count;
                dominantSurface = surface;
            }
        });
        
        // Calculate slope angle in degrees
        const slopeAngle = Math.acos(normal.y) * (180 / Math.PI);
        
        // Create and return the terrain point
        return {
            position: new Vector3(x, height, z),
            normal,
            surfaceType: dominantSurface,
            slope: slopeAngle
        };
    }
    
    /**
     * Modify the terrain height at the specified world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     * @param height New height value
     * @returns Whether the modification was successful
     */
    public setHeightAt(x: number, z: number, height: number): boolean {
        // Find the chunk that contains the point
        // For now, we only have one chunk
        if (this.chunks.size === 0) {
            return false;
        }
        
        const chunk = this.chunks.values().next().value as TerrainChunk;
        
        // Check if the point is within the chunk bounds
        if (x < 0 || x >= chunk.width || z < 0 || z >= chunk.depth) {
            return false;
        }
        
        // Calculate grid coordinates
        const resolution = TerrainConfig.dimensions.resolution;
        const gridX = Math.floor(x * resolution);
        const gridZ = Math.floor(z * resolution);
        
        // Set height
        chunk.heightMap[gridZ][gridX] = height;
        
        // Mark chunk as dirty
        chunk.isDirty = true;
        
        // Recalculate normals for the affected area
        this.calculateNormals(chunk);
        
        return true;
    }
    
    /**
     * Modify the surface type at the specified world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     * @param surfaceType New surface type
     * @returns Whether the modification was successful
     */
    public setSurfaceTypeAt(x: number, z: number, surfaceType: SurfaceType): boolean {
        // Find the chunk that contains the point
        // For now, we only have one chunk
        if (this.chunks.size === 0) {
            return false;
        }
        
        const chunk = this.chunks.values().next().value as TerrainChunk;
        
        // Check if the point is within the chunk bounds
        if (x < 0 || x >= chunk.width || z < 0 || z >= chunk.depth) {
            return false;
        }
        
        // Calculate grid coordinates
        const resolution = TerrainConfig.dimensions.resolution;
        const gridX = Math.floor(x * resolution);
        const gridZ = Math.floor(z * resolution);
        
        // Set surface type
        chunk.surfaceMap[gridZ][gridX] = surfaceType;
        
        // Mark chunk as dirty
        chunk.isDirty = true;
        
        return true;
    }
    
    /**
     * Update the terrain system
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        // Update any dynamic terrain features here
    }
    
    /**
     * Render the terrain
     */
    public render(): void {
        // Rendering would be handled by a separate renderer
    }
    
    /**
     * Clean up resources used by the terrain system
     */
    public cleanup(): void {
        this.logger.info('Cleaning up TerrainSystem');
        this.chunks.clear();
        this.initialized = false;
    }
    
    /**
     * Get the dimensions of the terrain
     * @returns Terrain dimensions
     */
    public getDimensions(): TerrainDimensions {
        return {
            width: this.width,
            depth: this.depth,
            maxHeight: this.maxHeight
        };
    }
    
    /**
     * Get the width of the terrain
     * @returns Width in world units
     */
    public getWidth(): number {
        return this.width;
    }
    
    /**
     * Get the depth of the terrain
     * @returns Depth in world units
     */
    public getDepth(): number {
        return this.depth;
    }
    
    /**
     * Get the maximum height of the terrain
     * @returns Maximum height in world units
     */
    public getMaxHeight(): number {
        return this.maxHeight;
    }
} 