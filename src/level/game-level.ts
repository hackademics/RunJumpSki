import {
    Scene,
    Vector3,
    HemisphericLight,
    DirectionalLight,
    ShadowGenerator,
    Color3,
    MeshBuilder,
    StandardMaterial,
    Mesh,
    Color4
} from '@babylonjs/core';
import { IEventEmitter, GameEvent } from '../types/events';
import { Logger } from '../utils/logger';
import { GameEngine } from '../core/engine';
import { TerrainGenerator } from '../terrain/generator';
import { Player } from '../entities/player';

/**
 * Game level options
 */
export interface LevelOptions {
    /**
     * Level name
     */
    name: string;

    /**
     * Terrain options
     */
    terrain: {
        width: number;
        depth: number;
        maxHeight: number;
        seed?: number;
    };

    /**
     * Player spawn position
     */
    playerSpawn: Vector3;

    /**
     * Target positions
     */
    targets?: Vector3[];

    /**
     * Turret positions
     */
    turrets?: Vector3[];
}

/**
 * Game level manager
 */
export class GameLevel {
    private logger: Logger;
    private engine: GameEngine;
    private scene: Scene;
    private events: IEventEmitter;
    private options: LevelOptions;

    // Level components
    private terrain?: TerrainGenerator;
    private player?: Player;
    private targets: Mesh[] = [];
    private turrets: Mesh[] = [];

    // Lighting
    private ambientLight?: HemisphericLight;
    private sunLight?: DirectionalLight;
    private shadowGenerator?: ShadowGenerator;

    /**
     * Initialize a game level
     * @param engine Game engine
     * @param options Level options
     */
    constructor(engine: GameEngine, options: LevelOptions) {
        this.logger = new Logger(`GameLevel:${options.name}`);
        this.engine = engine;
        this.scene = engine.getScene();
        this.events = engine.getEvents();
        this.options = options;
    }

    /**
     * Load the level
     */
    public async load(): Promise<void> {
        try {
            this.logger.info(`Loading level: ${this.options.name}`);

            // Set up environment
            this.setupEnvironment();

            // Generate terrain
            this.generateTerrain();

            // Create player
            this.createPlayer();

            // Create targets
            this.createTargets();

            // Create turrets
            this.createTurrets();

            // Set up event handlers
            this.setupEventHandlers();

            // Emit level loaded event
            this.events.emit(GameEvent.LEVEL_LOAD, { level: this.options.name });

            this.logger.info(`Level ${this.options.name} loaded successfully`);
        } catch (error) {
            this.logger.error(`Failed to load level: ${this.options.name}`, error);
            throw error;
        }
    }

    /**
     * Set up environment (lights, skybox, etc.)
     */
    private setupEnvironment(): void {
        // Create ambient light
        this.ambientLight = new HemisphericLight(
            'ambientLight',
            new Vector3(0, 1, 0),
            this.scene
        );
        this.ambientLight.intensity = 0.3;
        this.ambientLight.diffuse = new Color3(0.7, 0.8, 1.0);
        this.ambientLight.groundColor = new Color3(0.4, 0.4, 0.5);

        // Create directional light (sun)
        this.sunLight = new DirectionalLight(
            'sunLight',
            new Vector3(-0.5, -0.5, -0.5),
            this.scene
        );
        this.sunLight.intensity = 0.7;
        this.sunLight.diffuse = new Color3(1.0, 0.9, 0.8);

        // Set up shadows
        this.shadowGenerator = new ShadowGenerator(1024, this.sunLight);
        this.shadowGenerator.useBlurExponentialShadowMap = true;
        this.shadowGenerator.blurScale = 2;
        this.shadowGenerator.depthScale = 50;

        // Create skybox (simple color for now)
        this.scene.clearColor = new Color4(0.6, 0.8, 1.0, 1.0);

        this.logger.debug('Environment set up');
    }

    /**
     * Generate terrain
     */
    private generateTerrain(): void {
        // Create terrain generator
        this.terrain = new TerrainGenerator(this.scene, {
            width: this.options.terrain.width,
            depth: this.options.terrain.depth,
            maxHeight: this.options.terrain.maxHeight,
            resolution: 0.2,
            randomHeights: true,
            seed: this.options.terrain.seed,
            physics: true,
            visualizeSurfaces: true
        });

        // Generate procedural terrain
        const terrainMesh = this.terrain.generateProcedural(6, 0.5);

        // Add shadows
        if (this.shadowGenerator) {
            this.shadowGenerator.addShadowCaster(terrainMesh);
            terrainMesh.receiveShadows = true;
        }

        this.logger.debug('Terrain generated');
    }

    /**
     * Create player
     */
    private createPlayer(): void {
        // Create player
        this.player = new Player('player1', this.scene, this.events, {
            position: this.options.playerSpawn,
            height: 1.8,
            radius: 0.4,
            maxEnergy: 100,
            maxSpeed: 50,
            runSpeed: 7,
            jumpForce: 7,
            jetpackForce: 15
        });

        // Set terrain reference for player
        if (this.terrain) {
            this.player.setTerrain(this.terrain);
        }

        // Initialize player camera
        this.player.initCamera();

        // Add shadows
        if (this.shadowGenerator) {
            this.shadowGenerator.addShadowCaster(this.player.getMesh());
        }

        this.logger.debug('Player created');
    }

