/**
 * WeaponComponent.ts
 * Base weapon component implementation
 */

import { Component } from '../Component';
import { IEntity } from '../../entities/IEntity';
import { Vector3 } from '../../types/common/Vector3';
import { Logger } from '../../utils/Logger';
import { EventSystem } from '../../core/EventSystem';
import { GameEventType } from '../../types/events/EventTypes';
import { IWeapon, WeaponState, WeaponType, AmmoType, WeaponOptions } from './IWeapon';

/**
 * Base weapon component
 */
export class WeaponComponent extends Component implements IWeapon {
    protected logger: Logger;
    protected eventSystem: EventSystem;
    
    // Weapon properties
    protected type: WeaponType;
    protected ammoType: AmmoType;
    protected maxAmmo: number;
    protected currentAmmo: number;
    protected damage: number;
    protected projectileSpeed: number;
    protected projectileLifetime: number;
    protected projectileSize: number;
    protected explosionRadius: number;
    protected impulseForce: number;
    protected fireRate: number;
    protected reloadTime: number;
    protected modelPath?: string;
    protected sounds: {
        fire?: string;
        reload?: string;
        empty?: string;
        impact?: string;
    };
    
    // State tracking
    protected state: WeaponState = WeaponState.READY;
    protected lastFireTime: number = 0;
    protected reloadStartTime: number = 0;
    protected enabled: boolean = true;
    
    /**
     * Create a new weapon component
     * @param options Weapon options
     */
    constructor(options: WeaponOptions) {
        super('weapon');
        
        this.logger = new Logger(`WeaponComponent:${options.type}`);
        this.eventSystem = EventSystem.getInstance();
        
        // Initialize properties from options
        this.type = options.type;
        this.ammoType = options.ammoType;
        this.maxAmmo = options.maxAmmo;
        this.currentAmmo = options.currentAmmo !== undefined ? options.currentAmmo : options.maxAmmo;
        this.damage = options.damage;
        this.projectileSpeed = options.projectileSpeed;
        this.projectileLifetime = options.projectileLifetime;
        this.projectileSize = options.projectileSize;
        this.explosionRadius = options.explosionRadius || 0;
        this.impulseForce = options.impulseForce || 0;
        this.fireRate = options.fireRate;
        this.reloadTime = options.reloadTime;
        this.modelPath = options.modelPath;
        this.sounds = options.sounds || {};
        this.enabled = options.enabled !== undefined ? options.enabled : true;
        
        this.logger.debug(`Created ${this.type} weapon component`);
    }
    
    /**
     * Initialize the component
     * @param entity The entity this component belongs to
     */
    public override init(entity: IEntity): void {
        super.init(entity);
        this.logger.debug(`Initialized ${this.type} weapon component for entity ${entity.id}`);
    }
    
    /**
     * Get the weapon type
     * @returns Weapon type
     */
    public getWeaponType(): WeaponType {
        return this.type;
    }
    
    /**
     * Get the ammo type
     * @returns Ammo type
     */
    public getAmmoType(): AmmoType {
        return this.ammoType;
    }
    
    /**
     * Get the current weapon state
     * @returns Weapon state
     */
    public getState(): WeaponState {
        return this.state;
    }
    
    /**
     * Get the current ammo count
     * @returns Current ammo count
     */
    public getCurrentAmmo(): number {
        return this.currentAmmo;
    }
    
    /**
     * Get the maximum ammo capacity
     * @returns Maximum ammo capacity
     */
    public getMaxAmmo(): number {
        return this.maxAmmo;
    }
    
    /**
     * Get the damage per projectile/shot
     * @returns Damage per projectile/shot
     */
    public getDamage(): number {
        return this.damage;
    }
    
    /**
     * Get the fire rate (shots per second)
     * @returns Fire rate
     */
    public getFireRate(): number {
        return this.fireRate;
    }
    
    /**
     * Get the reload time (seconds)
     * @returns Reload time
     */
    public getReloadTime(): number {
        return this.reloadTime;
    }
    
    /**
     * Check if the weapon is enabled
     * @returns Whether the weapon is enabled
     */
    public isEnabled(): boolean {
        return this.enabled;
    }
    
