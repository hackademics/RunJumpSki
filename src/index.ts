/**
 * index.ts
 * Main entry point for the RunJumpSki game
 */

import { GameScene } from './scenes/GameScene';
import { Logger } from './utils/Logger';
import { GameConstants } from './config/Constants';

/**
 * Main game class
 */
class RunJumpSki {
    private logger: Logger;
    private gameScene?: GameScene;
    private canvas: HTMLCanvasElement;
    
    /**
     * Create a new RunJumpSki game
     */
    constructor() {
        this.logger = new Logger('RunJumpSki');
        
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = GameConstants.DEFAULT_WIDTH;
        this.canvas.height = GameConstants.DEFAULT_HEIGHT;
        this.canvas.style.display = 'block';
        this.canvas.style.margin = 'auto';
        this.canvas.style.backgroundColor = '#000';
        
        // Add canvas to document
        document.body.appendChild(this.canvas);
        
        // Set up event listeners
        this.setupEventListeners();
        
        this.logger.debug('RunJumpSki created');
    }
    
    /**
     * Initialize the game
     */
    public init(): void {
        this.logger.debug('Initializing RunJumpSki');
        
        try {
            // Create game scene
            this.gameScene = new GameScene({
                canvas: this.canvas,
                width: this.canvas.width,
                height: this.canvas.height
            });
            
            // Initialize game scene
            this.gameScene.init();
            
            this.logger.debug('RunJumpSki initialized');
        } catch (error) {
            this.logger.error('Failed to initialize RunJumpSki', error);
        }
    }
    
    /**
     * Start the game
     */
    public start(): void {
        this.logger.debug('Starting RunJumpSki');
        
        if (!this.gameScene) {
            this.logger.error('Cannot start game: Game scene not initialized');
            return;
        }
        
        try {
            // Start game scene
            this.gameScene.start();
            
            this.logger.debug('RunJumpSki started');
        } catch (error) {
            this.logger.error('Failed to start RunJumpSki', error);
        }
    }
    
    /**
     * Set up event listeners
     */
    private setupEventListeners(): void {
        // Handle window resize
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Handle fullscreen toggle
        document.addEventListener('keydown', (event) => {
            if (event.key === 'F11') {
                event.preventDefault();
                this.toggleFullscreen();
            }
        });
    }
    
    /**
     * Handle window resize
     */
    private handleResize(): void {
        // Update canvas size
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Update renderer size if game scene exists
        if (this.gameScene) {
            // TODO: Add method to update renderer size
        }
        
        this.logger.debug(`Resized canvas to ${width}x${height}`);
    }
    
    /**
     * Toggle fullscreen mode
     */
    private toggleFullscreen(): void {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((error) => {
                this.logger.error('Failed to enter fullscreen mode', error);
            });
        } else {
            document.exitFullscreen().catch((error) => {
                this.logger.error('Failed to exit fullscreen mode', error);
            });
        }
    }
}

// Create and start the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new RunJumpSki();
    game.init();
    game.start();
});
