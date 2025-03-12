 
import { Scene, Engine as BabylonEngine, Vector3 } from '@babylonjs/core';
import { IEventEmitter } from '../types/events';
import { Logger } from '../utils/logger';
import { Physics } from './physics';
import { Renderer } from './renderer';
import { InputManager } from './input';
import { AssetManager } from './assets';
import { AudioManager } from './audio';
import { EventEmitter } from './events';

/**
 * Main game engine class responsible for coordinating all game systems
 */
export class GameEngine {
    private logger: Logger;
    private physics: Physics;
    private renderer: Renderer;
    private input: InputManager;
    private assets: AssetManager;
    private audio: AudioManager;
    private events: IEventEmitter;
    private scene: Scene;
    private engine: BabylonEngine;
    private isRunning: boolean = false;
    private lastFrameTime: number = 0;
    private fixedTimeStep: number = 1 / 60; // 60 updates per second
    private accumulatedTime: number = 0;

    /**
     * Initialize the game engine
     * @param canvas The canvas element to render to
     */
    constructor(canvas: HTMLCanvasElement) {
        this.logger = new Logger('GameEngine');
        this.events = new EventEmitter();

        try {
            this.logger.info('Initializing game engine...');
            this.engine = new BabylonEngine(canvas, true);
            this.scene = new Scene(this.engine);

            // Set up gravity
            this.scene.gravity = new Vector3(0, -9.81, 0);

            // Initialize core systems
            this.renderer = new Renderer(this.engine, this.scene);
            this.physics = new Physics(this.scene, this.events);
            this.input = new InputManager(canvas, this.events);
            this.assets = new AssetManager(this.scene);
            this.audio = new AudioManager();

            // Set up window resize handler
            window.addEventListener('resize', () => this.engine.resize());

            this.logger.info('Game engine initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize game engine', error);
            throw error;
        }
    }

    /**
     * Start the game loop
     */
    public start(): void {
        if (this.isRunning) {
            this.logger.warn('Game engine is already running');
            return;
        }

        this.logger.info('Starting game loop');
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.engine.runRenderLoop(() => this.gameLoop());
    }

    /**
     * Stop the game loop
     */
    public stop(): void {
        if (!this.isRunning) {
            this.logger.warn('Game engine is not running');
            return;
        }

        this.logger.info('Stopping game loop');
        this.isRunning = false;
        this.engine.stopRenderLoop();
    }

    /**
     * Main game loop with fixed time step for physics updates
     */
    private gameLoop(): void {
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
            this.update(this.fixedTimeStep);
            this.accumulatedTime -= this.fixedTimeStep;
        }

        // Render the scene
        this.render(deltaTime);
    }

    /**
     * Update game state with fixed time step
     * @param deltaTime Time since last update in seconds
     */
    private update(deltaTime: number): void {
        try {
            // Update physics
            this.physics.update(deltaTime);

            // Update other systems
            this.input.update(deltaTime);
            this.assets.update(deltaTime);
            this.audio.update(deltaTime);

            // Emit update event for other systems
            this.events.emit('update', { deltaTime });
        } catch (error) {
            this.logger.error('Error in update loop', error);
        }
    }

    /**
     * Render the current game state
     * @param deltaTime Time since last frame in seconds
     */
    private render(deltaTime: number): void {
        try {
            // Update renderer
            this.renderer.render(deltaTime);

            // Emit render event for other systems
            this.events.emit('render', { deltaTime });
        } catch (error) {
            this.logger.error('Error in render loop', error);
        }
    }

    /**
     * Get the Babylon.js scene
     */
    public getScene(): Scene {
        return this.scene;
    }

    /**
     * Get the event emitter
     */
    public getEvents(): IEventEmitter {
        return this.events;
    }

    /**
     * Get the physics system
     */
    public getPhysics(): Physics {
        return this.physics;
    }

    /**
     * Get the input manager
     */
    public getInput(): InputManager {
        return this.input;
    }

    /**
     * Get the asset manager
     */
    public getAssets(): AssetManager {
        return this.assets;
    }

    /**
     * Get the audio manager
     */
    public getAudio(): AudioManager {
        return this.audio;
    }

    public resize(): void {
        // Implement resize logic here
        console.log('Resizing game engine');
    }
}