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
  
  /**
   * Gets the current physics engine instance.
   * @returns The Babylon.js physics engine or null if not initialized.
   */
  getPhysicsEngine(): any | null;
  
  /**
   * Creates a physics impostor for a mesh.
   * @param mesh - The mesh to create an impostor for.
   * @param type - The type of impostor (box, sphere, etc.).
   * @param options - The physics parameters for the impostor.
   * @returns The created physics impostor.
   */
  createImpostor(
    mesh: BABYLON.AbstractMesh, 
    type: number, 
    options: BABYLON.PhysicsImpostorParameters
  ): BABYLON.PhysicsImpostor;
  
  /**
   * Applies a force to a physics impostor.
   * @param impostor - The impostor to apply force to.
   * @param force - The force vector to apply.
   * @param contactPoint - The point at which to apply the force (optional).
   */
  applyForce(
    impostor: BABYLON.PhysicsImpostor,
    force: BABYLON.Vector3,
    contactPoint?: BABYLON.Vector3
  ): void;
  
  /**
   * Applies an impulse to a physics impostor.
   * @param impostor - The impostor to apply impulse to.
   * @param impulse - The impulse vector to apply.
   * @param contactPoint - The point at which to apply the impulse (optional).
   */
  applyImpulse(
    impostor: BABYLON.PhysicsImpostor,
    impulse: BABYLON.Vector3,
    contactPoint?: BABYLON.Vector3
  ): void;
  
  /**
   * Creates a joint between two impostors.
   * @param type - The type of joint.
   * @param mainImpostor - The main impostor.
   * @param connectedImpostor - The connected impostor.
   * @param options - Joint creation options.
   * @returns The created physics joint.
   */
  createJoint(
    type: number,
    mainImpostor: BABYLON.PhysicsImpostor,
    connectedImpostor: BABYLON.PhysicsImpostor,
    options: any
  ): BABYLON.PhysicsJoint;
  
  /**
   * Registers a collision callback between two impostors.
   * @param impostor1 - The first impostor.
   * @param impostor2 - The second impostor.
   * @param callback - The callback function to execute on collision.
   */
  registerOnCollide(
    impostor1: BABYLON.PhysicsImpostor,
    impostor2: BABYLON.PhysicsImpostor,
    callback: (collider: BABYLON.PhysicsImpostor, collidedWith: BABYLON.PhysicsImpostor) => void
  ): void;
}
