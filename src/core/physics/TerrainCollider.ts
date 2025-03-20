/**
 * @file src/core/physics/TerrainCollider.ts
 * @description Handles collision detection with terrain
 */

import * as BABYLON from 'babylonjs';
import { v4 as uuidv4 } from 'uuid';
import { 
  ITerrainCollider,
  TerrainSurfaceInfo, 
  TerrainRaycastHit, 
  HeightmapData 
} from './ITerrainCollider';
import { ResourceTracker, ResourceType } from '../utils/ResourceTracker';
import { Logger } from '../utils/Logger';
import { ServiceLocator } from '../base/ServiceLocator';

/**
 * Configuration options for the terrain collider
 */
export interface TerrainColliderOptions {
  /** Whether to use heightmap-based terrain collision (more accurate but slower) */
  useHeightmapCollision: boolean;
  /** Whether to use simplified collisions for distant objects */
  useDistanceBasedSimplification: boolean;
  /** Distance threshold for using simplified collisions */
  simplificationDistance: number;
  /** Number of rays to cast for heightmap collision */
  raySamples: number;
  /** Whether to cache terrain height queries */
  useHeightCache: boolean;
  /** Maximum cache size for height queries */
  maxCacheSize: number;
  /** Whether to use an optimized octree for terrain collision */
  useOctree: boolean;
}

/**
 * Default terrain collider options
 */
export const DEFAULT_TERRAIN_COLLIDER_OPTIONS: TerrainColliderOptions = {
  useHeightmapCollision: true,
  useDistanceBasedSimplification: true,
  simplificationDistance: 100,
  raySamples: 5,
  useHeightCache: true,
  maxCacheSize: 10000,
  useOctree: true
};

/**
 * Performance level for terrain collision
 */
export enum TerrainCollisionPerformanceLevel {
  ULTRA = 0,
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3, 
  VERY_LOW = 4
}

/**
 * Represents a terrain material type
 */
interface TerrainMaterial {
  name: string;
  friction: number;
  region?: { x1: number; z1: number; x2: number; z2: number };
}

/**
 * Callback registration for terrain collision events
 */
interface TerrainHitCallbackRegistration {
  id: string;
  callback: (hit: { object: BABYLON.AbstractMesh; surfaceInfo: TerrainSurfaceInfo }) => void;
}

/**
 * Cache entry for height and normal data at a specific point
 */
interface TerrainDataCacheEntry {
  position: BABYLON.Vector3;
  height: number;
  normal: BABYLON.Vector3;
  lastAccessTime: number;
  materialType: string;
}

/**
 * Grid cell containing cached terrain data
 */
interface TerrainGridCell {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  samples: TerrainDataCacheEntry[];
  lastAccessTime: number;
}

/**
 * Manages collision detection with terrain
 */
export class TerrainCollider implements ITerrainCollider {
  private scene: BABYLON.Scene | null = null;
  private terrainMesh: BABYLON.Mesh | null = null;
  private terrainImpostor: BABYLON.PhysicsImpostor | null = null;
  private heightmapData: HeightmapData | null = null;
  private terrainMaterials: Map<string, TerrainMaterial> = new Map();
  private hitCallbacks: Map<string, TerrainHitCallbackRegistration> = new Map();
  private defaultMaterial: TerrainMaterial = { name: 'default', friction: 0.5 };
  private resourceTracker: ResourceTracker;
  private logger: Logger;
  private resourceGroup: string = 'terrainCollider';
  
  // Spatial caching for terrain data
  private terrainDataCache: Map<string, TerrainDataCacheEntry> = new Map();
  private terrainGridCache: Map<string, TerrainGridCell> = new Map();
  private gridCellSize: number = 10;
  private maxSamplesPerCell: number = 25;
  private maxCacheEntries: number = 1000;
  private cacheCleanupInterval: number = 5000; // ms
  private lastCacheCleanup: number = 0;
  private rayCaster: BABYLON.Ray = new BABYLON.Ray(BABYLON.Vector3.Zero(), BABYLON.Vector3.Down(), 1000);
  
  // Performance optimization flags
  private useHeightCaching: boolean = true;
  private useNormalCaching: boolean = true;
  private useMaterialCaching: boolean = true;
  private spatialSamplingResolution: number = 2; // Every 2 units in each direction
  
  private terrainHeightCache: Map<string, number> = new Map();
  private options: TerrainColliderOptions;
  private octree: BABYLON.Octree<BABYLON.SubMesh> | null = null;
  private currentPerformanceLevel: TerrainCollisionPerformanceLevel = TerrainCollisionPerformanceLevel.HIGH;
  private adaptiveQuality: boolean = false;
  private playerPosition: BABYLON.Vector3 | null = null;
  private lastQualityCheck: number = 0;
  private qualityCheckInterval: number = 2000; // ms
  
