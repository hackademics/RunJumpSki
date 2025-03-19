/**
 * @file src/core/ecs/components/IColliderComponent.ts
 * @description Interface for collider components that define collision shapes
 */

import * as BABYLON from 'babylonjs';
import { IComponent } from '../IComponent';

/**
 * Interface for Collider component
 * Defines methods for collision geometry
 */
export interface IColliderComponent extends IComponent {
  /**
   * Get the collider type
   */
  getColliderType(): string;
  
  /**
   * Get the collision mesh
   */
  getCollisionMesh(): BABYLON.AbstractMesh | null;
  
  /**
   * Set the collision mesh
   * @param mesh - The mesh to use for collision
   */
  setCollisionMesh(mesh: BABYLON.AbstractMesh | null): void;
  
  /**
   * Check if the collider is a trigger (no physical response)
   */
  isTrigger(): boolean;
  
  /**
   * Set whether the collider is a trigger
   * @param isTrigger - Whether it's a trigger
   */
  setTrigger(isTrigger: boolean): void;
  
  /**
   * Get the size of the collider
   */
  getSize(): BABYLON.Vector3;
  
  /**
   * Set the size of the collider
   * @param size - Size in local space
   */
  setSize(size: BABYLON.Vector3): void;
  
  /**
   * Get the offset of the collider from the entity's position
   */
  getOffset(): BABYLON.Vector3;
  
  /**
   * Set the offset of the collider from the entity's position
   * @param offset - Offset in local space
   */
  setOffset(offset: BABYLON.Vector3): void;
  
  /**
   * Check if the collider is visible (for debugging)
   */
  isVisible(): boolean;
  
  /**
   * Set whether the collider is visible (for debugging)
   * @param visible - Whether the collider is visible
   */
  setVisible(visible: boolean): void;
  
  /**
   * Create a collision mesh with the current settings
   * @param scene - The scene to create the mesh in
   */
  createCollisionMesh(scene: BABYLON.Scene): BABYLON.AbstractMesh;
  
  /**
   * Register a callback for collision events
   * @param callback - Function to call when collision occurs
   */
  onCollision(callback: (collidedWith: BABYLON.AbstractMesh, point: BABYLON.Vector3) => void): void;
  
  /**
   * Check if a point is inside the collider
   * @param point - The point to check
   */
  containsPoint(point: BABYLON.Vector3): boolean;
  
  /**
   * Resize the collider based on a mesh
   * @param mesh - The mesh to use for automatic sizing
   * @param scale - Optional scale factor
   */
  fitToMesh(mesh: BABYLON.AbstractMesh, scale?: number): void;
  
  /**
   * Update the collider's transform from the entity
   */
  updateTransform(): void;
}

