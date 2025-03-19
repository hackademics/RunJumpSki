/**
 * @file src/core/ecs/components/MeshComponent.ts
 * @description Implementation of MeshComponent for handling 3D meshes
 */

import * as BABYLON from 'babylonjs';
import { RenderableComponent } from './RenderableComponent';
import { IMeshComponent } from './IMeshComponent';
import { IEntity } from '../IEntity';

/**
 * Configuration options for MeshComponent
 */
export interface MeshComponentOptions {
  /**
   * The mesh to use
   */
  mesh?: BABYLON.AbstractMesh | null;
  
  /**
   * The material to apply to the mesh
   */
  material?: BABYLON.Material | null;
  
  /**
   * Whether the mesh is pickable
   */
  isPickable?: boolean;
  
  /**
   * Whether collision is enabled for the mesh
   */
  collisionEnabled?: boolean;
}

/**
 * Default options for MeshComponent
 */
export const DEFAULT_MESHCOMPONENT_OPTIONS: MeshComponentOptions = {
  mesh: null,
  material: null,
  isPickable: true,
  collisionEnabled: true
};

/**
 * Implementation of Mesh component
 * Handles rendering of 3D meshes in the scene
 */
export class MeshComponent extends RenderableComponent implements IMeshComponent {
  /**
   * The mesh instance
   */
  private mesh: BABYLON.AbstractMesh | null;
  
  /**
   * The material applied to the mesh
   */
  private material: BABYLON.Material | null;
  
  /**
   * Whether the mesh is pickable
   */
  private pickable: boolean;
  
  /**
   * Whether collision is enabled for the mesh
   */
  private collisionEnabled: boolean;
  
  /**
   * Create a new MeshComponent
   */
  constructor(options: Partial<MeshComponentOptions> = {}) {
    // Call the parent constructor with renderable options
    super({
      visible: options.mesh?.isVisible,
      opacity: options.mesh?.visibility,
      sceneNode: options.mesh
    });
    
    // Explicitly set the component type through Component's protected method
    Object.defineProperty(this, 'type', {
      value: 'mesh',
      writable: false,
      configurable: false
    });
    
    // Merge with default options
    const config = { ...DEFAULT_MESHCOMPONENT_OPTIONS, ...options };
    
    this.mesh = config.mesh || null;
    this.material = config.material || null;
    this.pickable = config.isPickable !== undefined ? config.isPickable : DEFAULT_MESHCOMPONENT_OPTIONS.isPickable!;
    this.collisionEnabled = config.collisionEnabled !== undefined ? config.collisionEnabled : DEFAULT_MESHCOMPONENT_OPTIONS.collisionEnabled!;
    
    // Set the mesh as the scene node for the renderable component
    if (this.mesh) {
      this.setSceneNode(this.mesh);
      this.applyMeshSettings();
    }
  }
  
  /**
   * Initialize the component
   */
  public override init(entity: IEntity): void {
    super.init(entity);
    
    // Apply any additional setup when attached to an entity
    if (this.mesh) {
      this.applyMeshSettings();
    }
  }
  
  /**
   * Update the component
   */
  public override update(deltaTime: number): void {
    if (!this.isEnabled() || !this.mesh) return;
    
    // Call the parent update which will apply transform if auto-apply is enabled
    super.update(deltaTime);
  }
  
  /**
   * Clean up resources
   */
  public override dispose(): void {
    // Clean up mesh resources if necessary
    // Note: We don't dispose the mesh here as it might be managed elsewhere
    
    // Clear references
    this.mesh = null;
    this.material = null;
    
    super.dispose();
  }
  
  /**
   * Get the mesh instance
   */
  public getMesh(): BABYLON.AbstractMesh | null {
    return this.mesh;
  }
  
  /**
   * Set the mesh instance
   */
  public setMesh(mesh: BABYLON.AbstractMesh | null): void {
    this.mesh = mesh;
    
    // Update the scene node for the renderable component
    this.setSceneNode(mesh);
    
    // Apply settings to the new mesh
    if (this.mesh) {
      this.applyMeshSettings();
    }
  }
  
  /**
   * Get the material applied to the mesh
   */
  public getMaterial(): BABYLON.Material | null {
    return this.material;
  }
  
  /**
   * Set the material for the mesh
   */
  public setMaterial(material: BABYLON.Material | null): void {
    this.material = material;
    
    // Apply material to the mesh
    if (this.mesh && this.material) {
      this.mesh.material = this.material;
    }
  }
  