  /**
   * Constructor for TerrainCollider
   * @param scene Optional Babylon.js scene (can also be set later via initialize)
   * @param terrain Optional terrain mesh to use for collision detection
   * @param options Configuration options for the terrain collider
   */
  constructor(
    scene?: BABYLON.Scene, 
    terrain?: BABYLON.Mesh, 
    options: Partial<TerrainColliderOptions> = {}
  ) {
    // Set scene and terrain if provided
    this.scene = scene || null;
    this.terrainMesh = terrain || null;
    
    // Set options
    this.options = { ...DEFAULT_TERRAIN_COLLIDER_OPTIONS, ...options };
    
    // Initialize logger
    this.logger = new Logger('TerrainCollider');
    
    // Try to get logger from ServiceLocator
    try {
      const serviceLocator = ServiceLocator.getInstance();
      if (serviceLocator.has('logger')) {
        this.logger = serviceLocator.get<Logger>('logger');
        this.logger.addTag('TerrainCollider');
      }
    } catch (e) {
      // Use default logger
    }
    
    // Initialize resource tracker from ServiceLocator or create a new one
    try {
      const serviceLocator = ServiceLocator.getInstance();
      if (serviceLocator.has('resourceTracker')) {
        this.resourceTracker = serviceLocator.get<ResourceTracker>('resourceTracker');
      } else {
        this.resourceTracker = new ResourceTracker();
      }
    } catch (e) {
      this.resourceTracker = new ResourceTracker();
    }
    
    // Initialize the collider if scene is provided
    if (this.scene) {
      this.initialize(this.scene);
    }
    
    // Set up update loop for adaptive quality
    if (this.scene) {
      this.scene.onBeforeRenderObservable.add(() => {
        if (this.adaptiveQuality) {
          const currentTime = performance.now();
          if (currentTime - this.lastQualityCheck > this.qualityCheckInterval) {
            this.adaptQualityBasedOnPerformance();
            this.lastQualityCheck = currentTime;
          }
        }
      });
    }
  }
  
  /**
   * Initializes the terrain collider.
   * @param scene The Babylon.js scene
   */
  public initialize(scene: BABYLON.Scene): void {
    this.scene = scene;
    
    // Set up regular cache cleanup
    if (this.scene) {
      this.scene.onBeforeRenderObservable.add(() => {
        const currentTime = performance.now();
        if (currentTime - this.lastCacheCleanup > this.cacheCleanupInterval) {
          this.cleanupCache();
          this.lastCacheCleanup = currentTime;
        }
      });
    }
    
    this.logger.debug("TerrainCollider initialized");
  }
  
  /**
   * Updates the terrain collider.
   * @param deltaTime Time elapsed since the last update
   */
  public update(deltaTime: number): void {
    // No per-frame updates required for a static terrain
  }
  
  /**
   * Sets the terrain heightmap data.
   * @param heightmapData The heightmap data
   */
  public setHeightmapData(heightmapData: HeightmapData): void {
    this.heightmapData = heightmapData;
    
    // Clear any existing caches when setting new heightmap data
    this.clearCaches();
    
    // If a terrain mesh already exists, update or recreate it based on the new heightmap
    if (this.scene && !this.terrainMesh) {
      this.createTerrainFromHeightmap();
    }
  }
  
  /**
   * Clears all terrain data caches
   */
  private clearCaches(): void {
    this.terrainDataCache.clear();
    this.terrainGridCache.clear();
    this.logger.debug("Terrain caches cleared");
  }
  
