/**
 * TargetHealthComponent.ts
 * Component for managing target health and damage
 */

import { Component } from '../Component';
import { IEntity } from '../../entities/IEntity';
import { Logger } from '../../utils/Logger';

/**
 * Damage type enum
 */
export enum DamageType {
    PROJECTILE = 'projectile',
    EXPLOSION = 'explosion',
    IMPACT = 'impact',
    FIRE = 'fire',
    ENERGY = 'energy'
}

/**
 * Damage info interface
 */
export interface DamageInfo {
    /**
     * Amount of damage
     */
    amount: number;
    
    /**
     * Type of damage
     */
    type?: DamageType;
    
    /**
     * Source entity ID
     */
    sourceEntityId?: string;
    
    /**
     * Critical hit
     */
    isCritical?: boolean;
    
    /**
     * Timestamp when damage occurred
     */
    timestamp?: number;
}

/**
 * Target health options
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
     * Callback for when damage is taken
     */
    onDamage?: (damage: number, currentHealth: number, damageInfo?: DamageInfo) => void;
    
    /**
     * Callback for when the target is destroyed
     */
    onDestroy?: () => void;
    
    /**
     * Whether the target is invulnerable
     */
    invulnerable?: boolean;
    
    /**
     * Damage multiplier for different damage types
     */
    damageMultipliers?: {
        [key in DamageType]?: number;
    };
    
    /**
     * Damage threshold (minimum damage required to affect health)
     */
    damageThreshold?: number;
    
    /**
     * Whether to enable critical hits
     */
    enableCriticalHits?: boolean;
    
    /**
     * Critical hit multiplier
     */
    criticalHitMultiplier?: number;
    
    /**
     * Critical hit chance (0-1)
     */
    criticalHitChance?: number;
    
    /**
     * Debug mode - enables verbose logging
     */
    debug?: boolean;
}

/**
 * Health state for serialization
 */
export interface HealthState {
    currentHealth: number;
    maxHealth: number;
    invulnerable: boolean;
    damageHistory: DamageInfo[];
}

/**
 * Component for managing target health and damage
 */
export class TargetHealthComponent extends Component {
    private logger: Logger;
    
    private maxHealth: number;
    private currentHealth: number;
    private invulnerable: boolean;
    private damageMultipliers: { [key in DamageType]?: number };
    private damageThreshold: number;
    private enableCriticalHits: boolean;
    private criticalHitMultiplier: number;
    private criticalHitChance: number;
    private debug: boolean;
    
    private onDamageCallback?: (damage: number, currentHealth: number, damageInfo?: DamageInfo) => void;
    private onDestroyCallback?: () => void;
    
    // Track damage history for analytics
    private damageHistory: DamageInfo[] = [];
    private lastDamageTime: number = 0;
    private totalDamageTaken: number = 0;
    
    /**
     * Create a new target health component
     * @param options Target health options
     */
    constructor(options: TargetHealthOptions) {
        super('health');
        
        this.logger = new Logger('TargetHealthComponent');
        
        // Store properties
        this.maxHealth = options.maxHealth;
        this.currentHealth = options.initialHealth !== undefined ? options.initialHealth : this.maxHealth;
        this.invulnerable = options.invulnerable || false;
        this.damageMultipliers = options.damageMultipliers || {};
        this.damageThreshold = options.damageThreshold || 0;
        this.enableCriticalHits = options.enableCriticalHits || false;
        this.criticalHitMultiplier = options.criticalHitMultiplier || 2.0;
        this.criticalHitChance = options.criticalHitChance || 0.1; // 10% chance by default
        this.debug = options.debug || false;
        
        // Store callbacks
        this.onDamageCallback = options.onDamage;
        this.onDestroyCallback = options.onDestroy;
        
        if (this.debug) {
            this.logger.debug(`Created target health component with max health ${this.maxHealth}`);
        }
    }
    
