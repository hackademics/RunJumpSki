import {
    Scene,
    Mesh,
    MeshBuilder,
    Vector3,
    AbstractMesh,
    CapsuleBuilder,
    TransformNode,
    StandardMaterial,
    Color3
} from '@babylonjs/core';
import { IEventEmitter, GameEvent } from '../types/events';
import { Logger } from '../utils/logger';
import { MovementComponent } from '../components/movement';
import { CameraComponent } from '../components/camera';
import { TerrainGenerator } from '../terrain/generator';
import { TerrainData } from '../types/components';

/**
 * Player entity options
 */
export interface PlayerOptions {
    /**
     * Starting position
     */
    position?: Vector3;

    /**
     * Player height
     */
    height?: number;

    /**
     * Player radius
     */
    radius?: number;

    /**
     * Maximum energy level
     */
    maxEnergy?: number;

    /**
     * Maximum speed
     */
    maxSpeed?: number;

    /**
     * Run speed
     */
    runSpeed?: number;

    /**
     * Jump force
     */
    jumpForce?: number;

    /**
     * Jetpack force
     */
    jetpackForce?: number;
}

/**
 * Default player options
 */
const DefaultPlayerOptions: PlayerOptions = {
    position: new Vector3(0, 0, 0),
    height: 1.8,
    radius: 0.4,
    maxEnergy: 100,
    maxSpeed: 50,
    runSpeed: 7,
    jumpForce: 7,
    jetpackForce: 15
};

/**
 * Player entity class
 */
export class Player {
    private logger: Logger;
    private scene: Scene;
    private events: IEventEmitter;
    private options: PlayerOptions;
    private id: string;

    // Components
    private movement: MovementComponent;
    private camera: CameraComponent;

    // Meshes
    private rootNode: TransformNode;
    private mesh: Mesh;
    private firstPersonNode: TransformNode;

    // References
    private terrain?: TerrainGenerator;

    /**
     * Create a new player
     * @param id Player identifier
     * @param scene Babylon.js scene
     * @param events Event emitter
     * @param options Player options
     */
    constructor(id: string, scene: Scene, events: IEventEmitter, options: Partial<PlayerOptions> = {}) {
        this.logger = new Logger(`Player:${id}`);
        this.scene = scene;
        this.events = events;
        this.id = id;
        this.options = { ...DefaultPlayerOptions, ...options };

        try {
            this.logger.info('Creating player...');

            // Create root node
            this.rootNode = new TransformNode(`player_${id}_root`, this.scene);
            this.rootNode.position = this.options.position!.clone();

            // Create mesh
            this.mesh = this.createPlayerMesh();
            this.mesh.parent = this.rootNode;

            // Create first-person camera node
            this.firstPersonNode = new TransformNode(`player_${id}_fp`, this.scene);
            this.firstPersonNode.parent = this.rootNode;
            this.firstPersonNode.position = new Vector3(0, this.options.height! * 0.8, 0);

            // Create components
            this.movement = new MovementComponent(
                this,
                this.scene,
                this.events,
                {
                    mass: 80,
                    initialState: 'running',
                    maxEnergy: this.options.maxEnergy,
                    runSpeed: this.options.runSpeed,
                    jumpForce: this.options.jumpForce,
                    jetpackForce: this.options.jetpackForce,
                    maxSpeed: this.options.maxSpeed
                }
            );

            // Initialize physics
            this.movement.initPhysics(this.mesh);

            // Create camera component (will be initialized later)
            this.camera = new CameraComponent(this, this.scene, this.events);

            // Set up event subscriptions
            this.setupEventListeners();

            this.logger.info('Player created successfully');
        } catch (error) {
            this.logger.error('Failed to create player', error);
            throw error;
        }
    }

    /**
     * Create the player mesh
     */
    private createPlayerMesh(): Mesh {
        // Create a capsule for the player
        const capsule = CapsuleBuilder.CreateCapsule(
            `player_${this.id}_body`,
            {
                height: this.options.height!,
                radius: this.options.radius!,
                subdivisions: 16
            },
            this.scene
        );

        // Create material
        const material = new StandardMaterial(`player_${this.id}_material`, this.scene);
        material.diffuseColor = new Color3(0.2, 0.6, 1.0);
        material.specularColor = new Color3(0.2, 0.2, 0.2);
        capsule.material = material;

        // Position capsule so its bottom is at y=0
        capsule.position.y = this.options.height! / 2;

        return capsule;
    }

    /**
     * Set up event listeners
     */
    private setupEventListeners(): void {
        // Listen for input events
        this.events.on(GameEvent.KEY_DOWN, (data) => {
            this.handleKeyDown(data);
        });

        this.events.on(GameEvent.KEY_UP, (data) => {
            this.handleKeyUp(data);
        });

        this.events.on(GameEvent.MOUSE_MOVE, (data) => {
            this.handleMouseMove(data);
        });

        // Listen for player state changes
        this.events.on(GameEvent.PLAYER_STATE_CHANGE, (data) => {
            if (data.entity === this) {
                this.handleStateChange(data);
            }
        });
    }

