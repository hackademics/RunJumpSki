/**
 * @file src/core/physics/CollisionSystem.ts
 * @description Handles collision detection and response within the physics simulation.
 * 
 * @dependencies ICollisionSystem.ts, IPhysicsSystem.ts
 * @relatedFiles ICollisionSystem.ts, PhysicsSystem.ts
 */

import * as BABYLON from 'babylonjs';
import { v4 as uuidv4 } from 'uuid';
import { ICollisionSystem, CollisionInfo, CollisionCallback, CollisionFilter } from './ICollisionSystem';
import { IPhysicsSystem } from './IPhysicsSystem';

/**
 * A structure to store collision handler information
 */
interface CollisionHandler {
  id: string;
  objectA: BABYLON.PhysicsImpostor | BABYLON.PhysicsImpostor[];
  objectB: BABYLON.PhysicsImpostor | BABYLON.PhysicsImpostor[] | null;
  callback: CollisionCallback;
}

/**
 * A structure to store trigger zone information
 */
interface TriggerZone {
  id: string;
  triggerVolume: BABYLON.PhysicsImpostor;
  filter: CollisionFilter | undefined;
  onEnter: CollisionCallback | undefined;
  onExit: CollisionCallback | undefined;
  onStay: CollisionCallback | undefined;
  objectsInside: Set<BABYLON.PhysicsImpostor>;
}

/**
 * Implementation of the CollisionSystem interface for handling physics-based collisions.
 */
export class CollisionSystem implements ICollisionSystem {
  private physicsSystem: IPhysicsSystem | null = null;
  private collisionHandlers: Map<string, CollisionHandler> = new Map();
  private triggerZones: Map<string, TriggerZone> = new Map();
  private activeCollisions: Set<string> = new Set();
  
  /**
   * Creates a new instance of the CollisionSystem.
   */
  constructor() {
    this.collisionHandlers = new Map();
    this.triggerZones = new Map();
    this.activeCollisions = new Set();
  }
  
  /**
   * Initializes the collision system with a physics system.
   * @param physicsSystem - The physics system to use for collision detection
   */
  public initialize(physicsSystem: IPhysicsSystem): void {
    this.physicsSystem = physicsSystem;
    this.collisionHandlers.clear();
    this.triggerZones.clear();
    this.activeCollisions.clear();
    
    console.log("CollisionSystem initialized with physics system");
  }
  
  /**
   * Updates collision detection and response.
   * @param deltaTime - Time elapsed since the last update
   */
  public update(deltaTime: number): void {
    if (!this.physicsSystem) {
      console.warn("CollisionSystem update called but physics system is not initialized");
      return;
    }
    
    // Process trigger zones
    this.updateTriggerZones();
    
    // Process collision callbacks (handled by BabylonJS physics engine)
  }
  
  /**
   * Registers a callback to be called when the specified objects collide.
   * @param objectA - First collision object or group
   * @param objectB - Second collision object or group (optional, any object if not specified)
   * @param callback - Function to call when collision occurs
   * @returns ID that can be used to unregister the callback
   */
  public registerCollisionHandler(
    objectA: BABYLON.PhysicsImpostor | BABYLON.PhysicsImpostor[],
    objectB: BABYLON.PhysicsImpostor | BABYLON.PhysicsImpostor[] | null,
    callback: CollisionCallback
  ): string {
    if (!this.physicsSystem) {
      throw new Error("Cannot register collision handler: physics system is not initialized");
    }
    
    const id = uuidv4();
    
    this.collisionHandlers.set(id, {
      id,
      objectA,
      objectB,
      callback
    });
    
    // Handle arrays of impostors
    if (Array.isArray(objectA)) {
      for (const impostor of objectA) {
        this.registerBabylonCollision(impostor, objectB, callback);
      }
    } else {
      this.registerBabylonCollision(objectA, objectB, callback);
    }
    
    return id;
  }
  
