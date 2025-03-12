import {
    Scene,
    GroundMesh,
    Color3,
    Vector3,
    Vector2,
    PhysicsImpostor,
    StandardMaterial,
    Mesh,
    VertexData,
    VertexBuffer
} from '@babylonjs/core';
import { Logger } from '../utils/logger';
import { SurfaceType, DefaultSurfaces, SurfaceProperties } from '../types/physics';
import { TerrainData } from '../types/components';
import { TerrainQuadTree } from './quadtree';

/**
 * Options for terrain generation
 */
export interface TerrainGeneratorOptions {
    /**
     * Width of the terrain in world units
     */
    width: number;

    /**
     * Depth of the terrain in world units
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
     * Whether to generate heights randomly
     */
    randomHeights: boolean;

    /**
     * Seed for random generation
     */
    seed?: number;

    /**
     * Whether to apply physics to the terrain
     */
    physics: boolean;

    /**
     * Whether to visualize surface types
     */
    visualizeSurfaces: boolean;
}

/**
 * Default options for terrain generation
 */
const DefaultOptions: TerrainGeneratorOptions = {
    width: 1000,
    depth: 1000,
    resolution: 0.1,
    maxHeight: 200,
    randomHeights: true,
    physics: true,
    visualizeSurfaces: true
};

/**
 * Generates terrain for the game
 */
export class TerrainGenerator {
    private logger: Logger;
    private scene: Scene;
    private options: TerrainGeneratorOptions;
    private terrainMesh?: GroundMesh;
    private heightMap?: Float32Array;
    private surfaceMap?: Uint8Array;
    private vertexCount: number = 0;
    private quadTree?: TerrainQuadTree;

    // Materials for different surface types
    private surfaceMaterials: Map<SurfaceType, StandardMaterial> = new Map();

    /**
     * Initialize the terrain generator
     * @param scene Babylon.js scene
     * @param options Terrain generation options
     */
    constructor(scene: Scene, options: Partial<TerrainGeneratorOptions> = {}) {
        this.logger = new Logger('TerrainGenerator');
        this.scene = scene;
        this.options = { ...DefaultOptions, ...options };

        this.initializeMaterials();
    }

    /**
     * Initialize materials for different surface types
     */
    private initializeMaterials(): void {
        // Create materials for each surface type
        for (const typeKey in SurfaceType) {
            const type = Number(typeKey);
            if (!isNaN(type)) {
                const material = new StandardMaterial(`surface_${typeKey}`, this.scene);

                // Set material colors based on surface type
                switch (type) {
                    case SurfaceType.DEFAULT:
                        material.diffuseColor = new Color3(0.5, 0.5, 0.5); // Gray
                        break;
                    case SurfaceType.SKIABLE:
                        material.diffuseColor = new Color3(0.8, 0.8, 1.0); // Light blue
                        break;
                    case SurfaceType.ICE:
                        material.diffuseColor = new Color3(0.8, 0.9, 1.0); // Very light blue
                        break;
                    case SurfaceType.ROUGH:
                        material.diffuseColor = new Color3(0.6, 0.4, 0.2); // Brown
                        break;
                    case SurfaceType.BOUNCE:
                        material.diffuseColor = new Color3(1.0, 0.3, 0.3); // Red
                        break;
                }

                this.surfaceMaterials.set(type, material);
            }
        }
    }

    /**
     * Generate terrain from a height map
     * @param heightMapData Height map data (normalized 0-1 values)
     * @param surfaceMapData Optional surface type map data
     */
    public generateFromHeightMap(heightMapData: Float32Array, surfaceMapData?: Uint8Array): GroundMesh {
        this.logger.info('Generating terrain from height map...');

        try {
            // Store height map data
            this.heightMap = heightMapData;
            this.surfaceMap = surfaceMapData;

            // Calculate dimensions
            const widthVertices = Math.floor(this.options.width * this.options.resolution) + 1;
            const depthVertices = Math.floor(this.options.depth * this.options.resolution) + 1;
            this.vertexCount = widthVertices * depthVertices;

            this.logger.debug(`Terrain dimensions: ${widthVertices}x${depthVertices} vertices`);

            // Create the ground mesh
            this.terrainMesh = new GroundMesh('terrain', this.scene);
            this.terrainMesh.isPickable = true;

            // Generate the mesh data
            this.generateMeshData(widthVertices, depthVertices);

            // Apply physics if enabled
            if (this.options.physics) {
                this.applyPhysics();
            }

            // Create quadtree for efficient height queries
            this.createQuadTree();

            this.logger.info('Terrain generation complete');
            return this.terrainMesh;
        } catch (error) {
            this.logger.error('Failed to generate terrain', error);
            throw error;
        }
    }

