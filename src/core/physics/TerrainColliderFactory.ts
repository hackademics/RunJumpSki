/**
 * @file src/core/physics/TerrainColliderFactory.ts
 * @description Factory for creating terrain collider instances
 */

import * as BABYLON from 'babylonjs';
import { TerrainCollider } from './TerrainCollider';
import { ITerrainCollider, HeightmapData } from './ITerrainCollider';

/**
 * Configuration for creating a terrain collider
 */
export interface TerrainColliderConfig {
  scene: BABYLON.Scene;
  heightmapData?: HeightmapData;
  mesh?: BABYLON.Mesh;
  materials?: Array<{
    name: string;
    friction: number;
    region?: { x1: number; z1: number; x2: number; z2: number };
  }>;
}

/**
 * Factory for creating terrain collider instances
 */
export class TerrainColliderFactory {
  /**
   * Creates a terrain collider with the given configuration
   * @param config The terrain collider configuration
   * @returns A new terrain collider instance
   */
  public static create(config: TerrainColliderConfig): ITerrainCollider {
    // Create a new terrain collider
    const terrainCollider = new TerrainCollider();
    
    // Initialize with the scene
    terrainCollider.initialize(config.scene);
    
    // Set the heightmap data if provided
    if (config.heightmapData) {
      terrainCollider.setHeightmapData(config.heightmapData);
    }
    
    // Set the terrain mesh if provided
    if (config.mesh) {
      terrainCollider.setTerrainMesh(config.mesh);
    }
    
    // Add materials if provided
    if (config.materials) {
      for (const material of config.materials) {
        terrainCollider.addTerrainMaterial(material.name, material.friction, material.region);
      }
    }
    
    return terrainCollider;
  }
  
  /**
   * Creates a terrain collider from a heightmap image
   * @param scene The Babylon.js scene
   * @param heightmapUrl The URL of the heightmap image
   * @param options Options for the terrain collider
   * @returns A promise that resolves to a new terrain collider instance
   */
  public static async createFromHeightmap(
    scene: BABYLON.Scene,
    heightmapUrl: string,
    options: {
      width?: number;
      height?: number;
      minHeight?: number;
      maxHeight?: number;
      scale?: BABYLON.Vector2;
      verticalScale?: number;
      materials?: Array<{
        name: string;
        friction: number;
        region?: { x1: number; z1: number; x2: number; z2: number };
      }>;
    } = {}
  ): Promise<ITerrainCollider> {
    // Create a terrain collider
    const terrainCollider = new TerrainCollider();
    terrainCollider.initialize(scene);
    
    // Load the heightmap
    const heightmapData = await this.loadHeightmapFromUrl(
      heightmapUrl,
      {
        width: options.width || 1000,
        height: options.height || 1000,
        minHeight: options.minHeight || 0,
        maxHeight: options.maxHeight || 100,
        scale: options.scale || new BABYLON.Vector2(1, 1),
        verticalScale: options.verticalScale || 1
      }
    );
    
    // Set the heightmap data
    terrainCollider.setHeightmapData(heightmapData);
    
    // Add materials if provided
    if (options.materials) {
      for (const material of options.materials) {
        terrainCollider.addTerrainMaterial(material.name, material.friction, material.region);
      }
    }
    
    return terrainCollider;
  }
  
  /**
   * Loads a heightmap from a URL
   * @param url The URL of the heightmap image
   * @param options Options for the heightmap
   * @returns A promise that resolves to a heightmap data object
   */
  private static loadHeightmapFromUrl(
    url: string,
    options: {
      width: number;
      height: number;
      minHeight: number;
      maxHeight: number;
      scale: BABYLON.Vector2;
      verticalScale: number;
    }
  ): Promise<HeightmapData> {
    return new Promise<HeightmapData>((resolve, reject) => {
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
          const heightmapData: HeightmapData = {
            width: imageData.width,
            height: imageData.height,
            heights,
            minHeight: options.minHeight,
            maxHeight: options.maxHeight,
            scale: options.scale,
            verticalScale: options.verticalScale
          };
          
          resolve(heightmapData);
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
   * Creates a terrain collider from a mesh
   * @param scene The Babylon.js scene
   * @param mesh The terrain mesh
   * @param materials Optional materials to add to the terrain
   * @returns A new terrain collider instance
   */
  public static createFromMesh(
    scene: BABYLON.Scene,
    mesh: BABYLON.Mesh,
    materials?: Array<{
      name: string;
      friction: number;
      region?: { x1: number; z1: number; x2: number; z2: number };
    }>
  ): ITerrainCollider {
    // Create a terrain collider
    const terrainCollider = new TerrainCollider();
    terrainCollider.initialize(scene);
    
    // Set the terrain mesh
    terrainCollider.setTerrainMesh(mesh);
    
    // Add materials if provided
    if (materials) {
      for (const material of materials) {
        terrainCollider.addTerrainMaterial(material.name, material.friction, material.region);
      }
    }
    
    return terrainCollider;
  }
}
