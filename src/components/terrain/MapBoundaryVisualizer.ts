/**
 * MapBoundaryVisualizer.ts
 * Visualizes map boundaries
 */

import { Vector3 } from '../../types/common/Vector3';
import { Logger } from '../../utils/Logger';
import { FirstPersonRenderer } from '../../core/FirstPersonRenderer';
import { MapBoundaryComponent } from './MapBoundaryComponent';

/**
 * Options for map boundary visualization
 */
export interface MapBoundaryVisualizerOptions {
    /**
     * Color of the boundary walls
     */
    boundaryColor?: string;
    
    /**
     * Opacity of the boundary walls
     */
    boundaryOpacity?: number;
    
    /**
     * Whether to show grid lines on the boundary walls
     */
    showGridLines?: boolean;
    
    /**
     * Color of the grid lines
     */
    gridLineColor?: string;
    
    /**
     * Spacing between grid lines
     */
    gridLineSpacing?: number;
    
    /**
     * Whether to show warning indicators when near boundaries
     */
    showWarningIndicators?: boolean;
    
    /**
     * Distance from boundary to start showing warning indicators
     */
    warningDistance?: number;
    
    /**
     * Color of the warning indicators
     */
    warningColor?: string;
}

/**
 * Visualizes map boundaries
 */
export class MapBoundaryVisualizer {
    private logger: Logger;
    private renderer: FirstPersonRenderer;
    private boundaryComponent: MapBoundaryComponent;
    private options: MapBoundaryVisualizerOptions;
    private isEnabled: boolean = false;
    
    // Cached boundary settings
    private minX: number;
    private maxX: number;
    private minZ: number;
    private maxZ: number;
    private minY: number;
    private maxY: number;
    
    /**
     * Create a new map boundary visualizer
     * @param renderer First-person renderer
     * @param boundaryComponent Map boundary component
     * @param options Visualization options
     */
    constructor(
        renderer: FirstPersonRenderer,
        boundaryComponent: MapBoundaryComponent,
        options: MapBoundaryVisualizerOptions = {}
    ) {
        this.logger = new Logger('MapBoundaryVisualizer');
        this.renderer = renderer;
        this.boundaryComponent = boundaryComponent;
        
        // Set default options
        this.options = {
            boundaryColor: 'rgba(255, 0, 0, 0.3)',
            boundaryOpacity: 0.3,
            showGridLines: true,
            gridLineColor: 'rgba(255, 255, 255, 0.5)',
            gridLineSpacing: 20,
            showWarningIndicators: true,
            warningDistance: 10,
            warningColor: 'rgba(255, 0, 0, 0.7)',
            ...options
        };
        
        // Cache boundary settings
        const settings = boundaryComponent.getBoundarySettings();
        this.minX = settings.minX;
        this.maxX = settings.maxX;
        this.minZ = settings.minZ;
        this.maxZ = settings.maxZ;
        this.minY = settings.minY;
        this.maxY = settings.maxY;
        
        this.logger.debug('MapBoundaryVisualizer created');
    }
    
    /**
     * Enable the visualizer
     */
    public enable(): void {
        this.isEnabled = true;
        this.logger.debug('MapBoundaryVisualizer enabled');
    }
    
    /**
     * Disable the visualizer
     */
    public disable(): void {
        this.isEnabled = false;
        this.logger.debug('MapBoundaryVisualizer disabled');
    }
    
