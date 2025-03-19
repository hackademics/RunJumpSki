/**
 * @file src/core/physics/IProjectilePhysics.ts
 * @description Interface for the projectile physics system
 */

import * as BABYLON from 'babylonjs';
import { IPhysicsSystem } from './IPhysicsSystem';
import { ICollisionSystem } from './ICollisionSystem';

/**
 * Configuration options for projectiles
 */
export interface ProjectileConfig {
  /**
   * Initial velocity of the projectile in m/s
   */
  initialVelocity: number;
  
  /**
   * Mass of the projectile in kg
   */
  mass: number;
  
  /**
   * Radius of the projectile in meters
   */
  radius: number;
  
  /**
   * Drag coefficient (air resistance)
   */
  dragCoefficient: number;
  
  /**
   * Whether gravity affects this projectile
   */
  affectedByGravity: boolean;
  
  /**
   * Lifetime of the projectile in seconds (after which it self-destructs)
   */
  lifetime: number;
  
  /**
   * Maximum distance the projectile can travel before destruction
   */
  maxDistance?: number;
  
  /**
   * Bounciness factor (0 = no bounce, 1 = perfect elastic bounce)
   */
  restitution?: number;
  
  /**
   * Damage done on impact
   */
  damage?: number;
  
  /**
   * Explosion radius (0 = no explosion)
   */
  explosionRadius?: number;
  
  /**
   * Impulse force applied on explosion
   */
  explosionForce?: number;
}

/**
 * Default configuration for projectiles
 */
export const DEFAULT_PROJECTILE_CONFIG: ProjectileConfig = {
  initialVelocity: 50,
  mass: 1,
  radius: 0.25,
  dragCoefficient: 0.1,
  affectedByGravity: true,
  lifetime: 10,
  restitution: 0.3,
  damage: 10
};

/**
 * Projectile state information
 */
export interface ProjectileState {
  /**
   * Current position
   */
  position: BABYLON.Vector3;
  
  /**
   * Current velocity
   */
  velocity: BABYLON.Vector3;
  
  /**
   * Current acceleration
   */
  acceleration: BABYLON.Vector3;
  
  /**
   * Distance traveled since spawning
   */
  distanceTraveled: number;
  
  /**
   * Time since spawning in seconds
   */
  timeAlive: number;
  
  /**
   * Whether the projectile is active
   */
  isActive: boolean;
  
  /**
   * Whether the projectile has exploded
   */
  hasExploded: boolean;
}

/**
 * Callback for projectile impact events
 */
export type ProjectileImpactCallback = (
  projectileId: string,
  position: BABYLON.Vector3,
  normal: BABYLON.Vector3,
  targetImpostor?: BABYLON.PhysicsImpostor
) => void;

/**
 * Interface for the projectile physics system
 */
export interface IProjectilePhysics {
  /**
   * Initializes the projectile physics system
   * @param physicsSystem The physics system to use
   * @param collisionSystem The collision system to use
   */
  initialize(physicsSystem: IPhysicsSystem, collisionSystem: ICollisionSystem): void;
  
  /**
   * Updates all active projectiles
   * @param deltaTime Time elapsed since the last update in seconds
   */
  update(deltaTime: number): void;
  
  /**
   * Creates and launches a projectile
   * @param start Starting position
   * @param direction Direction vector (will be normalized)
   * @param config Projectile configuration
   * @param mesh Optional mesh to represent the projectile
   * @param onImpact Optional callback when projectile impacts something
   * @returns ID of the created projectile
   */
  createProjectile(
    start: BABYLON.Vector3,
    direction: BABYLON.Vector3,
    config: Partial<ProjectileConfig>,
    mesh?: BABYLON.AbstractMesh,
    onImpact?: ProjectileImpactCallback
  ): string;
  
  /**
   * Destroys a projectile
   * @param id ID of the projectile to destroy
   * @param explode Whether to trigger explosion effects
   */
  destroyProjectile(id: string, explode?: boolean): void;
  
  /**
   * Gets the state of a projectile
   * @param id ID of the projectile
   * @returns Projectile state or null if not found
   */
  getProjectileState(id: string): ProjectileState | null;
  
  /**
   * Applies an impulse to all objects within the explosion radius
   * @param position Center of explosion
   * @param radius Radius of explosion
   * @param force Force of explosion
   * @param falloff Whether force decreases with distance (true) or is constant (false)
   */
  applyExplosionForce(
    position: BABYLON.Vector3,
    radius: number,
    force: number,
    falloff?: boolean
  ): void;
  
  /**
   * Performs cleanup of the system
   */
  destroy(): void;
} 