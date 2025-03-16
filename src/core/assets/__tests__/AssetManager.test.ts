import { Scene, Engine, Texture, Sound, Material, CubeTexture, ParticleSystem, SceneLoader } from 'babylonjs';
import { AssetManager } from '../AssetManager';
import { AssetType, AssetManagerConfig } from '../IAssetManager';
import { AssetError } from '../../../utils/errors/AssetError';
import { EventBus } from '../../events/EventBus';

// Mock Babylon.js classes and functions
jest.mock('babylonjs', () => ({
    Scene: jest.fn().mockImplementation(() => ({
        dispose: jest.fn()
    })),
    Engine: jest.fn(),
    Texture: jest.fn().mockImplementation(() => ({
        dispose: jest.fn()
    })),
    Sound: jest.fn().mockImplementation(() => ({
        dispose: jest.fn()
    })),
    Material: jest.fn().mockImplementation(() => ({
        dispose: jest.fn()
    })),
    CubeTexture: jest.fn().mockImplementation(() => ({
        dispose: jest.fn()
    })),
    ParticleSystem: jest.fn().mockImplementation(() => ({
        dispose: jest.fn()
    })),
    SceneLoader: {
        ImportMeshAsync: jest.fn().mockResolvedValue({
            meshes: [],
            particleSystems: [],
            skeletons: [],
            animationGroups: []
        })
    }
}));

