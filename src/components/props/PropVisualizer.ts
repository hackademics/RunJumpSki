/**
 * PropVisualizer.ts
 * Visualizes environmental props in the game world
 */

import { Logger } from '../../utils/Logger';
import { PropComponent, PropType } from './PropComponent';
import { Vector3 } from '../../types/common/Vector3';

/**
 * Level of Detail configuration
 */
interface LODConfig {
    distance: number;
    detailLevel: number;
}

/**
 * Prop visualizer options
 */
export interface PropVisualizerOptions {
    /**
     * Level of detail (0-1, where 1 is highest)
     */
    detailLevel?: number;
    
    /**
     * Whether to show collision boundaries for debugging
     */
    showCollisionBoundaries?: boolean;
    
    /**
     * Maximum distance to render props
     */
    maxRenderDistance?: number;
    
    /**
     * Whether to use color variations
     */
    useColorVariations?: boolean;
    
    /**
     * Whether to show shadows
     */
    showShadows?: boolean;
    
    /**
     * Grid size for spatial partitioning
     */
    gridSize?: number;
}

/**
 * Default prop visualizer options
 */
const DEFAULT_OPTIONS: PropVisualizerOptions = {
    detailLevel: 0.8,
    showCollisionBoundaries: false,
    maxRenderDistance: 300,
    useColorVariations: true,
    showShadows: true,
    gridSize: 50
};

/**
 * Default LOD configurations
 */
const DEFAULT_LOD_CONFIGS: LODConfig[] = [
    { distance: 50, detailLevel: 1.0 },   // High detail for close props
    { distance: 150, detailLevel: 0.7 },  // Medium detail for medium distance
    { distance: 300, detailLevel: 0.4 }   // Low detail for far props
];

/**
 * Visualizes environmental props in the game world
 */
export class PropVisualizer {
    private logger: Logger;
    private propComponents: PropComponent[] = [];
    private options: PropVisualizerOptions;
    private enabled: boolean = true;
    private canvas?: HTMLCanvasElement;
    private ctx?: CanvasRenderingContext2D;
    private playerPosition?: Vector3;
    private cameraDirection?: Vector3;
    
    // Spatial partitioning grid
    private spatialGrid: Map<string, PropComponent[]> = new Map();
    private readonly GRID_SIZE: number;
    
    // Prop batching
    private batchedProps: Map<PropType, PropComponent[]> = new Map();
    
    // Cached calculations
    private cachedDistances: Map<string, number> = new Map();
    private lastPlayerGridKey: string = '';
    private visibleGridCells: string[] = [];
    
    // Cached colors for different prop types
    private propColors: Record<PropType, string> = {
        [PropType.TREE]: '#2d4c1e',
        [PropType.ROCK]: '#7a7a7a',
        [PropType.BUSH]: '#3a6b29',
        [PropType.STUMP]: '#5c4033',
        [PropType.LOG]: '#8b5a2b',
        [PropType.SNOW_PILE]: '#f0f0f0'
    };
    
    /**
     * Create a new prop visualizer
     * @param options Visualizer options
     */
    constructor(options: PropVisualizerOptions = {}) {
        this.logger = new Logger('PropVisualizer');
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.GRID_SIZE = this.options.gridSize || DEFAULT_OPTIONS.gridSize!;
    }
    
    /**
     * Initialize the visualizer
     * @param canvas Canvas to render to
     */
    public init(canvas: HTMLCanvasElement): void {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.logger.debug('Prop visualizer initialized');
    }
    
    /**
     * Add a prop component to visualize
     * @param prop Prop component
     */
    public addProp(prop: PropComponent): void {
        this.propComponents.push(prop);
        this.addToSpatialGrid(prop);
        this.addToBatch(prop);
    }
    
    /**
     * Add multiple prop components
     * @param props Prop components
     */
    public addProps(props: PropComponent[]): void {
        for (const prop of props) {
            this.addProp(prop);
        }
    }
    
    /**
     * Add prop to spatial grid
     * @param prop Prop component to add
     */
    private addToSpatialGrid(prop: PropComponent): void {
        if (!prop.entity) return;
        
        const pos = prop.entity.transform.position;
        const gridKey = this.getGridKey(pos.x, pos.z);
        
        if (!this.spatialGrid.has(gridKey)) {
            this.spatialGrid.set(gridKey, []);
        }
        this.spatialGrid.get(gridKey)!.push(prop);
    }
    