    /**
     * Enable or disable the weapon
     * @param enabled Whether the weapon is enabled
     */
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        
        if (!enabled && this.state === WeaponState.FIRING || this.state === WeaponState.RELOADING) {
            this.state = WeaponState.DISABLED;
        } else if (enabled && this.state === WeaponState.DISABLED) {
            this.state = WeaponState.READY;
        }
    }
    
    /**
     * Fire the weapon
     * @param origin Origin position
     * @param direction Direction vector
     * @returns Whether the weapon was fired
     */
    public fire(origin: Vector3, direction: Vector3): boolean {
        // Check if weapon can fire
        if (!this.canFire()) {
            if (this.currentAmmo <= 0) {
                this.playSound('empty');
                this.logger.debug('Cannot fire: out of ammo');
            } else {
                this.logger.debug(`Cannot fire: weapon state is ${this.state}`);
            }
            return false;
        }
        
        // Update state and ammo
        this.state = WeaponState.FIRING;
        this.lastFireTime = performance.now();
        this.currentAmmo--;
        
        // Play fire sound
        this.playSound('fire');
        
        // Create projectile (to be implemented by subclasses)
        this.createProjectile(origin, direction);
        
        // Emit weapon fired event
        this.eventSystem.emit(GameEventType.WEAPON_FIRED, {
            entityId: this.entity?.id,
            weaponType: this.type,
            origin: origin.clone(),
            direction: direction.clone(),
            projectileSpeed: this.projectileSpeed,
            damage: this.damage
        });
        
        this.logger.debug(`Fired weapon (${this.currentAmmo}/${this.maxAmmo} ammo remaining)`);
        return true;
    }
    
    /**
     * Create a projectile
     * @param origin Origin position
     * @param direction Direction vector
     */
    protected createProjectile(origin: Vector3, direction: Vector3): void {
        // To be implemented by subclasses
        this.logger.warn('createProjectile not implemented in base WeaponComponent');
    }
    
    /**
     * Check if the weapon can fire
     * @returns Whether the weapon can fire
     */
    protected canFire(): boolean {
        // Check if weapon is enabled and ready
        if (!this.enabled) return false;
        if (this.state !== WeaponState.READY) return false;
        
        // Check if we have ammo
        if (this.currentAmmo <= 0) return false;
        
        // Check fire rate cooldown
        const now = performance.now();
        const timeSinceLastFire = (now - this.lastFireTime) / 1000; // Convert to seconds
        if (timeSinceLastFire < (1 / this.fireRate)) return false;
        
        return true;
    }
    
    /**
     * Reload the weapon
     * @returns Whether the reload was started
     */
    public reload(): boolean {
        // Check if reload is possible
        if (!this.canReload()) {
            this.logger.debug(`Cannot reload: weapon state is ${this.state} or ammo is full`);
            return false;
        }
        
        // Start reload
        this.state = WeaponState.RELOADING;
        this.reloadStartTime = performance.now();
        
        // Play reload sound
        this.playSound('reload');
        
        // Emit reload started event
        this.eventSystem.emit(GameEventType.WEAPON_RELOAD_STARTED, {
            entityId: this.entity?.id,
            weaponType: this.type,
            reloadTime: this.reloadTime
        });
        
        this.logger.debug('Started reloading weapon');
        return true;
    }
    
    /**
     * Check if the weapon can be reloaded
     * @returns Whether the weapon can be reloaded
     */
    protected canReload(): boolean {
        // Check if weapon is enabled
        if (!this.enabled) return false;
        
        // Check if already reloading
        if (this.state === WeaponState.RELOADING) return false;
        
        // Check if ammo is already full
        if (this.currentAmmo >= this.maxAmmo) return false;
        
        return true;
    }
    
    /**
     * Complete the reload
     */
    protected completeReload(): void {
        // Restore ammo
        this.currentAmmo = this.maxAmmo;
        
        // Update state
        this.state = WeaponState.READY;
        
        // Emit reload completed event
        this.eventSystem.emit(GameEventType.WEAPON_RELOAD_COMPLETED, {
            entityId: this.entity?.id,
            weaponType: this.type,
            currentAmmo: this.currentAmmo,
            maxAmmo: this.maxAmmo
        });
        
        this.logger.debug('Completed reloading weapon');
    }
    
    /**
     * Play a sound effect
     * @param soundType Type of sound to play
     */
    protected playSound(soundType: 'fire' | 'reload' | 'empty' | 'impact'): void {
        const soundPath = this.sounds[soundType];
        if (soundPath) {
            // In a real implementation, this would play the sound
            // For now, just log it
            this.logger.debug(`Playing ${soundType} sound: ${soundPath}`);
        }
    }
    
    /**
     * Update the weapon
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        // Skip update if disabled
        if (!this.enabled) return;
        
        // Handle state transitions
        switch (this.state) {
            case WeaponState.FIRING:
                // Check if fire cooldown is complete
                const timeSinceLastFire = (performance.now() - this.lastFireTime) / 1000;
                if (timeSinceLastFire >= (1 / this.fireRate)) {
                    this.state = WeaponState.READY;
                }
                break;
                
            case WeaponState.RELOADING:
                // Check if reload is complete
                const reloadElapsed = (performance.now() - this.reloadStartTime) / 1000;
                if (reloadElapsed >= this.reloadTime) {
                    this.completeReload();
                }
                break;
        }
    }
    
    /**
     * Clean up resources
     */
    public override dispose(): void {
        this.logger.debug(`Disposing ${this.type} weapon component`);
        super.dispose();
    }
} 