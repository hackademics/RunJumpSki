/**
 * @file src/core/renderer/terrain/TerrainMaterialSystem.ts
 * @description System for creating and managing terrain materials with slope-based texture blending
 * 
 * @dependencies babylonjs
 * @relatedFiles TerrainRenderer.ts, ITerrainRenderer.ts, LODTerrainSystem.ts
 */
import * as BABYLON from 'babylonjs';

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
  detailFadeDistance: 500
};

/**
 * System for creating and managing terrain materials with slope-based texture blending
 */
export class TerrainMaterialSystem {
  private scene: BABYLON.Scene;
  private layers: TerrainMaterialLayer[] = [];
  private config: TerrainMaterialConfig;
  private terrainMaterial: BABYLON.Material | null = null;
  private textureCache: Map<string, BABYLON.Texture> = new Map();
  private terrainSize: BABYLON.Vector3 = new BABYLON.Vector3(1000, 100, 1000);
  private customShader: boolean = false;
  
  /**
   * Create a new terrain material system
   * @param scene The scene to create materials in
   * @param config Material configuration
   */
  constructor(
    scene: BABYLON.Scene,
    config: Partial<TerrainMaterialConfig> = {}
  ) {
    this.scene = scene;
    this.config = { ...DEFAULT_TERRAIN_MATERIAL_CONFIG, ...config };
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
      const texture = this.loadTexture(layer.texture, "albedo");
      
      const scalingFactor = layer.tiling * this.config.globalTiling;
      texture.updateSamplingMode(BABYLON.Texture.BILINEAR_SAMPLINGMODE);
      (texture as BABYLON.Texture).uScale = scalingFactor;
      (texture as BABYLON.Texture).vScale = scalingFactor;
      
      pbr.albedoTexture = texture;
      
      // Apply normal map if enabled
      if (this.config.enableNormalMap && layer.normalMap) {
        const normalMap = this.loadTexture(layer.normalMap, "normal");
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
      const texture = this.loadTexture(layer.texture, "albedo");
      
      const scalingFactor = layer.tiling * this.config.globalTiling;
      texture.updateSamplingMode(BABYLON.Texture.BILINEAR_SAMPLINGMODE);
      (texture as BABYLON.Texture).uScale = scalingFactor;
      (texture as BABYLON.Texture).vScale = scalingFactor;
      
      pbr.albedoTexture = texture;
      
      // Apply normal map if enabled
      if (this.config.enableNormalMap && layer.normalMap) {
        const normalMap = this.loadTexture(layer.normalMap, "normal");
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
      const texture = this.loadTexture(layer.texture, `albedo_${i}`);
      texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
      texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
      material.setTexture(`albedoTexture${i}`, texture);
      
      // Load normal map if enabled
      if (this.config.enableNormalMap && layer.normalMap) {
        const normalMap = this.loadTexture(layer.normalMap, `normal_${i}`);
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
   * Create or get a texture from cache
   * @param path Path to texture file
   * @param type Type of texture (for cache key)
   * @returns Loaded texture
   */
  private loadTexture(path: string, type: string): BABYLON.Texture {
    const cacheKey = `${path}_${type}`;
    
    // Return from cache if exists
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }
    
    // Create new texture
    const texture = new BABYLON.Texture(path, this.scene);
    
    // Store in cache
    this.textureCache.set(cacheKey, texture);
    
    return texture;
  }
  
  /**
   * Set whether to use custom shaders for advanced terrain rendering
   * @param useCustomShader Whether to use custom shader
   */
  public setUseCustomShader(useCustomShader: boolean): void {
    if (this.customShader !== useCustomShader) {
      this.customShader = useCustomShader;
      
      // Rebuild material if needed
      if (this.terrainMaterial) {
        this.rebuildMaterial();
      }
    }
  }
  
  /**
   * Add multiple layers at once
   * @param layers Array of layer configurations
   */
  public setLayers(layers: TerrainMaterialLayer[]): void {
    this.layers = [...layers];
    
    // Sort layers by slope (low to high)
    this.layers.sort((a, b) => a.minSlope - b.minSlope);
    
    // Update material if it exists
    if (this.terrainMaterial) {
      this.rebuildMaterial();
    }
  }
  
  /**
   * Create a material setup for snow-covered peaks with grassy/rocky slopes
   * @returns The material
   */
  public createDefaultMountainMaterial(): BABYLON.Material {
    // Clear existing layers
    this.layers = [];
    
    // Add snow layer (highest peaks)
    this.addLayer({
      texture: "assets/textures/terrain/snow_diffuse.jpg",
      normalMap: "assets/textures/terrain/snow_normal.jpg",
      minSlope: 0,
      maxSlope: 30,
      minHeight: 0.8,
      maxHeight: 1.0,
      tiling: 20,
      smoothness: 0.3
    });
    
    // Add rocky layer (steep slopes)
    this.addLayer({
      texture: "assets/textures/terrain/rock_diffuse.jpg",
      normalMap: "assets/textures/terrain/rock_normal.jpg",
      minSlope: 30,
      maxSlope: 90,
      minHeight: 0.3,
      maxHeight: 1.0,
      tiling: 25,
      smoothness: 0.1
    });
    
    // Add grass layer (medium heights)
    this.addLayer({
      texture: "assets/textures/terrain/grass_diffuse.jpg",
      normalMap: "assets/textures/terrain/grass_normal.jpg",
      minSlope: 0,
      maxSlope: 40,
      minHeight: 0.2,
      maxHeight: 0.8,
      tiling: 15,
      smoothness: 0.2
    });
    
    // Add dirt layer (low areas)
    this.addLayer({
      texture: "assets/textures/terrain/dirt_diffuse.jpg",
      normalMap: "assets/textures/terrain/dirt_normal.jpg",
      minSlope: 0,
      maxSlope: 90,
      minHeight: 0.0,
      maxHeight: 0.3,
      tiling: 20,
      smoothness: 0.1
    });
    
    // Create and return material
    return this.createMaterial();
  }
  
  /**
   * Dispose material system resources
   */
  public dispose(): void {
    // Dispose material
    if (this.terrainMaterial) {
      this.terrainMaterial.dispose();
      this.terrainMaterial = null;
    }
    
    // Dispose textures
    for (const texture of this.textureCache.values()) {
      texture.dispose();
    }
    
    // Clear cache
    this.textureCache.clear();
    
    // Clear layers
    this.layers = [];
  }
} 