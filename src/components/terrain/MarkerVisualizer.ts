/**
 * MarkerVisualizer.ts
 * Visualizes start and finish line markers
 */

import { Vector3 } from '../../types/common/Vector3';
import { Logger } from '../../utils/Logger';
import { FirstPersonRenderer } from '../../core/FirstPersonRenderer';
import { MarkerComponent, MarkerType } from './MarkerComponent';

/**
 * Options for marker visualization
 */
export interface MarkerVisualizerOptions {
    /**
     * Height of the marker posts
     */
    postHeight?: number;
    
    /**
     * Width of the marker posts
     */
    postWidth?: number;
    
    /**
     * Whether to show particle effects
     */
    showParticles?: boolean;
    
    /**
     * Whether to show banner between posts
     */
    showBanner?: boolean;
    
    /**
     * Custom text to display on the marker
     */
    customText?: string;
    
    /**
     * Whether to show distance markers
     */
    showDistanceMarkers?: boolean;
}

/**
 * Visualizes start and finish line markers
 */
export class MarkerVisualizer {
    private logger: Logger;
    private renderer: FirstPersonRenderer;
    private markerComponent: MarkerComponent;
    private options: MarkerVisualizerOptions;
    private isEnabled: boolean = false;
    
    // Cached marker properties
    private markerType: MarkerType;
    private markerWidth: number;
    private markerRotation: number;
    private markerColor: string;
    
    // Animation properties
    private animationTime: number = 0;
    
    /**
     * Create a new marker visualizer
     * @param renderer First-person renderer
     * @param markerComponent Marker component
     * @param options Visualization options
     */
    constructor(
        renderer: FirstPersonRenderer,
        markerComponent: MarkerComponent,
        options: MarkerVisualizerOptions = {}
    ) {
        this.logger = new Logger('MarkerVisualizer');
        this.renderer = renderer;
        this.markerComponent = markerComponent;
        
        // Set default options
        this.options = {
            postHeight: 10,
            postWidth: 1,
            showParticles: true,
            showBanner: true,
            showDistanceMarkers: true,
            ...options
        };
        
        // Cache marker properties
        this.markerType = markerComponent.getMarkerType();
        this.markerWidth = markerComponent.getWidth();
        this.markerRotation = markerComponent.getRotation();
        
        // Set marker color based on type
        switch (this.markerType) {
            case MarkerType.START:
                this.markerColor = 'rgba(0, 255, 0, 0.7)'; // Green
                break;
            case MarkerType.FINISH:
                this.markerColor = 'rgba(255, 0, 0, 0.7)'; // Red
                break;
            case MarkerType.CHECKPOINT:
                this.markerColor = 'rgba(0, 0, 255, 0.7)'; // Blue
                break;
            default:
                this.markerColor = 'rgba(255, 255, 255, 0.7)'; // White
        }
        
        this.logger.debug(`MarkerVisualizer created for ${this.markerType} marker`);
    }
    
    /**
     * Enable the visualizer
     */
    public enable(): void {
        this.isEnabled = true;
        this.logger.debug(`MarkerVisualizer enabled for ${this.markerType} marker`);
    }
    
    /**
     * Disable the visualizer
     */
    public disable(): void {
        this.isEnabled = false;
        this.logger.debug(`MarkerVisualizer disabled for ${this.markerType} marker`);
    }
    
    /**
     * Toggle the visualizer
     */
    public toggle(): void {
        this.isEnabled = !this.isEnabled;
        this.logger.debug(`MarkerVisualizer ${this.isEnabled ? 'enabled' : 'disabled'} for ${this.markerType} marker`);
    }
    
    /**
     * Update visualization options
     * @param options New options to apply
     */
    public updateOptions(options: Partial<MarkerVisualizerOptions>): void {
        this.options = {
            ...this.options,
            ...options
        };
        this.logger.debug('MarkerVisualizer options updated');
    }
    
    /**
     * Update marker properties from the marker component
     */
    public updateMarkerProperties(): void {
        this.markerType = this.markerComponent.getMarkerType();
        this.markerWidth = this.markerComponent.getWidth();
        this.markerRotation = this.markerComponent.getRotation();
    }
    
