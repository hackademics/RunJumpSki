/**
 * @file src/core/renderer/TextureAtlasManager.ts
 * @description Manages texture atlases for efficient texture usage
 */

import * as BABYLON from 'babylonjs';
import { Logger } from '../utils/Logger';
import { ServiceLocator } from '../base/ServiceLocator';
import { ResourceTracker, ResourceType } from '../utils/ResourceTracker';

/**
 * Configuration options for the texture atlas
 */
export interface TextureAtlasOptions {
  /** Width of the texture atlas */
  width: number;
  /** Height of the texture atlas */
  height: number;
  /** Cell size (in pixels) for each texture */
  cellSize: number;
  /** Whether to generate mipmaps */
  generateMipMaps: boolean;
  /** Sampling mode for the texture */
  samplingMode: number;
  /** Format of the texture */
  format: number;
  /** Type of the texture (usually BABYLON.Engine.TEXTURETYPE_UNSIGNED_INT) */
  type: number;
  /** Whether to pre-allocate memory for the atlas */
  preAllocate: boolean;
  /** Texture scene to use */
  scene: BABYLON.Scene | null;
}

/**
 * Texture region within the atlas
 */
export interface TextureRegion {
  /** Name of the texture */
  name: string;
  /** X position in the atlas */
  x: number;
  /** Y position in the atlas */
  y: number;
  /** Width of the texture */
  width: number;
  /** Height of the texture */
  height: number;
  /** U coordinate start */
  u: number;
  /** V coordinate start */
  v: number;
  /** U coordinate end */
  uScale: number;
  /** V coordinate end */
  vScale: number;
}

/**
 * Default options for texture atlas
 */
const DEFAULT_TEXTURE_ATLAS_OPTIONS: TextureAtlasOptions = {
  width: 2048,
  height: 2048,
  cellSize: 256,
  generateMipMaps: true,
  samplingMode: BABYLON.Texture.TRILINEAR_SAMPLINGMODE,
  format: BABYLON.Engine.TEXTUREFORMAT_RGBA,
  type: BABYLON.Engine.TEXTURETYPE_UNSIGNED_INT,
  preAllocate: true,
  scene: null
};

/**
 * Class that manages texture atlases for efficiently combining multiple textures
 * into a single texture to reduce draw calls and optimize memory usage
 */
export class TextureAtlasManager {
  private atlases: Map<string, TextureAtlas> = new Map();
  private logger: Logger;
  private resourceTracker: ResourceTracker;
  
  /**
   * Create a new texture atlas manager
   */
  constructor() {
    // Initialize logger
    this.logger = new Logger('TextureAtlasManager');
    
    // Try to get the logger from ServiceLocator
    try {
      const serviceLocator = ServiceLocator.getInstance();
      if (serviceLocator.has('logger')) {
        this.logger = serviceLocator.get<Logger>('logger');
        this.logger.addTag('TextureAtlasManager');
      }
    } catch (e) {
      // Use default logger
    }
    
    // Try to get resource tracker from ServiceLocator
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
    
    this.logger.debug('TextureAtlasManager created');
  }
  
  /**
   * Create a new texture atlas
   * @param name Name of the atlas
   * @param options Atlas options
   * @returns The created atlas
   */
  public createAtlas(name: string, options: Partial<TextureAtlasOptions> = {}): TextureAtlas {
    // Check if atlas with this name already exists
    if (this.atlases.has(name)) {
      this.logger.warn(`Atlas with name "${name}" already exists, returning existing atlas`);
      return this.atlases.get(name)!;
    }
    
    // Create a new atlas
    const atlas = new TextureAtlas(name, options, this.resourceTracker, this.logger);
    
    // Store the atlas
    this.atlases.set(name, atlas);
    
    return atlas;
  }
  
  /**
   * Get a texture atlas by name
   * @param name Name of the atlas
   * @returns The atlas or null if not found
   */
  public getAtlas(name: string): TextureAtlas | null {
    return this.atlases.get(name) || null;
  }
  
  /**
   * Get or create a texture atlas
   * @param name Name of the atlas
   * @param options Atlas options (used only if creating)
   * @returns The atlas
   */
  public getOrCreateAtlas(name: string, options: Partial<TextureAtlasOptions> = {}): TextureAtlas {
    if (this.atlases.has(name)) {
      return this.atlases.get(name)!;
    }
    
    return this.createAtlas(name, options);
  }
  
