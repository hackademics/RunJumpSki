/**
 * MapBoundaryComponent.ts
 * Handles map boundaries to prevent entities from going out of bounds
 */

import { Component } from '../Component';
import { IEntity } from '../../entities/IEntity';
import { Vector3 } from '../../types/common/Vector3';
import { Logger } from '../../utils/Logger';
import { TerrainConfig } from '../../config/TerrainConfig';
import { EventSystem } from '../../core/EventSystem';
import { GameEventType } from '../../types/events/EventTypes';
import { IPhysicsComponent } from '../physics/IPhysicsComponent';
import { IHealthComponent } from '../health/IHealthComponent';
import { IComponent } from '../IComponent';

/**
 * Map boundary options
 */
export interface MapBoundaryOptions {
    /**
     * Width of the boundary in world units
     */
    width: number;
    
    /**
     * Depth of the boundary in world units
     */
    depth: number;
    
    /**
     * Height of the boundary in world units
     */
    height: number;
    
    /**
     * Distance from boundary to show warning
     */
    warningDistance: number;
    
    /**
     * Behavior when entity crosses boundary
     */
    boundaryBehavior?: 'bounce' | 'teleport' | 'block' | 'reset' | 'damage';
    
    /**
     * Bounce factor (0-1) for bounce behavior
     */
    bounceFactor?: number;
    
    /**
     * Whether to use visual indicators for boundaries
     */
    useVisualIndicators?: boolean;
}

/**
 * Component that handles map boundaries
 */
export class MapBoundaryComponent extends Component implements IComponent {
    private logger: Logger;
    private eventSystem: EventSystem;
    
    // Boundary limits
    private minX: number;
    private maxX: number;
    private minZ: number;
    private maxZ: number;
    private minY: number;
    private maxY: number;
    
    // Behavior options
    private useVisualIndicators: boolean;
    private boundaryBehavior: 'bounce' | 'teleport' | 'block' | 'reset' | 'damage';
    private resetPosition: Vector3;
    private bounceFactor: number;
    private damageAmount: number;
    
    // Tracking
    private outOfBoundsEntities: Set<string> = new Set();
    private outOfBoundsTime: number = 0;
    private warningDisplayed: boolean = false;
    
    private width: number;
    private depth: number;
    private height: number;
    private warningDistance: number;
    
    /**
     * Create a new map boundary component
     * @param options Map boundary options
     */
    constructor(options: MapBoundaryOptions) {
        super('mapBoundary');
        
        this.logger = new Logger('MapBoundaryComponent');
        this.eventSystem = EventSystem.getInstance();
        
        // Store dimensions
        this.width = options.width;
        this.depth = options.depth;
        this.height = options.height;
        this.warningDistance = options.warningDistance;
        
        // Calculate boundary coordinates from dimensions
        // Assuming the map is centered at (0,0)
        this.minX = -this.width / 2;
        this.maxX = this.width / 2;
        this.minZ = -this.depth / 2;
        this.maxZ = this.depth / 2;
        this.minY = 0;
        this.maxY = this.height;
        
        // Set behavior options
        this.useVisualIndicators = options.useVisualIndicators !== undefined ? options.useVisualIndicators : true;
        this.boundaryBehavior = options.boundaryBehavior || 'bounce';
        this.bounceFactor = options.bounceFactor || 0.5;
        
        // Initialize other properties
        this.resetPosition = new Vector3(0, this.maxY / 2, 0);
        this.damageAmount = 10;
        
        this.logger.debug('MapBoundaryComponent created');
    }
    
    /**
     * Initialize the component
     * @param entity The entity this component belongs to
     */
    public override init(entity: IEntity): void {
        super.init(entity);
        this.logger.debug('MapBoundaryComponent initialized');
    }
    
    /**
     * Update the component
     * @param deltaTime Time since last update in seconds
     */
    public override update(deltaTime: number): void {
        if (!this.entity) {
            return;
        }
        
        // Get entity position
        const position = this.entity.transform.position;
        
        // Check if entity is out of bounds
        const wasOutOfBounds = this.isOutOfBounds;
        this.isOutOfBounds = this.checkOutOfBounds(position);
        
        // Handle out of bounds state
        if (this.isOutOfBounds) {
            // Increment out of bounds time
            this.outOfBoundsTime += deltaTime;
            
            // Display warning if not already displayed
            if (!this.warningDisplayed && this.useVisualIndicators) {
                this.displayBoundaryWarning();
                this.warningDisplayed = true;
            }
            
            // Handle boundary behavior
            this.handleBoundaryBehavior(position);
        } else {
            // Reset tracking if back in bounds
            if (wasOutOfBounds) {
                this.outOfBoundsTime = 0;
                this.warningDisplayed = false;
                
                // Notify that entity is back in bounds
                this.eventSystem.emit(GameEventType.ENTITY_IN_BOUNDS, {
                    entityId: this.entity.id
                });
            }
        }
    }
    