    /**
     * Render marker visualization
     * @param context Canvas rendering context
     * @param playerPosition Player position in world space
     * @param viewDirection Player view direction
     * @param deltaTime Time since last update in seconds
     */
    public render(
        context: CanvasRenderingContext2D,
        playerPosition: Vector3,
        viewDirection: Vector3,
        deltaTime: number
    ): void {
        if (!this.isEnabled || !this.markerComponent.isMarkerActive()) {
            return;
        }
        
        // Update animation time
        this.animationTime += deltaTime;
        
        // Update marker properties in case they've changed
        this.updateMarkerProperties();
        
        // Save context state
        context.save();
        
        // Get marker entity position
        const entity = this.markerComponent.entity;
        if (!entity) {
            context.restore();
            return;
        }
        
        const markerPosition = entity.transform.position;
        
        // Render marker posts
        this.renderMarkerPosts(context, markerPosition, playerPosition, viewDirection);
        
        // Render banner if enabled
        if (this.options.showBanner) {
            this.renderMarkerBanner(context, markerPosition, playerPosition, viewDirection);
        }
        
        // Render particles if enabled
        if (this.options.showParticles) {
            this.renderParticles(context, markerPosition, playerPosition, viewDirection);
        }
        
        // Render distance markers if enabled
        if (this.options.showDistanceMarkers) {
            this.renderDistanceMarkers(context, markerPosition, playerPosition, viewDirection);
        }
        
        // Restore context state
        context.restore();
    }
    
    /**
     * Render marker posts
     * @param context Canvas rendering context
     * @param markerPosition Marker position in world space
     * @param playerPosition Player position in world space
     * @param viewDirection Player view direction
     */
    private renderMarkerPosts(
        context: CanvasRenderingContext2D,
        markerPosition: Vector3,
        playerPosition: Vector3,
        viewDirection: Vector3
    ): void {
        const postHeight = this.options.postHeight || 10;
        const postWidth = this.options.postWidth || 1;
        const halfWidth = this.markerWidth / 2;
        
        // Calculate post positions
        const markerDir = new Vector3(
            Math.sin(this.markerRotation * Math.PI / 180),
            0,
            Math.cos(this.markerRotation * Math.PI / 180)
        );
        
        const perpDir = new Vector3(-markerDir.z, 0, markerDir.x);
        
        // Left post position
        const leftPostBottom = markerPosition.clone().add(
            perpDir.clone().multiplyScalar(halfWidth)
        );
        const leftPostTop = leftPostBottom.clone().add(
            new Vector3(0, postHeight, 0)
        );
        
        // Right post position
        const rightPostBottom = markerPosition.clone().add(
            perpDir.clone().multiplyScalar(-halfWidth)
        );
        const rightPostTop = rightPostBottom.clone().add(
            new Vector3(0, postHeight, 0)
        );
        
        // Convert to screen space
        const screenLeftBottom = this.worldToScreen(leftPostBottom, playerPosition, viewDirection, context);
        const screenLeftTop = this.worldToScreen(leftPostTop, playerPosition, viewDirection, context);
        const screenRightBottom = this.worldToScreen(rightPostBottom, playerPosition, viewDirection, context);
        const screenRightTop = this.worldToScreen(rightPostTop, playerPosition, viewDirection, context);
        
        // Render posts if visible
        if (screenLeftBottom && screenLeftTop) {
            // Left post
            context.strokeStyle = this.markerColor;
            context.lineWidth = postWidth * 5; // Make posts thicker for visibility
            context.beginPath();
            context.moveTo(screenLeftBottom.x, screenLeftBottom.y);
            context.lineTo(screenLeftTop.x, screenLeftTop.y);
            context.stroke();
        }
        
        if (screenRightBottom && screenRightTop) {
            // Right post
            context.strokeStyle = this.markerColor;
            context.lineWidth = postWidth * 5;
            context.beginPath();
            context.moveTo(screenRightBottom.x, screenRightBottom.y);
            context.lineTo(screenRightTop.x, screenRightTop.y);
            context.stroke();
        }
    }
    
