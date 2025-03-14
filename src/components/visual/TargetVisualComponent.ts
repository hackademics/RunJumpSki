/**
 * TargetVisualComponent.ts
 * Visual component for targets
 */

import { Component } from '../Component';
import { IEntity } from '../../entities/IEntity';
import { Vector3 } from '../../types/common/Vector3';
import { Logger } from '../../utils/Logger';
import { TargetShape } from '../../entities/TargetEntity';

/**
 * Target visual options
 */
export interface TargetVisualOptions {
    /**
     * Shape of the target
     */
    shape: TargetShape;
    
    /**
     * Size of the target (radius or half-width)
     */
    size: number;
    
    /**
     * Color of the target
     */
    color: string;
    
    /**
     * Whether the target is destructible
     */
    destructible: boolean;
    
    /**
     * Texture path for the target
     */
    texturePath?: string;
    
    /**
     * Glow effect
     */
    glow?: boolean;
    
    /**
     * Rotation speed for spinning targets (radians per second)
     */
    rotationSpeed?: number;
    
    /**
     * Debug mode - enables verbose logging
     */
    debug?: boolean;
}

/**
 * Visual component for targets
 */
export class TargetVisualComponent extends Component {
    private logger: Logger;
    
    private shape: TargetShape;
    private size: number;
    private color: string;
    private destructible: boolean;
    private texturePath?: string;
    private glow: boolean;
    private rotationSpeed: number;
    private debug: boolean;
    
    // Visual state
    private damageLevel: number = 0; // 0 = undamaged, 1 = fully damaged
    private isHit: boolean = false;
    private hitEffectTime: number = 0;
    private hitEffectDuration: number = 0.2; // seconds
    
    // Cached RGB values to avoid parsing hex colors repeatedly
    private originalRgb: { r: number, g: number, b: number };
    private damagedRgb: { r: number, g: number, b: number } = { r: 100, g: 0, b: 0 }; // Dark red
    
    // Reusable Vector3 for rotation updates
    private tempRotation: Vector3 = new Vector3(0, 0, 0);
    
    // Performance tracking
    private lastRenderTime: number = 0;
    private frameCount: number = 0;
    private averageRenderTime: number = 0;
    
    /**
     * Create a new target visual component
     * @param options Target visual options
     */
    constructor(options: TargetVisualOptions) {
        super('visual');
        
        this.logger = new Logger('TargetVisualComponent');
        
        // Store properties
        this.shape = options.shape;
        this.size = options.size;
        this.color = options.color;
        this.destructible = options.destructible;
        this.texturePath = options.texturePath;
        this.glow = options.glow || false;
        this.rotationSpeed = options.rotationSpeed || 0;
        this.debug = options.debug || false;
        
        // Pre-compute RGB values
        this.originalRgb = this.hexToRgb(this.color);
        
        if (this.debug) {
            this.logger.debug(`Created target visual component with shape ${this.shape}`);
        }
    }
    
