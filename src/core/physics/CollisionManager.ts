/**
 * @file src/core/physics/CollisionManager.ts
 * @description Implementation of a high-level collision management system.
 * 
 * @dependencies ICollisionManager.ts, ICollisionSystem.ts
 */

import * as BABYLON from 'babylonjs';
import { v4 as uuidv4 } from 'uuid';
import { ICollisionManager, CollisionGroupOptions, CollisionVolumeOptions, CollisionVolumeType, CollisionLayers } from './ICollisionManager';
import { ICollisionSystem, CollisionCallback, CollisionFilter } from './ICollisionSystem';
import { PhysicsSystem } from './PhysicsSystem';
import { CollisionSystem } from './CollisionSystem';

/**
 * Represents a group of collidable objects
 */
interface CollisionGroup {
  id: string;
  name: string;
  filter?: CollisionFilter;
  impostors: Set<BABYLON.PhysicsImpostor>;
}

/**
 * Default collision layers
 */
export enum DefaultCollisionLayer {
  Default = 1,        // 0000 0001
  Static = 2,         // 0000 0010
  Dynamic = 4,        // 0000 0100
  Player = 8,         // 0000 1000
  Projectile = 16,    // 0001 0000
  Trigger = 32,       // 0010 0000
  Sensor = 64,        // 0100 0000
  Terrain = 128       // 1000 0000
}

/**
 * Implements a high-level collision management system
 */
export class CollisionManager implements ICollisionManager {
  private scene: BABYLON.Scene | null = null;
  private collisionSystem: ICollisionSystem | null = null;
  private collisionGroups: Map<string, CollisionGroup> = new Map();
  private collisionHandlers: Map<string, string> = new Map();
  private triggerVolumes: Map<string, string> = new Map();
  private collisionLayersData: Map<BABYLON.PhysicsImpostor, CollisionLayers> = new Map();
  
  /**
   * Creates a new instance of the CollisionManager.
   * @param collisionSystem The collision system to use (optional, will create a new one if not provided)
   */
  constructor(collisionSystem?: ICollisionSystem) {
    this.collisionSystem = collisionSystem || null;
    this.collisionGroups = new Map();
    this.collisionHandlers = new Map();
    this.triggerVolumes = new Map();
    this.collisionLayersData = new Map();
  }
  
  /**
   * Initializes the collision manager.
   * @param scene The Babylon.js scene
   */
  public initialize(scene: BABYLON.Scene): void {
    this.scene = scene;
    if (!this.scene.getPhysicsEngine()) {
      console.warn("CollisionManager: Physics engine is not initialized in the scene. Collisions will not work.");
    }
    
    // Create and initialize a collision system if we don't have one
    if (!this.collisionSystem) {
      const physicsSystem = new PhysicsSystem();
      physicsSystem.initialize(scene);
      
      this.collisionSystem = new CollisionSystem();
      this.collisionSystem.initialize(physicsSystem);
    } else {
      // If we already have a collision system, just reinitialize it
      const physicsSystem = new PhysicsSystem();
      physicsSystem.initialize(scene);
      this.collisionSystem.initialize(physicsSystem);
    }
    
    // Create default collision groups
    this.createCollisionGroup({ name: 'default' });
    this.createCollisionGroup({ name: 'static' });
    this.createCollisionGroup({ name: 'dynamic' });
    this.createCollisionGroup({ name: 'triggers' });
    
    console.log("CollisionManager initialized");
  }
  
  /**
   * Updates the collision system.
   * @param deltaTime Time elapsed since the last update
   */
  public update(deltaTime: number): void {
    if (this.collisionSystem) {
      this.collisionSystem.update(deltaTime);
    }
  }
  
  /**
   * Creates a collision group for easier management of related objects.
   * @param options Configuration options for the collision group
   * @returns The collision group ID
   */
  public createCollisionGroup(options: CollisionGroupOptions): string {
    const id = uuidv4();
    
    this.collisionGroups.set(id, {
      id,
      name: options.name,
      filter: options.filter,
      impostors: new Set()
    });
    
    return id;
  }
  
