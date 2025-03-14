/**
 * PropComponent.ts
 * Base component for environmental props
 */

import { IComponent } from '../IComponent';
import { IEntity } from '../../entities/IEntity';
import { Vector3 } from '../../types/common/Vector3';
import { Logger } from '../../utils/Logger';

/**
 * Prop types
 */
export enum PropType {
    TREE = 'tree',
    ROCK = 'rock',
    BUSH = 'bush',
    STUMP = 'stump',
    LOG = 'log',
    SNOW_PILE = 'snowPile'
}

/**
 * Prop component options
 */
export interface PropComponentOptions {
    /**
     * Type of prop
     */
    type: PropType;
    
    /**
     * Scale of the prop (1.0 = normal size)
     */
    scale?: number;
    
    /**
     * Whether the prop has collision
     */
    hasCollision?: boolean;
    
    /**
     * Collision radius (for simple collision detection)
     */
    collisionRadius?: number;
    
    /**
     * Collision height (for simple collision detection)
     */
    collisionHeight?: number;
    
    /**
     * Whether the prop casts shadows
     */
    castsShadow?: boolean;
    
    /**
     * Custom color variation (0-1)
     */
    colorVariation?: number;
}

/**
 * Component for environmental props
 */
export class PropComponent implements IComponent {
    public readonly type: string = 'prop';
    public entity?: IEntity;
    
    private logger: Logger;
    private propType: PropType;
    private scale: number;
    private hasCollision: boolean;
    private collisionRadius: number;
    private collisionHeight: number;
    private castsShadow: boolean;
    private colorVariation: number;
    
    /**
     * Create a new prop component
     * @param options Prop options
     */
    constructor(options: PropComponentOptions) {
        this.logger = new Logger('PropComponent');
        
        this.propType = options.type;
        this.scale = options.scale || 1.0;
        this.hasCollision = options.hasCollision !== undefined ? options.hasCollision : true;
        this.collisionRadius = options.collisionRadius || 1.0;
        this.collisionHeight = options.collisionHeight || 2.0;
        this.castsShadow = options.castsShadow !== undefined ? options.castsShadow : true;
        this.colorVariation = options.colorVariation || 0;
        
        this.logger.debug(`Created ${this.propType} prop component`);
    }
    
    /**
     * Initialize the component
     * @param entity Entity to attach to
     */
    public init(entity: IEntity): void {
        this.entity = entity;
        this.logger.debug(`Initialized ${this.propType} prop at ${entity.transform.position.toString()}`);
    }
    
    /**
     * Update the component
     * @param deltaTime Time since last update
     */
    public update(deltaTime: number): void {
        // Most props are static and don't need updates
        // This method could be extended for animated props
    }
    
    /**
     * Check if an entity is colliding with this prop
     * @param otherEntity Entity to check collision with
     * @returns Whether the entities are colliding
     */
    public isCollidingWith(otherEntity: IEntity): boolean {
        if (!this.entity || !this.hasCollision) return false;
        
        const propPos = this.entity.transform.position;
        const entityPos = otherEntity.transform.position;
        
        // Simple cylinder collision check
        const horizontalDist = Math.sqrt(
            Math.pow(propPos.x - entityPos.x, 2) + 
            Math.pow(propPos.z - entityPos.z, 2)
        );
        
        const verticalDist = Math.abs(propPos.y - entityPos.y);
        
        return (
            horizontalDist < this.collisionRadius * this.scale &&
            verticalDist < this.collisionHeight * this.scale / 2
        );
    }
    
    /**
     * Get the prop type
     * @returns Prop type
     */
    public getPropType(): PropType {
        return this.propType;
    }
    
    /**
     * Get the prop scale
     * @returns Prop scale
     */
    public getScale(): number {
        return this.scale;
    }
    
    /**
     * Get whether the prop has collision
     * @returns Whether the prop has collision
     */
    public getHasCollision(): boolean {
        return this.hasCollision;
    }
    
    /**
     * Get the collision radius
     * @returns Collision radius
     */
    public getCollisionRadius(): number {
        return this.collisionRadius;
    }
    
    /**
     * Get the collision height
     * @returns Collision height
     */
    public getCollisionHeight(): number {
        return this.collisionHeight;
    }
    
    /**
     * Get whether the prop casts shadows
     * @returns Whether the prop casts shadows
     */
    public getCastsShadow(): boolean {
        return this.castsShadow;
    }
    
    /**
     * Get the color variation
     * @returns Color variation (0-1)
     */
    public getColorVariation(): number {
        return this.colorVariation;
    }
    
    /**
     * Clean up resources
     */
    public dispose(): void {
        this.entity = undefined;
    }
} 