/**
 * ProjectilePhysicsComponent.ts
 * Physics component for projectiles
 */

import { Component } from '../Component';
import { IEntity } from '../../entities/IEntity';
import { Vector3 } from '../../types/common/Vector3';
import { Logger } from '../../utils/Logger';
import { IPhysicsComponent } from './IPhysicsComponent';
import { GameConstants } from '../../config/Constants';
import { EventSystem } from '../../core/EventSystem';
import { GameEventType } from '../../types/events/EventTypes';

/**
 * Collision callback function type
 */
export type CollisionCallback = (hitEntityId: string | undefined, hitPoint: Vector3, hitNormal: Vector3) => void;

/**
 * Projectile physics options
 */
export interface ProjectilePhysicsOptions {
    /**
     * Direction vector
     */
    direction: Vector3;
    
    /**
     * Speed in units per second
     */
    speed: number;
    
    /**
     * Size (radius) of the projectile
     */
    size: number;
    
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
     * Callback function for collision events
     */
    onCollision?: CollisionCallback;
    
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
 * Physics component for projectiles
 */
export class ProjectilePhysicsComponent extends Component implements IPhysicsComponent {
    private logger: Logger;
    private eventSystem: EventSystem;
    
    private velocity: Vector3;
    private size: number;
    private affectedByGravity: boolean;
    private bounces: boolean;
    private maxBounces: number;
    private bounceFactor: number;
    private bounceCount: number = 0;
    private onCollision?: CollisionCallback;
    
    // Advanced physics properties
    private projectileType: 'disc' | 'grenade' | 'bullet' | 'energy';
    private dragCoefficient: number;
    private liftCoefficient: number;
    private spinRate: number;
    private spinAxis: Vector3;
    private rotation: number = 0; // Current rotation angle in radians
    private angularVelocity: Vector3; // Angular velocity vector
    
    // IPhysicsComponent properties
    private mass: number = 1;
    private isStatic: boolean = false;
    private useGravity: boolean = false;
    private friction: number = 0.1;
    private restitution: number = 0.5;
    private linearDamping: number = 0;
    private angularDamping: number = 0;
    private collisionEnabled: boolean = true;
    
    // Additional IPhysicsComponent properties
    private isKinematicEntity: boolean = false;
    
    /**
     * Create a new projectile physics component
     * @param options Projectile physics options
     */
    constructor(options: ProjectilePhysicsOptions) {
        super('physics');
        
        this.logger = new Logger('ProjectilePhysicsComponent');
        this.eventSystem = EventSystem.getInstance();
        
        // Calculate initial velocity from direction and speed
        this.velocity = options.direction.clone().normalize().scale(options.speed);
        
        // Store basic properties
        this.size = options.size;
        this.affectedByGravity = options.affectedByGravity || false;
        this.bounces = options.bounces || false;
        this.maxBounces = options.maxBounces || 0;
        this.bounceFactor = options.bounceFactor || 0.5;
        this.onCollision = options.onCollision;
        
        // Store advanced physics properties
        this.projectileType = options.projectileType || 'bullet';
        this.dragCoefficient = options.dragCoefficient || this.getDefaultDragCoefficient();
        this.liftCoefficient = options.liftCoefficient || this.getDefaultLiftCoefficient();
        this.spinRate = options.spinRate || this.getDefaultSpinRate();
        
        // Calculate spin axis - if not provided, use a perpendicular vector to direction
        if (options.spinAxis) {
            this.spinAxis = options.spinAxis.clone().normalize();
        } else {
            // Find a perpendicular vector to the direction
            const direction = options.direction.clone().normalize();
            if (Math.abs(direction.y) < 0.99) {
                // If direction is not close to up/down, use up vector to find perpendicular
                const up = new Vector3(0, 1, 0);
                this.spinAxis = Vector3.Cross(direction, up).normalize();
            } else {
                // If direction is close to up/down, use forward vector to find perpendicular
                const forward = new Vector3(0, 0, 1);
                this.spinAxis = Vector3.Cross(direction, forward).normalize();
            }
        }
        
        // Calculate angular velocity vector
        this.angularVelocity = this.spinAxis.clone().scale(this.spinRate);
        
        // Set IPhysicsComponent properties
        this.useGravity = this.affectedByGravity;
        this.restitution = this.bounceFactor;
        
        this.logger.debug(`Created projectile physics component with speed ${options.speed} and type ${this.projectileType}`);
    }
    
