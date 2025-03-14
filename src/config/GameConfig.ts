/**
 * GameConfig.ts
 * Game configuration settings
 */

/**
 * Graphics quality levels
 */
export type GraphicsQuality = 'low' | 'medium' | 'high' | 'ultra';

/**
 * Input key mapping
 */
export interface InputMapping {
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
 * Audio configuration
 */
export interface AudioConfig {
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
    enabled: boolean;
}

/**
 * Gameplay configuration
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
 * Game configuration
 */
export interface GameConfig {
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
    input: InputMapping;

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
export const DefaultGameConfig: GameConfig = {
    graphics: {
        quality: 'medium',
        resolution: {
            width: 1280,
            height: 720
        },
        fullscreen: false,
        vsync: true,
        antiAliasing: true
    },
    input: {
        forward: ['w', 'ArrowUp'],
        backward: ['s', 'ArrowDown'],
        left: ['a', 'ArrowLeft'],
        right: ['d', 'ArrowRight'],
        jump: [' ', 'Space'],
        ski: ['Shift'],
        jetpack: ['Control'],
        fire: ['mouse0'],
        altFire: ['mouse2'],
        reload: ['r'],
        use: ['e', 'f'],
        menu: ['Escape']
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
