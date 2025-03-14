/**
 * MarkerVisualizer.ts
 * Visualizes race markers in the game world
 */

import { Logger } from '../../utils/Logger';
import { MarkerComponent, MarkerType } from './MarkerComponent';
import { Vector3 } from '../../types/common/Vector3';

/**
 * Marker visualizer options
 */
export interface MarkerVisualizerOptions {
    /**
     * Whether to show marker labels
     */
    showLabels?: boolean;
    
    /**
     * Whether to show marker boundaries
     */
    showBoundaries?: boolean;
    
    /**
     * Whether to show marker arrows
     */
    showArrows?: boolean;
    
    /**
     * Opacity of markers (0-1)
     */
    opacity?: number;
    
    /**
     * Scale factor for markers
     */
    scale?: number;
    
    /**
     * Whether to pulse markers
     */
    pulsate?: boolean;
    
    /**
     * Whether to show distance to markers
     */
    showDistance?: boolean;
}

/**
 * Default marker visualizer options
 */
const DEFAULT_OPTIONS: MarkerVisualizerOptions = {
    showLabels: true,
    showBoundaries: true,
    showArrows: true,
    opacity: 0.7,
    scale: 1.0,
    pulsate: true,
    showDistance: true
};

/**
 * Visualizes race markers in the game world
 */
export class MarkerVisualizer {
    private logger: Logger;
    private markerComponents: MarkerComponent[] = [];
    private options: MarkerVisualizerOptions;
    private enabled: boolean = true;
    private canvas?: HTMLCanvasElement;
    private ctx?: CanvasRenderingContext2D;
    private playerPosition?: Vector3;
    private cameraDirection?: Vector3;
    private pulsatePhase: number = 0;
    
    /**
     * Create a new marker visualizer
     * @param options Visualizer options
     */
    constructor(options: MarkerVisualizerOptions = {}) {
        this.logger = new Logger('MarkerVisualizer');
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }
    
    /**
     * Initialize the visualizer
     * @param canvas Canvas to render to
     */
    public init(canvas: HTMLCanvasElement): void {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.logger.debug('Marker visualizer initialized');
    }
    
    /**
     * Add a marker component to visualize
     * @param marker Marker component
     */
    public addMarker(marker: MarkerComponent): void {
        this.markerComponents.push(marker);
    }
    
    /**
     * Add multiple marker components
     * @param markers Marker components
     */
    public addMarkers(markers: MarkerComponent[]): void {
        this.markerComponents.push(...markers);
    }
    
    /**
     * Clear all markers
     */
    public clearMarkers(): void {
        this.markerComponents = [];
    }
    
    /**
     * Update the visualizer
     * @param deltaTime Time since last update
     * @param playerPosition Current player position
     * @param cameraDirection Current camera direction
     */
    public update(deltaTime: number, playerPosition: Vector3, cameraDirection: Vector3): void {
        if (!this.enabled) return;
        
        this.playerPosition = playerPosition;
        this.cameraDirection = cameraDirection;
        
        // Update pulsate phase
        this.pulsatePhase = (this.pulsatePhase + deltaTime * 2) % (Math.PI * 2);
    }
    