  /**
   * Gets a collision group by its ID.
   * @param groupId The ID of the collision group
   * @returns The collision group, or undefined if not found
   */
  private getCollisionGroup(groupId: string): CollisionGroup | undefined {
    return this.collisionGroups.get(groupId);
  }
  
  /**
   * Gets a collision group by its name.
   * @param name The name of the collision group
   * @returns The collision group, or undefined if not found
   */
  private getCollisionGroupByName(name: string): CollisionGroup | undefined {
    for (const group of this.collisionGroups.values()) {
      if (group.name === name) {
        return group;
      }
    }
    return undefined;
  }
  
  /**
   * Adds a physics impostor to a collision group.
   * @param groupId The ID of the collision group
   * @param impostor The physics impostor to add
   */
  public addToCollisionGroup(groupId: string, impostor: BABYLON.PhysicsImpostor): void {
    const group = this.getCollisionGroup(groupId);
    if (group) {
      group.impostors.add(impostor);
    } else {
      console.warn(`CollisionManager: Group with ID ${groupId} not found`);
    }
  }
  
  /**
   * Removes a physics impostor from a collision group.
   * @param groupId The ID of the collision group
   * @param impostor The physics impostor to remove
   */
  public removeFromCollisionGroup(groupId: string, impostor: BABYLON.PhysicsImpostor): void {
    const group = this.getCollisionGroup(groupId);
    if (group) {
      group.impostors.delete(impostor);
    } else {
      console.warn(`CollisionManager: Group with ID ${groupId} not found`);
    }
  }
  
  /**
   * Creates a collision volume for an object.
   * @param mesh The mesh to attach the collision volume to
   * @param options Configuration options for the collision volume
   * @returns The physics impostor for the collision volume
   */
  public createCollisionVolume(
    mesh: BABYLON.AbstractMesh,
    options: CollisionVolumeOptions
  ): BABYLON.PhysicsImpostor {
    if (!this.scene) {
      throw new Error("CollisionManager: Must initialize before creating collision volumes");
    }
    
    // Create the collision shape
    let collisionMesh: BABYLON.AbstractMesh;
    
    if (options.type === CollisionVolumeType.Custom) {
      // Use existing mesh for collision
      collisionMesh = mesh;
    } else {
      // Create a new primitive for collision
      collisionMesh = this.createCollisionMesh(options);
      
      // Position and parent the collision mesh
      if (options.position) {
        collisionMesh.position = options.position;
      }
      
      if (options.rotation) {
        collisionMesh.rotation = options.rotation;
      }
      
      // Make it a child of the original mesh
      collisionMesh.parent = mesh;
      
      // Make it invisible
      collisionMesh.isVisible = false;
    }
    
    // Add tags to the mesh if specified
    if (options.tags && options.tags.length > 0) {
      if (!collisionMesh.metadata) {
        collisionMesh.metadata = {};
      }
      collisionMesh.metadata.tags = options.tags;
    }
    
    // Create the physics impostor
    const impostorType = this.getImpostorTypeForCollisionVolume(options.type);
    const impostor = new BABYLON.PhysicsImpostor(
      collisionMesh,
      impostorType,
      { mass: options.isTrigger ? 0 : 1, friction: 0.5, restitution: 0.3 },
      this.scene
    );
    
    // Add to the appropriate group
    const groupName = options.isTrigger ? 'triggers' : 'default';
    const group = this.getCollisionGroupByName(groupName);
    if (group) {
      this.addToCollisionGroup(group.id, impostor);
    }
    
    return impostor;
  }
  