  /**
   * Create a mesh from the given parameters
   */
  public createMesh(
    name: string, 
    scene: BABYLON.Scene, 
    meshType: string = 'box', 
    options: any = {}
  ): BABYLON.AbstractMesh {
    let mesh: BABYLON.AbstractMesh;
    
    // Create primitive mesh based on type
    switch (meshType.toLowerCase()) {
      case 'box':
      case 'cube':
        mesh = BABYLON.MeshBuilder.CreateBox(name, options, scene);
        break;
        
      case 'sphere':
        mesh = BABYLON.MeshBuilder.CreateSphere(name, options, scene);
        break;
        
      case 'cylinder':
        mesh = BABYLON.MeshBuilder.CreateCylinder(name, options, scene);
        break;
        
      case 'plane':
        mesh = BABYLON.MeshBuilder.CreatePlane(name, options, scene);
        break;
        
      case 'ground':
        mesh = BABYLON.MeshBuilder.CreateGround(name, options, scene);
        break;
        
      case 'disk':
        mesh = BABYLON.MeshBuilder.CreateDisc(name, options, scene);
        break;
        
      case 'torus':
        mesh = BABYLON.MeshBuilder.CreateTorus(name, options, scene);
        break;
        
      default:
        // Default to box if unknown type
        mesh = BABYLON.MeshBuilder.CreateBox(name, options, scene);
    }
    
    // Set the mesh
    this.setMesh(mesh);
    
    return mesh;
  }
  
  /**
   * Load a mesh from a file or asset
   */
  public loadMesh(
    name: string,
    scene: BABYLON.Scene,
    filePath: string,
    onSuccess?: (mesh: BABYLON.AbstractMesh) => void,
    onError?: (error: any) => void
  ): void {
    // Import mesh from file
    BABYLON.SceneLoader.ImportMesh(
      "", // Meshes names filter
      filePath.substring(0, filePath.lastIndexOf("/") + 1), // Path
      filePath.substring(filePath.lastIndexOf("/") + 1), // Filename
      scene, // Scene
      (meshes) => {
        if (meshes.length > 0) {
          // Get the first mesh from the loaded meshes
          const mesh = meshes[0];
          
          // Rename it
          mesh.name = name;
          
          // Set it as our mesh
          this.setMesh(mesh);
          
          // Call success callback if provided
          if (onSuccess) {
            onSuccess(mesh);
          }
        }
      },
      null, // Progress callback
      (scene, message, exception) => {
        // Call error callback if provided
        if (onError) {
          onError(exception || message);
        }
      }
    );
  }
  
  /**
   * Create a material and apply it to the mesh
   */
  public createMaterial(
    name: string,
    scene: BABYLON.Scene,
    materialType: string = 'standard',
    options: any = {}
  ): BABYLON.Material {
    let material: BABYLON.Material;
    
    // Create material based on type
    switch (materialType.toLowerCase()) {
      case 'standard':
        material = new BABYLON.StandardMaterial(name, scene);
        
        // Apply options to standard material
        if (options.diffuseColor) {
          (material as BABYLON.StandardMaterial).diffuseColor = options.diffuseColor;
        }
        if (options.specularColor) {
          (material as BABYLON.StandardMaterial).specularColor = options.specularColor;
        }
        if (options.emissiveColor) {
          (material as BABYLON.StandardMaterial).emissiveColor = options.emissiveColor;
        }
        if (options.ambientColor) {
          (material as BABYLON.StandardMaterial).ambientColor = options.ambientColor;
        }
        if (options.diffuseTexture) {
          (material as BABYLON.StandardMaterial).diffuseTexture = options.diffuseTexture;
        }
        break;
        
      case 'pbr':
        material = new BABYLON.PBRMaterial(name, scene);
        
        // Apply options to PBR material
        if (options.albedoColor) {
          (material as BABYLON.PBRMaterial).albedoColor = options.albedoColor;
        }
        if (options.metallic !== undefined) {
          (material as BABYLON.PBRMaterial).metallic = options.metallic;
        }
        if (options.roughness !== undefined) {
          (material as BABYLON.PBRMaterial).roughness = options.roughness;
        }
        break;
        
      default:
        // Default to standard material
        material = new BABYLON.StandardMaterial(name, scene);
    }
    
    // Set the material
    this.setMaterial(material);
    
    return material;
  }
  
  /**
   * Check if the mesh is ready to render
   */
  public isReady(): boolean {
    // Check if mesh exists and is ready
    return this.mesh !== null && this.mesh.isReady();
  }
  
  /**
   * Set whether the mesh is pickable
   */
  public setPickable(isPickable: boolean): void {
    this.pickable = isPickable;
    
    if (this.mesh) {
      this.mesh.isPickable = this.pickable;
    }
  }
  
  /**
   * Get whether the mesh is pickable
   */
  public isPickable(): boolean {
    return this.pickable;
  }
  
  /**
   * Enable or disable mesh collision
   */
  public setCollisionEnabled(enabled: boolean): void {
    this.collisionEnabled = enabled;
    
    if (this.mesh) {
      this.mesh.checkCollisions = this.collisionEnabled;
    }
  }
  
  /**
   * Get whether collision is enabled
   */
  public isCollisionEnabled(): boolean {
    return this.collisionEnabled;
  }
  
  /**
   * Apply all mesh settings to the current mesh
   */
  private applyMeshSettings(): void {
    if (!this.mesh) return;
    
    // Apply material if one is assigned
    if (this.material) {
      this.mesh.material = this.material;
    }
    
    // Apply pickable state
    this.mesh.isPickable = this.pickable;
    
    // Apply collision state
    this.mesh.checkCollisions = this.collisionEnabled;
  }
}

