/**
 * FirstPersonRenderer.ts
 * Handles rendering for first-person view
 */

import { Vector3 } from '../types/common/Vector3';
import { Player } from '../entities/Player';
import { Logger } from '../utils/Logger';
import { GameConstants } from '../config/Constants';
import { MathUtils } from '../utils/MathUtils';
import { PhysicsConfig } from '../config/PhysicsConfig';
import { TerrainVisualizer } from '../components/terrain/TerrainVisualizer';
import { TerrainSystem } from './terrain/TerrainSystem';
import { MapBoundaryVisualizer } from '../components/terrain/MapBoundaryVisualizer';
import { MapBoundaryComponent } from '../components/terrain/MapBoundaryComponent';
import { MarkerVisualizer } from '../components/markers/MarkerVisualizer';
import { MarkerComponent } from '../components/markers/MarkerComponent';
import { PropVisualizer, PropVisualizerOptions } from '../components/props/PropVisualizer';
import { PropComponent } from '../components/props/PropComponent';

/**
 * First-person renderer options
 */
export interface FirstPersonRendererOptions {
    /**
     * Canvas element to render to
     */
    canvas: HTMLCanvasElement;
    
    /**
     * Canvas width
     */
    width?: number;
    
    /**
     * Canvas height
     */
    height?: number;
    
    /**
     * Whether to use anti-aliasing
     */
    antiAliasing?: boolean;
    
    /**
     * Whether to enable VSync
     */
    vsync?: boolean;
    
    /**
     * Whether to show terrain visualization
     */
    showTerrainVisualization?: boolean;
    
    /**
     * Whether to show map boundaries
     */
    showMapBoundaries?: boolean;
    
    /**
     * Whether to show markers
     */
    showMarkers?: boolean;
    
    /**
     * Whether to show environmental props
     */
    showProps?: boolean;
}

/**
 * First-person renderer
 */
export class FirstPersonRenderer {
    private logger: Logger;
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;
    private width: number;
    private height: number;
    private player?: Player;
    private terrainVisualizer?: TerrainVisualizer;
    private mapBoundaryVisualizer?: MapBoundaryVisualizer;
    private markerVisualizers: MarkerVisualizer[] = [];
    private propVisualizer?: PropVisualizer;
    private showDebugInfo: boolean = false;
    private showTerrainVisualization: boolean = false;
    private showMapBoundaries: boolean = false;
    private showMarkers: boolean = false;
    private showProps: boolean = false;
    private lastFrameTime: number = 0;
    private frameTime: number = 0;
    private fps: number = 0;
    private fpsUpdateTime: number = 0;
    private frameCount: number = 0;
    private aspectRatio: number = 1;
    private fov: number = MathUtils.toRadians(GameConstants.DEFAULT_FOV);
    
    /**
     * Create a new first-person renderer
     * @param options Renderer options
     */
    constructor(options: FirstPersonRendererOptions) {
        this.logger = new Logger('FirstPersonRenderer');
        
        // Set up canvas
        this.canvas = options.canvas;
        this.width = options.width || this.canvas.width;
        this.height = options.height || this.canvas.height;
        this.aspectRatio = this.width / this.height;
        
        // Resize canvas if needed
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        // Get rendering context
        const ctx = this.canvas.getContext('2d');
        
        if (!ctx) {
            throw new Error('Could not get 2D rendering context');
        }
        
        this.context = ctx;
        
        // Set visualization flags
        this.showTerrainVisualization = options.showTerrainVisualization || false;
        this.showMapBoundaries = options.showMapBoundaries || false;
        this.showMarkers = options.showMarkers || false;
        this.showProps = options.showProps || false;
        
        this.logger.debug('First-person renderer created');
    }
    