  /**
   * Remove a texture atlas
   * @param name Name of the atlas to remove
   */
  public removeAtlas(name: string): void {
    const atlas = this.atlases.get(name);
    if (atlas) {
      atlas.dispose();
      this.atlases.delete(name);
    }
  }
  
  /**
   * Dispose all texture atlases
   */
  public dispose(): void {
    for (const atlas of this.atlases.values()) {
      atlas.dispose();
    }
    
    this.atlases.clear();
    this.logger.debug('TextureAtlasManager disposed');
  }
}

/**
 * A texture atlas that combines multiple textures into a single texture
 */
export class TextureAtlas {
  private name: string;
  private options: TextureAtlasOptions;
  private texture: BABYLON.DynamicTexture | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private regions: Map<string, TextureRegion> = new Map();
  private cellsPerRow: number;
  private cellsPerColumn: number;
  private cells: (string | null)[][] = [];
  private textureLoadQueue: { url: string; x: number; y: number; callback?: () => void }[] = [];
  private isLoading: boolean = false;
  private maxConcurrentLoads: number = 4;
  private resourceTracker: ResourceTracker;
  private logger: Logger;
  private isPacked: boolean = false;
  
  /**
   * Create a new texture atlas
   * @param name Name of the atlas
   * @param options Atlas options
   * @param resourceTracker Resource tracker
   * @param logger Logger
   */
  constructor(
    name: string, 
    options: Partial<TextureAtlasOptions> = {}, 
    resourceTracker: ResourceTracker,
    logger: Logger
  ) {
    this.name = name;
    this.options = { ...DEFAULT_TEXTURE_ATLAS_OPTIONS, ...options };
    this.resourceTracker = resourceTracker;
    this.logger = logger;
    
    // Calculate cells per row/column
    this.cellsPerRow = Math.floor(this.options.width / this.options.cellSize);
    this.cellsPerColumn = Math.floor(this.options.height / this.options.cellSize);
    
    // Initialize cells array
    this.cells = Array(this.cellsPerColumn).fill(null).map(() => Array(this.cellsPerRow).fill(null));
    
    this.logger.debug(`TextureAtlas "${name}" created with ${this.cellsPerRow}x${this.cellsPerColumn} cells`);
    
    // Create the texture if pre-allocating
    if (this.options.preAllocate) {
      this.createTexture();
    }
  }
  
  /**
   * Create the dynamic texture
   */
  private createTexture(): void {
    if (this.texture) {
      return;
    }
    
    // Create dynamic texture
    this.texture = new BABYLON.DynamicTexture(
      `atlas_${this.name}`, 
      { width: this.options.width, height: this.options.height }, 
      this.options.scene || undefined, 
      this.options.generateMipMaps
    );
    
    // Set sampling mode
    if (this.options.samplingMode !== undefined) {
      // Need to use any type because samplingMode is read-only in some Babylon versions
      (this.texture as any).samplingMode = this.options.samplingMode;
    }
    
    // Set properties
    this.texture.hasAlpha = true;
    this.texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
    this.texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
    
    // Get context for drawing
    this.context = this.texture.getContext() as CanvasRenderingContext2D;
    
    // Track resource
    this.resourceTracker.trackTexture(this.texture, {
      id: `atlas_${this.name}`
    });
    
    this.logger.debug(`TextureAtlas "${this.name}" texture created (${this.options.width}x${this.options.height})`);
  }
  
  /**
   * Add a texture to the atlas
   * @param name Name of the texture for reference
   * @param url URL of the texture to add
   * @returns Promise that resolves to the texture region when loaded
   */
  public async addTexture(name: string, url: string): Promise<TextureRegion | null> {
    // Create the texture if not already created
    if (!this.texture) {
      this.createTexture();
    }
    
    // Check if texture with this name already exists
    if (this.regions.has(name)) {
      this.logger.warn(`Texture "${name}" already exists in atlas "${this.name}"`);
      return this.regions.get(name) || null;
    }
    
    // Find a free cell
    const cell = this.findFreeCell();
    if (!cell) {
      this.logger.warn(`No free cells available in atlas "${this.name}"`);
      return null;
    }
    
    const [x, y] = cell;
    
    // Mark cell as reserved
    this.cells[y][x] = name;
    
    // Calculate region coordinates
    const region: TextureRegion = {
      name,
      x: x * this.options.cellSize,
      y: y * this.options.cellSize,
      width: this.options.cellSize,
      height: this.options.cellSize,
      u: x * this.options.cellSize / this.options.width,
      v: y * this.options.cellSize / this.options.height,
      uScale: this.options.cellSize / this.options.width,
      vScale: this.options.cellSize / this.options.height
    };
    
    // Store the region
    this.regions.set(name, region);
    
    // Queue the texture for loading
    return new Promise<TextureRegion | null>((resolve) => {
      this.textureLoadQueue.push({
        url,
        x: region.x,
        y: region.y,
        callback: () => resolve(region)
      });
      
      // Start loading process
      this.processTextureQueue();
    });
  }
  
