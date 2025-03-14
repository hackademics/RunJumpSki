/**
 * GameScene.ts
 * Main game scene implementation
 */

import { Player } from '../entities/Player';
import { Vector3 } from '../types/common/Vector3';
import { FirstPersonRenderer } from '../core/FirstPersonRenderer';
import { InputSystem } from '../input/InputSystem';
import { Logger } from '../utils/Logger';
import { GameConstants } from '../config/Constants';
import { EventSystem } from '../core/EventSystem';
import { 
    GameEventType, 
    MarkerStartEvent, 
    MarkerFinishEvent, 
    MarkerCheckpointEvent 
} from '../types/events/EventTypes';
import { TerrainSystem } from '../core/terrain/TerrainSystem';
import { ForestMapGenerator } from '../core/terrain/ForestMapGenerator';
import { MapBoundaryComponent } from '../components/terrain/MapBoundaryComponent';
import { Entity } from '../entities/Entity';
import { RaceTimingSystem } from '../core/RaceTimingSystem';
import { RaceTimingDisplay } from '../ui/RaceTimingDisplay';
import { MarkerType } from '../components/markers/MarkerComponent';
import { IScene } from './IScene';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';

/**
 * Game scene options
 */
export interface GameSceneOptions {
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
}

/**
 * Main game scene
 */
export class GameScene implements IScene {
    private logger: Logger;
    private eventSystem: EventSystem;
    private inputSystem: InputSystem;
    private renderer: FirstPersonRenderer;
    private player: Player;
    private terrainSystem: TerrainSystem;
    private forestMapGenerator: ForestMapGenerator;
    private mapBoundary?: MapBoundaryComponent;
    private markerEntities: Entity[] = [];
    private isRunning: boolean = false;
    private lastFrameTime: number = 0;
    private fixedTimeStep: number = 1 / 60; // 60 updates per second
    private accumulatedTime: number = 0;
    private animationFrameId: number = 0;
    private isInitialized: boolean = false;
    private canvas: HTMLCanvasElement;
    private width: number;
    private height: number;
    
    // Game state
    private gameStartTime: number = 0;
    private raceStartTime: number = 0;
    private raceFinishTime: number = 0;
    private isRaceActive: boolean = false;
    private checkpointsPassed: number = 0;
    private totalCheckpoints: number = 0;
    
    private raceTimingSystem: RaceTimingSystem;
    private raceTimingDisplay?: RaceTimingDisplay;
    
    private performanceMonitor: PerformanceMonitor;
    
    /**
     * Create a new game scene
     * @param options Game scene options
     */
    constructor(options: GameSceneOptions) {
        this.logger = new Logger('GameScene');
        this.canvas = options.canvas;
        this.width = options.width || GameConstants.DEFAULT_WIDTH;
        this.height = options.height || GameConstants.DEFAULT_HEIGHT;
        
        // Initialize systems
        this.eventSystem = EventSystem.getInstance();
        this.inputSystem = InputSystem.getInstance();
        this.terrainSystem = new TerrainSystem();
        this.forestMapGenerator = new ForestMapGenerator(this.terrainSystem);
        this.raceTimingSystem = RaceTimingSystem.getInstance();
        
        // Initialize performance monitor
        this.performanceMonitor = PerformanceMonitor.getInstance({
            trackFrameTime: true,
            trackMemory: true,
            logWarnings: true
        });
        
        // Create player
        this.player = new Player(new Vector3(0, 2, 0));
        
        // Create renderer
        this.renderer = new FirstPersonRenderer({
            canvas: this.canvas,
            width: this.width,
            height: this.height,
            showTerrainVisualization: false,
            showMapBoundaries: true,
            showMarkers: true
        });
        
        this.logger.debug('Game scene created');
    }
    
