/**
 * MarkerComponent.ts
 * Component for handling race markers (start, finish, checkpoints)
 */

import { IComponent } from '../IComponent';
import { IEntity } from '../../entities/IEntity';
import { Vector3 } from '../../types/common/Vector3';
import { EventSystem } from '../../core/EventSystem';
import { GameEventType } from '../../types/events/EventTypes';
import { Logger } from '../../utils/Logger';

/**
 * Marker types
 */
export enum MarkerType {
    START = 'start',
    FINISH = 'finish',
    CHECKPOINT = 'checkpoint'
}

/**
 * Marker component options
 */
export interface MarkerComponentOptions {
    /**
     * Type of marker
     */
    type: MarkerType;
    
    /**
     * Checkpoint number (for checkpoint markers)
     */
    checkpointNumber?: number;
    
    /**
     * Size of the marker trigger area
     */
    size?: Vector3;
    
    /**
     * Color of the marker (for visualization)
     */
    color?: string;
    
    /**
     * Whether the marker is active
     */
    active?: boolean;
}

/**
 * Component for race markers
 */
export class MarkerComponent implements IComponent {
    public readonly type: string = 'marker';
    public entity?: IEntity;
    
    private logger: Logger;
    private eventSystem: EventSystem;
    private markerType: MarkerType;
    private checkpointNumber: number;
    private size: Vector3;
    private color: string;
    private active: boolean;
    private triggered: Set<string> = new Set();
    
    /**
     * Create a new marker component
     * @param options Marker options
     */
    constructor(options: MarkerComponentOptions) {
        this.logger = new Logger('MarkerComponent');
        this.eventSystem = EventSystem.getInstance();
        
        this.markerType = options.type;
        this.checkpointNumber = options.checkpointNumber || 0;
        this.size = options.size || new Vector3(5, 5, 5);
        
        // Set default colors based on marker type
        if (options.color) {
            this.color = options.color;
        } else {
            switch (this.markerType) {
                case MarkerType.START:
                    this.color = '#00ff00'; // Green
                    break;
                case MarkerType.FINISH:
                    this.color = '#ff0000'; // Red
                    break;
                case MarkerType.CHECKPOINT:
                    this.color = '#0000ff'; // Blue
                    break;
                default:
                    this.color = '#ffffff'; // White
            }
        }
        
        this.active = options.active !== undefined ? options.active : true;
    }
    
    /**
     * Initialize the component
     * @param entity Entity to attach to
     */
    public init(entity: IEntity): void {
        this.entity = entity;
        this.logger.debug(`Marker component initialized: ${this.markerType} (${entity.name})`);
    }
    
    /**
     * Update the component
     * @param deltaTime Time since last update
     */
    public update(deltaTime: number): void {
        if (!this.active || !this.entity) return;
        
        // In a real implementation, we would check for collisions with other entities
        // For now, we'll just log that the marker is active
    }
    
    /**
     * Check if an entity is within the marker's trigger area
     * @param otherEntity Entity to check
     * @returns Whether the entity is within the trigger area
     */
    public isEntityInTriggerArea(otherEntity: IEntity): boolean {
        if (!this.entity || !this.active) return false;
        
        const markerPos = this.entity.transform.position;
        const entityPos = otherEntity.transform.position;
        
        // Simple box check
        return (
            entityPos.x >= markerPos.x - this.size.x / 2 &&
            entityPos.x <= markerPos.x + this.size.x / 2 &&
            entityPos.y >= markerPos.y - this.size.y / 2 &&
            entityPos.y <= markerPos.y + this.size.y / 2 &&
            entityPos.z >= markerPos.z - this.size.z / 2 &&
            entityPos.z <= markerPos.z + this.size.z / 2
        );
    }
    
    /**
     * Trigger the marker for an entity
     * @param otherEntity Entity that triggered the marker
     */
    public trigger(otherEntity: IEntity): void {
        if (!this.active || !this.entity) return;
        
        // Check if this entity has already triggered this marker
        const entityId = otherEntity.id.toString();
        if (this.triggered.has(entityId)) return;
        
        // Mark as triggered for this entity
        this.triggered.add(entityId);
        
        // Emit the appropriate event based on marker type
        const time = performance.now();
        
        switch (this.markerType) {
            case MarkerType.START:
                this.logger.debug(`Start marker triggered by entity ${entityId}`);
                this.eventSystem.emit(GameEventType.MARKER_START_CROSSED, {
                    type: GameEventType.MARKER_START_CROSSED,
                    entityId: entityId,
                    markerId: this.entity.id.toString(),
                    time: time
                });
                break;
                
            case MarkerType.FINISH:
                this.logger.debug(`Finish marker triggered by entity ${entityId}`);
                this.eventSystem.emit(GameEventType.MARKER_FINISH_CROSSED, {
                    type: GameEventType.MARKER_FINISH_CROSSED,
                    entityId: entityId,
                    markerId: this.entity.id.toString(),
                    time: time
                });
                break;
                
            case MarkerType.CHECKPOINT:
                this.logger.debug(`Checkpoint ${this.checkpointNumber} triggered by entity ${entityId}`);
                this.eventSystem.emit(GameEventType.MARKER_CHECKPOINT_CROSSED, {
                    type: GameEventType.MARKER_CHECKPOINT_CROSSED,
                    entityId: entityId,
                    markerId: this.entity.id.toString(),
                    checkpointNumber: this.checkpointNumber,
                    time: time
                });
                break;
        }
    }
    
    /**
     * Reset the marker's triggered state
     * @param entityId Optional entity ID to reset for (if not provided, resets for all entities)
     */
    public reset(entityId?: string): void {
        if (entityId) {
            this.triggered.delete(entityId);
        } else {
            this.triggered.clear();
        }
    }
    
    /**
     * Get the marker type
     * @returns Marker type
     */
    public getMarkerType(): MarkerType {
        return this.markerType;
    }
    
    /**
     * Get the checkpoint number
     * @returns Checkpoint number
     */
    public getCheckpointNumber(): number {
        return this.checkpointNumber;
    }
    
    /**
     * Get the marker color
     * @returns Marker color
     */
    public getColor(): string {
        return this.color;
    }
    
    /**
     * Get the marker size
     * @returns Marker size
     */
    public getSize(): Vector3 {
        return this.size;
    }
    
    /**
     * Set the marker active state
     * @param active Whether the marker is active
     */
    public setActive(active: boolean): void {
        this.active = active;
    }
    
    /**
     * Get the marker active state
     * @returns Whether the marker is active
     */
    public isActive(): boolean {
        return this.active;
    }
    
    /**
     * Clean up resources
     */
    public dispose(): void {
        this.triggered.clear();
        this.entity = undefined;
    }
} 