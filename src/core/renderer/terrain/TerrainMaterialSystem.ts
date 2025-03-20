/**
 * @file src/core/renderer/terrain/TerrainMaterialSystem.ts
 * @description Optimized terrain material system with texture management
 * 
 * @dependencies babylonjs
 * @relatedFiles TerrainRenderer.ts, ITerrainRenderer.ts, LODTerrainSystem.ts
 */
import * as BABYLON from 'babylonjs';
import { Logger } from '../../utils/Logger';
import { ServiceLocator } from '../../base/ServiceLocator';
import { ResourceTracker } from '../../utils/ResourceTracker';
import { ResourceType } from '../../utils/ResourceTracker';

/**
 * Material configuration for a terrain texture layer
 */
export interface TerrainMaterialLayer {
  /** Texture file path */
  texture: string;
  /** Normal map file path (optional) */
  normalMap?: string;
  /** Minimum slope angle in degrees (0 = flat) */
  minSlope: number;
  /** Maximum slope angle in degrees (90 = vertical) */
  maxSlope: number;
  /** Minimum height (0-1 normalized) */
  minHeight: number;
  /** Maximum height (0-1 normalized) */
  maxHeight: number;
  /** Texture tiling factor */
  tiling: number;
  /** Smoothness value (0-1) */
  smoothness?: number;
  /** Metallic value (0-1) */
  metallic?: number;
}

/**
 * Configuration for terrain material system
 */
export interface TerrainMaterialConfig {
  /** Base color for areas with no texture */
  baseColor: BABYLON.Color3;
  /** Enable normal mapping */
  enableNormalMap: boolean;
  /** Enable parallax mapping */
  enableParallax: boolean;
  /** Enable tessellation for close-up detail */
  enableTessellation: boolean;
  /** Global texture tiling factor multiplier */
  globalTiling: number;
  /** Transition sharpness between layers (higher = sharper) */
  blendSharpness: number;
  /** Enable triplanar mapping for steep slopes */
  triplanarMapping: boolean;
  /** Distance at which to fade out high-detail features */
  detailFadeDistance: number;
  /** Array of texture layers */
  layers: TerrainMaterialLayer[];
}

/**
 * Default terrain material configuration
 */
export const DEFAULT_TERRAIN_MATERIAL_CONFIG: TerrainMaterialConfig = {
  baseColor: new BABYLON.Color3(0.5, 0.5, 0.5),
  enableNormalMap: true,
  enableParallax: false,
  enableTessellation: false,
  globalTiling: 1.0,
  blendSharpness: 8.0,
  triplanarMapping: true,
  detailFadeDistance: 500,
  layers: []
};

/**
 * Configuration options for the terrain material system
 */
export interface TerrainMaterialSystemOptions {
  /** Base resolution for terrain textures */
  baseTextureResolution: number;
  /** Maximum number of cached textures */
  maxCachedTextures: number;
  /** Maximum texture size */
  maxTextureSize: number;
  /** Whether to use mipmap textures */
  useMipmaps: boolean;
  /** Whether to use anisotropic filtering */
  useAnisotropicFiltering: number;
  /** Whether to use compressed textures when available */
  useCompressedTextures: boolean;
  /** Minimum time (ms) to keep unused textures in memory */
  textureRetentionTime: number;
  /** Quality level for texture sampling and filtering */
  samplingQuality: number;
  /** Whether to use dynamic texture loading/unloading */
  useDynamicTextureManagement: boolean;
}

/**
 * Default options for the terrain material system
 */
export const DEFAULT_TERRAIN_MATERIAL_OPTIONS: TerrainMaterialSystemOptions = {
  baseTextureResolution: 1024,
  maxCachedTextures: 50,
  maxTextureSize: 4096,
  useMipmaps: true,
  useAnisotropicFiltering: 4,
  useCompressedTextures: true,
  textureRetentionTime: 30000, // 30 seconds
  samplingQuality: 1.0,
  useDynamicTextureManagement: true
};

/**
 * Quality level for terrain materials and textures
 */
export enum TerrainMaterialQualityLevel {
  ULTRA = 0,
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
  VERY_LOW = 4
}

/**
 * Cached texture information
 */
interface CachedTexture {
  texture: BABYLON.Texture;
  lastUsed: number;
  references: number;
  size: number;
}

/**
 * System for managing terrain materials and textures with optimized memory usage
 */