    /**
     * Add prop to batch
     * @param prop Prop component to add
     */
    private addToBatch(prop: PropComponent): void {
        const type = prop.getPropType();
        if (!this.batchedProps.has(type)) {
            this.batchedProps.set(type, []);
        }
        this.batchedProps.get(type)!.push(prop);
    }
    
    /**
     * Get grid key for position
     * @param x X coordinate
     * @param z Z coordinate
     * @returns Grid key string
     */
    private getGridKey(x: number, z: number): string {
        const gridX = Math.floor(x / this.GRID_SIZE);
        const gridZ = Math.floor(z / this.GRID_SIZE);
        return `${gridX},${gridZ}`;
    }
    
    /**
     * Update visible grid cells
     */
    private updateVisibleGridCells(): void {
        if (!this.playerPosition) return;
        
        const playerGridKey = this.getGridKey(this.playerPosition.x, this.playerPosition.z);
        
        // Only update if player has moved to a new grid cell
        if (playerGridKey === this.lastPlayerGridKey) return;
        
        this.lastPlayerGridKey = playerGridKey;
        this.visibleGridCells = [];
        
        const renderDistance = this.options.maxRenderDistance || 300;
        const gridRadius = Math.ceil(renderDistance / this.GRID_SIZE);
        const [playerGridX, playerGridZ] = playerGridKey.split(',').map(Number);
        
        for (let x = -gridRadius; x <= gridRadius; x++) {
            for (let z = -gridRadius; z <= gridRadius; z++) {
                const key = `${playerGridX + x},${playerGridZ + z}`;
                this.visibleGridCells.push(key);
            }
        }
    }
    
    /**
     * Get LOD level for distance
     * @param distance Distance to prop
     * @returns LOD detail level (0-1)
     */
    private getLODLevel(distance: number): number {
        for (const config of DEFAULT_LOD_CONFIGS) {
            if (distance <= config.distance) {
                return config.detailLevel;
            }
        }
        return DEFAULT_LOD_CONFIGS[DEFAULT_LOD_CONFIGS.length - 1].detailLevel;
    }
    
    /**
     * Update the visualizer with optimized caching
     */
    public update(deltaTime: number, playerPosition: Vector3, cameraDirection: Vector3): void {
        if (!this.enabled) return;
        
        this.playerPosition = playerPosition;
        this.cameraDirection = cameraDirection;
        
        // Update visible grid cells
        this.updateVisibleGridCells();
        
        // Clear distance cache periodically or when player moves significantly
        const playerGridKey = this.getGridKey(playerPosition.x, playerPosition.z);
        if (playerGridKey !== this.lastPlayerGridKey || this.cachedDistances.size > 100) {
            this.cachedDistances.clear();
            this.lastPlayerGridKey = playerGridKey;
        }
    }
    
    /**
     * Render the props
     */
    public render(): void {
        if (!this.enabled || !this.ctx || !this.canvas || !this.playerPosition || !this.cameraDirection) return;
        
        // Get visible props from grid
        const visibleProps: PropComponent[] = [];
        for (const gridKey of this.visibleGridCells) {
            const cellProps = this.spatialGrid.get(gridKey);
            if (cellProps) {
                visibleProps.push(...cellProps);
            }
        }
        
        // Sort props by type and distance
        const sortedProps = this.sortPropsByTypeAndDistance(visibleProps);
        
        // Render props by type (batching)
        for (const [type, props] of sortedProps) {
            // Set up common rendering state for this prop type
            this.setupPropTypeRenderState(type);
            
            // Render all props of this type
            for (const prop of props) {
                this.renderProp(prop);
            }
        }
    }
    
    /**
     * Sort props by type and distance
     * @param props Props to sort
     * @returns Map of prop type to sorted props
     */
    private sortPropsByTypeAndDistance(props: PropComponent[]): Map<PropType, PropComponent[]> {
        const sorted = new Map<PropType, PropComponent[]>();
        
        for (const prop of props) {
            const type = prop.getPropType();
            if (!sorted.has(type)) {
                sorted.set(type, []);
            }
            
            if (prop.entity) {
                const distance = this.getDistanceToProp(prop);
                if (distance <= (this.options.maxRenderDistance || 300)) {
                    sorted.get(type)!.push(prop);
                }
            }
        }
        
        // Sort each type's props by distance
        for (const [type, typeProps] of sorted) {
            typeProps.sort((a, b) => {
                const distA = this.getDistanceToProp(a);
                const distB = this.getDistanceToProp(b);
                return distB - distA; // Furthest first
            });
        }
        
        return sorted;
    }
    