    /**
     * Generate procedural terrain
     * @param octaves Number of octaves for noise
     * @param persistence Persistence for noise
     */
    public generateProcedural(octaves: number = 6, persistence: number = 0.5): GroundMesh {
        this.logger.info('Generating procedural terrain...');

        try {
            // Calculate dimensions
            const widthVertices = Math.floor(this.options.width * this.options.resolution) + 1;
            const depthVertices = Math.floor(this.options.depth * this.options.resolution) + 1;
            this.vertexCount = widthVertices * depthVertices;

            // Generate height map using perlin noise
            this.heightMap = new Float32Array(this.vertexCount);
            this.surfaceMap = new Uint8Array(this.vertexCount);

            const seed = this.options.seed || Math.random() * 10000;

            // Initialize noise function with seed
            const noise = new SimplexNoise(seed.toString());

            // Generate height values using fractal noise
            for (let z = 0; z < depthVertices; z++) {
                for (let x = 0; x < widthVertices; x++) {
                    const index = z * widthVertices + x;

                    // Normalize coordinates
                    const nx = x / widthVertices;
                    const nz = z / depthVertices;

                    // Generate fractal noise
                    let height = 0;
                    let amplitude = 1;
                    let frequency = 1;
                    let maxAmplitude = 0;

                    for (let i = 0; i < octaves; i++) {
                        height += noise.noise2D(nx * frequency, nz * frequency) * amplitude;
                        maxAmplitude += amplitude;
                        amplitude *= persistence;
                        frequency *= 2;
                    }

                    // Normalize height to 0-1 range
                    height = (height / maxAmplitude + 1) / 2;

                    // Store height value
                    this.heightMap[index] = height;

                    // Determine surface type based on height and slope
                    this.surfaceMap[index] = this.determineSurfaceType(height, x, z, widthVertices, depthVertices);
                }
            }

            // Create the ground mesh
            this.terrainMesh = new GroundMesh('terrain', this.scene);
            this.terrainMesh.isPickable = true;

            // Generate the mesh data
            this.generateMeshData(widthVertices, depthVertices);

            // Apply physics if enabled
            if (this.options.physics) {
                this.applyPhysics();
            }

            // Create quadtree for efficient height queries
            this.createQuadTree();

            this.logger.info('Procedural terrain generation complete');
            return this.terrainMesh;
        } catch (error) {
            this.logger.error('Failed to generate procedural terrain', error);
            throw error;
        }
    }

    /**
     * Determine surface type based on height and slope
     * @param height Normalized height value (0-1)
     * @param x X coordinate
     * @param z Z coordinate
     * @param width Width in vertices
     * @param depth Depth in vertices
     */
    private determineSurfaceType(height: number, x: number, z: number, width: number, depth: number): SurfaceType {
        // If we're near the edge, use default surface
        if (x < 2 || x > width - 3 || z < 2 || z > depth - 3) {
            return SurfaceType.DEFAULT;
        }

        // Calculate approximate slope using neighboring heights
        const index = z * width + x;
        const left = this.heightMap![index - 1];
        const right = this.heightMap![index + 1];
        const up = this.heightMap![index - width];
        const down = this.heightMap![index + width];

        const slopeX = Math.abs(right - left) * this.options.maxHeight;
        const slopeZ = Math.abs(down - up) * this.options.maxHeight;
        const slope = Math.sqrt(slopeX * slopeX + slopeZ * slopeZ);

        // Determine surface type based on height and slope
        if (slope > 0.4 && slope < 1.2 && height > 0.3) {
            // Moderate slopes are skiable
            return SurfaceType.SKIABLE;
        } else if (slope < 0.2 && height > 0.7) {
            // Flat high areas are ice
            return SurfaceType.ICE;
        } else if (slope > 1.5) {
            // Very steep slopes are rough
            return SurfaceType.ROUGH;
        } else if (height < 0.2 && slope < 0.1) {
            // Flat low areas are bounce pads (for fun!)
            return SurfaceType.BOUNCE;
        } else {
            // Default surface
            return SurfaceType.DEFAULT;
        }
    }

