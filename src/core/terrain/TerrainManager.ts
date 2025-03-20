/**
 * @file src/core/terrain/TerrainManager.ts
 * @description Manages terrain generation, materials, and collision detection.
 */

import * as BABYLON from 'babylonjs';
import { TerrainCollider } from '../physics/TerrainCollider';
import { ITerrainCollider, HeightmapData, TerrainSurfaceInfo } from '../physics/ITerrainCollider';
import { IGameObjectManager } from '../IGameObjectManager';
import { EventEmitter } from '../events/EventEmitter';
import { Logger } from '../utils/Logger';
import { ServiceLocator } from '../base/ServiceLocator';

// Terrain material types
export enum TerrainMaterialType {
  DEFAULT = 'default',
  SNOW = 'snow',
  ICE = 'ice',
  DIRT = 'dirt',
  ROCK = 'rock',
  GRASS = 'grass'
}

// Terrain events
export enum TerrainEvents {
  TERRAIN_LOADED = 'terrain-loaded',
  TERRAIN_MATERIAL_CHANGED = 'terrain-material-changed',
  PLAYER_TERRAIN_COLLISION = 'player-terrain-collision',
  OBJECT_TERRAIN_COLLISION = 'object-terrain-collision'
}

// Terrain collision event data
export interface TerrainCollisionEvent {
  object: BABYLON.AbstractMesh;
  position: BABYLON.Vector3;
  normal: BABYLON.Vector3;
  surfaceInfo: TerrainSurfaceInfo;
  velocity?: BABYLON.Vector3;
}

// Configuration for terrain generation
export interface TerrainConfig {
  width: number;
  height: number;
  minHeight: number;
  maxHeight: number;
  resolution: number;
  scale: BABYLON.Vector2;
  verticalScale: number;
  randomSeed?: number;
  heightmapUrl?: string;
  materials: {
    [key in TerrainMaterialType]?: {
      texture?: string;
      friction: number;
      regions?: Array<{ x1: number; z1: number; x2: number; z2: number }>;
    }
  };
}

/**
 * TerrainManager handles terrain generation, modification and collision detection
 */
export class TerrainManager implements IGameObjectManager {
  private scene: BABYLON.Scene;
  private terrainMesh: BABYLON.Mesh | null = null;
  private terrainCollider: ITerrainCollider;
  private heightmapData: HeightmapData | null = null;
  private config: TerrainConfig | null = null;
  private events: EventEmitter = new EventEmitter();
  private initialized: boolean = false;
  private loadingPromise: Promise<void> | null = null;
  private materialCallbackIds: Map<TerrainMaterialType, string> = new Map();
  private logger: Logger;

  /**
   * Creates a new terrain manager
   * @param scene The Babylon.js scene
   */
  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
    // Create terrain collider with the scene
    this.terrainCollider = new TerrainCollider(this.scene);
    this.logger = new Logger('TerrainManager');
    
