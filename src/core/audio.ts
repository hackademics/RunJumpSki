import { Engine } from './engine';
import { EventSystem, EventType } from './events';
import { Logger } from '../utils/logger';
import { Vector3 } from '../utils/math';

export enum SoundType {
    EFFECT = 'effect',
    MUSIC = 'music',
    AMBIENT = 'ambient',
    UI = 'ui'
}

export interface AudioConfig {
    masterVolume: number;
    effectsVolume: number;
    musicVolume: number;
    ambientVolume: number;
    uiVolume: number;
    enableSpatialAudio: boolean;
    maxConcurrentSounds: number;
}

// Placeholder for actual audio implementation
export class AudioManager {
    private engine: Engine;
    private eventSystem: EventSystem;
    private logger: Logger;
    private config: AudioConfig;
    private audioContext: AudioContext | null = null;
    private sounds: Map<string, HTMLAudioElement> = new Map();
    private activeSounds: Set<HTMLAudioElement> = new Set();
    private listener: { position: Vector3, orientation: Vector3 } = {
        position: new Vector3(0, 0, 0),
        orientation: new Vector3(0, 0, -1)
    };

    constructor(engine: Engine) {
        this.engine = engine;
        this.eventSystem = engine.getEventSystem();
        this.logger = new Logger('AudioManager');

        this.config = {
            masterVolume: 1.0,
            effectsVolume: 0.8,
            musicVolume: 0.6,
            ambientVolume: 0.4,
            uiVolume: 0.7,
            enableSpatialAudio: true,
            maxConcurrentSounds: 32
        };

        this.registerEvents();
    }

    private registerEvents(): void {
        // Listen for physics updates to update audio positioning
        this.eventSystem.subscribe(EventType.PHYSICS_UPDATED, (data: any) => {
            if (data.entity && data.entity.hasComponent('camera')) {
                // Update listener position based on camera
                this.updateListener(data.position, data.entity.getComponent('camera').getForward());
            }

            // Check for specific state changes that trigger sounds
            if (data.entity && data.entity.hasComponent('movement')) {
                const movementComponent = data.entity.getComponent('movement');
                const state = movementComponent.getCurrentState();
                const prevState = movementComponent.getPreviousState();

                // State transition sound effects
                if (state !== prevState) {
                    switch (state) {
                        case 'SKIING':
                            this.playSound('ski_start', SoundType.EFFECT, data.position);
                            break;
                        case 'JETPACKING':
                            this.playSound('jetpack_start', SoundType.EFFECT, data.position);
                            break;
                        case 'FLYING':
                            if (prevState === 'JETPACKING') {
                                this.playSound('jetpack_end', SoundType.EFFECT, data.position);
                            }
                            break;
                    }
                }

                // Continuous state sounds
                switch (state) {
                    case 'SKIING':
                        // Play skiing sound with intensity based on speed
                        const speed = data.velocity.length();
                        const volume = Math.min(1.0, speed / 20.0);
                        this.playSound('ski_loop', SoundType.EFFECT, data.position, volume, true);
                        break;
                    case 'JETPACKING':
                        this.playSound('jetpack_loop', SoundType.EFFECT, data.position, 1.0, true);
                        break;
                }
            }
        });

        // Listen for collision events to play impact sounds
        this.eventSystem.subscribe(EventType.COLLISION, (data: any) => {
            const velocity = data.entity.getComponent('movement').getVelocity();
            const impactForce = velocity.length();

            if (impactForce > 5.0) {
                const volume = Math.min(1.0, impactForce / 20.0);
                this.playSound('impact', SoundType.EFFECT, data.position, volume);
            }
        });

        // Listen for various game events to play appropriate sounds
        this.eventSystem.subscribe(EventType.GAME_STARTED, () => {
            this.playSound('game_start', SoundType.MUSIC);
        });

        this.eventSystem.subscribe(EventType.LEVEL_LOADED, () => {
            this.playSound('level_music', SoundType.MUSIC, null, 1.0, true);
            this.playSound('ambient', SoundType.AMBIENT, null, 1.0, true);
        });

        this.eventSystem.subscribe(EventType.UI_BUTTON_CLICKED, (data: any) => {
            this.playSound('ui_click', SoundType.UI);
        });
    }

