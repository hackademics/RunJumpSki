/**
 * @file src/game/renderer/particles/PoolableExplosionParticleEffect.ts
 * @description Poolable implementation of explosion particle effects
 */

import * as BABYLON from 'babylonjs';
import { 
    IExplosionParticleEffect, 
    ExplosionParticleEffect, 
    ExplosionParticleOptions, 
    ExplosionType,
    DEFAULT_EXPLOSION_PARTICLE_OPTIONS
} from './ExplosionParticleEffect';
import { IPoolable } from '../../../core/utils/ObjectPool';
import { Logger } from '../../../core/utils/Logger';

/**
 * Poolable implementation of explosion particle effects
 */
export class PoolableExplosionParticleEffect extends ExplosionParticleEffect implements IPoolable {
    private static _pool: PoolableExplosionParticleEffect[] = [];
    private logger: Logger = new Logger('PoolableExplosionParticleEffect');
    
    /**
     * Get an explosion effect from the pool or create a new one
     * @returns A pooled or new PoolableExplosionParticleEffect
     */
    public static getFromPool(): PoolableExplosionParticleEffect {
        // Get from pool or create new
        if (PoolableExplosionParticleEffect._pool.length > 0) {
            const effect = PoolableExplosionParticleEffect._pool.pop()!;
            effect.reset();
            return effect;
        } else {
            return new PoolableExplosionParticleEffect();
        }
    }
    
    /**
     * Return an effect to the pool
     * @param effect The effect to return to the pool
     */
    public static returnToPool(effect: PoolableExplosionParticleEffect): void {
        // Reset the effect
        effect.reset();
        // Add to pool
        PoolableExplosionParticleEffect._pool.push(effect);
    }
    
    /**
     * Reset this effect for reuse (implementation of IPoolable)
     */
    public reset(): void {
        // Dispose all active explosion effects
        this.dispose();
    }
    
    /**
     * Create an explosion effect with pooling support
     * @param scene The Babylon.js scene
     * @param type The type of explosion
     * @param options Configuration options for the explosion
     */
    public createExplosion(scene: BABYLON.Scene, type: ExplosionType, options: Partial<ExplosionParticleOptions> = {}): void {
        super.createExplosion(scene, type, options);
    }
    
    /**
     * Create a custom explosion effect with pooling support
     * @param scene The Babylon.js scene
     * @param options Configuration options for the explosion
     */
    public createCustomExplosion(scene: BABYLON.Scene, options: ExplosionParticleOptions): void {
        super.createCustomExplosion(scene, options);
    }
    
    /**
     * Clear the pool when no longer needed
     */
    public static clearPool(): void {
        // Dispose each effect in the pool
        PoolableExplosionParticleEffect._pool.forEach(effect => {
            effect.dispose();
        });
        // Clear the pool
        PoolableExplosionParticleEffect._pool = [];
    }
} 