    /**
     * Get default drag coefficient based on projectile type
     * @returns Default drag coefficient
     */
    private getDefaultDragCoefficient(): number {
        switch (this.projectileType) {
            case 'disc':
                return 0.3; // Disc has moderate drag
            case 'grenade':
                return 0.5; // Grenade has higher drag
            case 'bullet':
                return 0.1; // Bullet has low drag
            case 'energy':
                return 0.0; // Energy projectile has no drag
            default:
                return 0.2;
        }
    }
    
    /**
     * Get default lift coefficient based on projectile type
     * @returns Default lift coefficient
     */
    private getDefaultLiftCoefficient(): number {
        switch (this.projectileType) {
            case 'disc':
                return 0.4; // Disc generates lift
            case 'grenade':
                return 0.0; // Grenade doesn't generate lift
            case 'bullet':
                return 0.0; // Bullet doesn't generate lift
            case 'energy':
                return 0.0; // Energy projectile doesn't generate lift
            default:
                return 0.0;
        }
    }
    
    /**
     * Get default spin rate based on projectile type
     * @returns Default spin rate in radians per second
     */
    private getDefaultSpinRate(): number {
        switch (this.projectileType) {
            case 'disc':
                return 10.0; // Disc spins rapidly (about 1.6 rotations per second)
            case 'grenade':
                return 2.0; // Grenade tumbles slowly
            case 'bullet':
                return 30.0; // Bullet spins very fast due to rifling
            case 'energy':
                return 0.0; // Energy projectile doesn't spin
            default:
                return 0.0;
        }
    }
    
    /**
     * Initialize the component
     * @param entity The entity this component belongs to
     */
    public override init(entity: IEntity): void {
        super.init(entity);
        this.logger.debug(`Initialized projectile physics component for entity ${entity.id}`);
    }
    