    /**
     * Initialize the component
     * @param entity The entity this component belongs to
     */
    public override init(entity: IEntity): void {
        try {
            super.init(entity);
            if (this.debug) {
                this.logger.debug(`Initialized target health component for entity ${entity.id}`);
            }
        } catch (error) {
            this.logger.error(`Error initializing target health component: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Take damage
     * @param damageAmount Amount of damage to take or DamageInfo object
     * @param damageType Type of damage (optional if damageAmount is a DamageInfo object)
     * @returns Whether the target was destroyed
     */
    public takeDamage(damageAmount: number | DamageInfo, damageType?: DamageType): boolean {
        // Return early if invulnerable or already destroyed
        if (this.invulnerable || this.currentHealth <= 0) {
            return false;
        }
        
        try {
            let damageInfo: DamageInfo;
            let damageTypeToUse: DamageType;
            
            // Process damage info
            if (typeof damageAmount === 'number') {
                damageTypeToUse = damageType || DamageType.PROJECTILE;
                damageInfo = {
                    amount: damageAmount,
                    type: damageTypeToUse,
                    timestamp: Date.now()
                };
            } else {
                damageInfo = {
                    ...damageAmount,
                    timestamp: damageAmount.timestamp || Date.now()
                };
                damageTypeToUse = damageInfo.type || DamageType.PROJECTILE;
            }
            
            // Apply damage threshold
            if (damageInfo.amount <= this.damageThreshold) {
                if (this.debug) {
                    this.logger.debug(`Damage ${damageInfo.amount} below threshold ${this.damageThreshold}, no effect`);
                }
                return false;
            }
            
            // Apply damage multiplier if applicable
            let finalDamage = damageInfo.amount;
            
            if (this.damageMultipliers[damageTypeToUse]) {
                finalDamage *= this.damageMultipliers[damageTypeToUse] || 1;
            }
            
            // Apply critical hit if enabled
            let isCritical = false;
            if (this.enableCriticalHits && !damageInfo.isCritical) {
                isCritical = Math.random() < this.criticalHitChance;
                if (isCritical) {
                    finalDamage *= this.criticalHitMultiplier;
                    damageInfo.isCritical = true;
                }
            } else if (damageInfo.isCritical) {
                // If damage info already specifies a critical hit
                isCritical = true;
            }
            
            // Apply damage
            this.currentHealth = Math.max(0, this.currentHealth - finalDamage);
            this.totalDamageTaken += finalDamage;
            this.lastDamageTime = damageInfo.timestamp || Date.now();
            
            // Add to damage history
            this.damageHistory.push({
                ...damageInfo,
                amount: finalDamage
            });
            
            // Limit history size to prevent memory issues
            if (this.damageHistory.length > 10) {
                this.damageHistory.shift();
            }
            
            if (this.debug) {
                this.logger.debug(
                    `Target took ${finalDamage.toFixed(1)} damage` + 
                    (isCritical ? ' (CRITICAL)' : '') + 
                    ` of type ${damageTypeToUse}, health: ${this.currentHealth.toFixed(1)}/${this.maxHealth}`
                );
            }
            
            // Call damage callback
            if (this.onDamageCallback) {
                this.onDamageCallback(finalDamage, this.currentHealth, damageInfo);
            }
            
            // Check if destroyed
            if (this.currentHealth <= 0) {
                if (this.debug) {
                    this.logger.debug('Target destroyed');
                }
                
                // Call destroy callback
                if (this.onDestroyCallback) {
                    this.onDestroyCallback();
                }
                
                return true;
            }
            
            return false;
        } catch (error) {
            this.logger.error(`Error taking damage: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }
    
    /**
     * Heal the target
     * @param amount Amount to heal
     * @returns Actual amount healed
     */
    public heal(amount: number): number {
        if (amount <= 0 || this.currentHealth <= 0) {
            return 0;
        }
        
        try {
            const oldHealth = this.currentHealth;
            this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
            const actualHealAmount = this.currentHealth - oldHealth;
            
            if (this.debug) {
                this.logger.debug(`Target healed ${actualHealAmount.toFixed(1)}, health: ${this.currentHealth.toFixed(1)}/${this.maxHealth}`);
            }
            
            return actualHealAmount;
        } catch (error) {
            this.logger.error(`Error healing: ${error instanceof Error ? error.message : String(error)}`);
            return 0;
        }
    }
    
    /**
     * Get the current health
     * @returns Current health
     */
    public getCurrentHealth(): number {
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
     * Set the current health
     * @param health New health value
     */
    public setCurrentHealth(health: number): void {
        this.currentHealth = Math.max(0, Math.min(this.maxHealth, health));
    }
    
    /**
     * Set the maximum health
     * @param maxHealth New maximum health value
     * @param adjustCurrentHealth Whether to adjust current health proportionally
     */
    public setMaxHealth(maxHealth: number, adjustCurrentHealth: boolean = true): void {
        if (maxHealth <= 0) {
            this.logger.warn('Attempted to set max health to a value <= 0, ignoring');
            return;
        }
        
        const ratio = this.currentHealth / this.maxHealth;
        this.maxHealth = maxHealth;
        
        if (adjustCurrentHealth) {
            this.currentHealth = Math.min(this.maxHealth, this.maxHealth * ratio);
        } else {
            this.currentHealth = Math.min(this.currentHealth, this.maxHealth);
        }
    }
    
    /**
     * Get the health percentage
     * @returns Health percentage (0-1)
     */
    public getHealthPercentage(): number {
        return this.currentHealth / this.maxHealth;
    }
    
    /**
     * Check if the target is destroyed
     * @returns Whether the target is destroyed
     */
    public isDestroyed(): boolean {
        return this.currentHealth <= 0;
    }
    
    /**
     * Set invulnerability
     * @param invulnerable Whether the target is invulnerable
     */
    public setInvulnerable(invulnerable: boolean): void {
        this.invulnerable = invulnerable;
    }
    
    /**
     * Check if the target is invulnerable
     * @returns Whether the target is invulnerable
     */
    public isInvulnerable(): boolean {
        return this.invulnerable;
    }
    
    /**
     * Set a damage multiplier
     * @param damageType Type of damage
     * @param multiplier Damage multiplier
     */
    public setDamageMultiplier(damageType: DamageType, multiplier: number): void {
        this.damageMultipliers[damageType] = multiplier;
    }
    
    /**
     * Get a damage multiplier
     * @param damageType Type of damage
     * @returns Damage multiplier (1 if not set)
     */
    public getDamageMultiplier(damageType: DamageType): number {
        return this.damageMultipliers[damageType] || 1;
    }
    
    /**
     * Get the damage history
     * @returns Array of damage info objects
     */
    public getDamageHistory(): DamageInfo[] {
        return [...this.damageHistory];
    }
    
    /**
     * Get the total damage taken
     * @returns Total damage taken
     */
    public getTotalDamageTaken(): number {
        return this.totalDamageTaken;
    }
    
    /**
     * Get the time since last damage
     * @returns Time in milliseconds since last damage
     */
    public getTimeSinceLastDamage(): number {
        return this.lastDamageTime > 0 ? Date.now() - this.lastDamageTime : -1;
    }
    
    /**
     * Serialize the health state
     * @returns Serialized health state
     */
    public serialize(): HealthState {
        return {
            currentHealth: this.currentHealth,
            maxHealth: this.maxHealth,
            invulnerable: this.invulnerable,
            damageHistory: [...this.damageHistory]
        };
    }
    
    /**
     * Deserialize the health state
     * @param state Serialized health state
     */
    public deserialize(state: HealthState): void {
        this.currentHealth = state.currentHealth;
        this.maxHealth = state.maxHealth;
        this.invulnerable = state.invulnerable;
        this.damageHistory = [...state.damageHistory];
        
        if (this.damageHistory.length > 0) {
            this.lastDamageTime = this.damageHistory[this.damageHistory.length - 1].timestamp || 0;
            this.totalDamageTaken = this.damageHistory.reduce((total, info) => total + info.amount, 0);
        }
    }
    
    /**
     * Reset the health component
     */
    public reset(): void {
        this.currentHealth = this.maxHealth;
        this.damageHistory = [];
        this.lastDamageTime = 0;
        this.totalDamageTaken = 0;
    }
    
    /**
     * Clean up resources
     */
    public override dispose(): void {
        if (this.debug) {
            this.logger.debug('Disposing target health component');
        }
        
        // Clear callbacks
        this.onDamageCallback = undefined;
        this.onDestroyCallback = undefined;
        
        super.dispose();
    }
} 