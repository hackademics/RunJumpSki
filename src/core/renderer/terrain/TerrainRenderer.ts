/**
 * @file src/core/renderer/terrain/TerrainRenderer.ts
 * @description Specialized renderer for terrain with LOD and optimization features
 * 
 * @dependencies babylonjs
 * @relatedFiles ITerrainRenderer.ts, LODTerrainSystem.ts, TerrainMaterialSystem.ts
 */
import * as BABYLON from 'babylonjs';
import { ITerrainRenderer } from './ITerrainRenderer';
import { ResourceTracker, ResourceType } from '../../utils/ResourceTracker';
import { Logger } from '../../utils/Logger';
import { ServiceLocator } from '../../base/ServiceLocator';

/**
 * Terrain rendering quality settings
 */
export enum TerrainQuality {
  LOW = 'low',       // Lowest quality, highest performance
  MEDIUM = 'medium', // Balanced quality/performance
  HIGH = 'high',     // High quality, moderate performance impact
  ULTRA = 'ultra'    // Maximum quality, significant performance impact
}

/**
 * Configuration for terrain rendering
 */
export interface TerrainRenderConfig {
  /** Quality preset */
  quality: TerrainQuality;
  /** Maximum view distance */
  viewDistance: number;
  /** Enable dynamic LOD based on distance */
  dynamicLOD: boolean;
  /** LOD level change distance (array of distances for each LOD level) */
  lodDistances: number[];
  /** Enable tessellation for close surfaces */
  tessellation: boolean;
  /** Enable normal mapping */
  normalMapping: boolean;
  /** Enable parallax mapping */
  parallaxMapping: boolean;
  /** Enable shadow casting */
  castShadows: boolean;
  /** Generate wireframe overlay for debugging */
  wireframe: boolean;
  /** Freeze terrain updates (for performance debugging) */
  freeze: boolean;
}

/**
 * Default configuration values
 */
export const DEFAULT_TERRAIN_CONFIG: TerrainRenderConfig = {
  quality: TerrainQuality.MEDIUM,
  viewDistance: 2000,
  dynamicLOD: true,
  lodDistances: [50, 150, 300, 600, 1200],
  tessellation: true,
  normalMapping: true,
  parallaxMapping: false,
  castShadows: true,
  wireframe: false,
  freeze: false
};

/**
 * Quality preset configurations
 */
export const TERRAIN_QUALITY_PRESETS: Record<TerrainQuality, Partial<TerrainRenderConfig>> = {
  [TerrainQuality.LOW]: {
    viewDistance: 1000,
    lodDistances: [25, 75, 150, 300, 600],
    tessellation: false,
    normalMapping: true,
    parallaxMapping: false
  },
  [TerrainQuality.MEDIUM]: {
    viewDistance: 2000,
    lodDistances: [50, 150, 300, 600, 1200],
    tessellation: true,
    normalMapping: true,
    parallaxMapping: false
  },
  [TerrainQuality.HIGH]: {
    viewDistance: 3000,
    lodDistances: [100, 300, 600, 1200, 2400],
    tessellation: true,
    normalMapping: true,
    parallaxMapping: true
  },
  [TerrainQuality.ULTRA]: {
    viewDistance: 4000,
    lodDistances: [150, 450, 900, 1800, 3600],
    tessellation: true,
    normalMapping: true,
    parallaxMapping: true
  }
};

/**
 * Terrain chunk data
 */
export interface TerrainChunk {
  /** Chunk ID (format: x_z) */
  id: string;
  /** Chunk mesh */
  mesh: BABYLON.Mesh;
  /** Chunk position */
  position: BABYLON.Vector3;
  /** Current LOD level */
  currentLOD: number;
  /** Bounding info for LOD calculations */
  boundingInfo: BABYLON.BoundingInfo;
  /** Distance to camera (updated each frame) */
  distanceToCamera: number;
  /** Visibility state */
  isVisible: boolean;
}

/**
 * Specialized renderer for terrain with optimization features
 */