    /**
     * Get cached distance to prop
     * @param prop Prop to get distance to
     * @returns Distance to prop
     */
    private getDistanceToProp(prop: PropComponent): number {
        if (!prop.entity || !this.playerPosition) return Infinity;
        
        const cacheKey = `${prop.entity.id}`;
        if (this.cachedDistances.has(cacheKey)) {
            return this.cachedDistances.get(cacheKey)!;
        }
        
        const distance = this.playerPosition.distanceTo(prop.entity.transform.position);
        this.cachedDistances.set(cacheKey, distance);
        return distance;
    }
    
    /**
     * Set up render state for prop type
     * @param type Prop type
     */
    private setupPropTypeRenderState(type: PropType): void {
        if (!this.ctx) return;
        
        // Set common properties for this prop type
        this.ctx.fillStyle = this.propColors[type];
        this.ctx.strokeStyle = this.adjustColor(this.propColors[type], 0.2);
        this.ctx.lineWidth = 1;
    }
    
    /**
     * Render a single prop
     * @param prop Prop component to render
     */
    private renderProp(prop: PropComponent): void {
        if (!this.ctx || !this.playerPosition || !prop.entity) return;

        const worldPos = prop.entity.transform.position;
        const screenPos = this.worldToScreen(worldPos);

        if (!screenPos) return; // Skip if behind camera

        // Calculate distance and size
        const distance = this.getDistanceToProp(prop);
        if (distance > (this.options.maxRenderDistance || 300)) return;

        // Calculate size based on distance and LOD
        const baseSize = this.getBaseSizeForPropType(prop.getPropType());
        const scale = prop.getScale();
        const lodLevel = this.getLODLevel(distance);
        const size = (baseSize * scale * lodLevel) / (distance * 0.1);

        // Draw the prop
        this.drawProp(screenPos.x, screenPos.y, size, prop);

        // Draw collision boundary if enabled
        if (this.options.showCollisionBoundaries && prop.getCollisionRadius() > 0) {
            this.drawCollisionBoundary(screenPos.x, screenPos.y, size, prop);
        }
    }
    
    /**
     * Draw a prop
     * @param x X position on screen
     * @param y Y position on screen
     * @param size Size of the prop
     * @param prop Prop component
     */
    private drawProp(x: number, y: number, size: number, prop: PropComponent): void {
        if (!this.ctx) return;
        
        const propType = prop.getPropType();
        
        // Get base color for prop type
        let color = this.propColors[propType];
        
        // Apply color variation if enabled
        if (this.options.useColorVariations) {
            const variation = prop.getColorVariation();
            color = this.adjustColor(color, variation);
        }
        
        // Draw shadow if enabled
        if (this.options.showShadows && prop.getCastsShadow()) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.beginPath();
            this.ctx.ellipse(x, y + size * 0.9, size * 0.6, size * 0.2, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw the prop based on its type
        switch (propType) {
            case PropType.TREE:
                this.drawTree(x, y, size, color);
                break;
            case PropType.ROCK:
                this.drawRock(x, y, size, color);
                break;
            case PropType.BUSH:
                this.drawBush(x, y, size, color);
                break;
            case PropType.STUMP:
                this.drawStump(x, y, size, color);
                break;
            case PropType.LOG:
                this.drawLog(x, y, size, color);
                break;
            case PropType.SNOW_PILE:
                this.drawSnowPile(x, y, size, color);
                break;
        }
    }
    
    /**
     * Draw a tree
     * @param x X position on screen
     * @param y Y position on screen
     * @param size Size of the tree
     * @param color Color of the tree
     */
    private drawTree(x: number, y: number, size: number, color: string): void {
        if (!this.ctx) return;
        
        // Draw trunk
        this.ctx.fillStyle = '#5c4033';
        this.ctx.fillRect(x - size * 0.1, y - size * 0.1, size * 0.2, size * 0.7);
        
        // Draw foliage (triangle for simple pine tree)
        this.ctx.fillStyle = color;
        
        // Draw multiple triangles for a pine tree effect
        for (let i = 0; i < 3; i++) {
            const triangleWidth = size * (1 - i * 0.2);
            const triangleHeight = size * 0.8;
            const triangleY = y - size * 0.3 - i * size * 0.25;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, triangleY - triangleHeight / 2);
            this.ctx.lineTo(x - triangleWidth / 2, triangleY + triangleHeight / 2);
            this.ctx.lineTo(x + triangleWidth / 2, triangleY + triangleHeight / 2);
            this.ctx.closePath();
            this.ctx.fill();
        }
    }
    
