/**
 * GrenadeWeapon.ts
 * Grenade launcher weapon component implementation
 */

import { WeaponComponent } from './WeaponComponent';
import { Vector3 } from '../../types/common/Vector3';
import { WeaponType, AmmoType, WeaponOptions } from './IWeapon';
import { ProjectileEntity } from '../../entities/ProjectileEntity';
import { Logger } from '../../utils/Logger';
import { GameConstants } from '../../config/Constants';
import { EventSystem } from '../../core/EventSystem';
import { GameEventType } from '../../types/events/EventTypes';

/**
 * Grenade weapon options
 */
export interface GrenadeOptions extends Partial<WeaponOptions> {
    /**
     * Grenade size (radius)
     */
    grenadeSize?: number;
    
    /**
     * Grenade color
     */
    grenadeColor?: string;
    
    /**
     * Fuse time in seconds (0 for impact detonation)
     */
    fuseTime?: number;
    
    /**
     * Whether grenades should bounce
     */
    bounces?: boolean;
    
    /**
     * Maximum number of bounces before detonation
     */
    maxBounces?: number;
    
    /**
     * Explosion effect path
     */
    explosionEffect?: string;
}

/**
 * Default grenade launcher options
 */
const DEFAULT_GRENADE_OPTIONS: WeaponOptions = {
    type: WeaponType.GRENADE_LAUNCHER,
    ammoType: AmmoType.GRENADE,
    maxAmmo: 10,
    damage: GameConstants.GRENADE_DAMAGE,
    projectileSpeed: GameConstants.GRENADE_THROW_SPEED,
    projectileLifetime: 10,
    projectileSize: 0.3,
    explosionRadius: GameConstants.GRENADE_EXPLOSION_RADIUS,
    impulseForce: GameConstants.GRENADE_IMPULSE_FORCE,
    fireRate: 0.8, // 0.8 shots per second
    reloadTime: 2.0,
    sounds: {
        fire: 'sounds/weapons/grenade_fire.mp3',
        reload: 'sounds/weapons/grenade_reload.mp3',
        empty: 'sounds/weapons/grenade_empty.mp3',
        impact: 'sounds/weapons/grenade_impact.mp3'
    }
};

/**
 * Grenade weapon component
 */
export class GrenadeWeapon extends WeaponComponent {
    private grenadeSize: number;
    private grenadeColor: string;
    private fuseTime: number;
    private bounces: boolean;
    private maxBounces: number;
    private explosionEffect?: string;
    protected eventSystem: EventSystem;
    
    /**
     * Create a new grenade weapon component
     * @param options Grenade options
     */
    constructor(options: GrenadeOptions = {}) {
        // Merge default options with provided options
        const mergedOptions: WeaponOptions = {
            ...DEFAULT_GRENADE_OPTIONS,
            ...options
        };
        
        super(mergedOptions);
        
        // Initialize grenade-specific properties
        this.grenadeSize = options.grenadeSize || 0.3;
        this.grenadeColor = options.grenadeColor || '#FF5500';
        this.fuseTime = options.fuseTime !== undefined ? options.fuseTime : GameConstants.GRENADE_FUSE_TIME;
        this.bounces = options.bounces !== undefined ? options.bounces : true;
        this.maxBounces = options.maxBounces !== undefined ? options.maxBounces : GameConstants.GRENADE_MAX_BOUNCES;
        this.explosionEffect = options.explosionEffect;
        this.eventSystem = EventSystem.getInstance();
        
        this.logger = new Logger('GrenadeWeapon');
        this.logger.debug('Grenade weapon created');
    }
    
    /**
     * Create a projectile
     * @param origin Origin position
     * @param direction Direction vector
     */
    protected override createProjectile(origin: Vector3, direction: Vector3): void {
        try {
            // Create a normalized direction vector
            const normalizedDirection = direction.clone().normalize();
            
            // Create a slightly offset origin to avoid collision with the player
            const offsetOrigin = origin.clone().add(normalizedDirection.clone().scale(1.0));
            
            // Add a slight upward angle to the throw
            const throwDirection = normalizedDirection.clone();
            throwDirection.y += 0.2; // Add a slight upward angle
            throwDirection.normalize();
            
            // Create the projectile entity
            const projectile = new ProjectileEntity({
                position: offsetOrigin,
                direction: throwDirection,
                speed: this.projectileSpeed,
                lifetime: this.fuseTime > 0 ? this.fuseTime : this.projectileLifetime,
                size: this.projectileSize,
                damage: this.damage,
                explosionRadius: this.explosionRadius,
                impulseForce: this.impulseForce,
                ownerEntityId: this.entity?.id !== undefined ? String(this.entity.id) : undefined,
                modelOptions: {
                    type: 'grenade',
                    size: this.grenadeSize,
                    color: this.grenadeColor,
                    glow: false,
                    fuseTime: this.fuseTime,
                    secondaryColor: '#FFFF00' // Yellow warning color
                },
                // Add physics options for grenade projectiles
                affectedByGravity: true, // Grenades are affected by gravity
                bounces: this.bounces, // Grenades can bounce off surfaces
                maxBounces: this.maxBounces, // Maximum number of bounces
                bounceFactor: GameConstants.GRENADE_BOUNCE_FACTOR, // Bounce factor (50% energy retention)
                projectileType: 'grenade', // Specify projectile type
                dragCoefficient: 0.5, // Higher drag for grenades
                liftCoefficient: 0.0, // No lift for grenades
                spinRate: 2.0 // Slow tumbling
            });
            
            // Set projectile name
            projectile.name = `Grenade_${Date.now()}`;
            
            // Register for detonation if using a fuse timer
            if (this.fuseTime > 0) {
                this.scheduleDetonation(String(projectile.id), this.fuseTime);
            }
            
            // Add the projectile to the game world
            if (GameConstants.GAME_WORLD) {
                GameConstants.GAME_WORLD.addEntity(projectile);
                this.logger.debug(`Created grenade projectile: ${projectile.id}`);
            } else {
                this.logger.error('Cannot create projectile: GAME_WORLD is not defined');
            }
        } catch (error) {
            this.logger.error(`Error creating projectile: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Schedule detonation of a grenade after the fuse time
     * @param projectileId ID of the projectile to detonate
     * @param fuseTime Time in seconds before detonation
     */
    private scheduleDetonation(projectileId: string, fuseTime: number): void {
        // In a real implementation, we would use a timer system
        // For now, we'll just use setTimeout
        setTimeout(() => {
            try {
                // Find the projectile in the game world
                if (GameConstants.GAME_WORLD) {
                    const projectile = GameConstants.GAME_WORLD.getEntityById(projectileId);
                    
                    if (projectile && projectile instanceof ProjectileEntity) {
                        // Get the current position
                        const position = projectile.transform.position.clone();
                        
                        // Emit explosion event
                        this.eventSystem.emit(GameEventType.EXPLOSION, {
                            position: position,
                            radius: this.explosionRadius,
                            damage: this.damage,
                            impulseForce: this.impulseForce,
                            ownerEntityId: this.entity?.id !== undefined ? String(this.entity.id) : undefined
                        });
                        
                        // Mark the projectile for removal
                        projectile.markForRemoval();
                        
                        this.logger.debug(`Grenade detonated at ${position.toString()}`);
                    } else {
                        this.logger.debug(`Projectile ${projectileId} not found or already removed`);
                    }
                }
            } catch (error) {
                this.logger.error(`Error detonating grenade: ${error instanceof Error ? error.message : String(error)}`);
            }
        }, fuseTime * 1000);
    }
} 