  /**
   * Add a raw image to the atlas
   * @param name Name of the texture for reference
   * @param imageData Raw image data to add
   * @returns The texture region or null if no free cells
   */
  public addImageData(name: string, imageData: ImageData | HTMLImageElement | HTMLCanvasElement): TextureRegion | null {
    // Create the texture if not already created
    if (!this.texture) {
      this.createTexture();
    }
    
    // Make sure we have a context
    if (!this.context) {
      this.logger.error(`Cannot add image data - context not available`);
      return null;
    }
    
    // Check if texture with this name already exists
    if (this.regions.has(name)) {
      this.logger.warn(`Texture "${name}" already exists in atlas "${this.name}"`);
      return this.regions.get(name) || null;
    }
    
    // Find a free cell
    const cell = this.findFreeCell();
    if (!cell) {
      this.logger.warn(`No free cells available in atlas "${this.name}"`);
      return null;
    }
    
    const [x, y] = cell;
    
    // Mark cell as reserved
    this.cells[y][x] = name;
    
    // Calculate region coordinates
    const region: TextureRegion = {
      name,
      x: x * this.options.cellSize,
      y: y * this.options.cellSize,
      width: this.options.cellSize,
      height: this.options.cellSize,
      u: x * this.options.cellSize / this.options.width,
      v: y * this.options.cellSize / this.options.height,
      uScale: this.options.cellSize / this.options.width,
      vScale: this.options.cellSize / this.options.height
    };
    
    // Draw the image data
    this.context.drawImage(
      imageData as any, 
      region.x, 
      region.y, 
      this.options.cellSize, 
      this.options.cellSize
    );
    
    // Store the region
    this.regions.set(name, region);
    
    // Update the texture
    if (this.texture) {
      this.texture.update();
    }
    
    return region;
  }
  
  /**
   * Process the texture load queue
   */
  private processTextureQueue(): void {
    if (this.isLoading || this.textureLoadQueue.length === 0) {
      return;
    }
    
    this.isLoading = true;
    
    // Process up to maxConcurrentLoads at once
    const toProcess = this.textureLoadQueue.splice(0, this.maxConcurrentLoads);
    
    // Load all textures in parallel
    Promise.all(toProcess.map(item => this.loadTextureImage(item.url)))
      .then(images => {
        // Draw each loaded image
        images.forEach((image, index) => {
          const item = toProcess[index];
          
          if (image && this.context) {
            // Draw the image to the atlas
            this.context.drawImage(
              image,
              item.x,
              item.y,
              this.options.cellSize,
              this.options.cellSize
            );
          } else {
            this.logger.warn(`Failed to load texture: ${item.url}`);
          }
          
          // Call the callback if provided
          if (item.callback) {
            item.callback();
          }
        });
        
        // Update the texture
        if (this.texture) {
          this.texture.update();
        }
        
        // Process next batch
        this.isLoading = false;
        if (this.textureLoadQueue.length > 0) {
          this.processTextureQueue();
        }
      })
      .catch(error => {
        this.logger.error(`Error loading textures: ${error}`);
        this.isLoading = false;
        
        // Continue with next batch even if this one failed
        if (this.textureLoadQueue.length > 0) {
          this.processTextureQueue();
        }
      });
  }
  
  /**
   * Load a texture image
   * @param url URL of the texture to load
   * @returns Promise that resolves to the loaded image
   */
  private loadTextureImage(url: string): Promise<HTMLImageElement | null> {
    return new Promise<HTMLImageElement | null>((resolve) => {
      const image = new Image();
      
      image.onload = () => {
        resolve(image);
      };
      
      image.onerror = () => {
        this.logger.warn(`Failed to load texture: ${url}`);
        resolve(null);
      };
      
      // Start loading
      image.src = url;
    });
  }
  