export class TerrainMaterialSystem {
  private scene: BABYLON.Scene;
  private layers: TerrainMaterialLayer[] = [];
  private config: TerrainMaterialConfig;
  private terrainMaterial: BABYLON.Material | null = null;
  private textureCache: Map<string, CachedTexture> = new Map();
  private terrainSize: BABYLON.Vector3 = new BABYLON.Vector3(1000, 100, 1000);
  private customShader: boolean = false;
  private options: TerrainMaterialSystemOptions;
  private logger: Logger;
  private currentQualityLevel: TerrainMaterialQualityLevel = TerrainMaterialQualityLevel.HIGH;
  private totalTextureMemory: number = 0;
  private resourceTracker: ResourceTracker;
  private adaptiveQuality: boolean = false;
  private lastMemoryCheck: number = 0;
  private memoryCheckInterval: number = 5000; // 5 seconds
  private textureLoadQueue: Array<{ url: string, callback: (texture: BABYLON.Texture) => void }> = [];
  private isLoadingTexture: boolean = false;
  private maxConcurrentTextureLoads: number = 2;
  private activeTextureLoads: number = 0;
  
  /**
   * Create a new terrain material system
   * @param scene The scene to create materials in
   * @param config Material configuration
   * @param options Configuration options
   */
  constructor(
    scene: BABYLON.Scene,
    config: Partial<TerrainMaterialConfig> = {},
    options: Partial<TerrainMaterialSystemOptions> = {}
  ) {
    this.scene = scene;
    this.config = { ...DEFAULT_TERRAIN_MATERIAL_CONFIG, ...config };
    this.options = { ...DEFAULT_TERRAIN_MATERIAL_OPTIONS, ...options };
    
    // Initialize logger
    this.logger = new Logger('TerrainMaterialSystem');
    
    // Try to get logger from ServiceLocator
    try {
      const serviceLocator = ServiceLocator.getInstance();
      if (serviceLocator.has('logger')) {
        this.logger = serviceLocator.get<Logger>('logger');
        this.logger.addTag('TerrainMaterialSystem');
      }
    } catch (e) {
      // Use default logger
    }
    
    // Get resource tracker from ServiceLocator or create a new one
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
    
    // Set up texture memory management
    if (this.options.useDynamicTextureManagement) {
      this.setupTextureMemoryManagement();
    }
    
    this.logger.debug('TerrainMaterialSystem initialized');
  }
  
  /**
   * Set terrain size (used for texture scaling)
   * @param size Terrain size vector
   */
  public setTerrainSize(size: BABYLON.Vector3): void {
    this.terrainSize = size.clone();
    
    // Update material if it exists
    if (this.terrainMaterial) {
      this.updateMaterialParameters();
    }
  }
  
  /**
   * Update the material configuration
   * @param config New partial configuration
   */
  public updateConfig(config: Partial<TerrainMaterialConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update material if it exists
    if (this.terrainMaterial) {
      this.updateMaterialParameters();
    }
  }
  
  /**
   * Add a texture layer to the terrain
   * @param layer Material layer configuration
   * @returns Index of the added layer
   */
  public addLayer(layer: TerrainMaterialLayer): number {
    this.layers.push({ ...layer });
    
    // Sort layers by slope (low to high)
    this.layers.sort((a, b) => a.minSlope - b.minSlope);
    
    // Update material if it exists
    if (this.terrainMaterial) {
      this.rebuildMaterial();
    }
    
    return this.layers.length - 1;
  }
  
  /**
   * Remove a texture layer
   * @param index Index of layer to remove
   * @returns True if layer was removed
   */
  public removeLayer(index: number): boolean {
    if (index < 0 || index >= this.layers.length) {
      return false;
    }
    
    this.layers.splice(index, 1);
    
    // Update material if it exists
    if (this.terrainMaterial) {
      this.rebuildMaterial();
    }
    
    return true;
  }
  
  /**
   * Update a texture layer
   * @param index Index of layer to update
   * @param layer New layer properties (partial)
   * @returns True if layer was updated
   */
  public updateLayer(index: number, layer: Partial<TerrainMaterialLayer>): boolean {
    if (index < 0 || index >= this.layers.length) {
      return false;
    }
    
    this.layers[index] = { ...this.layers[index], ...layer };
    
    // Sort layers by slope (low to high)
    this.layers.sort((a, b) => a.minSlope - b.minSlope);
    
    // Update material if it exists
    if (this.terrainMaterial) {
      this.rebuildMaterial();
    }
    
    return true;
  }
  
  /**
   * Get all texture layers
   * @returns Copy of layers array
   */
  public getLayers(): TerrainMaterialLayer[] {
    return [...this.layers];
  }
  
  /**
   * Create and return a terrain material with all configured layers
   * @returns Terrain material
   */
  public createMaterial(): BABYLON.Material {
    // If using custom shaders, create custom material
    if (this.customShader && this.layers.length > 0) {
      return this.createCustomShaderMaterial();
    }
    
    // Otherwise, create a standard PBR material with limited capabilities
    return this.createPBRMaterial();
  }
  
