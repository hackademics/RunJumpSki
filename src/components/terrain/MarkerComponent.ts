/**
 * MarkerComponent.ts
 * Component for start and finish line markers
 */

import { Component } from '../Component';
import { IEntity } from '../../entities/IEntity';
import { Vector3 } from '../../types/common/Vector3';
import { Logger } from '../../utils/Logger';
import { EventSystem } from '../../core/EventSystem';
import { GameEventType } from '../../types/events/EventTypes';

/**
 * Marker type enum
 */
export enum MarkerType {
    START = 'start',
    FINISH = 'finish',
    CHECKPOINT = 'checkpoint'
}

/**
 * Marker options interface
 */
export interface MarkerOptions {
    /**
     * Type of marker
     */
    type: MarkerType;
    
    /**
     * Position of the marker
     */
    position?: Vector3;
    
    /**
     * Width of the marker line
     */
    width?: number;
    
    /**
     * Rotation of the marker in degrees (around Y axis)
     */
    rotation?: number;
    
    /**
     * Whether the marker is active
     */
    active?: boolean;
    
    /**
     * Custom color for the marker
     */
    color?: string;
    
    /**
     * Whether to show visual effects
     */
    showEffects?: boolean;
    
    /**
     * Checkpoint number (for checkpoint markers)
     */
    checkpointNumber?: number;
}

/**
 * Component for start and finish line markers
 */
export class MarkerComponent extends Component {
    private logger: Logger;
    private eventSystem: EventSystem;
    
    // Marker properties
    private markerType: MarkerType;
    private width: number;
    private rotation: number;
    private isActive: boolean;
    private color: string;
    private showEffects: boolean;
    private checkpointNumber: number;
    
    // Tracking
    private playerCrossed: boolean = false;
    private crossingTime: number = 0;
    
    /**
     * Create a new marker component
     * @param options Marker options
     */
    constructor(options: MarkerOptions) {
        super('marker');
        
        this.logger = new Logger('MarkerComponent');
        this.eventSystem = EventSystem.getInstance();
        
        // Set properties from options
        this.markerType = options.type;
        this.width = options.width || 20;
        this.rotation = options.rotation || 0;
        this.isActive = options.active !== undefined ? options.active : true;
        this.checkpointNumber = options.checkpointNumber || 0;
        
        // Set default colors based on marker type
        if (options.color) {
            this.color = options.color;
        } else {
            switch (this.markerType) {
                case MarkerType.START:
                    this.color = 'rgba(0, 255, 0, 0.7)'; // Green
                    break;
                case MarkerType.FINISH:
                    this.color = 'rgba(255, 0, 0, 0.7)'; // Red
                    break;
                case MarkerType.CHECKPOINT:
                    this.color = 'rgba(0, 0, 255, 0.7)'; // Blue
                    break;
                default:
                    this.color = 'rgba(255, 255, 255, 0.7)'; // White
            }
        }
        
        this.showEffects = options.showEffects !== undefined ? options.showEffects : true;
        
        this.logger.debug(`Created ${this.markerType} marker`);
    }
    
    /**
     * Initialize the component
     * @param entity The entity this component belongs to
     */
    public override init(entity: IEntity): void {
        super.init(entity);
        
        // If position was provided in options, set entity position
        if (this.entity) {
            this.logger.debug(`Initialized ${this.markerType} marker at ${this.entity.transform.position.toString()}`);
        }
    }
    
    /**
     * Update the component
     * @param deltaTime Time since last update in seconds
     */
    public override update(deltaTime: number): void {
        if (!this.entity || !this.isActive) {
            return;
        }
        
        // Check for player crossing the marker
        this.checkPlayerCrossing();
        
        // Update visual effects if enabled
        if (this.showEffects) {
            this.updateVisualEffects(deltaTime);
        }
    }
    
    /**
     * Check if a player has crossed the marker
     */
    private checkPlayerCrossing(): void {
        if (!this.entity || this.playerCrossed) {
            return;
        }
        
        // Get all player entities in the scene
        // In a real implementation, we would use a proper collision system
        // For now, we'll use a simple distance check
        
        // Get player entity from the game
        const player = this.findPlayerEntity();
        
        if (!player) {
            return;
        }
        
        // Check if player has crossed the marker line
        if (this.hasEntityCrossedMarker(player)) {
            this.handleMarkerCrossed(player);
        }
    }
    
