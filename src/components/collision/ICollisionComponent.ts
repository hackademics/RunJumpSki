/**
 * ICollisionComponent.ts
 * Interface for collision components
 */

import { Vector3 } from '../../types/common/Vector3';
import { IComponent } from '../../entities/IEntity';
import { TerrainData } from '../../components/movement/MovementState';

/**
 * Collision shape type
 */
export enum CollisionShapeType {
    BOX = 'box',
    SPHERE = 'sphere',
    CAPSULE = 'capsule'
}

/**
 * Collision filter groups
 */
export enum CollisionGroup {
    DEFAULT = 1,
    PLAYER = 2,
    TERRAIN = 4,
    OBJECT = 8,
    TRIGGER = 16
}

/**
 * Collision component interface
 */
export interface ICollisionComponent extends IComponent {
    /**
     * Get the collision shape type
     */
    getShapeType(): CollisionShapeType;
    
    /**
     * Get the collision radius (for sphere and capsule)
     */
    getRadius(): number;
    
    /**
     * Get the collision dimensions (for box)
     */
    getDimensions(): Vector3;
    
    /**
     * Get the collision height (for capsule)
     */
    getHeight(): number;
    
    /**
     * Get the collision offset from entity position
     */
    getOffset(): Vector3;
    
    /**
     * Check if the entity is on the ground
     */
    isGrounded(): boolean;
    
    /**
     * Set whether the entity is on the ground
     * @param grounded Whether the entity is on the ground
     * @param normal Ground normal vector
     */
    setGrounded(grounded: boolean, normal?: Vector3): void;
    
    /**
     * Get the ground normal vector
     */
    getGroundNormal(): Vector3;
    
    /**
     * Get the collision group
     */
    getCollisionGroup(): number;
    
    /**
     * Get the collision mask (what groups this collides with)
     */
    getCollisionMask(): number;
    
    /**
     * Set the collision group
     * @param group Collision group
     */
    setCollisionGroup(group: number): void;
    
    /**
     * Set the collision mask
     * @param mask Collision mask
     */
    setCollisionMask(mask: number): void;
    
    /**
     * Check if this component collides with the specified group
     * @param group Collision group to check
     */
    collidesWithGroup(group: number): boolean;
    
    /**
     * Get the terrain data at the current position
     */
    getTerrainData(): TerrainData | undefined;
    
    /**
     * Set the terrain data
     * @param terrainData Terrain data
     */
    setTerrainData(terrainData: TerrainData): void;
    
    /**
     * Handle collision with another entity
     * @param otherEntityId Other entity ID
     * @param collisionPoint Collision point
     * @param collisionNormal Collision normal
     * @param penetrationDepth Penetration depth
     */
    handleCollision(
        otherEntityId: string,
        collisionPoint: Vector3,
        collisionNormal: Vector3,
        penetrationDepth: number
    ): void;
} 