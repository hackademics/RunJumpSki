/**
 * @file src/game/weapons/PoolableGrenadeProjectile.ts
 * @description Poolable implementation of the grenade projectile
 */

import * as BABYLON from 'babylonjs';
import { IProjectilePhysics, ProjectileConfig, ProjectileImpactCallback } from '../../core/physics/IProjectilePhysics';
import { GrenadeProjectile, DEFAULT_GRENADE_CONFIG, GrenadeMaterialOptions, DEFAULT_GRENADE_MATERIAL } from './GrenadeProjectile';
import { IPoolable } from '../../core/utils/ObjectPool';
import { Logger } from '../../core/utils/Logger';

/**
 * Implements a poolable grenade projectile
 */
export class PoolableGrenadeProjectile extends GrenadeProjectile implements IPoolable {
  private static _pool: PoolableGrenadeProjectile[] = [];
  private static _scene: BABYLON.Scene | null = null;
  private static _projectilePhysics: IProjectilePhysics | null = null;
  private logger: Logger = new Logger('PoolableGrenadeProjectile');

  /**
   * Get a grenade projectile from the pool or create a new one
   * @param scene The scene
   * @param projectilePhysics The projectile physics system
   * @param config Optional projectile configuration
   * @param materialOptions Optional material configuration
   * @returns A pooled or new PoolableGrenadeProjectile
   */
  public static getFromPool(
    scene: BABYLON.Scene,
    projectilePhysics: IProjectilePhysics,
    config?: Partial<ProjectileConfig>,
    materialOptions?: Partial<GrenadeMaterialOptions>
  ): PoolableGrenadeProjectile {
    // Store scene and projectile physics for future pool creations
    PoolableGrenadeProjectile._scene = scene;
    PoolableGrenadeProjectile._projectilePhysics = projectilePhysics;

    // Get from pool or create new
    if (PoolableGrenadeProjectile._pool.length > 0) {
      const projectile = PoolableGrenadeProjectile._pool.pop()!;
      // Reset the projectile with new config if provided
      projectile.reset(config, materialOptions);
      return projectile;
    } else {
      return new PoolableGrenadeProjectile(scene, projectilePhysics, config, materialOptions);
    }
  }

  /**
   * Return a projectile to the pool
   * @param projectile The projectile to return to the pool
   */
  public static returnToPool(projectile: PoolableGrenadeProjectile): void {
    // Clear any active grenades
    projectile.reset();
    // Add to pool
    PoolableGrenadeProjectile._pool.push(projectile);
  }

  /**
   * Reset this projectile for reuse (implementation of IPoolable)
   */
  public reset(
    config?: Partial<ProjectileConfig>,
    materialOptions?: Partial<GrenadeMaterialOptions>
  ): void {
    // Clear all active projectiles
    this.dispose();
    
    // If we have configs to update, we'd do that here
    // For now, we just rely on the dispose method
  }

  /**
   * Clear the pool when no longer needed
   */
  public static clearPool(): void {
    // Dispose each projectile in the pool
    PoolableGrenadeProjectile._pool.forEach(projectile => {
      projectile.dispose();
    });
    // Clear the pool
    PoolableGrenadeProjectile._pool = [];
  }
} 