    public initialize(): void {
        try {
            // Initialize Web Audio API
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.logger.info('Audio system initialized');

            // Preload essential sounds
            this.preloadSounds();

            this.eventSystem.emit(EventType.AUDIO_INITIALIZED, {});
        } catch (error) {
            this.logger.error('Failed to initialize audio system:', error);
        }
    }

    private preloadSounds(): void {
        // Preload common sound effects
        const sounds = [
            { id: 'ski_start', url: 'assets/audio/ski_start.mp3', type: SoundType.EFFECT },
            { id: 'ski_loop', url: 'assets/audio/ski_loop.mp3', type: SoundType.EFFECT },
            { id: 'jetpack_start', url: 'assets/audio/jetpack_start.mp3', type: SoundType.EFFECT },
            { id: 'jetpack_loop', url: 'assets/audio/jetpack_loop.mp3', type: SoundType.EFFECT },
            { id: 'jetpack_end', url: 'assets/audio/jetpack_end.mp3', type: SoundType.EFFECT },
            { id: 'impact', url: 'assets/audio/impact.mp3', type: SoundType.EFFECT },
            { id: 'game_start', url: 'assets/audio/game_start.mp3', type: SoundType.MUSIC },
            { id: 'level_music', url: 'assets/audio/level_music.mp3', type: SoundType.MUSIC },
            { id: 'ambient', url: 'assets/audio/ambient.mp3', type: SoundType.AMBIENT },
            { id: 'ui_click', url: 'assets/audio/ui_click.mp3', type: SoundType.UI }
        ];

        // In a real implementation, we would actually load these sounds
        // For now, we'll just create placeholder audio elements
        sounds.forEach(sound => {
            // Create an audio element
            const audio = new Audio();
            audio.src = sound.url;
            audio.preload = 'auto';
            audio.loop = false;

            // Set volume based on sound type
            switch (sound.type) {
                case SoundType.EFFECT:
                    audio.volume = this.config.effectsVolume * this.config.masterVolume;
                    break;
                case SoundType.MUSIC:
                    audio.volume = this.config.musicVolume * this.config.masterVolume;
                    break;
                case SoundType.AMBIENT:
                    audio.volume = this.config.ambientVolume * this.config.masterVolume;
                    break;
                case SoundType.UI:
                    audio.volume = this.config.uiVolume * this.config.masterVolume;
                    break;
            }

            this.sounds.set(sound.id, audio);
            this.logger.debug(`Preloaded sound: ${sound.id}`);
        });
    }

