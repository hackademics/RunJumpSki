/**
 * TargetEntity.ts
 * Entity representing a destructible target in the game world
 */

import { Entity } from './Entity';
import { IEntity } from './IEntity';
import { Vector3 } from '../types/common/Vector3';
import { Logger } from '../utils/Logger';
import { EventSystem } from '../core/EventSystem';
import { GameEventType, TargetHitEvent, TargetDestroyedEvent } from '../types/events/EventTypes';
import { TargetVisualComponent } from '../components/visual/TargetVisualComponent';
import { TargetHealthComponent } from '../components/gameplay/TargetHealthComponent';
import { CollisionComponent, CollisionShapeType, CollisionResult } from '../components/physics/CollisionComponent';
import { GameConstants } from '../config/Constants';

/**
 * Target type enum
 */
export enum TargetType {
    STATIC = 'static',
    MOVING = 'moving',
    FLOATING = 'floating',
    SPINNING = 'spinning'
}

/**
 * Target shape enum
 */
export enum TargetShape {
    CIRCLE = 'circle',
    SQUARE = 'square',
    TRIANGLE = 'triangle',
    DIAMOND = 'diamond'
}

/**
 * Target entity options
 */
export interface TargetOptions {
    /**
     * Target position
     */
    position: Vector3;
    
    /**
     * Target rotation (Euler angles)
     */
    rotation?: Vector3;
    
    /**
     * Target scale
     */
    scale?: Vector3;
    
    /**
     * Target type
     */
    type?: TargetType;
    
    /**
     * Target shape
     */
    shape?: TargetShape;
    
    /**
     * Target size (radius or half-width)
     */
    size?: number;
    
    /**
     * Target health
     */
    health?: number;
    
    /**
     * Target color
     */
    color?: string;
    
    /**
     * Whether the target is destructible
     */
    destructible?: boolean;
    
    /**
     * Points awarded for hitting the target
     */
    pointValue?: number;
    
    /**
     * Time bonus awarded for destroying the target (seconds)
     */
    timeBonus?: number;
    
    /**
     * Movement pattern for moving targets
     */
    movementPattern?: {
        /**
         * Movement type
         */
        type: 'linear' | 'circular' | 'random';
        
        /**
         * Movement speed
         */
        speed: number;
        
        /**
         * Movement range or radius
         */
        range: number;
        
        /**
         * Movement axis or center point
         */
        axis?: Vector3;
    };
}

/**
 * Entity representing a destructible target in the game world
 */
export class TargetEntity extends Entity {
    // Use protected instead of private for logger to avoid conflict with base class
    protected targetLogger: Logger;
    private eventSystem: EventSystem;
    
    private targetType: TargetType;
    private targetShape: TargetShape;
    private size: number;
    private pointValue: number;
    private timeBonus: number;
    private destructible: boolean;
    private movementPattern?: {
        type: 'linear' | 'circular' | 'random';
        speed: number;
        range: number;
        axis?: Vector3;
        startPosition: Vector3;
        startTime: number;
    };
    
    // Reusable Vector3 objects to reduce garbage collection
    private tempVector: Vector3 = new Vector3(0, 0, 0);
    private randomDirVector: Vector3 = new Vector3(0, 0, 0);
    
