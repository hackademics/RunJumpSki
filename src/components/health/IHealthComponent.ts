/**
 * IHealthComponent.ts
 * Interface for health components
 */

import { IComponent } from '../IComponent';

/**
 * Interface for health components
 */
export interface IHealthComponent extends IComponent {
    /**
     * Get the current health
     * @returns Current health
     */
    getHealth(): number;
    
    /**
     * Get the maximum health
     * @returns Maximum health
     */
    getMaxHealth(): number;
    
    /**
     * Set the current health
     * @param health New health value
     */
    setHealth(health: number): void;
    
    /**
     * Set the maximum health
     * @param maxHealth New maximum health value
     */
    setMaxHealth(maxHealth: number): void;
    
    /**
     * Apply damage to the entity
     * @param amount Amount of damage to apply
     * @param source Source of the damage (optional)
     * @returns Remaining health after damage
     */
    takeDamage(amount: number, source?: string): number;
    
    /**
     * Apply healing to the entity
     * @param amount Amount of healing to apply
     * @param source Source of the healing (optional)
     * @returns New health after healing
     */
    heal(amount: number, source?: string): number;
    
    /**
     * Check if the entity is alive
     * @returns Whether the entity is alive
     */
    isAlive(): boolean;
    
    /**
     * Kill the entity
     * @param source Source of the kill (optional)
     */
    kill(source?: string): void;
    
    /**
     * Revive the entity
     * @param health Health to revive with (defaults to max health)
     */
    revive(health?: number): void;
} 