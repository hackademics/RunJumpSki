/**
 * @file src/core/physics/ICollisionSystem.ts
 * @description Interface for the CollisionSystem.
 */

import * as BABYLON from 'babylonjs';
import { IPhysicsSystem } from './IPhysicsSystem';

/**
 * Describes collision data passed to callbacks
 */
export interface CollisionInfo {
  /**
   * The impostor that initiated the collision
   */
  initiator: BABYLON.PhysicsImpostor;
  
  /**
   * The impostor that was collided with
   */
  collider: BABYLON.PhysicsImpostor;
  
  /**
   * The estimated point of collision
   */
  point: BABYLON.Vector3;
  
  /**
   * The collision normal
   */
  normal: BABYLON.Vector3;
  
  /**
   * Estimated impulse of the collision
   */
  impulse: number;
}

/**
 * Callback for collision events
 */
export type CollisionCallback = (collisionInfo: CollisionInfo) => void;

/**
 * Defines collision filters for including/excluding specific objects in collision detection
 */
export interface CollisionFilter {
  /**
   * List of object tags to include in collision detection
   */
  includeTags?: string[];
  
  /**
   * List of object tags to exclude from collision detection
   */
  excludeTags?: string[];
  
  /**
   * Filter function for custom collision filtering
   */
  filterFunction?: (impostor: BABYLON.PhysicsImpostor) => boolean;
}

export interface ICollisionSystem {
  /**
   * Initializes the collision system.
   * @param physicsSystem - The physics system to use for collision detection
   */
  initialize(physicsSystem: IPhysicsSystem): void;
  
  /**
   * Updates collision detection and response.
   * @param deltaTime - Time elapsed since the last update
   */
  update(deltaTime: number): void;
  
  /**
   * Registers a callback to be called when the specified objects collide.
   * @param objectA - First collision object or group
   * @param objectB - Second collision object or group (optional, any object if not specified)
   * @param callback - Function to call when collision occurs
   * @returns ID that can be used to unregister the callback
   */
  registerCollisionHandler(
    objectA: BABYLON.PhysicsImpostor | BABYLON.PhysicsImpostor[],
    objectB: BABYLON.PhysicsImpostor | BABYLON.PhysicsImpostor[] | null,
    callback: CollisionCallback
  ): string;
  
  /**
   * Unregisters a collision callback.
   * @param id - ID of the callback to unregister
   */
  unregisterCollisionHandler(id: string): void;
  
  /**
   * Registers a trigger zone that fires when objects enter/exit/stay in a specific area.
   * @param triggerVolume - The physics impostor that acts as the trigger volume
   * @param filter - Optional filter to include/exclude specific objects
   * @param onEnter - Callback when an object enters the trigger
   * @param onExit - Callback when an object exits the trigger
   * @param onStay - Callback when an object stays inside the trigger
   * @returns ID that can be used to unregister the trigger
   */
  registerTriggerZone(
    triggerVolume: BABYLON.PhysicsImpostor,
    filter?: CollisionFilter,
    onEnter?: CollisionCallback,
    onExit?: CollisionCallback,
    onStay?: CollisionCallback
  ): string;
  
  /**
   * Unregisters a trigger zone.
   * @param id - ID of the trigger to unregister
   */
  unregisterTriggerZone(id: string): void;
  
  /**
   * Checks if two physics impostors are colliding.
   * @param objectA - First physics impostor
   * @param objectB - Second physics impostor
   * @returns True if the objects are colliding
   */
  areColliding(objectA: BABYLON.PhysicsImpostor, objectB: BABYLON.PhysicsImpostor): boolean;
  
  /**
   * Performs a ray cast to check for collisions.
   * @param from - Starting point of the ray
   * @param to - End point of the ray
   * @param filter - Optional filter for ray cast results
   * @returns Information about the nearest hit, or null if no hit
   */
  raycast(
    from: BABYLON.Vector3,
    to: BABYLON.Vector3,
    filter?: CollisionFilter
  ): BABYLON.PhysicsRaycastResult | null;
  
  /**
   * Destroys the collision system and cleans up resources.
   */
  destroy(): void;
}