export class TerrainRenderer implements ITerrainRenderer {
  private scene: BABYLON.Scene;
  private camera: BABYLON.Camera;
  private config: TerrainRenderConfig;
  private terrainRootNode: BABYLON.TransformNode;
  private material: BABYLON.Material;
  private chunks: Map<string, TerrainChunk> = new Map();
  private activeChunks: Set<string> = new Set();
  private heightData: Float32Array | null = null;
  private heightmapSize: BABYLON.Vector2 = new BABYLON.Vector2(0, 0);
  private terrainSize: BABYLON.Vector3 = new BABYLON.Vector3(1000, 100, 1000);
  private chunkSize: number = 64;
  private verticesPerChunkSide: number = 33; // Must be 2^n + 1 for LOD
  private updateObserver: BABYLON.Observer<BABYLON.Scene> | null = null;
  private isInitialized: boolean = false;
  private lastCameraPosition: BABYLON.Vector3 = new BABYLON.Vector3();
  private lodSwitchMargin: number = 10; // Hysteresis to prevent LOD flickering
  private wireframeMaterial: BABYLON.Material | null = null;
  private resourceTracker: ResourceTracker;
  private logger: Logger | null = null;
  private resourceGroup: string = 'terrain';

  /**
   * Create a new terrain renderer
   * @param scene The scene to render terrain in
   * @param camera The primary camera for LOD calculations
   * @param config Optional configuration settings
   * @param resourceTracker Optional resource tracker
   */
  constructor(
    scene: BABYLON.Scene,
    camera: BABYLON.Camera,
    config: Partial<TerrainRenderConfig> = {},
    resourceTracker?: ResourceTracker
  ) {
    this.scene = scene;
    this.camera = camera;
    
    // Set up resource tracking
    this.resourceTracker = resourceTracker || new ResourceTracker();
    
    // Try to get the logger from ServiceLocator
    try {
      const serviceLocator = ServiceLocator.getInstance();
      if (serviceLocator.has('logger')) {
        this.logger = serviceLocator.get<Logger>('logger');
      }
    } catch (e) {
      console.warn('Logger not available for TerrainRenderer');
    }
    
    // Merge with default config
    const qualityPreset = config.quality || DEFAULT_TERRAIN_CONFIG.quality;
    this.config = {
      ...DEFAULT_TERRAIN_CONFIG,
      ...TERRAIN_QUALITY_PRESETS[qualityPreset],
      ...config
    };
    
    // Create root node for all terrain chunks
    this.terrainRootNode = new BABYLON.TransformNode('terrainRoot', this.scene);
    this.trackResource(this.terrainRootNode, ResourceType.MESH, 'terrainRootNode');
    
    // Create default terrain material
    this.material = this.createDefaultMaterial();
    
    // Create wireframe material if needed
    if (this.config.wireframe) {
      this.wireframeMaterial = this.createWireframeMaterial();
    }
    
    this.logDebug('TerrainRenderer created');
  }
  
  /**
   * Initialize the terrain renderer
   * @param heightData The heightmap data (normalized 0-1)
   * @param width Width of the heightmap
   * @param height Height of the heightmap
   * @param terrainSize Physical size of the terrain (x, height, z)
   * @returns Promise that resolves when initialization is complete
   */
  public async initialize(
    heightData: Float32Array,
    width: number,
    height: number,
    terrainSize: BABYLON.Vector3
  ): Promise<void> {
    this.heightData = heightData;
    this.heightmapSize = new BABYLON.Vector2(width, height);
    this.terrainSize = terrainSize;
    
    // Determine optimal chunk size based on quality setting
    this.calculateOptimalChunkSettings();
    
    // Create terrain chunks
    await this.generateTerrainChunks();
    
    // Set up scene update observer for LOD management
    this.setupUpdateObserver();
    
    this.isInitialized = true;
    return Promise.resolve();
  }
  