  /**
   * Creates a mesh for collision based on the volume type.
   */
  private createCollisionMesh(options: CollisionVolumeOptions): BABYLON.AbstractMesh {
    if (!this.scene) {
      throw new Error("CollisionManager: Scene is not initialized");
    }
    
    let collisionMesh: BABYLON.AbstractMesh;
    
    switch (options.type) {
      case CollisionVolumeType.Box:
        const boxParams = options.parameters as { width: number, height: number, depth: number };
        collisionMesh = BABYLON.MeshBuilder.CreateBox(
          `collision_box_${uuidv4()}`,
          { width: boxParams.width, height: boxParams.height, depth: boxParams.depth },
          this.scene
        );
        break;
        
      case CollisionVolumeType.Sphere:
        const sphereParams = options.parameters as { radius: number };
        collisionMesh = BABYLON.MeshBuilder.CreateSphere(
          `collision_sphere_${uuidv4()}`,
          { diameter: sphereParams.radius * 2 },
          this.scene
        );
        break;
        
      case CollisionVolumeType.Cylinder:
        const cylinderParams = options.parameters as { height: number, radius: number };
        collisionMesh = BABYLON.MeshBuilder.CreateCylinder(
          `collision_cylinder_${uuidv4()}`,
          { height: cylinderParams.height, diameter: cylinderParams.radius * 2 },
          this.scene
        );
        break;
        
      case CollisionVolumeType.Capsule:
        // BabylonJS doesn't have a built-in capsule, so we'll create one from a cylinder and two hemispheres
        const capsuleParams = options.parameters as { height: number, radius: number };
        
        // Create the cylinder for the middle part
        const capsuleCylinder = BABYLON.MeshBuilder.CreateCylinder(
          `collision_capsule_cylinder_${uuidv4()}`,
          { height: capsuleParams.height, diameter: capsuleParams.radius * 2 },
          this.scene
        );
        
        // Create two spheres for the ends
        const topSphere = BABYLON.MeshBuilder.CreateSphere(
          `collision_capsule_top_${uuidv4()}`,
          { diameter: capsuleParams.radius * 2 },
          this.scene
        );
        topSphere.position.y = capsuleParams.height / 2;
        
        const bottomSphere = BABYLON.MeshBuilder.CreateSphere(
          `collision_capsule_bottom_${uuidv4()}`,
          { diameter: capsuleParams.radius * 2 },
          this.scene
        );
        bottomSphere.position.y = -capsuleParams.height / 2;
        
        // Merge into one mesh
        const capsuleMeshes = [capsuleCylinder, topSphere, bottomSphere];
        const capsuleMerged = BABYLON.Mesh.MergeMeshes(
          capsuleMeshes as BABYLON.Mesh[],
          true,
          true,
          undefined,
          false,
          true
        );
        
        if (!capsuleMerged) {
          throw new Error("CollisionManager: Failed to create capsule mesh");
        }
        
        collisionMesh = capsuleMerged;
        break;
        
      default:
        throw new Error(`CollisionManager: Unsupported collision volume type: ${options.type}`);
    }
    
    return collisionMesh;
  }
  
  /**
   * Maps CollisionVolumeType to BABYLON.PhysicsImpostor type.
   */
  private getImpostorTypeForCollisionVolume(volumeType: CollisionVolumeType): number {
    switch (volumeType) {
      case CollisionVolumeType.Box:
        return BABYLON.PhysicsImpostor.BoxImpostor;
      case CollisionVolumeType.Sphere:
        return BABYLON.PhysicsImpostor.SphereImpostor;
      case CollisionVolumeType.Cylinder:
        return BABYLON.PhysicsImpostor.CylinderImpostor;
      case CollisionVolumeType.Capsule:
        // Some physics engines support capsules directly, but for compatibility, use a convex hull
        return BABYLON.PhysicsImpostor.ConvexHullImpostor;
      case CollisionVolumeType.Custom:
        return BABYLON.PhysicsImpostor.MeshImpostor;
      default:
        return BABYLON.PhysicsImpostor.BoxImpostor;
    }
  }
  
