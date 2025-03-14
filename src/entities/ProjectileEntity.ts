/**
 * ProjectileEntity.ts
 * Entity representing a projectile in the game world
 */

import { Entity } from './Entity';
import { Vector3 } from '../types/common/Vector3';
import { Logger } from '../utils/Logger';
import { EventSystem } from '../core/EventSystem';
import { GameEventType } from '../types/events/EventTypes';
import { IPhysicsComponent } from '../components/physics/IPhysicsComponent';
import { ProjectilePhysicsComponent } from '../components/physics/ProjectilePhysicsComponent';
import { ProjectileVisualComponent } from '../components/visual/ProjectileVisualComponent';

/**
 * Projectile model options
 */
export interface ProjectileModelOptions {
    /**
     * Type of projectile model
     */
    type: 'disc' | 'grenade' | 'bullet' | 'energy';
    
    /**
     * Size of the projectile
     */
    size: number;
    
    /**
     * Color of the projectile
     */
    color: string;
    
    /**
     * Whether the projectile should glow
     */
    glow?: boolean;
    
    /**
     * Texture path for the projectile
     */
    texturePath?: string;
    
    /**
     * Fuse time for grenades (seconds)
     * If > 0, will cause blinking effect as detonation approaches
     */
    fuseTime?: number;
    
    /**
     * Secondary color for blinking effect
     */
    secondaryColor?: string;
}

/**
 * Projectile entity options
 */
export interface ProjectileEntityOptions {
    /**
     * Initial position
     */
    position: Vector3;
    
    /**
     * Direction vector
     */
    direction: Vector3;
    
    /**
     * Speed in units per second
     */
    speed: number;
    
    /**
     * Lifetime in seconds
     */
    lifetime: number;
    
    /**
     * Size (radius) of the projectile
     */
    size: number;
    
    /**
     * Damage dealt on impact
     */
    damage: number;
    
    /**
     * Explosion radius (0 for no explosion)
     */
    explosionRadius?: number;
    
    /**
     * Impulse force applied to hit entities
     */
    impulseForce?: number;
    
    /**
     * Entity ID of the owner
     */
    ownerEntityId?: string;
    
    /**
     * Model options for visualization
     */
    modelOptions?: ProjectileModelOptions;
    
    /**
     * Whether the projectile is affected by gravity
     */
    affectedByGravity?: boolean;
    
    /**
     * Whether the projectile bounces off surfaces
     */
    bounces?: boolean;
    
    /**
     * Maximum number of bounces (if bounces is true)
     */
    maxBounces?: number;
    
    /**
     * Bounce factor (0-1) for velocity retention
     */
    bounceFactor?: number;
    
    /**
     * Projectile type
     */
    projectileType?: 'disc' | 'grenade' | 'bullet' | 'energy';
    
    /**
     * Drag coefficient (air resistance)
     */
    dragCoefficient?: number;
    
    /**
     * Lift coefficient (for disc-like projectiles)
     */
    liftCoefficient?: number;
    
    /**
     * Spin rate in radians per second
     */
    spinRate?: number;
    
    /**
     * Spin axis (normalized vector)
     */
    spinAxis?: Vector3;
}

/**
 * Entity representing a projectile in the game world
 */
export class ProjectileEntity extends Entity {
    // Use protected instead of private for logger to avoid conflict with base class
    protected projectileLogger: Logger;
    private eventSystem: EventSystem;
    
    private speed: number;
    private lifetime: number;
    private damage: number;
    private explosionRadius: number;
    private impulseForce: number;
    private ownerEntityId?: string;
    private creationTime: number;
    private hasExploded: boolean = false;
    private markedForRemoval: boolean = false;
    