    /**
     * Create targets
     */
    private createTargets(): void {
        if (!this.options.targets || this.options.targets.length === 0) {
            return;
        }

        // Create target meshes
        for (let i = 0; i < this.options.targets.length; i++) {
            const position = this.options.targets[i];

            // Create target mesh
            const target = MeshBuilder.CreateSphere(
                `target_${i}`,
                { diameter: 2 },
                this.scene
            );

            // Position target
            target.position = position;

            // Adjust height based on terrain
            if (this.terrain) {
                const height = this.terrain.getHeightAt(position.x, position.z);
                target.position.y = height + 1;
            }

            // Create material
            const material = new StandardMaterial(`target_${i}_material`, this.scene);
            material.diffuseColor = new Color3(1.0, 0.2, 0.2);
            material.emissiveColor = new Color3(0.5, 0.1, 0.1);
            target.material = material;

            // Add shadows
            if (this.shadowGenerator) {
                this.shadowGenerator.addShadowCaster(target);
            }

            this.targets.push(target);
        }

        this.logger.debug(`Created ${this.targets.length} targets`);
    }

    /**
     * Create turrets
     */
    private createTurrets(): void {
        if (!this.options.turrets || this.options.turrets.length === 0) {
            return;
        }

        // Create turret meshes
        for (let i = 0; i < this.options.turrets.length; i++) {
            const position = this.options.turrets[i];

            // Create turret base
            const base = MeshBuilder.CreateCylinder(
                `turret_${i}_base`,
                { height: 1, diameter: 2 },
                this.scene
            );

            // Create turret body
            const body = MeshBuilder.CreateBox(
                `turret_${i}_body`,
                { width: 1, height: 1, depth: 1 },
                this.scene
            );

            // Create turret barrel
            const barrel = MeshBuilder.CreateCylinder(
                `turret_${i}_barrel`,
                { height: 2, diameter: 0.3 },
                this.scene
            );

            // Position turret parts
            base.position = position;

            // Adjust height based on terrain
            if (this.terrain) {
                const height = this.terrain.getHeightAt(position.x, position.z);
                base.position.y = height;
            }

            body.parent = base;
            body.position.y = 1;

            barrel.parent = body;
            barrel.position.z = 1;
            barrel.rotation.x = Math.PI / 2;

            // Create materials
            const baseMaterial = new StandardMaterial(`turret_${i}_base_material`, this.scene);
            baseMaterial.diffuseColor = new Color3(0.3, 0.3, 0.3);
            base.material = baseMaterial;

            const bodyMaterial = new StandardMaterial(`turret_${i}_body_material`, this.scene);
            bodyMaterial.diffuseColor = new Color3(0.2, 0.2, 0.7);
            body.material = bodyMaterial;

            const barrelMaterial = new StandardMaterial(`turret_${i}_barrel_material`, this.scene);
            barrelMaterial.diffuseColor = new Color3(0.1, 0.1, 0.1);
            barrel.material = barrelMaterial;

            // Add shadows
            if (this.shadowGenerator) {
                this.shadowGenerator.addShadowCaster(base);
                this.shadowGenerator.addShadowCaster(body);
                this.shadowGenerator.addShadowCaster(barrel);
            }

            this.turrets.push(base);
        }

        this.logger.debug(`Created ${this.turrets.length} turrets`);
    }

    /**
     * Set up event handlers
     */
    private setupEventHandlers(): void {
        // Listen for checkpoint events
        this.events.on(GameEvent.CHECKPOINT_REACHED, (data) => {
            this.handleCheckpointReached(data);
        });

        // Listen for level completion
        this.events.on(GameEvent.LEVEL_COMPLETE, (data) => {
            this.handleLevelComplete(data);
        });
    }

    /**
     * Handle checkpoint reached event
     * @param data Event data
     */
    private handleCheckpointReached(data: any): void {
        const { checkpoint } = data;
        this.logger.debug(`Checkpoint reached: ${checkpoint}`);

        // TODO: Implement checkpoint logic
    }

    /**
     * Handle level complete event
     * @param data Event data
     */
    private handleLevelComplete(data: any): void {
        this.logger.debug('Level complete');

        // TODO: Implement level completion logic
    }

    /**
     * Update level state
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        // Update player
        if (this.player) {
            this.player.update(deltaTime);
        }

        // TODO: Update other entities
    }

    /**
     * Get player entity
     */
    public getPlayer(): Player | undefined {
        return this.player;
    }

    /**
     * Get terrain generator
     */
    public getTerrain(): TerrainGenerator | undefined {
        return this.terrain;
    }

    /**
     * Get level name
     */
    public getName(): string {
        return this.options.name;
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        // Dispose player
        if (this.player) {
            this.player.dispose();
            this.player = undefined;
        }

        // Dispose terrain
        if (this.terrain) {
            this.terrain.dispose();
            this.terrain = undefined;
        }

        // Dispose targets
        for (const target of this.targets) {
            target.dispose();
        }
        this.targets = [];

        // Dispose turrets
        for (const turret of this.turrets) {
            turret.dispose();
        }
        this.turrets = [];

        // Dispose lights
        if (this.ambientLight) {
            this.ambientLight.dispose();
            this.ambientLight = undefined;
        }

        if (this.sunLight) {
            this.sunLight.dispose();
            this.sunLight = undefined;
        }

        if (this.shadowGenerator) {
            this.shadowGenerator.dispose();
            this.shadowGenerator = undefined;
        }

        this.logger.debug('Level disposed');
    }
}