  /**
   * Calculate optimal chunk settings based on quality
   */
  private calculateOptimalChunkSettings(): void {
    // Adjust chunk size and detail based on quality
    switch (this.config.quality) {
      case TerrainQuality.LOW:
        this.chunkSize = 128;
        this.verticesPerChunkSide = 17; // 16 segments + 1
        break;
      case TerrainQuality.MEDIUM:
        this.chunkSize = 96;
        this.verticesPerChunkSide = 33; // 32 segments + 1
        break;
      case TerrainQuality.HIGH:
        this.chunkSize = 64;
        this.verticesPerChunkSide = 65; // 64 segments + 1
        break;
      case TerrainQuality.ULTRA:
        this.chunkSize = 48;
        this.verticesPerChunkSide = 129; // 128 segments + 1
        break;
    }
  }
  
  /**
   * Create default terrain material
   * @returns The created material
   */
  private createDefaultMaterial(): BABYLON.Material {
    const material = new BABYLON.StandardMaterial('terrainMaterial', this.scene);
    material.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.5);
    material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    
    // Apply material settings based on config
    if (this.config.normalMapping) {
      // In a real implementation, we would create/load normal maps
      // material.bumpTexture = ...
    }
    
    if (this.config.parallaxMapping) {
      // Enable parallax if configured
      // material.useParallax = true;
      // material.useParallaxOcclusion = true;
      // material.parallaxScaleBias = 0.1;
    }
    
    // Track the material
    this.trackResource(material, ResourceType.MATERIAL, 'terrainMaterial');
    