  /**
   * Find the first free cell in the atlas
   * @returns The cell coordinates [x, y] or null if no free cells
   */
  private findFreeCell(): [number, number] | null {
    for (let y = 0; y < this.cellsPerColumn; y++) {
      for (let x = 0; x < this.cellsPerRow; x++) {
        if (this.cells[y][x] === null) {
          return [x, y];
        }
      }
    }
    
    return null;
  }
  
  /**
   * Pack the atlas efficiently (uses bin packing algorithm)
   * This is more advanced than simple grid-based layout and will be implemented in a future update
   */
  public pack(): void {
    // Simple implementation for now, just marks as packed
    this.isPacked = true;
    this.logger.debug(`TextureAtlas "${this.name}" packed (no special packing algorithm applied yet)`);
  }
  
  /**
   * Get a texture region by name
   * @param name Name of the texture
   * @returns The texture region or null if not found
   */
  public getRegion(name: string): TextureRegion | null {
    return this.regions.get(name) || null;
  }
  
  /**
   * Get all texture regions
   * @returns Map of all texture regions
   */
  public getAllRegions(): Map<string, TextureRegion> {
    return this.regions;
  }
  
  /**
   * Get the texture atlas
   * @returns The texture atlas
   */
  public getTexture(): BABYLON.Texture | null {
    return this.texture;
  }
  
  /**
   * Check if the atlas is full
   * @returns True if the atlas is full
   */
  public isFull(): boolean {
    return this.findFreeCell() === null;
  }
  
  /**
   * Get the number of free cells
   * @returns The number of free cells
   */
  public getFreeCellCount(): number {
    let count = 0;
    for (let y = 0; y < this.cellsPerColumn; y++) {
      for (let x = 0; x < this.cellsPerRow; x++) {
        if (this.cells[y][x] === null) {
          count++;
        }
      }
    }
    return count;
  }
  
  /**
   * Get memory usage information
   * @returns Memory usage information
   */
  public getMemoryInfo(): { width: number; height: number; cells: number; used: number; free: number; bytes: number } {
    const totalCells = this.cellsPerRow * this.cellsPerColumn;
    const usedCells = totalCells - this.getFreeCellCount();
    const bytesPerPixel = 4; // RGBA
    
    return {
      width: this.options.width,
      height: this.options.height,
      cells: totalCells,
      used: usedCells,
      free: totalCells - usedCells,
      bytes: this.options.width * this.options.height * bytesPerPixel
    };
  }
  
  /**
   * Apply a texture from the atlas to a material
   * @param material The material to apply the texture to
   * @param textureName Name of the texture in the atlas
   * @param materialProperty The material property to set (e.g., "diffuseTexture")
   */
  public applyToMaterial(
    material: BABYLON.StandardMaterial, 
    textureName: string, 
    materialProperty: keyof BABYLON.StandardMaterial
  ): void {
    // Make sure the texture is available
    if (!this.texture) {
      this.logger.warn(`Cannot apply texture - atlas texture not created`);
      return;
    }
    
    // Get the region
    const region = this.regions.get(textureName);
    if (!region) {
      this.logger.warn(`Texture "${textureName}" not found in atlas "${this.name}"`);
      return;
    }
    
    // Clone the texture to avoid sharing UV transformations
    const textureClone = this.texture.clone();
    textureClone.uScale = region.uScale;
    textureClone.vScale = region.vScale;
    textureClone.uOffset = region.u;
    textureClone.vOffset = region.v;
    
    // Track the clone
    this.resourceTracker.trackTexture(textureClone, {
      id: `atlas_${this.name}_${textureName}`
    });
    
    // Apply to material
    // Use type assertion since we can't guarantee the property type
    (material as any)[materialProperty] = textureClone;
  }
  
  /**
   * Dispose the texture atlas and all resources
   */
  public dispose(): void {
    if (this.texture) {
      // Find the resource ID and dispose it
      const atlasId = `atlas_${this.name}`;
      // For now, we'll just dispose the texture directly
      // In a future version we could update ResourceTracker to support untracking
      this.texture.dispose();
      this.texture = null;
    }
    
    this.context = null;
    this.regions.clear();
    this.cells = [];
    this.textureLoadQueue = [];
    
    this.logger.debug(`TextureAtlas "${this.name}" disposed`);
  }
} 