    public playSound(
        id: string,
        type: SoundType,
        position: Vector3 | null = null,
        volume: number = 1.0,
        loop: boolean = false
    ): void {
        if (!this.sounds.has(id)) {
            this.logger.warn(`Sound not found: ${id}`);
            return;
        }

        // Check if we've reached the maximum number of concurrent sounds
        if (this.activeSounds.size >= this.config.maxConcurrentSounds) {
            // Find the oldest non-looping sound to stop
            let oldestSound: HTMLAudioElement | null = null;
            for (const sound of this.activeSounds) {
                if (!sound.loop && (!oldestSound || sound.currentTime > oldestSound.currentTime)) {
                    oldestSound = sound;
                }
            }

            if (oldestSound) {
                oldestSound.pause();
                oldestSound.currentTime = 0;
                this.activeSounds.delete(oldestSound);
            } else {
                // If all sounds are looping, we'll skip playing this sound
                this.logger.warn('Maximum concurrent sounds reached, and no non-looping sounds to stop');
                return;
            }
        }

        // Get the sound from our preloaded collection
        const originalSound = this.sounds.get(id)!;

        // Clone the audio element to allow multiple instances of the same sound
        const sound = originalSound.cloneNode(true) as HTMLAudioElement;
        sound.loop = loop;

        // Apply volume based on sound type and master volume
        let typeVolume = 1.0;
        switch (type) {
            case SoundType.EFFECT:
                typeVolume = this.config.effectsVolume;
                break;
            case SoundType.MUSIC:
                typeVolume = this.config.musicVolume;
                break;
            case SoundType.AMBIENT:
                typeVolume = this.config.ambientVolume;
                break;
            case SoundType.UI:
                typeVolume = this.config.uiVolume;
                break;
        }

        sound.volume = volume * typeVolume * this.config.masterVolume;

        // Apply spatial audio if enabled and position is provided
        if (this.config.enableSpatialAudio && position && this.audioContext && type === SoundType.EFFECT) {
            // In a real implementation, this would create spatial audio sources
            // For now, we'll simulate distance attenuation
            const distance = position.distanceTo(this.listener.position);
            const maxDistance = 50;

            if (distance > maxDistance) {
                // Sound is too far away to hear
                return;
            }

            // Apply distance-based volume attenuation
            const attenuation = 1 - (distance / maxDistance);
            sound.volume *= attenuation;
        }

        // Play the sound
        sound.play().catch(error => {
            this.logger.warn(`Failed to play sound ${id}:`, error);
            // Some browsers require user interaction before playing audio
            this.eventSystem.emit(EventType.AUDIO_PLAY_FAILED, { id, error });
        });

        // Track active sounds
        this.activeSounds.add(sound);

        // Remove from active sounds when finished (if not looping)
        if (!loop) {
            sound.addEventListener('ended', () => {
                this.activeSounds.delete(sound);
            });
        }

        // Emit event for debugging/analytics
        this.eventSystem.emit(EventType.SOUND_PLAYED, { id, type, position });
    }

    public stopSound(id: string): void {
        // Find all instances of this sound and stop them
        this.activeSounds.forEach(sound => {
            if (sound.src.includes(id)) {
                sound.pause();
                sound.currentTime = 0;
                this.activeSounds.delete(sound);
            }
        });
    }

    public stopAllSounds(): void {
        this.activeSounds.forEach(sound => {
            sound.pause();
            sound.currentTime = 0;
        });

        this.activeSounds.clear();
    }

    public update(deltaTime: number): void {
        // Update continuous sounds based on game state
        // This would handle things like changing the pitch of skiing sounds based on speed

        // In a real implementation, this would update spatial audio sources and listeners
    }

    private updateListener(position: Vector3, orientation: Vector3): void {
        this.listener.position = position;
        this.listener.orientation = orientation;

        // In a real implementation, this would update the Web Audio API listener position
        if (this.audioContext) {
            // AudioContext listener methods would be called here
        }
    }

    public setMasterVolume(volume: number): void {
        this.config.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
    }

    public setTypeVolume(type: SoundType, volume: number): void {
        volume = Math.max(0, Math.min(1, volume));

        switch (type) {
            case SoundType.EFFECT:
                this.config.effectsVolume = volume;
                break;
            case SoundType.MUSIC:
                this.config.musicVolume = volume;
                break;
            case SoundType.AMBIENT:
                this.config.ambientVolume = volume;
                break;
            case SoundType.UI:
                this.config.uiVolume = volume;
                break;
        }

        this.updateAllVolumes();
    }

    private updateAllVolumes(): void {
        // Update volumes for all currently playing sounds
        this.activeSounds.forEach(sound => {
            // Determine sound type from URL (in a real implementation, we'd track this)
            let typeVolume = 1.0;

            if (sound.src.includes('effect')) {
                typeVolume = this.config.effectsVolume;
            } else if (sound.src.includes('music')) {
                typeVolume = this.config.musicVolume;
            } else if (sound.src.includes('ambient')) {
                typeVolume = this.config.ambientVolume;
            } else if (sound.src.includes('ui')) {
                typeVolume = this.config.uiVolume;
            }

            // Apply master volume
            sound.volume = sound.volume * this.config.masterVolume;
        });
    }

    public setConfig(config: Partial<AudioConfig>): void {
        this.config = { ...this.config, ...config };
        this.updateAllVolumes();
    }

    public getConfig(): AudioConfig {
        return this.config;
    }
}