    /**
     * Initialize the renderer with a player and optional components
     * @param player Player to render
     * @param terrainSystem Optional terrain system for visualization
     * @param mapBoundaryComponent Optional map boundary component for visualization
     * @param markerComponents Optional marker components for visualization
     * @param propComponents Optional prop components for visualization
     */
    public init(
        player: Player, 
        terrainSystem?: TerrainSystem, 
        mapBoundaryComponent?: MapBoundaryComponent,
        markerComponents?: MarkerComponent[],
        propComponents?: PropComponent[]
    ): void {
        this.player = player;
        
        // Initialize terrain visualizer if terrain system is provided
        if (terrainSystem) {
            this.terrainVisualizer = new TerrainVisualizer(terrainSystem, this);
            if (this.showTerrainVisualization) {
                this.terrainVisualizer.enable();
            } else {
                this.terrainVisualizer.disable();
            }
        }
        
        // Initialize map boundary visualizer if map boundary component is provided
        if (mapBoundaryComponent) {
            this.mapBoundaryVisualizer = new MapBoundaryVisualizer(this, mapBoundaryComponent);
            if (this.showMapBoundaries) {
                this.mapBoundaryVisualizer.enable();
            } else {
                this.mapBoundaryVisualizer.disable();
            }
        }
        
        // Initialize marker visualizers if marker components are provided
        if (markerComponents && markerComponents.length > 0) {
            const markerVisualizer = new MarkerVisualizer();
            markerVisualizer.init(this.canvas);
            markerVisualizer.setEnabled(this.showMarkers);
            markerVisualizer.addMarkers(markerComponents);
            this.markerVisualizers.push(markerVisualizer);
        }
        
        // Initialize prop visualizer if prop components are provided
        if (propComponents && propComponents.length > 0) {
            this.propVisualizer = new PropVisualizer();
            this.propVisualizer.init(this.canvas);
            this.propVisualizer.setEnabled(this.showProps);
            this.propVisualizer.addProps(propComponents);
        }
        
        this.logger.debug('First-person renderer initialized');
    }
    
    /**
     * Add a marker component to be visualized
     * @param markerComponent Marker component to visualize
     */
    public addMarkerVisualizer(markerComponent: MarkerComponent): void {
        // If we don't have any visualizers yet, create one
        if (this.markerVisualizers.length === 0) {
            const markerVisualizer = new MarkerVisualizer();
            markerVisualizer.init(this.canvas);
            markerVisualizer.setEnabled(this.showMarkers);
            this.markerVisualizers.push(markerVisualizer);
        }
        
        // Add the marker to the first visualizer
        this.markerVisualizers[0].addMarker(markerComponent);
        
        this.logger.debug('Added marker visualizer');
    }
    
    /**
     * Add a prop component to be visualized
     * @param propComponent Prop component to visualize
     */
    public addPropVisualizer(propComponent: PropComponent): void {
        // If we don't have a visualizer yet, create one
        if (!this.propVisualizer) {
            this.propVisualizer = new PropVisualizer();
            this.propVisualizer.init(this.canvas);
            this.propVisualizer.setEnabled(this.showProps);
        }
        
        // Add the prop to the visualizer
        this.propVisualizer.addProp(propComponent);
        
        this.logger.debug('Added prop visualizer');
    }
    
    /**
     * Add multiple prop components to be visualized
     * @param propComponents Prop components to visualize
     */
    public addPropVisualizers(propComponents: PropComponent[]): void {
        // If we don't have a visualizer yet, create one
        if (!this.propVisualizer) {
            this.propVisualizer = new PropVisualizer();
            this.propVisualizer.init(this.canvas);
            this.propVisualizer.setEnabled(this.showProps);
        }
        
        // Add the props to the visualizer
        this.propVisualizer.addProps(propComponents);
        
        this.logger.debug(`Added ${propComponents.length} prop visualizers`);
    }
    
