/**
 * @file src/core/physics/IPhysicsManager.ts
 * @description Interface for the PhysicsManager, which provides higher-level physics functionality.
 */

import * as BABYLON from "babylonjs";
import { IPhysicsSystem } from "./IPhysicsSystem";

/**
 * Interface for the physics manager that provides higher-level physics functionality.
 */
export interface IPhysicsManager {
  /**
   * Initializes the physics manager.
   * @param scene - The Babylon.js scene to use.
   */
  initialize(scene: BABYLON.Scene): void;
  
  /**
   * Updates the physics simulation.
   * @param deltaTime - Time elapsed since the last update in seconds.
   */
  update(deltaTime: number): void;
  
  /**
   * Gets the physics system.
   * @returns The physics system.
   */
  getPhysicsSystem(): IPhysicsSystem;
  
  /**
   * Configures the physics engine with game-specific settings.
   * @param gravity - The gravity vector to use.
   * @param options - Additional physics configuration options.
   */
  configurePhysics(gravity: BABYLON.Vector3, options?: any): void;
  
  /**
   * Creates a physics body for an object with appropriate properties.
   * @param mesh - The mesh to attach physics to.
   * @param type - The type of impostor to create.
   * @param options - Physics parameters for the impostor.
   * @returns The created physics impostor.
   */
  createBody(
    mesh: BABYLON.AbstractMesh, 
    type: number, 
    options: BABYLON.PhysicsImpostorParameters
  ): BABYLON.PhysicsImpostor;
  
  /**
   * Creates a static collider (non-moving physics object).
   * @param mesh - The mesh to make into a collider.
   * @param type - The type of impostor to create.
   * @returns The created physics impostor.
   */
  createStaticCollider(
    mesh: BABYLON.AbstractMesh, 
    type: number
  ): BABYLON.PhysicsImpostor;
  
  /**
   * Creates a kinematic body (controlled through code, affects other objects).
   * @param mesh - The mesh to make into a kinematic body.
   * @param type - The type of impostor to create.
   * @param mass - The mass to use (typically a small non-zero value).
   * @returns The created physics impostor.
   */
  createKinematicBody(
    mesh: BABYLON.AbstractMesh, 
    type: number,
    mass?: number
  ): BABYLON.PhysicsImpostor;
  
  /**
   * Creates a dynamic body (fully physics-controlled).
   * @param mesh - The mesh to make into a dynamic body.
   * @param type - The type of impostor to create.
   * @param mass - The mass of the body.
   * @param restitution - The bounciness of the body.
   * @param friction - The friction of the body.
   * @returns The created physics impostor.
   */
  createDynamicBody(
    mesh: BABYLON.AbstractMesh, 
    type: number,
    mass: number,
    restitution?: number,
    friction?: number
  ): BABYLON.PhysicsImpostor;
  
  /**
   * Registers a collision callback for two impostors.
   * @param impostor1 - The first impostor.
   * @param impostor2 - The second impostor (or null for any impostor).
   * @param callback - The callback to execute on collision.
   */
  registerCollision(
    impostor1: BABYLON.PhysicsImpostor,
    impostor2: BABYLON.PhysicsImpostor | null,
    callback: (collider: BABYLON.PhysicsImpostor, collidedWith: BABYLON.PhysicsImpostor) => void
  ): void;
  
  /**
   * Creates a physics constraint/joint between objects.
   * @param type - The type of joint to create.
   * @param mainBody - The main physics body.
   * @param connectedBody - The body to connect to.
   * @param options - Options for the joint.
   * @returns The created joint.
   */
  createConstraint(
    type: number,
    mainBody: BABYLON.PhysicsImpostor,
    connectedBody: BABYLON.PhysicsImpostor,
    options: any
  ): BABYLON.PhysicsJoint;
  
  /**
   * Applies a force to a physical body.
   * @param body - The physics body.
   * @param force - The force vector to apply.
   * @param contactPoint - Optional point at which to apply the force.
   */
  applyForce(
    body: BABYLON.PhysicsImpostor,
    force: BABYLON.Vector3,
    contactPoint?: BABYLON.Vector3
  ): void;
  
  /**
   * Applies an impulse to a physical body.
   * @param body - The physics body.
   * @param impulse - The impulse vector to apply.
   * @param contactPoint - Optional point at which to apply the impulse.
   */
  applyImpulse(
    body: BABYLON.PhysicsImpostor,
    impulse: BABYLON.Vector3,
    contactPoint?: BABYLON.Vector3
  ): void;
  
  /**
   * Sets the linear velocity of a body directly.
   * @param body - The physics body.
   * @param velocity - The velocity vector to set.
   */
  setLinearVelocity(
    body: BABYLON.PhysicsImpostor,
    velocity: BABYLON.Vector3
  ): void;
  
  /**
   * Sets the angular velocity of a body directly.
   * @param body - The physics body.
   * @param velocity - The angular velocity vector to set.
   */
  setAngularVelocity(
    body: BABYLON.PhysicsImpostor,
    velocity: BABYLON.Vector3
  ): void;
  
  /**
   * Cleans up and releases all physics resources.
   */
  dispose(): void;
} 