    /**
     * Render marker banner
     * @param context Canvas rendering context
     * @param markerPosition Marker position in world space
     * @param playerPosition Player position in world space
     * @param viewDirection Player view direction
     */
    private renderMarkerBanner(
        context: CanvasRenderingContext2D,
        markerPosition: Vector3,
        playerPosition: Vector3,
        viewDirection: Vector3
    ): void {
        const postHeight = this.options.postHeight || 10;
        const halfWidth = this.markerWidth / 2;
        
        // Calculate banner positions
        const markerDir = new Vector3(
            Math.sin(this.markerRotation * Math.PI / 180),
            0,
            Math.cos(this.markerRotation * Math.PI / 180)
        );
        
        const perpDir = new Vector3(-markerDir.z, 0, markerDir.x);
        
        // Banner corners
        const topLeft = markerPosition.clone()
            .add(perpDir.clone().multiplyScalar(halfWidth))
            .add(new Vector3(0, postHeight, 0));
            
        const topRight = markerPosition.clone()
            .add(perpDir.clone().multiplyScalar(-halfWidth))
            .add(new Vector3(0, postHeight, 0));
            
        const bottomLeft = markerPosition.clone()
            .add(perpDir.clone().multiplyScalar(halfWidth))
            .add(new Vector3(0, postHeight - 2, 0));
            
        const bottomRight = markerPosition.clone()
            .add(perpDir.clone().multiplyScalar(-halfWidth))
            .add(new Vector3(0, postHeight - 2, 0));
        
        // Convert to screen space
        const screenTopLeft = this.worldToScreen(topLeft, playerPosition, viewDirection, context);
        const screenTopRight = this.worldToScreen(topRight, playerPosition, viewDirection, context);
        const screenBottomLeft = this.worldToScreen(bottomLeft, playerPosition, viewDirection, context);
        const screenBottomRight = this.worldToScreen(bottomRight, playerPosition, viewDirection, context);
        
        // Render banner if all corners are visible
        if (screenTopLeft && screenTopRight && screenBottomLeft && screenBottomRight) {
            // Draw banner background
            context.fillStyle = this.markerColor;
            context.beginPath();
            context.moveTo(screenTopLeft.x, screenTopLeft.y);
            context.lineTo(screenTopRight.x, screenTopRight.y);
            context.lineTo(screenBottomRight.x, screenBottomRight.y);
            context.lineTo(screenBottomLeft.x, screenBottomLeft.y);
            context.closePath();
            context.fill();
            
            // Draw banner text
            context.fillStyle = 'white';
            context.font = 'bold 24px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            
            // Calculate text position (center of banner)
            const textX = (screenTopLeft.x + screenTopRight.x) / 2;
            const textY = (screenTopLeft.y + screenBottomLeft.y) / 2;
            
            // Determine text based on marker type
            let text = this.options.customText;
            if (!text) {
                switch (this.markerType) {
                    case MarkerType.START:
                        text = 'START';
                        break;
                    case MarkerType.FINISH:
                        text = 'FINISH';
                        break;
                    case MarkerType.CHECKPOINT:
                        text = `CHECKPOINT ${this.markerComponent['checkpointNumber'] || ''}`;
                        break;
                    default:
                        text = 'MARKER';
                }
            }
            
            // Draw text with outline for better visibility
            context.strokeStyle = 'black';
            context.lineWidth = 2;
            context.strokeText(text, textX, textY);
            context.fillText(text, textX, textY);
        }
    }
    
    /**
     * Render particles around the marker
     * @param context Canvas rendering context
     * @param markerPosition Marker position in world space
     * @param playerPosition Player position in world space
     * @param viewDirection Player view direction
     */
    private renderParticles(
        context: CanvasRenderingContext2D,
        markerPosition: Vector3,
        playerPosition: Vector3,
        viewDirection: Vector3
    ): void {
        // This is a simplified particle effect
        // In a real implementation, we would use a proper particle system
        
        const numParticles = 10;
        const particleSize = 5;
        const particleSpeed = 2;
        
        // Calculate particle positions based on animation time
        for (let i = 0; i < numParticles; i++) {
            const angle = (i / numParticles) * Math.PI * 2 + this.animationTime * particleSpeed;
            const height = Math.sin(this.animationTime * 2 + i) * 2 + 5; // Oscillate between 3 and 7
            
            // Calculate particle position
            const particlePos = markerPosition.clone().add(
                new Vector3(
                    Math.cos(angle) * this.markerWidth * 0.6,
                    height,
                    Math.sin(angle) * this.markerWidth * 0.6
                )
            );
            
            // Convert to screen space
            const screenPos = this.worldToScreen(particlePos, playerPosition, viewDirection, context);
            
            // Render particle if visible
            if (screenPos) {
                context.fillStyle = this.markerColor;
                context.globalAlpha = 0.7 + Math.sin(this.animationTime * 3 + i) * 0.3; // Pulsate opacity
                context.beginPath();
                context.arc(screenPos.x, screenPos.y, particleSize, 0, Math.PI * 2);
                context.fill();
            }
        }
        
        // Reset global alpha
        context.globalAlpha = 1.0;
    }
    
    /**
     * Render distance markers
     * @param context Canvas rendering context
     * @param markerPosition Marker position in world space
     * @param playerPosition Player position in world space
     * @param viewDirection Player view direction
     */
    private renderDistanceMarkers(
        context: CanvasRenderingContext2D,
        markerPosition: Vector3,
        playerPosition: Vector3,
        viewDirection: Vector3
    ): void {
        // Calculate distance to marker
        const distanceToMarker = markerPosition.clone().subtract(playerPosition).length();
        
        // Only show distance markers if player is within a certain range
        if (distanceToMarker > 200) {
            return;
        }
        
        // Draw distance text
        context.fillStyle = 'white';
        context.font = 'bold 16px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'bottom';
        
        // Calculate text position (above marker)
        const textPos = markerPosition.clone().add(new Vector3(0, 15, 0));
        const screenPos = this.worldToScreen(textPos, playerPosition, viewDirection, context);
        
        if (screenPos) {
            // Draw text with outline for better visibility
            const text = `${Math.round(distanceToMarker)}m`;
            context.strokeStyle = 'black';
            context.lineWidth = 2;
            context.strokeText(text, screenPos.x, screenPos.y);
            context.fillText(text, screenPos.x, screenPos.y);
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