import { Vector3 } from '@babylonjs/core';
import { Logger } from '../utils/logger';
import { TerrainGenerator } from './generator';

/**
 * Bounds for a quadtree node
 */
export interface QuadTreeBounds {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
}

/**
 * Height data cached for a leaf node
 */
interface HeightData {
    positions: number[];
    heights: number[];
    normals: Vector3[];
}

/**
 * Quadtree for efficient terrain queries
 */
export class TerrainQuadTree {
    private logger: Logger;
    private terrain: TerrainGenerator;
    private bounds: QuadTreeBounds;
    private depth: number;
    private maxDepth: number;
    private children: TerrainQuadTree[] = [];
    private heightData?: HeightData;

    /**
     * Initialize a terrain quadtree node
     * @param terrain Terrain generator
     * @param bounds Spatial bounds for this node
     * @param depth Current depth in the tree
     * @param maxDepth Maximum tree depth
     */
    constructor(terrain: TerrainGenerator, bounds: QuadTreeBounds, depth: number, maxDepth: number) {
        this.logger = new Logger(`TerrainQuadTree:${depth}`);
        this.terrain = terrain;
        this.bounds = bounds;
        this.depth = depth;
        this.maxDepth = maxDepth;

        // Split recursively if needed
        if (depth < maxDepth) {
            this.split();
        } else {
            // Store height data for leaf node
            this.cacheHeightData();
        }
    }

    /**
     * Split this node into four children
     */
    private split(): void {
        const midX = (this.bounds.minX + this.bounds.maxX) / 2;
        const midZ = (this.bounds.minZ + this.bounds.maxZ) / 2;

        // Create four child nodes (NW, NE, SW, SE)
        this.children.push(
            new TerrainQuadTree(
                this.terrain,
                {
                    minX: this.bounds.minX,
                    maxX: midX,
                    minZ: this.bounds.minZ,
                    maxZ: midZ
                },
                this.depth + 1,
                this.maxDepth
            ),
            new TerrainQuadTree(
                this.terrain,
                {
                    minX: midX,
                    maxX: this.bounds.maxX,
                    minZ: this.bounds.minZ,
                    maxZ: midZ
                },
                this.depth + 1,
                this.maxDepth
            ),
            new TerrainQuadTree(
                this.terrain,
                {
                    minX: this.bounds.minX,
                    maxX: midX,
                    minZ: midZ,
                    maxZ: this.bounds.maxZ
                },
                this.depth + 1,
                this.maxDepth
            ),
            new TerrainQuadTree(
                this.terrain,
                {
                    minX: midX,
                    maxX: this.bounds.maxX,
                    minZ: midZ,
                    maxZ: this.bounds.maxZ
                },
                this.depth + 1,
                this.maxDepth
            )
        );
    }

    /**
     * Cache height data for this node
     */
    private cacheHeightData(): void {
        // Create a grid of height samples for this node
        const resolution = 8; // Number of samples in each direction
        const positions: number[] = [];
        const heights: number[] = [];
        const normals: Vector3[] = [];

        // Sample heights in a grid
        for (let z = 0; z <= resolution; z++) {
            for (let x = 0; x <= resolution; x++) {
                // Calculate world position
                const xPos = this.bounds.minX + (this.bounds.maxX - this.bounds.minX) * (x / resolution);
                const zPos = this.bounds.minZ + (this.bounds.maxZ - this.bounds.minZ) * (z / resolution);

                // Get height and normal
                const height = this.terrain.getHeightAt(xPos, zPos);
                const normal = this.terrain.getNormalAt(xPos, zPos);

                // Store data
                positions.push(xPos, zPos);
                heights.push(height);
                normals.push(normal);
            }
        }

        this.heightData = {
            positions,
            heights,
            normals
        };
    }

    /**
     * Check if a point is within the bounds of this node
     * @param x X coordinate
     * @param z Z coordinate
     */
    public containsPoint(x: number, z: number): boolean {
        return (
            x >= this.bounds.minX &&
            x <= this.bounds.maxX &&
            z >= this.bounds.minZ &&
            z <= this.bounds.maxZ
        );
    }

    /**
     * Get the leaf node containing a point
     * @param x X coordinate
     * @param z Z coordinate
     */
    public getNodeAt(x: number, z: number): TerrainQuadTree | null {
        // Check if point is in bounds
        if (!this.containsPoint(x, z)) {
            return null;
        }

        // If leaf node, return self
        if (this.children.length === 0) {
            return this;
        }

        // Check children
        for (const child of this.children) {
            const node = child.getNodeAt(x, z);
            if (node) {
                return node;
            }
        }

        // Shouldn't happen if quadtree is properly constructed
        return null;
    }

