import { Scene, Engine, Sound } from 'babylonjs';
import { AudioSystem } from './AudioSystem';
import { AudioError } from '../../utils/errors/AudioError';
import { SoundCategory } from './IAudioSystem';
import { EventBus } from '../events/EventBus';

// Create proper mock type for Sound
type MockSound = jest.Mocked<Sound> & {
    setDirectionalCone: jest.Mock;
    setPosition: jest.Mock;
    play: jest.Mock;
    pause: jest.Mock;
    stop: jest.Mock;
    dispose: jest.Mock;
    clone: jest.Mock;
};

jest.mock('babylonjs', () => ({
    Scene: jest.fn(),
    Engine: jest.fn(),
    Sound: jest.fn().mockImplementation(() => ({
        setDirectionalCone: jest.fn(),
        setPosition: jest.fn(),
        play: jest.fn(),
        pause: jest.fn(),
        stop: jest.fn(),
        dispose: jest.fn(),
        clone: jest.fn()
    }))
}));
jest.mock('../events/EventBus');

describe('AudioSystem', () => {
    let audioSystem: AudioSystem;
    let mockScene: jest.Mocked<Scene>;
    let mockEngine: jest.Mocked<Engine>;
    let mockEventBus: jest.Mocked<EventBus>;
    let mockSound: MockSound;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Create mock scene and engine
        mockEngine = new Engine(null) as jest.Mocked<Engine>;
        mockScene = new Scene(mockEngine) as jest.Mocked<Scene>;
        mockEventBus = EventBus.getInstance() as jest.Mocked<EventBus>;
        mockSound = new Sound('test', 'test.mp3', mockScene) as unknown as MockSound;

        // Setup default mock implementations
        (Sound as unknown as jest.Mock).mockImplementation(() => mockSound);
        mockSound.clone.mockReturnValue(mockSound);

        // Get AudioSystem instance
        audioSystem = AudioSystem.getInstance();
    });

    afterEach(() => {
        audioSystem.dispose();
    });

    describe('Initialization', () => {
        it('should initialize with default config', () => {
            audioSystem.initialize(mockScene);
            expect(mockEventBus.emit).toHaveBeenCalledWith('audio:initialized', expect.any(Object));
        });

        it('should initialize with custom config', () => {
            const config = {
                masterVolume: 0.5,
                maxConcurrentSounds: 16,
                useWebAudio: true
            };
            audioSystem.initialize(mockScene, config);
            expect(mockEventBus.emit).toHaveBeenCalledWith('audio:initialized', expect.any(Object));
        });

        it('should throw error when initializing twice', () => {
            audioSystem.initialize(mockScene);
            expect(() => audioSystem.initialize(mockScene)).toThrow(AudioError);
        });
    });

    describe('Sound Loading', () => {
        beforeEach(() => {
            audioSystem.initialize(mockScene);
            // Reset mock implementation for each test
            (Sound as unknown as jest.Mock).mockImplementation(() => mockSound);
        });

        it('should load sound successfully', async () => {
            await audioSystem.loadSound('test', 'test.mp3');
            expect(Sound).toHaveBeenCalled();
            expect(mockEventBus.emit).toHaveBeenCalledWith('audio:loaded', expect.any(Object));
        });

        it('should load sound with spatial options', async () => {
            await audioSystem.loadSound('test', 'test.mp3', {
                spatial: {
                    position: { x: 1, y: 2, z: 3 },
                    maxDistance: 100,
                    distanceModel: 'linear'
                }
            });

            expect(mockSound.setDirectionalCone).toHaveBeenCalled();
            expect(mockSound.setPosition).toHaveBeenCalled();
        });

        it('should throw error when loading duplicate sound', async () => {
            await audioSystem.loadSound('test', 'test.mp3');
            await expect(audioSystem.loadSound('test', 'test.mp3')).rejects.toThrow(AudioError);
        });
    });

    describe('Sound Playback', () => {
        beforeEach(async () => {
            audioSystem.initialize(mockScene);
            await audioSystem.loadSound('test', 'test.mp3');
        });

        it('should play sound successfully', async () => {
            mockSound.clone.mockReturnValue(mockSound);
            
            const instance = audioSystem.playSound('test');
            
            expect(mockSound.play).toHaveBeenCalled();
            expect(mockEventBus.emit).toHaveBeenCalledWith('audio:played', expect.any(Object));
        });

        it('should handle maximum concurrent sounds', async () => {
            // Play max + 1 sounds
            for (let i = 0; i < 33; i++) {
                audioSystem.playSound('test');
            }

            expect(mockEventBus.emit).toHaveBeenCalledWith('audio:maxConcurrentSounds', expect.any(Object));
        });

        it('should throw error when playing non-existent sound', () => {
            expect(() => audioSystem.playSound('nonexistent')).toThrow(AudioError);
        });
    });

    describe('Volume Control', () => {
        beforeEach(async () => {
            audioSystem.initialize(mockScene);
            await audioSystem.loadSound('test', 'test.mp3', { category: SoundCategory.MUSIC });
        });

        it('should set master volume', async () => {
            const instance = audioSystem.playSound('test');
            
            audioSystem.setMasterVolume(0.5);
            expect(mockEventBus.emit).toHaveBeenCalledWith('audio:masterVolume', expect.any(Object));
        });

        it('should set category volume', async () => {
            const instance = audioSystem.playSound('test');
            
            audioSystem.setCategoryVolume(SoundCategory.MUSIC, 0.5);
            expect(mockEventBus.emit).toHaveBeenCalledWith('audio:categoryVolume', expect.any(Object));
        });
    });

    describe('Sound Control', () => {
        beforeEach(async () => {
            audioSystem.initialize(mockScene);
            await audioSystem.loadSound('test', 'test.mp3');
        });

        it('should pause all sounds', async () => {
            const instance = audioSystem.playSound('test');
            
            audioSystem.pauseAll();
            expect(mockSound.pause).toHaveBeenCalled();
            expect(mockEventBus.emit).toHaveBeenCalledWith('audio:pauseAll', expect.any(Object));
        });

        it('should resume all sounds', async () => {
            const instance = audioSystem.playSound('test');
            
            audioSystem.pauseAll();
            audioSystem.resumeAll();
            expect(mockSound.play).toHaveBeenCalled();
            expect(mockEventBus.emit).toHaveBeenCalledWith('audio:resumeAll', expect.any(Object));
        });

        it('should stop all sounds', async () => {
            const instance = audioSystem.playSound('test');
            
            audioSystem.stopAll();
            expect(mockSound.stop).toHaveBeenCalled();
            expect(mockSound.dispose).toHaveBeenCalled();
            expect(mockEventBus.emit).toHaveBeenCalledWith('audio:stopAll', expect.any(Object));
        });
    });

    describe('Resource Management', () => {
        beforeEach(async () => {
            audioSystem.initialize(mockScene);
            await audioSystem.loadSound('test', 'test.mp3');
        });

        it('should check if sound is loaded', async () => {
            expect(audioSystem.isLoaded('test')).toBe(true);
            expect(audioSystem.isLoaded('nonexistent')).toBe(false);
        });

        it('should get playing count', async () => {
            audioSystem.playSound('test');
            expect(audioSystem.getPlayingCount()).toBe(1);
        });

        it('should dispose system properly', async () => {
            audioSystem.playSound('test');
            
            audioSystem.dispose();
            expect(mockSound.dispose).toHaveBeenCalled();
            expect(mockEventBus.emit).toHaveBeenCalledWith('audio:disposed', expect.any(Object));
        });
    });

    describe('Edge Cases', () => {
        beforeEach(() => {
            audioSystem.initialize(mockScene);
        });

        it('should handle invalid volume values', () => {
            expect(() => audioSystem.setMasterVolume(-1)).toThrow(AudioError);
            expect(() => audioSystem.setMasterVolume(1.5)).toThrow(AudioError);
            expect(() => audioSystem.setCategoryVolume(SoundCategory.MUSIC, -0.5)).toThrow(AudioError);
        });

        it('should handle sound loading failures', async () => {
            const errorSound = {
                ...mockSound,
                _isReadyToPlay: false,
                isReady: () => false
            };
            (Sound as unknown as jest.Mock).mockImplementation(() => errorSound);

            await expect(audioSystem.loadSound('test', 'test.mp3')).rejects.toThrow(AudioError);
            expect(mockEventBus.emit).toHaveBeenCalledWith('audio:error', expect.any(Object));
        });

        it('should handle invalid spatial audio configurations', async () => {
            await expect(audioSystem.loadSound('test', 'test.mp3', {
                spatial: {
                    position: { x: Infinity, y: 0, z: 0 },
                    maxDistance: -1,
                    distanceModel: 'invalid' as any
                }
            })).rejects.toThrow(AudioError);
        });

        it('should handle rapid play/pause/stop sequences', async () => {
            const instance = audioSystem.playSound('test');
            
            // Rapid sequence of operations
            audioSystem.pauseAll();
            audioSystem.resumeAll();
            audioSystem.stopAll();
            audioSystem.playSound('test');
            audioSystem.pauseAll();
            
            expect(mockSound.play).toHaveBeenCalled();
            expect(mockSound.pause).toHaveBeenCalled();
            expect(mockSound.stop).toHaveBeenCalled();
        });

        it('should handle memory cleanup after errors', async () => {
            mockSound.clone.mockImplementation(() => {
                throw new Error('Clone failed');
            });

            expect(() => audioSystem.playSound('test')).toThrow(AudioError);
            expect(audioSystem.getPlayingCount()).toBe(0);
        });
    });

    describe('Performance', () => {
        beforeEach(async () => {
            audioSystem.initialize(mockScene);
            await audioSystem.loadSound('test', 'test.mp3', { category: SoundCategory.MUSIC });
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should handle rapid sound loading', async () => {
            const loadPromises = Array.from({ length: 50 }, (_, i) => 
                audioSystem.loadSound(`test${i}`, 'test.mp3')
            );

            await Promise.all(loadPromises);
            expect(mockEventBus.emit).toHaveBeenCalledTimes(50);
        });

        it('should handle concurrent sound operations', async () => {
            // Simulate multiple concurrent operations
            const operations = [
                audioSystem.playSound('test'),
                audioSystem.setMasterVolume(0.5),
                audioSystem.setCategoryVolume(SoundCategory.SFX, 0.7),
                audioSystem.pauseAll(),
                audioSystem.resumeAll()
            ];

            await Promise.all(operations);
            expect(mockEventBus.emit).toHaveBeenCalled();
        });

        it('should maintain performance with many active sounds', async () => {
            const startTime = performance.now();
            
            // Create many sound instances
            for (let i = 0; i < 100; i++) {
                audioSystem.playSound('test');
            }
            
            const endTime = performance.now();
            expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
        });

        it('should handle rapid category volume changes', async () => {
            audioSystem.playSound('test');
            
            const startTime = performance.now();
            
            // Rapid volume changes
            for (let i = 0; i < 100; i++) {
                audioSystem.setCategoryVolume(SoundCategory.MUSIC, Math.random());
            }
            
            const endTime = performance.now();
            expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
        });
    });
}); 