    /**
     * Create a new projectile entity
     * @param options Projectile options
     */
    constructor(options: ProjectileEntityOptions) {
        super();
        
        this.projectileLogger = new Logger('ProjectileEntity');
        this.eventSystem = EventSystem.getInstance();
        
        // Set transform from options
        this.transform.position = options.position.clone();
        
        // Store projectile properties
        this.speed = options.speed;
        this.lifetime = options.lifetime;
        this.damage = options.damage;
        this.explosionRadius = options.explosionRadius || 0;
        this.impulseForce = options.impulseForce || 0;
        this.ownerEntityId = options.ownerEntityId;
        this.creationTime = performance.now();
        
        // Create physics component
        const physicsComponent = new ProjectilePhysicsComponent({
            direction: options.direction,
            speed: options.speed,
            size: options.size,
            affectedByGravity: options.affectedByGravity || false,
            bounces: options.bounces || false,
            maxBounces: options.maxBounces || 0,
            bounceFactor: options.bounceFactor || 0.5,
            onCollision: this.handleCollision.bind(this),
            projectileType: options.projectileType,
            dragCoefficient: options.dragCoefficient,
            liftCoefficient: options.liftCoefficient,
            spinRate: options.spinRate,
            spinAxis: options.spinAxis
        });
        
        this.addComponent('physics', physicsComponent as any);
        
        // Create visual component if model options are provided
        if (options.modelOptions) {
            const visualComponent = new ProjectileVisualComponent({
                type: options.modelOptions.type,
                size: options.modelOptions.size,
                color: options.modelOptions.color,
                glow: options.modelOptions.glow,
                texturePath: options.modelOptions.texturePath,
                fuseTime: options.modelOptions.fuseTime,
                secondaryColor: options.modelOptions.secondaryColor,
                trail: {
                    enabled: true,
                    length: 0.5,
                    color: options.modelOptions.color,
                    width: options.modelOptions.size * 0.5
                }
            });
            
            this.addComponent('visual', visualComponent as any);
        }
        
        this.projectileLogger.debug(`Created projectile entity with speed ${this.speed} and damage ${this.damage}`);
    }
    
    /**
     * Handle collision with another entity or the environment
     * @param hitEntityId ID of the entity that was hit, or undefined for environment
     * @param hitPoint Point of impact
     * @param hitNormal Normal vector at the point of impact
     */
    private handleCollision(hitEntityId: string | undefined, hitPoint: Vector3, hitNormal: Vector3): void {
        // Skip if already exploded
        if (this.hasExploded) return;
        
        try {
            // Skip if we hit our owner
            if (hitEntityId === this.ownerEntityId) {
                this.projectileLogger.debug('Projectile hit owner, ignoring collision');
                return;
            }
            
            this.projectileLogger.debug(`Projectile collision at ${hitPoint.toString()}`);
            
            // Mark as exploded
            this.hasExploded = true;
            
            // Emit hit event
            this.eventSystem.emit(GameEventType.PROJECTILE_HIT, {
                projectileId: this.id,
                ownerEntityId: this.ownerEntityId,
                hitEntityId,
                hitPoint: hitPoint.clone(),
                hitNormal: hitNormal.clone(),
                damage: this.damage,
                explosionRadius: this.explosionRadius,
                impulseForce: this.impulseForce
            });
            
            // Handle explosion if radius > 0
            if (this.explosionRadius > 0) {
                this.explode(hitPoint);
            }
            
            // Destroy the projectile
            this.destroy();
        } catch (error) {
            this.projectileLogger.error(`Error handling collision: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Create an explosion at the specified point
     * @param position Explosion center position
     */
    private explode(position: Vector3): void {
        try {
            this.projectileLogger.debug(`Explosion at ${position.toString()} with radius ${this.explosionRadius}`);
            
            // Emit explosion event
            this.eventSystem.emit(GameEventType.EXPLOSION, {
                position: position.clone(),
                radius: this.explosionRadius,
                damage: this.damage,
                impulseForce: this.impulseForce,
                ownerEntityId: this.ownerEntityId
            });
        } catch (error) {
            this.projectileLogger.error(`Error creating explosion: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Update the projectile
     * @param deltaTime Time since last update in seconds
     */
    public override update(deltaTime: number): void {
        super.update(deltaTime);
        
        // Check lifetime
        const now = performance.now();
        const age = (now - this.creationTime) / 1000; // Convert to seconds
        
        if (age >= this.lifetime && !this.hasExploded) {
            this.projectileLogger.debug(`Projectile reached end of lifetime (${this.lifetime}s)`);
            this.destroy();
        }
    }
    
    /**
     * Destroy the projectile
     */
    private destroy(): void {
        // Mark for removal
        this.markForRemoval();
        
        // Emit destroyed event
        this.eventSystem.emit(GameEventType.PROJECTILE_DESTROYED, {
            projectileId: this.id,
            ownerEntityId: this.ownerEntityId
        });
    }
    
    /**
     * Mark the entity for removal
     */
    public markForRemoval(): void {
        this.markedForRemoval = true;
    }
    
    /**
     * Check if the entity is marked for removal
     * @returns Whether the entity is marked for removal
     */
    public isMarkedForRemoval(): boolean {
        return this.markedForRemoval;
    }
} 