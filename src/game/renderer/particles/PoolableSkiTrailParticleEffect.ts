/**
 * @file src/game/renderer/particles/PoolableSkiTrailParticleEffect.ts
 * @description Poolable implementation of ski trail particle effects
 */

import * as BABYLON from 'babylonjs';
import { IPoolable } from '../../../core/utils/ObjectPool';
import { Logger } from '../../../core/utils/Logger';
import { SkiTrailParticleEffect } from './SkiTrailParticleEffect';

/**
 * Poolable implementation of ski trail particle effects
 */
export class PoolableSkiTrailParticleEffect extends SkiTrailParticleEffect implements IPoolable {
    private static _pool: PoolableSkiTrailParticleEffect[] = [];
    private logger: Logger = new Logger('PoolableSkiTrailParticleEffect');
    
    /**
     * Get a ski trail effect from the pool or create a new one
     * @returns A pooled or new PoolableSkiTrailParticleEffect
     */
    public static getFromPool(): PoolableSkiTrailParticleEffect {
        // Get from pool or create new
        if (PoolableSkiTrailParticleEffect._pool.length > 0) {
            const effect = PoolableSkiTrailParticleEffect._pool.pop()!;
            effect.reset();
            return effect;
        } else {
            return new PoolableSkiTrailParticleEffect();
        }
    }
    
    /**
     * Return an effect to the pool
     * @param effect The effect to return to the pool
     */
    public static returnToPool(effect: PoolableSkiTrailParticleEffect): void {
        // Reset the effect
        effect.reset();
        // Add to pool
        PoolableSkiTrailParticleEffect._pool.push(effect);
    }
    
    /**
     * Reset this effect for reuse (implementation of IPoolable)
     */
    public reset(): void {
        // Dispose all active effects
        this.dispose();
    }
    
    /**
     * Clear the pool when no longer needed
     */
    public static clearPool(): void {
        // Dispose each effect in the pool
        PoolableSkiTrailParticleEffect._pool.forEach(effect => {
            effect.dispose();
        });
        // Clear the pool
        PoolableSkiTrailParticleEffect._pool = [];
    }
} 