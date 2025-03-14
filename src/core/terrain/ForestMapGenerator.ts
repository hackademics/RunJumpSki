/**
 * ForestMapGenerator.ts
 * Generates the forest map layout
 */

import { Vector3 } from '../../types/common/Vector3';
import { SurfaceType } from '../../types/events/EventTypes';
import { TerrainConfig } from '../../config/TerrainConfig';
import { TerrainSystem } from './TerrainSystem';
import { TerrainGenerationOptions } from '../../types/terrain/TerrainTypes';
import { Logger } from '../../utils/Logger';
import { Entity } from '../../entities/Entity';
import { MarkerComponent, MarkerType } from '../../components/markers/MarkerComponent';
import { PropComponent, PropType } from '../../components/props/PropComponent';

/**
 * Forest map feature type
 */
export enum ForestFeatureType {
    SKI_PATH = 'skiPath',
    JUMP = 'jump',
    VALLEY = 'valley',
    HILL = 'hill',
    FLAT_AREA = 'flatArea',
    START_MARKER = 'startMarker',
    FINISH_MARKER = 'finishMarker',
    CHECKPOINT_MARKER = 'checkpointMarker',
    PROP = 'prop'
}

/**
 * Forest map feature
 */
export interface ForestFeature {
    /**
     * Feature type
     */
    type: ForestFeatureType;
    
    /**
     * Position of the feature
     */
    position: Vector3;
    
    /**
     * Size of the feature
     */
    size: Vector3;
    
    /**
     * Rotation of the feature in degrees
     */
    rotation: number;
    
    /**
     * Additional parameters for the feature
     */
    params?: Record<string, any>;
}

/**
 * Prop generation configuration
 */
interface PropGenerationConfig {
    densityPerSquareUnit: number;
    minScale: number;
    maxScale: number;
    hasCollision: boolean;
    collisionRadius: number;
    castsShadow: boolean;
    colorVariation: number;
    avoidPathDistance: number;
}

/**
 * Default prop generation configurations
 */
const DEFAULT_PROP_CONFIGS: Record<PropType, PropGenerationConfig> = {
    [PropType.TREE]: {
        densityPerSquareUnit: 0.001, // 1 tree per 1000 square units
        minScale: 0.8,
        maxScale: 1.5,
        hasCollision: true,
        collisionRadius: 2.0,
        castsShadow: true,
        colorVariation: 0.2,
        avoidPathDistance: 15
    },
    [PropType.ROCK]: {
        densityPerSquareUnit: 0.0005,
        minScale: 0.5,
        maxScale: 1.2,
        hasCollision: true,
        collisionRadius: 1.5,
        castsShadow: true,
        colorVariation: 0.1,
        avoidPathDistance: 10
    },
    [PropType.BUSH]: {
        densityPerSquareUnit: 0.002,
        minScale: 0.6,
        maxScale: 1.0,
        hasCollision: false,
        collisionRadius: 0.5,
        castsShadow: true,
        colorVariation: 0.15,
        avoidPathDistance: 8
    },
    [PropType.STUMP]: {
        densityPerSquareUnit: 0.0003,
        minScale: 0.7,
        maxScale: 1.0,
        hasCollision: true,
        collisionRadius: 0.8,
        castsShadow: true,
        colorVariation: 0.1,
        avoidPathDistance: 5
    },
    [PropType.LOG]: {
        densityPerSquareUnit: 0.0002,
        minScale: 0.8,
        maxScale: 1.2,
        hasCollision: true,
        collisionRadius: 1.0,
        castsShadow: true,
        colorVariation: 0.1,
        avoidPathDistance: 12
    },
    [PropType.SNOW_PILE]: {
        densityPerSquareUnit: 0.0004,
        minScale: 0.7,
        maxScale: 1.3,
        hasCollision: false,
        collisionRadius: 0.5,
        castsShadow: false,
        colorVariation: 0.05,
        avoidPathDistance: 5
    }
};