    /**
     * Initialize the component
     * @param entity The entity this component belongs to
     */
    public override init(entity: IEntity): void {
        try {
            super.init(entity);
            if (this.debug) {
                this.logger.debug(`Initialized target visual component for entity ${entity.id}`);
            }
        } catch (error) {
            this.logger.error(`Error initializing target visual component: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Update the component
     * @param deltaTime Time since last update in seconds
     */
    public override update(deltaTime: number): void {
        if (!this.entity) return;
        
        try {
            // Update hit effect
            if (this.isHit) {
                this.hitEffectTime += deltaTime;
                if (this.hitEffectTime >= this.hitEffectDuration) {
                    this.isHit = false;
                    this.hitEffectTime = 0;
                }
            }
            
            // Update rotation for spinning targets
            if (this.rotationSpeed > 0) {
                const currentRotation = this.entity.transform.rotation;
                
                // Use tempRotation to avoid creating new Vector3 objects
                this.tempRotation.set(
                    currentRotation.x,
                    currentRotation.y + this.rotationSpeed * deltaTime,
                    currentRotation.z
                );
                
                this.entity.transform.rotation.copy(this.tempRotation);
            }
        } catch (error) {
            this.logger.error(`Error updating target visual: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Render the target
     * @param ctx Canvas rendering context
     * @param camera Camera position and orientation
     */
    public render(ctx: CanvasRenderingContext2D, camera: any): void {
        if (!this.entity) return;
        
        try {
            const startTime = performance.now();
            
            // Determine current color based on damage and hit state
            const currentColor = this.getCurrentColor();
            
            // Render based on shape
            switch (this.shape) {
                case TargetShape.CIRCLE:
                    this.renderCircle(ctx, camera, currentColor);
                    break;
                case TargetShape.SQUARE:
                    this.renderSquare(ctx, camera, currentColor);
                    break;
                case TargetShape.TRIANGLE:
                    this.renderTriangle(ctx, camera, currentColor);
                    break;
                case TargetShape.DIAMOND:
                    this.renderDiamond(ctx, camera, currentColor);
                    break;
                default:
                    this.renderCircle(ctx, camera, currentColor);
                    break;
            }
            
            // Track render performance
            const endTime = performance.now();
            const renderTime = endTime - startTime;
            
            this.frameCount++;
            this.averageRenderTime = (this.averageRenderTime * (this.frameCount - 1) + renderTime) / this.frameCount;
            
            // Log performance metrics occasionally
            if (this.debug && this.frameCount % 100 === 0) {
                this.logger.debug(`Average render time: ${this.averageRenderTime.toFixed(2)}ms over ${this.frameCount} frames`);
            }
        } catch (error) {
            this.logger.error(`Error rendering target: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Render a circular target
     * @param ctx Canvas rendering context
     * @param camera Camera position and orientation
     * @param color Color to render with
     */
    private renderCircle(ctx: CanvasRenderingContext2D, camera: any, color: string): void {
        // In a real implementation, this would render a 3D circle/sphere
        // For now, we'll just log that it would be rendered
        if (this.debug) {
            this.logger.debug(`Rendering circular target with color ${color}`);
        }
    }
    
    /**
     * Render a square target
     * @param ctx Canvas rendering context
     * @param camera Camera position and orientation
     * @param color Color to render with
     */
    private renderSquare(ctx: CanvasRenderingContext2D, camera: any, color: string): void {
        // In a real implementation, this would render a 3D square/cube
        // For now, we'll just log that it would be rendered
        if (this.debug) {
            this.logger.debug(`Rendering square target with color ${color}`);
        }
    }
    
    /**
     * Render a triangular target
     * @param ctx Canvas rendering context
     * @param camera Camera position and orientation
     * @param color Color to render with
     */
    private renderTriangle(ctx: CanvasRenderingContext2D, camera: any, color: string): void {
        // In a real implementation, this would render a 3D triangle/pyramid
        // For now, we'll just log that it would be rendered
        if (this.debug) {
            this.logger.debug(`Rendering triangular target with color ${color}`);
        }
    }
    
    /**
     * Render a diamond target
     * @param ctx Canvas rendering context
     * @param camera Camera position and orientation
     * @param color Color to render with
     */
    private renderDiamond(ctx: CanvasRenderingContext2D, camera: any, color: string): void {
        // In a real implementation, this would render a 3D diamond
        // For now, we'll just log that it would be rendered
        if (this.debug) {
            this.logger.debug(`Rendering diamond target with color ${color}`);
        }
    }
    
    /**
     * Get the current color based on damage level and hit state
     * @returns Current color
     */
    private getCurrentColor(): string {
        if (this.isHit) {
            // Flash white when hit
            return '#FFFFFF';
        }
        
        if (this.destructible && this.damageLevel > 0) {
            // Interpolate between original color and damaged color (dark red)
            const r = Math.floor(this.originalRgb.r * (1 - this.damageLevel) + this.damagedRgb.r * this.damageLevel);
            const g = Math.floor(this.originalRgb.g * (1 - this.damageLevel) + this.damagedRgb.g * this.damageLevel);
            const b = Math.floor(this.originalRgb.b * (1 - this.damageLevel) + this.damagedRgb.b * this.damageLevel);
            
            return `rgb(${r}, ${g}, ${b})`;
        }
        
        return this.color;
    }
    
    /**
     * Convert hex color to RGB
     * @param hex Hex color string
     * @returns RGB color object
     */
    private hexToRgb(hex: string): { r: number, g: number, b: number } {
        try {
            // Remove # if present
            hex = hex.replace(/^#/, '');
            
            // Handle shorthand hex (e.g., #FFF)
            if (hex.length === 3) {
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            }
            
            // Parse hex
            const bigint = parseInt(hex, 16);
            const r = (bigint >> 16) & 255;
            const g = (bigint >> 8) & 255;
            const b = bigint & 255;
            
            return { r, g, b };
        } catch (error) {
            this.logger.error(`Error parsing color ${hex}: ${error instanceof Error ? error.message : String(error)}`);
            // Return a default color (red) in case of error
            return { r: 255, g: 0, b: 0 };
        }
    }
    
    /**
     * Set the damage level
     * @param level Damage level (0-1)
     */
    public setDamageLevel(level: number): void {
        this.damageLevel = Math.max(0, Math.min(1, level));
    }
    
    /**
     * Trigger hit effect
     */
    public triggerHitEffect(): void {
        this.isHit = true;
        this.hitEffectTime = 0;
    }
    
    /**
     * Get the shape of the target
     * @returns Target shape
     */
    public getShape(): TargetShape {
        return this.shape;
    }
    
    /**
     * Get the size of the target
     * @returns Target size
     */
    public getSize(): number {
        return this.size;
    }
    
    /**
     * Get performance metrics
     * @returns Object containing performance metrics
     */
    public getPerformanceMetrics(): { averageRenderTime: number, frameCount: number } {
        return {
            averageRenderTime: this.averageRenderTime,
            frameCount: this.frameCount
        };
    }
    
    /**
     * Reset performance metrics
     */
    public resetPerformanceMetrics(): void {
        this.frameCount = 0;
        this.averageRenderTime = 0;
    }
    
    /**
     * Clean up resources
     */
    public override dispose(): void {
        if (this.debug) {
            this.logger.debug('Disposing target visual component');
            
            // Log performance metrics on disposal
            this.logger.info(`Final performance metrics: Average render time: ${this.averageRenderTime.toFixed(2)}ms over ${this.frameCount} frames`);
        }
        
        super.dispose();
    }
} 