    /**
     * Toggle the visualizer
     */
    public toggle(): void {
        this.isEnabled = !this.isEnabled;
        this.logger.debug(`MapBoundaryVisualizer ${this.isEnabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Update visualization options
     * @param options New options to apply
     */
    public updateOptions(options: Partial<MapBoundaryVisualizerOptions>): void {
        this.options = {
            ...this.options,
            ...options
        };
        this.logger.debug('MapBoundaryVisualizer options updated');
    }
    
    /**
     * Update boundary settings from the boundary component
     */
    public updateBoundarySettings(): void {
        const settings = this.boundaryComponent.getBoundarySettings();
        this.minX = settings.minX;
        this.maxX = settings.maxX;
        this.minZ = settings.minZ;
        this.maxZ = settings.maxZ;
        this.minY = settings.minY;
        this.maxY = settings.maxY;
    }
    
    /**
     * Render boundary visualization
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
        
        // Update boundary settings in case they've changed
        this.updateBoundarySettings();
        
        // Save context state
        context.save();
        
        // Render boundary walls
        this.renderBoundaryWalls(context, playerPosition, viewDirection);
        
        // Render warning indicators if player is near boundary
        if (this.options.showWarningIndicators) {
            this.renderWarningIndicators(context, playerPosition, viewDirection);
        }
        
        // Restore context state
        context.restore();
    }
    
    /**
     * Render boundary walls
     * @param context Canvas rendering context
     * @param playerPosition Player position in world space
     * @param viewDirection Player view direction
     */
    private renderBoundaryWalls(
        context: CanvasRenderingContext2D,
        playerPosition: Vector3,
        viewDirection: Vector3
    ): void {
        // Define the walls (each wall is defined by two corner points)
        const walls = [
            // North wall (minZ)
            { start: new Vector3(this.minX, this.minY, this.minZ), end: new Vector3(this.maxX, this.maxY, this.minZ) },
            // East wall (maxX)
            { start: new Vector3(this.maxX, this.minY, this.minZ), end: new Vector3(this.maxX, this.maxY, this.maxZ) },
            // South wall (maxZ)
            { start: new Vector3(this.minX, this.minY, this.maxZ), end: new Vector3(this.maxX, this.maxY, this.maxZ) },
            // West wall (minX)
            { start: new Vector3(this.minX, this.minY, this.minZ), end: new Vector3(this.minX, this.maxY, this.maxZ) }
        ];
        
        // Render each wall
        for (const wall of walls) {
            this.renderWall(context, wall.start, wall.end, playerPosition, viewDirection);
        }
    }
    
    /**
     * Render a single boundary wall
     * @param context Canvas rendering context
     * @param start Start point of the wall
     * @param end End point of the wall
     * @param playerPosition Player position in world space
     * @param viewDirection Player view direction
     */
    private renderWall(
        context: CanvasRenderingContext2D,
        start: Vector3,
        end: Vector3,
        playerPosition: Vector3,
        viewDirection: Vector3
    ): void {
        // Calculate wall corners in world space
        const corners = [
            new Vector3(start.x, start.y, start.z), // Bottom-left
            new Vector3(end.x, start.y, start.z),   // Bottom-right
            new Vector3(end.x, end.y, end.z),       // Top-right
            new Vector3(start.x, end.y, end.z)      // Top-left
        ];
        
        // Convert corners to screen space
        const screenCorners = corners.map(corner => this.worldToScreen(corner, playerPosition, viewDirection, context));
        
        // If any corner is visible, render the wall
        if (screenCorners.some(corner => corner !== null)) {
            // Filter out null corners and create a path
            const visibleCorners = screenCorners.filter(corner => corner !== null) as { x: number, y: number }[];
            
            if (visibleCorners.length < 3) {
                return; // Need at least 3 corners to form a polygon
            }
            
            // Draw wall
            context.fillStyle = this.options.boundaryColor || 'rgba(255, 0, 0, 0.3)';
            context.globalAlpha = this.options.boundaryOpacity || 0.3;
            
            context.beginPath();
            context.moveTo(visibleCorners[0].x, visibleCorners[0].y);
            
            for (let i = 1; i < visibleCorners.length; i++) {
                context.lineTo(visibleCorners[i].x, visibleCorners[i].y);
            }
            
            context.closePath();
            context.fill();
            
            // Draw grid lines if enabled
            if (this.options.showGridLines) {
                this.renderGridLines(context, start, end, playerPosition, viewDirection);
            }
        }
    }
    
    /**
     * Render grid lines on a wall
     * @param context Canvas rendering context
     * @param start Start point of the wall
     * @param end End point of the wall
     * @param playerPosition Player position in world space
     * @param viewDirection Player view direction
     */
    private renderGridLines(
        context: CanvasRenderingContext2D,
        start: Vector3,
        end: Vector3,
        playerPosition: Vector3,
        viewDirection: Vector3
    ): void {
        const spacing = this.options.gridLineSpacing || 20;
        const gridColor = this.options.gridLineColor || 'rgba(255, 255, 255, 0.5)';
        
        context.strokeStyle = gridColor;
        context.lineWidth = 1;
        context.globalAlpha = 0.5;
        
        // Determine which wall we're rendering (X, Y, or Z plane)
        const isXWall = start.x === end.x;
        const isZWall = start.z === end.z;
        
        // Render horizontal grid lines
        for (let y = Math.ceil(start.y / spacing) * spacing; y <= end.y; y += spacing) {
            const lineStart = isXWall
                ? new Vector3(start.x, y, start.z)
                : new Vector3(start.x, y, start.z);
                
            const lineEnd = isXWall
                ? new Vector3(start.x, y, end.z)
                : new Vector3(end.x, y, start.z);
            
            const screenStart = this.worldToScreen(lineStart, playerPosition, viewDirection, context);
            const screenEnd = this.worldToScreen(lineEnd, playerPosition, viewDirection, context);
            
            if (screenStart && screenEnd) {
                context.beginPath();
                context.moveTo(screenStart.x, screenStart.y);
                context.lineTo(screenEnd.x, screenEnd.y);
                context.stroke();
            }
        }
        
        // Render vertical grid lines
        if (isXWall) {
            // X wall - render Z grid lines
            for (let z = Math.ceil(start.z / spacing) * spacing; z <= end.z; z += spacing) {
                const lineStart = new Vector3(start.x, start.y, z);
                const lineEnd = new Vector3(start.x, end.y, z);
                
                const screenStart = this.worldToScreen(lineStart, playerPosition, viewDirection, context);
                const screenEnd = this.worldToScreen(lineEnd, playerPosition, viewDirection, context);
                
                if (screenStart && screenEnd) {
                    context.beginPath();
                    context.moveTo(screenStart.x, screenStart.y);
                    context.lineTo(screenEnd.x, screenEnd.y);
                    context.stroke();
                }
            }
        } else if (isZWall) {
            // Z wall - render X grid lines
            for (let x = Math.ceil(start.x / spacing) * spacing; x <= end.x; x += spacing) {
                const lineStart = new Vector3(x, start.y, start.z);
                const lineEnd = new Vector3(x, end.y, start.z);
                
                const screenStart = this.worldToScreen(lineStart, playerPosition, viewDirection, context);
                const screenEnd = this.worldToScreen(lineEnd, playerPosition, viewDirection, context);
                
                if (screenStart && screenEnd) {
                    context.beginPath();
                    context.moveTo(screenStart.x, screenStart.y);
                    context.lineTo(screenEnd.x, screenEnd.y);
                    context.stroke();
                }
            }
        }
    }
    
    /**
     * Render warning indicators when player is near boundary
     * @param context Canvas rendering context
     * @param playerPosition Player position in world space
     * @param viewDirection Player view direction
     */
    private renderWarningIndicators(
        context: CanvasRenderingContext2D,
        playerPosition: Vector3,
        viewDirection: Vector3
    ): void {
        const warningDistance = this.options.warningDistance || 10;
        const warningColor = this.options.warningColor || 'rgba(255, 0, 0, 0.7)';
        
        // Check distance to each boundary
        const distanceToMinX = playerPosition.x - this.minX;
        const distanceToMaxX = this.maxX - playerPosition.x;
        const distanceToMinZ = playerPosition.z - this.minZ;
        const distanceToMaxZ = this.maxZ - playerPosition.z;
        
        // Render warning indicators for nearby boundaries
        if (distanceToMinX < warningDistance) {
            this.renderWarningIndicator(context, 'left', distanceToMinX / warningDistance, warningColor);
        }
        
        if (distanceToMaxX < warningDistance) {
            this.renderWarningIndicator(context, 'right', distanceToMaxX / warningDistance, warningColor);
        }
        
        if (distanceToMinZ < warningDistance) {
            this.renderWarningIndicator(context, 'top', distanceToMinZ / warningDistance, warningColor);
        }
        
        if (distanceToMaxZ < warningDistance) {
            this.renderWarningIndicator(context, 'bottom', distanceToMaxZ / warningDistance, warningColor);
        }
    }
    
    /**
     * Render a warning indicator at the edge of the screen
     * @param context Canvas rendering context
     * @param position Position of the indicator ('left', 'right', 'top', 'bottom')
     * @param intensity Intensity of the warning (0-1, where 0 is closest to boundary)
     * @param color Color of the warning indicator
     */
    private renderWarningIndicator(
        context: CanvasRenderingContext2D,
        position: 'left' | 'right' | 'top' | 'bottom',
        intensity: number,
        color: string
    ): void {
        const width = context.canvas.width;
        const height = context.canvas.height;
        const indicatorSize = 50;
        const alpha = 1 - Math.min(intensity, 1);
        
        // Create gradient based on position
        let gradient: CanvasGradient;
        
        switch (position) {
            case 'left':
                gradient = context.createLinearGradient(0, 0, indicatorSize, 0);
                break;
            case 'right':
                gradient = context.createLinearGradient(width, 0, width - indicatorSize, 0);
                break;
            case 'top':
                gradient = context.createLinearGradient(0, 0, 0, indicatorSize);
                break;
            case 'bottom':
                gradient = context.createLinearGradient(0, height, 0, height - indicatorSize);
                break;
        }
        
        // Set gradient colors
        gradient.addColorStop(0, color.replace(')', `, ${alpha})`));
        gradient.addColorStop(1, color.replace(')', ', 0)'));
        
        // Draw indicator
        context.fillStyle = gradient;
        
        switch (position) {
            case 'left':
                context.fillRect(0, 0, indicatorSize, height);
                break;
            case 'right':
                context.fillRect(width - indicatorSize, 0, indicatorSize, height);
                break;
            case 'top':
                context.fillRect(0, 0, width, indicatorSize);
                break;
            case 'bottom':
                context.fillRect(0, height - indicatorSize, width, indicatorSize);
                break;
        }
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