    // Try to get the logger from ServiceLocator if available
    try {
      const serviceLocator = ServiceLocator.getInstance();
      if (serviceLocator.has('logger')) {
        this.logger = serviceLocator.get<Logger>('logger');
        // Add the TerrainManager tag
        this.logger.addTag('TerrainManager');
      }
    } catch (e) {
      // If service locator is not available, we'll use the default logger
    }
  }

  /**
   * Initializes the terrain manager
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize the terrain collider
    this.terrainCollider.initialize(this.scene);
    
    this.initialized = true;
    this.logger.info("TerrainManager initialized");
  }

  /**
   * Updates the terrain manager
   * @param deltaTime Time elapsed since the last update
   */
  public update(deltaTime: number): void {
    if (!this.initialized) return;

    // Update the terrain collider
    this.terrainCollider.update(deltaTime);
  }

  /**
   * Loads and generates a terrain from a configuration
   * @param config The terrain configuration
   */
  public async loadTerrain(config: TerrainConfig): Promise<void> {
    if (!this.initialized) {
      throw new Error("TerrainManager must be initialized before loading terrain");
    }

    // Store the configuration
    this.config = config;

    try {
      // Generate or load the heightmap
      if (this.loadingPromise) {
        return this.loadingPromise;
      }
      
      this.loadingPromise = this.generateHeightmap(config);
      await this.loadingPromise;
      this.loadingPromise = null;

      // Set up the materials
      this.setupTerrainMaterials(config.materials);

      // Emit the terrain loaded event
      this.events.emit(TerrainEvents.TERRAIN_LOADED, { terrain: this.terrainMesh });

      this.logger.info("Terrain loaded");
    } catch (error) {
      this.logger.error("Failed to load terrain:", error as Error);
      throw error;
    }
  }

  /**
   * Generates a heightmap from the terrain configuration
   * @param config The terrain configuration
   */
  private async generateHeightmap(config: TerrainConfig): Promise<void> {
    // If a heightmap URL is provided, load it
    if (config.heightmapUrl) {
      await this.loadHeightmapFromUrl(config.heightmapUrl, config);
      return;
    }

    // Otherwise, generate a procedural heightmap
    this.heightmapData = this.generateProceduralHeightmap(config);

    // Set the heightmap in the collider
    this.terrainCollider.setHeightmapData(this.heightmapData);

    // Create the terrain mesh
    this.createTerrainMesh();
  }

  /**
   * Loads a heightmap from a URL
   * @param url The URL of the heightmap image
   * @param config The terrain configuration
   */
  private async loadHeightmapFromUrl(url: string, config: TerrainConfig): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        try {
          // Create a canvas to read the image data
          const canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext('2d');
          
          if (!context) {
            reject(new Error("Could not create canvas context"));
            return;
          }
          
          // Draw the image to the canvas
          context.drawImage(image, 0, 0);
          
          // Get the image data
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          
          // Convert the image data to a heightmap
          const heights = new Float32Array(imageData.width * imageData.height);
          let minHeight = Number.MAX_VALUE;
          let maxHeight = Number.MIN_VALUE;
          
          for (let i = 0; i < heights.length; i++) {
            // Use the red channel as the height value (0-255)
            heights[i] = imageData.data[i * 4] / 255.0;
            
            minHeight = Math.min(minHeight, heights[i]);
            maxHeight = Math.max(maxHeight, heights[i]);
          }
          
          // Create the heightmap data
          this.heightmapData = {
            width: imageData.width,
            height: imageData.height,
            heights,
            minHeight: config.minHeight,
            maxHeight: config.maxHeight,
            scale: config.scale,
            verticalScale: config.verticalScale
          };
          
          // Set the heightmap in the collider
          this.terrainCollider.setHeightmapData(this.heightmapData);
          
          // Create the terrain mesh
          this.createTerrainMesh();
          
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      
      image.onerror = () => {
        reject(new Error(`Failed to load heightmap from ${url}`));
      };
      
      // Start loading the image
      image.src = url;
    });
  }

  /**
   * Generates a procedural heightmap
   * @param config The terrain configuration
   * @returns The generated heightmap data
   */
  private generateProceduralHeightmap(config: TerrainConfig): HeightmapData {
    // Create a new heightmap with the specified dimensions
    const width = config.resolution;
    const height = config.resolution;
    const heights = new Float32Array(width * height);
    
    // Set the random seed if provided
    const seed = config.randomSeed || Math.random() * 10000;
    // Note: seedrandom would be an external library that we'd need to import
    // Using a simple approach instead
    const seededRandom = this.createSeededRandom(seed);
    
    // Generate the heightmap using simplex noise
    // For a real implementation, you would use a better noise function
    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        const nx = x / width - 0.5;
        const nz = z / height - 0.5;
        
        // Simple noise function (this would be more complex in a real implementation)
        const e = this.simplexNoise(nx * 3, nz * 3) * 0.5 + 0.5;
        
        heights[z * width + x] = e;
      }
    }
    
    // Normalize heights to the range [0, 1]
    let minHeight = Number.MAX_VALUE;
    let maxHeight = Number.MIN_VALUE;
    
    for (let i = 0; i < heights.length; i++) {
      minHeight = Math.min(minHeight, heights[i]);
      maxHeight = Math.max(maxHeight, heights[i]);
    }
    
    for (let i = 0; i < heights.length; i++) {
      heights[i] = (heights[i] - minHeight) / (maxHeight - minHeight);
    }
    
    return {
      width,
      height,
      heights,
      minHeight: config.minHeight,
      maxHeight: config.maxHeight,
      scale: config.scale,
      verticalScale: config.verticalScale
    };
  }
  
  /**
   * Creates a seeded random number generator
   * @param seed The seed for the random number generator
   * @returns A function that returns a random number between 0 and 1
   */
  private createSeededRandom(seed: number): () => number {
    // Simple LCG (Linear Congruential Generator) algorithm
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);
    let currentSeed = seed;
    
    return () => {
      currentSeed = (a * currentSeed + c) % m;
      return currentSeed / m;
    };
  }

  /**
   * Basic simplex noise implementation
   * Note: In a real implementation, you would use a proper noise library
   */
  private simplexNoise(x: number, y: number): number {
    // This is a very simplified version of simplex noise
    // In a real implementation, use a proper noise library
    return Math.sin(x * 10 + Math.cos(y * 8)) * 0.5
         + Math.cos(x * 8 - Math.sin(y * 12)) * 0.3
         + Math.sin(x * 3 + y * 4) * 0.2;
  }

  /**
   * Creates a terrain mesh from the heightmap data
   */
  private createTerrainMesh(): void {
    if (!this.heightmapData || !this.scene) return;
    
    // Clean up existing terrain mesh
    if (this.terrainMesh) {
      this.terrainMesh.dispose();
    }
    
    // Create a ground mesh from the heightmap data
    const { width, height, heights, scale, verticalScale, minHeight, maxHeight } = this.heightmapData;
    
    // Instead of using RawTexture directly, create a dynamic texture that we have more control over
    // This avoids issues with read-only properties like invertY
    const heightmapSize = width * height;
    
    // Use DynamicTexture with correct signature
    const heightTexture = new BABYLON.DynamicTexture(
      "heightmapTexture",
      { width, height },
      this.scene,
      false // generateMipMaps: false
    );
    
    // Get the context and update the content with height data
    const context = heightTexture.getContext();

    // Create image data properly with Uint8ClampedArray
    const imageDataArray = new Uint8ClampedArray(width * height * 4);

    // Fill the image data with height values (normalized to 0-255)
    for (let i = 0; i < heightmapSize; i++) {
      // Convert height value to 0-255 range for the red channel
      const normalizedHeight = Math.floor(((heights[i] - minHeight) / (maxHeight - minHeight)) * 255);
      const pixelIndex = i * 4;
      imageDataArray[pixelIndex] = normalizedHeight;     // R
      imageDataArray[pixelIndex + 1] = normalizedHeight; // G
      imageDataArray[pixelIndex + 2] = normalizedHeight; // B
      imageDataArray[pixelIndex + 3] = 255;              // A (fully opaque)
    }

    // Create image data from array and put it into context
    const imageData = new ImageData(imageDataArray, width, height);
    context.putImageData(imageData, 0, 0);
    heightTexture.update();
    
    // Create the ground mesh from our custom heightmap
    this.terrainMesh = BABYLON.MeshBuilder.CreateGroundFromHeightMap(
      "terrain",
      "heightmapTexture", // This connects to our dynamic texture
      {
        width: width * scale.x,
        height: height * scale.y,
        subdivisions: Math.min(width, height) / 4, // Reduce for better performance
        minHeight: minHeight * verticalScale,
        maxHeight: maxHeight * verticalScale,
        onReady: (mesh) => {
          // Set the terrain mesh in the collider
          this.terrainCollider.setTerrainMesh(mesh);
          
          // Apply default material
          this.applyTerrainMaterial();
          
          // Emit the terrain loaded event
          this.events.emit(TerrainEvents.TERRAIN_LOADED, mesh);
        }
      },
      this.scene
    );
  }

  /**
   * Sets up terrain materials based on configuration
   * @param materials The material configuration
   */
  private setupTerrainMaterials(materials: TerrainConfig['materials']): void {
    // Clear existing material registrations
    for (const id of this.materialCallbackIds.values()) {
      this.terrainCollider.unregisterTerrainHitCallback(id);
    }
    this.materialCallbackIds.clear();
    
    // Register the materials in the collider
    for (const [type, material] of Object.entries(materials)) {
      if (!material) continue;

      // Add the material to the collider
      if (material.regions) {
        for (const region of material.regions) {
          this.terrainCollider.addTerrainMaterial(type, material.friction, region);
        }
      } else {
        // Default material (whole terrain)
        this.terrainCollider.addTerrainMaterial(type, material.friction);
      }
      
      // Register collision callback for this material
      const id = this.terrainCollider.registerTerrainHitCallback((hit) => {
        if (hit.surfaceInfo.materialType === type) {
          this.events.emit(TerrainEvents.OBJECT_TERRAIN_COLLISION, {
            object: hit.object,
            position: hit.object.position,
            normal: hit.surfaceInfo.normal,
            surfaceInfo: hit.surfaceInfo
          });
        }
      });
      
      this.materialCallbackIds.set(type as TerrainMaterialType, id);
    }
  }

  /**
   * Applies materials to the terrain mesh
   */
  private applyTerrainMaterial(): void {
    if (!this.terrainMesh || !this.config) return;
    
    // Create a default material for the terrain
    const material = new BABYLON.StandardMaterial("terrainMaterial", this.scene);
    
    // Set basic material properties
    material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    
    // Apply the default texture if available
    const defaultMaterial = this.config.materials[TerrainMaterialType.DEFAULT];
    if (defaultMaterial && defaultMaterial.texture) {
      // Create the texture using standard constructor
      const diffuseTexture = new BABYLON.Texture(defaultMaterial.texture, this.scene);
      
      // Apply the texture to the material
      material.diffuseTexture = diffuseTexture;
      
      // Set texture scaling directly on the created texture instance
      diffuseTexture.uScale = 20;
      diffuseTexture.vScale = 20;
    } else {
      // Default color if no texture
      material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    }
    
    // Apply the material to the terrain
    this.terrainMesh.material = material;
  }

  /**
   * Gets the height of the terrain at the given position
   * @param position The position to check
   * @returns The height at the given position, or null if outside terrain bounds
   */
  public getHeightAt(position: BABYLON.Vector2 | BABYLON.Vector3): number | null {
    return this.terrainCollider.getHeightAt(position);
  }

  /**
   * Gets terrain surface information at the given position
   * @param position The position to check
   * @returns Surface information at the given position
   */
  public getSurfaceInfoAt(position: BABYLON.Vector2 | BABYLON.Vector3): TerrainSurfaceInfo {
    return this.terrainCollider.getSurfaceInfoAt(position);
  }

  /**
   * Checks if an object is on the ground
   * @param position The position to check
   * @param radius The radius of the object
   * @param height The height of the object
   * @returns Ground information if the object is on the ground, null otherwise
   */
  public checkGrounded(
    position: BABYLON.Vector3,
    radius: number,
    height: number
  ): { position: BABYLON.Vector3; normal: BABYLON.Vector3; surfaceInfo: TerrainSurfaceInfo } | null {
    return this.terrainCollider.checkGrounded(position, radius, height);
  }

  /**
   * Performs a raycast against the terrain
   * @param from The starting position of the ray
   * @param direction The direction of the ray
   * @param maxDistance The maximum distance of the ray
   * @returns Information about the hit, or null if no hit occurred
   */
  public raycast(from: BABYLON.Vector3, direction: BABYLON.Vector3, maxDistance?: number) {
    return this.terrainCollider.raycast(from, direction, maxDistance);
  }

  /**
   * Registers a listener for terrain events
   * @param event The event to listen for
   * @param callback The callback to invoke
   * @returns A function to unregister the listener
   */
  public on(event: TerrainEvents, callback: (...args: any[]) => void): () => void {
    return this.events.on(event, callback);
  }

  /**
   * Cleans up resources used by the terrain manager
   */
  public dispose(): void {
    if (this.terrainMesh) {
      this.terrainMesh.dispose();
      this.terrainMesh = null;
    }
    
    this.terrainCollider.dispose();
    this.events.clear();
    this.initialized = false;
    
    this.logger.info("TerrainManager disposed");
  }
}