    /**
     * Update the component
     * @param deltaTime Time since last update in seconds
     */
    public override update(deltaTime: number): void {
        if (!this.entity) return;
        
        try {
            // Store previous position for collision detection
            const prevPosition = this.entity.transform.position.clone();
            
            // Apply physics forces
            this.applyPhysicsForces(deltaTime);
            
            // Update rotation
            this.updateRotation(deltaTime);
            
            // Calculate movement delta
            const moveDelta = this.velocity.clone().scale(deltaTime);
            
            // Update position
            this.entity.transform.position.add(moveDelta);
            
            // Check for collisions
            this.checkCollisions(prevPosition);
        } catch (error) {
            this.logger.error(`Error updating projectile physics: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Apply physics forces to the projectile
     * @param deltaTime Time since last update in seconds
     */
    private applyPhysicsForces(deltaTime: number): void {
        // Apply gravity if enabled
        if (this.affectedByGravity) {
            this.velocity.y -= GameConstants.GRAVITY * deltaTime;
        }
        
        // Skip advanced physics for non-disc projectiles or very low speeds
        if (this.projectileType !== 'disc' || this.velocity.length() < 1.0) {
            return;
        }
        
        // Calculate air density (could be variable based on height)
        const airDensity = 1.2; // kg/m^3, approximate air density at sea level
        
        // Calculate velocity magnitude and direction
        const velocityMagnitude = this.velocity.length();
        const velocityDirection = this.velocity.clone().normalize();
        
        // Calculate reference area (cross-sectional area)
        const area = Math.PI * this.size * this.size;
        
        // Calculate dynamic pressure
        const dynamicPressure = 0.5 * airDensity * velocityMagnitude * velocityMagnitude;
        
        // Calculate drag force magnitude
        const dragForceMagnitude = this.dragCoefficient * dynamicPressure * area;
        
        // Apply drag force (opposite to velocity direction)
        const dragForce = velocityDirection.clone().scale(-dragForceMagnitude);
        this.velocity.add(dragForce.scale(deltaTime / this.mass));
        
        // For disc projectiles, calculate lift
        if (this.liftCoefficient > 0) {
            // Calculate spin vector (perpendicular to velocity and spin axis)
            const spinVector = Vector3.Cross(velocityDirection, this.spinAxis).normalize();
            
            // Calculate lift force magnitude
            const liftForceMagnitude = this.liftCoefficient * dynamicPressure * area;
            
            // Apply lift force (perpendicular to velocity direction)
            const liftForce = spinVector.scale(liftForceMagnitude);
            this.velocity.add(liftForce.scale(deltaTime / this.mass));
            
            // Add a slight curve effect based on spin (Magnus effect)
            const magnusEffect = Vector3.Cross(this.angularVelocity, velocityDirection).scale(0.01);
            this.velocity.add(magnusEffect.scale(deltaTime));
        }
    }
    
    /**
     * Update the rotation of the projectile
     * @param deltaTime Time since last update in seconds
     */
    private updateRotation(deltaTime: number): void {
        // Update rotation angle
        this.rotation += this.spinRate * deltaTime;
        
        // Normalize rotation to 0-2π
        this.rotation %= Math.PI * 2;
        
        // In a real implementation, we would update the entity's rotation quaternion
        // For now, we'll just track the rotation angle
    }
    
    /**
     * Check for collisions with the environment and other entities
     * @param prevPosition Previous position
     */
    private checkCollisions(prevPosition: Vector3): void {
        if (!this.entity) return;
        
        try {
            const currentPosition = this.entity.transform.position;
            
            // TODO: Implement proper collision detection with the terrain and entities
            // For now, we'll just check for a simple ground collision as an example
            
            // Check for ground collision (y = 0)
            if (prevPosition.y > 0 && currentPosition.y <= 0) {
                // Calculate hit point (intersection with y=0 plane)
                const t = prevPosition.y / (prevPosition.y - currentPosition.y);
                const hitPoint = new Vector3(
                    prevPosition.x + t * (currentPosition.x - prevPosition.x),
                    0,
                    prevPosition.z + t * (currentPosition.z - prevPosition.z)
                );
                
                // Ground normal is always up
                const hitNormal = new Vector3(0, 1, 0);
                
                // Handle the collision
                this.handleCollision(undefined, hitPoint, hitNormal);
            }
            
            // TODO: Add collision checks with other entities
        } catch (error) {
            this.logger.error(`Error checking collisions: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Handle a collision
     * @param hitEntityId ID of the entity that was hit, or undefined for environment
     * @param hitPoint Point of impact
     * @param hitNormal Normal vector at the point of impact
     */
    private handleCollision(hitEntityId: string | undefined, hitPoint: Vector3, hitNormal: Vector3): void {
        if (!this.entity) return;
        
        try {
            // If bounces are enabled and we haven't exceeded max bounces
            if (this.bounces && this.bounceCount < this.maxBounces) {
                // Calculate reflection vector
                const dot = this.velocity.dot(hitNormal);
                const reflection = this.velocity.clone().subtract(
                    hitNormal.clone().scale(2 * dot)
                );
                
                // Apply bounce factor to reduce velocity
                reflection.scale(this.bounceFactor);
                
                // For disc projectiles, add some randomness to the bounce direction
                if (this.projectileType === 'disc') {
                    // Add a small random perturbation to the reflection
                    const randomFactor = 0.1;
                    reflection.x += (Math.random() * 2 - 1) * randomFactor * reflection.length();
                    reflection.z += (Math.random() * 2 - 1) * randomFactor * reflection.length();
                    
                    // Normalize and rescale to maintain speed
                    const speed = reflection.length();
                    reflection.normalize().scale(speed);
                }
                
                // Update velocity
                this.velocity = reflection;
                
                // Update position to hit point to prevent getting stuck
                this.entity.transform.position = hitPoint.clone().add(hitNormal.clone().scale(0.1));
                
                // Increment bounce count
                this.bounceCount++;
                
                // For disc projectiles, change spin axis after bounce
                if (this.projectileType === 'disc') {
                    // Calculate new spin axis based on reflection and normal
                    this.spinAxis = Vector3.Cross(reflection.clone().normalize(), hitNormal).normalize();
                    
                    // Update angular velocity
                    this.angularVelocity = this.spinAxis.clone().scale(this.spinRate);
                }
                
                this.logger.debug(`Projectile bounced (${this.bounceCount}/${this.maxBounces})`);
                
                // Emit bounce event
                this.eventSystem.emit(GameEventType.PROJECTILE_BOUNCE, {
                    projectileId: this.entity.id,
                    bounceCount: this.bounceCount,
                    hitPoint: hitPoint.clone(),
                    hitNormal: hitNormal.clone(),
                    newVelocity: this.velocity.clone()
                });
            } else {
                // Call collision callback if provided
                if (this.onCollision) {
                    this.onCollision(hitEntityId, hitPoint, hitNormal);
                }
            }
        } catch (error) {
            this.logger.error(`Error handling collision: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Get the current velocity
     * @returns Current velocity vector
     */
    public getVelocity(): Vector3 {
        return this.velocity.clone();
    }
    
    /**
     * Set the velocity
     * @param velocity New velocity vector
     */
    public setVelocity(velocity: Vector3): void {
        this.velocity = velocity.clone();
    }
    
    /**
     * Get the size (radius) of the projectile
     * @returns Size in world units
     */
    public getSize(): number {
        return this.size;
    }
    
    /**
     * Get the projectile type
     * @returns Projectile type
     */
    public getProjectileType(): string {
        return this.projectileType;
    }
    
    /**
     * Get the current rotation angle
     * @returns Rotation angle in radians
     */
    public getRotation(): number {
        return this.rotation;
    }
    
    /**
     * Get the spin axis
     * @returns Spin axis vector
     */
    public getSpinAxis(): Vector3 {
        return this.spinAxis.clone();
    }
    
    /**
     * Get the spin rate
     * @returns Spin rate in radians per second
     */
    public getSpinRate(): number {
        return this.spinRate;
    }
    
    /**
     * Set the spin rate
     * @param rate Spin rate in radians per second
     */
    public setSpinRate(rate: number): void {
        this.spinRate = rate;
        this.angularVelocity = this.spinAxis.clone().scale(this.spinRate);
    }
    
    /**
     * Apply a force to the entity
     * @param force Force vector
     * @param point Point of application (optional)
     */
    public applyForce(force: Vector3, point?: Vector3): void {
        // For projectiles, we'll just add to velocity directly
        // In a real physics system, this would use mass and acceleration
        this.velocity.add(force.clone().scale(1 / this.mass));
    }
    
    /**
     * Apply an impulse to the entity
     * @param impulse Impulse vector
     * @param point Point of application (optional)
     */
    public applyImpulse(impulse: Vector3, point?: Vector3): void {
        // For projectiles, impulse is directly added to velocity
        this.velocity.add(impulse.clone().scale(1 / this.mass));
    }
    
    /**
     * Get the mass of the entity
     * @returns Mass in kg
     */
    public getMass(): number {
        return this.mass;
    }
    
    /**
     * Set the mass of the entity
     * @param mass Mass in kg
     */
    public setMass(mass: number): void {
        if (mass <= 0) {
            this.logger.warn('Mass must be greater than 0, setting to 0.1');
            this.mass = 0.1;
        } else {
            this.mass = mass;
        }
    }
    
    /**
     * Check if the entity is static (immovable)
     * @returns Whether the entity is static
     */
    public isEntityStatic(): boolean {
        return this.isStatic;
    }
    
    /**
     * Set whether the entity is static
     * @param isStatic Whether the entity is static
     */
    public setStatic(isStatic: boolean): void {
        this.isStatic = isStatic;
        
        // If static, zero out velocity
        if (isStatic) {
            this.velocity.set(0, 0, 0);
        }
    }
    
    /**
     * Check if gravity is enabled for this entity
     * @returns Whether gravity is enabled
     */
    public isGravityEnabled(): boolean {
        return this.useGravity;
    }
    
    /**
     * Set whether gravity is enabled for this entity
     * @param enabled Whether gravity is enabled
     */
    public setGravityEnabled(enabled: boolean): void {
        this.useGravity = enabled;
        this.affectedByGravity = enabled;
    }
    
    /**
     * Get the friction coefficient
     * @returns Friction coefficient
     */
    public getFriction(): number {
        return this.friction;
    }
    
    /**
     * Set the friction coefficient
     * @param friction Friction coefficient
     */
    public setFriction(friction: number): void {
        this.friction = Math.max(0, Math.min(1, friction));
    }
    
    /**
     * Get the restitution (bounciness)
     * @returns Restitution coefficient
     */
    public getRestitution(): number {
        return this.restitution;
    }
    
    /**
     * Set the restitution (bounciness)
     * @param restitution Restitution coefficient
     */
    public setRestitution(restitution: number): void {
        this.restitution = Math.max(0, Math.min(1, restitution));
        this.bounceFactor = restitution;
    }
    
    /**
     * Check if collision is enabled for this entity
     * @returns Whether collision is enabled
     */
    public isCollisionEnabled(): boolean {
        return this.collisionEnabled;
    }
    
    /**
     * Set whether collision is enabled for this entity
     * @param enabled Whether collision is enabled
     */
    public setCollisionEnabled(enabled: boolean): void {
        this.collisionEnabled = enabled;
    }
    
    /**
     * Check if the entity is kinematic (moved by code, not physics)
     * @returns Whether the entity is kinematic
     */
    public isKinematic(): boolean {
        return this.isKinematicEntity;
    }
    
    /**
     * Set whether the entity is kinematic
     * @param isKinematic Whether the entity is kinematic
     */
    public setKinematic(isKinematic: boolean): void {
        this.isKinematicEntity = isKinematic;
    }
    
    /**
     * Clean up resources
     */
    public override dispose(): void {
        this.logger.debug('Disposing projectile physics component');
        super.dispose();
    }
} 