    /**
     * Create a new target entity
     * @param options Target options
     */
    constructor(options: TargetOptions) {
        super(
            `Target_${Date.now()}`,
            options.position,
            options.rotation || new Vector3(0, 0, 0),
            options.scale || new Vector3(1, 1, 1)
        );
        
        this.targetLogger = new Logger('TargetEntity');
        this.eventSystem = EventSystem.getInstance();
        
        // Store target properties
        this.targetType = options.type || TargetType.STATIC;
        this.targetShape = options.shape || TargetShape.CIRCLE;
        this.size = options.size || GameConstants.TARGET_DEFAULT_SIZE;
        this.pointValue = options.pointValue || GameConstants.TARGET_DEFAULT_POINTS;
        this.timeBonus = options.timeBonus || GameConstants.TARGET_HIT_TIME_BONUS;
        this.destructible = options.destructible !== undefined ? options.destructible : true;
        
        // Set up movement pattern if provided
        if (options.movementPattern) {
            this.movementPattern = {
                ...options.movementPattern,
                startPosition: options.position.clone(),
                startTime: performance.now()
            };
        }
        
        // Add visual component
        const visualComponent = new TargetVisualComponent({
            shape: this.targetShape,
            size: this.size,
            color: options.color || '#FF0000',
            destructible: this.destructible
        });
        
        // Using 'as any' to bypass type checking for component compatibility
        // This is a temporary solution until the component interfaces are properly aligned
        this.addComponent('visual', visualComponent as any);
        
        // Add health component if destructible
        if (this.destructible) {
            const healthComponent = new TargetHealthComponent({
                maxHealth: options.health || GameConstants.TARGET_DEFAULT_HEALTH,
                onDamage: this.handleDamage.bind(this),
                onDestroy: this.handleDestroy.bind(this)
            });
            
            // Using 'as any' to bypass type checking for component compatibility
            this.addComponent('health', healthComponent as any);
        }
        
        // Add collision component
        const collisionComponent = new CollisionComponent({
            shapeType: this.targetShape === TargetShape.CIRCLE ? CollisionShapeType.SPHERE : CollisionShapeType.BOX,
            size: new Vector3(this.size, this.size, this.size),
            isTrigger: true,
            onCollision: (result: CollisionResult) => this.handleCollision(result)
        });
        
        // Using 'as any' to bypass type checking for component compatibility
        this.addComponent('collision', collisionComponent as any);
        
        this.targetLogger.debug(`Created ${this.targetType} target entity with shape ${this.targetShape}`);
    }
    
    /**
     * Update the target
     * @param deltaTime Time since last update in seconds
     */
    public override update(deltaTime: number): void {
        super.update(deltaTime);
        
        // Update position for moving targets
        if (this.movementPattern) {
            this.updateMovement(deltaTime);
        }
    }
    
