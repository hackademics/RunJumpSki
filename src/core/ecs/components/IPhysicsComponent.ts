/**
 * @file src/core/ecs/components/IPhysicsComponent.ts
 * @description Interface for physics components that handle physical behavior
 */

import * as BABYLON from 'babylonjs';
import { IComponent } from '../IComponent';

/**
 * Interface for physics component
 * Defines methods for applying physics to an entity
 */
export interface IPhysicsComponent extends IComponent {
  /**
   * Get the physics impostor
   */
  getImpostor(): BABYLON.PhysicsImpostor | null;
  
  /**
   * Set the physics impostor
   * @param impostor - The physics impostor to use
   */
  setImpostor(impostor: BABYLON.PhysicsImpostor | null): void;
  
  /**
   * Get the mass of the physics body
   */
  getMass(): number;
  
  /**
   * Set the mass of the physics body
   * @param mass - The mass value in kilograms
   */
  setMass(mass: number): void;
  
  /**
   * Get the restitution (bounciness) of the physics body
   */
  getRestitution(): number;
  
  /**
   * Set the restitution (bounciness) of the physics body
   * @param restitution - Value between 0 and 1
   */
  setRestitution(restitution: number): void;
  
  /**
   * Get the friction of the physics body
   */
  getFriction(): number;
  
  /**
   * Set the friction of the physics body
   * @param friction - Value between 0 and 1
   */
  setFriction(friction: number): void;
  
  /**
   * Get the linear velocity of the physics body
   */
  getLinearVelocity(): BABYLON.Vector3;
  
  /**
   * Set the linear velocity of the physics body
   * @param velocity - The velocity vector
   */
  setLinearVelocity(velocity: BABYLON.Vector3): void;
  
  /**
   * Get the angular velocity of the physics body
   */
  getAngularVelocity(): BABYLON.Vector3;
  
  /**
   * Set the angular velocity of the physics body
   * @param velocity - The angular velocity vector
   */
  setAngularVelocity(velocity: BABYLON.Vector3): void;
  
  /**
   * Apply an impulse force to the physics body
   * @param force - The force vector to apply
   * @param contactPoint - The point where the force is applied (optional)
   */
  applyImpulse(force: BABYLON.Vector3, contactPoint?: BABYLON.Vector3): void;
  
  /**
   * Apply a continuous force to the physics body
   * @param force - The force vector to apply
   * @param contactPoint - The point where the force is applied (optional)
   */
  applyForce(force: BABYLON.Vector3, contactPoint?: BABYLON.Vector3): void;
  
  /**
   * Apply a torque impulse to the physics body
   * @param torque - The torque vector to apply
   */
  applyTorqueImpulse(torque: BABYLON.Vector3): void;
  
  /**
   * Check if the physics body is affected by gravity
   */
  isGravityEnabled(): boolean;
  
  /**
   * Set whether the physics body is affected by gravity
   * @param enabled - Whether gravity is enabled
   */
  setGravityEnabled(enabled: boolean): void;
  
  /**
   * Check if the physics body is a trigger volume (no physical response)
   */
  isTrigger(): boolean;
  
  /**
   * Set whether the physics body is a trigger volume
   * @param isTrigger - Whether it's a trigger
   */
  setTrigger(isTrigger: boolean): void;
  
  /**
   * Lock specified axes of motion
   * @param lockX - Whether to lock X axis translation
   * @param lockY - Whether to lock Y axis translation
   * @param lockZ - Whether to lock Z axis translation
   */
  lockMotion(lockX: boolean, lockY: boolean, lockZ: boolean): void;
  
  /**
   * Lock specified axes of rotation
   * @param lockX - Whether to lock X axis rotation
   * @param lockY - Whether to lock Y axis rotation
   * @param lockZ - Whether to lock Z axis rotation
   */
  lockRotation(lockX: boolean, lockY: boolean, lockZ: boolean): void;
  
  /**
   * Register a callback function for collision events
   * @param onCollide - Callback function called when collision occurs
   */
  onCollide(onCollide: (collidedWith: BABYLON.PhysicsImpostor, point: BABYLON.Vector3) => void): void;
  
  /**
   * Explicitly update the physics body from the transform component
   */
  syncTransform(): void;
  
  /**
   * Explicitly update the transform component from the physics body
   */
  syncToTransform(): void;
}

