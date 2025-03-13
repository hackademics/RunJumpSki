import {
    Scene,
    GUI,
    AdvancedDynamicTexture,
    Color3
} from '@babylonjs/gui';
import { IEventEmitter, GameEvent } from '../types/events';
import { Logger } from '../utils/logger';
import { GameEngine } from '../core/engine';
import { UIPanel } from './components/panel';
import { UIButton } from './components/button';
import { UIText } from './components/text';
import { UISlider } from './components/slider';

/**
 * Menu configuration options
 */
export interface MenuConfiguration {
    /**
     * Whether sound is enabled
     */
    soundEnabled?: boolean;

    /**
     * Master volume level
     */
    masterVolume?: number;

    /**
     * Graphics quality setting
     */
    graphicsQuality?: 'low' | 'medium' | 'high';
}

/**
 * Game Menu System
 */
export class GameMenu {
    private logger: Logger;
    private scene: Scene;
    private events: IEventEmitter;
    private engine: GameEngine;

    // Menu texture and containers
    private menuTexture: AdvancedDynamicTexture;
    private currentMenu: 'main' | 'settings' | 'levels' = 'main';

    // Menu components
    private mainMenuPanel?: UIPanel;
    private settingsPanel?: UIPanel;
    private levelsPanel?: UIPanel;

    // Configuration
    private config: MenuConfiguration;