    /**
     * Generate mesh data for the terrain
     * @param widthVertices Number of vertices along width
     * @param depthVertices Number of vertices along depth
     */
    private generateMeshData(widthVertices: number, depthVertices: number): void {
        if (!this.heightMap || !this.terrainMesh) {
            throw new Error('Height map or terrain mesh not initialized');
        }

        try {
            // Create vertex data
            const positions: number[] = [];
            const normals: number[] = [];
            const uvs: number[] = [];
            const colors: number[] = [];
            const indices: number[] = [];

            // Generate vertices
            for (let z = 0; z < depthVertices; z++) {
                for (let x = 0; x < widthVertices; x++) {
                    const index = z * widthVertices + x;

                    // Calculate position
                    const xPos = (x / this.options.resolution) - (this.options.width / 2);
                    const zPos = (z / this.options.resolution) - (this.options.depth / 2);
                    const yPos = this.heightMap[index] * this.options.maxHeight;

                    // Add position
                    positions.push(xPos, yPos, zPos);

                    // Add UV coordinates
                    uvs.push(x / (widthVertices - 1), z / (depthVertices - 1));

                    // Add color based on surface type
                    const surfaceType = this.surfaceMap ? this.surfaceMap[index] : SurfaceType.DEFAULT;
                    const color = this.getSurfaceColor(surfaceType);
                    colors.push(color.r, color.g, color.b, 1);
                }
            }

            // Generate indices for triangles
            for (let z = 0; z < depthVertices - 1; z++) {
                for (let x = 0; x < widthVertices - 1; x++) {
                    const bottomLeft = z * widthVertices + x;
                    const bottomRight = bottomLeft + 1;
                    const topLeft = (z + 1) * widthVertices + x;
                    const topRight = topLeft + 1;

                    // First triangle
                    indices.push(bottomLeft);
                    indices.push(bottomRight);
                    indices.push(topLeft);

                    // Second triangle
                    indices.push(topLeft);
                    indices.push(bottomRight);
                    indices.push(topRight);
                }
            }

            // Calculate normals
            this.calculateNormals(positions, indices, normals);

            // Create vertex data
            const vertexData = new VertexData();
            vertexData.positions = positions;
            vertexData.indices = indices;
            vertexData.normals = normals;
            vertexData.uvs = uvs;
            vertexData.colors = colors;

            // Apply vertex data to mesh
            vertexData.applyToMesh(this.terrainMesh);

            // Optimize mesh for rendering
            this.terrainMesh.convertToFlatShadedMesh();
            this.terrainMesh.optimize(50);

            this.logger.debug(`Generated terrain mesh with ${positions.length / 3} vertices and ${indices.length / 3} triangles`);
        } catch (error) {
            this.logger.error('Failed to generate mesh data', error);
            throw error;
        }
    }

