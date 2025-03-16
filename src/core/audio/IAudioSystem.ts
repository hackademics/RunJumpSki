import { Scene } from 'babylonjs';

/**
 * Sound categories for grouping and volume control
 */
export enum SoundCategory {
    MUSIC = 'music',
    SFX = 'sfx',
    AMBIENT = 'ambient',
    UI = 'ui',
    VOICE = 'voice'
}

/**
 * Sound playback options
 */
export interface SoundOptions {
    /**
     * Volume level (0-1)
     */
    volume?: number;

    /**
     * Playback rate (1 = normal speed)
     */
    playbackRate?: number;

    /**
     * Whether to loop the sound
     */
    loop?: boolean;

    /**
     * Sound category for group control
     */
    category?: SoundCategory;

    /**
     * Whether to stream the sound (recommended for music/long sounds)
     */
    streaming?: boolean;

    /**
     * Spatial sound options
     */
    spatial?: {
        /**
         * Position in 3D space
         */
        position?: { x: number; y: number; z: number };

        /**
         * Maximum distance at which the sound can be heard
         */
        maxDistance?: number;

        /**
         * Distance model for sound attenuation
         */
        distanceModel?: 'linear' | 'exponential' | 'inverse';

        /**
         * Rolloff factor for distance attenuation
         */
        rolloffFactor?: number;
    };
}

/**
 * Configuration for the audio system
 */
export interface AudioConfig {
    /**
     * Master volume (0-1)
     */
    masterVolume?: number;

    /**
     * Category volumes (0-1)
     */
    categoryVolumes?: {
        [key in SoundCategory]?: number;
    };

    /**
     * Whether to use Web Audio API (if available)
     */
    useWebAudio?: boolean;

    /**
     * Maximum number of concurrent sounds
     */
    maxConcurrentSounds?: number;

    /**
     * Default options for new sounds
     */
    defaultSoundOptions?: Partial<SoundOptions>;
}

/**
 * Sound instance interface
 */
export interface ISoundInstance {
    /**
     * Play the sound
     */
    play(): void;

    /**
     * Pause the sound
     */
    pause(): void;

    /**
     * Stop the sound
     */
    stop(): void;

    /**
     * Set the volume (0-1)
     */
    setVolume(volume: number): void;

    /**
     * Set the playback rate (1 = normal speed)
     */
    setPlaybackRate(rate: number): void;

    /**
     * Set the position in 3D space
     */
    setPosition(x: number, y: number, z: number): void;

    /**
     * Get the current time in seconds
     */
    getCurrentTime(): number;

    /**
     * Set the current time in seconds
     */
    setCurrentTime(time: number): void;

    /**
     * Get whether the sound is playing
     */
    isPlaying(): boolean;

    /**
     * Get whether the sound is paused
     */
    isPaused(): boolean;

    /**
     * Dispose of the sound instance
     */
    dispose(): void;
}

/**
 * Interface for the audio system
 */
export interface IAudioSystem {
    /**
     * Initialize the audio system
     * @param scene The Babylon.js scene
     * @param config Audio system configuration
     */
    initialize(scene: Scene, config?: AudioConfig): void;

    /**
     * Load a sound
     * @param name Unique identifier for the sound
     * @param url URL of the sound file
     * @param options Sound options
     */
    loadSound(name: string, url: string, options?: SoundOptions): Promise<void>;

    /**
     * Play a sound
     * @param name Sound identifier
     * @param options Override options for this play instance
     */
    playSound(name: string, options?: Partial<SoundOptions>): ISoundInstance;

    /**
     * Stop all sounds in a category
     * @param category Sound category to stop
     */
    stopCategory(category: SoundCategory): void;

    /**
     * Set the volume for a category
     * @param category Sound category
     * @param volume Volume level (0-1)
     */
    setCategoryVolume(category: SoundCategory, volume: number): void;

    /**
     * Set the master volume
     * @param volume Volume level (0-1)
     */
    setMasterVolume(volume: number): void;

    /**
     * Pause all sounds
     */
    pauseAll(): void;

    /**
     * Resume all sounds
     */
    resumeAll(): void;

    /**
     * Stop all sounds
     */
    stopAll(): void;

    /**
     * Check if a sound is loaded
     * @param name Sound identifier
     */
    isLoaded(name: string): boolean;

    /**
     * Get the number of currently playing sounds
     */
    getPlayingCount(): number;

    /**
     * Dispose of the audio system
     */
    dispose(): void;
} 