    /**
     * Update the renderer
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        // Update visualizers
        if (this.player) {
            const playerPosition = this.player.transform.position;
            const cameraDirection = this.player.transform.getForwardVector();
            
            // Update marker visualizers
            for (const visualizer of this.markerVisualizers) {
                visualizer.update(deltaTime, playerPosition, cameraDirection);
            }
            
            // Update prop visualizer only once per frame
            if (this.propVisualizer && this.showProps) {
                this.propVisualizer.update(deltaTime, playerPosition, cameraDirection);
            }
        }
    }
    
    /**
     * Render the scene
     */
    public render(): void {
        if (!this.player) {
            this.logger.warn('Cannot render: player not initialized');
            return;
        }
        
        // Clear the canvas
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Get player position and view direction
        const position = this.player.transform.position;
        const viewDirection = this.player.transform.getForwardVector();
        
        // Render terrain visualization if enabled
        if (this.terrainVisualizer && this.showTerrainVisualization) {
            this.terrainVisualizer.render(this.context, position, viewDirection);
        }
        
        // Render map boundary visualization if enabled
        if (this.mapBoundaryVisualizer && this.showMapBoundaries) {
            this.mapBoundaryVisualizer.render(this.context, position, viewDirection);
        }
        
        // Render marker visualizations if enabled
        if (this.showMarkers && this.markerVisualizers.length > 0) {
            for (const visualizer of this.markerVisualizers) {
                visualizer.render();
            }
        }
        
        // Render prop visualization if enabled
        if (this.showProps && this.propVisualizer) {
            this.propVisualizer.render();
        }
        
        // Render debug info if enabled
        if (this.showDebugInfo) {
            this.renderDebugInfo();
        }
        
        // Update frame time and FPS
        const currentTime = performance.now();
        this.frameTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        // Update FPS counter
        this.fpsUpdateTime += this.frameTime;
        this.frameCount++;
        
        if (this.fpsUpdateTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / this.fpsUpdateTime);
            this.frameCount = 0;
            this.fpsUpdateTime = 0;
        }
    }
    
    /**
     * Render the first-person view
     * @param position Camera position
     * @param rotation Camera rotation
     * @param pitch Camera pitch
     */
    private renderFirstPersonView(position: Vector3, rotation: Vector3, pitch: number): void {
        if (!this.context) return;
        
        // Draw a simple horizon line
        const horizonY = this.height / 2 - pitch * (this.height / this.fov);
        
        this.context.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        this.context.lineWidth = 2;
        this.context.beginPath();
        this.context.moveTo(0, horizonY);
        this.context.lineTo(this.width, horizonY);
        this.context.stroke();
        
        // Draw a simple crosshair
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        this.context.strokeStyle = 'white';
        this.context.lineWidth = 2;
        
        // Horizontal line
        this.context.beginPath();
        this.context.moveTo(centerX - 10, centerY);
        this.context.lineTo(centerX + 10, centerY);
        this.context.stroke();
        
        // Vertical line
        this.context.beginPath();
        this.context.moveTo(centerX, centerY - 10);
        this.context.lineTo(centerX, centerY + 10);
        this.context.stroke();
    }
    
    /**
     * Render the HUD
     */
    private renderHUD(): void {
        if (!this.context || !this.player) return;
        
        // Get player energy
        const energy = this.player.getEnergy();
        const maxEnergy = PhysicsConfig.jetpack.maxEnergy;
        
        // Draw energy bar
        const barWidth = 200;
        const barHeight = 20;
        const barX = this.width - barWidth - 20;
        const barY = this.height - barHeight - 20;
        const fillWidth = (energy / maxEnergy) * barWidth;
        
        // Draw background
        this.context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.context.fillRect(barX, barY, barWidth, barHeight);
        
        // Draw fill
        this.context.fillStyle = energy > maxEnergy * 0.3 ? 'rgba(0, 255, 255, 0.7)' : 'rgba(255, 0, 0, 0.7)';
        this.context.fillRect(barX, barY, fillWidth, barHeight);
        
        // Draw border
        this.context.strokeStyle = 'white';
        this.context.lineWidth = 2;
        this.context.strokeRect(barX, barY, barWidth, barHeight);
        
        // Draw label
        this.context.fillStyle = 'white';
        this.context.font = '14px Arial';
        this.context.textAlign = 'center';
        this.context.fillText('ENERGY', barX + barWidth / 2, barY - 5);
    }
    
    /**
     * Render debug info
     */
    private renderDebugInfo(): void {
        if (!this.player) {
            return;
        }
        
        const position = this.player.transform.position;
        const movementComponent = this.player.getMovementComponent();
        const speed = this.player.getSpeed();
        
        // Set up text rendering
        this.context.font = '14px monospace';
        this.context.fillStyle = 'white';
        this.context.strokeStyle = 'black';
        this.context.lineWidth = 3;
        this.context.textBaseline = 'top';
        
        // Prepare debug text
        const debugInfo = [
            `FPS: ${this.fps}`,
            `Position: ${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}`,
            `Speed: ${speed.toFixed(2)} m/s`,
            `Terrain Visualization: ${this.showTerrainVisualization ? 'ON' : 'OFF'}`,
            `Map Boundaries: ${this.showMapBoundaries ? 'ON' : 'OFF'}`,
            `Markers: ${this.showMarkers ? 'ON' : 'OFF'} (${this.markerVisualizers.length})`,
            `Props: ${this.showProps ? 'ON' : 'OFF'} (${this.propVisualizer ? this.propVisualizer.getProps().length : 0})`
        ];
        
        // Add movement component info if available
        if (movementComponent) {
            debugInfo.push(`On Ground: ${movementComponent.isGrounded() ? 'YES' : 'NO'}`);
            
            // Get terrain data for slope information
            const terrainData = movementComponent.getTerrainData();
            if (terrainData) {
                debugInfo.push(`Slope Angle: ${(terrainData.slopeAngle * (180 / Math.PI)).toFixed(2)}°`);
                
                // Calculate steepness (0-1 scale, where 1 is 45 degrees or steeper)
                const maxSlopeAngle = MathUtils.toRadians(45);
                const steepness = Math.min(terrainData.slopeAngle / maxSlopeAngle, 1);
                debugInfo.push(`Slope Steepness: ${(steepness * 100).toFixed(0)}%`);
                
                debugInfo.push(`Surface: ${terrainData.surfaceType}`);
                debugInfo.push(`Friction: ${terrainData.friction.toFixed(2)}`);
            }
        }
        
        // Render debug text with outline for better visibility
        let y = 10;
        for (const line of debugInfo) {
            this.context.strokeText(line, 10, y);
            this.context.fillText(line, 10, y);
            y += 20;
        }
    }
    
    /**
     * Toggle debug information display
     */
    public toggleDebugInfo(): void {
        this.showDebugInfo = !this.showDebugInfo;
    }
    
    /**
     * Toggle terrain visualization
     * @returns New state of terrain visualization
     */
    public toggleTerrainVisualization(): boolean {
        this.showTerrainVisualization = !this.showTerrainVisualization;
        
        if (this.terrainVisualizer) {
            if (this.showTerrainVisualization) {
                this.terrainVisualizer.enable();
            } else {
                this.terrainVisualizer.disable();
            }
        }
        
        return this.showTerrainVisualization;
    }
    
    /**
     * Toggle map boundary visualization
     * @returns New state of map boundary visualization
     */
    public toggleMapBoundaryVisualization(): boolean {
        this.showMapBoundaries = !this.showMapBoundaries;
        
        if (this.mapBoundaryVisualizer) {
            if (this.showMapBoundaries) {
                this.mapBoundaryVisualizer.enable();
            } else {
                this.mapBoundaryVisualizer.disable();
            }
        }
        
        return this.showMapBoundaries;
    }
    
    /**
     * Toggle marker visualization
     */
    public toggleMarkers(): void {
        this.showMarkers = !this.showMarkers;
        
        for (const visualizer of this.markerVisualizers) {
            visualizer.setEnabled(this.showMarkers);
        }
        
        this.logger.debug(`Marker visualization ${this.showMarkers ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Toggle prop visualization
     * @returns New state of prop visualization
     */
    public togglePropVisualization(): boolean {
        this.showProps = !this.showProps;
        
        if (this.propVisualizer) {
            this.propVisualizer.setEnabled(this.showProps);
        }
        
        return this.showProps;
    }
    
    /**
     * Update terrain visualization options
     * @param options Visualization options
     */
    public updateTerrainVisualizationOptions(options: Partial<import('../components/terrain/TerrainVisualizer').TerrainVisualizerOptions>): void {
        if (this.terrainVisualizer) {
            this.terrainVisualizer.updateOptions(options);
        }
    }
    
    /**
     * Update map boundary visualization options
     * @param options Visualization options
     */
    public updateMapBoundaryVisualizationOptions(options: Partial<import('../components/terrain/MapBoundaryVisualizer').MapBoundaryVisualizerOptions>): void {
        if (this.mapBoundaryVisualizer) {
            this.mapBoundaryVisualizer.updateOptions(options);
        }
    }
    
    /**
     * Update marker visualization options
     * @param options Visualization options
     */
    public updateMarkerVisualizationOptions(options: Partial<import('../components/markers/MarkerVisualizer').MarkerVisualizerOptions>): void {
        for (const visualizer of this.markerVisualizers) {
            visualizer.updateOptions(options);
        }
    }
    
    /**
     * Set prop visualization options
     * @param options Prop visualization options
     */
    public setPropVisualizationOptions(options: Partial<PropVisualizerOptions>): void {
        if (this.propVisualizer) {
            this.propVisualizer.updateOptions(options);
        }
    }
    
    /**
     * Handle window resize
     */
    private handleResize(): void {
        // Update canvas size based on container
        const container = this.canvas.parentElement;
        if (container) {
            this.setSize(container.clientWidth, container.clientHeight);
        }
    }
    
    /**
     * Set canvas size
     * @param width Canvas width
     * @param height Canvas height
     */
    public setSize(width: number, height: number): void {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
        this.aspectRatio = width / height;
        
        this.logger.debug(`Renderer size set to ${width}x${height}`);
    }
    
    /**
     * Clean up resources
     */
    public dispose(): void {
        // Clean up terrain visualizer
        if (this.terrainVisualizer) {
            // No explicit cleanup needed for TerrainVisualizer
            this.terrainVisualizer = undefined;
        }
        
        // Clean up map boundary visualizer
        if (this.mapBoundaryVisualizer) {
            // No explicit cleanup needed for MapBoundaryVisualizer
            this.mapBoundaryVisualizer = undefined;
        }
        
        // Clean up marker visualizers
        for (const visualizer of this.markerVisualizers) {
            visualizer.dispose();
        }
        this.markerVisualizers = [];
        
        // Clean up prop visualizer
        if (this.propVisualizer) {
            // No explicit cleanup needed for PropVisualizer
            this.propVisualizer = undefined;
        }
        
        this.logger.debug('First-person renderer disposed');
    }
} 