    /**
     * Calculate normals for the terrain
     * @param positions Vertex positions
     * @param indices Triangle indices
     * @param normals Output normal array
     */
    private calculateNormals(positions: number[], indices: number[], normals: number[]): void {
        // Initialize normals array
        for (let i = 0; i < positions.length; i++) {
            normals.push(0);
        }

        // Calculate normals for each triangle
        for (let i = 0; i < indices.length; i += 3) {
            const index1 = indices[i] * 3;
            const index2 = indices[i + 1] * 3;
            const index3 = indices[i + 2] * 3;

            // Get vertex positions
            const v1 = new Vector3(positions[index1], positions[index1 + 1], positions[index1 + 2]);
            const v2 = new Vector3(positions[index2], positions[index2 + 1], positions[index2 + 2]);
            const v3 = new Vector3(positions[index3], positions[index3 + 1], positions[index3 + 2]);

            // Calculate triangle normal
            const edge1 = v2.subtract(v1);
            const edge2 = v3.subtract(v1);
            const normal = Vector3.Cross(edge1, edge2).normalize();

            // Add to vertex normals
            normals[index1] += normal.x;
            normals[index1 + 1] += normal.y;
            normals[index1 + 2] += normal.z;

            normals[index2] += normal.x;
            normals[index2 + 1] += normal.y;
            normals[index2 + 2] += normal.z;

            normals[index3] += normal.x;
            normals[index3 + 1] += normal.y;
            normals[index3 + 2] += normal.z;
        }

        // Normalize vertex normals
        for (let i = 0; i < normals.length; i += 3) {
            const normal = new Vector3(normals[i], normals[i + 1], normals[i + 2]).normalize();
            normals[i] = normal.x;
            normals[i + 1] = normal.y;
            normals[i + 2] = normal.z;
        }
    }

    /**
     * Apply physics to the terrain
     */
    private applyPhysics(): void {
        if (!this.terrainMesh) {
            throw new Error('Terrain mesh not initialized');
        }

        try {
            // Create physics impostor for the terrain
            this.terrainMesh.physicsImpostor = new PhysicsImpostor(
                this.terrainMesh,
                PhysicsImpostor.HeightmapImpostor,
                { mass: 0, friction: 0.5, restitution: 0.2 },
                this.scene
            );

            this.logger.debug('Applied physics to terrain');
        } catch (error) {
            this.logger.error('Failed to apply physics to terrain', error);
            throw error;
        }
    }

    /**
     * Create a quadtree for efficient terrain queries
     */
    private createQuadTree(): void {
        if (!this.terrainMesh) {
            throw new Error('Terrain mesh not initialized');
        }

        try {
            // Create terrain bounds
            const bounds = {
                minX: -this.options.width / 2,
                maxX: this.options.width / 2,
                minZ: -this.options.depth / 2,
                maxZ: this.options.depth / 2
            };

            // Create quadtree
            this.quadTree = new TerrainQuadTree(this, bounds, 0, 6);

            this.logger.debug('Created terrain quadtree');
        } catch (error) {
            this.logger.error('Failed to create terrain quadtree', error);
            throw error;
        }
    }

    /**
     * Get the height at a specific world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     */
    public getHeightAt(x: number, z: number): number {
        if (!this.terrainMesh || !this.heightMap) {
            this.logger.warn('Cannot get height: terrain not initialized');
            return 0;
        }

        if (this.quadTree) {
            // Use quadtree for efficient lookup
            return this.quadTree.getHeightAt(x, z);
        }

        // Fall back to direct height map lookup
        try {
            // Convert world coordinates to grid coordinates
            const gridX = Math.floor((x + this.options.width / 2) * this.options.resolution);
            const gridZ = Math.floor((z + this.options.depth / 2) * this.options.resolution);

            // Calculate width in vertices
            const widthVertices = Math.floor(this.options.width * this.options.resolution) + 1;

            // Check if coordinates are in bounds
            if (gridX < 0 || gridX >= widthVertices - 1 || gridZ < 0 || gridZ >= widthVertices - 1) {
                return 0;
            }

            // Get heights at the four surrounding grid points
            const index = gridZ * widthVertices + gridX;
            const h00 = this.heightMap[index] * this.options.maxHeight;
            const h10 = this.heightMap[index + 1] * this.options.maxHeight;
            const h01 = this.heightMap[index + widthVertices] * this.options.maxHeight;
            const h11 = this.heightMap[index + widthVertices + 1] * this.options.maxHeight;

            // Calculate fractional position within the grid cell
            const fx = (x + this.options.width / 2) * this.options.resolution - gridX;
            const fz = (z + this.options.depth / 2) * this.options.resolution - gridZ;

            // Bilinear interpolation of heights
            const h0 = h00 * (1 - fx) + h10 * fx;
            const h1 = h01 * (1 - fx) + h11 * fx;
            return h0 * (1 - fz) + h1 * fz;
        } catch (error) {
            this.logger.error('Error getting height', error);
            return 0;
        }
    }

