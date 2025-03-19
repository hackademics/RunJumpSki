/**
 * @file src/core/renderer/terrain/TerrainTextureGenerator.ts
 * @description Generates textures for terrain based on terrain properties like slope and height.
 * 
 * @dependencies babylonjs
 * @relatedFiles TerrainRenderer.ts, TerrainMaterialSystem.ts, LODTerrainSystem.ts
 */

import * as BABYLON from 'babylonjs';

/**
 * Configuration for a texture blend layer
 */
export interface TextureBlendLayer {
  texturePath: string;          // Path to texture file
  normalMapPath?: string;       // Optional normal map
  roughnessMapPath?: string;    // Optional roughness map
  minSlope?: number;            // Minimum slope angle (in radians) for this texture
  maxSlope?: number;            // Maximum slope angle (in radians) for this texture
  minHeight?: number;           // Minimum terrain height for this texture
  maxHeight?: number;           // Maximum terrain height for this texture
  tiling?: number;              // Texture tiling factor
  blendSharpness?: number;      // Blend edge sharpness (higher = sharper transition)
}

/**
 * Configuration for noise to apply to textures
 */
export interface TextureNoiseConfig {
  enabled: boolean;             // Whether noise is enabled
  scale: number;                // Scale of the noise
  intensity: number;            // Intensity of the noise effect
  octaves: number;              // Number of octaves for fractal noise
  persistence: number;          // Persistence for fractal noise
  seed?: number;                // Optional seed for reproducible noise
}

/**
 * Configuration for texture generation
 */
export interface TextureGeneratorConfig {
  resolution: number;           // Resolution of generated textures (power of 2)
  blendMap: boolean;            // Whether to generate blend maps
  normalMap: boolean;           // Whether to generate normal maps
  roughnessMap: boolean;        // Whether to generate roughness maps
  noise?: TextureNoiseConfig;   // Noise configuration for variation
  cacheTextures: boolean;       // Whether to cache generated textures
}

/**
 * Default configuration for texture generation
 */
export const DEFAULT_TEXTURE_GENERATOR_CONFIG: TextureGeneratorConfig = {
  resolution: 1024,
  blendMap: true,
  normalMap: true,
  roughnessMap: true,
  noise: {
    enabled: true,
    scale: 0.05,
    intensity: 0.2,
    octaves: 3,
    persistence: 0.5
  },
  cacheTextures: true
};

/**
 * Class for generating and managing terrain textures
 */
export class TerrainTextureGenerator {
  private scene: BABYLON.Scene;
  private config: TextureGeneratorConfig;
  private textureCache: Map<string, BABYLON.Texture> = new Map();
  private blendMapCache: Map<string, BABYLON.DynamicTexture> = new Map();
  
  /**
   * Creates a new TerrainTextureGenerator
   * @param scene BabylonJS scene
   * @param config Configuration for texture generation
   */
  constructor(scene: BABYLON.Scene, config?: Partial<TextureGeneratorConfig>) {
    this.scene = scene;
    this.config = { ...DEFAULT_TEXTURE_GENERATOR_CONFIG, ...config };
  }
  
  /**
   * Gets or creates a texture from the cache
   * @param texturePath Path to the texture
   * @returns Loaded texture
   */
  public getTexture(texturePath: string): BABYLON.Texture {
    if (this.config.cacheTextures && this.textureCache.has(texturePath)) {
      return this.textureCache.get(texturePath)!;
    }
    
    const texture = new BABYLON.Texture(texturePath, this.scene);
    
    if (this.config.cacheTextures) {
      this.textureCache.set(texturePath, texture);
    }
    
    return texture;
  }
  