  /**
   * Cleans up old entries from the cache
   */
  private cleanupCache(): void {
    const currentTime = performance.now();
    
    // Clean up point cache if it's getting too large
    if (this.terrainDataCache.size > this.maxCacheEntries) {
      // Sort entries by last access time
      const entries = Array.from(this.terrainDataCache.entries());
      entries.sort((a, b) => a[1].lastAccessTime - b[1].lastAccessTime);
      
      // Remove oldest entries
      const entriesToRemove = Math.floor(this.maxCacheEntries * 0.2); // Remove 20%
      for (let i = 0; i < entriesToRemove && i < entries.length; i++) {
        this.terrainDataCache.delete(entries[i][0]);
      }
      
      this.logger.debug(`Removed ${entriesToRemove} old cache entries`);
    }
    
    // Clean up grid cache
    const gridEntries = Array.from(this.terrainGridCache.entries());
    // Remove cells that haven't been accessed in a while
    const threshold = currentTime - this.cacheCleanupInterval * 10; // 10x the cleanup interval
    
    let removed = 0;
    for (const [key, cell] of gridEntries) {
      if (cell.lastAccessTime < threshold) {
        this.terrainGridCache.delete(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      this.logger.debug(`Removed ${removed} old grid cells from cache`);
    }
  }
  
  /**
   * Gets the grid cell key for a position
   */
  private getGridCellKey(position: BABYLON.Vector2 | BABYLON.Vector3): string {
    const x = 'z' in position ? position.x : position.x;
    const z = 'z' in position ? position.z : position.y;
    
    const cellX = Math.floor(x / this.gridCellSize);
    const cellZ = Math.floor(z / this.gridCellSize);
    
    return `${cellX}_${cellZ}`;
  }
  
  /**
   * Gets or creates a grid cell for the given position
   */
  private getOrCreateGridCell(position: BABYLON.Vector2 | BABYLON.Vector3): TerrainGridCell {
    const key = this.getGridCellKey(position);
    
    let cell = this.terrainGridCache.get(key);
    if (!cell) {
      const x = 'z' in position ? position.x : position.x;
      const z = 'z' in position ? position.z : position.y;
      
      const cellX = Math.floor(x / this.gridCellSize);
      const cellZ = Math.floor(z / this.gridCellSize);
      
      cell = {
        minX: cellX * this.gridCellSize,
        minZ: cellZ * this.gridCellSize,
        maxX: (cellX + 1) * this.gridCellSize,
        maxZ: (cellZ + 1) * this.gridCellSize,
        samples: [],
        lastAccessTime: performance.now()
      };
      
      this.terrainGridCache.set(key, cell);
    } else {
      cell.lastAccessTime = performance.now();
    }
    
    return cell;
  }
  
  /**
   * Creates a terrain mesh from the heightmap data.
   */
  private createTerrainFromHeightmap(): void {
    if (!this.scene || !this.heightmapData) return;
    
    const { width, height: mapHeight, heights, scale, verticalScale } = this.heightmapData;
    
    // Create a ground mesh from the heightmap data
    const ground = BABYLON.MeshBuilder.CreateGroundFromHeightMap(
      "terrain",
      "heightmap", // This is a placeholder; we're using the raw data from heights
      {
        width: width * scale.x,
        height: mapHeight * scale.y,
        subdivisions: Math.min(width, mapHeight),
        minHeight: this.heightmapData.minHeight * verticalScale,
        maxHeight: this.heightmapData.maxHeight * verticalScale
      },
      this.scene
    );
    
    // Manually update the vertex data since we're using raw height data
    // Note: In a real implementation, you'd probably use a shader or compute process
    // to convert the raw heights into a proper heightmap texture
    
    // Set the terrain mesh
    this.setTerrainMesh(ground);
  }
  
  /**
   * Sets the terrain mesh.
   * @param terrainMesh The terrain mesh to use for collision
   */
  public setTerrainMesh(terrainMesh: BABYLON.Mesh): void {
    if (!this.scene) {
      throw new Error("TerrainCollider: Must initialize before setting terrain mesh");
    }
    
    // Clean up previous impostor if it exists
    if (this.terrainImpostor) {
      this.terrainImpostor.dispose();
      this.terrainImpostor = null;
    }
    
    this.terrainMesh = terrainMesh;
    
    // Create a physics impostor for the terrain
    this.terrainImpostor = new BABYLON.PhysicsImpostor(
      terrainMesh,
      BABYLON.PhysicsImpostor.MeshImpostor,
      { mass: 0, friction: 0.5, restitution: 0.3 },
      this.scene
    );
    
    // Track the impostor
    this.trackResource(this.terrainImpostor, ResourceType.IMPOSTOR, 'terrainImpostor');
    
    // Register for collision events
    this.registerTerrainCollisionEvents();
    
    // Clear any existing caches when setting new terrain mesh
    this.clearCaches();
    
    // Pre-populate cache with a grid of samples
    if (this.heightmapData) {
      this.preCacheTerrainData();
    }
    
    this.logger.debug("TerrainCollider: Terrain mesh set");
  }
  
  /**
   * Pre-populates the terrain data cache with a grid of samples
   */
  private preCacheTerrainData(): void {
    if (!this.heightmapData || !this.useHeightCaching) return;
    
    const { width, height, scale } = this.heightmapData;
    
    // Skip if terrain is too large (would take too much memory)
    if (width * height > 4000 * 4000) {
      this.logger.debug("Terrain too large for full pre-caching, will cache on demand");
      return;
    }
    
    this.logger.debug("Pre-caching terrain data...");
    
    // Sample points at spatialSamplingResolution intervals
    const totalWidth = width * scale.x;
    const totalHeight = height * scale.y;
    
    const startX = -totalWidth / 2;
    const startZ = -totalHeight / 2;
    const endX = totalWidth / 2;
    const endZ = totalHeight / 2;
    
    let sampleCount = 0;
    
    // Process in smaller batches to avoid blocking the main thread for too long
    const processBatch = (x: number, z: number) => {
      const batchSize = 100;
      let processed = 0;
      
      while (processed < batchSize && x <= endX) {
        while (processed < batchSize && z <= endZ) {
          const position = new BABYLON.Vector3(x, 0, z);
          
          // Get and cache the height and normal
          const height = this.getHeightFromHeightmap(position);
          
          if (height !== null) {
            position.y = height;
            const normal = this.getNormalFromHeightmap(position);
            const materialType = this.getMaterialTypeAt(position);
            
            // Add to our caches
            const cacheKey = `${x.toFixed(1)},${z.toFixed(1)}`;
            const entry: TerrainDataCacheEntry = {
              position: position.clone(),
              height,
              normal,
              lastAccessTime: performance.now(),
              materialType
            };
            
            this.terrainDataCache.set(cacheKey, entry);
            
            // Also add to the grid cache
            const cell = this.getOrCreateGridCell(position);
            if (cell.samples.length < this.maxSamplesPerCell) {
              cell.samples.push(entry);
            }
            
            sampleCount++;
          }
          
          z += this.spatialSamplingResolution;
          processed++;
        }
        
        z = startZ;
        x += this.spatialSamplingResolution;
      }
      
      // Continue with the next batch if not done
      if (x <= endX) {
        setTimeout(() => processBatch(x, z), 0);
      } else {
        this.logger.debug(`Terrain pre-caching complete. ${sampleCount} points cached.`);
      }
    };
    
    // Start processing
    setTimeout(() => processBatch(startX, startZ), 0);
  }
  
  /**
   * Gets the closest cached sample to the given position
   */
  private getClosestCachedSample(position: BABYLON.Vector2 | BABYLON.Vector3): TerrainDataCacheEntry | null {
    // Check direct cache hit first
    const cacheKey = 'z' in position 
      ? `${position.x.toFixed(1)},${position.z.toFixed(1)}`
      : `${position.x.toFixed(1)},${position.y.toFixed(1)}`;
    
    const directHit = this.terrainDataCache.get(cacheKey);
    if (directHit) {
      directHit.lastAccessTime = performance.now();
      return directHit;
    }
    
    // Try to find a close enough sample in the grid cell
    const cell = this.getOrCreateGridCell(position);
    if (cell.samples.length === 0) {
      return null;
    }
    
    // Find the closest sample in the cell
    let closestSample: TerrainDataCacheEntry | null = null;
    let closestDistance = Number.MAX_VALUE;
    
    const x = 'z' in position ? position.x : position.x;
    const z = 'z' in position ? position.z : position.y;
    
    for (const sample of cell.samples) {
      const dx = sample.position.x - x;
      const dz = sample.position.z - z;
      const distSquared = dx * dx + dz * dz;
      
      if (distSquared < closestDistance) {
        closestDistance = distSquared;
        closestSample = sample;
      }
    }
    
    // Return if we found a sample within reasonable distance
    if (closestSample && Math.sqrt(closestDistance) < this.spatialSamplingResolution * 1.5) {
      closestSample.lastAccessTime = performance.now();
      return closestSample;
    }
    
    return null;
  }
  
  /**
   * Registers for collision events with the terrain.
   */
  private registerTerrainCollisionEvents(): void {
    if (!this.terrainImpostor || !this.scene) return;
    
    // Register for collision events
    this.terrainImpostor.registerOnPhysicsCollide([], (collider, collidedWith) => {
      if (!collider.object) return;
      
      // Get the position of the collision
      const collisionPoint = (collider.object as BABYLON.AbstractMesh).position.clone();
      
      // Get surface info at the collision point
      const surfaceInfo = this.getSurfaceInfoAt(collisionPoint);
      
      // Call all registered callbacks
      for (const registration of this.hitCallbacks.values()) {
        registration.callback({
          object: collider.object as BABYLON.AbstractMesh,
          surfaceInfo
        });
      }
    });
  }
  
  /**
   * Gets the height of the terrain at the given position.
   * @param position The position to check
   * @returns The height at the given position, or null if outside terrain bounds
   */
  public getHeightAt(position: BABYLON.Vector2 | BABYLON.Vector3): number | null {
    // First check the cache if enabled
    if (this.useHeightCaching) {
      const cachedSample = this.getClosestCachedSample(position);
      if (cachedSample) {
        return cachedSample.height;
      }
    }
    
    // If we have heightmap data, use that for accurate height
    if (this.heightmapData) {
      return this.getHeightFromHeightmap(position);
    }
    
    // Otherwise, use raycasting to get the height
    if (this.terrainMesh) {
      const ray = this.createVerticalRay(position);
      const hit = this.scene?.pickWithRay(ray);
      
      if (hit && hit.hit && hit.pickedMesh === this.terrainMesh) {
        const height = hit.pickedPoint?.y ?? null;
        
        // Cache this result if caching is enabled
        if (this.useHeightCaching && height !== null) {
          const x = 'z' in position ? position.x : position.x;
          const z = 'z' in position ? position.z : position.y;
          
          const cacheKey = `${x.toFixed(1)},${z.toFixed(1)}`;
          const pos = new BABYLON.Vector3(x, height, z);
          
          // Get normal and material for complete cache entry
          const normal = this.getSurfaceNormal(pos);
          const materialType = this.getMaterialTypeAt(pos);
          
          const entry: TerrainDataCacheEntry = {
            position: pos,
            height,
            normal,
            lastAccessTime: performance.now(),
            materialType
          };
          
          this.terrainDataCache.set(cacheKey, entry);
          
          // Also add to grid cache
          const cell = this.getOrCreateGridCell(position);
          if (cell.samples.length < this.maxSamplesPerCell) {
            cell.samples.push(entry);
          }
        }
        
        return height;
      }
    }
    
    return null;
  }
  
  /**
   * Gets the height from the heightmap data.
   * @param position The position to check
   * @returns The height at the given position, or null if outside terrain bounds
   */
  private getHeightFromHeightmap(position: BABYLON.Vector2 | BABYLON.Vector3): number | null {
    if (!this.heightmapData) return null;
    
    const { width, height: mapHeight, heights, scale, verticalScale } = this.heightmapData;
    
    // Convert from world to heightmap coordinates
    let x: number, z: number;
    
    if ('z' in position) {
      // Vector3
      x = position.x / scale.x + width / 2;
      z = position.z / scale.y + mapHeight / 2;
    } else {
      // Vector2
      x = position.x / scale.x + width / 2;
      z = position.y / scale.y + mapHeight / 2;
    }
    
    // Check bounds
    if (x < 0 || x >= width - 1 || z < 0 || z >= mapHeight - 1) {
      return null;
    }
    
    // Get the integer coordinates
    const x0 = Math.floor(x);
    const z0 = Math.floor(z);
    
    // Get the fractional parts
    const xf = x - x0;
    const zf = z - z0;
    
    // Get the heights of the surrounding points
    const h00 = heights[z0 * width + x0];
    const h10 = heights[z0 * width + (x0 + 1)];
    const h01 = heights[(z0 + 1) * width + x0];
    const h11 = heights[(z0 + 1) * width + (x0 + 1)];
    
    // Bilinear interpolation
    const h0 = h00 * (1 - xf) + h10 * xf;
    const h1 = h01 * (1 - xf) + h11 * xf;
    const height = h0 * (1 - zf) + h1 * zf;
    
    // Apply vertical scale
    const scaledHeight = height * verticalScale;
    
    return scaledHeight;
  }
  
  /**
   * Creates a vertical ray for height checking.
   * @param position The position to check
   * @returns A ray pointing downward from high above the position
   */
  private createVerticalRay(position: BABYLON.Vector2 | BABYLON.Vector3): BABYLON.Ray {
    let rayX: number, rayZ: number;
    
    if ('z' in position) {
      // Vector3
      rayX = position.x;
      rayZ = position.z;
    } else {
      // Vector2
      rayX = position.x;
      rayZ = position.y;
    }
    
    const rayOrigin = new BABYLON.Vector3(
      rayX,
      1000, // Start from high above
      rayZ
    );
    
    return new BABYLON.Ray(
      rayOrigin,
      new BABYLON.Vector3(0, -1, 0), // Pointing down
      2000 // Long enough to reach below ground level
    );
  }
  
  /**
   * Gets terrain surface information at the given position.
   * @param position The position to check
   * @returns Surface information at the given position
   */
  public getSurfaceInfoAt(position: BABYLON.Vector2 | BABYLON.Vector3): TerrainSurfaceInfo {
    // Get the height at the position
    const height = this.getHeightAt(position);
    
    // If no height data, return a default "no terrain" response
    if (height === null) {
      return {
        exists: false,
        height: -Infinity,
        normal: new BABYLON.Vector3(0, 1, 0),
        slope: 0,
        friction: this.defaultMaterial.friction
      };
    }
    
    // Get the surface normal
    const normal = this.getSurfaceNormal(position);
    
    // Calculate the slope angle (angle between normal and up vector)
    const slope = Math.acos(BABYLON.Vector3.Dot(normal, BABYLON.Vector3.Up()));
    
    // Determine the material type
    const materialType = this.getMaterialTypeAt(position);
    
    // Get the friction for this material
    const material = this.terrainMaterials.get(materialType) || this.defaultMaterial;
    
    return {
      exists: true,
      height,
      normal,
      slope,
      materialType,
      friction: material.friction
    };
  }
  
  /**
   * Gets the surface normal at the given position.
   * @param position The position to check
   * @returns The surface normal vector
   */
  private getSurfaceNormal(position: BABYLON.Vector2 | BABYLON.Vector3): BABYLON.Vector3 {
    if (this.heightmapData) {
      return this.getNormalFromHeightmap(position);
    }
    
    // Use raycasting for mesh-based terrain
    if (this.terrainMesh && this.scene) {
      const ray = this.createVerticalRay(position);
      const hit = this.scene.pickWithRay(ray);
      
      if (hit && hit.hit && hit.getNormal()) {
        return hit.getNormal() as BABYLON.Vector3;
      }
    }
    
    // Default to up vector if we can't determine the normal
    return new BABYLON.Vector3(0, 1, 0);
  }
  
  /**
   * Gets the surface normal from the heightmap data.
   * @param position The position to check
   * @returns The surface normal vector
   */
  private getNormalFromHeightmap(position: BABYLON.Vector2 | BABYLON.Vector3): BABYLON.Vector3 {
    if (!this.heightmapData) return new BABYLON.Vector3(0, 1, 0);
    
    const { width, height: mapHeight, heights, scale, verticalScale } = this.heightmapData;
    
    // Convert from world to heightmap coordinates
    let x: number, z: number;
    
    if ('z' in position) {
      // Vector3
      x = position.x / scale.x + width / 2;
      z = position.z / scale.y + mapHeight / 2;
    } else {
      // Vector2
      x = position.x / scale.x + width / 2;
      z = position.y / scale.y + mapHeight / 2;
    }
    
    // Check bounds
    if (x < 1 || x >= width - 1 || z < 1 || z >= mapHeight - 1) {
      return new BABYLON.Vector3(0, 1, 0);
    }
    
    // Get the indices of the center point
    const cx = Math.floor(x);
    const cz = Math.floor(z);
    
    // Get heights at surrounding points
    const hL = heights[cz * width + (cx - 1)];
    const hR = heights[cz * width + (cx + 1)];
    const hU = heights[(cz - 1) * width + cx];
    const hD = heights[(cz + 1) * width + cx];
    
    // Calculate the slope in x and z directions
    const slopeX = (hR - hL) / (2 * scale.x);
    const slopeZ = (hD - hU) / (2 * scale.y);
    
    // Create a normal vector perpendicular to the slopes
    const normal = new BABYLON.Vector3(-slopeX * verticalScale, 1, -slopeZ * verticalScale);
    
    // Normalize the vector
    return normal.normalize();
  }
  
  /**
   * Gets the material type at the given position.
   * @param position The position to check
   * @returns The material type name
   */
  private getMaterialTypeAt(position: BABYLON.Vector2 | BABYLON.Vector3): string {
    // Extract x/z coordinates
    let posX: number, posZ: number;
    
    if ('z' in position) {
      // Vector3
      posX = position.x;
      posZ = position.z;
    } else {
      // Vector2
      posX = position.x;
      posZ = position.y;
    }
    
    // Check if the position is within any defined region
    for (const [name, material] of this.terrainMaterials.entries()) {
      if (material.region) {
        const { x1, z1, x2, z2 } = material.region;
        if (posX >= x1 && posX <= x2 && posZ >= z1 && posZ <= z2) {
          return name;
        }
      }
    }
    
    // Return the default material type
    return this.defaultMaterial.name;
  }
  
  /**
   * Performs a raycast against the terrain.
   * @param from The starting position of the ray
   * @param direction The direction of the ray
   * @param maxDistance The maximum distance of the ray
   * @returns Information about the hit, or null if no hit occurred
   */
  public raycast(from: BABYLON.Vector3, direction: BABYLON.Vector3, maxDistance: number = 100): TerrainRaycastHit | null {
    if (!this.scene || (!this.terrainMesh && !this.heightmapData)) {
      return null;
    }
    
    // Create a ray
    const ray = new BABYLON.Ray(from, direction.normalize(), maxDistance);
    
    // Try heightmap-based raycast first if available
    if (this.heightmapData) {
      const hit = this.raycastHeightmap(ray);
      if (hit) return hit;
    }
    
    // Fall back to mesh-based raycast
    if (this.terrainMesh) {
      const hit = this.scene.pickWithRay(ray, (mesh) => mesh === this.terrainMesh);
      
      if (hit && hit.hit && hit.pickedPoint) {
        const position = hit.pickedPoint;
        const surfaceInfo = this.getSurfaceInfoAt(position);
        
        return {
          hit: true,
          position,
          normal: hit.getNormal() as BABYLON.Vector3 || surfaceInfo.normal,
          distance: hit.distance,
          surfaceInfo
        };
      }
    }
    
    return null;
  }
  
  /**
   * Performs a raycast against the heightmap.
   * @param ray The ray to use for the raycast
   * @returns Information about the hit, or null if no hit occurred
   */
  private raycastHeightmap(ray: BABYLON.Ray): TerrainRaycastHit | null {
    if (!this.heightmapData) return null;
    
    const { width, height: mapHeight, heights, scale, verticalScale } = this.heightmapData;
    
    // Convert the heightmap to a simple mesh representation for ray testing
    // In a real implementation, you'd use a more efficient algorithm
    
    // For demonstration purposes, we'll do a simplistic approach here
    // by stepping along the ray and checking against the heightmap
    
    const maxSteps = 100;
    const stepSize = ray.length / maxSteps;
    
    for (let i = 0; i < maxSteps; i++) {
      const distance = i * stepSize;
      const point = ray.origin.add(ray.direction.scale(distance));
      
      // Get height at this point
      const terrainHeight = this.getHeightAt(point);
      
      if (terrainHeight !== null && point.y <= terrainHeight) {
        // We've hit the terrain
        // Find more accurate intersection point by binary search
        const refinedDistance = this.refineRayHitDistance(ray, distance - stepSize, distance);
        const hitPoint = ray.origin.add(ray.direction.scale(refinedDistance));
        
        // Get surface info
        const surfaceInfo = this.getSurfaceInfoAt(hitPoint);
        
        return {
          hit: true,
          position: hitPoint,
          normal: surfaceInfo.normal,
          distance: refinedDistance,
          surfaceInfo
        };
      }
    }
    
    return null;
  }
  
  /**
   * Refines the exact distance at which a ray hits the terrain using binary search.
   * @param ray The ray being cast
   * @param minDist The minimum distance where the ray is above terrain
   * @param maxDist The maximum distance where the ray is below terrain
   * @param iterations The number of refinement iterations
   * @returns The refined distance
   */
  private refineRayHitDistance(ray: BABYLON.Ray, minDist: number, maxDist: number, iterations: number = 10): number {
    let minDistance = minDist;
    let maxDistance = maxDist;
    
    for (let i = 0; i < iterations; i++) {
      const midDistance = (minDistance + maxDistance) / 2;
      const midPoint = ray.origin.add(ray.direction.scale(midDistance));
      
      const terrainHeight = this.getHeightAt(midPoint);
      
      if (terrainHeight === null) {
        // No valid height data at this point, abort refinement
        return midDistance;
      }
      
      if (midPoint.y <= terrainHeight) {
        // Below terrain, set new max
        maxDistance = midDistance;
      } else {
        // Above terrain, set new min
        minDistance = midDistance;
      }
    }
    
    return maxDistance;
  }
  
  /**
   * Checks if an object is on the ground.
   * @param position The position to check
   * @param radius The radius of the object
   * @param height The height of the object above its center
   * @returns The ground position and normal if on ground, null otherwise
   */
  public checkGrounded(
    position: BABYLON.Vector3,
    radius: number,
    height: number
  ): { position: BABYLON.Vector3; normal: BABYLON.Vector3; surfaceInfo: TerrainSurfaceInfo } | null {
    // Calculate the bottom of the object
    const bottomPosition = position.clone();
    bottomPosition.y -= height / 2;
    
    // Check multiple points around the base for better ground detection
    const checkPoints = [
      bottomPosition.clone(), // Center
      bottomPosition.clone().add(new BABYLON.Vector3(radius * 0.7, 0, 0)), // Right
      bottomPosition.clone().add(new BABYLON.Vector3(-radius * 0.7, 0, 0)), // Left
      bottomPosition.clone().add(new BABYLON.Vector3(0, 0, radius * 0.7)), // Front
      bottomPosition.clone().add(new BABYLON.Vector3(0, 0, -radius * 0.7)) // Back
    ];
    
    // Check each point
    let lowestPoint: { 
      position: BABYLON.Vector3; 
      normal: BABYLON.Vector3;
      surfaceInfo: TerrainSurfaceInfo; 
    } | null = null;
    
    for (const point of checkPoints) {
      // Cast a ray downward to find the ground
      const ray = new BABYLON.Ray(
        point.add(new BABYLON.Vector3(0, 0.1, 0)), // Slight offset to avoid self-collision
        new BABYLON.Vector3(0, -1, 0),
        radius + 0.2 // Check slightly beyond the object's height
      );
      
      const hit = this.raycast(ray.origin, ray.direction, ray.length);
      
      if (hit && hit.hit) {
        // Update the lowest point
        if (!lowestPoint || hit.position.y < lowestPoint.position.y) {
          lowestPoint = {
            position: hit.position,
            normal: hit.normal,
            surfaceInfo: hit.surfaceInfo
          };
        }
      }
    }
    
    return lowestPoint;
  }
  
  /**
   * Gets the physics impostor for the terrain.
   * @returns The physics impostor for the terrain, if any
   */
  public getTerrainImpostor(): BABYLON.PhysicsImpostor | null {
    return this.terrainImpostor;
  }
  
  /**
   * Performs a sphere cast against the terrain.
   * @param from The starting position of the sphere
   * @param to The end position of the sphere
   * @param radius The radius of the sphere
   * @returns Information about the hit, or null if no hit occurred
   */
  public sphereCast(from: BABYLON.Vector3, to: BABYLON.Vector3, radius: number): TerrainRaycastHit | null {
    // Direction of the sphere cast
    const direction = to.subtract(from).normalize();
    const distance = BABYLON.Vector3.Distance(from, to);
    
    // Start with a regular raycast
    const rayHit = this.raycast(from, direction, distance);
    
    if (rayHit && rayHit.hit) {
      // We have a hit with the ray, but we need to check if the sphere would hit sooner
      
      // For a sphere, we need to offset the hit position by the radius along the normal
      const earlierHitDistance = rayHit.distance - radius / Math.abs(BABYLON.Vector3.Dot(direction, rayHit.normal));
      
      if (earlierHitDistance < 0) {
        // The sphere is already intersecting at the start position
        // Find the actual intersection point
        const surfaceInfo = this.getSurfaceInfoAt(from);
        
        return {
          hit: true,
          position: from.clone(),
          normal: surfaceInfo.normal,
          distance: 0,
          surfaceInfo
        };
      }
      
      // Calculate the adjusted hit position
      const hitPosition = from.add(direction.scale(Math.max(0, earlierHitDistance)));
      const surfaceInfo = this.getSurfaceInfoAt(hitPosition);
      
      return {
        hit: true,
        position: hitPosition,
        normal: rayHit.normal,
        distance: earlierHitDistance,
        surfaceInfo
      };
    }
    
    // No direct ray hit, but the sphere might still hit if we're casting near the surface
    // For a complete implementation, you would check perpendicular rays as well
    
    return null;
  }
  
  /**
   * Registers a callback for when an object hits the terrain.
   * @param callback The callback to invoke
   * @returns An ID that can be used to unregister the callback
   */
  public registerTerrainHitCallback(
    callback: (hit: { object: BABYLON.AbstractMesh; surfaceInfo: TerrainSurfaceInfo }) => void
  ): string {
    const id = uuidv4();
    this.hitCallbacks.set(id, { id, callback });
    
    // Create a disposable wrapper for the callback registration
    const callbackWrapper = {
      dispose: () => {
        this.hitCallbacks.delete(id);
      }
    };
    
    // Track the callback
    this.trackResource(callbackWrapper, ResourceType.EVENT_LISTENER, `terrainHitCallback_${id}`);
    
    return id;
  }
  
  /**
   * Unregisters a terrain hit callback.
   * @param id The ID of the callback to unregister
   */
  public unregisterTerrainHitCallback(id: string): void {
    this.hitCallbacks.delete(id);
  }
  
  /**
   * Adds a terrain material type with its properties.
   * @param name The name of the material type
   * @param friction The friction coefficient of the material
   * @param region The region in the terrain where this material applies (x1, z1, x2, z2) or null for texture-based
   */
  public addTerrainMaterial(name: string, friction: number, region?: { x1: number; z1: number; x2: number; z2: number }): void {
    this.terrainMaterials.set(name, {
      name,
      friction,
      region
    });
  }
  
  /**
   * Cleans up resources used by the terrain collider.
   */
  public dispose(): void {
    this.logger.debug('Disposing TerrainCollider');
    
    // Dispose all tracked resources
    const disposedCount = this.resourceTracker.disposeByGroup(this.resourceGroup);
    this.logger.debug(`Disposed ${disposedCount} terrain collider resources`);
    
    // Reset all references
    this.terrainMesh = null;
    this.terrainImpostor = null;
    this.heightmapData = null;
    this.terrainMaterials.clear();
    this.hitCallbacks.clear();
    this.scene = null;
    
    this.logger.debug("TerrainCollider disposed");
  }
  
  /**
   * Track a resource with the ResourceTracker
   * @param resource The resource to track
   * @param type The type of resource
   * @param id Optional identifier for the resource
   * @returns The resource tracking ID
   */
  private trackResource(resource: any, type: ResourceType, id?: string): string {
    return this.resourceTracker.track(resource, {
      type,
      id,
      group: this.resourceGroup,
      metadata: {
        createdBy: 'TerrainCollider',
        createdAt: Date.now()
      }
    });
  }
  
  /**
   * Log a debug message
   * @param message The message to log
   */
  private logDebug(message: string): void {
    this.logger.debug(message);
  }
  
  /**
   * Log a warning message
   * @param message The message to log
   */
  private logWarning(message: string): void {
    this.logger.warn(message);
  }
  
  /**
   * Log an error message
   * @param message The message to log
   */
  private logError(message: string): void {
    this.logger.error(message);
  }
  
  /**
   * Adapts the terrain collider quality based on current performance
   */
  private adaptQualityBasedOnPerformance(): void {
    if (!this.scene || !this.adaptiveQuality) {
      return;
    }

    // Get the current FPS
    const fps = this.scene.getEngine().getFps();
    
    // Determine appropriate quality level based on FPS
    let newQualityLevel = this.currentPerformanceLevel;
    
    if (fps < 15) {
      // Very poor performance, reduce quality significantly
      newQualityLevel = TerrainCollisionPerformanceLevel.VERY_LOW;
    } else if (fps < 30) {
      // Poor performance, reduce quality
      newQualityLevel = TerrainCollisionPerformanceLevel.LOW;
    } else if (fps < 45) {
      // Acceptable performance but not great
      newQualityLevel = TerrainCollisionPerformanceLevel.MEDIUM;
    } else if (fps < 55) {
      // Good performance
      newQualityLevel = TerrainCollisionPerformanceLevel.HIGH;
    } else {
      // Excellent performance
      newQualityLevel = TerrainCollisionPerformanceLevel.ULTRA;
    }
    
    // Only update if quality level changed
    if (newQualityLevel !== this.currentPerformanceLevel) {
      this.setQualityLevel(newQualityLevel);
      this.logger.debug(`Adapted terrain collision quality to ${TerrainCollisionPerformanceLevel[newQualityLevel]}`);
    }
  }
  
  /**
   * Sets the quality level for terrain collision
   * @param level The quality level to set
   */
  private setQualityLevel(level: TerrainCollisionPerformanceLevel): void {
    this.currentPerformanceLevel = level;
    
    // Adjust parameters based on quality level
    switch (level) {
      case TerrainCollisionPerformanceLevel.ULTRA:
        this.options.raySamples = 9;
        this.useHeightCaching = true;
        this.useNormalCaching = true;
        this.useMaterialCaching = true;
        this.spatialSamplingResolution = 1;
        break;
      case TerrainCollisionPerformanceLevel.HIGH:
        this.options.raySamples = 5;
        this.useHeightCaching = true;
        this.useNormalCaching = true;
        this.useMaterialCaching = true;
        this.spatialSamplingResolution = 2;
        break;
      case TerrainCollisionPerformanceLevel.MEDIUM:
        this.options.raySamples = 3;
        this.useHeightCaching = true;
        this.useNormalCaching = true;
        this.useMaterialCaching = false;
        this.spatialSamplingResolution = 3;
        break;
      case TerrainCollisionPerformanceLevel.LOW:
        this.options.raySamples = 2;
        this.useHeightCaching = true;
        this.useNormalCaching = false;
        this.useMaterialCaching = false;
        this.spatialSamplingResolution = 4;
        break;
      case TerrainCollisionPerformanceLevel.VERY_LOW:
        this.options.raySamples = 1;
        this.useHeightCaching = false;
        this.useNormalCaching = false;
        this.useMaterialCaching = false;
        this.spatialSamplingResolution = 5;
        break;
    }
    
    // Clear caches when changing quality level
    this.clearCaches();
  }
}