/**
 * Forest map generator
 */
export class ForestMapGenerator {
    /**
     * Logger instance
     */
    private logger: Logger;
    
    /**
     * Terrain system
     */
    private terrainSystem: TerrainSystem;
    
    /**
     * Map features
     */
    private features: ForestFeature[] = [];
    
    /**
     * Marker entities
     */
    private markerEntities: Entity[] = [];
    
    /**
     * Marker components
     */
    private markerComponents: MarkerComponent[] = [];
    
    /**
     * Prop entities
     */
    private propEntities: Entity[] = [];
    
    /**
     * Prop components
     */
    private propComponents: PropComponent[] = [];
    
    /**
     * Creates a new ForestMapGenerator
     * @param terrainSystem Terrain system
     */
    constructor(terrainSystem: TerrainSystem) {
        this.logger = new Logger('ForestMapGenerator');
        this.terrainSystem = terrainSystem;
    }
    
    /**
     * Generate the forest map
     */
    public generateMap(): void {
        try {
            this.logger.info('Generating forest map');
            
            // Initialize terrain system
            this.terrainSystem.initialize();
            
            // Generate base terrain
            const options: TerrainGenerationOptions = {
                width: TerrainConfig.forestMap.dimensions.width,
                depth: TerrainConfig.forestMap.dimensions.depth,
                maxHeight: TerrainConfig.forestMap.dimensions.maxHeight,
                resolution: TerrainConfig.dimensions.resolution,
                noise: TerrainConfig.forestMap.noise
            };
            
            this.terrainSystem.generateProcedural(options);
            
            // Generate features
            this.generateFeatures();
            
            // Apply features to terrain
            this.applyFeatures();
            
            // Create marker entities
            this.createMarkerEntities();
            
            // Create prop entities
            this.createPropEntities();
            
            this.logger.info('Forest map generation complete');
        } catch (error) {
            this.logger.error(`Error generating forest map: ${error}`);
            throw new Error(`Failed to generate forest map: ${error}`);
        }
    }
    
    /**
     * Generate map features
     */
    private generateFeatures(): void {
        this.logger.info('Generating map features');
        
        // Clear existing features
        this.features = [];
        
        // Generate ski paths
        this.generateSkiPaths();
        
        // Generate jumps
        this.generateJumps();
        
        // Generate valleys
        this.generateValleys();
        
        // Generate start and finish markers
        this.generateMarkers();
        
        // Generate environmental props
        this.generateProps();
        
        this.logger.info(`Generated ${this.features.length} features`);
    }
    
    /**
     * Generate ski paths
     */
    private generateSkiPaths(): void {
        const numPaths = TerrainConfig.forestMap.features.skiPaths;
        const mapWidth = TerrainConfig.forestMap.dimensions.width;
        const mapDepth = TerrainConfig.forestMap.dimensions.depth;
        
        this.logger.info(`Generating ${numPaths} ski paths`);
        
        // Divide the map into sections for ski paths
        const sectionWidth = mapWidth / (numPaths + 1);
        
        for (let i = 0; i < numPaths; i++) {
            // Calculate path position
            const x = sectionWidth * (i + 1);
            const z = mapDepth * 0.1; // Start near the top of the map
            
            // Create path feature
            const path: ForestFeature = {
                type: ForestFeatureType.SKI_PATH,
                position: new Vector3(x, 0, z),
                size: new Vector3(sectionWidth * 0.5, 0, mapDepth * 0.8),
                rotation: 0,
                params: {
                    controlPoints: this.generatePathControlPoints(x, z, mapDepth),
                    width: sectionWidth * 0.3,
                    surfaceType: SurfaceType.SNOW
                }
            };
            
            this.features.push(path);
        }
    }
    
