/**
 * @file src/game/renderer/particles/PoolableJetpackParticleEffect.ts
 * @description Poolable implementation of jetpack particle effects
 */

import * as BABYLON from 'babylonjs';
import { IPoolable } from '../../../core/utils/ObjectPool';
import { Logger } from '../../../core/utils/Logger';

// First let's check if JetpackParticleEffect exists in the same location
import { JetpackParticleEffect } from './JetpackParticleEffect';

/**
 * Poolable implementation of jetpack particle effects
 */
export class PoolableJetpackParticleEffect extends JetpackParticleEffect implements IPoolable {
    private static _pool: PoolableJetpackParticleEffect[] = [];
    private logger: Logger = new Logger('PoolableJetpackParticleEffect');
    
    /**
     * Get a jetpack effect from the pool or create a new one
     * @returns A pooled or new PoolableJetpackParticleEffect
     */
    public static getFromPool(): PoolableJetpackParticleEffect {
        // Get from pool or create new
        if (PoolableJetpackParticleEffect._pool.length > 0) {
            const effect = PoolableJetpackParticleEffect._pool.pop()!;
            effect.reset();
            return effect;
        } else {
            return new PoolableJetpackParticleEffect();
        }
    }
    
    /**
     * Return an effect to the pool
     * @param effect The effect to return to the pool
     */
    public static returnToPool(effect: PoolableJetpackParticleEffect): void {
        // Reset the effect
        effect.reset();
        // Add to pool
        PoolableJetpackParticleEffect._pool.push(effect);
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
        PoolableJetpackParticleEffect._pool.forEach(effect => {
            effect.dispose();
        });
        // Clear the pool
        PoolableJetpackParticleEffect._pool = [];
    }
} 