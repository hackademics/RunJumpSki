/**
 * ShakeEffect.ts
 * Handles camera shake effects
 */

import { Vector3 } from '../../types/common/Vector3';
import { MathUtils } from '../../utils/MathUtils';

/**
 * Camera shake effect
 */
export class ShakeEffect {
    private intensity: number;
    private duration: number;
    private timeRemaining: number;
    private offset: Vector3;
    private lastUpdateTime: number;
    private updateInterval: number = 0.05; // Update shake every 50ms
    private timeSinceLastUpdate: number = 0;
    
    /**
     * Create a new shake effect
     * @param intensity Shake intensity
     * @param duration Shake duration in seconds
     */
    constructor(intensity: number, duration: number) {
        this.intensity = intensity;
        this.duration = duration;
        this.timeRemaining = duration;
        this.offset = Vector3.zero();
        this.lastUpdateTime = performance.now() / 1000;
    }
    
    /**
     * Update the shake effect
     * @param deltaTime Time since last update in seconds
     * @returns Whether the effect is still active
     */
    public update(deltaTime: number): boolean {
        // Update time remaining
        this.timeRemaining -= deltaTime;
        this.timeSinceLastUpdate += deltaTime;
        
        // Check if effect is finished
        if (this.timeRemaining <= 0) {
            this.offset.set(0, 0, 0);
            return false;
        }
        
        // Only update shake at certain intervals to avoid jitter
        if (this.timeSinceLastUpdate >= this.updateInterval) {
            // Calculate intensity based on remaining time (fade out)
            const currentIntensity = this.intensity * (this.timeRemaining / this.duration);
            
            // Generate random offset
            this.offset.x = MathUtils.random(-currentIntensity, currentIntensity);
            this.offset.y = MathUtils.random(-currentIntensity, currentIntensity);
            this.offset.z = MathUtils.random(-currentIntensity, currentIntensity) * 0.5; // Less shake on Z-axis
            
            this.timeSinceLastUpdate = 0;
        }
        
        return true;
    }
    
    /**
     * Get the current shake offset
     * @returns Shake offset vector
     */
    public getOffset(): Vector3 {
        return this.offset.clone();
    }
    
    /**
     * Reset the shake effect
     * @param intensity New intensity
     * @param duration New duration
     */
    public reset(intensity: number, duration: number): void {
        this.intensity = intensity;
        this.duration = duration;
        this.timeRemaining = duration;
        this.timeSinceLastUpdate = 0;
    }
} 