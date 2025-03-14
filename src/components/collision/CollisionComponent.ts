/**
 * CollisionComponent.ts
 * Handles collision detection and response for entities
 */

import { Vector3 } from '../../types/common/Vector3';
import { IEntity } from '../../entities/IEntity';
import { Component } from '../Component';
import { ICollisionComponent, CollisionShapeType, CollisionGroup } from './ICollisionComponent';
import { TerrainData } from '../movement/MovementState';
import { Logger } from '../../utils/Logger';
import { EventSystem } from '../../core/EventSystem';
import { GameEventType, SurfaceType } from '../../types/events/EventTypes';

/**
 * Collision component options
 */
export interface CollisionComponentOptions {
    /**
     * Collision shape type
     */
    shapeType?: CollisionShapeType;
    
    /**
     * Collision radius (for sphere and capsule)
     */
    radius?: number;
    
    /**
     * Collision dimensions (for box)
     */
    dimensions?: Vector3;
    
    /**
     * Collision height (for capsule)
     */
    height?: number;
    
    /**
     * Collision offset from entity position
     */
    offset?: Vector3;
    
    /**
     * Collision group
     */
    collisionGroup?: number;
    
    /**
     * Collision mask (what groups this collides with)
     */
    collisionMask?: number;
}

/**
 * Default collision component options
 */
const DEFAULT_OPTIONS: CollisionComponentOptions = {
    shapeType: CollisionShapeType.SPHERE,
    radius: 0.5,
    dimensions: new Vector3(1, 2, 1),
    height: 2,
    offset: Vector3.Zero(),
    collisionGroup: CollisionGroup.DEFAULT,
    collisionMask: CollisionGroup.DEFAULT | CollisionGroup.TERRAIN | CollisionGroup.OBJECT
};

/**
 * Collision component implementation
 */
export class CollisionComponent extends Component implements ICollisionComponent {
    private logger: Logger;
    private eventSystem: EventSystem;
    
    private shapeType: CollisionShapeType;
    private radius: number;
    private dimensions: Vector3;
    private height: number;
    private offset: Vector3;
    private collisionGroup: number;
    private collisionMask: number;
    
    private isOnGround: boolean = false;
    private groundNormal: Vector3 = Vector3.up();
    private terrainData?: TerrainData;
    
    // Default terrain data when not on terrain
    private defaultTerrainData: TerrainData = {
        normal: Vector3.up(),
        surfaceType: SurfaceType.DEFAULT,
        friction: 0.5,
        slopeAngle: 0,
        slopeDirection: Vector3.zero(),
    };
    
    /**
     * Create a new collision component
     * @param options Collision component options
     */
    constructor(options: CollisionComponentOptions = {}) {
        super('collision');
        
        this.logger = new Logger('CollisionComponent');
        this.eventSystem = EventSystem.getInstance();
        
        // Apply options with defaults
        const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
        this.shapeType = mergedOptions.shapeType!;
        this.radius = mergedOptions.radius!;
        this.dimensions = mergedOptions.dimensions!;
        this.height = mergedOptions.height!;
        this.offset = mergedOptions.offset!;
        this.collisionGroup = mergedOptions.collisionGroup!;
        this.collisionMask = mergedOptions.collisionMask!;
    }
    
    /**
     * Initialize the component
     * @param entity The entity this component belongs to
     */
    public init(entity: IEntity): void {
        super.init(entity);
        this.logger.debug(`Initialized collision component for entity ${entity.id}`);
    }
    
    /**
     * Update the component
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        // Component-specific update logic will be handled by the PhysicsSystem
    }
    
    /**
     * Dispose of the component
     */
    public dispose(): void {
        super.dispose();
        this.logger.debug('Disposed collision component');
    }
    
    /**
     * Get the collision shape type
     */
    public getShapeType(): CollisionShapeType {
        return this.shapeType;
    }
    
    /**
     * Get the collision radius (for sphere and capsule)
     */
    public getRadius(): number {
        return this.radius;
    }
    