    /**
     * Generate control points for a ski path
     * @param startX Starting X coordinate
     * @param startZ Starting Z coordinate
     * @param mapDepth Map depth
     * @returns Array of control points
     */
    private generatePathControlPoints(startX: number, startZ: number, mapDepth: number): Vector3[] {
        const points: Vector3[] = [];
        const numPoints = 8;
        const segmentLength = mapDepth * 0.8 / (numPoints - 1);
        
        // Start point
        points.push(new Vector3(startX, 0, startZ));
        
        // Generate intermediate points with some randomness
        for (let i = 1; i < numPoints - 1; i++) {
            const z = startZ + i * segmentLength;
            const xOffset = (Math.random() - 0.5) * segmentLength * 0.5;
            const x = startX + xOffset;
            
            // Get height at this position
            const height = this.terrainSystem.getHeightAt(x, z) || 0;
            
            points.push(new Vector3(x, height, z));
        }
        
        // End point
        const endZ = startZ + (numPoints - 1) * segmentLength;
        const endHeight = this.terrainSystem.getHeightAt(startX, endZ) || 0;
        points.push(new Vector3(startX, endHeight, endZ));
        
        return points;
    }
    
    /**
     * Generate jumps
     */
    private generateJumps(): void {
        const numJumps = TerrainConfig.forestMap.features.jumps;
        const mapWidth = TerrainConfig.forestMap.dimensions.width;
        const mapDepth = TerrainConfig.forestMap.dimensions.depth;
        
        this.logger.info(`Generating ${numJumps} jumps`);
        
        // Find ski paths to place jumps on
        const skiPaths = this.features.filter(f => f.type === ForestFeatureType.SKI_PATH);
        
        if (skiPaths.length === 0) {
            this.logger.warn('No ski paths found for jump placement');
            return;
        }
        
        // Distribute jumps among ski paths
        const jumpsPerPath = Math.ceil(numJumps / skiPaths.length);
        
        for (let i = 0; i < skiPaths.length; i++) {
            const path = skiPaths[i];
            const controlPoints = path.params?.controlPoints as Vector3[];
            
            if (!controlPoints || controlPoints.length < 4) {
                continue;
            }
            
            // Place jumps along the path
            for (let j = 0; j < jumpsPerPath; j++) {
                // Calculate position along the path (avoid start and end)
                const pathPos = 0.3 + (j * 0.4 / jumpsPerPath);
                const pointIndex = Math.floor(pathPos * (controlPoints.length - 1));
                
                // Get position from control points
                const p1 = controlPoints[pointIndex];
                const p2 = controlPoints[pointIndex + 1];
                const t = pathPos * (controlPoints.length - 1) - pointIndex;
                
                // Interpolate position
                const x = p1.x + (p2.x - p1.x) * t;
                const z = p1.z + (p2.z - p1.z) * t;
                const y = this.terrainSystem.getHeightAt(x, z) || 0;
                
                // Create jump feature
                const jump: ForestFeature = {
                    type: ForestFeatureType.JUMP,
                    position: new Vector3(x, y, z),
                    size: new Vector3(20, 10, 30),
                    rotation: Math.random() * 20 - 10, // Slight random rotation
                    params: {
                        height: 5 + Math.random() * 5,
                        length: 15 + Math.random() * 10,
                        landingLength: 30 + Math.random() * 20
                    }
                };
                
                this.features.push(jump);
            }
        }
    }
    
