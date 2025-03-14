/**
 * CollisionComponent.ts
 * Component for handling collision detection and response
 */

import { Component } from '../Component';
import { IEntity } from '../../entities/IEntity';
import { Vector3 } from '../../types/common/Vector3';
import { Logger } from '../../utils/Logger';
import { IPhysicsComponent } from './IPhysicsComponent';

// Default collision radius if GameConstants is not available
const DEFAULT_COLLISION_RADIUS = 1.0;

/**
 * Collision shape type
 */
export enum CollisionShapeType {
    SPHERE = 'sphere',
    BOX = 'box',
    CAPSULE = 'capsule'
}

/**
 * Collision filter options
 */
export interface CollisionFilter {
    /**
     * Layer this object belongs to
     */
    layer: number;
    
    /**
     * Mask of layers this object collides with
     */
    mask: number;
    
    /**
     * Group this object belongs to
     */
    group?: number;
}

/**
 * Collision result
 */
export interface CollisionResult {
    /**
     * Whether a collision occurred
     */
    collided: boolean;
    
    /**
     * The entity that was collided with
     */
    entity?: IEntity;
    
    /**
     * The collision point
     */
    point?: Vector3;
    
    /**
     * The collision normal
     */
    normal?: Vector3;
    
    /**
     * The penetration depth
     */
    penetration?: number;
    
    /**
     * The relative velocity at the collision point
     */
    relativeVelocity?: Vector3;
}

/**
 * Collision options
 */
export interface CollisionOptions {
    /**
     * Shape type
     */
    shapeType: CollisionShapeType;
    
    /**
     * Radius (for sphere and capsule)
     */
    radius?: number;
    
    /**
     * Size (for box)
     */
    size?: Vector3;
    
    /**
     * Height (for capsule)
     */
    height?: number;
    
    /**
     * Offset from entity position
     */
    offset?: Vector3;
    
    /**
     * Collision filter
     */
    filter?: CollisionFilter;
    
    /**
     * Whether this is a trigger (no physical response)
     */
    isTrigger?: boolean;
    
    /**
     * Callback for when a collision occurs
     */
    onCollision?: (result: CollisionResult) => void;
    
    /**
     * Callback for when a trigger is entered
     */
    onTriggerEnter?: (entity: IEntity) => void;
    
    /**
     * Callback for when a trigger is exited
     */
    onTriggerExit?: (entity: IEntity) => void;
    
    /**
     * Restitution (bounciness) 0-1
     */
    restitution?: number;
    
    /**
     * Friction coefficient 0-1
     */
    friction?: number;
    
    /**
     * Debug mode - enables verbose logging and visualization
     */
    debug?: boolean;
}

/**
 * Component for handling collision detection and response
 */
export class CollisionComponent extends Component {
    private logger: Logger;
    
    private shapeType: CollisionShapeType;
    private radius: number;
    private size: Vector3;
    private height: number;
    private offset: Vector3;
    private filter: CollisionFilter;
    private isTrigger: boolean;
    private restitution: number;
    private friction: number;
    private debug: boolean;
    
    private onCollisionCallback?: (result: CollisionResult) => void;
    private onTriggerEnterCallback?: (entity: IEntity) => void;
    private onTriggerExitCallback?: (entity: IEntity) => void;
    
    private physicsComponent?: IPhysicsComponent;
    private collidingEntities: Set<string> = new Set();
    private lastPosition: Vector3 = new Vector3();
    
    // Reusable objects to reduce garbage collection
    private static readonly ZERO_VECTOR = new Vector3(0, 0, 0);
    private readonly tempVector1 = new Vector3();
    private readonly tempVector2 = new Vector3();
    private readonly tempResult: CollisionResult = {
        collided: false
    };
    
    // Performance tracking
    private collisionChecksPerFrame: number = 0;
    private collisionsPerFrame: number = 0;
    private lastPerformanceLog: number = 0;
    