  /**
   * Creates a trigger volume that detects when objects enter or exit.
   * @param mesh The mesh to use as the trigger volume
   * @param options Configuration options for the trigger
   * @param onEnter Callback when an object enters the trigger
   * @param onExit Callback when an object exits the trigger
   * @param onStay Callback when an object stays inside the trigger
   * @returns The ID of the trigger for later reference
   */
  public createTriggerVolume(
    mesh: BABYLON.AbstractMesh,
    options: CollisionVolumeOptions,
    onEnter?: CollisionCallback,
    onExit?: CollisionCallback,
    onStay?: CollisionCallback
  ): string {
    if (!this.collisionSystem) {
      throw new Error("CollisionManager: Collision system not initialized");
    }
    
    // Ensure the options are set for a trigger
    const triggerOptions: CollisionVolumeOptions = {
      ...options,
      isTrigger: true
    };
    
    // Create the collision volume
    const impostor = this.createCollisionVolume(mesh, triggerOptions);
    
    // Create a filter based on the options
    const filter: CollisionFilter = {};
    if (triggerOptions.tags) {
      filter.includeTags = triggerOptions.tags;
    }
    
    // Register the trigger with the collision system
    const triggerId = this.collisionSystem.registerTriggerZone(
      impostor,
      filter,
      onEnter,
      onExit,
      onStay
    );
    
    // Track the trigger
    this.triggerVolumes.set(triggerId, triggerId);
    
    return triggerId;
  }
  
  /**
   * Sets up collision between two groups.
   * @param group1Id The ID of the first collision group
   * @param group2Id The ID of the second collision group
   * @param callback The callback to call when collision occurs
   * @returns The ID of the collision handler
   */
  public setupCollisionBetweenGroups(
    group1Id: string,
    group2Id: string,
    callback: CollisionCallback
  ): string {
    if (!this.collisionSystem) {
      throw new Error("CollisionManager: Collision system not initialized");
    }
    
    const group1 = this.getCollisionGroup(group1Id);
    const group2 = this.getCollisionGroup(group2Id);
    
    if (!group1 || !group2) {
      throw new Error("CollisionManager: One or both collision groups not found");
    }
    
    // Convert Sets to arrays for compatibility with the collision system
    const impostors1 = Array.from(group1.impostors);
    const impostors2 = Array.from(group2.impostors);
    
    // Register collision handlers for all combinations
    const handlerId = this.collisionSystem.registerCollisionHandler(
      impostors1,
      impostors2,
      callback
    );
    
    this.collisionHandlers.set(handlerId, handlerId);
    
    return handlerId;
  }
  
  /**
   * Sets up collision detection for a single object against a group.
   * @param impostor The physics impostor to check for collisions
   * @param groupId The ID of the collision group to check against
   * @param callback The callback to call when collision occurs
   * @returns The ID of the collision handler
   */
  public setupCollisionWithGroup(
    impostor: BABYLON.PhysicsImpostor,
    groupId: string,
    callback: CollisionCallback
  ): string {
    if (!this.collisionSystem) {
      throw new Error("CollisionManager: Collision system not initialized");
    }
    
    const group = this.getCollisionGroup(groupId);
    
    if (!group) {
      throw new Error(`CollisionManager: Collision group with ID ${groupId} not found`);
    }
    
    // Convert Set to array for compatibility with the collision system
    const groupImpostors = Array.from(group.impostors);
    
    // Register the collision handler
    const handlerId = this.collisionSystem.registerCollisionHandler(
      impostor,
      groupImpostors,
      callback
    );
    
    this.collisionHandlers.set(handlerId, handlerId);
    
    return handlerId;
  }
  
  /**
   * Sets collision layers for filtering collisions.
   * @param impostor The physics impostor to set layers for
   * @param layers Collision layer settings
   */
  public setCollisionLayers(impostor: BABYLON.PhysicsImpostor, layers: CollisionLayers): void {
    this.collisionLayersData.set(impostor, layers);
    
    // Apply layer filtering to the native physics body if possible
    impostor.executeNativeFunction((physicsBody) => {
      if (physicsBody.setCollisionFilterGroup && typeof physicsBody.setCollisionFilterGroup === 'function') {
        physicsBody.setCollisionFilterGroup(layers.layer);
      }
      
      if (physicsBody.setCollisionFilterMask && typeof physicsBody.setCollisionFilterMask === 'function') {
        physicsBody.setCollisionFilterMask(layers.mask);
      }
    });
  }
  
