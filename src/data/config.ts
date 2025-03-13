/**
* Graphics quality settings
*/
export type GraphicsQuality = 'low' | 'medium' | 'high';

/**
 * Input configuration for key bindings
 */
export interface InputConfig {
    forward: string[];
    backward: string[];
    left: string[];
    right: string[];
    jump: string[];
    ski: string[];
    jetpack: string[];
    fire: string[];
    altFire: string[];
    reload: string[];
    use: string[];
    menu: string[];
}

/**
 * Audio configuration settings
 */
export interface AudioConfig {
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
    enabled: boolean;
}

/**
 * Gameplay configuration settings
 */
export interface GameplayConfig {
    difficulty: 'easy' | 'normal' | 'hard';
    showTutorial: boolean;
    enableCheats: boolean;
}

/**
 * Accessibility configuration
 */
export interface AccessibilityConfig {
    colorBlindMode: boolean;
    subtitles: boolean;
    screenShakeReduction: boolean;
}

/**
 * Global game configuration
 */
export interface GameConfiguration {
    /**
     * Graphics settings
     */
    graphics: {
        quality: GraphicsQuality;
        resolution: {
            width: number;
            height: number;
        };
        fullscreen: boolean;
        vsync: boolean;
        antiAliasing: boolean;
    };

    /**
     * Input configuration
     */
    input: InputConfig;

    /**
     * Audio settings
     */
    audio: AudioConfig;

    /**
     * Gameplay settings
     */
    gameplay: GameplayConfig;

    /**
     * Accessibility options
     */
    accessibility: AccessibilityConfig;
}

/**
 * Default game configuration
 */
export const DefaultGameConfig: GameConfiguration = {
    graphics: {
        quality: 'medium',
        resolution: {
            width: 1920,
            height: 1080
        },
        fullscreen: false,
        vsync: true,
        antiAliasing: true
    },
    input: {
        forward: ['w', 'arrowup'],
        backward: ['s', 'arrowdown'],
        left: ['a', 'arrowleft'],
        right: ['d', 'arrowright'],
        jump: [' ', 'space'],
        ski: ['shift'],
        jetpack: ['control'],
        fire: ['mouse0'],
        altFire: ['mouse2'],
        reload: ['r'],
        use: ['e', 'f'],
        menu: ['escape']
    },
    audio: {
        masterVolume: 75,
        musicVolume: 50,
        sfxVolume: 100,
        enabled: true
    },
    gameplay: {
        difficulty: 'normal',
        showTutorial: true,
        enableCheats: false
    },
    accessibility: {
        colorBlindMode: false,
        subtitles: false,
        screenShakeReduction: false
    }
};

/**
 * Configuration management utility
 */
export class ConfigManager {
    private static instance: ConfigManager;
    private _config: GameConfiguration;

    private constructor() {
        // Load from local storage or use default
        const savedConfig = localStorage.getItem('game_config');
        this._config = savedConfig
            ? JSON.parse(savedConfig)
            : { ...DefaultGameConfig };
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    /**
     * Get current configuration
     */
    public get config(): GameConfiguration {
        return { ...this._config };
    }

    /**
     * Update configuration
     * @param newConfig Partial configuration to update
     */
    public updateConfig(newConfig: Partial<GameConfiguration>): void {
        this._config = {
            ...this._config,
            ...newConfig
        };

        // Save to local storage
        localStorage.setItem('game_config', JSON.stringify(this._config));
    }

    /**
     * Reset to default configuration
     */
    public resetToDefaults(): void {
        this._config = { ...DefaultGameConfig };
        localStorage.removeItem('game_config');
    }

    /**
     * Export current configuration
     */
    public exportConfig(): string {
        return JSON.stringify(this._config, null, 2);
    }

    /**
     * Import configuration from JSON string
     * @param configJson Configuration as JSON string
     */
    public importConfig(configJson: string): void {
        try {
            const parsedConfig = JSON.parse(configJson);
            this.updateConfig(parsedConfig);
        } catch (error) {
            console.error('Failed to import configuration:', error);
        }
    }
}

// Export a convenience method to get config
export const getConfig = () => ConfigManager.getInstance().config;