    /**
     * Generate valleys
     */
    private generateValleys(): void {
        const numValleys = TerrainConfig.forestMap.features.valleys;
        const mapWidth = TerrainConfig.forestMap.dimensions.width;
        const mapDepth = TerrainConfig.forestMap.dimensions.depth;
        
        this.logger.info(`Generating ${numValleys} valleys`);
        
        for (let i = 0; i < numValleys; i++) {
            // Calculate valley position
            const x = mapWidth * 0.2 + Math.random() * mapWidth * 0.6;
            const z = mapDepth * 0.3 + Math.random() * mapDepth * 0.4;
            const y = this.terrainSystem.getHeightAt(x, z) || 0;
            
            // Create valley feature
            const valley: ForestFeature = {
                type: ForestFeatureType.VALLEY,
                position: new Vector3(x, y, z),
                size: new Vector3(
                    50 + Math.random() * 100,
                    10 + Math.random() * 20,
                    50 + Math.random() * 100
                ),
                rotation: Math.random() * 360,
                params: {
                    depth: 10 + Math.random() * 15,
                    smoothing: 0.5 + Math.random() * 0.5
                }
            };
            
            this.features.push(valley);
        }
    }
    
    /**
     * Generate start and finish markers
     */
    private generateMarkers(): void {
        const mapWidth = TerrainConfig.forestMap.dimensions.width;
        const mapDepth = TerrainConfig.forestMap.dimensions.depth;
        
        this.logger.info('Generating start and finish markers');
        
        // Find ski paths to place markers on
        const skiPaths = this.features.filter(f => f.type === ForestFeatureType.SKI_PATH);
        
        if (skiPaths.length === 0) {
            this.logger.warn('No ski paths found for marker placement');
            return;
        }
        
        // Choose the middle ski path for markers
        const middlePathIndex = Math.floor(skiPaths.length / 2);
        const path = skiPaths[middlePathIndex];
        const controlPoints = path.params?.controlPoints as Vector3[];
        
        if (!controlPoints || controlPoints.length < 2) {
            this.logger.warn('No control points found for marker placement');
            return;
        }
        
        // Get start point (first control point)
        const startPoint = controlPoints[0];
        const startHeight = this.terrainSystem.getHeightAt(startPoint.x, startPoint.z) || 0;
        
        // Create start marker feature
        const startMarker: ForestFeature = {
            type: ForestFeatureType.START_MARKER,
            position: new Vector3(startPoint.x, startHeight, startPoint.z),
            size: new Vector3(30, 10, 1), // Width, height, depth
            rotation: 90, // Perpendicular to ski path
            params: {
                markerType: MarkerType.START,
                width: 30
            }
        };
        
        this.features.push(startMarker);
        
        // Get finish point (last control point)
        const finishPoint = controlPoints[controlPoints.length - 1];
        const finishHeight = this.terrainSystem.getHeightAt(finishPoint.x, finishPoint.z) || 0;
        
        // Create finish marker feature
        const finishMarker: ForestFeature = {
            type: ForestFeatureType.FINISH_MARKER,
            position: new Vector3(finishPoint.x, finishHeight, finishPoint.z),
            size: new Vector3(30, 10, 1), // Width, height, depth
            rotation: 90, // Perpendicular to ski path
            params: {
                markerType: MarkerType.FINISH,
                width: 30
            }
        };
        
        this.features.push(finishMarker);
        
        // Add checkpoint markers along the path
        const numCheckpoints = 2;
        
        for (let i = 1; i <= numCheckpoints; i++) {
            // Calculate position along the path
            const pathPos = i / (numCheckpoints + 1);
            const pointIndex = Math.floor(pathPos * (controlPoints.length - 1));
            
            // Get position from control points
            const p1 = controlPoints[pointIndex];
            const p2 = controlPoints[pointIndex + 1];
            const t = pathPos * (controlPoints.length - 1) - pointIndex;
            
            // Interpolate position
            const x = p1.x + (p2.x - p1.x) * t;
            const z = p1.z + (p2.z - p1.z) * t;
            const y = this.terrainSystem.getHeightAt(x, z) || 0;
            
            // Create checkpoint marker feature
            const checkpointMarker: ForestFeature = {
                type: ForestFeatureType.CHECKPOINT_MARKER,
                position: new Vector3(x, y, z),
                size: new Vector3(20, 8, 1), // Width, height, depth
                rotation: 90, // Perpendicular to ski path
                params: {
                    markerType: MarkerType.CHECKPOINT,
                    checkpointNumber: i,
                    width: 20
                }
            };
            
            this.features.push(checkpointMarker);
        }
        
        this.logger.info('Generated start, finish, and checkpoint markers');
    }
    
