/**
 * @file src/core/ecs/components/IMeshComponent.ts
 * @description Interface for mesh-specific renderable components
 */

import * as BABYLON from 'babylonjs';
import { IRenderableComponent } from './IRenderableComponent';

/**
 * Interface for Mesh component
 * Extends the renderable interface with mesh-specific functionality
 */
export interface IMeshComponent extends IRenderableComponent {
  /**
   * Get the mesh instance
   */
  getMesh(): BABYLON.AbstractMesh | null;
  
  /**
   * Set the mesh instance
   * @param mesh - The mesh instance to use
   */
  setMesh(mesh: BABYLON.AbstractMesh | null): void;
  
  /**
   * Get the material applied to the mesh
   */
  getMaterial(): BABYLON.Material | null;
  
  /**
   * Set the material for the mesh
   * @param material - The material to apply
   */
  setMaterial(material: BABYLON.Material | null): void;
  
  /**
   * Create a mesh from the given parameters
   * @param name - Name of the mesh
   * @param scene - Scene to create the mesh in
   * @param meshType - Type of mesh to create
   * @param options - Options for mesh creation
   */
  createMesh(
    name: string, 
    scene: BABYLON.Scene, 
    meshType?: string, 
    options?: any
  ): BABYLON.AbstractMesh;
  
  /**
   * Load a mesh from a file or asset
   * @param name - Name to assign to the loaded mesh
   * @param scene - Scene to load the mesh into
   * @param filePath - Path to the mesh file
   * @param onSuccess - Callback when loading succeeds
   * @param onError - Callback when loading fails
   */
  loadMesh(
    name: string,
    scene: BABYLON.Scene,
    filePath: string,
    onSuccess?: (mesh: BABYLON.AbstractMesh) => void,
    onError?: (error: any) => void
  ): void;
  
  /**
   * Create a material and apply it to the mesh
   * @param name - Name of the material
   * @param scene - Scene to create the material in
   * @param materialType - Type of material to create
   * @param options - Options for material creation
   */
  createMaterial(
    name: string,
    scene: BABYLON.Scene,
    materialType?: string,
    options?: any
  ): BABYLON.Material;
  
  /**
   * Check if the mesh is ready to render
   */
  isReady(): boolean;
  
  /**
   * Set whether the mesh is pickable
   * @param isPickable - Whether the mesh should be pickable
   */
  setPickable(isPickable: boolean): void;
  
  /**
   * Get whether the mesh is pickable
   */
  isPickable(): boolean;
  
  /**
   * Enable or disable mesh collision
   * @param enabled - Whether collision should be enabled
   */
  setCollisionEnabled(enabled: boolean): void;
  
  /**
   * Get whether collision is enabled
   */
  isCollisionEnabled(): boolean;
}