    /**
     * Draw a rock
     * @param x X position on screen
     * @param y Y position on screen
     * @param size Size of the rock
     * @param color Color of the rock
     */
    private drawRock(x: number, y: number, size: number, color: string): void {
        if (!this.ctx) return;
        
        // Draw a simple rock shape
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        
        // Create an irregular polygon for the rock
        const points = 7;
        const angleStep = (Math.PI * 2) / points;
        
        for (let i = 0; i < points; i++) {
            const angle = i * angleStep;
            const radius = size * 0.5 * (0.8 + Math.random() * 0.4);
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;
            
            if (i === 0) {
                this.ctx.moveTo(px, py);
            } else {
                this.ctx.lineTo(px, py);
            }
        }
        
        this.ctx.closePath();
        this.ctx.fill();
        
        // Add some highlights
        this.ctx.strokeStyle = this.adjustColor(color, 0.2);
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }
    
    /**
     * Draw a bush
     * @param x X position on screen
     * @param y Y position on screen
     * @param size Size of the bush
     * @param color Color of the bush
     */
    private drawBush(x: number, y: number, size: number, color: string): void {
        if (!this.ctx) return;
        
        // Draw multiple circles for a bush effect
        this.ctx.fillStyle = color;
        
        // Main bush body
        this.ctx.beginPath();
        this.ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Additional foliage circles
        const circleCount = 5;
        for (let i = 0; i < circleCount; i++) {
            const angle = (i / circleCount) * Math.PI * 2;
            const distance = size * 0.25;
            const circleX = x + Math.cos(angle) * distance;
            const circleY = y + Math.sin(angle) * distance;
            const circleSize = size * 0.3;
            
            this.ctx.beginPath();
            this.ctx.arc(circleX, circleY, circleSize, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    /**
     * Draw a stump
     * @param x X position on screen
     * @param y Y position on screen
     * @param size Size of the stump
     * @param color Color of the stump
     */
    private drawStump(x: number, y: number, size: number, color: string): void {
        if (!this.ctx) return;
        
        // Draw a simple stump
        this.ctx.fillStyle = color;
        
        // Stump body (cylinder)
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, size * 0.3, size * 0.1, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Stump top (circle with tree rings)
        this.ctx.fillStyle = this.adjustColor(color, 0.1);
        this.ctx.beginPath();
        this.ctx.arc(x, y, size * 0.25, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Tree rings
        this.ctx.strokeStyle = this.adjustColor(color, -0.1);
        this.ctx.lineWidth = 1;
        
        for (let i = 1; i <= 3; i++) {
            this.ctx.beginPath();
            this.ctx.arc(x, y, size * 0.25 * (i / 4), 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }
    
    /**
     * Draw a log
     * @param x X position on screen
     * @param y Y position on screen
     * @param size Size of the log
     * @param color Color of the log
     */
    private drawLog(x: number, y: number, size: number, color: string): void {
        if (!this.ctx) return;
        
        // Draw a simple log
        this.ctx.fillStyle = color;
        
        // Log body
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(Math.PI / 4); // Rotate 45 degrees
        
        // Draw the log as a rectangle
        this.ctx.fillRect(-size * 0.6, -size * 0.15, size * 1.2, size * 0.3);
        
        // Draw end caps
        this.ctx.fillStyle = this.adjustColor(color, 0.1);
        
        // Left end cap
        this.ctx.beginPath();
        this.ctx.ellipse(-size * 0.6, 0, size * 0.15, size * 0.15, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Right end cap
        this.ctx.beginPath();
        this.ctx.ellipse(size * 0.6, 0, size * 0.15, size * 0.15, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    /**
     * Draw a snow pile
     * @param x X position on screen
     * @param y Y position on screen
     * @param size Size of the snow pile
     * @param color Color of the snow pile
     */
    private drawSnowPile(x: number, y: number, size: number, color: string): void {
        if (!this.ctx) return;
        
        // Draw a simple snow pile
        this.ctx.fillStyle = color;
        
        // Draw as a rounded rectangle
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, size * 0.6, size * 0.3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add some highlights
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.ellipse(x - size * 0.2, y - size * 0.1, size * 0.2, size * 0.1, Math.PI / 4, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    /**
     * Draw collision boundary for debugging
     * @param x X position on screen
     * @param y Y position on screen
     * @param size Size of the prop
     * @param prop Prop component
     */
    private drawCollisionBoundary(x: number, y: number, size: number, prop: PropComponent): void {
        if (!this.ctx) return;
        
        const radius = prop.getCollisionRadius() * prop.getScale() * (size / 10);
        
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
    }
    
    /**
     * Get base size for a prop type
     * @param propType Prop type
     * @returns Base size for the prop type
     */
    private getBaseSizeForPropType(propType: PropType): number {
        switch (propType) {
            case PropType.TREE:
                return 100;
            case PropType.ROCK:
                return 60;
            case PropType.BUSH:
                return 40;
            case PropType.STUMP:
                return 30;
            case PropType.LOG:
                return 50;
            case PropType.SNOW_PILE:
                return 45;
            default:
                return 50;
        }
    }
    
    /**
     * Adjust a color by a factor
     * @param color Color to adjust (hex format)
     * @param factor Factor to adjust by (-1 to 1)
     * @returns Adjusted color
     */
    private adjustColor(color: string, factor: number): string {
        // Convert hex to RGB
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        // Adjust RGB values
        const adjustedR = Math.max(0, Math.min(255, r + Math.round(r * factor)));
        const adjustedG = Math.max(0, Math.min(255, g + Math.round(g * factor)));
        const adjustedB = Math.max(0, Math.min(255, b + Math.round(b * factor)));
        
        // Convert back to hex
        return `#${adjustedR.toString(16).padStart(2, '0')}${adjustedG.toString(16).padStart(2, '0')}${adjustedB.toString(16).padStart(2, '0')}`;
    }
    
    /**
     * Convert a world position to screen coordinates with proper perspective projection
     * @param worldPos World position
     * @returns Screen position or undefined if behind camera
     */
    private worldToScreen(worldPos: Vector3): { x: number, y: number } | undefined {
        if (!this.canvas || !this.playerPosition || !this.cameraDirection) return undefined;

        // Calculate vector from player to prop
        const toObject = new Vector3(
            worldPos.x - this.playerPosition.x,
            worldPos.y - this.playerPosition.y,
            worldPos.z - this.playerPosition.z
        );

        // Check if prop is behind the camera
        const normalizedObject = toObject.clone().normalize();
        const dotProduct = normalizedObject.dot(this.cameraDirection);
        if (dotProduct < 0) return undefined;

        // Calculate screen position with perspective projection
        const distance = toObject.length();
        const angle = Math.atan2(toObject.x, toObject.z) - Math.atan2(this.cameraDirection.x, this.cameraDirection.z);
        
        // Field of view and perspective calculations
        const fov = Math.PI / 3; // 60 degrees
        const scale = 1 / Math.tan(fov / 2);
        
        const { width, height } = this.canvas;
        const x = width / 2 + (Math.sin(angle) * width * scale) / (distance * 0.1);
        const y = height / 2 - ((worldPos.y - this.playerPosition.y) * height * scale) / (distance * 0.1);

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
    public updateOptions(options: Partial<PropVisualizerOptions>): void {
        this.options = { ...this.options, ...options };
    }
    
    /**
     * Get current options
     * @returns Current options
     */
    public getOptions(): PropVisualizerOptions {
        return { ...this.options };
    }
    
    /**
     * Clean up resources
     */
    public dispose(): void {
        this.propComponents = [];
        this.spatialGrid.clear();
        this.batchedProps.clear();
        this.cachedDistances.clear();
        this.visibleGridCells = [];
        this.canvas = undefined;
        this.ctx = undefined;
        this.playerPosition = undefined;
        this.cameraDirection = undefined;
    }
    
    /**
     * Get all prop components
     * @returns Array of prop components
     */
    public getProps(): PropComponent[] {
        return [...this.propComponents];
    }
} 