    /**
     * Create a new collision component
     * @param options Collision options
     */
    constructor(options: CollisionOptions) {
        super('collision');
        
        this.logger = new Logger('CollisionComponent');
        
        // Store properties
        this.shapeType = options.shapeType;
        this.radius = options.radius || 1;
        this.size = options.size ? options.size.clone() : new Vector3(1, 1, 1);
        this.height = options.height || 0;
        this.offset = options.offset ? options.offset.clone() : new Vector3();
        this.filter = options.filter || { layer: 1, mask: 0xFFFFFFFF };
        this.isTrigger = options.isTrigger || false;
        this.restitution = options.restitution !== undefined ? options.restitution : 0.3;
        this.friction = options.friction !== undefined ? options.friction : 0.5;
        this.debug = options.debug || false;
        
        // Store callbacks
        this.onCollisionCallback = options.onCollision;
        this.onTriggerEnterCallback = options.onTriggerEnter;
        this.onTriggerExitCallback = options.onTriggerExit;
        
        if (this.debug) {
            this.logger.debug(`Created collision component with shape type ${this.shapeType}`);
        }
    }
    
    /**
     * Initialize the component
     * @param entity The entity this component belongs to
     */
    public override init(entity: IEntity): void {
        try {
            super.init(entity);
            
            // Get physics component if available
            this.physicsComponent = entity.getComponent('physics') as IPhysicsComponent;
            
            // Store initial position
            if (entity.transform) {
                this.lastPosition.copy(entity.transform.position);
            }
            
            if (this.debug) {
                this.logger.debug(`Initialized collision component for entity ${entity.id}`);
            }
        } catch (error) {
            this.logger.error(`Error initializing collision component: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Update the component
     * @param deltaTime Time since last update in seconds
     */
    public override update(deltaTime: number): void {
        try {
            if (!this.entity || !this.entity.transform) {
                return;
            }
            
            // Reset collision checks counter
            this.collisionChecksPerFrame = 0;
            this.collisionsPerFrame = 0;
            
            // Log performance metrics periodically
            const now = Date.now();
            if (this.debug && now - this.lastPerformanceLog > 1000) {
                this.logger.debug(`Collision stats: ${this.collisionChecksPerFrame} checks, ${this.collisionsPerFrame} collisions`);
                this.lastPerformanceLog = now;
            }
            
            // Store current position for next frame
            this.lastPosition.copy(this.entity.transform.position);
        } catch (error) {
            this.logger.error(`Error in collision update: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Check for collision with another entity
     * @param other The other entity to check collision with
     * @returns Collision result
     */
    public checkCollision(other: IEntity): CollisionResult {
        try {
            this.collisionChecksPerFrame++;
            
            // Reset result
            const result = this.tempResult;
            result.collided = false;
            result.entity = undefined;
            result.point = undefined;
            result.normal = undefined;
            result.penetration = undefined;
            result.relativeVelocity = undefined;
            
            // Skip if either entity doesn't have a transform
            if (!this.entity || !this.entity.transform || !other || !other.transform) {
                return result;
            }
            
            // Skip if it's the same entity
            if (this.entity.id === other.id) {
                return result;
            }
            
            // Check if layers allow collision
            const otherCollision = other.getComponent('collision') as CollisionComponent | undefined;
            if (otherCollision && !this.shouldCollideWithLayer(otherCollision.getLayer())) {
                return result;
            }
            
            // Get positions
            const pos1 = this.entity.transform.position;
            const pos2 = other.transform.position;
            
            // Apply offsets
            const effectivePos1 = this.tempVector1.copy(pos1).add(this.offset);
            const effectivePos2 = this.tempVector2.copy(pos2);
            
            if (otherCollision) {
                effectivePos2.add(otherCollision.getOffset());
            }
            
            // Check collision based on shape types
            if (this.shapeType === CollisionShapeType.SPHERE) {
                if (otherCollision && otherCollision.getShapeType() === CollisionShapeType.SPHERE) {
                    // Sphere-sphere collision
                    return this.checkSphereSphereCollision(
                        effectivePos1, this.radius,
                        effectivePos2, otherCollision.getRadius(),
                        other, result
                    );
                } else if (otherCollision && otherCollision.getShapeType() === CollisionShapeType.BOX) {
                    // Sphere-box collision
                    return this.checkSphereBoxCollision(
                        effectivePos1, this.radius,
                        effectivePos2, otherCollision.getSize(),
                        other, result
                    );
                } else {
                    // Default to sphere-sphere with default radius
                    const otherRadius = otherCollision ? otherCollision.getRadius() : DEFAULT_COLLISION_RADIUS;
                    return this.checkSphereSphereCollision(
                        effectivePos1, this.radius,
                        effectivePos2, otherRadius,
                        other, result
                    );
                }
            } else if (this.shapeType === CollisionShapeType.BOX) {
                if (otherCollision && otherCollision.getShapeType() === CollisionShapeType.SPHERE) {
                    // Box-sphere collision (reverse of sphere-box)
                    const sphereBoxResult = this.checkSphereBoxCollision(
                        effectivePos2, otherCollision.getRadius(),
                        effectivePos1, this.size,
                        this.entity, result
                    );
                    
                    // Invert normal if collision occurred
                    if (sphereBoxResult.collided && sphereBoxResult.normal) {
                        // Instead of negate(), multiply by -1
                        sphereBoxResult.normal.x *= -1;
                        sphereBoxResult.normal.y *= -1;
                        sphereBoxResult.normal.z *= -1;
                    }
                    
                    return sphereBoxResult;
                } else if (otherCollision && otherCollision.getShapeType() === CollisionShapeType.BOX) {
                    // Box-box collision
                    return this.checkBoxBoxCollision(
                        effectivePos1, this.size,
                        effectivePos2, otherCollision.getSize(),
                        other, result
                    );
                } else {
                    // Default to box-sphere with default radius
                    const otherRadius = otherCollision ? otherCollision.getRadius() : DEFAULT_COLLISION_RADIUS;
                    const sphereBoxResult = this.checkSphereBoxCollision(
                        effectivePos2, otherRadius,
                        effectivePos1, this.size,
                        this.entity, result
                    );
                    
                    // Invert normal if collision occurred
                    if (sphereBoxResult.collided && sphereBoxResult.normal) {
                        // Instead of negate(), multiply by -1
                        sphereBoxResult.normal.x *= -1;
                        sphereBoxResult.normal.y *= -1;
                        sphereBoxResult.normal.z *= -1;
                    }
                    
                    return sphereBoxResult;
                }
            }
            
            // Default to no collision
            return result;
        } catch (error) {
            this.logger.error(`Error checking collision: ${error instanceof Error ? error.message : String(error)}`);
            return { collided: false };
        }
    }
    
    /**
     * Handle collision with another entity
     * @param other The other entity
     * @param result The collision result
     */
    public handleCollision(other: IEntity, result: CollisionResult): void {
        try {
            if (!result.collided || !this.entity) {
                return;
            }
            
            this.collisionsPerFrame++;
            
            // Track colliding entities for triggers
            const otherId = other.id.toString();
            const isNewCollision = !this.collidingEntities.has(otherId);
            
            if (isNewCollision) {
                this.collidingEntities.add(otherId);
                
                // Trigger enter callback
                if (this.isTrigger && this.onTriggerEnterCallback) {
                    this.onTriggerEnterCallback(other);
                }
            }
            
            // Collision callback
            if (this.onCollisionCallback) {
                this.onCollisionCallback(result);
            }
            
            // Skip physical response for triggers
            if (this.isTrigger) {
                return;
            }
            
            // Apply physical response if we have a physics component
            if (this.physicsComponent && result.normal && result.penetration) {
                const otherPhysics = other.getComponent('physics') as IPhysicsComponent;
                
                // Skip if either object is kinematic
                if ((this.physicsComponent.isKinematic && this.physicsComponent.isKinematic()) || 
                    (otherPhysics && otherPhysics.isKinematic && otherPhysics.isKinematic())) {
                    return;
                }
                
                // Calculate impulse based on relative velocity
                let impulseStrength = 0;
                
                if (result.relativeVelocity && result.normal) {
                    const velAlongNormal = result.relativeVelocity.dot(result.normal);
                    
                    // Only apply impulse if objects are moving toward each other
                    if (velAlongNormal < 0) {
                        // Calculate impulse strength
                        impulseStrength = -(1 + this.restitution) * velAlongNormal;
                        
                        // Apply impulse
                        const impulse = result.normal.clone().multiplyScalar(impulseStrength);
                        this.physicsComponent.applyImpulse(impulse);
                    }
                }
                
                // Apply position correction to prevent sinking
                const correction = result.normal.clone().multiplyScalar(result.penetration * 0.8);
                this.entity.transform.position.add(correction);
                
                if (this.debug) {
                    this.logger.debug(
                        `Collision response: penetration=${result.penetration.toFixed(2)}, ` +
                        `impulse=${impulseStrength.toFixed(2)}`
                    );
                }
            }
        } catch (error) {
            this.logger.error(`Error handling collision: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Check for entities that are no longer colliding
     * @param currentlyCollidingIds Set of entity IDs currently colliding with this entity
     */
    public checkTriggerExits(currentlyCollidingIds: Set<string>): void {
        try {
            if (!this.isTrigger || !this.onTriggerExitCallback) {
                return;
            }
            
            // Find entities that were colliding but are no longer
            const exiting = new Set<string>();
            
            for (const id of this.collidingEntities) {
                if (!currentlyCollidingIds.has(id)) {
                    exiting.add(id);
                }
            }
            
            // Update colliding entities
            this.collidingEntities = new Set(currentlyCollidingIds);
            
            // Call trigger exit for each exiting entity
            for (const id of exiting) {
                const entity = this.findEntityById(id);
                if (entity && this.onTriggerExitCallback) {
                    this.onTriggerExitCallback(entity);
                }
            }
        } catch (error) {
            this.logger.error(`Error checking trigger exits: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Check sphere-sphere collision
     */
    private checkSphereSphereCollision(
        pos1: Vector3, radius1: number,
        pos2: Vector3, radius2: number,
        other: IEntity, result: CollisionResult
    ): CollisionResult {
        // Calculate distance
        const distanceVec = pos1.clone().subtract(pos2);
        const distance = distanceVec.length();
        const radiusSum = radius1 + radius2;
        
        // Check if colliding
        if (distance < radiusSum) {
            // Calculate collision properties
            result.collided = true;
            result.entity = other;
            result.penetration = radiusSum - distance;
            
            // Avoid division by zero
            if (distance > 0.0001) {
                result.normal = distanceVec.divideScalar(distance);
                result.point = pos2.clone().add(result.normal.clone().multiplyScalar(radius2));
            } else {
                // If centers are at the same position, use a default normal
                result.normal = new Vector3(0, 1, 0);
                result.point = pos1.clone();
            }
            
            // Calculate relative velocity if physics components are available
            this.calculateRelativeVelocity(other, result);
        }
        
        return result;
    }
    
    /**
     * Check sphere-box collision
     */
    private checkSphereBoxCollision(
        spherePos: Vector3, sphereRadius: number,
        boxPos: Vector3, boxSize: Vector3,
        other: IEntity, result: CollisionResult
    ): CollisionResult {
        // Find closest point on box to sphere center
        const closestPoint = this.tempVector1.copy(spherePos);
        
        // Clamp sphere center to box
        const halfSize = boxSize.clone().multiplyScalar(0.5);
        const minBound = boxPos.clone().subtract(halfSize);
        const maxBound = boxPos.clone().add(halfSize);
        
        closestPoint.x = Math.max(minBound.x, Math.min(maxBound.x, closestPoint.x));
        closestPoint.y = Math.max(minBound.y, Math.min(maxBound.y, closestPoint.y));
        closestPoint.z = Math.max(minBound.z, Math.min(maxBound.z, closestPoint.z));
        
        // Calculate distance from sphere center to closest point
        const distanceVec = spherePos.clone().subtract(closestPoint);
        const distance = distanceVec.length();
        
        // Check if colliding
        if (distance < sphereRadius) {
            // Calculate collision properties
            result.collided = true;
            result.entity = other;
            result.point = closestPoint.clone();
            result.penetration = sphereRadius - distance;
            
            // Avoid division by zero
            if (distance > 0.0001) {
                result.normal = distanceVec.divideScalar(distance);
            } else {
                // If sphere center is inside box, find closest face
                const distToFace = new Vector3(
                    Math.min(Math.abs(spherePos.x - minBound.x), Math.abs(spherePos.x - maxBound.x)),
                    Math.min(Math.abs(spherePos.y - minBound.y), Math.abs(spherePos.y - maxBound.y)),
                    Math.min(Math.abs(spherePos.z - minBound.z), Math.abs(spherePos.z - maxBound.z))
                );
                
                // Use normal of closest face
                result.normal = new Vector3(0, 0, 0);
                if (distToFace.x <= distToFace.y && distToFace.x <= distToFace.z) {
                    result.normal.x = spherePos.x < boxPos.x ? -1 : 1;
                } else if (distToFace.y <= distToFace.z) {
                    result.normal.y = spherePos.y < boxPos.y ? -1 : 1;
                } else {
                    result.normal.z = spherePos.z < boxPos.z ? -1 : 1;
                }
            }
            
            // Calculate relative velocity if physics components are available
            this.calculateRelativeVelocity(other, result);
        }
        
        return result;
    }
    
    /**
     * Check box-box collision
     */
    private checkBoxBoxCollision(
        pos1: Vector3, size1: Vector3,
        pos2: Vector3, size2: Vector3,
        other: IEntity, result: CollisionResult
    ): CollisionResult {
        // Calculate half sizes
        const halfSize1 = size1.clone().multiplyScalar(0.5);
        const halfSize2 = size2.clone().multiplyScalar(0.5);
        
        // Calculate min/max bounds
        const min1 = pos1.clone().subtract(halfSize1);
        const max1 = pos1.clone().add(halfSize1);
        const min2 = pos2.clone().subtract(halfSize2);
        const max2 = pos2.clone().add(halfSize2);
        
        // Check for overlap
        if (min1.x <= max2.x && max1.x >= min2.x &&
            min1.y <= max2.y && max1.y >= min2.y &&
            min1.z <= max2.z && max1.z >= min2.z) {
            
            // Calculate overlap in each axis
            const overlapX = Math.min(max1.x - min2.x, max2.x - min1.x);
            const overlapY = Math.min(max1.y - min2.y, max2.y - min1.y);
            const overlapZ = Math.min(max1.z - min2.z, max2.z - min1.z);
            
            // Find axis of minimum penetration
            result.collided = true;
            result.entity = other;
            
            // Determine collision normal based on minimum overlap
            result.normal = new Vector3(0, 0, 0);
            
            if (overlapX <= overlapY && overlapX <= overlapZ) {
                result.penetration = overlapX;
                result.normal.x = pos1.x < pos2.x ? -1 : 1;
            } else if (overlapY <= overlapZ) {
                result.penetration = overlapY;
                result.normal.y = pos1.y < pos2.y ? -1 : 1;
            } else {
                result.penetration = overlapZ;
                result.normal.z = pos1.z < pos2.z ? -1 : 1;
            }
            
            // Calculate collision point (center of overlap region)
            const overlapMin = new Vector3(
                Math.max(min1.x, min2.x),
                Math.max(min1.y, min2.y),
                Math.max(min1.z, min2.z)
            );
            
            const overlapMax = new Vector3(
                Math.min(max1.x, max2.x),
                Math.min(max1.y, max2.y),
                Math.min(max1.z, max2.z)
            );
            
            result.point = overlapMin.add(overlapMax).multiplyScalar(0.5);
            
            // Calculate relative velocity if physics components are available
            this.calculateRelativeVelocity(other, result);
        }
        
        return result;
    }
    
    /**
     * Calculate relative velocity between entities
     */
    private calculateRelativeVelocity(other: IEntity, result: CollisionResult): void {
        if (!this.physicsComponent) {
            return;
        }
        
        const otherPhysics = other.getComponent('physics') as IPhysicsComponent | undefined;
        
        if (otherPhysics) {
            const vel1 = this.physicsComponent.getVelocity() || CollisionComponent.ZERO_VECTOR;
            const vel2 = otherPhysics.getVelocity() || CollisionComponent.ZERO_VECTOR;
            
            result.relativeVelocity = vel1.clone().subtract(vel2);
        } else {
            result.relativeVelocity = this.physicsComponent.getVelocity() || CollisionComponent.ZERO_VECTOR;
        }
    }
    
    /**
     * Find an entity by ID
     */
    private findEntityById(id: string): IEntity | undefined {
        // This is a simplified implementation
        // In a real game, you would use an entity manager or scene graph
        if (this.entity && this.entity.id.toString() === id) {
            return this.entity;
        }
        
        // For now, return undefined
        return undefined;
    }
    
    /**
     * Check if this component should collide with the given layer
     */
    private shouldCollideWithLayer(layer: number): boolean {
        return (this.filter.mask & (1 << layer)) !== 0;
    }
    
    /**
     * Get the shape type
     */
    public getShapeType(): CollisionShapeType {
        return this.shapeType;
    }
    
    /**
     * Get the radius
     */
    public getRadius(): number {
        return this.radius;
    }
    
    /**
     * Get the size
     */
    public getSize(): Vector3 {
        return this.size.clone();
    }
    
    /**
     * Get the offset
     */
    public getOffset(): Vector3 {
        return this.offset.clone();
    }
    
    /**
     * Get the layer
     */
    public getLayer(): number {
        return this.filter.layer;
    }
    
    /**
     * Set the layer
     */
    public setLayer(layer: number): void {
        this.filter.layer = layer;
    }
    
    /**
     * Set the collision mask
     */
    public setMask(mask: number): void {
        this.filter.mask = mask;
    }
    
    /**
     * Check if this is a trigger
     */
    public isTriggerCollider(): boolean {
        return this.isTrigger;
    }
    
    /**
     * Set whether this is a trigger
     */
    public setTrigger(isTrigger: boolean): void {
        this.isTrigger = isTrigger;
    }
    
    /**
     * Get the restitution
     */
    public getRestitution(): number {
        return this.restitution;
    }
    
    /**
     * Set the restitution
     */
    public setRestitution(restitution: number): void {
        this.restitution = Math.max(0, Math.min(1, restitution));
    }
    
    /**
     * Get the friction
     */
    public getFriction(): number {
        return this.friction;
    }
    
    /**
     * Set the friction
     */
    public setFriction(friction: number): void {
        this.friction = Math.max(0, Math.min(1, friction));
    }
    
    /**
     * Clean up resources
     */
    public override dispose(): void {
        if (this.debug) {
            this.logger.debug('Disposing collision component');
        }
        
        // Clear callbacks
        this.onCollisionCallback = undefined;
        this.onTriggerEnterCallback = undefined;
        this.onTriggerExitCallback = undefined;
        
        // Clear references
        this.physicsComponent = undefined;
        this.collidingEntities.clear();
        
        super.dispose();
    }
} 