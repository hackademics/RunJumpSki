/**
 * @file src/game/weapons/PoolableSpinfusorProjectile.ts
 * @description Poolable implementation of the Spinfusor disc projectile
 */

import * as BABYLON from 'babylonjs';
import { IProjectilePhysics, ProjectileConfig, ProjectileImpactCallback } from '../../core/physics/IProjectilePhysics';
import { SpinfusorProjectile, DEFAULT_SPINFUSOR_CONFIG, SpinfusorMaterialOptions, DEFAULT_SPINFUSOR_MATERIAL } from './SpinfusorProjectile';
import { IPoolable } from '../../core/utils/ObjectPool';
import { Logger } from '../../core/utils/Logger';

/**
 * Implements a poolable Spinfusor disc projectile
 */
export class PoolableSpinfusorProjectile extends SpinfusorProjectile implements IPoolable {
  private static _pool: PoolableSpinfusorProjectile[] = [];
  private static _scene: BABYLON.Scene | null = null;
  private static _projectilePhysics: IProjectilePhysics | null = null;
  private logger: Logger = new Logger('PoolableSpinfusorProjectile');

  /**
   * Get a Spinfusor projectile from the pool or create a new one
   * @param scene The scene
   * @param projectilePhysics The projectile physics system
   * @param config Optional projectile configuration
   * @param materialOptions Optional material configuration
   * @returns A pooled or new PoolableSpinfusorProjectile
   */
  public static getFromPool(
    scene: BABYLON.Scene,
    projectilePhysics: IProjectilePhysics,
    config?: Partial<ProjectileConfig>,
    materialOptions?: Partial<SpinfusorMaterialOptions>
  ): PoolableSpinfusorProjectile {
    // Store scene and projectile physics for future pool creations
    PoolableSpinfusorProjectile._scene = scene;
    PoolableSpinfusorProjectile._projectilePhysics = projectilePhysics;

    // Get from pool or create new
    if (PoolableSpinfusorProjectile._pool.length > 0) {
      const projectile = PoolableSpinfusorProjectile._pool.pop()!;
      // Reset the projectile with new config if provided
      projectile.reset();
      return projectile;
    } else {
      return new PoolableSpinfusorProjectile(scene, projectilePhysics, config, materialOptions);
    }
  }

  /**
   * Return a projectile to the pool
   * @param projectile The projectile to return to the pool
   */
  public static returnToPool(projectile: PoolableSpinfusorProjectile): void {
    // Reset the projectile
    projectile.reset();
    // Add to pool
    PoolableSpinfusorProjectile._pool.push(projectile);
  }

  /**
   * Reset this projectile for reuse (implementation of IPoolable)
   */
  public reset(): void {
    // Clear all active projectiles
    this.dispose();
  }

  /**
   * Clear the pool when no longer needed
   */
  public static clearPool(): void {
    // Dispose each projectile in the pool
    PoolableSpinfusorProjectile._pool.forEach(projectile => {
      projectile.dispose();
    });
    // Clear the pool
    PoolableSpinfusorProjectile._pool = [];
  }
} 