    /**
     * Check if a position is out of bounds
     * @param position Position to check
     * @returns Whether the position is out of bounds
     */
    public checkOutOfBounds(position: Vector3): boolean {
        return (
            position.x < this.minX ||
            position.x > this.maxX ||
            position.z < this.minZ ||
            position.z > this.maxZ ||
            position.y < this.minY ||
            position.y > this.maxY
        );
    }
    
    /**
     * Handle boundary behavior based on configuration
     * @param position Current entity position
     */
    private handleBoundaryBehavior(position: Vector3): void {
        if (!this.entity) {
            return;
        }
        
        // Get entity physics component if available
        const physicsComponent = this.entity.getComponent('physics') as IPhysicsComponent | undefined;
        
        switch (this.boundaryBehavior) {
            case 'block':
                // Clamp position to boundaries
                position.x = Math.max(this.minX, Math.min(this.maxX, position.x));
                position.z = Math.max(this.minZ, Math.min(this.maxZ, position.z));
                position.y = Math.max(this.minY, Math.min(this.maxY, position.y));
                
                // Zero out velocity in the direction of the boundary
                if (physicsComponent && physicsComponent.getVelocity) {
                    const velocity = physicsComponent.getVelocity();
                    
                    if (position.x === this.minX || position.x === this.maxX) {
                        velocity.x = 0;
                    }
                    
                    if (position.z === this.minZ || position.z === this.maxZ) {
                        velocity.z = 0;
                    }
                    
                    if (position.y === this.minY || position.y === this.maxY) {
                        velocity.y = 0;
                    }
                }
                break;
                
            case 'bounce':
                // Bounce off boundaries
                if (physicsComponent && physicsComponent.getVelocity) {
                    const velocity = physicsComponent.getVelocity();
                    
                    if (position.x < this.minX) {
                        position.x = this.minX;
                        velocity.x = Math.abs(velocity.x) * this.bounceFactor;
                    } else if (position.x > this.maxX) {
                        position.x = this.maxX;
                        velocity.x = -Math.abs(velocity.x) * this.bounceFactor;
                    }
                    
                    if (position.z < this.minZ) {
                        position.z = this.minZ;
                        velocity.z = Math.abs(velocity.z) * this.bounceFactor;
                    } else if (position.z > this.maxZ) {
                        position.z = this.maxZ;
                        velocity.z = -Math.abs(velocity.z) * this.bounceFactor;
                    }
                    
                    if (position.y < this.minY) {
                        position.y = this.minY;
                        velocity.y = Math.abs(velocity.y) * this.bounceFactor;
                    } else if (position.y > this.maxY) {
                        position.y = this.maxY;
                        velocity.y = -Math.abs(velocity.y) * this.bounceFactor;
                    }
                } else {
                    // Fallback to block behavior if no physics component
                    position.x = Math.max(this.minX, Math.min(this.maxX, position.x));
                    position.z = Math.max(this.minZ, Math.min(this.maxZ, position.z));
                    position.y = Math.max(this.minY, Math.min(this.maxY, position.y));
                }
                break;
                
            case 'teleport':
                // Teleport to opposite boundary
                if (position.x < this.minX) {
                    position.x = this.maxX - (this.minX - position.x);
                } else if (position.x > this.maxX) {
                    position.x = this.minX + (position.x - this.maxX);
                }
                
                if (position.z < this.minZ) {
                    position.z = this.maxZ - (this.minZ - position.z);
                } else if (position.z > this.maxZ) {
                    position.z = this.minZ + (position.z - this.maxZ);
                }
                
                // Don't teleport vertically, just clamp
                position.y = Math.max(this.minY, Math.min(this.maxY, position.y));
                break;
                
            case 'reset':
                // Reset to specified position after a delay
                if (this.outOfBoundsTime > 3.0) {
                    position.copyFrom(this.resetPosition);
                    
                    // Reset velocity
                    if (physicsComponent && physicsComponent.getVelocity) {
                        const velocity = physicsComponent.getVelocity();
                        velocity.set(0, 0, 0);
                    }
                    
                    // Reset tracking
                    this.outOfBoundsTime = 0;
                    this.warningDisplayed = false;
                    
                    // Notify that entity was reset
                    this.eventSystem.emit(GameEventType.ENTITY_RESET, {
                        entityId: this.entity.id,
                        reason: 'out_of_bounds'
                    });
                }
                break;
                
            case 'damage':
                // Damage entity and reset after a delay
                if (this.outOfBoundsTime > 3.0) {
                    // Apply damage
                    const healthComponent = this.entity.getComponent('health') as IHealthComponent | undefined;
                    if (healthComponent && healthComponent.takeDamage) {
                        healthComponent.takeDamage(this.damageAmount, 'out_of_bounds');
                    }
                    
                    // Reset position
                    position.copyFrom(this.resetPosition);
                    
                    // Reset velocity
                    if (physicsComponent && physicsComponent.getVelocity) {
                        const velocity = physicsComponent.getVelocity();
                        velocity.set(0, 0, 0);
                    }
                    
                    // Reset tracking
                    this.outOfBoundsTime = 0;
                    this.warningDisplayed = false;
                    
                    // Notify that entity was reset
                    this.eventSystem.emit(GameEventType.ENTITY_RESET, {
                        entityId: this.entity.id,
                        reason: 'out_of_bounds_damage'
                    });
                }
                break;
        }
    }
    
