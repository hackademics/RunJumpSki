import { Scene, Texture, SceneLoader, Sound, Material, CubeTexture, ParticleSystem } from 'babylonjs';
import { IAssetManager, AssetType, AssetManagerConfig, AssetLoadOptions, AssetLoadProgress } from './IAssetManager';
import { AssetError } from '../../utils/errors/AssetError';
import { EventBus } from '../events/EventBus';

/**
 * Implementation of the asset management system
 */
export class AssetManager implements IAssetManager {
    private static instance: AssetManager;
    private initialized: boolean = false;
    private config: AssetManagerConfig | null = null;
    private assets: Map<string, any> = new Map();
    private loadingAssets: Map<string, Promise<any>> = new Map();
    private scene: Scene | null = null;
    private loadingProgress: AssetLoadProgress = {
        total: 0,
        loaded: 0,
        currentAsset: '',
        progress: 0
    };
    private eventBus: EventBus;

    private constructor() {
        this.eventBus = EventBus.getInstance();
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): AssetManager {
        if (!AssetManager.instance) {
            AssetManager.instance = new AssetManager();
        }
        return AssetManager.instance;
    }

    public initialize(config: AssetManagerConfig): void {
        if (this.initialized) {
            throw new AssetError('initialization', 'Asset Manager is already initialized');
        }

        this.config = {
            baseUrl: config.baseUrl,
            useCdn: config.useCdn ?? false,
            maxConcurrentLoads: config.maxConcurrentLoads ?? 5,
            useCache: config.useCache ?? true,
            timeout: config.timeout ?? 30000
        };

        this.initialized = true;
        this.eventBus.emit('assets:initialized', {
            success: true,
            timestamp: Date.now()
        });
    }

    public setScene(scene: Scene): void {
        this.scene = scene;
    }

    public async loadAsset(type: AssetType, name: string, url: string, options?: AssetLoadOptions): Promise<any> {
        this.checkInitialized();
        this.checkScene();

        // Check if asset is already loaded
        if (this.assets.has(name) && (options?.cache ?? this.config!.useCache)) {
            return this.assets.get(name);
        }

        // Check if asset is currently loading
        if (this.loadingAssets.has(name)) {
            return this.loadingAssets.get(name);
        }

        try {
            const loadPromise = this.loadAssetByType(type, name, url, options);
            this.loadingAssets.set(name, loadPromise);

            const asset = await loadPromise;
            
            if (options?.cache ?? this.config!.useCache) {
                this.assets.set(name, asset);
            }

            this.loadingAssets.delete(name);
            this.eventBus.emit('asset:loaded', {
                name,
                type,
                timestamp: Date.now()
            });

            return asset;
        } catch (error) {
            this.loadingAssets.delete(name);
            throw new AssetError('loadAsset', `Failed to load asset ${name}`, error as Error);
        }
    }

    public async loadAssets(assets: Array<{
        type: AssetType;
        name: string;
        url: string;
        options?: AssetLoadOptions;
    }>, onProgress?: (progress: AssetLoadProgress) => void): Promise<Map<string, any>> {
        this.checkInitialized();

        this.loadingProgress = {
            total: assets.length,
            loaded: 0,
            currentAsset: '',
            progress: 0
        };

        const results = new Map<string, any>();
        const chunks: Array<typeof assets> = [];
        
        // Split assets into chunks based on maxConcurrentLoads
        for (let i = 0; i < assets.length; i += this.config!.maxConcurrentLoads!) {
            chunks.push(assets.slice(i, i + this.config!.maxConcurrentLoads!));
        }

        try {
            for (const chunk of chunks) {
                await Promise.all(chunk.map(async (asset) => {
                    this.loadingProgress.currentAsset = asset.name;
                    
                    const result = await this.loadAsset(
                        asset.type,
                        asset.name,
                        asset.url,
                        asset.options
                    );

                    results.set(asset.name, result);
                    this.loadingProgress.loaded++;
                    this.loadingProgress.progress = (this.loadingProgress.loaded / this.loadingProgress.total) * 100;

                    if (onProgress) {
                        onProgress(this.loadingProgress);
                    }
                }));
            }

            return results;
        } catch (error) {
            throw new AssetError('loadAssets', 'Failed to load multiple assets', error as Error);
        }
    }

    public getAsset(name: string): any {
        this.checkInitialized();

        if (!this.assets.has(name)) {
            throw new AssetError('getAsset', `Asset ${name} not found`);
        }

        return this.assets.get(name);
    }

    public isLoaded(name: string): boolean {
        return this.assets.has(name);
    }

    public unloadAsset(name: string, removeFromCache: boolean = false): void {
        this.checkInitialized();

        const asset = this.assets.get(name);
        if (asset) {
            if (asset.dispose) {
                asset.dispose();
            }
            
            if (removeFromCache) {
                this.assets.delete(name);
            }

            this.eventBus.emit('asset:unloaded', { name });
        }
    }

    public clear(): void {
        this.checkInitialized();

        // Dispose all assets that have a dispose method
        this.assets.forEach((asset, name) => {
            if (asset.dispose) {
                asset.dispose();
            }
        });

        this.assets.clear();
        this.loadingAssets.clear();
        this.resetProgress();
        this.eventBus.emit('assets:cleared', {
            timestamp: Date.now()
        });
    }

    public getLoadingProgress(): AssetLoadProgress {
        return { ...this.loadingProgress };
    }

    public dispose(): void {
        this.clear();
        this.initialized = false;
        this.config = null;
    }

    private checkInitialized(): void {
        if (!this.initialized || !this.config) {
            throw new AssetError('checkInitialized', 'Asset Manager is not initialized');
        }
    }

    private resetProgress(): void {
        this.loadingProgress = {
            total: 0,
            loaded: 0,
            currentAsset: '',
            progress: 0
        };
    }

    private checkScene(): void {
        if (!this.scene) {
            throw new AssetError('checkScene', 'Scene is not set. Call setScene() before loading assets.');
        }
    }

    private async loadAssetByType(type: AssetType, name: string, url: string, options?: AssetLoadOptions): Promise<any> {
        if (options?.customLoader) {
            return options.customLoader(this.scene!, url);
        }

        const fullUrl = this.config!.useCdn ? 
            `${this.config!.baseUrl}/${url}` : 
            url;

        switch (type) {
            case AssetType.TEXTURE:
                return new Texture(fullUrl, this.scene!);

            case AssetType.MODEL:
                return SceneLoader.ImportMeshAsync('', '', fullUrl, this.scene!);

            case AssetType.SOUND:
                return new Sound(name, fullUrl, this.scene!, null, {
                    streaming: true,
                    ...options
                });

            case AssetType.MATERIAL:
                return new Material(name, this.scene!);

            case AssetType.ENVIRONMENT:
                return new CubeTexture(fullUrl, this.scene!);

            case AssetType.PARTICLE:
                return new ParticleSystem(name, 2000, this.scene!);

            default:
                throw new AssetError('loadAssetByType', `Unsupported asset type: ${type}`);
        }
    }
} 