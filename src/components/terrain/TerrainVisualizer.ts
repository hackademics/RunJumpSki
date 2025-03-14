/**
 * TerrainVisualizer.ts
 * Handles visual indicators for terrain steepness
 */

import { Vector3 } from '../../types/common/Vector3';
import { SurfaceType } from '../../types/events/EventTypes';
import { TerrainSystem } from '../../core/terrain/TerrainSystem';
import { TerrainConfig } from '../../config/TerrainConfig';
import { Logger } from '../../utils/Logger';
import { FirstPersonRenderer } from '../../core/FirstPersonRenderer';

/**
 * Options for terrain visualization
 */
export interface TerrainVisualizerOptions {
    /**
     * Whether to show slope indicators
     */
    showSlopeIndicators: boolean;
    
    /**
     * Whether to use color gradients for slopes
     */
    useSlopeColorGradients: boolean;
    
    /**
     * Whether to show slope angle values
     */
    showSlopeAngles: boolean;
    
    /**
     * Whether to show surface type indicators
     */
    showSurfaceTypes: boolean;
    
    /**
     * Size of the indicators
     */
    indicatorSize: number;
    
    /**
     * Opacity of the indicators
     */
    indicatorOpacity: number;
}

/**
 * Handles visual indicators for terrain steepness
 */
export class TerrainVisualizer {
    private logger: Logger;
    private terrainSystem: TerrainSystem;
    private renderer: FirstPersonRenderer;
    private options: TerrainVisualizerOptions;
    private isEnabled: boolean = false;
    
    // Cached data for rendering
    private slopeColorCache: Map<number, string> = new Map();
    
    /**
     * Creates a new TerrainVisualizer
     * @param terrainSystem Reference to the terrain system
     * @param renderer Reference to the renderer
     * @param options Visualization options
     */
    constructor(
        terrainSystem: TerrainSystem,
        renderer: FirstPersonRenderer,
        options: Partial<TerrainVisualizerOptions> = {}
    ) {
        this.logger = new Logger('TerrainVisualizer');
        this.terrainSystem = terrainSystem;
        this.renderer = renderer;
        
        // Set default options
        this.options = {
            showSlopeIndicators: true,
            useSlopeColorGradients: true,
            showSlopeAngles: true,
            showSurfaceTypes: true,
            indicatorSize: 5,
            indicatorOpacity: 0.7,
            ...options
        };
        
        this.logger.debug('TerrainVisualizer created');
    }
    
    /**
     * Enable the visualizer
     */
    public enable(): void {
        this.isEnabled = true;
        this.logger.debug('TerrainVisualizer enabled');
    }
    
    /**
     * Disable the visualizer
     */
    public disable(): void {
        this.isEnabled = false;
        this.logger.debug('TerrainVisualizer disabled');
    }
    