    /**
     * Render the markers
     */
    public render(): void {
        if (!this.enabled || !this.ctx || !this.canvas || !this.playerPosition || !this.cameraDirection) return;
        
        // For each marker, render it based on its type and position
        for (const marker of this.markerComponents) {
            if (!marker.entity || !marker.isActive()) continue;
            
            const markerPosition = marker.entity.transform.position;
            const markerType = marker.getMarkerType();
            const markerColor = marker.getColor();
            
            // Calculate screen position (simplified - in a real implementation, this would use proper 3D to 2D projection)
            // This is just a placeholder for the actual implementation
            const screenPos = this.worldToScreen(markerPosition);
            if (!screenPos) continue; // Marker is behind the camera
            
            // Calculate distance to marker
            const distance = this.playerPosition.distanceTo(markerPosition);
            
            // Calculate marker size based on distance and options
            const baseSize = 50 * this.options.scale!;
            const size = baseSize / (1 + distance * 0.1);
            
            // Calculate opacity based on distance and options
            let opacity = this.options.opacity!;
            if (this.options.pulsate) {
                opacity *= 0.7 + 0.3 * Math.sin(this.pulsatePhase);
            }
            
            // Draw marker
            this.ctx.save();
            
            // Draw marker boundary
            if (this.options.showBoundaries) {
                this.ctx.strokeStyle = markerColor;
                this.ctx.lineWidth = 2;
                this.ctx.globalAlpha = opacity * 0.7;
                this.ctx.beginPath();
                this.ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2);
                this.ctx.stroke();
            }
            
            // Draw marker icon based on type
            this.ctx.fillStyle = markerColor;
            this.ctx.globalAlpha = opacity;
            
            switch (markerType) {
                case MarkerType.START:
                    this.drawStartMarker(screenPos.x, screenPos.y, size);
                    break;
                case MarkerType.FINISH:
                    this.drawFinishMarker(screenPos.x, screenPos.y, size);
                    break;
                case MarkerType.CHECKPOINT:
                    this.drawCheckpointMarker(screenPos.x, screenPos.y, size, marker.getCheckpointNumber());
                    break;
            }
            
            // Draw label
            if (this.options.showLabels) {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = `${Math.max(10, size / 2)}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'top';
                
                let label = '';
                switch (markerType) {
                    case MarkerType.START:
                        label = 'START';
                        break;
                    case MarkerType.FINISH:
                        label = 'FINISH';
                        break;
                    case MarkerType.CHECKPOINT:
                        label = `CP ${marker.getCheckpointNumber()}`;
                        break;
                }
                
                this.ctx.fillText(label, screenPos.x, screenPos.y + size + 5);
                
                // Draw distance if enabled
                if (this.options.showDistance) {
                    this.ctx.font = `${Math.max(8, size / 3)}px Arial`;
                    this.ctx.fillText(`${distance.toFixed(0)}m`, screenPos.x, screenPos.y + size + 5 + Math.max(12, size / 2));
                }
            }
            
            this.ctx.restore();
        }
    }
    
    /**
     * Draw a start marker
     * @param x X position
     * @param y Y position
     * @param size Size of the marker
     */
    private drawStartMarker(x: number, y: number, size: number): void {
        if (!this.ctx) return;
        
        // Draw a triangle pointing down
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - size / 2);
        this.ctx.lineTo(x + size / 2, y + size / 2);
        this.ctx.lineTo(x - size / 2, y + size / 2);
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    /**
     * Draw a finish marker
     * @param x X position
     * @param y Y position
     * @param size Size of the marker
     */
    private drawFinishMarker(x: number, y: number, size: number): void {
        if (!this.ctx) return;
        
        // Draw a checkered flag
        const gridSize = size / 4;
        
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if ((i + j) % 2 === 0) {
                    this.ctx.fillRect(
                        x - size / 2 + i * gridSize,
                        y - size / 2 + j * gridSize,
                        gridSize,
                        gridSize
                    );
                }
            }
        }
    }
    
    /**
     * Draw a checkpoint marker
     * @param x X position
     * @param y Y position
     * @param size Size of the marker
     * @param number Checkpoint number
     */
    private drawCheckpointMarker(x: number, y: number, size: number, number: number): void {
        if (!this.ctx) return;
        
        // Draw a circle
        this.ctx.beginPath();
        this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw the checkpoint number
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `bold ${size / 1.5}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(number.toString(), x, y);
    }
    
    /**
     * Convert a world position to screen coordinates
     * @param worldPos World position
     * @returns Screen position or undefined if behind camera
     */
    private worldToScreen(worldPos: Vector3): { x: number, y: number } | undefined {
        if (!this.canvas || !this.playerPosition || !this.cameraDirection) return undefined;
        
        // This is a simplified implementation - in a real game, you would use proper 3D to 2D projection
        // with a view matrix and projection matrix
        
        // Calculate vector from player to marker
        const toMarker = new Vector3(
            worldPos.x - this.playerPosition.x,
            worldPos.y - this.playerPosition.y,
            worldPos.z - this.playerPosition.z
        );
        
        // Check if marker is behind the camera
        const normalizedMarker = toMarker.clone().normalize();
        const dotProduct = normalizedMarker.dot(this.cameraDirection);
        if (dotProduct < 0) return undefined; // Behind camera
        
        // Calculate screen position (very simplified)
        const distance = toMarker.length();
        const angle = Math.atan2(toMarker.x, toMarker.z) - Math.atan2(this.cameraDirection.x, this.cameraDirection.z);
        
        const { width, height } = this.canvas;
        const x = width / 2 + Math.sin(angle) * width / 3;
        const y = height / 2 - (worldPos.y - this.playerPosition.y) * 100 / distance;
        
        return { x, y };
    }
    
    /**
     * Enable or disable the visualizer
     * @param enabled Whether the visualizer is enabled
     */
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }
    
    /**
     * Toggle the visualizer
     * @returns New enabled state
     */
    public toggle(): boolean {
        this.enabled = !this.enabled;
        return this.enabled;
    }
    
    /**
     * Update visualizer options
     * @param options New options
     */
    public updateOptions(options: Partial<MarkerVisualizerOptions>): void {
        this.options = { ...this.options, ...options };
    }
    
    /**
     * Get current options
     * @returns Current options
     */
    public getOptions(): MarkerVisualizerOptions {
        return { ...this.options };
    }
    
    /**
     * Clean up resources
     */
    public dispose(): void {
        this.markerComponents = [];
        this.canvas = undefined;
        this.ctx = undefined;
    }
} 