    /**
     * Get the collision dimensions (for box)
     */
    public getDimensions(): Vector3 {
        return this.dimensions.clone();
    }
    
    /**
     * Get the collision height (for capsule)
     */
    public getHeight(): number {
        return this.height;
    }
    
    /**
     * Get the collision offset from entity position
     */
    public getOffset(): Vector3 {
        return this.offset.clone();
    }
    
    /**
     * Check if the entity is on the ground
     */
    public isGrounded(): boolean {
        return this.isOnGround;
    }
    
    /**
     * Set whether the entity is on the ground
     * @param grounded Whether the entity is on the ground
     * @param normal Ground normal vector
     */
    public setGrounded(grounded: boolean, normal?: Vector3): void {
        const wasGrounded = this.isOnGround;
        this.isOnGround = grounded;
        
        if (normal) {
            this.groundNormal = normal.clone();
        }
        
        // Emit event if grounded state changed
        if (wasGrounded !== grounded && this.entity) {
            if (grounded) {
                // Get current velocity (zero if not available)
                const velocity = Vector3.zero();
                
                this.eventSystem.emit(GameEventType.MOVEMENT_LAND, {
                    entityId: Number(this.entity.id),
                    position: this.entity.getPosition().clone(),
                    velocity: velocity,
                    impactForce: 0, // Default impact force
                    surfaceType: this.terrainData?.surfaceType || SurfaceType.DEFAULT
                });
            }
        }
    }
    
    /**
     * Get the ground normal vector
     */
    public getGroundNormal(): Vector3 {
        return this.groundNormal.clone();
    }
    
    /**
     * Get the collision group
     */
    public getCollisionGroup(): number {
        return this.collisionGroup;
    }
    
    /**
     * Get the collision mask (what groups this collides with)
     */
    public getCollisionMask(): number {
        return this.collisionMask;
    }
    
    /**
     * Set the collision group
     * @param group Collision group
     */
    public setCollisionGroup(group: number): void {
        this.collisionGroup = group;
    }
    
    /**
     * Set the collision mask
     * @param mask Collision mask
     */
    public setCollisionMask(mask: number): void {
        this.collisionMask = mask;
    }
    
    /**
     * Check if this component collides with the specified group
     * @param group Collision group to check
     */
    public collidesWithGroup(group: number): boolean {
        return (this.collisionMask & group) !== 0;
    }
    
    /**
     * Get the terrain data at the current position
     */
    public getTerrainData(): TerrainData | undefined {
        return this.terrainData;
    }
    
    /**
     * Set the terrain data
     * @param terrainData Terrain data
     */
    public setTerrainData(terrainData: TerrainData): void {
        this.terrainData = terrainData;
    }
    
    /**
     * Handle collision with another entity
     * @param otherEntityId Other entity ID
     * @param collisionPoint Collision point
     * @param collisionNormal Collision normal
     * @param penetrationDepth Penetration depth
     */
    public handleCollision(
        otherEntityId: string,
        collisionPoint: Vector3,
        collisionNormal: Vector3,
        penetrationDepth: number
    ): void {
        if (!this.entity) return;
        
        // Emit collision event
        this.eventSystem.emit(GameEventType.PHYSICS_COLLISION, {
            entityIdA: Number(this.entity.id),
            entityIdB: Number(otherEntityId),
            position: collisionPoint.clone(),
            normal: collisionNormal.clone(),
            impulse: penetrationDepth // Use penetration depth as impulse
        });
        
        this.logger.debug(`Collision between entity ${this.entity.id} and ${otherEntityId}`);
        
        // Calculate velocity after collision
        const velocity = Vector3.zero();
        
        // Emit event if grounded state changed
        if (this.isOnGround) {
            this.eventSystem.emit(GameEventType.MOVEMENT_LAND, {
                entityId: Number(this.entity.id),
                position: this.entity.getPosition().clone(),
                velocity: velocity,
                impactForce: 0, // Default impact force
                surfaceType: this.terrainData?.surfaceType || SurfaceType.DEFAULT
            });
        }
    }
} 