  /**
   * Generates a blend map based on heightmap data, slope, and configured layers
   * @param heightmap Heightmap data (array of height values)
   * @param width Width of the heightmap
   * @param height Height of the heightmap
   * @param layers Texture layers to blend
   * @param terrainSize Size of the terrain in world units
   * @returns Dynamic texture containing the blend map
   */
  public generateBlendMap(
    heightmap: Float32Array | number[], 
    width: number, 
    height: number, 
    layers: TextureBlendLayer[],
    terrainSize: BABYLON.Vector3
  ): BABYLON.DynamicTexture {
    // Create a unique key for this blend map configuration
    const cacheKey = `blend_${width}_${height}_${layers.length}_${terrainSize.toString()}`;
    
    // Check cache first
    if (this.config.cacheTextures && this.blendMapCache.has(cacheKey)) {
      return this.blendMapCache.get(cacheKey)!;
    }
    
    // Create a new dynamic texture
    const resolution = this.config.resolution;
    const blendMap = new BABYLON.DynamicTexture(
      `terrainBlendMap_${width}_${height}`,
      { width: resolution, height: resolution },
      this.scene,
      false
    );
    
    // Get the context for drawing
    const context = blendMap.getContext();
    
    // Calculate slope for each point in the heightmap
    const slopes = this.calculateSlopes(heightmap, width, height, terrainSize);
    
    // Normalize heights for height-based blending
    let minHeight = Number.MAX_VALUE;
    let maxHeight = Number.MIN_VALUE;
    
    for (let i = 0; i < heightmap.length; i++) {
      minHeight = Math.min(minHeight, heightmap[i]);
      maxHeight = Math.max(maxHeight, heightmap[i]);
    }
    
    // Create image data for the blend map
    // Use compatible method for getting/creating image data
    const tempData = context.getImageData(0, 0, 1, 1);
    const imageData = new ImageData(
      new Uint8ClampedArray(resolution * resolution * 4),
      resolution,
      resolution
    );
    const data = imageData.data;
    
    // Generate the blend map
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        // Map texture coordinates to heightmap coordinates
        const hmX = Math.floor((x / resolution) * (width - 1));
        const hmY = Math.floor((y / resolution) * (height - 1));
        const hmIndex = hmY * width + hmX;
        
        // Get height and slope at this point
        const terrainHeight = heightmap[hmIndex];
        const slope = slopes[hmIndex];
        
        // Normalize height to 0-1 range
        const normalizedHeight = (terrainHeight - minHeight) / (maxHeight - minHeight);
        
        // Calculate blend weights for each layer based on slope and height
        const weights = this.calculateBlendWeights(layers, slope, normalizedHeight);
        
        // Set RGBA values based on weights (max 4 layers supported in a single RGBA texture)
        const pixelIndex = (y * resolution + x) * 4;
        data[pixelIndex] = Math.floor(weights[0] * 255);     // R: first layer weight
        data[pixelIndex + 1] = Math.floor(weights[1] * 255); // G: second layer weight
        data[pixelIndex + 2] = Math.floor(weights[2] * 255); // B: third layer weight
        data[pixelIndex + 3] = Math.floor(weights[3] * 255); // A: fourth layer weight
      }
    }
    
    // Apply noise if enabled
    if (this.config.noise && this.config.noise.enabled) {
      this.applyNoiseToBlendMap(data, resolution);
    }
    
    // Update the texture with our image data
    context.putImageData(imageData, 0, 0);
    blendMap.update();
    
    // Store in cache
    if (this.config.cacheTextures) {
      this.blendMapCache.set(cacheKey, blendMap);
    }
    
    return blendMap;
  }
  
  /**
   * Calculate slope angles for a heightmap
   * @param heightmap Heightmap data
   * @param width Width of heightmap
   * @param height Height of heightmap
   * @param terrainSize Size of terrain in world units
   * @returns Array of slope angles in radians
   */
  private calculateSlopes(
    heightmap: Float32Array | number[],
    width: number,
    height: number,
    terrainSize: BABYLON.Vector3
  ): number[] {
    const slopes = new Array(heightmap.length).fill(0);
    const scaleX = terrainSize.x / (width - 1);
    const scaleZ = terrainSize.z / (height - 1);
    
    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        const idx = z * width + x;
        
        // Skip the edges
        if (x === 0 || x === width - 1 || z === 0 || z === height - 1) {
          slopes[idx] = 0;
          continue;
        }
        
        // Get neighboring heights
        const hC = heightmap[idx];                  // Center
        const hL = heightmap[idx - 1];              // Left
        const hR = heightmap[idx + 1];              // Right
        const hT = heightmap[idx - width];          // Top
        const hB = heightmap[idx + width];          // Bottom
        
        // Calculate partial derivatives
        const dhdx = (hR - hL) / (2 * scaleX);
        const dhdz = (hB - hT) / (2 * scaleZ);
        
        // Calculate slope as angle in radians
        slopes[idx] = Math.atan(Math.sqrt(dhdx * dhdx + dhdz * dhdz));
      }
    }
    
    return slopes;
  }
  
  /**
   * Calculate blend weights for texture layers based on slope and height
   * @param layers Texture layers
   * @param slope Slope angle in radians
   * @param height Normalized height (0-1)
   * @returns Array of blend weights for each layer
   */
  private calculateBlendWeights(
    layers: TextureBlendLayer[],
    slope: number,
    height: number
  ): number[] {
    // Initialize weights
    const weights = new Array(4).fill(0);
    
    // Calculate weight for each layer
    for (let i = 0; i < Math.min(layers.length, 4); i++) {
      const layer = layers[i];
      let weight = 1.0;
      
      // Apply slope-based blending
      if (layer.minSlope !== undefined || layer.maxSlope !== undefined) {
        const minSlope = layer.minSlope || 0;
        const maxSlope = layer.maxSlope || Math.PI / 2;
        const blendSharpness = layer.blendSharpness || 1.0;
        
        if (slope < minSlope) {
          weight *= Math.max(0, 1 - blendSharpness * (minSlope - slope));
        } else if (slope > maxSlope) {
          weight *= Math.max(0, 1 - blendSharpness * (slope - maxSlope));
        }
      }
      
      // Apply height-based blending
      if (layer.minHeight !== undefined || layer.maxHeight !== undefined) {
        const minHeight = layer.minHeight || 0;
        const maxHeight = layer.maxHeight || 1;
        const blendSharpness = layer.blendSharpness || 1.0;
        
        if (height < minHeight) {
          weight *= Math.max(0, 1 - blendSharpness * (minHeight - height));
        } else if (height > maxHeight) {
          weight *= Math.max(0, 1 - blendSharpness * (height - maxHeight));
        }
      }
      
      weights[i] = weight;
    }
    
    // Normalize weights to sum to 1
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight > 0) {
      for (let i = 0; i < weights.length; i++) {
        weights[i] /= totalWeight;
      }
    }
    
    return weights;
  }
  
  /**
   * Apply noise to a blend map
   * @param data Image data array
   * @param resolution Texture resolution
   */
  private applyNoiseToBlendMap(data: Uint8ClampedArray, resolution: number): void {
    const noise = this.config.noise!;
    const seed = noise.seed || Math.random() * 10000;
    
    // Simplified Perlin noise function for blending
    const simplexNoise = (x: number, y: number): number => {
      // Simple hash function
      const hash = (n: number): number => {
        const x = Math.sin(n) * 43758.5453;
        return x - Math.floor(x);
      };
      
      // Simple 2D noise (not real Perlin/Simplex, but sufficient for this purpose)
      const dot = (fx: number, fy: number, ix: number, iy: number): number => {
        const g = 2.0 * hash(seed + ix * 1337 + iy * 7331) - 1.0;
        const h = 2.0 * hash(seed + ix * 7331 + iy * 1337) - 1.0;
        return fx * g + fy * h;
      };
      
      const sx = x / noise.scale;
      const sy = y / noise.scale;
      
      const ix = Math.floor(sx);
      const iy = Math.floor(sy);
      
      const fx = sx - ix;
      const fy = sy - iy;
      
      const ux = fx * fx * (3 - 2 * fx);
      const uy = fy * fy * (3 - 2 * fy);
      
      const a = dot(fx, fy, ix, iy);
      const b = dot(fx - 1, fy, ix + 1, iy);
      const c = dot(fx, fy - 1, ix, iy + 1);
      const d = dot(fx - 1, fy - 1, ix + 1, iy + 1);
      
      const value = a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
      return (value + 1) / 2; // Normalize to 0-1
    };
    
    // Calculate fractal noise
    const fractalNoise = (x: number, y: number): number => {
      let value = 0;
      let amplitude = 1;
      let frequency = 1;
      let maxValue = 0;
      
      for (let i = 0; i < noise.octaves; i++) {
        value += amplitude * simplexNoise(x * frequency, y * frequency);
        maxValue += amplitude;
        amplitude *= noise.persistence;
        frequency *= 2;
      }
      
      return value / maxValue;
    };
    
    // Apply noise to the blend map
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const noiseValue = (fractalNoise(x, y) - 0.5) * noise.intensity;
        const pixelIndex = (y * resolution + x) * 4;
        
        // Apply noise to each channel
        for (let c = 0; c < 4; c++) {
          let value = data[pixelIndex + c] / 255 + noiseValue;
          value = Math.max(0, Math.min(1, value)); // Clamp to 0-1
          data[pixelIndex + c] = Math.floor(value * 255);
        }
      }
    }
  }
  
  /**
   * Generate normal map from heightmap
   * @param heightmap Heightmap data
   * @param width Width of heightmap
   * @param height Height of heightmap
   * @param terrainSize Size of terrain in world units
   * @returns Dynamic texture containing normal map
   */
  public generateNormalMap(
    heightmap: Float32Array | number[],
    width: number,
    height: number,
    terrainSize: BABYLON.Vector3
  ): BABYLON.DynamicTexture {
    // Create a unique key for this normal map
    const cacheKey = `normal_${width}_${height}_${terrainSize.toString()}`;
    
    // Check cache first
    if (this.config.cacheTextures && this.blendMapCache.has(cacheKey)) {
      return this.blendMapCache.get(cacheKey)!;
    }
    
    // Create dynamic texture for normal map
    const resolution = this.config.resolution;
    const normalMap = new BABYLON.DynamicTexture(
      `terrainNormalMap_${width}_${height}`,
      { width: resolution, height: resolution },
      this.scene,
      false
    );
    
    // Get context for drawing
    const context = normalMap.getContext();
    const tempData = context.getImageData(0, 0, 1, 1);
    const imageData = new ImageData(
      new Uint8ClampedArray(resolution * resolution * 4),
      resolution,
      resolution
    );
    const data = imageData.data;
    
    // Calculate height scale
    const scaleX = terrainSize.x / (width - 1);
    const scaleY = terrainSize.y;
    const scaleZ = terrainSize.z / (height - 1);
    
    // Generate normal map
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        // Map texture coordinates to heightmap coordinates
        const hmX = Math.min(Math.floor((x / resolution) * width), width - 2);
        const hmY = Math.min(Math.floor((y / resolution) * height), height - 2);
        
        // Get heights of neighboring points
        const hL = heightmap[hmY * width + Math.max(0, hmX - 1)];
        const hR = heightmap[hmY * width + Math.min(width - 1, hmX + 1)];
        const hT = heightmap[Math.max(0, hmY - 1) * width + hmX];
        const hB = heightmap[Math.min(height - 1, hmY + 1) * width + hmX];
        
        // Calculate normal vector using central differences
        const dhdx = (hR - hL) / (2 * scaleX);
        const dhdz = (hB - hT) / (2 * scaleZ);
        
        // Normal = normalize((-dhdx, 1, -dhdz))
        const normal = new BABYLON.Vector3(-dhdx * scaleY, 1, -dhdz * scaleY).normalize();
        
        // Convert normal to RGB (normal maps use x=R, y=G, z=B with a range of 0-1)
        const pixelIndex = (y * resolution + x) * 4;
        data[pixelIndex] = Math.floor((normal.x * 0.5 + 0.5) * 255);     // R: x component
        data[pixelIndex + 1] = Math.floor((normal.y * 0.5 + 0.5) * 255); // G: y component
        data[pixelIndex + 2] = Math.floor((normal.z * 0.5 + 0.5) * 255); // B: z component
        data[pixelIndex + 3] = 255; // A: fully opaque
      }
    }
    
    // Update texture with image data
    context.putImageData(imageData, 0, 0);
    normalMap.update();
    
    // Store in cache
    if (this.config.cacheTextures) {
      this.blendMapCache.set(cacheKey, normalMap);
    }
    
    return normalMap;
  }
  
  /**
   * Generate roughness map from heightmap and slope
   * @param heightmap Heightmap data
   * @param width Width of heightmap
   * @param height Height of heightmap
   * @param terrainSize Size of terrain in world units
   * @returns Dynamic texture containing roughness map
   */
  public generateRoughnessMap(
    heightmap: Float32Array | number[],
    width: number,
    height: number,
    terrainSize: BABYLON.Vector3
  ): BABYLON.DynamicTexture {
    // Create a unique key for this roughness map
    const cacheKey = `roughness_${width}_${height}_${terrainSize.toString()}`;
    
    // Check cache first
    if (this.config.cacheTextures && this.blendMapCache.has(cacheKey)) {
      return this.blendMapCache.get(cacheKey)!;
    }
    
    // Calculate slopes for the heightmap
    const slopes = this.calculateSlopes(heightmap, width, height, terrainSize);
    
    // Create dynamic texture for roughness map
    const resolution = this.config.resolution;
    const roughnessMap = new BABYLON.DynamicTexture(
      `terrainRoughnessMap_${width}_${height}`,
      { width: resolution, height: resolution },
      this.scene,
      false
    );
    
    // Get context for drawing
    const context = roughnessMap.getContext();
    const tempData = context.getImageData(0, 0, 1, 1);
    const imageData = new ImageData(
      new Uint8ClampedArray(resolution * resolution * 4),
      resolution,
      resolution
    );
    const data = imageData.data;
    
    // Find min/max height for normalization
    let minHeight = Number.MAX_VALUE;
    let maxHeight = Number.MIN_VALUE;
    for (let i = 0; i < heightmap.length; i++) {
      minHeight = Math.min(minHeight, heightmap[i]);
      maxHeight = Math.max(maxHeight, heightmap[i]);
    }
    
    // Generate roughness map based on slope and height
    // Steeper slopes and higher elevation tend to be rougher
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        // Map texture coordinates to heightmap coordinates
        const hmX = Math.floor((x / resolution) * (width - 1));
        const hmY = Math.floor((y / resolution) * (height - 1));
        const hmIndex = hmY * width + hmX;
        
        // Get height and slope
        const terrainHeight = heightmap[hmIndex];
        const slope = slopes[hmIndex];
        
        // Normalize height to 0-1
        const normalizedHeight = (terrainHeight - minHeight) / (maxHeight - minHeight);
        
        // Calculate roughness based on slope and height
        // Steeper slopes and higher elevation tend to be rougher
        let roughness = 0.3 + 0.4 * (slope / (Math.PI / 4)) + 0.3 * normalizedHeight;
        roughness = Math.max(0, Math.min(1, roughness)); // Clamp to 0-1
        
        // Set roughness value (grayscale)
        const pixelIndex = (y * resolution + x) * 4;
        const value = Math.floor(roughness * 255);
        data[pixelIndex] = value;     // R
        data[pixelIndex + 1] = value; // G
        data[pixelIndex + 2] = value; // B
        data[pixelIndex + 3] = 255;   // A: fully opaque
      }
    }
    
    // Apply noise if enabled
    if (this.config.noise && this.config.noise.enabled) {
      // For roughness, use half the intensity of the normal noise
      const savedIntensity = this.config.noise.intensity;
      this.config.noise.intensity *= 0.5;
      this.applyNoiseToBlendMap(data, resolution);
      this.config.noise.intensity = savedIntensity;
    }
    
    // Update texture with image data
    context.putImageData(imageData, 0, 0);
    roughnessMap.update();
    
    // Store in cache
    if (this.config.cacheTextures) {
      this.blendMapCache.set(cacheKey, roughnessMap);
    }
    
    return roughnessMap;
  }
  
  /**
   * Create a terrain material with generated textures
   * @param heightmap Heightmap data
   * @param width Width of heightmap
   * @param height Height of heightmap
   * @param layers Texture layers to blend
   * @param terrainSize Size of terrain in world units
   * @returns BabylonJS material configured with generated textures
   */
  public createTerrainMaterial(
    heightmap: Float32Array | number[],
    width: number,
    height: number,
    layers: TextureBlendLayer[],
    terrainSize: BABYLON.Vector3
  ): BABYLON.Material {
    // Create a PBR material
    const material = new BABYLON.PBRMaterial(`terrainMaterial_${width}_${height}`, this.scene);
    
    // Set basic material properties
    material.metallic = 0.0;
    material.roughness = 1.0;
    
    // Load textures for each layer (max 4 supported in a single shader)
    const textures: BABYLON.Texture[] = [];
    const normalMaps: BABYLON.Texture[] = [];
    
    for (let i = 0; i < Math.min(layers.length, 4); i++) {
      const layer = layers[i];
      const texture = this.getTexture(layer.texturePath);
      texture.uScale = texture.vScale = layer.tiling || 20;
      textures.push(texture);
      
      // Load normal map if available
      if (layer.normalMapPath) {
        const normalMap = this.getTexture(layer.normalMapPath);
        normalMap.uScale = normalMap.vScale = layer.tiling || 20;
        normalMaps.push(normalMap);
      } else {
        normalMaps.push(null!);
      }
    }
    
    // Generate blend map if needed
    if (this.config.blendMap && layers.length > 1) {
      const blendMap = this.generateBlendMap(heightmap, width, height, layers, terrainSize);
      material.albedoTexture = blendMap; // Use as albedo for now
    }
    
    // Generate normal map if needed
    if (this.config.normalMap) {
      const normalMap = this.generateNormalMap(heightmap, width, height, terrainSize);
      material.bumpTexture = normalMap;
      material.invertNormalMapX = true;
      material.invertNormalMapY = true;
    }
    
    // Generate roughness map if needed
    if (this.config.roughnessMap) {
      const roughnessMap = this.generateRoughnessMap(heightmap, width, height, terrainSize);
      // Assign to metallic/roughness texture
      material.metallicTexture = roughnessMap; // R channel used for roughness in PBR
    }
    
    // Set diffuse textures if supported, otherwise fall back to texture slots
    if (textures.length > 0) material.albedoTexture = textures[0];
    
    // For additional textures, we'll need to use a shader approach
    // This would require a custom PBR shader with multiple texture support
    // The following is commented as it won't work directly with PBRMaterial
    /*
    if (textures.length > 1) material.setTexture("terrainTexture2", textures[1]);
    if (textures.length > 2) material.setTexture("terrainTexture3", textures[2]);
    if (textures.length > 3) material.setTexture("terrainTexture4", textures[3]);
    */
    
    // Set normal map slots if available
    let hasNormalMaps = false;
    for (const normalMap of normalMaps) {
      if (normalMap) {
        hasNormalMaps = true;
        break;
      }
    }
    
    if (hasNormalMaps) {
      if (normalMaps[0]) material.bumpTexture = normalMaps[0];
      // For multiple normal maps, we would need a custom shader approach
    }
    
    return material;
  }
  
  /**
   * Dispose of all textures in the cache
   */
  public dispose(): void {
    // Dispose textures
    this.textureCache.forEach(texture => {
      texture.dispose();
    });
    this.textureCache.clear();
    
    // Dispose dynamic textures
    this.blendMapCache.forEach(texture => {
      texture.dispose();
    });
    this.blendMapCache.clear();
  }
  
  /**
   * Updates the terrain texture generator configuration
   * @param config New configuration options
   */
  public updateConfig(config: Partial<TextureGeneratorConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Clears the texture cache
   */
  public clearCache(): void {
    this.textureCache.clear();
    this.blendMapCache.clear();
  }
} 