    /**
     * Find the player entity
     * @returns Player entity or undefined if not found
     */
    private findPlayerEntity(): IEntity | undefined {
        // In a real implementation, we would use a proper entity registry
        // For now, we'll assume there's a global player entity
        
        // This is a placeholder - in a real implementation, we would get the player from the game
        return undefined;
    }
    
    /**
     * Check if an entity has crossed the marker line
     * @param entity Entity to check
     * @returns Whether the entity has crossed the marker
     */
    private hasEntityCrossedMarker(entity: IEntity): boolean {
        if (!this.entity) {
            return false;
        }
        
        // Get marker position and direction
        const markerPos = this.entity.transform.position;
        const markerDir = new Vector3(
            Math.sin(this.rotation * Math.PI / 180),
            0,
            Math.cos(this.rotation * Math.PI / 180)
        );
        
        // Get entity position
        const entityPos = entity.transform.position;
        
        // Calculate distance from entity to marker line
        const toEntity = entityPos.clone().subtract(markerPos);
        
        // Project onto marker direction to get distance along marker
        const alongMarker = toEntity.dot(markerDir);
        
        // Calculate perpendicular distance to marker line
        const perpMarker = new Vector3(
            -markerDir.z,
            0,
            markerDir.x
        );
        
        const distToLine = Math.abs(toEntity.dot(perpMarker));
        
        // Check if entity is within marker width and has crossed the line
        return distToLine < this.width / 2;
    }
    
    /**
     * Handle marker being crossed by an entity
     * @param entity Entity that crossed the marker
     */
    private handleMarkerCrossed(entity: IEntity): void {
        this.playerCrossed = true;
        this.crossingTime = performance.now();
        
        // Emit appropriate event based on marker type
        switch (this.markerType) {
            case MarkerType.START:
                this.eventSystem.emit(GameEventType.MARKER_START_CROSSED, {
                    entityId: entity.id,
                    markerId: this.entity?.id,
                    time: this.crossingTime
                });
                break;
                
            case MarkerType.FINISH:
                this.eventSystem.emit(GameEventType.MARKER_FINISH_CROSSED, {
                    entityId: entity.id,
                    markerId: this.entity?.id,
                    time: this.crossingTime
                });
                break;
                
            case MarkerType.CHECKPOINT:
                this.eventSystem.emit(GameEventType.MARKER_CHECKPOINT_CROSSED, {
                    entityId: entity.id,
                    markerId: this.entity?.id,
                    checkpointNumber: this.checkpointNumber,
                    time: this.crossingTime
                });
                break;
        }
        
        this.logger.debug(`Entity ${entity.id} crossed ${this.markerType} marker`);
    }
    
    /**
     * Update visual effects for the marker
     * @param deltaTime Time since last update in seconds
     */
    private updateVisualEffects(deltaTime: number): void {
        // This would be implemented in a real game with particle effects, etc.
        // For now, it's just a placeholder
    }
    
    /**
     * Get the marker type
     * @returns Marker type
     */
    public getMarkerType(): MarkerType {
        return this.markerType;
    }
    
    /**
     * Get the marker width
     * @returns Marker width
     */
    public getWidth(): number {
        return this.width;
    }
    
    /**
     * Set the marker width
     * @param width New marker width
     */
    public setWidth(width: number): void {
        this.width = width;
    }
    
    /**
     * Get the marker rotation
     * @returns Marker rotation in degrees
     */
    public getRotation(): number {
        return this.rotation;
    }
    
    /**
     * Set the marker rotation
     * @param rotation New marker rotation in degrees
     */
    public setRotation(rotation: number): void {
        this.rotation = rotation;
    }
    
    /**
     * Get whether the marker is active
     * @returns Whether the marker is active
     */
    public isMarkerActive(): boolean {
        return this.isActive;
    }
    
    /**
     * Set whether the marker is active
     * @param active Whether the marker should be active
     */
    public setActive(active: boolean): void {
        this.isActive = active;
    }
    
    /**
     * Reset the marker's crossed state
     */
    public reset(): void {
        this.playerCrossed = false;
        this.crossingTime = 0;
    }
    
    /**
     * Clean up resources
     */
    public override dispose(): void {
        this.logger.debug(`Disposing ${this.markerType} marker`);
        super.dispose();
    }
} 