  /**
   * Create a standard PBR material for terrain
   * @returns PBR material
   */
  private createPBRMaterial(): BABYLON.Material {
    // Dispose existing material if it exists
    if (this.terrainMaterial) {
      this.terrainMaterial.dispose();
    }
    
    // Create new material
    const pbr = new BABYLON.PBRMaterial("terrainMaterial", this.scene);
    pbr.metallic = 0.0;
    pbr.roughness = 0.9;
    pbr.albedoColor = this.config.baseColor;
    
    // If we have a single layer, apply it directly
    if (this.layers.length === 1) {
      const layer = this.layers[0];
      const texture = this.loadTexture(layer.texture, {
        noMipmap: !this.shouldUseMipmaps(),
        samplingMode: this.getTextureSamplingMode()
      });
      
      const scalingFactor = layer.tiling * this.config.globalTiling;
      texture.updateSamplingMode(BABYLON.Texture.BILINEAR_SAMPLINGMODE);
      (texture as BABYLON.Texture).uScale = scalingFactor;
      (texture as BABYLON.Texture).vScale = scalingFactor;
      
      pbr.albedoTexture = texture;
      
      // Apply normal map if enabled
      if (this.config.enableNormalMap && layer.normalMap) {
        const normalMap = this.loadTexture(layer.normalMap, {
          noMipmap: !this.shouldUseMipmaps(),
          samplingMode: this.getTextureSamplingMode()
        });
        (normalMap as BABYLON.Texture).uScale = scalingFactor;
        (normalMap as BABYLON.Texture).vScale = scalingFactor;
        pbr.bumpTexture = normalMap;
      }
    } 
    // If we have multiple layers, we can't properly blend with standard PBR
    // Just use the first layer or consider creating a composite texture offline
    else if (this.layers.length > 1) {
      // Use first layer as base
      const layer = this.layers[0];
      const texture = this.loadTexture(layer.texture, {
        noMipmap: !this.shouldUseMipmaps(),
        samplingMode: this.getTextureSamplingMode()
      });
      
      const scalingFactor = layer.tiling * this.config.globalTiling;
      texture.updateSamplingMode(BABYLON.Texture.BILINEAR_SAMPLINGMODE);
      (texture as BABYLON.Texture).uScale = scalingFactor;
      (texture as BABYLON.Texture).vScale = scalingFactor;
      
      pbr.albedoTexture = texture;
      
      // Apply normal map if enabled
      if (this.config.enableNormalMap && layer.normalMap) {
        const normalMap = this.loadTexture(layer.normalMap, {
          noMipmap: !this.shouldUseMipmaps(),
          samplingMode: this.getTextureSamplingMode()
        });
        (normalMap as BABYLON.Texture).uScale = scalingFactor;
        (normalMap as BABYLON.Texture).vScale = scalingFactor;
        pbr.bumpTexture = normalMap;
      }
      
      console.warn("Multiple terrain layers require custom shaders for proper blending");
    }
    
    // Store as current material
    this.terrainMaterial = pbr;
    return pbr;
  }
  
  /**
   * Create a custom shader material for advanced terrain rendering
   * @returns Custom shader material
   */
  private createCustomShaderMaterial(): BABYLON.Material {
    // Dispose existing material if it exists
    if (this.terrainMaterial) {
      this.terrainMaterial.dispose();
    }
    
    // Create material for custom shader
    const material = new BABYLON.ShaderMaterial(
      "terrainMaterial",
      this.scene,
      {
        vertex: "terrainVertex",
        fragment: "terrainFragment"
      },
      {
        attributes: ["position", "normal", "uv", "tangent"],
        uniforms: [
          "world", "worldView", "worldViewProjection", 
          "view", "projection", "cameraPosition"
        ],
        needAlphaBlending: false,
        needAlphaTesting: false
      }
    );
    
    // Load textures for each layer
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      
      // Load diffuse texture
      const texture = this.loadTexture(layer.texture, {
        samplingMode: this.getTextureSamplingMode(),
        noMipmap: !this.shouldUseMipmaps()
      });
      texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
      texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
      material.setTexture(`albedoTexture${i}`, texture);
      
      // Load normal map if enabled
      if (this.config.enableNormalMap && layer.normalMap) {
        const normalMap = this.loadTexture(layer.normalMap, {
          samplingMode: this.getTextureSamplingMode(),
          noMipmap: !this.shouldUseMipmaps()
        });
        normalMap.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
        normalMap.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
        material.setTexture(`normalTexture${i}`, normalMap);
      }
      
      // Set layer parameters
      material.setFloat(`minSlope${i}`, Math.cos((90 - layer.minSlope) * Math.PI / 180));
      material.setFloat(`maxSlope${i}`, Math.cos((90 - layer.maxSlope) * Math.PI / 180));
      material.setFloat(`minHeight${i}`, layer.minHeight * this.terrainSize.y);
      material.setFloat(`maxHeight${i}`, layer.maxHeight * this.terrainSize.y);
      material.setFloat(`tiling${i}`, layer.tiling * this.config.globalTiling);
    }
    