    /**
     * Initialize the game scene
     */
    public init(): void {
        if (this.isInitialized) {
            this.logger.warn('Game scene already initialized');
            return;
        }
        
        this.logger.info('Initializing game scene');
        
        try {
            // Initialize input system
            this.inputSystem.init();
            
            // Generate forest map
            this.forestMapGenerator.generateMap();
            
            // Create map boundary
            const mapBoundaryEntity = new Entity('MapBoundary');
            const mapBoundaryComponent = new MapBoundaryComponent({
                // Use proper methods to get dimensions
                width: this.terrainSystem.getDimensions().width,
                depth: this.terrainSystem.getDimensions().depth,
                height: 100, // Use a reasonable default height
                warningDistance: 20
            });
            mapBoundaryEntity.addComponent('boundary', mapBoundaryComponent);
            
            // Set player position to start position
            const startPosition = this.getStartPosition();
            if (startPosition) {
                this.player.transform.position = startPosition.clone();
                this.player.transform.position.y += 5; // Start slightly above ground
            }
            
            // Get marker components from map generator
            const markerComponents = this.forestMapGenerator.getMarkerComponents();
            
            // Get prop components from map generator
            const propComponents = this.forestMapGenerator.getPropComponents();
            
            // Initialize renderer with player, terrain, boundaries, markers, and props
            this.renderer.init(
                this.player,
                this.terrainSystem,
                mapBoundaryComponent,
                markerComponents,
                propComponents
            );
            
            // Initialize race timing system
            this.raceTimingSystem = RaceTimingSystem.getInstance({
                totalCheckpoints: markerComponents.filter(m => m.getMarkerType() === MarkerType.CHECKPOINT).length,
                requireAllCheckpoints: true,
                autoResetOnStart: true,
                validateCheckpointOrder: true
            });
            
            // Initialize race timing display if we have a container element
            const raceTimingContainer = document.getElementById('race-timing-container');
            if (raceTimingContainer) {
                this.raceTimingDisplay = new RaceTimingDisplay({
                    container: raceTimingContainer,
                    showCheckpoints: true,
                    showSplits: true,
                    showBestTimes: true,
                    autoHide: true,
                    entityId: this.player.id.toString()
                });
            }
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            this.logger.info('Game scene initialized successfully');
        } catch (error) {
            this.logger.error(`Error initializing game scene: ${error}`);
            throw new Error(`Failed to initialize game scene: ${error}`);
        }
    }
    