    /**
     * Toggle the visualizer
     */
    public toggle(): void {
        this.isEnabled = !this.isEnabled;
        this.logger.debug(`TerrainVisualizer ${this.isEnabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Update visualization options
     * @param options New options to apply
     */
    public updateOptions(options: Partial<TerrainVisualizerOptions>): void {
        this.options = {
            ...this.options,
            ...options
        };
        this.logger.debug('TerrainVisualizer options updated');
    }
    
    /**
     * Render terrain visualization
     * @param context Canvas rendering context
     * @param playerPosition Player position in world space
     * @param viewDirection Player view direction
     */
    public render(
        context: CanvasRenderingContext2D,
        playerPosition: Vector3,
        viewDirection: Vector3
    ): void {
        if (!this.isEnabled) {
            return;
        }
        
        // Save context state
        context.save();
        
        // Render slope indicators
        if (this.options.showSlopeIndicators) {
            this.renderSlopeIndicators(context, playerPosition, viewDirection);
        }
        
        // Render surface type indicators
        if (this.options.showSurfaceTypes) {
            this.renderSurfaceTypeIndicators(context, playerPosition, viewDirection);
        }
        
        // Restore context state
        context.restore();
    }
    
    /**
     * Render slope indicators
     * @param context Canvas rendering context
     * @param playerPosition Player position in world space
     * @param viewDirection Player view direction
     */
    private renderSlopeIndicators(
        context: CanvasRenderingContext2D,
        playerPosition: Vector3,
        viewDirection: Vector3
    ): void {
        // Define the grid size and range around the player
        const gridSize = 10;
        const range = 50;
        const step = range / gridSize;
        
        // Calculate the grid points around the player
        for (let x = -range; x <= range; x += step) {
            for (let z = -range; z <= range; z += step) {
                const worldX = playerPosition.x + x;
                const worldZ = playerPosition.z + z;
                
                // Get terrain data at this point
                const point = this.terrainSystem.getTerrainPointAt(worldX, worldZ);
                if (!point) {
                    continue;
                }
                
                // Calculate screen position (simplified projection)
                // In a real implementation, this would use proper 3D to 2D projection
                const screenPos = this.worldToScreen(point.position, playerPosition, viewDirection, context);
                if (!screenPos) {
                    continue;
                }
                
                // Draw slope indicator
                this.drawSlopeIndicator(context, screenPos, point.slope, point.normal, point.surfaceType);
                
                // Draw slope angle text if enabled
                if (this.options.showSlopeAngles) {
                    this.drawSlopeAngleText(context, screenPos, point.slope);
                }
            }
        }
    }
    
    /**
     * Render surface type indicators
     * @param context Canvas rendering context
     * @param playerPosition Player position in world space
     * @param viewDirection Player view direction
     */
    private renderSurfaceTypeIndicators(
        context: CanvasRenderingContext2D,
        playerPosition: Vector3,
        viewDirection: Vector3
    ): void {
        // Similar to renderSlopeIndicators but focusing on surface types
        // Implementation would be similar but with different visual representation
    }
    
    /**
     * Draw a slope indicator at the specified screen position
     * @param context Canvas rendering context
     * @param screenPos Screen position to draw at
     * @param slopeAngle Slope angle in degrees
     * @param normal Surface normal
     * @param surfaceType Surface type
     */
    private drawSlopeIndicator(
        context: CanvasRenderingContext2D,
        screenPos: { x: number, y: number },
        slopeAngle: number,
        normal: Vector3,
        surfaceType: SurfaceType
    ): void {
        const { x, y } = screenPos;
        const size = this.options.indicatorSize;
        
        // Get color based on slope angle
        const color = this.getSlopeColor(slopeAngle);
        
        // Draw indicator
        context.globalAlpha = this.options.indicatorOpacity;
        context.fillStyle = color;
        
        // Draw a circle with size based on slope
        const radius = size * (1 + slopeAngle / 90);
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
        
        // Draw direction indicator (arrow pointing downhill)
        if (slopeAngle > 5) {
            const arrowLength = radius * 1.5;
            const arrowWidth = radius * 0.5;
            
            // Calculate arrow direction (downhill)
            const arrowDir = new Vector3(-normal.x, 0, -normal.z);
            if (arrowDir.lengthSquared() > 0.001) {
                arrowDir.normalize();
                
                // Draw arrow
                context.strokeStyle = 'rgba(0, 0, 0, 0.8)';
                context.lineWidth = 2;
                context.beginPath();
                context.moveTo(x, y);
                context.lineTo(
                    x + arrowDir.x * arrowLength,
                    y + arrowDir.z * arrowLength
                );
                context.stroke();
                
                // Draw arrowhead
                context.beginPath();
                context.moveTo(
                    x + arrowDir.x * arrowLength,
                    y + arrowDir.z * arrowLength
                );
                context.lineTo(
                    x + arrowDir.x * arrowLength - arrowDir.x * arrowWidth - arrowDir.z * arrowWidth,
                    y + arrowDir.z * arrowLength - arrowDir.z * arrowWidth + arrowDir.x * arrowWidth
                );
                context.lineTo(
                    x + arrowDir.x * arrowLength - arrowDir.x * arrowWidth + arrowDir.z * arrowWidth,
                    y + arrowDir.z * arrowLength - arrowDir.z * arrowWidth - arrowDir.x * arrowWidth
                );
                context.closePath();
                context.fill();
            }
        }
    }
    
    /**
     * Draw slope angle text at the specified screen position
     * @param context Canvas rendering context
     * @param screenPos Screen position to draw at
     * @param slopeAngle Slope angle in degrees
     */
    private drawSlopeAngleText(
        context: CanvasRenderingContext2D,
        screenPos: { x: number, y: number },
        slopeAngle: number
    ): void {
        const { x, y } = screenPos;
        const size = this.options.indicatorSize;
        
        // Only show text for significant slopes
        if (slopeAngle < 5) {
            return;
        }
        
        // Format slope angle text
        const angleText = `${Math.round(slopeAngle)}°`;
        
        // Draw text
        context.globalAlpha = this.options.indicatorOpacity;
        context.fillStyle = 'white';
        context.strokeStyle = 'black';
        context.lineWidth = 2;
        context.font = `${size * 1.5}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Draw text with outline for better visibility
        context.strokeText(angleText, x, y - size * 2);
        context.fillText(angleText, x, y - size * 2);
    }
    
    /**
     * Get color based on slope angle
     * @param slopeAngle Slope angle in degrees
     * @returns Color string in rgba format
     */
    private getSlopeColor(slopeAngle: number): string {
        // Check if color is already cached
        if (this.slopeColorCache.has(slopeAngle)) {
            return this.slopeColorCache.get(slopeAngle)!;
        }
        
        let color: string;
        
        if (this.options.useSlopeColorGradients) {
            // Use gradient colors based on slope angle
            if (slopeAngle < 15) {
                // Green for gentle slopes (0-15 degrees)
                color = `rgba(0, 255, 0, ${this.options.indicatorOpacity})`;
            } else if (slopeAngle < 30) {
                // Yellow for moderate slopes (15-30 degrees)
                color = `rgba(255, 255, 0, ${this.options.indicatorOpacity})`;
            } else if (slopeAngle < 45) {
                // Orange for steep slopes (30-45 degrees)
                color = `rgba(255, 165, 0, ${this.options.indicatorOpacity})`;
            } else {
                // Red for very steep slopes (45+ degrees)
                color = `rgba(255, 0, 0, ${this.options.indicatorOpacity})`;
            }
        } else {
            // Use a single color with varying intensity
            const intensity = Math.min(slopeAngle / 45, 1);
            color = `rgba(255, ${Math.round(255 * (1 - intensity))}, 0, ${this.options.indicatorOpacity})`;
        }
        
        // Cache the color
        this.slopeColorCache.set(slopeAngle, color);
        
        return color;
    }
    
    /**
     * Convert world position to screen position
     * @param worldPos World position
     * @param playerPos Player position
     * @param viewDir Player view direction
     * @param context Canvas rendering context
     * @returns Screen position or null if outside view
     */
    private worldToScreen(
        worldPos: Vector3,
        playerPos: Vector3,
        viewDir: Vector3,
        context: CanvasRenderingContext2D
    ): { x: number, y: number } | null {
        // Calculate relative position to player
        const relPos = worldPos.clone().subtract(playerPos);
        
        // Simple projection for demonstration
        // In a real implementation, this would use proper 3D to 2D projection with camera matrices
        
        // Check if point is in front of player (dot product with view direction > 0)
        const dotProduct = relPos.dot(viewDir);
        if (dotProduct <= 0) {
            return null; // Behind player
        }
        
        // Calculate screen position (simplified)
        const screenWidth = context.canvas.width;
        const screenHeight = context.canvas.height;
        
        // Calculate angle between view direction and point direction
        const viewDirNorm = viewDir.clone().normalize();
        const relPosNorm = relPos.clone().normalize();
        
        const angle = Math.acos(viewDirNorm.dot(relPosNorm));
        
        // If angle is too large, point is outside view
        if (angle > Math.PI / 3) { // 60 degrees field of view
            return null;
        }
        
        // Calculate screen position based on angle and distance
        const distance = relPos.length();
        const screenX = screenWidth / 2 + (relPos.x / distance) * (screenWidth / 2);
        const screenY = screenHeight / 2 - (relPos.y / distance) * (screenHeight / 2) + (relPos.z / distance) * (screenHeight / 4);
        
        return { x: screenX, y: screenY };
    }
} 