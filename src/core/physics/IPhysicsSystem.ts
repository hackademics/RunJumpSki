/**
 * @file src/core/physics/IPhysicsSystem.ts
 * @description Interface for the PhysicsSystem.
 */

import * as BABYLON from "babylonjs";

export interface IPhysicsSystem {
  /**
   * Initializes the physics system with the given scene.
   * @param scene - The Babylon.js scene to enable physics on.
   */
  initialize(scene: BABYLON.Scene): void;

  /**
   * Updates the physics simulation.
   * @param deltaTime - Time elapsed since the last update in seconds.
   */
  update(deltaTime: number): void;

  /**
   * Sets the gravity for the physics simulation.
   * @param gravity - The gravity vector.
   */
  setGravity(gravity: BABYLON.Vector3): void;

  /**
   * Destroys the physics system and cleans up resources.
   */
  destroy(): void;
}