    /**
     * Create a new game menu system
     * @param scene Babylon.js scene
     * @param events Event emitter
     * @param engine Game engine
     * @param initialConfig Initial menu configuration
     */
    constructor(
        scene: Scene,
        events: IEventEmitter,
        engine: GameEngine,
        initialConfig: MenuConfiguration = {}
    ) {
        this.logger = new Logger('GameMenu');
        this.scene = scene;
        this.events = events;
        this.engine = engine;

        // Set default configuration
        this.config = {
            soundEnabled: true,
            masterVolume: 100,
            graphicsQuality: 'medium',
            ...initialConfig
        };

        // Create fullscreen menu texture
        this.menuTexture = AdvancedDynamicTexture.CreateFullscreenUI('MenuUI', true, scene);

        // Create menu panels
        this.createMainMenu();
        this.createSettingsMenu();
        this.createLevelsMenu();

        // Show main menu initially
        this.showMainMenu();

        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Create the main menu panel
     */
    private createMainMenu(): void {
        // Create main menu panel
        this.mainMenuPanel = new UIPanel(
            'main_menu',
            this.scene,
            this.events,
            {
                backgroundColor: new Color3(0.1, 0.1, 0.15),
                cornerRadius: 15
            }
        );

        // Title
        const titleText = new UIText(
            'menu_title',
            this.scene,
            this.events,
            'RunJumpSki',
            {
                color: new Color3(0.2, 0.4, 0.8),
                fontSize: 36,
                fontWeight: 'bold',
                alignment: 'center'
            }
        );

        // Create buttons
        const startButton = new UIButton(
            'start_game',
            this.scene,
            this.events,
            'Start Game',
            {
                backgroundColor: new Color3(0.1, 0.6, 0.3)
            }
        );

        const levelsButton = new UIButton(
            'levels',
            this.scene,
            this.events,
            'Levels',
            {
                backgroundColor: new Color3(0.2, 0.4, 0.8)
            }
        );

        const settingsButton = new UIButton(
            'settings',
            this.scene,
            this.events,
            'Settings',
            {
                backgroundColor: new Color3(0.5, 0.5, 0.5)
            }
        );

        const quitButton = new UIButton(
            'quit_game',
            this.scene,
            this.events,
            'Quit Game',
            {
                backgroundColor: new Color3(0.8, 0.2, 0.2)
            }
        );

        // Add components to panel
        this.mainMenuPanel.addControl(titleText.getControl());
        this.mainMenuPanel.addControl(startButton.getControl());
        this.mainMenuPanel.addControl(levelsButton.getControl());
        this.mainMenuPanel.addControl(settingsButton.getControl());
        this.mainMenuPanel.addControl(quitButton.getControl());

        // Set up button event handlers
        startButton.getControl().onPointerClickObservable.add(() => {
            this.startGame();
        });

        levelsButton.getControl().onPointerClickObservable.add(() => {
            this.showLevelsMenu();
        });

        settingsButton.getControl().onPointerClickObservable.add(() => {
            this.showSettingsMenu();
        });

        quitButton.getControl().onPointerClickObservable.add(() => {
            this.quitGame();
        });

        // Add to menu texture
        this.menuTexture.addControl(this.mainMenuPanel.getContainer());
    }

    /**
     * Create the settings menu panel
     */
    private createSettingsMenu(): void {
        // Create settings menu panel
        this.settingsPanel = new UIPanel(
            'settings_menu',
            this.scene,
            this.events,
            {
                backgroundColor: new Color3(0.1, 0.1, 0.15),
                cornerRadius: 15
            }
        );

        // Title
        const titleText = new UIText(
            'settings_title',
            this.scene,
            this.events,
            'Settings',
            {
                color: new Color3(0.2, 0.4, 0.8),
                fontSize: 30,
                fontWeight: 'bold',
                alignment: 'center'
            }
        );

        // Volume slider
        const volumeSlider = new UISlider(
            'volume_slider',
            this.scene,
            this.events,
            {
                min: 0,
                max: 100,
                value: this.config.masterVolume,
                label: 'Master Volume'
            },
            {
                trackColor: new Color3(0.4, 0.4, 0.4),
                thumbColor: new Color3(0.1, 0.6, 0.3)
            }
        );

        // Sound toggle button
        const soundToggleButton = new UIButton(
            'sound_toggle',
            this.scene,
            this.events,
            this.config.soundEnabled ? 'Sound: ON' : 'Sound: OFF',
            {
                backgroundColor: this.config.soundEnabled
                    ? new Color3(0.1, 0.6, 0.3)
                    : new Color3(0.8, 0.2, 0.2)
            }
        );

        // Graphics quality dropdown (simulated with buttons)
        const graphicsQualityText = new UIText(
            'graphics_quality',
            this.scene,
            this.events,
            `Graphics: ${this.config.graphicsQuality}`,
            {
                alignment: 'center'
            }
        );

        const graphicsQualityButton = new UIButton(
            'graphics_quality_toggle',
            this.scene,
            this.events,
            'Change Quality'
        );

        // Back button
        const backButton = new UIButton(
            'settings_back',
            this.scene,
            this.events,
            'Back',
            {
                backgroundColor: new Color3(0.5, 0.5, 0.5)
            }
        );

        // Add components to panel
        this.settingsPanel.addControl(titleText.getControl());
        this.settingsPanel.addControl(volumeSlider.getControl());
        this.settingsPanel.addControl(soundToggleButton.getControl());
        this.settingsPanel.addControl(graphicsQualityText.getControl());
        this.settingsPanel.addControl(graphicsQualityButton.getControl());
        this.settingsPanel.addControl(backButton.getControl());

        // Event handlers
        volumeSlider.getSlider().onValueChangedObservable.add((value) => {
            this.config.masterVolume = value;
            this.updateAudioSettings();
        });

        soundToggleButton.getControl().onPointerClickObservable.add(() => {
            this.config.soundEnabled = !this.config.soundEnabled;
            soundToggleButton.setText(
                this.config.soundEnabled ? 'Sound: ON' : 'Sound: OFF'
            );
            soundToggleButton.getControl().background = this.config.soundEnabled
                ? new Color3(0.1, 0.6, 0.3).toColor4(1)
                : new Color3(0.8, 0.2, 0.2).toColor4(1);
            this.updateAudioSettings();
        });

        graphicsQualityButton.getControl().onPointerClickObservable.add(() => {
            // Cycle through graphics qualities
            const qualities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
            const currentIndex = qualities.indexOf(this.config.graphicsQuality!);
            const nextIndex = (currentIndex + 1) % qualities.length;
            this.config.graphicsQuality = qualities[nextIndex];

            graphicsQualityText.setText(`Graphics: ${this.config.graphicsQuality}`);
            this.updateGraphicsSettings();
        });

        backButton.getControl().onPointerClickObservable.add(() => {
            this.showMainMenu();
        });

        // Add to menu texture (but initially hidden)
        this.menuTexture.addControl(this.settingsPanel.getContainer());
        this.settingsPanel.getContainer().isVisible = false;
    }

    /**
     * Create the levels menu panel
     */
    private createLevelsMenu(): void {
        // Create levels menu panel
        this.levelsPanel = new UIPanel(
            'levels_menu',
            this.scene,
            this.events,
            {
                backgroundColor: new Color3(0.1, 0.1, 0.15),
                cornerRadius: 15
            }
        );

        // Title
        const titleText = new UIText(
            'levels_title',
            this.scene,
            this.events,
            'Select Level',
            {
                color: new Color3(0.2, 0.4, 0.8),
                fontSize: 30,
                fontWeight: 'bold',
                alignment: 'center'
            }
        );

        // Level buttons
        const levels = [
            { name: 'Tutorial', locked: false },
            { name: 'Mountain Pass', locked: true },
            { name: 'Canyon Run', locked: true },
            { name: 'Extreme Peak', locked: true }
        ];

        const levelButtons = levels.map((level, index) => {
            const button = new UIButton(
                `level_${index}`,
                this.scene,
                this.events,
                level.name,
                {
                    backgroundColor: level.locked
                        ? new Color3(0.5, 0.5, 0.5)
                        : new Color3(0.1, 0.6, 0.3)
                }
            );

            // Disable locked levels
            if (level.locked) {
                button.setEnabled(false);
            }

            button.getControl().onPointerClickObservable.add(() => {
                this.startLevel(level.name);
            });

            return button;
        });

        // Back button
        const backButton = new UIButton(
            'levels_back',
            this.scene,
            this.events,
            'Back',
            {
                backgroundColor: new Color3(0.5, 0.5, 0.5)
            }
        );

        // Add components to panel
        this.levelsPanel.addControl(titleText.getControl());
        levelButtons.forEach(button => {
            this.levelsPanel.addControl(button.getControl());
        });
        this.levelsPanel.addControl(backButton.getControl());

        // Back button handler
        backButton.getControl().onPointerClickObservable.add(() => {
            this.showMainMenu();
        });

        // Add to menu texture (but initially hidden)
        this.menuTexture.addControl(this.levelsPanel.getContainer());
        this.levelsPanel.getContainer().isVisible = false;
    }

    /**
     * Set up event listeners
     */
    private setupEventListeners(): void {
        // Add any additional event listeners if needed
    }

    /**
     * Show main menu
     */
    private showMainMenu(): void {
        // Hide other menus
        if (this.settingsPanel) {
            this.settingsPanel.getContainer().isVisible = false;
        }
        if (this.levelsPanel) {
            this.levelsPanel.getContainer().isVisible = false;
        }

        // Show main menu
        if (this.mainMenuPanel) {
            this.mainMenuPanel.getContainer().isVisible = true;
        }
        this.currentMenu = 'main';
    }

    /**
     * Show settings menu
     */
    private showSettingsMenu(): void {
        // Hide other menus
        if (this.mainMenuPanel) {
            this.mainMenuPanel.getContainer().isVisible = false;
        }
        if (this.levelsPanel) {
            this.levelsPanel.getContainer().isVisible = false;
        }

        // Show settings menu
        if (this.settingsPanel) {
            this.settingsPanel.getContainer().isVisible = true;
        }
        this.currentMenu = 'settings';
    }

    /**
     * Show levels menu
     */
    private showLevelsMenu(): void {
        // Hide other menus
        if (this.mainMenuPanel) {
            this.mainMenuPanel.getContainer().isVisible = false;
        }
        if (this.settingsPanel) {
            this.settingsPanel.getContainer().isVisible = false;
        }

        // Show levels menu
        if (this.levelsPanel) {
            this.levelsPanel.getContainer().isVisible = true;
        }
        this.currentMenu = 'levels';
    }

    /**
     * Start the game
     */
    private startGame(): void {
        this.logger.info('Starting game');

        // Hide menu
        this.menuTexture.getChildren().forEach(control => {
            control.isVisible = false;
        });

        // Emit game start event
        this.events.emit(GameEvent.START);
    }

    /**
     * Start a specific level
     * @param levelName Name of the level to start
     */
    private startLevel(levelName: string): void {
        this.logger.info(`Starting level: ${levelName}`);

        // Hide menu
        this.menuTexture.getChildren().forEach(control => {
            control.isVisible = false;
        });

        // Emit level load event
        this.events.emit(GameEvent.LEVEL_LOAD, { levelName });
    }

    /**
     * Quit the game
     */
    private quitGame(): void {
        this.logger.info('Quitting game');

        // Emit game stop event
        this.events.emit(GameEvent.STOP);

        // In a web context, this might redirect or close the window
        if (typeof window !== 'undefined') {
            window.close();
        }
    }

    /**
     * Update audio settings based on configuration
     */
    private updateAudioSettings(): void {
        this.logger.debug('Updating audio settings', this.config);

        // Emit audio configuration event
        this.events.emit(GameEvent.UI_BUTTON_CLICK, {
            type: 'audio_settings',
            soundEnabled: this.config.soundEnabled,
            volume: this.config.masterVolume
        });
    }

    /**
     * Update graphics settings
     */
    private updateGraphicsSettings(): void {
        this.logger.debug('Updating graphics settings', this.config);

        // Emit graphics configuration event
        this.events.emit(GameEvent.UI_BUTTON_CLICK, {
            type: 'graphics_settings',
            quality: this.config.graphicsQuality
        });
    }

    /**
     * Get current menu configuration
     */
    public getConfiguration(): MenuConfiguration {
        return { ...this.config };
    }

    /**
     * Update menu configuration
     * @param config Partial configuration to update
     */
    public updateConfiguration(config: Partial<MenuConfiguration>): void {
        this.config = { ...this.config, ...config };

        // Trigger updates for changed settings
        if (config.masterVolume !== undefined || config.soundEnabled !== undefined) {
            this.updateAudioSettings();
        }

        if (config.graphicsQuality !== undefined) {
            this.updateGraphicsSettings();
        }
    }

    /**
     * Clean up menu resources
     */
    public dispose(): void {
        // Dispose menu panels
        [this.mainMenuPanel, this.settingsPanel, this.levelsPanel]
            .forEach(panel => panel?.dispose());

        // Dispose menu texture
        if (this.menuTexture) {
            this.menuTexture.dispose();
        }

        this.logger.debug('Game menu disposed');
    }
}