    /**
     * Get the surface normal at a specific world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     */
    public getNormalAt(x: number, z: number): Vector3 {
        if (!this.terrainMesh || !this.heightMap) {
            this.logger.warn('Cannot get normal: terrain not initialized');
            return new Vector3(0, 1, 0);
        }

        if (this.quadTree) {
            // Use quadtree for efficient lookup
            return this.quadTree.getNormalAt(x, z);
        }

        // Fall back to calculating normal directly
        try {
            // Get heights at surrounding points
            const epsilon = 1 / this.options.resolution;
            const h = this.getHeightAt(x, z);
            const hL = this.getHeightAt(x - epsilon, z);
            const hR = this.getHeightAt(x + epsilon, z);
            const hD = this.getHeightAt(x, z - epsilon);
            const hU = this.getHeightAt(x, z + epsilon);

            // Calculate tangent vectors
            const tangentX = new Vector3(2 * epsilon, hR - hL, 0);
            const tangentZ = new Vector3(0, hU - hD, 2 * epsilon);

            // Calculate normal using cross product
            const normal = Vector3.Cross(tangentZ, tangentX).normalize();
            return normal;
        } catch (error) {
            this.logger.error('Error getting normal', error);
            return new Vector3(0, 1, 0);
        }
    }

    /**
     * Get surface type at a specific world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     */
    public getSurfaceTypeAt(x: number, z: number): SurfaceType {
        if (!this.terrainMesh || !this.surfaceMap) {
            this.logger.warn('Cannot get surface type: terrain not initialized');
            return SurfaceType.DEFAULT;
        }

        try {
            // Convert world coordinates to grid coordinates
            const gridX = Math.floor((x + this.options.width / 2) * this.options.resolution);
            const gridZ = Math.floor((z + this.options.depth / 2) * this.options.resolution);

            // Calculate width in vertices
            const widthVertices = Math.floor(this.options.width * this.options.resolution) + 1;

            // Check if coordinates are in bounds
            if (gridX < 0 || gridX >= widthVertices || gridZ < 0 || gridZ >= widthVertices) {
                return SurfaceType.DEFAULT;
            }

            // Get surface type from map
            const index = gridZ * widthVertices + gridX;
            return this.surfaceMap[index] as SurfaceType;
        } catch (error) {
            this.logger.error('Error getting surface type', error);
            return SurfaceType.DEFAULT;
        }
    }

    /**
     * Get terrain data at a specific world position
     * @param x X coordinate in world space
     * @param z Z coordinate in world space
     */
    public getTerrainDataAt(x: number, z: number): TerrainData {
        const position = new Vector3(x, this.getHeightAt(x, z), z);
        const normal = this.getNormalAt(x, z);
        const surfaceType = this.getSurfaceTypeAt(x, z);
        const surfaceProps = DefaultSurfaces[surfaceType];

        return {
            position,
            normal,
            surfaceType,
            friction: surfaceProps.friction,
            height: position.y
        };
    }

    /**
     * Get surface color for visualization
     * @param surfaceType Surface type to get color for
     */
    private getSurfaceColor(surfaceType: SurfaceType): Color3 {
        // Use material color if available
        const material = this.surfaceMaterials.get(surfaceType);
        if (material) {
            return material.diffuseColor;
        }

        // Fall back to default colors
        switch (surfaceType) {
            case SurfaceType.SKIABLE:
                return new Color3(0.8, 0.8, 1.0); // Light blue
            case SurfaceType.ICE:
                return new Color3(0.8, 0.9, 1.0); // Very light blue
            case SurfaceType.ROUGH:
                return new Color3(0.6, 0.4, 0.2); // Brown
            case SurfaceType.BOUNCE:
                return new Color3(1.0, 0.3, 0.3); // Red
            default:
                return new Color3(0.5, 0.5, 0.5); // Gray
        }
    }

