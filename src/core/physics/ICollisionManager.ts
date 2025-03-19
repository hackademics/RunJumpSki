/**
 * @file src/core/physics/ICollisionManager.ts
 * @description Interface for higher-level collision management functionality.
 */

import * as BABYLON from 'babylonjs';
import { CollisionCallback, CollisionFilter } from './ICollisionSystem';

/**
 * Options for creating a collision group
 */
export interface CollisionGroupOptions {
  /**
   * Name of the collision group
   */
  name: string;
  
  /**
   * Optional collision filter for this group
   */
  filter?: CollisionFilter;
}

/**
 * Defines the shape of a collision volume
 */
export enum CollisionVolumeType {
  Box = 'box',
  Sphere = 'sphere',
  Cylinder = 'cylinder',
  Capsule = 'capsule',
  Custom = 'custom'
}

/**
 * Options for creating a collision volume
 */
export interface CollisionVolumeOptions {
  /**
   * Type of collision volume
   */
  type: CollisionVolumeType;
  
  /**
   * Parameters specific to the volume type
   * - Box: { width, height, depth }
   * - Sphere: { radius }
   * - Cylinder: { height, radius }
   * - Capsule: { height, radius }
   * - Custom: { mesh }
   */
  parameters: any;
  
  /**
   * Position offset from parent entity
   */
  position?: BABYLON.Vector3;
  
  /**
   * Rotation offset from parent entity
   */
  rotation?: BABYLON.Vector3;
  
  /**
   * Whether this is a trigger volume (no physical response)
   */
  isTrigger?: boolean;
  
  /**
   * Tags to apply to this volume
   */
  tags?: string[];
}

/**
 * Defines layer-based collision filtering
 */
export interface CollisionLayers {
  /**
   * The layer this object belongs to
   */
  layer: number;
  
  /**
   * Bit mask of layers this object can collide with
   */
  mask: number;
}

/**
 * Interface for the CollisionManager
 */
export interface ICollisionManager {
  /**
   * Initializes the collision manager.
   * @param scene The Babylon.js scene
   */
  initialize(scene: BABYLON.Scene): void;
  
  /**
   * Updates the collision system.
   * @param deltaTime Time elapsed since the last update
   */
  update(deltaTime: number): void;
  
  /**
   * Creates a collision group for easier management of related objects.
   * @param options Configuration options for the collision group
   * @returns The collision group ID
   */
  createCollisionGroup(options: CollisionGroupOptions): string;
  
  /**
   * Adds a physics impostor to a collision group.
   * @param groupId The ID of the collision group
   * @param impostor The physics impostor to add
   */
  addToCollisionGroup(groupId: string, impostor: BABYLON.PhysicsImpostor): void;
  
  /**
   * Removes a physics impostor from a collision group.
   * @param groupId The ID of the collision group
   * @param impostor The physics impostor to remove
   */
  removeFromCollisionGroup(groupId: string, impostor: BABYLON.PhysicsImpostor): void;
  
  /**
   * Creates a collision volume for an object.
   * @param mesh The mesh to attach the collision volume to
   * @param options Configuration options for the collision volume
   * @returns The physics impostor for the collision volume
   */
  createCollisionVolume(
    mesh: BABYLON.AbstractMesh,
    options: CollisionVolumeOptions
  ): BABYLON.PhysicsImpostor;
  
  /**
   * Creates a trigger volume that detects when objects enter or exit.
   * @param mesh The mesh to use as the trigger volume
   * @param options Configuration options for the trigger
   * @param onEnter Callback when an object enters the trigger
   * @param onExit Callback when an object exits the trigger
   * @param onStay Callback when an object stays inside the trigger
   * @returns The ID of the trigger for later reference
   */
  createTriggerVolume(
    mesh: BABYLON.AbstractMesh,
    options: CollisionVolumeOptions,
    onEnter?: CollisionCallback,
    onExit?: CollisionCallback,
    onStay?: CollisionCallback
  ): string;
  
  /**
   * Sets up collision between two groups.
   * @param group1Id The ID of the first collision group
   * @param group2Id The ID of the second collision group
   * @param callback The callback to call when collision occurs
   * @returns The ID of the collision handler
   */
  setupCollisionBetweenGroups(
    group1Id: string,
    group2Id: string,
    callback: CollisionCallback
  ): string;
  
  /**
   * Sets up collision detection for a single object against a group.
   * @param impostor The physics impostor to check for collisions
   * @param groupId The ID of the collision group to check against
   * @param callback The callback to call when collision occurs
   * @returns The ID of the collision handler
   */
  setupCollisionWithGroup(
    impostor: BABYLON.PhysicsImpostor,
    groupId: string,
    callback: CollisionCallback
  ): string;
  
  /**
   * Sets collision layers for filtering collisions.
   * @param impostor The physics impostor to set layers for
   * @param layers Collision layer settings
   */
  setCollisionLayers(impostor: BABYLON.PhysicsImpostor, layers: CollisionLayers): void;
  
  /**
   * Performs a raycast against collidable objects.
   * @param from Starting point of the ray
   * @param to End point of the ray
   * @param filter Optional filter for ray cast results
   * @returns Information about the nearest hit, or null if no hit
   */
  raycast(
    from: BABYLON.Vector3,
    to: BABYLON.Vector3,
    filter?: CollisionFilter
  ): BABYLON.PhysicsRaycastResult | null;
  
  /**
   * Performs a sphere cast (a raycast with thickness).
   * @param from Starting point of the ray
   * @param to End point of the ray
   * @param radius Radius of the sphere
   * @param filter Optional filter for ray cast results
   * @returns Information about the nearest hit, or null if no hit
   */
  sphereCast(
    from: BABYLON.Vector3,
    to: BABYLON.Vector3,
    radius: number,
    filter?: CollisionFilter
  ): BABYLON.PhysicsRaycastResult | null;
  
  /**
   * Checks which objects overlap with a specific volume.
   * @param position Center of the check
   * @param volume Type and size of the volume to check
   * @param filter Optional filter for results
   * @returns Array of physics impostors that overlap with the volume
   */
  overlapTest(
    position: BABYLON.Vector3,
    volume: CollisionVolumeOptions,
    filter?: CollisionFilter
  ): BABYLON.PhysicsImpostor[];
  
  /**
   * Cancels a collision handler.
   * @param id The ID of the collision handler to cancel
   */
  removeCollisionHandler(id: string): void;
  
  /**
   * Removes a trigger volume.
   * @param id The ID of the trigger to remove
   */
  removeTriggerVolume(id: string): void;
  
  /**
   * Cleans up all collision resources.
   */
  dispose(): void;
}