    /**
     * Get height at a specific world position
     * @param x X coordinate
     * @param z Z coordinate
     */
    public getHeightAt(x: number, z: number): number {
        // Find leaf node containing the point
        const node = this.getNodeAt(x, z);
        if (!node) {
            // Fall back to direct terrain lookup
            return this.terrain.getHeightAt(x, z);
        }

        if (!node.heightData) {
            // No cached data, fall back to direct terrain lookup
            return this.terrain.getHeightAt(x, z);
        }

        // Interpolate height from cached data
        const { positions, heights } = node.heightData;

        // Find the four surrounding grid points
        let closestIndices: number[] = [];
        let closestDistances: number[] = [];

        for (let i = 0; i < positions.length; i += 2) {
            const posX = positions[i];
            const posZ = positions[i + 1];
            const distanceSquared = (x - posX) * (x - posX) + (z - posZ) * (z - posZ);

            // Keep track of the four closest points
            if (closestIndices.length < 4) {
                closestIndices.push(i / 2);
                closestDistances.push(distanceSquared);
            } else {
                // Replace the furthest point if this one is closer
                let furthestIndex = 0;
                let furthestDistance = closestDistances[0];

                for (let j = 1; j < 4; j++) {
                    if (closestDistances[j] > furthestDistance) {
                        furthestDistance = closestDistances[j];
                        furthestIndex = j;
                    }
                }

                if (distanceSquared < furthestDistance) {
                    closestIndices[furthestIndex] = i / 2;
                    closestDistances[furthestIndex] = distanceSquared;
                }
            }
        }

        // Weight heights by inverse distance
        let totalWeight = 0;
        let weightedHeight = 0;

        for (let i = 0; i < closestIndices.length; i++) {
            const index = closestIndices[i];
            const distance = Math.sqrt(closestDistances[i]);

            // Avoid division by zero
            const weight = distance < 0.0001 ? 1000 : 1 / distance;
            totalWeight += weight;
            weightedHeight += heights[index] * weight;
        }

        return totalWeight > 0 ? weightedHeight / totalWeight : 0;
    }

    /**
     * Get normal at a specific world position
     * @param x X coordinate
     * @param z Z coordinate
     */
    public getNormalAt(x: number, z: number): Vector3 {
        // Find leaf node containing the point
        const node = this.getNodeAt(x, z);
        if (!node) {
            // Fall back to direct terrain lookup
            return this.terrain.getNormalAt(x, z);
        }

        if (!node.heightData) {
            // No cached data, fall back to direct terrain lookup
            return this.terrain.getNormalAt(x, z);
        }

        // Interpolate normal from cached data
        const { positions, normals } = node.heightData;

        // Find the four surrounding grid points
        let closestIndices: number[] = [];
        let closestDistances: number[] = [];

        for (let i = 0; i < positions.length; i += 2) {
            const posX = positions[i];
            const posZ = positions[i + 1];
            const distanceSquared = (x - posX) * (x - posX) + (z - posZ) * (z - posZ);

            // Keep track of the four closest points
            if (closestIndices.length < 4) {
                closestIndices.push(i / 2);
                closestDistances.push(distanceSquared);
            } else {
                // Replace the furthest point if this one is closer
                let furthestIndex = 0;
                let furthestDistance = closestDistances[0];

                for (let j = 1; j < 4; j++) {
                    if (closestDistances[j] > furthestDistance) {
                        furthestDistance = closestDistances[j];
                        furthestIndex = j;
                    }
                }

                if (distanceSquared < furthestDistance) {
                    closestIndices[furthestIndex] = i / 2;
                    closestDistances[furthestIndex] = distanceSquared;
                }
            }
        }

        // Weight normals by inverse distance
        let totalWeight = 0;
        const weightedNormal = new Vector3(0, 0, 0);

        for (let i = 0; i < closestIndices.length; i++) {
            const index = closestIndices[i];
            const distance = Math.sqrt(closestDistances[i]);

            // Avoid division by zero
            const weight = distance < 0.0001 ? 1000 : 1 / distance;
            totalWeight += weight;

            const normal = normals[index].scale(weight);
            weightedNormal.addInPlace(normal);
        }

        return totalWeight > 0 ? weightedNormal.scale(1 / totalWeight).normalize() : new Vector3(0, 1, 0);
    }

    /**
     * Get the bounds of this node
     */
    public getBounds(): QuadTreeBounds {
        return this.bounds;
    }

    /**
     * Get the depth of this node
     */
    public getDepth(): number {
        return this.depth;
    }

    /**
     * Get the maximum depth of the tree
     */
    public getMaxDepth(): number {
        return this.maxDepth;
    }

    /**
     * Get the children of this node
     */
    public getChildren(): TerrainQuadTree[] {
        return this.children;
    }

    /**
     * Check if this is a leaf node
     */
    public isLeaf(): boolean {
        return this.children.length === 0;
    }
}