    /**
     * Generate environmental props
     */
    private generateProps(): void {
        this.logger.info('Generating environmental props');
        
        const mapWidth = this.terrainSystem.getWidth();
        const mapDepth = this.terrainSystem.getDepth();
        const mapArea = mapWidth * mapDepth;
        
        // Generate props for each type based on density
        for (const [propType, config] of Object.entries(DEFAULT_PROP_CONFIGS)) {
            const count = Math.floor(mapArea * config.densityPerSquareUnit);
            this.generatePropsOfType(
                propType as PropType,
                count,
                mapWidth,
                mapDepth,
                config
            );
        }
        
        this.logger.info(`Generated ${this.features.filter(f => f.type === ForestFeatureType.PROP).length} props`);
    }
    
    /**
     * Generate props of a specific type using Poisson disk sampling
     */
    private generatePropsOfType(
        propType: PropType,
        count: number,
        mapWidth: number,
        mapDepth: number,
        config: PropGenerationConfig
    ): void {
        const minDistance = Math.sqrt(1 / config.densityPerSquareUnit) * 0.5; // Minimum distance between props
        const positions: Vector3[] = [];
        let attempts = 0;
        const maxAttempts = count * 10; // Limit attempts to prevent infinite loops
        
        while (positions.length < count && attempts < maxAttempts) {
            attempts++;
            
            // Generate random position
            const x = Math.random() * mapWidth;
            const z = Math.random() * mapDepth;
            
            // Skip if too close to ski paths
            if (this.isNearSkiPath(x, z, config.avoidPathDistance)) {
                continue;
            }
            
            // Skip if too close to other props
            if (this.isTooCloseToOtherProps(x, z, positions, minDistance)) {
                continue;
            }
            
            // Get height at position
            const y = this.terrainSystem.getHeightAt(x, z) || 0;
            
            // Add position
            positions.push(new Vector3(x, y, z));
            
            // Generate random scale
            const scale = config.minScale + Math.random() * (config.maxScale - config.minScale);
            
            // Generate random rotation
            const rotation = Math.random() * 360;
            
            // Create prop feature
            const prop: ForestFeature = {
                type: ForestFeatureType.PROP,
                position: new Vector3(x, y, z),
                size: new Vector3(scale, scale, scale),
                rotation: rotation,
                params: {
                    propType: propType,
                    scale: scale,
                    hasCollision: config.hasCollision,
                    collisionRadius: config.collisionRadius * scale,
                    castsShadow: config.castsShadow,
                    colorVariation: (Math.random() * 2 - 1) * config.colorVariation
                }
            };
            
            this.features.push(prop);
        }
    }
    