    // Set global parameters
    material.setFloat("blendSharpness", this.config.blendSharpness);
    material.setFloat("terrainHeight", this.terrainSize.y);
    material.setInt("layerCount", this.layers.length);
    material.setVector3("terrainSize", this.terrainSize);
    material.setColor3("baseColor", this.config.baseColor);
    material.setFloat("detailFadeDistance", this.config.detailFadeDistance);
    material.setInt("enableTriplanar", this.config.triplanarMapping ? 1 : 0);
    
    // Store as current material
    this.terrainMaterial = material;
    return material;
  }
  
  /**
   * Update material parameters without rebuilding
   */
  private updateMaterialParameters(): void {
    if (!this.terrainMaterial) {
      return;
    }
    
    // Handle PBR material
    if (this.terrainMaterial instanceof BABYLON.PBRMaterial) {
      this.terrainMaterial.albedoColor = this.config.baseColor;
      
      // Update texture tiling
      if (this.terrainMaterial.albedoTexture && this.layers.length > 0) {
        const layer = this.layers[0];
        const scalingFactor = layer.tiling * this.config.globalTiling;
        
        if (this.terrainMaterial.albedoTexture) {
          (this.terrainMaterial.albedoTexture as BABYLON.Texture).uScale = scalingFactor;
          (this.terrainMaterial.albedoTexture as BABYLON.Texture).vScale = scalingFactor;
        }
        
        // Update normal map tiling
        if (this.terrainMaterial.bumpTexture) {
          (this.terrainMaterial.bumpTexture as BABYLON.Texture).uScale = scalingFactor;
          (this.terrainMaterial.bumpTexture as BABYLON.Texture).vScale = scalingFactor;
        }
      }
    }
    // Handle shader material
    else if (this.terrainMaterial instanceof BABYLON.ShaderMaterial) {
      // Update global parameters
      this.terrainMaterial.setFloat("blendSharpness", this.config.blendSharpness);
      this.terrainMaterial.setFloat("terrainHeight", this.terrainSize.y);
      this.terrainMaterial.setVector3("terrainSize", this.terrainSize);
      this.terrainMaterial.setColor3("baseColor", this.config.baseColor);
      this.terrainMaterial.setFloat("detailFadeDistance", this.config.detailFadeDistance);
      this.terrainMaterial.setInt("enableTriplanar", this.config.triplanarMapping ? 1 : 0);
      
      // Update layer parameters
      for (let i = 0; i < this.layers.length; i++) {
        const layer = this.layers[i];
        this.terrainMaterial.setFloat(`minSlope${i}`, Math.cos((90 - layer.minSlope) * Math.PI / 180));
        this.terrainMaterial.setFloat(`maxSlope${i}`, Math.cos((90 - layer.maxSlope) * Math.PI / 180));
        this.terrainMaterial.setFloat(`minHeight${i}`, layer.minHeight * this.terrainSize.y);
        this.terrainMaterial.setFloat(`maxHeight${i}`, layer.maxHeight * this.terrainSize.y);
        this.terrainMaterial.setFloat(`tiling${i}`, layer.tiling * this.config.globalTiling);
      }
    }
  }
  
  /**
   * Rebuild the terrain material from scratch
   */
  private rebuildMaterial(): void {
    const newMaterial = this.createMaterial();
    
    // Store and return
    this.terrainMaterial = newMaterial;
  }
  
  /**
   * Get the current terrain material
   * @returns Current terrain material or null if not created
   */
  public getMaterial(): BABYLON.Material | null {
    return this.terrainMaterial;
  }
  
  /**
   * Set up texture memory management
   */
  private setupTextureMemoryManagement(): void {
    // Set up interval for checking texture memory
    this.scene.onBeforeRenderObservable.add(() => {
      const currentTime = performance.now();
      
      // Check if it's time to manage memory
      if (currentTime - this.lastMemoryCheck > this.memoryCheckInterval) {
        this.manageTextureMemory();
        this.lastMemoryCheck = currentTime;
        
        // Check if there are textures in the load queue
        this.processTextureQueue();
      }
      
      // Adaptive quality check
      if (this.adaptiveQuality) {
        this.adaptQualityBasedOnPerformance();
      }
    });
  }
  
  /**
   * Load a texture with memory management
   * @param url Texture URL
   * @param options Texture options
   * @returns Loaded texture
   */
  public loadTexture(url: string, options: {
    noMipmap?: boolean,
    samplingMode?: number,
    invertY?: boolean
  } = {}): BABYLON.Texture {
    // Use cached texture if available
    if (this.textureCache.has(url)) {
      const cached = this.textureCache.get(url)!;
      cached.lastUsed = Date.now();
      cached.references++;
      
      this.logger.debug(`Using cached texture: ${url}`);
      
      return cached.texture;
    }
    
    // Create texture options
    const textureOptions = {
      noMipmap: options.noMipmap ?? !this.shouldUseMipmaps(),
      samplingMode: options.samplingMode ?? this.getTextureSamplingMode(),
      invertY: options.invertY ?? false
    };
    
    this.logger.debug(`Loading texture: ${url}`);
    
    // Create the texture with all options set during creation
    const texture = new BABYLON.Texture(
      url, 
      this.scene, 
      textureOptions.noMipmap, 
      textureOptions.invertY, // Set invertY during creation
      textureOptions.samplingMode
    );
    
    // Set additional options that can be modified after creation
    texture.anisotropicFilteringLevel = this.getAnisotropicFilteringLevel();
    
    // Estimate memory used by this texture (width * height * 4 bytes per pixel)
    // This will be updated when the texture loads
    let estimatedSize = 1024 * 1024 * 4; // Default estimate: 1024x1024 RGBA
    
    // Add to texture cache
    this.textureCache.set(url, {
      texture,
      lastUsed: Date.now(),
      references: 1,
      size: estimatedSize
    });
    
    // Update memory tracking when the texture loads
    texture.onLoadObservable.add(() => {
      if (this.textureCache.has(url)) {
        const cached = this.textureCache.get(url)!;
        const actualSize = texture.getSize().width * texture.getSize().height * 4;
        cached.size = actualSize;
        this.totalTextureMemory += actualSize - estimatedSize;
        estimatedSize = actualSize;
      }
    });
    
    // Track with resource tracker
    this.resourceTracker.trackTexture(texture, {
      id: `terrain_texture_${url}`,
      group: 'terrainMaterial'
    });
    
    // Update total memory usage
    this.totalTextureMemory += estimatedSize;
    
    return texture;
  }
  
  /**
   * Load a texture asynchronously with memory management
   * @param url Texture URL
   * @param options Texture options
   * @returns Promise resolving to the loaded texture
   */
  public async loadTextureAsync(url: string, options: {
    noMipmap?: boolean,
    samplingMode?: number,
    invertY?: boolean
  } = {}): Promise<BABYLON.Texture> {
    // Use cached texture if available
    if (this.textureCache.has(url)) {
      const cached = this.textureCache.get(url)!;
      cached.lastUsed = Date.now();
      cached.references++;
      
      this.logger.debug(`Using cached texture (async): ${url}`);
      
      return cached.texture;
    }
    
    // Check if we should queue this texture load
    if (this.activeTextureLoads >= this.maxConcurrentTextureLoads) {
      this.logger.debug(`Queueing texture load: ${url}`);
      
      return new Promise<BABYLON.Texture>((resolve) => {
        this.textureLoadQueue.push({
          url,
          callback: (texture) => resolve(texture)
        });
      });
    }
    
    // Create texture options
    const textureOptions = {
      noMipmap: options.noMipmap ?? !this.shouldUseMipmaps(),
      samplingMode: options.samplingMode ?? this.getTextureSamplingMode(),
      invertY: options.invertY ?? false
    };
    
    this.activeTextureLoads++;
    this.logger.debug(`Loading texture async: ${url}`);
    
    try {
      // Create a promise to load the texture
      const texture = await new Promise<BABYLON.Texture>((resolve, reject) => {
        // Define the texture variable with proper type before using it
        let newTexture: BABYLON.Texture;
        
        newTexture = new BABYLON.Texture(
          url,
          this.scene,
          textureOptions.noMipmap,
          textureOptions.invertY, // Set invertY during creation
          textureOptions.samplingMode,
          () => resolve(newTexture),
          (message, exception) => reject(exception || new Error(message))
        );
        
        // Set additional options that can be modified after creation
        newTexture.anisotropicFilteringLevel = this.getAnisotropicFilteringLevel();
      });
      
      // Estimate memory used by this texture (width * height * 4 bytes per pixel)
      // This will be updated when the texture loads
      let estimatedSize = 1024 * 1024 * 4; // Default estimate: 1024x1024 RGBA
      
      // Add to texture cache
      this.textureCache.set(url, {
        texture,
        lastUsed: Date.now(),
        references: 1,
        size: estimatedSize
      });
      
      // Update memory tracking when the texture is loaded
      const actualSize = texture.getSize().width * texture.getSize().height * 4;
      if (this.textureCache.has(url)) {
        const cached = this.textureCache.get(url)!;
        cached.size = actualSize;
        this.totalTextureMemory += actualSize - estimatedSize;
      }
      
      // Track with resource tracker
      this.resourceTracker.trackTexture(texture, {
        id: `terrain_texture_${url}`,
        group: 'terrainMaterial'
      });
      
      // Update total memory usage
      this.totalTextureMemory += actualSize;
      
      return texture;
    } catch (error) {
      this.logger.error(`Failed to load texture: ${url} - ${error}`);
      
      // Create and return a default texture on error
      const defaultTexture = this.createDefaultTexture();
      
      // Add to texture cache to prevent repeated failures
      this.textureCache.set(url, {
        texture: defaultTexture,
        lastUsed: Date.now(),
        references: 1,
        size: 1024 * 1024 * 4 // Default texture size
      });
      
      // Track with resource tracker
      this.resourceTracker.trackTexture(defaultTexture, {
        id: `terrain_texture_error_${url}`,
        group: 'terrainMaterial'
      });
      
      return defaultTexture;
    } finally {
      this.activeTextureLoads--;
      
      // Process the queue if there are pending texture loads
      if (this.textureLoadQueue.length > 0) {
        this.processTextureQueue();
      }
    }
  }
  
  /**
   * Process the texture load queue
   */
  private processTextureQueue(): void {
    // If queue is empty or we're already at max loads, exit
    if (this.textureLoadQueue.length === 0 || this.activeTextureLoads >= this.maxConcurrentTextureLoads) {
      return;
    }
    
    // Get the next texture from the queue
    const nextTexture = this.textureLoadQueue.shift();
    if (!nextTexture) return;
    
    // Load the texture
    this.loadTextureAsync(nextTexture.url)
      .then(texture => {
        nextTexture.callback(texture);
      })
      .catch(error => {
        this.logger.warn(`Error loading queued texture: ${error}`);
        // Call callback with a default texture
        const defaultTexture = this.createDefaultTexture();
        nextTexture.callback(defaultTexture);
      });
  }
  
  /**
   * Create a simple default texture for error cases
   */
  private createDefaultTexture(): BABYLON.Texture {
    const texture = BABYLON.Texture.CreateFromBase64String(
      // 1x1 pixel white texture
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
      'default',
      this.scene
    );
    
    // Track the texture
    this.resourceTracker.trackTexture(texture, {
      id: `terrain_texture_error_${texture.name}`,
      group: 'terrainMaterial'
    });
    
    return texture;
  }
  
  /**
   * Release a texture when it's no longer needed
   * @param url The URL of the texture to release
   */
  public releaseTexture(url: string): void {
    const cachedTexture = this.textureCache.get(url);
    if (!cachedTexture) return;
    
    // Decrease reference count
    cachedTexture.references--;
    
    // If no more references, mark for potential cleanup
    if (cachedTexture.references <= 0) {
      cachedTexture.lastUsed = performance.now();
    }
  }
  
  /**
   * Untrack a texture from the resource tracker
   * @param texture The texture to untrack
   */
  private untrackTexture(texture: BABYLON.Texture): void {
    // Find the resource ID for this texture
    const id = `terrain_texture_${texture.name}`;
    
    // Try to find the resource with this ID or pattern
    const resources = this.resourceTracker.findResourcesByFilter({
      type: ResourceType.TEXTURE,
      predicate: (resource) => {
        const resourceId = resource.id || '';
        return resourceId === id || 
               (resourceId.startsWith(`terrain_texture_`) && resource.resource === texture);
      }
    });
    
    // Dispose each matching resource
    for (const resourceId of resources) {
      this.resourceTracker.disposeResource(resourceId);
    }
  }
  
  /**
   * Manage texture memory by cleaning up unused textures
   */
  private manageTextureMemory(): void {
    const currentTime = performance.now();
    const texturesToRemove: string[] = [];
    
    // Check each cached texture
    this.textureCache.forEach((cachedTexture, url) => {
      // If the texture is not referenced and has been unused for longer than the retention time
      if (cachedTexture.references <= 0 && 
          currentTime - cachedTexture.lastUsed > this.options.textureRetentionTime) {
        // Mark for removal
        texturesToRemove.push(url);
      }
    });
    
    // Remove marked textures
    for (const url of texturesToRemove) {
      const cachedTexture = this.textureCache.get(url);
      if (!cachedTexture) continue;
      
      // Release the texture resources
      this.untrackTexture(cachedTexture.texture);
      cachedTexture.texture.dispose();
      
      // Update memory tracking
      this.totalTextureMemory -= cachedTexture.size;
      
      // Remove from cache
      this.textureCache.delete(url);
      
      this.logger.debug(`Released unused terrain texture ${url}, freed ${Math.round(cachedTexture.size / 1024)}KB`);
    }
    
    // If we've released textures but still have too many, release the oldest ones
    if (this.textureCache.size > this.options.maxCachedTextures) {
      const textureEntries = Array.from(this.textureCache.entries())
        .filter(([_, cache]) => cache.references <= 0)
        .sort((a, b) => a[1].lastUsed - b[1].lastUsed);
      
      // Determine how many to remove
      const removeCount = this.textureCache.size - this.options.maxCachedTextures;
      
      // Remove oldest textures
      for (let i = 0; i < removeCount && i < textureEntries.length; i++) {
        const [url, cachedTexture] = textureEntries[i];
        
        // Release the texture resources
        this.untrackTexture(cachedTexture.texture);
        cachedTexture.texture.dispose();
        
        // Update memory tracking
        this.totalTextureMemory -= cachedTexture.size;
        
        // Remove from cache
        this.textureCache.delete(url);
        
        this.logger.debug(`Released old terrain texture ${url}, freed ${Math.round(cachedTexture.size / 1024)}KB`);
      }
    }
    
    // Log current memory usage
    this.logger.debug(`Terrain texture memory: ${Math.round(this.totalTextureMemory / (1024 * 1024))}MB, ${this.textureCache.size} textures`);
  }
  
  /**
   * Set the quality level for terrain materials and textures
   * @param level The quality level to set
   */
  public setQualityLevel(level: TerrainMaterialQualityLevel): void {
    if (this.currentQualityLevel !== level) {
      this.currentQualityLevel = level;
      
      // Log the quality change
      this.logger.debug(`Terrain material quality set to: ${TerrainMaterialQualityLevel[level]}`);
      
      // Clear texture cache on significant quality changes
      if (Math.abs(this.currentQualityLevel - level) > 1) {
        this.clearTextureCache();
      }
    }
  }
  
  /**
   * Clear the texture cache
   */
  private clearTextureCache(): void {
    // Dispose all cached textures
    this.textureCache.forEach(cachedTexture => {
      this.untrackTexture(cachedTexture.texture);
      cachedTexture.texture.dispose();
    });
    
    // Clear the cache
    this.textureCache.clear();
    
    // Reset memory tracking
    this.totalTextureMemory = 0;
    
    this.logger.debug('Terrain texture cache cleared');
  }
  
  /**
   * Get appropriate texture resolution based on quality level
   */
  private getTextureResolutionForQualityLevel(): number {
    const baseResolution = this.options.baseTextureResolution;
    
    switch (this.currentQualityLevel) {
      case TerrainMaterialQualityLevel.ULTRA:
        return Math.min(baseResolution * 2, this.options.maxTextureSize);
      case TerrainMaterialQualityLevel.HIGH:
        return Math.min(baseResolution, this.options.maxTextureSize);
      case TerrainMaterialQualityLevel.MEDIUM:
        return Math.min(baseResolution / 2, this.options.maxTextureSize);
      case TerrainMaterialQualityLevel.LOW:
        return Math.min(baseResolution / 4, this.options.maxTextureSize);
      case TerrainMaterialQualityLevel.VERY_LOW:
        return Math.min(baseResolution / 8, this.options.maxTextureSize);
      default:
        return Math.min(baseResolution, this.options.maxTextureSize);
    }
  }
  
  /**
   * Determine if mipmaps should be used based on quality level
   */
  private shouldUseMipmaps(): boolean {
    if (!this.options.useMipmaps) return false;
    
    // Only disable mipmaps at the lowest quality level
    return this.currentQualityLevel < TerrainMaterialQualityLevel.VERY_LOW;
  }
  
  /**
   * Get texture sampling mode based on quality level
   */
  private getTextureSamplingMode(): number {
    switch (this.currentQualityLevel) {
      case TerrainMaterialQualityLevel.ULTRA:
      case TerrainMaterialQualityLevel.HIGH:
        return BABYLON.Texture.TRILINEAR_SAMPLINGMODE;
      case TerrainMaterialQualityLevel.MEDIUM:
        return BABYLON.Texture.BILINEAR_SAMPLINGMODE;
      case TerrainMaterialQualityLevel.LOW:
      case TerrainMaterialQualityLevel.VERY_LOW:
        return BABYLON.Texture.NEAREST_SAMPLINGMODE;
      default:
        return BABYLON.Texture.BILINEAR_SAMPLINGMODE;
    }
  }
  
  /**
   * Get anisotropic filtering level based on quality level
   */
  private getAnisotropicFilteringLevel(): number {
    if (this.options.useAnisotropicFiltering <= 0) return 1;
    
    const maxAnisotropy = Math.min(
      this.scene.getEngine().getCaps().maxAnisotropy,
      this.options.useAnisotropicFiltering
    );
    
    switch (this.currentQualityLevel) {
      case TerrainMaterialQualityLevel.ULTRA:
        return maxAnisotropy;
      case TerrainMaterialQualityLevel.HIGH:
        return Math.max(1, Math.floor(maxAnisotropy * 0.75));
      case TerrainMaterialQualityLevel.MEDIUM:
        return Math.max(1, Math.floor(maxAnisotropy * 0.5));
      case TerrainMaterialQualityLevel.LOW:
      case TerrainMaterialQualityLevel.VERY_LOW:
        return 1;
      default:
        return Math.max(1, Math.floor(maxAnisotropy * 0.5));
    }
  }
  
  /**
   * Set whether to use adaptive quality based on performance
   * @param useAdaptiveQuality Whether to adjust quality based on performance
   */
  public setAdaptiveQuality(useAdaptiveQuality: boolean): void {
    this.adaptiveQuality = useAdaptiveQuality;
    this.logger.debug(`Adaptive quality ${useAdaptiveQuality ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Adapt quality settings based on current performance
   */
  private adaptQualityBasedOnPerformance(): void {
    // Get current FPS
    const fps = this.scene.getEngine().getFps();
    
    // Get current VRAM usage if available
    let memoryPressure = 0;
    
    // Try to estimate VRAM pressure by total texture memory
    if (this.totalTextureMemory > 0) {
      // Normalize memory pressure on a scale of 0-1
      // Assuming 512MB as a high threshold for terrain textures
      memoryPressure = Math.min(1, this.totalTextureMemory / (512 * 1024 * 1024));
    }
    
    // Determine new quality level based on both FPS and memory
    let newLevel = this.currentQualityLevel;
    
    // Prioritize memory pressure first
    if (memoryPressure > 0.9) {
      // Severe memory pressure, reduce quality substantially
      newLevel = Math.min(TerrainMaterialQualityLevel.VERY_LOW, this.currentQualityLevel + 2);
    } else if (memoryPressure > 0.7) {
      // High memory pressure, reduce quality
      newLevel = Math.min(TerrainMaterialQualityLevel.LOW, this.currentQualityLevel + 1);
    } else {
      // Now consider FPS
      if (fps < 25) {
        newLevel = Math.min(TerrainMaterialQualityLevel.VERY_LOW, this.currentQualityLevel + 1);
      } else if (fps < 40) {
        newLevel = Math.min(TerrainMaterialQualityLevel.LOW, this.currentQualityLevel + 1);
      } else if (fps > 90 && memoryPressure < 0.5) {
        newLevel = Math.max(TerrainMaterialQualityLevel.ULTRA, this.currentQualityLevel - 1);
      } else if (fps > 70 && memoryPressure < 0.6) {
        newLevel = Math.max(TerrainMaterialQualityLevel.HIGH, this.currentQualityLevel - 1);
      }
    }
    
    // Apply if changed
    if (newLevel !== this.currentQualityLevel) {
      this.setQualityLevel(newLevel);
    }
  }
  
  /**
   * Get current memory usage statistics
   */
  public getMemoryUsageStats(): {
    totalMemory: number;
    textureCount: number;
    cachedTextures: number;
    activeTextures: number;
  } {
    // Count active vs. cached textures
    let activeCount = 0;
    let cachedCount = 0;
    
    this.textureCache.forEach(cachedTexture => {
      if (cachedTexture.references > 0) {
        activeCount++;
      } else {
        cachedCount++;
      }
    });
    
    return {
      totalMemory: this.totalTextureMemory,
      textureCount: this.textureCache.size,
      cachedTextures: cachedCount,
      activeTextures: activeCount
    };
  }
  
  /**
   * Dispose of resources
   */
  public dispose(): void {
    // Clear texture cache
    this.clearTextureCache();
    
    // Remove observer
    if (this.scene) {
      this.scene.onBeforeRenderObservable.clear();
    }
    
    this.logger.debug('TerrainMaterialSystem disposed');
  }

  /**
   * Sets the sampling mode for a texture safely
   * This method handles the read-only property issue in some Babylon versions
   * @param texture The texture to update
   * @param samplingMode The sampling mode to set
   */
  private setSamplingModeSafely(texture: BABYLON.Texture, samplingMode: number): void {
    try {
      // Try to update using the proper API first
      texture.updateSamplingMode(samplingMode);
    } catch (e: unknown) {
      // If updateSamplingMode fails, log the error but don't crash
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Failed to update sampling mode: ${errorMessage}`);
      
      // In versions where samplingMode is read-only, we may need to recreate the texture
      // This is handled in other methods (loadTexture, etc.)
    }
  }
} 