  /**
   * Registers a Babylon.js collision handler between objects.
   */
  private registerBabylonCollision(
    objectA: BABYLON.PhysicsImpostor,
    objectB: BABYLON.PhysicsImpostor | BABYLON.PhysicsImpostor[] | null,
    callback: CollisionCallback
  ): void {
    // If objectB is an array, register each individually
    if (Array.isArray(objectB)) {
      for (const impostor of objectB) {
        this.registerBabylonCollision(objectA, impostor, callback);
      }
      return;
    }
    
    // If objectB is null, register with any object
    if (objectB === null) {
      objectA.registerOnPhysicsCollide([], (collider, collidedWith) => {
        callback({
          initiator: collider,
          collider: collidedWith,
          point: new BABYLON.Vector3(0, 0, 0), // Estimated collision point
          normal: new BABYLON.Vector3(0, 1, 0), // Estimated collision normal
          impulse: 0 // Estimated collision impulse
        });
      });
    } else {
      // Register specific collision between two objects
      this.physicsSystem?.registerOnCollide(objectA, objectB, (collider, collidedWith) => {
        callback({
          initiator: collider,
          collider: collidedWith,
          point: new BABYLON.Vector3(0, 0, 0), // Estimated collision point
          normal: new BABYLON.Vector3(0, 1, 0), // Estimated collision normal
          impulse: 0 // Estimated collision impulse
        });
      });
    }
  }
  
  /**
   * Unregisters a collision callback.
   * @param id - ID of the callback to unregister
   */
  public unregisterCollisionHandler(id: string): void {
    if (!this.collisionHandlers.has(id)) {
      console.warn(`Collision handler with ID ${id} not found`);
      return;
    }
    
    // Remove from our tracking
    this.collisionHandlers.delete(id);
  }
  
  /**
   * Registers a trigger zone that fires when objects enter/exit/stay in a specific area.
   * @param triggerVolume - The physics impostor that acts as the trigger volume
   * @param filter - Optional filter to include/exclude specific objects
   * @param onEnter - Callback when an object enters the trigger
   * @param onExit - Callback when an object exits the trigger
   * @param onStay - Callback when an object stays inside the trigger
   * @returns ID that can be used to unregister the trigger
   */
  public registerTriggerZone(
    triggerVolume: BABYLON.PhysicsImpostor,
    filter?: CollisionFilter,
    onEnter?: CollisionCallback,
    onExit?: CollisionCallback,
    onStay?: CollisionCallback
  ): string {
    if (!this.physicsSystem) {
      throw new Error("Cannot register trigger zone: physics system is not initialized");
    }
    
    // Configure the trigger volume for trigger behavior (no interaction)
    if (triggerVolume.physicsBody) {
      // Set as trigger (implementation may vary based on physics engine)
      triggerVolume.executeNativeFunction((physicsBody) => {
        if (physicsBody.setTrigger && typeof physicsBody.setTrigger === 'function') {
          physicsBody.setTrigger(true);
        } else if (physicsBody.isTrigger !== undefined) {
          physicsBody.isTrigger = true;
        }
      });
    }
    
    const id = uuidv4();
    
    this.triggerZones.set(id, {
      id,
      triggerVolume,
      filter,
      onEnter,
      onExit,
      onStay,
      objectsInside: new Set()
    });
    
    return id;
  }
  
  /**
   * Unregisters a trigger zone.
   * @param id - ID of the trigger to unregister
   */
  public unregisterTriggerZone(id: string): void {
    if (!this.triggerZones.has(id)) {
      console.warn(`Trigger zone with ID ${id} not found`);
      return;
    }
    
    this.triggerZones.delete(id);
  }
  