    /**
     * Handle key down events
     * @param data Event data
     */
    private handleKeyDown(data: any): void {
        const { key } = data;

        // Handle movement input directly
        switch (key.toLowerCase()) {
            case 'w':
            case 'arrowup':
                this.movement.setInputMove(new Vector3(0, 0, 1));
                break;
            case 's':
            case 'arrowdown':
                this.movement.setInputMove(new Vector3(0, 0, -1));
                break;
            case 'a':
            case 'arrowleft':
                this.movement.setInputMove(new Vector3(-1, 0, 0));
                break;
            case 'd':
            case 'arrowright':
                this.movement.setInputMove(new Vector3(1, 0, 0));
                break;
            case ' ':
            case 'space':
                this.movement.setJump(true);
                break;
            case 'shift':
                this.movement.setSki(true);
                break;
            case 'control':
                this.movement.setJetpack(true);
                break;
        }
    }

    /**
     * Handle key up events
     * @param data Event data
     */
    private handleKeyUp(data: any): void {
        const { key } = data;

        // Handle movement input directly
        switch (key.toLowerCase()) {
            case 'w':
            case 'arrowup':
            case 's':
            case 'arrowdown':
            case 'a':
            case 'arrowleft':
            case 'd':
            case 'arrowright':
                // Reset movement input
                this.movement.setInputMove(new Vector3(0, 0, 0));
                break;
            case ' ':
            case 'space':
                this.movement.setJump(false);
                break;
            case 'shift':
                this.movement.setSki(false);
                break;
            case 'control':
                this.movement.setJetpack(false);
                break;
        }
    }

    /**
     * Handle mouse movement
     * @param data Event data
     */
    private handleMouseMove(data: any): void {
        // Will be handled by camera component
    }

    /**
     * Handle player state changes
     * @param data Event data
     */
    private handleStateChange(data: any): void {
        const { oldState, newState } = data;
        this.logger.debug(`State changed: ${oldState} -> ${newState}`);

        // Update visuals or effects based on state
        // TODO: Add visual effects for different states
    }

    /**
     * Update player state
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        // Get terrain data at player position
        const terrainData = this.getTerrainDataAtCurrentPosition();

        // Update movement with terrain data
        this.movement.update(deltaTime, terrainData);

        // Update camera
        this.camera.update(deltaTime);

        // Update position from movement component
        const position = this.movement.getVelocity();
        this.rootNode.position = position;
    }

    /**
     * Get terrain data at current player position
     */
    private getTerrainDataAtCurrentPosition(): TerrainData | undefined {
        if (!this.terrain) {
            return undefined;
        }

        const position = this.rootNode.position;
        return this.terrain.getTerrainDataAt(position.x, position.z);
    }

    /**
     * Set terrain reference
     * @param terrain Terrain generator
     */
    public setTerrain(terrain: TerrainGenerator): void {
        this.terrain = terrain;
    }

    /**
     * Initialize player camera
     */
    public initCamera(): void {
        this.camera.init(this.firstPersonNode);
    }

    /**
     * Get player ID
     */
    public getId(): string {
        return this.id;
    }

    /**
     * Get player position
     */
    public getPosition(): Vector3 {
        return this.rootNode.position.clone();
    }

    /**
     * Get player mesh
     */
    public getMesh(): Mesh {
        return this.mesh;
    }

    /**
     * Get player root node
     */
    public getRootNode(): TransformNode {
        return this.rootNode;
    }

    /**
     * Get player first-person node
     */
    public getFirstPersonNode(): TransformNode {
        return this.firstPersonNode;
    }

    /**
     * Get player movement component
     */
    public getMovement(): MovementComponent {
        return this.movement;
    }

    /**
     * Get player camera component
     */
    public getCamera(): CameraComponent {
        return this.camera;
    }

    /**
     * Set player position
     * @param position New position
     */
    public setPosition(position: Vector3): void {
        this.rootNode.position = position.clone();
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        // Dispose components
        this.movement.dispose();
        this.camera.dispose();

        // Dispose meshes
        this.mesh.dispose();
        this.rootNode.dispose();
        this.firstPersonNode.dispose();

        // Remove event listeners
        this.events.off(GameEvent.KEY_DOWN, this.handleKeyDown);
        this.events.off(GameEvent.KEY_UP, this.handleKeyUp);
        this.events.off(GameEvent.MOUSE_MOVE, this.handleMouseMove);

        this.logger.debug('Player disposed');
    }
}