import { Scene, Sound, Vector3, Nullable } from 'babylonjs';
import { IAudioSystem, AudioConfig, SoundCategory, SoundOptions, ISoundInstance } from './IAudioSystem';
import { AudioError } from '../../utils/errors/AudioError';
import { EventBus } from '../events/EventBus';

/**
 * Implementation of a sound instance
 */
class SoundInstance implements ISoundInstance {
    constructor(
        private sound: Sound,
        private category: SoundCategory,
        private audioSystem: AudioSystem
    ) {}

    public play(): void {
        this.sound.play();
    }

    public pause(): void {
        this.sound.pause();
    }

    public stop(): void {
        this.sound.stop();
    }

    public setVolume(volume: number): void {
        this.sound.setVolume(volume * this.audioSystem.getCategoryVolume(this.category));
    }

    public setPlaybackRate(rate: number): void {
        this.sound.setPlaybackRate(rate);
    }

    public setPosition(x: number, y: number, z: number): void {
        this.sound.setPosition(new Vector3(x, y, z));
    }

    public getCurrentTime(): number {
        return this.sound.currentTime;
    }

    public setCurrentTime(time: number): void {
        if (this.sound.isPlaying) {
            this.sound.stop();
        }
        this.sound.play(undefined, undefined, time);
    }

    public isPlaying(): boolean {
        return this.sound.isPlaying;
    }

    public isPaused(): boolean {
        return this.sound.isPaused;
    }

    public dispose(): void {
        this.sound.dispose();
    }
}

/**
 * Implementation of the audio system
 */
export class AudioSystem implements IAudioSystem {
    private static instance: AudioSystem;
    private initialized: boolean = false;
    private scene: Scene | null = null;
    private config!: Required<AudioConfig>;
    private sounds: Map<string, Sound> = new Map();
    private playingSounds: Set<SoundInstance> = new Set();
    private categoryVolumes: Map<SoundCategory, number> = new Map();
    private eventBus: EventBus;

    private constructor() {
        this.eventBus = EventBus.getInstance();
        this.initializeDefaultConfig();
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): AudioSystem {
        if (!AudioSystem.instance) {
            AudioSystem.instance = new AudioSystem();
        }
        return AudioSystem.instance;
    }

    public initialize(scene: Scene, config?: AudioConfig): void {
        if (this.initialized) {
            throw new AudioError('initialize', 'Audio System is already initialized');
        }

        this.scene = scene;
        this.config = {
            ...this.config,
            ...config
        };

        // Initialize category volumes
        Object.values(SoundCategory).forEach(category => {
            this.categoryVolumes.set(
                category,
                this.config.categoryVolumes[category] ?? 1
            );
        });

        this.initialized = true;
        this.eventBus.emit('audio:initialized', {
            success: true,
            timestamp: Date.now()
        });
    }

    public async loadSound(name: string, url: string, options?: SoundOptions): Promise<void> {
        this.checkInitialized();

        if (this.sounds.has(name)) {
            throw new AudioError('loadSound', `Sound ${name} is already loaded`);
        }

        try {
            const soundOptions = {
                ...this.config.defaultSoundOptions,
                ...options
            };

            const sound = new Sound(
                name,
                url,
                this.scene!,
                null,
                {
                    streaming: soundOptions.streaming ?? false,
                    loop: soundOptions.loop ?? false,
                    volume: soundOptions.volume ?? 1,
                    playbackRate: soundOptions.playbackRate ?? 1
                }
            );

            if (soundOptions.spatial) {
                sound.setDirectionalCone(
                    360,
                    360,
                    0
                );
                sound.distanceModel = soundOptions.spatial.distanceModel ?? 'linear';
                sound.maxDistance = soundOptions.spatial.maxDistance ?? 100;
                sound.rolloffFactor = soundOptions.spatial.rolloffFactor ?? 1;

                if (soundOptions.spatial.position) {
                    sound.setPosition(new Vector3(
                        soundOptions.spatial.position.x,
                        soundOptions.spatial.position.y,
                        soundOptions.spatial.position.z
                    ));
                }
            }

            this.sounds.set(name, sound);
            this.eventBus.emit('audio:loaded', {
                name,
                category: soundOptions.category ?? SoundCategory.SFX,
                timestamp: Date.now()
            });
        } catch (error) {
            throw new AudioError('loadSound', `Failed to load sound ${name}`, error as Error);
        }
    }

