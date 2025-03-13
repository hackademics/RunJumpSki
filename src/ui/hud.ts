import {
    Scene,
    GUI,
    AdvancedDynamicTexture,
    Control,
    Color3
} from '@babylonjs/gui';
import { IEventEmitter, GameEvent } from '../types/events';
import { Logger } from '../utils/logger';
import { UIText } from './components/text';
import { Player } from '../entities/player';

/**
 * HUD configuration options
 */
export interface HUDOptions {
    /**
     * Whether to show speed indicator
     */
    showSpeed?: boolean;

    /**
     * Whether to show energy indicator
     */
    showEnergy?: boolean;

    /**
     * Whether to show current movement state
     */
    showMovementState?: boolean;

    /**
     * Whether to show score or time
     */
    showScore?: boolean;
}

/**
 * Default HUD configuration
 */
const DefaultHUDOptions: HUDOptions = {
    showSpeed: true,
    showEnergy: true,
    showMovementState: true,
    showScore: true
};

/**
 * Heads-Up Display (HUD) for the game
 */
export class GameHUD {
    private logger: Logger;
    private scene: Scene;
    private events: IEventEmitter;

    // HUD elements
    private hudTexture: AdvancedDynamicTexture;
    private options: HUDOptions;

    // Text components
    private speedText?: UIText;
    private energyText?: UIText;
    private movementStateText?: UIText;
    private scoreText?: UIText;

    // Player reference
    private player?: Player;

    // Game state tracking
    private currentScore: number = 0;
    private currentTime: number = 0;

    /**
     * Create a new game HUD
     * @param scene Babylon.js scene
     * @param events Event emitter
     * @param options HUD configuration options
     */
    constructor(
        scene: Scene,
        events: IEventEmitter,
        options: HUDOptions = {}
    ) {
        this.logger = new Logger('GameHUD');
        this.scene = scene;
        this.events = events;
        this.options = { ...DefaultHUDOptions, ...options };

        // Create HUD texture
        this.hudTexture = AdvancedDynamicTexture.CreateFullscreenUI('HUD', true, scene);

        // Set up HUD elements
        this.createHUDElements();

        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Create HUD GUI elements
     */
    private createHUDElements(): void {
        // Speed indicator
        if (this.options.showSpeed) {
            this.speedText = new UIText(
                'speed_indicator',
                this.scene,
                this.events,
                'Speed: 0 m/s',
                {
                    color: new Color3(1, 1, 1),
                    fontSize: 20,
                    alignment: 'left'
                }
            );
            this.speedText.getControl().left = "20px";
            this.speedText.getControl().top = "20px";
            this.hudTexture.addControl(this.speedText.getControl());
        }

        // Energy indicator
        if (this.options.showEnergy) {
            this.energyText = new UIText(
                'energy_indicator',
                this.scene,
                this.events,
                'Energy: 100%',
                {
                    color: new Color3(0.2, 0.8, 0.2),
                    fontSize: 20,
                    alignment: 'left'
                }
            );
            this.energyText.getControl().left = "20px";
            this.energyText.getControl().top = "50px";
            this.hudTexture.addControl(this.energyText.getControl());
        }

        // Movement state indicator
        if (this.options.showMovementState) {
            this.movementStateText = new UIText(
                'movement_state',
                this.scene,
                this.events,
                'Running',
                {
                    color: new Color3(1, 1, 1),
                    fontSize: 16,
                    alignment: 'right'
                }
            );
            this.movementStateText.getControl().left = "-20px";
            this.movementStateText.getControl().top = "20px";
            this.movementStateText.getControl().horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
            this.hudTexture.addControl(this.movementStateText.getControl());
        }

        // Score/Time indicator
        if (this.options.showScore) {
            this.scoreText = new UIText(
                'score_time',
                this.scene,
                this.events,
                'Score: 0 | Time: 0:00',
                {
                    color: new Color3(1, 1, 1),
                    fontSize: 20,
                    alignment: 'center'
                }
            );
            this.scoreText.getControl().horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
            this.scoreText.getControl().verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
            this.scoreText.getControl().top = "20px";
            this.hudTexture.addControl(this.scoreText.getControl());
        }
    }

    /**
     * Set up event listeners for HUD updates
     */
    private setupEventListeners(): void {
        // Listen for player state changes
        this.events.on(GameEvent.PLAYER_STATE_CHANGE, (data) => {
            this.updatePlayerState(data);
        });

        // Listen for score updates
        this.events.on(GameEvent.LEVEL_COMPLETE, (data) => {
            this.updateScore(data);
        });
    }

    /**
     * Update player-related HUD elements
     * @param data Player state change event data
     */
    private updatePlayerState(data: any): void {
        // Update movement state
        if (this.movementStateText && data.newState) {
            this.movementStateText.setText(this.formatMovementState(data.newState));
        }

        // Update energy level
        if (this.energyText && data.energyLevel !== undefined) {
            this.energyText.setText(`Energy: ${Math.round(data.energyLevel)}%`);

            // Change color based on energy level
            if (data.energyLevel < 25) {
                this.energyText.setColor(new Color3(1, 0, 0)); // Red
            } else if (data.energyLevel < 50) {
                this.energyText.setColor(new Color3(1, 0.5, 0)); // Orange
            } else {
                this.energyText.setColor(new Color3(0.2, 0.8, 0.2)); // Green
            }
        }
    }

    /**
     * Format movement state for display
     * @param state Raw movement state
     */
    private formatMovementState(state: string): string {
        switch (state) {
            case 'running': return 'Running';
            case 'skiing': return 'Skiing';
            case 'flying': return 'Flying';
            case 'jetpacking': return 'Jetpacking';
            default: return state;
        }
    }

    /**
     * Update score and time
     * @param data Level completion or score update event data
     */
    private updateScore(data: any): void {
        if (this.scoreText) {
            // Update score
            this.currentScore = data.score || this.currentScore;

            // Update time
            this.currentTime = data.time || this.currentTime;

            // Format time (minutes:seconds)
            const minutes = Math.floor(this.currentTime / 60);
            const seconds = Math.floor(this.currentTime % 60);
            const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            this.scoreText.setText(`Score: ${this.currentScore} | Time: ${formattedTime}`);
        }
    }

    /**
     * Set the player reference for HUD tracking
     * @param player Player entity
     */
    public setPlayer(player: Player): void {
        this.player = player;

        // Set up update loop to track speed
        this.scene.registerBeforeRender(() => {
            if (this.speedText && this.player) {
                const speed = this.player.getMovement().getSpeed();
                this.speedText.setText(`Speed: ${Math.round(speed)} m/s`);
            }
        });
    }

    /**
     * Show or hide the entire HUD
     * @param visible Whether the HUD should be visible
     */
    public setVisible(visible: boolean): void {
        this.hudTexture.getChildren().forEach(control => {
            control.isVisible = visible;
        });
    }

    /**
     * Clean up HUD resources
     */
    public dispose(): void {
        // Dispose individual text components
        [this.speedText, this.energyText, this.movementStateText, this.scoreText]
            .forEach(component => component?.dispose());

        // Dispose HUD texture
        if (this.hudTexture) {
            this.hudTexture.dispose();
        }

        // Remove event listeners
        this.events.removeAllListeners(GameEvent.PLAYER_STATE_CHANGE);
        this.events.removeAllListeners(GameEvent.LEVEL_COMPLETE);

        this.logger.debug('HUD disposed');
    }
} 