describe('AssetManager', () => {
    let assetManager: AssetManager;
    let scene: Scene;
    let eventBus: EventBus;
    let mockConfig: AssetManagerConfig;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Create test instances
        scene = new Scene({} as Engine);
        eventBus = EventBus.getInstance();
        assetManager = AssetManager.getInstance();
        
        // Setup mock config
        mockConfig = {
            baseUrl: 'http://test.com/assets',
            useCdn: true,
            maxConcurrentLoads: 3,
            useCache: true,
            timeout: 5000
        };
    });

    afterEach(() => {
        assetManager.dispose();
    });

    describe('Initialization', () => {
        it('should initialize with valid config', () => {
            // Act
            assetManager.initialize(mockConfig);

            // Assert
            expect(() => assetManager.setScene(scene)).not.toThrow();
        });

        it('should throw error when initializing twice', () => {
            // Arrange
            assetManager.initialize(mockConfig);

            // Act & Assert
            expect(() => assetManager.initialize(mockConfig))
                .toThrow(AssetError);
        });

        it('should use default values for optional config', () => {
            // Arrange
            const minimalConfig = { baseUrl: 'http://test.com/assets' };

            // Act
            assetManager.initialize(minimalConfig);

            // Assert
            expect(() => assetManager.setScene(scene)).not.toThrow();
        });
    });

    describe('Asset Loading', () => {
        beforeEach(() => {
            assetManager.initialize(mockConfig);
            assetManager.setScene(scene);
        });

        it('should load a texture asset', async () => {
            // Act
            const texture = await assetManager.loadAsset(
                AssetType.TEXTURE,
                'test-texture',
                'texture.png'
            );

            // Assert
            expect(Texture).toHaveBeenCalled();
            expect(assetManager.isLoaded('test-texture')).toBe(true);
        });

        it('should load a model asset', async () => {
            // Act
            const model = await assetManager.loadAsset(
                AssetType.MODEL,
                'test-model',
                'model.glb'
            );

            // Assert
            expect(SceneLoader.ImportMeshAsync).toHaveBeenCalled();
            expect(assetManager.isLoaded('test-model')).toBe(true);
        });

        it('should return cached asset if already loaded', async () => {
            // Arrange
            const texture = await assetManager.loadAsset(
                AssetType.TEXTURE,
                'test-texture',
                'texture.png'
            );

            // Act
            const cachedTexture = await assetManager.loadAsset(
                AssetType.TEXTURE,
                'test-texture',
                'texture.png'
            );

            // Assert
            expect(Texture).toHaveBeenCalledTimes(1);
            expect(cachedTexture).toBe(texture);
        });

        it('should handle custom loader', async () => {
            // Arrange
            const customLoader = jest.fn().mockResolvedValue({ custom: true });

            // Act
            const asset = await assetManager.loadAsset(
                AssetType.TEXTURE,
                'custom-asset',
                'custom.png',
                { customLoader }
            );

            // Assert
            expect(customLoader).toHaveBeenCalled();
            expect(asset).toEqual({ custom: true });
        });

        it('should throw error for unsupported asset type', async () => {
            // Act & Assert
            await expect(assetManager.loadAsset(
                'invalid' as AssetType,
                'test',
                'test.png'
            )).rejects.toThrow(AssetError);
        });
    });

    describe('Batch Loading', () => {
        beforeEach(() => {
            assetManager.initialize(mockConfig);
            assetManager.setScene(scene);
        });

        it('should load multiple assets concurrently', async () => {
            // Arrange
            const assets = [
                { type: AssetType.TEXTURE, name: 'texture1', url: 'texture1.png' },
                { type: AssetType.TEXTURE, name: 'texture2', url: 'texture2.png' },
                { type: AssetType.MODEL, name: 'model1', url: 'model1.glb' }
            ];

            // Act
            const results = await assetManager.loadAssets(assets);

            // Assert
            expect(results.size).toBe(3);
            expect(assetManager.isLoaded('texture1')).toBe(true);
            expect(assetManager.isLoaded('texture2')).toBe(true);
            expect(assetManager.isLoaded('model1')).toBe(true);
        });

        it('should report progress during batch loading', async () => {
            // Arrange
            const assets = [
                { type: AssetType.TEXTURE, name: 'texture1', url: 'texture1.png' },
                { type: AssetType.TEXTURE, name: 'texture2', url: 'texture2.png' }
            ];
            const onProgress = jest.fn();

            // Act
            await assetManager.loadAssets(assets, onProgress);

            // Assert
            expect(onProgress).toHaveBeenCalled();
            const lastProgress = onProgress.mock.calls[onProgress.mock.calls.length - 1][0];
            expect(lastProgress.progress).toBe(100);
        });
    });

    describe('Asset Management', () => {
        beforeEach(() => {
            assetManager.initialize(mockConfig);
            assetManager.setScene(scene);
        });

        it('should unload and dispose asset', async () => {
            // Arrange
            const texture = await assetManager.loadAsset(
                AssetType.TEXTURE,
                'test-texture',
                'texture.png'
            );

            // Act
            assetManager.unloadAsset('test-texture', true);

            // Assert
            expect(texture.dispose).toHaveBeenCalled();
            expect(assetManager.isLoaded('test-texture')).toBe(false);
        });

        it('should clear all assets', async () => {
            // Arrange
            await assetManager.loadAsset(AssetType.TEXTURE, 'texture1', 'texture1.png');
            await assetManager.loadAsset(AssetType.TEXTURE, 'texture2', 'texture2.png');

            // Act
            assetManager.clear();

            // Assert
            expect(assetManager.isLoaded('texture1')).toBe(false);
            expect(assetManager.isLoaded('texture2')).toBe(false);
        });

        it('should track loading progress', async () => {
            // Arrange
            const assets = [
                { type: AssetType.TEXTURE, name: 'texture1', url: 'texture1.png' },
                { type: AssetType.TEXTURE, name: 'texture2', url: 'texture2.png' }
            ];

            // Act
            const loadPromise = assetManager.loadAssets(assets);
            const progress = assetManager.getLoadingProgress();

            // Assert
            expect(progress.total).toBe(2);
            await loadPromise;
            const finalProgress = assetManager.getLoadingProgress();
            expect(finalProgress.progress).toBe(100);
        });
    });

    describe('Error Handling', () => {
        beforeEach(() => {
            assetManager.initialize(mockConfig);
            assetManager.setScene(scene);
        });

        it('should handle loading failure', async () => {
            // Arrange
            const error = new Error('Network error');
            const mockTexture = Texture as jest.MockedClass<typeof Texture>;
            mockTexture.mockImplementationOnce(() => {
                throw error;
            });

            // Act & Assert
            await expect(assetManager.loadAsset(
                AssetType.TEXTURE,
                'failed-texture',
                'texture.png'
            )).rejects.toThrow(AssetError);
        });

        it('should handle missing scene', async () => {
            // Arrange
            assetManager.dispose();
            assetManager.initialize(mockConfig);

            // Act & Assert
            await expect(assetManager.loadAsset(
                AssetType.TEXTURE,
                'test',
                'test.png'
            )).rejects.toThrow(AssetError);
        });

        it('should handle missing asset', () => {
            // Act & Assert
            expect(() => assetManager.getAsset('non-existent'))
                .toThrow(AssetError);
        });
    });
}); 