  /**
   * Updates the state of all trigger zones.
   */
  private updateTriggerZones(): void {
    if (!this.physicsSystem) return;
    
    // Get physics engine to query for collisions
    const physicsEngine = this.physicsSystem.getPhysicsEngine();
    if (!physicsEngine) return;
    
    // For each trigger zone
    for (const [id, triggerZone] of this.triggerZones.entries()) {
      const currentlyInside = new Set<BABYLON.PhysicsImpostor>();
      
      // Check all physics impostors in the scene that might be colliding with trigger
      const impostorsToCheck = this.getAllImpostors(physicsEngine);
      
      for (const impostor of impostorsToCheck) {
        // Skip self-collision
        if (impostor === triggerZone.triggerVolume) continue;
        
        // Apply filter if it exists
        if (triggerZone.filter && !this.passesFilter(impostor, triggerZone.filter)) continue;
        
        // Check if the impostor is colliding with the trigger volume
        if (this.areColliding(triggerZone.triggerVolume, impostor)) {
          currentlyInside.add(impostor);
          
          // If this is a new entry, fire the onEnter callback
          if (!triggerZone.objectsInside.has(impostor) && triggerZone.onEnter) {
            triggerZone.onEnter({
              initiator: triggerZone.triggerVolume,
              collider: impostor,
              point: this.estimateCollisionPoint(triggerZone.triggerVolume, impostor),
              normal: new BABYLON.Vector3(0, 1, 0), // Estimated collision normal
              impulse: 0 // No impulse for triggers
            });
          }
          
          // If object was already inside, fire the onStay callback
          else if (triggerZone.objectsInside.has(impostor) && triggerZone.onStay) {
            triggerZone.onStay({
              initiator: triggerZone.triggerVolume,
              collider: impostor,
              point: this.estimateCollisionPoint(triggerZone.triggerVolume, impostor),
              normal: new BABYLON.Vector3(0, 1, 0), // Estimated collision normal
              impulse: 0 // No impulse for triggers
            });
          }
        }
      }
      
      // Check for objects that have exited the trigger
      for (const impostor of triggerZone.objectsInside) {
        if (!currentlyInside.has(impostor) && triggerZone.onExit) {
          triggerZone.onExit({
            initiator: triggerZone.triggerVolume,
            collider: impostor,
            point: this.estimateCollisionPoint(triggerZone.triggerVolume, impostor),
            normal: new BABYLON.Vector3(0, 1, 0), // Estimated collision normal
            impulse: 0 // No impulse for triggers
          });
        }
      }
      
      // Update the list of objects inside the trigger
      triggerZone.objectsInside = currentlyInside;
    }
  }
  
  /**
   * Gets all physics impostors in the scene.
   */
  private getAllImpostors(physicsEngine: any): BABYLON.PhysicsImpostor[] {
    // This is a simplified implementation that would need to be adapted for the actual physics engine being used
    const impostors: BABYLON.PhysicsImpostor[] = [];
    
    // If the physics engine exposes impostors, use them
    if (physicsEngine._impostors) {
      return Array.from(physicsEngine._impostors);
    }
    
    // Otherwise, we can't get the impostors - this would need to be fixed for a proper implementation
    return impostors;
  }
  