  /**
   * Performs a raycast against collidable objects.
   * @param from Starting point of the ray
   * @param to End point of the ray
   * @param filter Optional filter for ray cast results
   * @returns Information about the nearest hit, or null if no hit
   */
  public raycast(
    from: BABYLON.Vector3,
    to: BABYLON.Vector3,
    filter?: CollisionFilter
  ): BABYLON.PhysicsRaycastResult | null {
    if (!this.collisionSystem) {
      throw new Error("CollisionManager: Collision system not initialized");
    }
    
    return this.collisionSystem.raycast(from, to, filter);
  }
  
  /**
   * Performs a sphere cast (a raycast with thickness).
   * @param from Starting point of the ray
   * @param to End point of the ray
   * @param radius Radius of the sphere
   * @param filter Optional filter for ray cast results
   * @returns Information about the nearest hit, or null if no hit
   */
  public sphereCast(
    from: BABYLON.Vector3,
    to: BABYLON.Vector3,
    radius: number,
    filter?: CollisionFilter
  ): BABYLON.PhysicsRaycastResult | null {
    if (!this.scene) {
      throw new Error("CollisionManager: Scene is not initialized");
    }
    
    if (!this.collisionSystem) {
      throw new Error("CollisionManager: Collision system not initialized");
    }
    
    // Create a temporary sphere for collision testing
    const sphere = BABYLON.MeshBuilder.CreateSphere(
      `spherecast_${uuidv4()}`,
      { diameter: radius * 2 },
      this.scene
    );
    sphere.isVisible = false;
    
    // Create a physics impostor for the sphere
    const impostor = new BABYLON.PhysicsImpostor(
      sphere,
      BABYLON.PhysicsImpostor.SphereImpostor,
      { mass: 0 },
      this.scene
    );
    
    const result = this.overlapTest(from, {
      type: CollisionVolumeType.Sphere,
      parameters: { radius },
      position: from,
    }, filter);
    
    if (result.length > 0) {
      // Cleanup
      impostor.dispose();
      sphere.dispose();
      
      // Return a result with the closest hit
      const nearestHit = result[0];
      const hitPoint = this.estimateCollisionPoint(
        impostor,
        nearestHit
      );
      
      // Create a raycast-like result
      const raycastResult = {
        hit: true,
        distance: BABYLON.Vector3.Distance(from, hitPoint),
        pickedPoint: hitPoint,
        pickedMesh: nearestHit.object as BABYLON.AbstractMesh,
        physicsImpostor: nearestHit
      } as any; // Cast to any as we're creating a custom result
      
      return raycastResult;
    }
    
    // No hit, perform a regular raycast
    const raycastResult = this.collisionSystem.raycast(from, to, filter);
    
    // Cleanup
    impostor.dispose();
    sphere.dispose();
    
    return raycastResult;
  }
  
  /**
   * Estimates the point of collision between two physics impostors.
   */
  private estimateCollisionPoint(
    objectA: BABYLON.PhysicsImpostor,
    objectB: BABYLON.PhysicsImpostor
  ): BABYLON.Vector3 {
    if (!objectA.object || !objectB.object) {
      return new BABYLON.Vector3(0, 0, 0);
    }
    
    const meshA = objectA.object as BABYLON.AbstractMesh;
    const meshB = objectB.object as BABYLON.AbstractMesh;
    
    // Calculate center points
    const centerA = meshA.getBoundingInfo().boundingBox.centerWorld;
    const centerB = meshB.getBoundingInfo().boundingBox.centerWorld;
    
    // Return the midpoint as an estimate
    return BABYLON.Vector3.Center(centerA, centerB);
  }
  
