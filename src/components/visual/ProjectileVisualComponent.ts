/**
 * ProjectileVisualComponent.ts
 * Visual component for projectiles
 */

import { Component } from '../Component';
import { IEntity } from '../../entities/IEntity';
import { Vector3 } from '../../types/common/Vector3';
import { Logger } from '../../utils/Logger';
import { EventSystem } from '../../core/EventSystem';
import { GameEventType } from '../../types/events/EventTypes';

/**
 * Projectile visual options
 */
export interface ProjectileVisualOptions {
    /**
     * Type of projectile
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
     * Trail effect options
     */
    trail?: {
        /**
         * Whether to enable the trail
         */
        enabled: boolean;
        
        /**
         * Length of the trail in seconds
         */
        length: number;
        
        /**
         * Color of the trail
         */
        color: string;
        
        /**
         * Width of the trail
         */
        width: number;
    };
    
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
 * Visual component for projectiles
 */
export class ProjectileVisualComponent extends Component {
    private logger: Logger;
    private eventSystem: EventSystem;
    
    private projectileType: string;
    private size: number;
    private color: string;
    private glow: boolean;
    private texturePath?: string;
    private trail: {
        enabled: boolean;
        length: number;
        color: string;
        width: number;
    };
    
    // Grenade-specific properties
    private fuseTime: number = 0;
    private secondaryColor: string;
    private creationTime: number;
    private isBlinking: boolean = false;
    private blinkRate: number = 1; // Blinks per second
    
    // Visual elements
    private trailPositions: Vector3[] = [];
    private trailTimestamps: number[] = [];
    
    /**
     * Create a new projectile visual component
     * @param options Projectile visual options
     */
    constructor(options: ProjectileVisualOptions) {
        super('visual');
        
        this.logger = new Logger('ProjectileVisualComponent');
        this.eventSystem = EventSystem.getInstance();
        
        // Store properties
        this.projectileType = options.type;
        this.size = options.size;
        this.color = options.color;
        this.glow = options.glow || false;
        this.texturePath = options.texturePath;
        
        // Set up trail
        this.trail = {
            enabled: options.trail?.enabled || false,
            length: options.trail?.length || 0.5,
            color: options.trail?.color || this.color,
            width: options.trail?.width || this.size * 0.5
        };
        
        // Set up grenade-specific properties
        this.fuseTime = options.fuseTime || 0;
        this.secondaryColor = options.secondaryColor || '#FFFF00'; // Yellow warning color
        this.creationTime = performance.now();
        
        this.logger.debug(`Created projectile visual component of type ${this.projectileType}`);
    }
    
    /**
     * Initialize the component
     * @param entity The entity this component belongs to
     */
    public override init(entity: IEntity): void {
        super.init(entity);
        this.logger.debug(`Initialized projectile visual component for entity ${entity.id}`);
    }
    