  /**
   * Checks if an impostor passes the given filter.
   */
  private passesFilter(impostor: BABYLON.PhysicsImpostor, filter: CollisionFilter): boolean {
    // Get the tags from the object (might be attached to the mesh)
    const object = impostor.object as BABYLON.AbstractMesh;
    const tags: string[] = [];
    
    // AbstractMesh doesn't have getTags directly, but might have a userTags property
    if (object.metadata && object.metadata.tags) {
      tags.push(...object.metadata.tags);
    }
    
    // Check include tags
    if (filter.includeTags && filter.includeTags.length > 0) {
      if (!filter.includeTags.some(tag => tags.includes(tag))) {
        return false;
      }
    }
    
    // Check exclude tags
    if (filter.excludeTags && filter.excludeTags.length > 0) {
      if (filter.excludeTags.some(tag => tags.includes(tag))) {
        return false;
      }
    }
    
    // Check filter function
    if (filter.filterFunction && !filter.filterFunction(impostor)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Checks if two physics impostors are colliding.
   * @param objectA - First physics impostor
   * @param objectB - Second physics impostor
   * @returns True if the objects are colliding
   */
  public areColliding(objectA: BABYLON.PhysicsImpostor, objectB: BABYLON.PhysicsImpostor): boolean {
    // Implementation depends on the physics engine
    // For now, we'll use a simple bounding box overlap check as an estimate
    if (!objectA.object || !objectB.object) return false;
    
    const meshA = objectA.object as BABYLON.AbstractMesh;
    const meshB = objectB.object as BABYLON.AbstractMesh;
    
    // Use bounding box intersection - BabylonJS method might differ based on version
    const boxA = meshA.getBoundingInfo().boundingBox;
    const boxB = meshB.getBoundingInfo().boundingBox;
    
    // Manually check if boxes intersect using their min and max points
    return !(
      boxA.maximumWorld.x < boxB.minimumWorld.x ||
      boxA.minimumWorld.x > boxB.maximumWorld.x ||
      boxA.maximumWorld.y < boxB.minimumWorld.y ||
      boxA.minimumWorld.y > boxB.maximumWorld.y ||
      boxA.maximumWorld.z < boxB.minimumWorld.z ||
      boxA.minimumWorld.z > boxB.maximumWorld.z
    );
  }
  
  /**
   * Estimates the point of collision between two objects.
   */
  private estimateCollisionPoint(objectA: BABYLON.PhysicsImpostor, objectB: BABYLON.PhysicsImpostor): BABYLON.Vector3 {
    // Simplified implementation - in reality, we should get this from the physics engine
    if (!objectA.object || !objectB.object) return new BABYLON.Vector3(0, 0, 0);
    
    const meshA = objectA.object as BABYLON.AbstractMesh;
    const meshB = objectB.object as BABYLON.AbstractMesh;
    
    // Calculate center points
    const centerA = meshA.getBoundingInfo().boundingBox.centerWorld;
    const centerB = meshB.getBoundingInfo().boundingBox.centerWorld;
    
    // Return the midpoint as an estimate
    return BABYLON.Vector3.Center(centerA, centerB);
  }
  
  /**
   * Performs a ray cast to check for collisions.
   * @param from - Starting point of the ray
   * @param to - End point of the ray
   * @param filter - Optional filter for ray cast results
   * @returns Information about the nearest hit, or null if no hit
   */
  public raycast(
    from: BABYLON.Vector3,
    to: BABYLON.Vector3,
    filter?: CollisionFilter
  ): BABYLON.PhysicsRaycastResult | null {
    if (!this.physicsSystem) {
      throw new Error("Cannot perform raycast: physics system is not initialized");
    }
    
    const physicsEngine = this.physicsSystem.getPhysicsEngine();
    if (!physicsEngine) return null;
    
    // Direction and distance
    const direction = to.subtract(from).normalize();
    const distance = BABYLON.Vector3.Distance(from, to);
    
    // Perform the raycast
    if (physicsEngine.raycast) {
      const hit = physicsEngine.raycast(from, direction, distance);
      
      // If we have a hit and a filter, check if it passes
      if (hit && hit.hasHit && filter && hit.body) {
        const impostor = hit.body.physicsImpostor;
        if (impostor && !this.passesFilter(impostor, filter)) {
          return null;
        }
      }
      
      return hit;
    }
    
    // Fall back to Babylon's scene raycast (not physics-based!)
    console.warn("Physics engine does not support raycast, falling back to mesh-based raycast");
    
    return null;
  }
  
  /**
   * Destroys the collision system and cleans up resources.
   */
  public dispose(): void {
    // Clear all collision handlers
    this.collisionHandlers.clear();
    
    // Clear all trigger zones
    this.triggerZones.clear();
    
    // Clear active collisions
    this.activeCollisions.clear();
    
    this.physicsSystem = null;
    
    console.log("CollisionSystem destroyed");
  }
}