    /**
     * Display a warning when entity is near or at boundary
     */
    private displayBoundaryWarning(): void {
        if (!this.entity) {
            return;
        }
        
        // Emit event for UI to display warning
        this.eventSystem.emit(GameEventType.BOUNDARY_WARNING, {
            entityId: this.entity.id,
            outOfBoundsTime: this.outOfBoundsTime
        });
        
        this.logger.debug(`Boundary warning for entity ${this.entity.id}`);
    }
    
    /**
     * Get the current boundary settings
     * @returns Boundary settings
     */
    public getBoundarySettings(): {
        minX: number;
        maxX: number;
        minZ: number;
        maxZ: number;
        minY: number;
        maxY: number;
    } {
        return {
            minX: this.minX,
            maxX: this.maxX,
            minZ: this.minZ,
            maxZ: this.maxZ,
            minY: this.minY,
            maxY: this.maxY
        };
    }
    
    /**
     * Update boundary settings
     * @param settings New boundary settings
     */
    public updateSettings(settings: Partial<MapBoundaryOptions>): void {
        if (settings.useVisualIndicators !== undefined) this.useVisualIndicators = settings.useVisualIndicators;
        if (settings.boundaryBehavior !== undefined) this.boundaryBehavior = settings.boundaryBehavior;
        if (settings.bounceFactor !== undefined) this.bounceFactor = settings.bounceFactor;
        
        if (settings.width !== undefined) this.width = settings.width;
        if (settings.depth !== undefined) this.depth = settings.depth;
        if (settings.height !== undefined) this.height = settings.height;
        if (settings.warningDistance !== undefined) this.warningDistance = settings.warningDistance;
        
        // Recalculate boundary coordinates if dimensions changed
        if (settings.width !== undefined || settings.depth !== undefined || settings.height !== undefined) {
            this.minX = -this.width / 2;
            this.maxX = this.width / 2;
            this.minZ = -this.depth / 2;
            this.maxZ = this.depth / 2;
            this.minY = 0;
            this.maxY = this.height;
        }
        
        this.logger.debug('Boundary settings updated');
    }
    
    /**
     * Clean up resources
     */
    public override dispose(): void {
        this.logger.debug('MapBoundaryComponent disposed');
        super.dispose();
    }
    
    /**
     * Get the width of the boundary
     * @returns Width in world units
     */
    public getWidth(): number {
        return this.width;
    }
    
    /**
     * Get the depth of the boundary
     * @returns Depth in world units
     */
    public getDepth(): number {
        return this.depth;
    }
    
    /**
     * Get the height of the boundary
     * @returns Height in world units
     */
    public getHeight(): number {
        return this.height;
    }
    
    /**
     * Get the warning distance
     * @returns Warning distance in world units
     */
    public getWarningDistance(): number {
        return this.warningDistance;
    }
} 