    /**
     * Generate the map
     */
    private generateMap(): void {
        this.logger.debug('Generating map');
        
        try {
            // Generate the map
            this.forestMapGenerator.generateMap();
            
            // Get marker entities
            this.markerEntities = this.forestMapGenerator.getMarkerEntities();
            this.totalCheckpoints = this.markerEntities.filter(e => e.name.startsWith('Checkpoint')).length;
            
            this.logger.debug(`Map generated with ${this.markerEntities.length} markers (${this.totalCheckpoints} checkpoints)`);
        } catch (error) {
            this.logger.error(`Error generating map: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Create map boundary
     */
    private createMapBoundary(): void {
        this.logger.debug('Creating map boundary');
        
        try {
            // Create map boundary component
            this.mapBoundary = new MapBoundaryComponent({
                boundaryBehavior: 'bounce',
                bounceFactor: 0.5,
                useVisualIndicators: true,
                width: this.terrainSystem.getDimensions().width,
                depth: this.terrainSystem.getDimensions().depth,
                height: 100,
                warningDistance: 20
            });
        } catch (error) {
            this.logger.error(`Error creating map boundary: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Position player at start marker
     */
    private positionPlayerAtStart(): void {
        try {
            // Find start marker
            const startMarker = this.markerEntities.find(e => e.name === 'StartMarker');
            
            if (startMarker) {
                // Position player at start marker
                const startPos = startMarker.transform.position.clone();
                startPos.y += 2; // Raise player above ground
                
                this.player.transform.position = startPos;
                this.logger.debug(`Positioned player at start marker: ${startPos.toString()}`);
            } else {
                this.logger.warn('No start marker found, using default player position');
            }
        } catch (error) {
            this.logger.error(`Error positioning player: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Start the game loop
     */
    public start(): void {
        if (this.isRunning) {
            this.logger.warn('Game scene is already running');
            return;
        }
        
        if (!this.isInitialized) {
            this.logger.warn('Game scene is not initialized, initializing now');
            this.init();
        }
        
        this.logger.debug('Starting game loop');
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    /**
     * Stop the game loop
     */
    public stop(): void {
        if (!this.isRunning) {
            this.logger.warn('Game scene is not running');
            return;
        }
        
        this.logger.debug('Stopping game loop');
        this.isRunning = false;
        cancelAnimationFrame(this.animationFrameId);
    }
    
    /**
     * Main game loop
     */
    private gameLoop(): void {
        if (!this.isRunning) return;
        
        // Begin frame timing
        this.performanceMonitor.beginFrame();
        
        const currentTime = performance.now();
        let deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
        this.lastFrameTime = currentTime;
        
        // Cap delta time to prevent spiral of death on slow devices
        if (deltaTime > 0.25) {
            this.logger.warn(`Large frame time detected: ${deltaTime.toFixed(2)}s`);
            deltaTime = 0.25;
        }
        
        // Accumulate time for fixed time step updates
        this.accumulatedTime += deltaTime;
        
        // Process fixed time step updates
        while (this.accumulatedTime >= this.fixedTimeStep) {
            const updateStart = this.performanceMonitor.startTimer('update');
            this.update(this.fixedTimeStep);
            this.performanceMonitor.endTimer('update', updateStart, 8); // Warning if update takes more than 8ms
            
            this.accumulatedTime -= this.fixedTimeStep;
        }
        
        // Render the scene
        const renderStart = this.performanceMonitor.startTimer('render');
        this.render(deltaTime);
        this.performanceMonitor.endTimer('render', renderStart, 8); // Warning if render takes more than 8ms
        
        // End frame timing
        this.performanceMonitor.endFrame();
        
        // Schedule next frame
        this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    /**
     * Update game state
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        try {
            // Emit update event
            this.eventSystem.emit('game:update', { deltaTime });
            
            // Update player
            this.player.update(deltaTime);
            
            // Update marker entities
            for (const entity of this.markerEntities) {
                entity.update(deltaTime);
            }
            
            // Update renderer
            this.renderer.update(deltaTime);
            
            // Check for marker collisions
            if (this.forestMapGenerator) {
                const markerComponents = this.forestMapGenerator.getMarkerComponents();
                
                for (const marker of markerComponents) {
                    if (marker.isEntityInTriggerArea(this.player)) {
                        marker.trigger(this.player);
                    }
                }
            }
        } catch (error) {
            this.logger.error(`Error in update loop: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Render the scene
     * @param deltaTime Time since last update in seconds
     */
    private render(deltaTime: number): void {
        try {
            // Render the scene
            this.renderer.render();
        } catch (error) {
            this.logger.error(`Error in render loop: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Set up event listeners
     */
    private setupEventListeners(): void {
        try {
            // Handle keyboard events for debug info toggle
            document.addEventListener('keydown', (event) => {
                if (event.key === 'F3') {
                    this.renderer.toggleDebugInfo();
                } else if (event.key === 'F4') {
                    this.renderer.toggleTerrainVisualization();
                } else if (event.key === 'F5') {
                    this.renderer.toggleMapBoundaryVisualization();
                } else if (event.key === 'F6') {
                    this.renderer.toggleMarkers();
                } else if (event.key === 'F7') {
                    this.renderer.togglePropVisualization();
                }
            });
            
            // Handle marker events
            this.eventSystem.on(GameEventType.MARKER_START_CROSSED, this.handleMarkerStartEvent.bind(this));
            this.eventSystem.on(GameEventType.MARKER_FINISH_CROSSED, this.handleMarkerFinishEvent.bind(this));
            this.eventSystem.on(GameEventType.MARKER_CHECKPOINT_CROSSED, this.handleMarkerCheckpointEvent.bind(this));
        } catch (error) {
            this.logger.error(`Error setting up event listeners: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Handle marker start event
     * @param event Start marker event
     */
    private handleMarkerStartEvent(event: MarkerStartEvent): void {
        try {
            if (event.entityId && event.entityId.toString() === this.player.id.toString()) {
                this.handleRaceStart(event.time);
            }
        } catch (error) {
            this.logger.error(`Error handling marker start event: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Handle marker finish event
     * @param event Finish marker event
     */
    private handleMarkerFinishEvent(event: MarkerFinishEvent): void {
        try {
            if (event.entityId && event.entityId.toString() === this.player.id.toString()) {
                this.handleRaceFinish(event.time);
            }
        } catch (error) {
            this.logger.error(`Error handling marker finish event: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Handle marker checkpoint event
     * @param event Checkpoint marker event
     */
    private handleMarkerCheckpointEvent(event: MarkerCheckpointEvent): void {
        try {
            if (event.entityId && event.entityId.toString() === this.player.id.toString()) {
                this.handleCheckpoint(event.checkpointNumber, event.time);
            }
        } catch (error) {
            this.logger.error(`Error handling marker checkpoint event: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Handle race start event
     * @param time Time when the race started
     */
    private handleRaceStart(time: number): void {
        try {
            if (!this.isRaceActive) {
                this.isRaceActive = true;
                this.raceStartTime = time;
                this.checkpointsPassed = 0;
                
                this.logger.info('Race started!');
                
                // Display race start message
                // In a real implementation, this would show a UI element
                console.log('Race started!');
            }
        } catch (error) {
            this.logger.error(`Error handling race start: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Handle race finish event
     * @param time Time when the race finished
     */
    private handleRaceFinish(time: number): void {
        try {
            if (this.isRaceActive) {
                this.isRaceActive = false;
                this.raceFinishTime = time;
                
                // Calculate race time
                const raceTime = (this.raceFinishTime - this.raceStartTime) / 1000; // Convert to seconds
                
                this.logger.info(`Race finished! Time: ${raceTime.toFixed(2)}s`);
                
                // Display race finish message
                // In a real implementation, this would show a UI element
                console.log(`Race finished! Time: ${raceTime.toFixed(2)}s`);
                
                // Check if all checkpoints were passed
                if (this.checkpointsPassed < this.totalCheckpoints) {
                    console.log(`Warning: Only ${this.checkpointsPassed} of ${this.totalCheckpoints} checkpoints passed!`);
                }
            }
        } catch (error) {
            this.logger.error(`Error handling race finish: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Handle checkpoint event
     * @param checkpointNumber Checkpoint number
     * @param time Time when the checkpoint was passed
     */
    private handleCheckpoint(checkpointNumber: number, time: number): void {
        try {
            if (this.isRaceActive) {
                this.checkpointsPassed++;
                
                // Calculate checkpoint time
                const checkpointTime = (time - this.raceStartTime) / 1000; // Convert to seconds
                
                this.logger.info(`Checkpoint ${checkpointNumber} passed! Time: ${checkpointTime.toFixed(2)}s`);
                
                // Display checkpoint message
                // In a real implementation, this would show a UI element
                console.log(`Checkpoint ${checkpointNumber} passed! Time: ${checkpointTime.toFixed(2)}s`);
            }
        } catch (error) {
            this.logger.error(`Error handling checkpoint: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Clean up resources
     */
    public dispose(): void {
        this.logger.debug('Disposing game scene');
        
        try {
            // Stop the game loop
            this.stop();
            
            // Dispose marker entities
            for (const entity of this.markerEntities) {
                entity.dispose();
            }
            
            // Dispose player
            this.player.dispose();
            
            // Dispose renderer
            this.renderer.dispose();
            
            // Dispose race timing display
            if (this.raceTimingDisplay) {
                this.raceTimingDisplay.dispose();
                this.raceTimingDisplay = undefined;
            }
            
            // Remove event listeners
            this.eventSystem.off(GameEventType.MARKER_START_CROSSED, this.handleMarkerStartEvent);
            this.eventSystem.off(GameEventType.MARKER_FINISH_CROSSED, this.handleMarkerFinishEvent);
            this.eventSystem.off(GameEventType.MARKER_CHECKPOINT_CROSSED, this.handleMarkerCheckpointEvent);
            
            this.logger.debug('Game scene disposed');
        } catch (error) {
            this.logger.error(`Error disposing game scene: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Get the start position from the markers
     * @returns Start position or undefined if not found
     */
    private getStartPosition(): Vector3 | undefined {
        try {
            if (!this.forestMapGenerator) return undefined;
            
            const markerComponents = this.forestMapGenerator.getMarkerComponents();
            const startMarker = markerComponents.find(m => m.getMarkerType() === MarkerType.START);
            
            if (startMarker && startMarker.entity) {
                return startMarker.entity.transform.position.clone();
            }
        } catch (error) {
            this.logger.error(`Error getting start position: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        return undefined;
    }
}
