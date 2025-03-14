/**
 * SpinfusorWeapon.ts
 * Spinfusor weapon component implementation
 */

import { WeaponComponent } from './WeaponComponent';
import { Vector3 } from '../../types/common/Vector3';
import { WeaponType, AmmoType, WeaponOptions } from './IWeapon';
import { ProjectileEntity } from '../../entities/ProjectileEntity';
import { Logger } from '../../utils/Logger';
import { GameConstants } from '../../config/Constants';

/**
 * Spinfusor weapon options
 */
export interface SpinfusorOptions extends Partial<WeaponOptions> {
    /**
     * Disc size (radius)
     */
    discSize?: number;
    
    /**
     * Disc color
     */
    discColor?: string;
    
    /**
     * Whether discs should glow
     */
    discGlow?: boolean;
    
    /**
     * Explosion effect path
     */
    explosionEffect?: string;
}

/**
 * Default spinfusor options
 */
const DEFAULT_SPINFUSOR_OPTIONS: WeaponOptions = {
    type: WeaponType.SPINFUSOR,
    ammoType: AmmoType.DISC,
    maxAmmo: 20,
    damage: 100,
    projectileSpeed: 50,
    projectileLifetime: 10,
    projectileSize: 0.5,
    explosionRadius: 5,
    impulseForce: 2000,
    fireRate: 1.0, // 1 shot per second
    reloadTime: 1.5,
    sounds: {
        fire: 'sounds/weapons/spinfusor_fire.mp3',
        reload: 'sounds/weapons/spinfusor_reload.mp3',
        empty: 'sounds/weapons/spinfusor_empty.mp3',
        impact: 'sounds/weapons/spinfusor_impact.mp3'
    }
};

/**
 * Spinfusor weapon component
 */
export class SpinfusorWeapon extends WeaponComponent {
    private discSize: number;
    private discColor: string;
    private discGlow: boolean;
    private explosionEffect?: string;
    
    /**
     * Create a new spinfusor weapon component
     * @param options Spinfusor options
     */
    constructor(options: SpinfusorOptions = {}) {
        // Merge default options with provided options
        const mergedOptions: WeaponOptions = {
            ...DEFAULT_SPINFUSOR_OPTIONS,
            ...options
        };
        
        super(mergedOptions);
        
        // Initialize spinfusor-specific properties
        this.discSize = options.discSize || 0.5;
        this.discColor = options.discColor || '#00AAFF';
        this.discGlow = options.discGlow !== undefined ? options.discGlow : true;
        this.explosionEffect = options.explosionEffect;
        
        this.logger = new Logger('SpinfusorWeapon');
        this.logger.debug('Spinfusor weapon created');
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
            const offsetOrigin = origin.clone().add(normalizedDirection.clone().scale(1.5));
            
            // Create the projectile entity
            const projectile = new ProjectileEntity({
                position: offsetOrigin,
                direction: normalizedDirection,
                speed: this.projectileSpeed,
                lifetime: this.projectileLifetime,
                size: this.projectileSize,
                damage: this.damage,
                explosionRadius: this.explosionRadius,
                impulseForce: this.impulseForce,
                ownerEntityId: this.entity?.id,
                modelOptions: {
                    type: 'disc',
                    size: this.discSize,
                    color: this.discColor,
                    glow: this.discGlow
                },
                // Add physics options for disc projectiles
                affectedByGravity: false, // Discs are not affected by gravity
                bounces: true, // Discs can bounce off surfaces
                maxBounces: 3, // Maximum number of bounces
                bounceFactor: 0.7, // Bounce factor (70% energy retention)
                projectileType: 'disc', // Specify projectile type
                dragCoefficient: 0.3, // Moderate drag
                liftCoefficient: 0.4, // Generates lift
                spinRate: 10.0 // Spins rapidly
            });
            
            // Set projectile name
            projectile.name = `Disc_${Date.now()}`;
            
            // Add the projectile to the game world
            if (GameConstants.GAME_WORLD) {
                GameConstants.GAME_WORLD.addEntity(projectile);
                this.logger.debug(`Created disc projectile: ${projectile.id}`);
            } else {
                this.logger.error('Cannot create projectile: GAME_WORLD is not defined');
            }
        } catch (error) {
            this.logger.error(`Error creating projectile: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
} 