    /**
     * Update the target's position based on its movement pattern
     * @param deltaTime Time since last update in seconds
     */
    private updateMovement(deltaTime: number): void {
        if (!this.movementPattern) return;
        
        const elapsedTime = (performance.now() - this.movementPattern.startTime) / 1000; // Convert to seconds
        const startPos = this.movementPattern.startPosition;
        
        try {
            switch (this.movementPattern.type) {
                case 'linear':
                    // Linear back-and-forth movement
                    const axis = this.movementPattern.axis || new Vector3(1, 0, 0);
                    const distance = Math.sin(elapsedTime * this.movementPattern.speed) * this.movementPattern.range;
                    
                    // Reuse tempVector to avoid creating new objects
                    this.tempVector.copy(axis).scale(distance);
                    this.transform.position.copy(startPos).add(this.tempVector);
                    break;
                    
                case 'circular':
                    // Circular movement
                    const center = this.movementPattern.axis || startPos;
                    const angle = elapsedTime * this.movementPattern.speed;
                    const radius = this.movementPattern.range;
                    
                    this.transform.position.set(
                        center.x + Math.cos(angle) * radius,
                        center.y,
                        center.z + Math.sin(angle) * radius
                    );
                    break;
                    
                case 'random':
                    // Random movement (change direction occasionally)
                    // This is simplified for now
                    if (Math.random() < 0.01) {
                        // Reuse randomDirVector instead of creating a new Vector3
                        this.randomDirVector.set(
                            Math.random() * 2 - 1,
                            0,
                            Math.random() * 2 - 1
                        ).normalize();
                        
                        const randomDistance = Math.random() * this.movementPattern.range;
                        
                        // Reuse tempVector to avoid creating new objects
                        this.tempVector.copy(this.randomDirVector).scale(randomDistance);
                        
                        // Calculate new position
                        this.transform.position.copy(startPos).add(this.tempVector);
                        
                        // Ensure we stay within range of start position
                        if (this.transform.position.distanceTo(startPos) > this.movementPattern.range) {
                            // If we're outside the range, scale back the position
                            this.tempVector.copy(this.transform.position).subtract(startPos).normalize()
                                .scale(this.movementPattern.range);
                            this.transform.position.copy(startPos).add(this.tempVector);
                        }
                    }
                    break;
            }
        } catch (error) {
            this.targetLogger.error(`Error updating target movement: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Handle collision with another entity
     * @param result Collision result
     */
    private handleCollision(result: CollisionResult): void {
        try {
            if (!result.collided || !result.entity) {
                return;
            }
            
            const other = result.entity;
            
            // Check if the other entity is a projectile
            // Use type assertion and property check to safely access properties
            const isProjectile = (other as any).type === 'projectile';
            const isNamedProjectile = typeof (other as any).name === 'string' && 
                ((other as any).name.includes('Disc_') || (other as any).name.includes('Grenade_'));
                
            if (isProjectile || isNamedProjectile) {
                // Get damage from projectile if available
                const damage = (other as any).damage || 1;
                
                if (this.destructible && this.getComponent('health')) {
                    // Apply damage to health component
                    const healthComponent = this.getComponent('health') as any;
                    if (healthComponent && typeof healthComponent.takeDamage === 'function') {
                        healthComponent.takeDamage(damage);
                    }
                } else {
                    // Non-destructible targets still emit hit events
                    this.emitHitEvent(damage);
                }
            }
        } catch (error) {
            if (this.targetLogger) this.targetLogger.error(`Error handling collision: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Handle damage to the target
     * @param damage Amount of damage dealt
     */
    private handleDamage(damage: number): void {
        try {
            if (this.targetLogger) this.targetLogger.debug(`Target ${this.id} took ${damage} damage`);
            
            // Emit hit event
            this.emitHitEvent(damage);
        } catch (error) {
            if (this.targetLogger) this.targetLogger.error(`Error handling damage: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Handle target destruction
     */
    private handleDestroy(): void {
        try {
            if (this.targetLogger) this.targetLogger.debug(`Target ${this.id} destroyed`);
            
            // Emit target destroyed event with type assertion to bypass type checking
            this.eventSystem.emit(GameEventType.TARGET_DESTROYED, {
                targetId: this.id, // Keep as number to match the actual type
                position: this.transform.position.clone(), // Use Vector3 object
                pointValue: this.pointValue,
                timeBonus: this.timeBonus || 0,
                type: GameEventType.TARGET_DESTROYED,
                timestamp: Date.now()
            } as any); // Use type assertion to bypass strict type checking
            
            // Mark for removal
            this.active = false;
        } catch (error) {
            if (this.targetLogger) this.targetLogger.error(`Error in handleDestroy: ${error}`);
        }
    }
    
    /**
     * Emit hit event
     * @param damage Amount of damage dealt
     */
    private emitHitEvent(damage: number): void {
        try {
            // Emit target hit event with type assertion to bypass type checking
            this.eventSystem.emit(GameEventType.TARGET_HIT, {
                targetId: this.id, // Keep as number to match the actual type
                position: this.transform.position.clone(), // Use Vector3 object
                pointValue: this.pointValue,
                timeBonus: this.timeBonus || 0,
                type: GameEventType.TARGET_HIT,
                timestamp: Date.now()
            } as any); // Use type assertion to bypass strict type checking
        } catch (error) {
            if (this.targetLogger) this.targetLogger.error(`Error in emitHitEvent: ${error}`);
        }
    }
    
    /**
     * Mark the entity for removal
     */
    public markForRemoval(): void {
        this.active = false;
    }
    
    /**
     * Get the target type
     * @returns Target type
     */
    public getTargetType(): TargetType {
        return this.targetType;
    }
    
    /**
     * Get the target shape
     * @returns Target shape
     */
    public getTargetShape(): TargetShape {
        return this.targetShape;
    }
    
    /**
     * Get the point value
     * @returns Point value
     */
    public getPointValue(): number {
        return this.pointValue;
    }
    
    /**
     * Get the time bonus
     * @returns Time bonus in seconds
     */
    public getTimeBonus(): number {
        return this.timeBonus;
    }
    
    /**
     * Check if the target is destructible
     * @returns Whether the target is destructible
     */
    public isDestructible(): boolean {
        return this.destructible;
    }
    
    /**
     * Clean up resources
     */
    public override dispose(): void {
        this.targetLogger.debug('Disposing target entity');
        super.dispose();
    }
} 