    return material;
  }
  
  /**
   * Create wireframe material for debugging
   * @returns The created wireframe material
   */
  private createWireframeMaterial(): BABYLON.Material {
    const wireframeMaterial = new BABYLON.StandardMaterial('terrainWireframe', this.scene);
    wireframeMaterial.wireframe = true;
    wireframeMaterial.diffuseColor = new BABYLON.Color3(0, 1, 0);
    wireframeMaterial.emissiveColor = new BABYLON.Color3(0, 0.5, 0);
    
    // Track the material
    this.trackResource(wireframeMaterial, ResourceType.MATERIAL, 'terrainWireframeMaterial');
    
    return wireframeMaterial;
  }
  
  /**
   * Generate terrain chunks covering the terrain
   */
  private async generateTerrainChunks(): Promise<void> {
    if (!this.heightData) {
      throw new Error('Heightmap data not initialized');
    }
    
    // Calculate how many chunks we need in each dimension
    const chunksX = Math.ceil(this.terrainSize.x / this.chunkSize);
    const chunksZ = Math.ceil(this.terrainSize.z / this.chunkSize);
    
    // Track creation promises for all chunks
    const chunkPromises: Promise<void>[] = [];
    
    // Create all chunks
    for (let x = 0; x < chunksX; x++) {
      for (let z = 0; z < chunksZ; z++) {
        const chunkId = `${x}_${z}`;
        const chunkPromise = this.createChunk(chunkId, x, z);
        chunkPromises.push(chunkPromise);
      }
    }
    
    // Wait for all chunks to be created
    await Promise.all(chunkPromises);
  }
  
  /**
   * Create a single terrain chunk
   * @param id Chunk identifier
   * @param gridX X position in the chunk grid
   * @param gridZ Z position in the chunk grid
   */
  private async createChunk(id: string, gridX: number, gridZ: number): Promise<void> {
    // Calculate world position
    const posX = (gridX * this.chunkSize) - (this.terrainSize.x / 2);
    const posZ = (gridZ * this.chunkSize) - (this.terrainSize.z / 2);
    
    // Create a mesh for this chunk
    const mesh = new BABYLON.Mesh(`terrain_chunk_${id}`, this.scene);
    mesh.parent = this.terrainRootNode;
    mesh.position = new BABYLON.Vector3(posX, 0, posZ);
    mesh.material = this.material;
    
    // Generate mesh data at highest LOD initially
    await this.generateChunkGeometry(mesh, 0);
    
    // Track the mesh
    this.trackResource(mesh, ResourceType.MESH, `terrain_chunk_${id}`);
    
    // If wireframe debugging is enabled, create a wireframe representation
    if (this.config.wireframe && this.wireframeMaterial) {
      const wireframe = mesh.clone(`terrain_chunk_${id}_wireframe`);
      wireframe.material = this.wireframeMaterial;
      wireframe.position = mesh.position.clone();
      wireframe.parent = this.terrainRootNode;
      
      // Store reference to wireframe in mesh metadata
      mesh.metadata = { wireframe };
      
      // Track the wireframe mesh
      this.trackResource(wireframe, ResourceType.MESH, `terrain_chunk_${id}_wireframe`);
    }
    
    // Create and store chunk data
    const chunk: TerrainChunk = {
      id,
      mesh,
      position: mesh.position.clone(),
      currentLOD: 0,
      boundingInfo: mesh.getBoundingInfo(),
      distanceToCamera: 0,
      isVisible: true
    };
    
    // Store the chunk
    this.chunks.set(id, chunk);
    this.activeChunks.add(id);
    
    // Update bounding info after geometry is created
    chunk.boundingInfo = mesh.getBoundingInfo();
    
    return Promise.resolve();
  }
  
  /**
   * Generate geometry for a chunk at specified LOD level
   * @param mesh Target mesh to update
   * @param lodLevel LOD level (0 = highest detail)
   */
  private async generateChunkGeometry(mesh: BABYLON.Mesh, lodLevel: number): Promise<void> {
    if (!this.heightData) {
      throw new Error('Heightmap data not initialized');
    }
    
    // Calculate step size for this LOD level
    // Higher LOD levels mean larger steps between vertices (less detail)
    const stepSize = Math.pow(2, lodLevel);
    
    // Calculate vertices per side at this LOD
    const verticesPerSide = Math.floor((this.verticesPerChunkSide - 1) / stepSize) + 1;
    
    // Create positions, normals, and UVs arrays
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    
    // Extract mesh world position
    const chunkPos = mesh.position;
    
    // Calculate heightmap sample area for this chunk
    const hmStartX = Math.floor((chunkPos.x + (this.terrainSize.x / 2)) / this.terrainSize.x * this.heightmapSize.x);
    const hmStartZ = Math.floor((chunkPos.z + (this.terrainSize.z / 2)) / this.terrainSize.z * this.heightmapSize.y);
    
    // Scale factors to convert from vertex index to:
    // 1. Local position in the chunk
    const localScale = this.chunkSize / (this.verticesPerChunkSide - 1);
    // 2. Heightmap coordinates
    const hmXScale = this.heightmapSize.x / this.terrainSize.x;
    const hmZScale = this.heightmapSize.y / this.terrainSize.z;
    // 3. UV coordinates (0-1 across the chunk)
    const uvScale = 1 / (verticesPerSide - 1);
    
    // Generate vertices
    for (let z = 0; z < verticesPerSide; z++) {
      for (let x = 0; x < verticesPerSide; x++) {
        // Calculate local position in chunk
        const xPos = x * stepSize * localScale;
        const zPos = z * stepSize * localScale;
        
        // Calculate heightmap coordinates
        const hmX = Math.floor(hmStartX + x * stepSize * hmXScale);
        const hmZ = Math.floor(hmStartZ + z * stepSize * hmZScale);
        
        // Sample height from heightmap, with bounds checking
        let height = 0;
        if (hmX >= 0 && hmX < this.heightmapSize.x && hmZ >= 0 && hmZ < this.heightmapSize.y) {
          const heightIndex = hmZ * this.heightmapSize.x + hmX;
          height = this.heightData[heightIndex] * this.terrainSize.y;
        }
        
        // Add position
        positions.push(xPos, height, zPos);
        
        // Calculate UV (simple planar mapping)
        uvs.push(x * uvScale, z * uvScale);
        
        // Add placeholder for normals (will be computed)
        normals.push(0, 1, 0);
      }
    }
    
    // Generate indices for triangles
    for (let z = 0; z < verticesPerSide - 1; z++) {
      for (let x = 0; x < verticesPerSide - 1; x++) {
        const baseIdx = z * verticesPerSide + x;
        
        // First triangle (top-left, bottom-left, bottom-right)
        indices.push(baseIdx, baseIdx + verticesPerSide, baseIdx + 1);
        
        // Second triangle (bottom-right, bottom-left, top-right)
        indices.push(baseIdx + 1, baseIdx + verticesPerSide, baseIdx + verticesPerSide + 1);
      }
    }
    
    // Create vertex data from our arrays
    const vertexData = new BABYLON.VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.uvs = uvs;
    
    // Compute normals based on position data
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);
    vertexData.normals = normals;
    
    // Apply to the mesh
    vertexData.applyToMesh(mesh);
    
    // Update bounding info
    mesh.refreshBoundingInfo();
    
    return Promise.resolve();
  }
  
  /**
   * Setup the update observer for LOD management
   */
  private setupUpdateObserver(): void {
    // Remove existing observer if any
    if (this.updateObserver) {
      this.scene.onBeforeRenderObservable.remove(this.updateObserver);
    }
    
    // Add new observer
    this.updateObserver = this.scene.onBeforeRenderObservable.add(() => {
      if (!this.config.freeze) {
        this.updateChunks();
      }
    });
    
    // Track the event listener
    if (this.updateObserver) {
      this.trackResource({
        dispose: () => {
          if (this.updateObserver) {
            this.scene.onBeforeRenderObservable.remove(this.updateObserver);
            this.updateObserver = null;
          }
        }
      }, ResourceType.EVENT_LISTENER, 'terrainUpdateObserver');
    }
  }
  
  /**
   * Update all chunks based on camera position
   */
  private updateChunks(): void {
    const cameraPos = this.camera.position;
    const viewDistance = this.config.viewDistance;
    
    // Update all chunks
    for (const [id, chunk] of this.chunks.entries()) {
      // Calculate distance to camera
      const chunkCenter = chunk.position.clone();
      chunkCenter.y += this.terrainSize.y / 2; // Approximate center height
      const distance = BABYLON.Vector3.Distance(chunkCenter, cameraPos);
      chunk.distanceToCamera = distance;
      
      // Determine visibility
      const wasVisible = chunk.isVisible;
      chunk.isVisible = distance <= viewDistance;
      
      // Update mesh visibility if changed
      if (wasVisible !== chunk.isVisible) {
        chunk.mesh.setEnabled(chunk.isVisible);
        
        // Update active chunks set
        if (chunk.isVisible) {
          this.activeChunks.add(id);
        } else {
          this.activeChunks.delete(id);
        }
      }
      
      // Skip LOD updates for invisible chunks
      if (!chunk.isVisible) continue;
      
      // Determine appropriate LOD level based on distance
      const targetLOD = this.calculateTargetLOD(distance);
      
      // Only update LOD if it needs to change
      // Apply hysteresis to prevent LOD flickering at boundaries
      if (this.shouldChangeLOD(chunk.currentLOD, targetLOD, distance)) {
        this.updateChunkLOD(chunk, targetLOD);
      }
    }
  }
  
  /**
   * Calculate target LOD level based on distance
   * @param distance Distance to camera
   * @returns Target LOD level
   */
  private calculateTargetLOD(distance: number): number {
    // If dynamic LOD is disabled, always use highest detail
    if (!this.config.dynamicLOD) {
      return 0;
    }
    
    // Find the appropriate LOD level based on distance
    for (let i = 0; i < this.config.lodDistances.length; i++) {
      if (distance < this.config.lodDistances[i]) {
        return i;
      }
    }
    
    // If beyond all defined distances, use lowest detail
    return this.config.lodDistances.length;
  }
  
  /**
   * Determine if LOD level should change with hysteresis
   * @param currentLOD Current LOD level
   * @param targetLOD Target LOD level
   * @param distance Distance to camera
   * @returns True if LOD should change
   */
  private shouldChangeLOD(currentLOD: number, targetLOD: number, distance: number): boolean {
    // If same LOD, no change needed
    if (currentLOD === targetLOD) {
      return false;
    }
    
    // If switching to higher detail (lower LOD number)
    if (targetLOD < currentLOD) {
      // Calculate the threshold distance with negative margin
      const thresholdDistance = this.config.lodDistances[targetLOD] - this.lodSwitchMargin;
      return distance < thresholdDistance;
    }
    
    // If switching to lower detail (higher LOD number)
    if (targetLOD > currentLOD) {
      // Calculate the threshold distance with positive margin
      const thresholdDistance = this.config.lodDistances[currentLOD] + this.lodSwitchMargin;
      return distance > thresholdDistance;
    }
    
    return false;
  }
  
  /**
   * Update a chunk's LOD level
   * @param chunk The chunk to update
   * @param lodLevel Target LOD level
   */
  private updateChunkLOD(chunk: TerrainChunk, lodLevel: number): void {
    // Skip if already at the target LOD
    if (chunk.currentLOD === lodLevel) {
      return;
    }
    
    // Generate new geometry at target LOD
    this.generateChunkGeometry(chunk.mesh, lodLevel);
    
    // Update chunk data
    chunk.currentLOD = lodLevel;
    chunk.boundingInfo = chunk.mesh.getBoundingInfo();
  }
  
  /**
   * Update terrain configuration
   * @param config New configuration options
   */
  public updateConfig(config: Partial<TerrainRenderConfig>): void {
    // Store previous config for comparison
    const prevConfig = { ...this.config };
    
    // Merge new config
    this.config = { ...this.config, ...config };
    
    // Check if quality changed
    if (config.quality && config.quality !== prevConfig.quality) {
      // Apply quality preset
      this.config = {
        ...this.config,
        ...TERRAIN_QUALITY_PRESETS[config.quality]
      };
      
      // Override with any explicit settings from the config
      this.config = { ...this.config, ...config };
    }
    
    // Handle wireframe toggle
    if (config.wireframe !== undefined && config.wireframe !== prevConfig.wireframe) {
      if (config.wireframe) {
        // Create wireframe material if needed
        if (!this.wireframeMaterial) {
          this.wireframeMaterial = this.createWireframeMaterial();
        }
        
        // Create wireframe overlays for all chunks
        for (const chunk of this.chunks.values()) {
          if (!chunk.mesh.metadata?.wireframe) {
            const wireframeMesh = chunk.mesh.clone(`${chunk.mesh.name}_wireframe`);
            wireframeMesh.material = this.wireframeMaterial;
            wireframeMesh.position = BABYLON.Vector3.Zero();
            wireframeMesh.parent = chunk.mesh;
            
            if (!chunk.mesh.metadata) chunk.mesh.metadata = {};
            chunk.mesh.metadata.wireframe = wireframeMesh;
          } else {
            (chunk.mesh.metadata.wireframe as BABYLON.Mesh).setEnabled(true);
          }
        }
      } else {
        // Hide wireframe overlays
        for (const chunk of this.chunks.values()) {
          if (chunk.mesh.metadata?.wireframe) {
            (chunk.mesh.metadata.wireframe as BABYLON.Mesh).setEnabled(false);
          }
        }
      }
    }
    
    // Force update all chunks if certain parameters changed
    if (
      config.quality !== prevConfig.quality ||
      config.dynamicLOD !== prevConfig.dynamicLOD ||
      config.lodDistances !== prevConfig.lodDistances
    ) {
      this.updateChunks();
    }
  }
  
  /**
   * Get the height at a specific world position
   * @param position The position to sample
   * @returns The terrain height at the position, or null if out of bounds
   */
  public getHeightAtPosition(position: BABYLON.Vector3): number | null {
    if (!this.heightData) {
      return null;
    }
    
    // Convert world position to heightmap coordinates
    const hmX = Math.floor(
      ((position.x + this.terrainSize.x / 2) / this.terrainSize.x) * this.heightmapSize.x
    );
    const hmZ = Math.floor(
      ((position.z + this.terrainSize.z / 2) / this.terrainSize.z) * this.heightmapSize.y
    );
    
    // Check bounds
    if (
      hmX < 0 || hmX >= this.heightmapSize.x ||
      hmZ < 0 || hmZ >= this.heightmapSize.y
    ) {
      return null;
    }
    
    // Sample height
    const heightIndex = hmZ * this.heightmapSize.x + hmX;
    return this.heightData[heightIndex] * this.terrainSize.y;
  }
  
  /**
   * Apply a texture to the terrain based on slope and height
   * @param textures Array of texture file paths
   * @param slopeThresholds Array of slope thresholds (0-1) for each texture
   * @param heightThresholds Array of height thresholds (0-1) for each texture
   * @param tiling How many times to tile textures across the terrain
   */
  public applyTexturesBySlope(
    textures: string[],
    slopeThresholds: number[],
    heightThresholds: number[],
    tiling: number = 16
  ): void {
    // In a real implementation, this would use a custom shader
    // to blend textures based on slope and height
    
    // For now, just apply a simple material with the first texture
    if (textures.length > 0) {
      const material = new BABYLON.StandardMaterial('terrainMaterial', this.scene);
      material.diffuseTexture = new BABYLON.Texture(textures[0], this.scene);
      (material.diffuseTexture as BABYLON.Texture).uScale = tiling;
      (material.diffuseTexture as BABYLON.Texture).vScale = tiling;
      
      // Apply to all chunks
      for (const chunk of this.chunks.values()) {
        chunk.mesh.material = material;
      }
      
      // Store as current material
      this.material = material;
    }
  }
  
  /**
   * Release all resources
   */
  public dispose(): void {
    this.logDebug('Disposing TerrainRenderer');
    
    // Dispose all tracked resources by group
    const disposedCount = this.resourceTracker.disposeByGroup(this.resourceGroup);
    this.logDebug(`Disposed ${disposedCount} terrain resources`);
    
    // Clear collections
    this.chunks.clear();
    this.activeChunks.clear();
    
    // Reset state
    this.isInitialized = false;
    this.heightData = null;
    this.updateObserver = null;
    this.material = null as any;
    this.wireframeMaterial = null;
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
        createdBy: 'TerrainRenderer',
        createdAt: Date.now()
      }
    });
  }
  
  /**
   * Log a debug message
   * @param message The message to log
   */
  private logDebug(message: string): void {
    if (this.logger) {
      this.logger.debug(`[TerrainRenderer] ${message}`);
    }
  }
  
  /**
   * Log a warning message
   * @param message The message to log
   */
  private logWarning(message: string): void {
    if (this.logger) {
      this.logger.warn(`[TerrainRenderer] ${message}`);
    } else {
      console.warn(`[TerrainRenderer] ${message}`);
    }
  }
  
  /**
   * Log an error message
   * @param message The message to log
   */
  private logError(message: string): void {
    if (this.logger) {
      this.logger.error(`[TerrainRenderer] ${message}`);
    } else {
      console.error(`[TerrainRenderer] ${message}`);
    }
  }

  /**
   * Get performance statistics
   * @returns Object with performance metrics
   */
  public getStats(): Record<string, any> {
    const totalChunks = this.chunks.size;
    const activeChunks = this.activeChunks.size;
    
    // Calculate vertices and triangles
    let totalVertices = 0;
    let totalTriangles = 0;
    
    for (const chunkId of this.activeChunks) {
      const chunk = this.chunks.get(chunkId);
      if (chunk) {
        const verticesPerSide = Math.floor(
          (this.verticesPerChunkSide - 1) / Math.pow(2, chunk.currentLOD)
        ) + 1;
        const vertices = verticesPerSide * verticesPerSide;
        const triangles = (verticesPerSide - 1) * (verticesPerSide - 1) * 2;
        
        totalVertices += vertices;
        totalTriangles += triangles;
      }
    }
    
    return {
      totalChunks,
      activeChunks,
      totalVertices,
      totalTriangles,
      chunkSize: this.chunkSize,
      verticesPerChunkSide: this.verticesPerChunkSide,
      terrainSize: this.terrainSize,
      quality: this.config.quality
    };
  }
  
  /**
   * Set the terrain rendering quality
   * @param quality The quality level to set
   */
  public setQuality(quality: TerrainQuality): void {
    this.config.quality = quality;
    this.updateConfig({ quality });
  }
  
  /**
   * Set the view distance for terrain rendering
   * @param distance View distance in world units
   */
  public setViewDistance(distance: number): void {
    this.config.viewDistance = distance;
    this.updateConfig({ viewDistance: distance });
  }
  
  /**
   * Get the default view distance for terrain rendering
   * @returns Default view distance in world units
   */
  public getDefaultViewDistance(): number {
    return DEFAULT_TERRAIN_CONFIG.viewDistance;
  }
  
  /**
   * Set whether to render terrain in wireframe mode
   * @param enabled Whether wireframe mode should be enabled
   */
  public setWireframe(enabled: boolean): void {
    this.config.wireframe = enabled;
    this.updateConfig({ wireframe: enabled });
  }
  
  /**
   * Check if wireframe mode is enabled
   * @returns Whether wireframe mode is currently enabled
   */
  public isWireframe(): boolean {
    return this.config.wireframe;
  }
  
  /**
   * Get the height at the specified x, z coordinates
   * @param x X coordinate in world space
   * @param z Z coordinate in world space
   * @returns Height at the specified coordinates
   */
  public getHeightAt(x: number, z: number): number {
    const position = new BABYLON.Vector3(x, 0, z);
    return this.getHeightAtPosition(position) || 0;
  }
  
  /**
   * Get the surface normal at the specified x, z coordinates
   * @param x X coordinate in world space
   * @param z Z coordinate in world space
   * @returns Normal vector at the specified coordinates
   */
  public getNormalAt(x: number, z: number): BABYLON.Vector3 {
    // Calculate normal using height differences at nearby points
    const heightCenter = this.getHeightAt(x, z);
    const heightLeft = this.getHeightAt(x - 1, z);
    const heightRight = this.getHeightAt(x + 1, z);
    const heightUp = this.getHeightAt(x, z - 1);
    const heightDown = this.getHeightAt(x, z + 1);
    
    // Create tangent vectors
    const tangentX = new BABYLON.Vector3(2, heightRight - heightLeft, 0).normalize();
    const tangentZ = new BABYLON.Vector3(0, heightDown - heightUp, 2).normalize();
    
    // Calculate normal as cross product of tangents
    const normal = BABYLON.Vector3.Cross(tangentZ, tangentX).normalize();
    
    return normal;
  }
  
  /**
   * Get the slope at the specified x, z coordinates
   * @param x X coordinate in world space
   * @param z Z coordinate in world space
   * @returns Slope in radians at the specified coordinates
   */
  public getSlopeAt(x: number, z: number): number {
    const normal = this.getNormalAt(x, z);
    const up = new BABYLON.Vector3(0, 1, 0);
    
    // Calculate angle between normal and up vector
    const angle = Math.acos(BABYLON.Vector3.Dot(normal, up));
    
    return angle;
  }
  
  /**
   * Create the terrain geometry and materials
   */
  public createTerrain(): void {
    if (this.heightData && this.heightmapSize.x > 0 && this.heightmapSize.y > 0) {
      this.generateTerrainChunks();
    } else {
      this.logWarning('Cannot create terrain: missing height data or invalid dimensions');
    }
  }
  
  /**
   * Update the terrain rendering
   * @param deltaTime Time since last update in seconds
   */
  public update(deltaTime: number): void {
    if (!this.config.freeze) {
      this.updateChunks();
    }
  }
} 