    public playSound(name: string, options?: Partial<SoundOptions>): ISoundInstance {
        this.checkInitialized();

        const sound = this.sounds.get(name);
        if (!sound) {
            throw new AudioError('playSound', `Sound ${name} not found`);
        }

        if (this.playingSounds.size >= this.config.maxConcurrentSounds) {
            this.eventBus.emit('audio:maxConcurrentSounds', {
                timestamp: Date.now(),
                count: this.playingSounds.size
            });
            return this.handleMaxConcurrentSounds(name, sound, options);
        }

        const category = options?.category ?? SoundCategory.SFX;
        const clonedSound = sound.clone();
        
        if (!clonedSound) {
            throw new AudioError('playSound', `Failed to clone sound ${name}`);
        }

        const instance = new SoundInstance(clonedSound, category, this);
        
        instance.setVolume(
            (options?.volume ?? 1) * 
            this.getCategoryVolume(category) * 
            this.config.masterVolume
        );

        if (options?.playbackRate) {
            instance.setPlaybackRate(options.playbackRate);
        }

        if (options?.spatial?.position) {
            instance.setPosition(
                options.spatial.position.x,
                options.spatial.position.y,
                options.spatial.position.z
            );
        }

        this.playingSounds.add(instance);
        instance.play();

        this.eventBus.emit('audio:played', {
            name,
            category,
            timestamp: Date.now()
        });

        return instance;
    }

    public stopCategory(category: SoundCategory): void {
        this.checkInitialized();

        for (const instance of this.playingSounds) {
            if (instance instanceof SoundInstance) {
                instance.stop();
            }
        }

        this.eventBus.emit('audio:categoryStop', {
            category,
            timestamp: Date.now()
        });
    }

    public setCategoryVolume(category: SoundCategory, volume: number): void {
        this.checkInitialized();
        this.categoryVolumes.set(category, Math.max(0, Math.min(1, volume)));

        // Update all playing sounds in this category
        for (const instance of this.playingSounds) {
            if (instance instanceof SoundInstance) {
                instance.setVolume(instance.getCurrentTime() * volume);
            }
        }

        this.eventBus.emit('audio:categoryVolume', {
            category,
            volume,
            timestamp: Date.now()
        });
    }

    public setMasterVolume(volume: number): void {
        this.checkInitialized();
        this.config.masterVolume = Math.max(0, Math.min(1, volume));

        // Update all playing sounds
        for (const instance of this.playingSounds) {
            if (instance instanceof SoundInstance) {
                instance.setVolume(instance.getCurrentTime());
            }
        }

        this.eventBus.emit('audio:masterVolume', {
            volume,
            timestamp: Date.now()
        });
    }

    public pauseAll(): void {
        this.checkInitialized();

        for (const instance of this.playingSounds) {
            if (instance instanceof SoundInstance) {
                instance.pause();
            }
        }

        this.eventBus.emit('audio:pauseAll', {
            timestamp: Date.now()
        });
    }

    public resumeAll(): void {
        this.checkInitialized();

        for (const instance of this.playingSounds) {
            if (instance instanceof SoundInstance) {
                instance.play();
            }
        }

        this.eventBus.emit('audio:resumeAll', {
            timestamp: Date.now()
        });
    }

    public stopAll(): void {
        this.checkInitialized();

        for (const instance of this.playingSounds) {
            if (instance instanceof SoundInstance) {
                instance.stop();
                instance.dispose();
            }
        }

        this.playingSounds.clear();
        this.eventBus.emit('audio:stopAll', {
            timestamp: Date.now()
        });
    }

    public isLoaded(name: string): boolean {
        return this.sounds.has(name);
    }

    public getPlayingCount(): number {
        return this.playingSounds.size;
    }

    public dispose(): void {
        this.stopAll();

        for (const sound of this.sounds.values()) {
            sound.dispose();
        }

        this.sounds.clear();
        this.initialized = false;
        this.scene = null;

        this.eventBus.emit('audio:disposed', {
            timestamp: Date.now()
        });
    }

    /**
     * Get the volume for a category
     * @internal
     */
    public getCategoryVolume(category: SoundCategory): number {
        return this.categoryVolumes.get(category) ?? 1;
    }

    private checkInitialized(): void {
        if (!this.initialized || !this.scene) {
            throw new AudioError('checkInitialized', 'Audio System is not initialized');
        }
    }

    private initializeDefaultConfig(): void {
        this.config = {
            masterVolume: 1,
            categoryVolumes: Object.values(SoundCategory).reduce((acc, category) => {
                acc[category] = 1;
                return acc;
            }, {} as Record<SoundCategory, number>),
            useWebAudio: true,
            maxConcurrentSounds: 32,
            defaultSoundOptions: {
                volume: 1,
                playbackRate: 1,
                loop: false,
                streaming: false,
                category: SoundCategory.SFX
            }
        };
    }

    private handleMaxConcurrentSounds(name: string, sound: Sound, options?: Partial<SoundOptions>): ISoundInstance {
        // Find the oldest non-music sound and stop it
        let oldestInstance: SoundInstance | null = null;
        let oldestTime = Infinity;

        for (const instance of this.playingSounds) {
            if (instance instanceof SoundInstance) {
                const time = instance.getCurrentTime();
                if (time < oldestTime) {
                    oldestTime = time;
                    oldestInstance = instance;
                }
            }
        }

        if (oldestInstance) {
            oldestInstance.stop();
            oldestInstance.dispose();
            this.playingSounds.delete(oldestInstance);
        }

        return this.playSound(name, options);
    }
} 