    /**
     * Get the terrain mesh
     */
    public getMesh(): GroundMesh | undefined {
        return this.terrainMesh;
    }

    /**
     * Get terrain width
     */
    public getWidth(): number {
        return this.options.width;
    }

    /**
     * Get terrain depth
     */
    public getDepth(): number {
        return this.options.depth;
    }

    /**
     * Get terrain resolution
     */
    public getResolution(): number {
        return this.options.resolution;
    }

    /**
     * Get terrain max height
     */
    public getMaxHeight(): number {
        return this.options.maxHeight;
    }

    /**
     * Get height map data
     */
    public getHeightMapData(): Float32Array | undefined {
        return this.heightMap;
    }

    /**
     * Get surface map data
     */
    public getSurfaceMapData(): Uint8Array | undefined {
        return this.surfaceMap;
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        if (this.terrainMesh) {
            this.terrainMesh.dispose();
            this.terrainMesh = undefined;
        }

        // Dispose materials
        this.surfaceMaterials.forEach((material) => {
            material.dispose();
        });
        this.surfaceMaterials.clear();

        this.logger.debug('Terrain generator disposed');
    }
}

/**
 * Simple implementation of simplex noise for procedural generation
 */
class SimplexNoise {
    private perm: Uint8Array;
    private gradP: Array<[number, number, number]>;

    constructor(seed: string = '') {
        this.perm = new Uint8Array(512);
        this.gradP = new Array(512);
        this.seed(seed);
    }

    private seed(seed: string): void {
        // Simple string hash to number
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash |= 0;
        }

        // Permutation table
        const p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) {
            p[i] = i;
        }

        // Fisher-Yates shuffle based on seed
        let j = 0;
        for (let i = 255; i > 0; i--) {
            hash = (hash * 16807) % 2147483647;
            j = (hash % (i + 1)) | 0;
            [p[i], p[j]] = [p[j], p[i]];
        }

        // Duplicate for wrap-around
        for (let i = 0; i < 512; i++) {
            this.perm[i] = p[i & 255];
            this.gradP[i] = this.gradient3d(this.perm[i]);
        }
    }

    private gradient3d(hash: number): [number, number, number] {
        // Simple gradients for 3D noise
        const h = hash & 15;
        const u = h < 8 ? 1 : -1;
        const v = h < 4 ? 1 : (h === 12 || h === 14 ? -1 : 0);
        return [u, v, h < 12 ? ((h & 1) === 0 ? 1 : -1) : 0];
    }

    public noise2D(x: number, y: number): number {
        // Simple 2D simplex noise implementation
        const n0 = this.dot([1, 1], this.gradP[this.perm[(Math.floor(x) & 255) + this.perm[Math.floor(y) & 255]]]);
        const n1 = this.dot([x - Math.floor(x), y - Math.floor(y)], this.gradP[this.perm[(Math.floor(x) + 1 & 255) + this.perm[Math.floor(y) & 255]]]);
        const n2 = this.dot([x - Math.floor(x), y - Math.floor(y) - 1], this.gradP[this.perm[(Math.floor(x) & 255) + this.perm[(Math.floor(y) + 1) & 255]]]);
        const n3 = this.dot([x - Math.floor(x) - 1, y - Math.floor(y) - 1], this.gradP[this.perm[(Math.floor(x) + 1 & 255) + this.perm[(Math.floor(y) + 1) & 255]]]);

        // Cubic interpolation
        const u = this.fade(x - Math.floor(x));
        const v = this.fade(y - Math.floor(y));

        // Interpolate between the four corners
        return this.lerp(
            this.lerp(n0, n1, u),
            this.lerp(n2, n3, u),
            v
        );
    }

    private fade(t: number): number {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    private lerp(a: number, b: number, t: number): number {
        return (1 - t) * a + t * b;
    }

    private dot(a: number[], b: [number, number, number]): number {
        return a[0] * b[0] + a[1] * b[1] + (a.length > 2 ? a[2] * b[2] : 0);
    }
}