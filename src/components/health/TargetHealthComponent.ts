/**
 * TargetHealthComponent.ts
 * Manages health for target entities
 */

import { Component } from '../Component';
import { Logger } from '../../utils/Logger';

/**
 * Target health component options
 */
export interface TargetHealthOptions {
    /**
     * Maximum health
     */
    maxHealth: number;
    
    /**
     * Initial health (defaults to maxHealth)
     */
    initialHealth?: number;
    
    /**
     * Whether the target is invulnerable
     */
    invulnerable?: boolean;
    
    /**
     * Callback when damage is taken
     */
    onDamage?: (damage: number, currentHealth: number) => void;
    
    /**
     * Callback when health reaches zero
     */
    onDestroy?: () => void;
    
    /**
     * Enable debug logging
     */
    debug?: boolean;
}

/**
 * Target health component
 * Manages health for target entities
 */
export class TargetHealthComponent extends Component {
    private logger: Logger;
    private maxHealth: number;
    private currentHealth: number;
    private invulnerable: boolean;
    private onDamageCallback?: (damage: number, currentHealth: number) => void;
    private onDestroyCallback?: () => void;
    private debug: boolean;
    
    // Performance tracking
    private damageCount: number = 0;
    private lastPerformanceLog: number = 0;
    private totalProcessingTime: number = 0;
    
    /**
     * Create a new target health component
     * @param options Component options
     */
    constructor(options: TargetHealthOptions) {
        super();
        
        this.maxHealth = options.maxHealth;
        this.currentHealth = options.initialHealth !== undefined ? options.initialHealth : options.maxHealth;
        this.invulnerable = options.invulnerable || false;
        this.onDamageCallback = options.onDamage;
        this.onDestroyCallback = options.onDestroy;
        this.debug = options.debug || false;
        
        this.logger = new Logger('TargetHealthComponent');
        
        if (this.debug) {
            this.logger.debug(`Created with maxHealth: ${this.maxHealth}, invulnerable: ${this.invulnerable}`);
        }
    }
    
    /**
     * Initialize the component
     */
    public init(): void {
        try {
            if (this.debug) {
                this.logger.debug('Initialized');
            }
        } catch (error) {
            this.logger.error(`Error in init: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Update the component
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        try {
            // Log performance metrics every 5 seconds if in debug mode
            if (this.debug && this.damageCount > 0) {
                const now = Date.now();
                if (now - this.lastPerformanceLog > 5000) {
                    const avgProcessingTime = this.totalProcessingTime / this.damageCount;
                    this.logger.debug(`Performance: Processed ${this.damageCount} damage events, avg time: ${avgProcessingTime.toFixed(2)}ms`);
                    
                    // Reset counters
                    this.damageCount = 0;
                    this.totalProcessingTime = 0;
                    this.lastPerformanceLog = now;
                }
            }
        } catch (error) {
            this.logger.error(`Error in update: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Apply damage to the target
     * @param amount Amount of damage to apply
     * @returns Whether the target was destroyed
     */
    public takeDamage(amount: number): boolean {
        try {
            const startTime = this.debug ? performance.now() : 0;
            
            // Skip if invulnerable
            if (this.invulnerable) {
                if (this.debug) {
                    this.logger.debug(`Damage ignored (invulnerable): ${amount}`);
                }
                return false;
            }
            
            // Ensure damage is positive
            const damage = Math.max(0, amount);
            
            // Apply damage
            this.currentHealth = Math.max(0, this.currentHealth - damage);
            
            if (this.debug) {
                this.logger.debug(`Took damage: ${damage}, health: ${this.currentHealth}/${this.maxHealth}`);
            }
            
            // Call damage callback
            if (this.onDamageCallback) {
                try {
                    this.onDamageCallback(damage, this.currentHealth);
                } catch (callbackError) {
                    this.logger.error(`Error in damage callback: ${callbackError instanceof Error ? callbackError.message : String(callbackError)}`);
                }
            }
            
            // Check if destroyed
            const destroyed = this.currentHealth <= 0;
            
            // Call destroy callback if health reached zero
            if (destroyed && this.onDestroyCallback) {
                try {
                    this.onDestroyCallback();
                } catch (callbackError) {
                    this.logger.error(`Error in destroy callback: ${callbackError instanceof Error ? callbackError.message : String(callbackError)}`);
                }
            }
            
            // Track performance if in debug mode
            if (this.debug) {
                const endTime = performance.now();
                const processingTime = endTime - startTime;
                this.totalProcessingTime += processingTime;
                this.damageCount++;
                
                if (processingTime > 5) {
                    this.logger.warn(`Slow damage processing: ${processingTime.toFixed(2)}ms`);
                }
            }
            
            return destroyed;
        } catch (error) {
            this.logger.error(`Error in takeDamage: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }
    
    /**
     * Get the current health
     * @returns Current health
     */
    public getHealth(): number {
        return this.currentHealth;
    }
    
    /**
     * Get the maximum health
     * @returns Maximum health
     */
    public getMaxHealth(): number {
        return this.maxHealth;
    }
    
    /**
     * Get the health percentage (0-1)
     * @returns Health percentage
     */
    public getHealthPercentage(): number {
        return this.maxHealth > 0 ? this.currentHealth / this.maxHealth : 0;
    }
    
    /**
     * Set the current health
     * @param health New health value
     */
    public setHealth(health: number): void {
        try {
            this.currentHealth = Math.max(0, Math.min(this.maxHealth, health));
            
            if (this.debug) {
                this.logger.debug(`Health set to: ${this.currentHealth}/${this.maxHealth}`);
            }
            
            // Check if destroyed
            if (this.currentHealth <= 0 && this.onDestroyCallback) {
                try {
                    this.onDestroyCallback();
                } catch (callbackError) {
                    this.logger.error(`Error in destroy callback: ${callbackError instanceof Error ? callbackError.message : String(callbackError)}`);
                }
            }
        } catch (error) {
            this.logger.error(`Error in setHealth: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Set whether the target is invulnerable
     * @param invulnerable Whether the target is invulnerable
     */
    public setInvulnerable(invulnerable: boolean): void {
        try {
            this.invulnerable = invulnerable;
            
            if (this.debug) {
                this.logger.debug(`Invulnerability set to: ${invulnerable}`);
            }
        } catch (error) {
            this.logger.error(`Error in setInvulnerable: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Check if the target is invulnerable
     * @returns Whether the target is invulnerable
     */
    public isInvulnerable(): boolean {
        return this.invulnerable;
    }
    
    /**
     * Reset health to maximum
     */
    public resetHealth(): void {
        try {
            this.currentHealth = this.maxHealth;
            
            if (this.debug) {
                this.logger.debug(`Health reset to max: ${this.maxHealth}`);
            }
        } catch (error) {
            this.logger.error(`Error in resetHealth: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
} 