  /**
   * Checks which objects overlap with a specific volume.
   * @param position Center of the check
   * @param volume Type and size of the volume to check
   * @param filter Optional filter for results
   * @returns Array of physics impostors that overlap with the volume
   */
  public overlapTest(
    position: BABYLON.Vector3,
    volume: CollisionVolumeOptions,
    filter?: CollisionFilter
  ): BABYLON.PhysicsImpostor[] {
    if (!this.scene) {
      throw new Error("CollisionManager: Scene is not initialized");
    }
    
    if (!this.collisionSystem) {
      throw new Error("CollisionManager: Collision system not initialized");
    }
    
    // Create a temporary mesh for collision testing
    const collisionMesh = this.createCollisionMesh(volume);
    collisionMesh.position = position;
    collisionMesh.isVisible = false;
    
    // Create a physics impostor for the collision volume
    const impostor = new BABYLON.PhysicsImpostor(
      collisionMesh,
      this.getImpostorTypeForCollisionVolume(volume.type),
      { mass: 0 },
      this.scene
    );
    
    // Get all physics impostors in the scene
    const physicsEngine = this.scene.getPhysicsEngine();
    if (!physicsEngine) {
      return [];
    }
    
    const impostors: BABYLON.PhysicsImpostor[] = [];
    
    // Check for overlaps against all other impostors
    for (const group of this.collisionGroups.values()) {
      for (const otherImpostor of group.impostors) {
        // Skip self
        if (otherImpostor === impostor) continue;
        
        // Apply filter if provided
        if (filter && !this.passesFilter(otherImpostor, filter)) continue;
        
        // Check for overlap
        if (this.collisionSystem.areColliding(impostor, otherImpostor)) {
          impostors.push(otherImpostor);
        }
      }
    }
    
    // Cleanup
    impostor.dispose();
    collisionMesh.dispose();
    
    return impostors;
  }
  
  /**
   * Checks if an impostor passes the given filter.
   */
  private passesFilter(impostor: BABYLON.PhysicsImpostor, filter: CollisionFilter): boolean {
    if (!this.collisionSystem) {
      return false;
    }
    
    // Check layers if we have layer data
    const layers = this.collisionLayersData.get(impostor);
    if (layers && impostor.physicsBody) {
      // First, check if this impostor's layer is in the filter mask
      // Access metadata safely
      const meshObject = impostor.object as BABYLON.AbstractMesh;
      const filterGroup = meshObject?.metadata?.filterGroup;
      if (filterGroup && (filterGroup & layers.mask) === 0) {
        return false;
      }
    }
    
    // Delegate to the collision system
    return true;
  }
  
  /**
   * Cancels a collision handler.
   * @param id The ID of the collision handler to cancel
   */
  public removeCollisionHandler(id: string): void {
    if (!this.collisionSystem) {
      return;
    }
    
    const handlerId = this.collisionHandlers.get(id);
    if (handlerId) {
      this.collisionSystem.unregisterCollisionHandler(handlerId);
      this.collisionHandlers.delete(id);
    }
  }
  
  /**
   * Removes a trigger volume.
   * @param id The ID of the trigger to remove
   */
  public removeTriggerVolume(id: string): void {
    if (!this.collisionSystem) {
      return;
    }
    
    const triggerId = this.triggerVolumes.get(id);
    if (triggerId) {
      this.collisionSystem.unregisterTriggerZone(triggerId);
      this.triggerVolumes.delete(id);
    }
  }
  
  /**
   * Cleans up all collision resources.
   */
  public dispose(): void {
    // Cancel all collision handlers
    for (const id of this.collisionHandlers.keys()) {
      this.removeCollisionHandler(id);
    }
    
    // Remove all trigger volumes
    for (const id of this.triggerVolumes.keys()) {
      this.removeTriggerVolume(id);
    }
    
    // Clear all data structures
    this.collisionGroups.clear();
    this.collisionHandlers.clear();
    this.triggerVolumes.clear();
    this.collisionLayersData.clear();
    
    // Dispose the collision system
    if (this.collisionSystem) {
      this.collisionSystem.dispose();
      this.collisionSystem = null;
    }
    
    this.scene = null;
    
    console.log("CollisionManager disposed");
  }
}

