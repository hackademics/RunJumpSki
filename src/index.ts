import { Vector3 } from '@babylonjs/core';
import { GameEngine } from './core/engine';
import { GameLevel } from './level/game-level';
import { Logger, LogLevel } from './utils/logger';

/**
 * Main entry point for the game
 */
class RunJumpSki {
    private logger: Logger;
    private engine?: GameEngine;
    private level?: GameLevel;
    private canvas?: HTMLCanvasElement;

    constructor() {
        // Configure logger
        Logger.setLevel(LogLevel.DEBUG);
        Logger.enableConsole(true);
        Logger.enableTimestamps(true);

        this.logger = new Logger('RunJumpSki');
    }

    /**
     * Initialize the game
     */
    public async init(): Promise<void> {
        try {
            this.logger.info('Initializing RunJumpSki...');

            // Get canvas element
            this.canvas = document.getElementById('renderCanvas') as unknown as HTMLCanvasElement;
            if (!this.canvas) {
                throw new Error('Canvas element not found');
            }

            // Initialize game engine
            this.engine = new GameEngine(this.canvas);

            // Set up window resize handler
            window.addEventListener('resize', () => {
                if (this.engine) {
                    this.engine.getEngine().resize();
                }
            });

            // Set up initialization complete callback
            window.addEventListener('load', () => {
                this.start();
            });

            this.logger.info('Initialization complete');
        } catch (error) {
            this.logger.error('Failed to initialize game', error);
            this.displayError('Failed to initialize game. Check console for details.');
            throw error;
        }
    }

    /**
     * Start the game
     */
    public async start(): Promise<void> {
        if (!this.engine) {
            this.logger.error('Cannot start game: engine not initialized');
            return;
        }

        try {
            this.logger.info('Starting RunJumpSki...');

            // Create and load level
            this.level = new GameLevel(this.engine, {
                name: 'Tutorial',
                terrain: {
                    width: 1000,
                    depth: 1000,
                    maxHeight: 200,
                    seed: Math.random() * 10000
                },
                playerSpawn: new Vector3(0, 50, 0),
                targets: [
                    new Vector3(50, 0, 50),
                    new Vector3(-50, 0, 50),
                    new Vector3(50, 0, -50),
                    new Vector3(-50, 0, -50)
                ],
                turrets: [
                    new Vector3(100, 0, 100),
                    new Vector3(-100, 0, 100),
                    new Vector3(100, 0, -100),
                    new Vector3(-100, 0, -100)
                ]
            });

            await this.level.load();

            // Start the game loop
            this.engine.start();

            // Set up loop for level updates
            this.engine.getEvents().on('update', (data) => {
                if (this.level) {
                    this.level.update(data.deltaTime);
                }
            });

            // Display controls
            this.displayControls();

            this.logger.info('Game started successfully');
        } catch (error) {
            this.logger.error('Failed to start game', error);
            this.displayError('Failed to start game. Check console for details.');
        }
    }

    /**
     * Stop the game
     */
    public stop(): void {
        if (this.engine) {
            this.engine.stop();
        }

        this.logger.info('Game stopped');
    }

    /**
     * Display controls information
     */
    private displayControls(): void {
        const controlsDiv = document.createElement('div');
        controlsDiv.id = 'controls';
        controlsDiv.style.position = 'absolute';
        controlsDiv.style.bottom = '10px';
        controlsDiv.style.left = '10px';
        controlsDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        controlsDiv.style.color = 'white';
        controlsDiv.style.padding = '10px';
        controlsDiv.style.borderRadius = '5px';
        controlsDiv.style.fontFamily = 'Arial, sans-serif';
        controlsDiv.style.zIndex = '100';

        controlsDiv.innerHTML = `
      <h3>Controls:</h3>
      <ul>
        <li>WASD / Arrow Keys - Move</li>
        <li>Space - Jump</li>
        <li>Shift - Ski</li>
        <li>Control - Jetpack</li>
        <li>Mouse - Look around</li>
        <li>Click canvas to capture mouse</li>
      </ul>
    `;

        document.body.appendChild(controlsDiv);
    }

    /**
     * Display error message
     * @param message Error message to display
     */
    private displayError(message: string): void {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'error';
        errorDiv.style.position = 'absolute';
        errorDiv.style.top = '50%';
        errorDiv.style.left = '50%';
        errorDiv.style.transform = 'translate(-50%, -50%)';
        errorDiv.style.backgroundColor = 'rgba(200, 0, 0, 0.8)';
        errorDiv.style.color = 'white';
        errorDiv.style.padding = '20px';
        errorDiv.style.borderRadius = '5px';
        errorDiv.style.fontFamily = 'Arial, sans-serif';
        errorDiv.style.zIndex = '100';
        errorDiv.style.textAlign = 'center';

        errorDiv.innerHTML = `
      <h2>Error</h2>
      <p>${message}</p>
    `;

        document.body.appendChild(errorDiv);
    }
}

// Create and initialize the game
const game = new RunJumpSki();
game.init().catch(error => {
    console.error('Failed to initialize game', error);
});

// Export game instance for debugging
(window as any).game = game;