    /**
     * Update the component
     * @param deltaTime Time since last update in seconds
     */
    public override update(deltaTime: number): void {
        if (!this.entity) return;
        
        try {
            // Update trail if enabled
            if (this.trail.enabled) {
                this.updateTrail();
            }
            
            // Update grenade blinking effect if it has a fuse timer
            if (this.projectileType === 'grenade' && this.fuseTime > 0) {
                this.updateGrenadeBlinking();
            }
        } catch (error) {
            this.logger.error(`Error updating projectile visual: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Update the grenade blinking effect
     */
    private updateGrenadeBlinking(): void {
        const now = performance.now();
        const elapsedTime = (now - this.creationTime) / 1000; // Convert to seconds
        const remainingTime = this.fuseTime - elapsedTime;
        
        // Increase blink rate as detonation approaches
        if (remainingTime < this.fuseTime * 0.25) {
            this.blinkRate = 8; // Very fast blinking in last 25% of fuse time
        } else if (remainingTime < this.fuseTime * 0.5) {
            this.blinkRate = 4; // Fast blinking in last 50% of fuse time
        } else if (remainingTime < this.fuseTime * 0.75) {
            this.blinkRate = 2; // Medium blinking in last 75% of fuse time
        }
        
        // Calculate blink state based on time and blink rate
        const blinkCycle = Math.floor(elapsedTime * this.blinkRate) % 2;
        this.isBlinking = blinkCycle === 1;
    }
    
    /**
     * Update the trail effect
     */
    private updateTrail(): void {
        if (!this.entity) return;
        
        const now = performance.now();
        const position = this.entity.transform.position.clone();
        
        // Add current position to trail
        this.trailPositions.push(position);
        this.trailTimestamps.push(now);
        
        // Remove old trail positions
        const cutoffTime = now - this.trail.length * 1000; // Convert to milliseconds
        while (this.trailTimestamps.length > 0 && this.trailTimestamps[0] < cutoffTime) {
            this.trailPositions.shift();
            this.trailTimestamps.shift();
        }
    }
    
    /**
     * Render the projectile
     * @param ctx Canvas rendering context
     * @param camera Camera position and orientation
     */
    public render(ctx: CanvasRenderingContext2D, camera: any): void {
        if (!this.entity) return;
        
        try {
            // Render based on projectile type
            switch (this.projectileType) {
                case 'disc':
                    this.renderDisc(ctx, camera);
                    break;
                case 'grenade':
                    this.renderGrenade(ctx, camera);
                    break;
                case 'bullet':
                    this.renderBullet(ctx, camera);
                    break;
                case 'energy':
                    this.renderEnergy(ctx, camera);
                    break;
                default:
                    this.renderGeneric(ctx, camera);
                    break;
            }
            
            // Render trail if enabled
            if (this.trail.enabled && this.trailPositions.length > 1) {
                this.renderTrail(ctx, camera);
            }
        } catch (error) {
            this.logger.error(`Error rendering projectile: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Render a disc projectile
     * @param ctx Canvas rendering context
     * @param camera Camera position and orientation
     */
    private renderDisc(ctx: CanvasRenderingContext2D, camera: any): void {
        // In a real implementation, this would render a 3D disc
        // For now, we'll just log that it would be rendered
        this.logger.debug('Rendering disc projectile');
    }
    
    /**
     * Render a grenade projectile
     * @param ctx Canvas rendering context
     * @param camera Camera position and orientation
     */
    private renderGrenade(ctx: CanvasRenderingContext2D, camera: any): void {
        // In a real implementation, this would render a 3D grenade
        // For now, we'll just log that it would be rendered
        
        // Use blinking color if grenade is blinking
        const currentColor = this.isBlinking ? this.secondaryColor : this.color;
        
        this.logger.debug(`Rendering grenade projectile with color ${currentColor}`);
    }
    
    /**
     * Render a bullet projectile
     * @param ctx Canvas rendering context
     * @param camera Camera position and orientation
     */
    private renderBullet(ctx: CanvasRenderingContext2D, camera: any): void {
        // In a real implementation, this would render a bullet tracer
        // For now, we'll just log that it would be rendered
        this.logger.debug('Rendering bullet projectile');
    }
    
    /**
     * Render an energy projectile
     * @param ctx Canvas rendering context
     * @param camera Camera position and orientation
     */
    private renderEnergy(ctx: CanvasRenderingContext2D, camera: any): void {
        // In a real implementation, this would render an energy bolt
        // For now, we'll just log that it would be rendered
        this.logger.debug('Rendering energy projectile');
    }
    
    /**
     * Render a generic projectile
     * @param ctx Canvas rendering context
     * @param camera Camera position and orientation
     */
    private renderGeneric(ctx: CanvasRenderingContext2D, camera: any): void {
        // In a real implementation, this would render a generic projectile
        // For now, we'll just log that it would be rendered
        this.logger.debug('Rendering generic projectile');
    }
    
    /**
     * Render the trail effect
     * @param ctx Canvas rendering context
     * @param camera Camera position and orientation
     */
    private renderTrail(ctx: CanvasRenderingContext2D, camera: any): void {
        // In a real implementation, this would render a trail effect
        // For now, we'll just log that it would be rendered
        this.logger.debug('Rendering projectile trail');
    }
    
    /**
     * Get the current color of the projectile (accounting for blinking)
     * @returns Current color
     */
    public getCurrentColor(): string {
        return this.isBlinking ? this.secondaryColor : this.color;
    }
    
    /**
     * Set the fuse time for grenades
     * @param fuseTime Fuse time in seconds
     */
    public setFuseTime(fuseTime: number): void {
        this.fuseTime = fuseTime;
        this.creationTime = performance.now();
    }
    
    /**
     * Clean up resources
     */
    public override dispose(): void {
        this.logger.debug('Disposing projectile visual component');
        
        // Clear trail data
        this.trailPositions = [];
        this.trailTimestamps = [];
        
        super.dispose();
    }
} 