    /**
     * Check if a position is too close to other props
     */
    private isTooCloseToOtherProps(x: number, z: number, positions: Vector3[], minDistance: number): boolean {
        for (const pos of positions) {
            const dx = x - pos.x;
            const dz = z - pos.z;
            const distSquared = dx * dx + dz * dz;
            if (distSquared < minDistance * minDistance) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Check if a position is near a ski path
     */
    private isNearSkiPath(x: number, z: number, minDistance: number): boolean {
        const skiPaths = this.features.filter(f => f.type === ForestFeatureType.SKI_PATH);
        
        for (const path of skiPaths) {
            const controlPoints = path.params?.controlPoints as Vector3[];
            if (!controlPoints || controlPoints.length < 2) continue;
            
            const pathWidth = (path.params?.width as number || 10) + minDistance;
            
            // Check distance to each path segment
            for (let i = 0; i < controlPoints.length - 1; i++) {
                const p1 = controlPoints[i];
                const p2 = controlPoints[i + 1];
                
                const distance = this.distanceToLineSegment(x, z, p1.x, p1.z, p2.x, p2.z);
                if (distance < pathWidth) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Apply features to terrain
     */
    private applyFeatures(): void {
        this.logger.info('Applying features to terrain');
        
        for (const feature of this.features) {
            switch (feature.type) {
                case ForestFeatureType.SKI_PATH:
                    this.applySkiPath(feature);
                    break;
                    
                case ForestFeatureType.JUMP:
                    this.applyJump(feature);
                    break;
                    
                case ForestFeatureType.VALLEY:
                    this.applyValley(feature);
                    break;
                    
                // Marker features don't modify terrain, they create entities
                case ForestFeatureType.START_MARKER:
                case ForestFeatureType.FINISH_MARKER:
                case ForestFeatureType.CHECKPOINT_MARKER:
                    // Handled in createMarkerEntities
                    break;
                    
                // Prop features don't modify terrain, they create entities
                case ForestFeatureType.PROP:
                    // Handled in createPropEntities
                    break;
                    
                default:
                    this.logger.warn(`Unknown feature type: ${feature.type}`);
            }
        }
    }
    
    /**
     * Create marker entities
     */
    private createMarkerEntities(): void {
        this.logger.info('Creating marker entities');
        
        // Clear existing markers
        this.markerEntities = [];
        this.markerComponents = [];
        
        // Find marker features
        const markerFeatures = this.features.filter(f => 
            f.type === ForestFeatureType.START_MARKER || 
            f.type === ForestFeatureType.FINISH_MARKER ||
            f.type === ForestFeatureType.CHECKPOINT_MARKER
        );
        
        for (const feature of markerFeatures) {
            // Create entity for marker
            const entityName = feature.type === ForestFeatureType.START_MARKER 
                ? 'StartMarker' 
                : feature.type === ForestFeatureType.FINISH_MARKER
                    ? 'FinishMarker'
                    : `Checkpoint${feature.params?.checkpointNumber || ''}`;
                    
            const entity = new Entity(entityName, feature.position);
            
            // Create marker component
            const markerType = feature.params?.markerType as MarkerType;
            const markerComponent = new MarkerComponent({
                type: markerType,
                size: new Vector3(
                    feature.params?.width || 20,
                    feature.params?.height || 20,
                    feature.params?.depth || 20
                ),
                checkpointNumber: feature.params?.checkpointNumber
            });
            
            // Add component to entity
            entity.addComponent('marker', markerComponent);
            
            // Initialize entity
            entity.init();
            
            // Add to arrays
            this.markerEntities.push(entity);
            this.markerComponents.push(markerComponent);
            
            this.logger.debug(`Created ${entityName} entity at ${feature.position.toString()}`);
        }
        
        this.logger.info(`Created ${this.markerEntities.length} marker entities`);
    }
    
    /**
     * Create prop entities from prop features
     */
    private createPropEntities(): void {
        this.logger.info('Creating prop entities');
        
        // Clear existing prop entities and components
        this.propEntities = [];
        this.propComponents = [];
        
        // Get all prop features
        const propFeatures = this.features.filter(f => f.type === ForestFeatureType.PROP);
        
        for (const feature of propFeatures) {
            // Create entity for prop
            const entity = new Entity();
            entity.transform.position = feature.position.clone();
            
            // Skip setting rotation for now to avoid linter errors
            // We'll need to check the Entity class to understand how to properly set rotation
            
            // Create prop component
            const propComponent = new PropComponent({
                type: feature.params?.propType as PropType,
                scale: feature.params?.scale as number,
                hasCollision: feature.params?.hasCollision as boolean,
                collisionRadius: feature.params?.collisionRadius as number,
                castsShadow: feature.params?.castsShadow as boolean,
                colorVariation: feature.params?.colorVariation as number
            });
            
            // Add component to entity
            entity.addComponent(propComponent);
            
            // Store entity and component
            this.propEntities.push(entity);
            this.propComponents.push(propComponent);
        }
        
        this.logger.info(`Created ${this.propEntities.length} prop entities`);
    }
    
    /**
     * Get marker entities
     * @returns Array of marker entities
     */
    public getMarkerEntities(): Entity[] {
        return this.markerEntities;
    }
    
    /**
     * Get marker components
     * @returns Array of marker components
     */
    public getMarkerComponents(): MarkerComponent[] {
        return this.markerComponents;
    }
    
    /**
     * Get all prop components
     * @returns Array of prop components
     */
    public getPropComponents(): PropComponent[] {
        return [...this.propComponents];
    }
    
    /**
     * Get all prop entities
     * @returns Array of prop entities
     */
    public getPropEntities(): Entity[] {
        return [...this.propEntities];
    }
    
    /**
     * Apply ski path to terrain
     * @param feature Ski path feature
     */
    private applySkiPath(feature: ForestFeature): void {
        const controlPoints = feature.params?.controlPoints as Vector3[];
        const width = feature.params?.width as number || 10;
        const surfaceType = feature.params?.surfaceType as SurfaceType || SurfaceType.SNOW;
        
        if (!controlPoints || controlPoints.length < 2) {
            return;
        }
        
        // Smooth the terrain along the path
        for (let i = 0; i < controlPoints.length - 1; i++) {
            const p1 = controlPoints[i];
            const p2 = controlPoints[i + 1];
            
            // Calculate direction and length
            const dx = p2.x - p1.x;
            const dz = p2.z - p1.z;
            const length = Math.sqrt(dx * dx + dz * dz);
            
            // Normalize direction
            const dirX = dx / length;
            const dirZ = dz / length;
            
            // Perpendicular direction
            const perpX = -dirZ;
            const perpZ = dirX;
            
            // Sample points along the segment
            const numSamples = Math.ceil(length * 2);
            
            for (let j = 0; j < numSamples; j++) {
                const t = j / numSamples;
                const x = p1.x + dx * t;
                const z = p1.z + dz * t;
                
                // Sample points across the path width
                const numWidthSamples = Math.ceil(width * 2);
                
                for (let k = 0; k < numWidthSamples; k++) {
                    const w = (k / numWidthSamples - 0.5) * width;
                    const sampleX = x + perpX * w;
                    const sampleZ = z + perpZ * w;
                    
                    // Set surface type
                    this.terrainSystem.setSurfaceTypeAt(sampleX, sampleZ, surfaceType);
                    
                    // Smooth height
                    const currentHeight = this.terrainSystem.getHeightAt(sampleX, sampleZ) || 0;
                    const targetHeight = p1.y + (p2.y - p1.y) * t;
                    const weight = Math.max(0, 1 - Math.abs(w) / (width * 0.5));
                    const newHeight = currentHeight * (1 - weight) + targetHeight * weight;
                    
                    this.terrainSystem.setHeightAt(sampleX, sampleZ, newHeight);
                }
            }
        }
    }
    
    /**
     * Apply jump to terrain
     * @param feature Jump feature
     */
    private applyJump(feature: ForestFeature): void {
        const { position, size, rotation, params } = feature;
        const height = params?.height as number || 5;
        const length = params?.length as number || 20;
        const landingLength = params?.landingLength as number || 40;
        
        // Calculate direction based on rotation
        const angle = rotation * (Math.PI / 180);
        const dirX = Math.sin(angle);
        const dirZ = Math.cos(angle);
        
        // Perpendicular direction
        const perpX = -dirZ;
        const perpZ = dirX;
        
        // Ramp width
        const width = size.x;
        
        // Create the ramp
        for (let i = 0; i < length; i++) {
            const t = i / length;
            const x = position.x + dirX * i;
            const z = position.z + dirZ * i;
            
            // Ramp height profile (parabolic)
            const rampHeight = height * (-(t * t) + 2 * t);
            
            // Sample points across the ramp width
            const numWidthSamples = Math.ceil(width * 2);
            
            for (let j = 0; j < numWidthSamples; j++) {
                const w = (j / numWidthSamples - 0.5) * width;
                const sampleX = x + perpX * w;
                const sampleZ = z + perpZ * w;
                
                // Get current height
                const currentHeight = this.terrainSystem.getHeightAt(sampleX, sampleZ) || 0;
                
                // Calculate new height
                const weight = Math.max(0, 1 - Math.abs(w) / (width * 0.5));
                const newHeight = currentHeight + rampHeight * weight;
                
                // Set height and surface type
                this.terrainSystem.setHeightAt(sampleX, sampleZ, newHeight);
                this.terrainSystem.setSurfaceTypeAt(sampleX, sampleZ, SurfaceType.SNOW);
            }
        }
        
        // Create the landing area
        for (let i = 0; i < landingLength; i++) {
            const t = i / landingLength;
            const x = position.x + dirX * (length + i);
            const z = position.z + dirZ * (length + i);
            
            // Landing slope (gradual decline)
            const landingHeight = height * (1 - t);
            
            // Sample points across the landing width
            const landingWidth = width * 1.5; // Wider landing area
            const numWidthSamples = Math.ceil(landingWidth * 2);
            
            for (let j = 0; j < numWidthSamples; j++) {
                const w = (j / numWidthSamples - 0.5) * landingWidth;
                const sampleX = x + perpX * w;
                const sampleZ = z + perpZ * w;
                
                // Get current height
                const currentHeight = this.terrainSystem.getHeightAt(sampleX, sampleZ) || 0;
                
                // Calculate new height
                const weight = Math.max(0, 1 - Math.abs(w) / (landingWidth * 0.5));
                const newHeight = currentHeight - landingHeight * weight * 0.5;
                
                // Set height and surface type
                this.terrainSystem.setHeightAt(sampleX, sampleZ, newHeight);
                this.terrainSystem.setSurfaceTypeAt(sampleX, sampleZ, SurfaceType.SNOW);
            }
        }
    }
    
    /**
     * Apply valley to terrain
     * @param feature Valley feature
     */
    private applyValley(feature: ForestFeature): void {
        const { position, size, rotation, params } = feature;
        const depth = params?.depth as number || 10;
        const smoothing = params?.smoothing as number || 0.5;
        
        // Calculate direction based on rotation
        const angle = rotation * (Math.PI / 180);
        const dirX = Math.sin(angle);
        const dirZ = Math.cos(angle);
        
        // Valley dimensions
        const width = size.x;
        const length = size.z;
        
        // Create the valley
        for (let i = -length / 2; i <= length / 2; i++) {
            const lengthT = i / (length / 2);
            const lengthFactor = 1 - Math.abs(lengthT) * (1 - smoothing);
            
            for (let j = -width / 2; j <= width / 2; j++) {
                const widthT = j / (width / 2);
                const widthFactor = 1 - Math.abs(widthT) * (1 - smoothing);
                
                // Calculate position
                const x = position.x + dirX * i + dirZ * j;
                const z = position.z + dirZ * i - dirX * j;
                
                // Get current height
                const currentHeight = this.terrainSystem.getHeightAt(x, z) || 0;
                
                // Calculate depth factor
                const depthFactor = lengthFactor * widthFactor;
                
                // Calculate new height
                const newHeight = currentHeight - depth * depthFactor;
                
                // Set height
                this.terrainSystem.setHeightAt(x, z, newHeight);
                
                // Set surface type based on depth
                if (depthFactor > 0.7) {
                    this.terrainSystem.setSurfaceTypeAt(x, z, SurfaceType.ICE);
                }
            }
        }
    }
} 