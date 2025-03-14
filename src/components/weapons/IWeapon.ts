/**
 * IWeapon.ts
 * Interface for weapon components
 */

import { IEntity } from '../../entities/IEntity';
import { Vector3 } from '../../types/common/Vector3';

/**
 * Weapon state
 */
export enum WeaponState {
    READY = 'ready',
    FIRING = 'firing',
    RELOADING = 'reloading',
    SWITCHING = 'switching',
    DISABLED = 'disabled'
}

/**
 * Weapon type
 */
export enum WeaponType {
    SPINFUSOR = 'spinfusor',
    GRENADE_LAUNCHER = 'grenade_launcher',
    CHAINGUN = 'chaingun',
    BLASTER = 'blaster',
    SNIPER_RIFLE = 'sniper_rifle'
}

/**
 * Weapon ammo type
 */
export enum AmmoType {
    DISC = 'disc',
    GRENADE = 'grenade',
    BULLET = 'bullet',
    ENERGY = 'energy'
}

/**
 * Weapon options
 */
export interface WeaponOptions {
    /**
     * Weapon type
     */
    type: WeaponType;
    
    /**
     * Ammo type
     */
    ammoType: AmmoType;
    
    /**
     * Maximum ammo capacity
     */
    maxAmmo: number;
    
    /**
     * Current ammo count
     */
    currentAmmo?: number;
    
    /**
     * Damage per projectile/shot
     */
    damage: number;
    
    /**
     * Projectile speed (units per second)
     */
    projectileSpeed: number;
    
    /**
     * Projectile lifetime (seconds)
     */
    projectileLifetime: number;
    
    /**
     * Projectile size (radius)
     */
    projectileSize: number;
    
    /**
     * Explosion radius (for explosive weapons)
     */
    explosionRadius?: number;
    
    /**
     * Impulse force applied to hit entities
     */
    impulseForce?: number;
    
    /**
     * Fire rate (shots per second)
     */
    fireRate: number;
    
    /**
     * Reload time (seconds)
     */
    reloadTime: number;
    
    /**
     * Weapon model path
     */
    modelPath?: string;
    
    /**
     * Weapon sound effects
     */
    sounds?: {
        fire?: string;
        reload?: string;
        empty?: string;
        impact?: string;
    };
    
    /**
     * Whether the weapon is enabled
     */
    enabled?: boolean;
}

/**
 * Interface for weapon components
 */
export interface IWeapon {
    /**
     * Get the weapon type
     * @returns Weapon type
     */
    getWeaponType(): WeaponType;
    
    /**
     * Get the ammo type
     * @returns Ammo type
     */
    getAmmoType(): AmmoType;
    
    /**
     * Get the current weapon state
     * @returns Weapon state
     */
    getState(): WeaponState;
    
    /**
     * Get the current ammo count
     * @returns Current ammo count
     */
    getCurrentAmmo(): number;
    
    /**
     * Get the maximum ammo capacity
     * @returns Maximum ammo capacity
     */
    getMaxAmmo(): number;
    
    /**
     * Get the damage per projectile/shot
     * @returns Damage per projectile/shot
     */
    getDamage(): number;
    
    /**
     * Get the fire rate (shots per second)
     * @returns Fire rate
     */
    getFireRate(): number;
    
    /**
     * Get the reload time (seconds)
     * @returns Reload time
     */
    getReloadTime(): number;
    
    /**
     * Check if the weapon is enabled
     * @returns Whether the weapon is enabled
     */
    isEnabled(): boolean;
    
    /**
     * Enable or disable the weapon
     * @param enabled Whether the weapon is enabled
     */
    setEnabled(enabled: boolean): void;
    
    /**
     * Fire the weapon
     * @param origin Origin position
     * @param direction Direction vector
     * @returns Whether the weapon was fired
     */
    fire(origin: Vector3, direction: Vector3): boolean;
    
    /**
     * Reload the weapon
     * @returns Whether the reload was started
     */
    reload(): boolean;
    
    /**
     * Update the weapon
     * @param deltaTime Time since last update
     */
    update(deltaTime: number): void;
} 