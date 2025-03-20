/**
 * @file src/core/ecs/components/MeshComponent.ts
 * @description Implementation of MeshComponent for handling 3D meshes
 */

import * as BABYLON from 'babylonjs';
import { RenderableComponent } from './RenderableComponent';
import { IMeshComponent } from './IMeshComponent';
import { IEntity } from '../IEntity';
import { ResourceTracker, ResourceType } from '../../utils/ResourceTracker';
import { Logger } from '../../utils/Logger';
import { ServiceLocator } from '../../base/ServiceLocator';

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
  
  /**
   * Resource tracker instance to use
   */
  resourceTracker?: ResourceTracker;
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
   * Resource tracker for managing Babylon.js resources
   */
  private resourceTracker: ResourceTracker;
  
  /**
   * Resource group name for tracking
   */
  private resourceGroup: string = 'meshComponent';
  
  /**
   * List of resources created by this component (to be disposed on cleanup)
   */
  private ownedResources: Set<string> = new Set();
  
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
    
    // Set up resource tracking
    this.resourceTracker = options.resourceTracker || new ResourceTracker();
    
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
      
      // Track the mesh if it was provided via constructor
      this.trackResource(this.mesh, ResourceType.MESH, `mesh_${this.mesh.name}`);
    }
    
    // Track material if provided
    if (this.material) {
      this.trackResource(this.material, ResourceType.MATERIAL, `material_${this.material.name}`);
    }
    
    this.logger.debug('MeshComponent created');
  }
  
  /**
   * Initialize the component
   */
  public override initialize(entity: IEntity): void {
    super.initialize(entity);
    
    // Apply any additional setup when attached to an entity
    if (this.mesh) {
      this.applyMeshSettings();
    }
    
    this.logDebug(`MeshComponent initialized for entity ${entity.id}`);
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
    this.logDebug('Disposing MeshComponent');
    
    // Use ResourceTracker to dispose resources created by this component
    if (this.ownedResources.size > 0) {
      const disposedCount = this.resourceTracker.disposeByGroup(this.resourceGroup);
      this.logDebug(`Disposed ${disposedCount} owned resources`);
      this.ownedResources.clear();
    }
    
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
    // Stop tracking the old mesh if we have one
    if (this.mesh) {
      // We don't dispose it here as it might be managed elsewhere
      this.mesh = null;
    }
    
    this.mesh = mesh;
    
    // Update the scene node for the renderable component
    this.setSceneNode(mesh);
    
    // Apply settings to the new mesh
    if (this.mesh) {
      this.applyMeshSettings();
      
      // Track the new mesh
      this.trackResource(this.mesh, ResourceType.MESH, `mesh_${this.mesh.name}`);
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
    // Stop tracking the old material if we have one
    if (this.material) {
      // We don't dispose it here as it might be managed elsewhere
      this.material = null;
    }
    
    this.material = material;
    
    // Apply material to the mesh
    if (this.mesh && this.material) {
      this.mesh.material = this.material;
      
      // Track the new material
      this.trackResource(this.material, ResourceType.MATERIAL, `material_${this.material.name}`);
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
    
    // Track the mesh as owned by this component
    const resourceId = this.trackResourceAsOwned(mesh, ResourceType.MESH, `created_mesh_${name}`);
    this.ownedResources.add(resourceId);
    this.logDebug(`Created and tracked mesh: ${name}`);
    
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
    this.logDebug(`Loading mesh from: ${filePath}`);
    
    // Import mesh from file
    BABYLON.SceneLoader.ImportMesh(
      "", // Meshes names filter
      filePath.substring(0, filePath.lastIndexOf("/") + 1), // Path
      filePath.substring(filePath.lastIndexOf("/") + 1), // Filename
      scene, // Scene
      (meshes) => {
        if (meshes.length > 0) {
          // Use the first mesh as our primary mesh
          const rootMesh = meshes[0];
          
          // Track all loaded meshes as owned by this component
          meshes.forEach(mesh => {
            const resourceId = this.trackResourceAsOwned(mesh, ResourceType.MESH, `loaded_mesh_${mesh.name}`);
            this.ownedResources.add(resourceId);
          });
          
          this.logDebug(`Loaded and tracked ${meshes.length} meshes from ${filePath}`);
          
          // Set the primary mesh
          this.setMesh(rootMesh);
          
          // Call the success callback
          if (onSuccess) {
            onSuccess(rootMesh);
          }
        } else {
          this.logWarning(`No meshes loaded from ${filePath}`);
          if (onError) {
            onError(new Error(`No meshes loaded from ${filePath}`));
          }
        }
      },
      null, // Progress callback
      (scene, message, exception) => {
        const errorMsg = `Error loading mesh from ${filePath}: ${message}`;
        this.logError(errorMsg);
        if (onError) {
          onError(exception || new Error(errorMsg));
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
        break;
        
      case 'pbr':
        material = new BABYLON.PBRMaterial(name, scene);
        break;
        
      default:
        // Default to standard material
        material = new BABYLON.StandardMaterial(name, scene);
    }
    
    // Apply options
    if (materialType.toLowerCase() === 'standard' && options) {
      const standardMaterial = material as BABYLON.StandardMaterial;
      
      if (options.diffuseColor) standardMaterial.diffuseColor = options.diffuseColor;
      if (options.specularColor) standardMaterial.specularColor = options.specularColor;
      if (options.emissiveColor) standardMaterial.emissiveColor = options.emissiveColor;
      if (options.ambientColor) standardMaterial.ambientColor = options.ambientColor;
      
      if (options.diffuseTexture) standardMaterial.diffuseTexture = new BABYLON.Texture(options.diffuseTexture, scene);
      if (options.specularTexture) standardMaterial.specularTexture = new BABYLON.Texture(options.specularTexture, scene);
      if (options.bumpTexture) standardMaterial.bumpTexture = new BABYLON.Texture(options.bumpTexture, scene);
    }
    
    // Track the material as owned by this component
    const resourceId = this.trackResourceAsOwned(material, ResourceType.MATERIAL, `created_material_${name}`);
    this.ownedResources.add(resourceId);
    
    // Track any textures created
    if (material instanceof BABYLON.StandardMaterial) {
      this.trackTextures(material);
    }
    
    this.logDebug(`Created and tracked material: ${name}`);
    
    // Set the material
    this.setMaterial(material);
    
    return material;
  }
  
  /**
   * Track textures from a standard material
   */
  private trackTextures(material: BABYLON.StandardMaterial): void {
    // Track all textures in the material
    const textures = [
      material.diffuseTexture,
      material.specularTexture,
      material.emissiveTexture,
      material.ambientTexture,
      material.bumpTexture,
      material.lightmapTexture,
      material.refractionTexture,
      material.reflectionTexture
    ];
    
    textures.forEach(texture => {
      if (texture) {
        const resourceId = this.trackResourceAsOwned(texture, ResourceType.TEXTURE, `texture_${texture.name}`);
        this.ownedResources.add(resourceId);
      }
    });
  }
  
  /**
   * Check if the mesh is ready to render
   */
  public isReady(): boolean {
    return this.mesh !== null && this.mesh.isReady() && (!this.material || this.material.isReady(this.mesh));
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
   * Apply current settings to the mesh
   */
  private applyMeshSettings(): void {
    if (!this.mesh) return;
    
    this.mesh.isPickable = this.pickable;
    this.mesh.checkCollisions = this.collisionEnabled;
    
    // Apply material if set
    if (this.material) {
      this.mesh.material = this.material;
    }
  }
  
  /**
   * Track a resource with the ResourceTracker
   * 
   * @param resource The resource to track
   * @param type The type of resource
   * @param id Optional identifier for the resource
   * @returns The resource ID
   */
  private trackResource(resource: any, type: ResourceType, id?: string): string {
    return this.resourceTracker.track(resource, {
      type,
      id,
      group: this.resourceGroup,
      metadata: {
        entityId: this.entity?.id,
        componentType: this.type,
        createdAt: Date.now()
      }
    });
  }
  
  /**
   * Track a resource as owned by this component
   * Resources tracked as "owned" will be disposed when the component is disposed
   * 
   * @param resource The resource to track
   * @param type The type of resource
   * @param id Optional identifier for the resource
   * @returns The resource ID
   */
  private trackResourceAsOwned(resource: any, type: ResourceType, id?: string): string {
    return this.resourceTracker.track(resource, {
      type,
      id,
      group: this.resourceGroup,
      metadata: {
        entityId: this.entity?.id,
        componentType: this.type,
        createdAt: Date.now(),
        isOwned: true
      }
    });
  }
  
  /**
   * Log a debug message
   * @param message The message to log
   */
  private logDebug(message: string): void {
    this.logger.debug(`[MeshComponent] ${message}`);
  }
  
  /**
   * Log a warning message
   * @param message The message to log
   */
  private logWarning(message: string): void {
    this.logger.warn(`[MeshComponent] ${message}`);
  }
  
  /**
   * Log an error message
   * @param message The message to log
   */
  private logError(message: string): void {
    this.logger.error(`[MeshComponent] ${message}`);
  }
}



