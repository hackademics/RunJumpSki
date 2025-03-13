import { Engine } from './engine';
import { EventSystem, EventType } from './events';
import { Logger } from '../utils/logger';

export enum AssetType {
    TEXTURE = 'texture',
    MODEL = 'model',
    AUDIO = 'audio',
    SHADER = 'shader',
    CONFIG = 'config'
}

interface Asset {
    id: string;
    type: AssetType;
    url: string;
    loaded: boolean;
    data: any;
}

export interface AssetManagerConfig {
    baseUrl: string;
    maxConcurrentLoads: number;
    preloadEnabled: boolean;
}

// Placeholder for actual asset management implementation
export class AssetManager {
    private engine: Engine;
    private eventSystem: EventSystem;
    private logger: Logger;
    private assets: Map<string, Asset> = new Map();
    private loadingQueue: string[] = [];
    private activeLoads: number = 0;
    private config: AssetManagerConfig;

    constructor(engine: Engine) {
        this.engine = engine;
        this.eventSystem = engine.getEventSystem();
        this.logger = new Logger('AssetManager');

        this.config = {
            baseUrl: 'assets/',
            maxConcurrentLoads: 8,
            preloadEnabled: true
        };
    }

    public initialize(): void {
        this.logger.info('Asset Manager initialized');

        // Register common assets
        this.registerCommonAssets();

        if (this.config.preloadEnabled) {
            this.preloadAssets();
        }

        this.eventSystem.emit(EventType.ASSET_MANAGER_INITIALIZED, {});
    }

    private registerCommonAssets(): void {
        // Register textures
        this.registerAsset('terrain_snow', AssetType.TEXTURE, 'textures/terrain_snow.png');
        this.registerAsset('terrain_ice', AssetType.TEXTURE, 'textures/terrain_ice.png');
        this.registerAsset('terrain_rock', AssetType.TEXTURE, 'textures/terrain_rock.png');
        this.registerAsset('terrain_metal', AssetType.TEXTURE, 'textures/terrain_metal.png');
        this.registerAsset('sky', AssetType.TEXTURE, 'textures/sky.png');

        // Register models
        this.registerAsset('player', AssetType.MODEL, 'models/player.obj');
        this.registerAsset('jetpack', AssetType.MODEL, 'models/jetpack.obj');
        this.registerAsset('ski', AssetType.MODEL, 'models/ski.obj');
        this.registerAsset('target', AssetType.MODEL, 'models/target.obj');
        this.registerAsset('turret', AssetType.MODEL, 'models/turret.obj');

        // Register audio assets - these will be loaded by the AudioManager
        this.registerAsset('ski_start', AssetType.AUDIO, 'audio/ski_start.mp3');
        this.registerAsset('ski_loop', AssetType.AUDIO, 'audio/ski_loop.mp3');
        this.registerAsset('jetpack_start', AssetType.AUDIO, 'audio/jetpack_start.mp3');
        this.registerAsset('jetpack_loop', AssetType.AUDIO, 'audio/jetpack_loop.mp3');
        this.registerAsset('jetpack_end', AssetType.AUDIO, 'audio/jetpack_end.mp3');
        this.registerAsset('impact', AssetType.AUDIO, 'audio/impact.mp3');

        // Register shaders
        this.registerAsset('terrain_shader', AssetType.SHADER, 'shaders/terrain.glsl');
        this.registerAsset('sky_shader', AssetType.SHADER, 'shaders/sky.glsl');
        this.registerAsset('player_shader', AssetType.SHADER, 'shaders/player.glsl');

        // Register configuration files
        this.registerAsset('physics_config', AssetType.CONFIG, 'config/physics.json');
        this.registerAsset('input_config', AssetType.CONFIG, 'config/input.json');
        this.registerAsset('level_config', AssetType.CONFIG, 'config/level.json');
    }

    public registerAsset(id: string, type: AssetType, url: string): void {
        if (this.assets.has(id)) {
            this.logger.warn(`Asset with ID '${id}' already registered`);
            return;
        }

        const asset: Asset = {
            id,
            type,
            url: `${this.config.baseUrl}${url}`,
            loaded: false,
            data: null
        };

        this.assets.set(id, asset);
        this.logger.debug(`Registered asset: ${id} (${type})`);
    }

    public preloadAssets(): void {
        // Add all registered assets to the loading queue
        this.assets.forEach((asset) => {
            this.loadingQueue.push(asset.id);
        });

        // Start loading process
        this.processLoadingQueue();

        this.logger.info(`Preloading ${this.loadingQueue.length} assets`);
    }

    private processLoadingQueue(): void {
        // Process as many items as allowed by maxConcurrentLoads
        while (this.loadingQueue.length > 0 && this.activeLoads < this.config.maxConcurrentLoads) {
            const assetId = this.loadingQueue.shift()!;
            this.loadAsset(assetId);
        }
    }

    public loadAsset(id: string): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.assets.has(id)) {
                const error = `Asset with ID '${id}' not registered`;
                this.logger.error(error);
                reject(new Error(error));
                return;
            }

            const asset = this.assets.get(id)!;

            if (asset.loaded) {
                resolve(asset.data);
                return;
            }

            this.activeLoads++;

            // In a real implementation, this would actually load the asset based on its type
            // For now, we'll simulate loading with a timeout
            setTimeout(() => {
                // Simulate successful loading
                asset.loaded = true;

                // Create mock data based on asset type
                switch (asset.type) {
                    case AssetType.TEXTURE:
                        asset.data = { width: 1024, height: 1024, format: 'rgba' };
                        break;
                    case AssetType.MODEL:
                        asset.data = { vertices: 1000, triangles: 500 };
                        break;
                    case AssetType.AUDIO:
                        asset.data = { duration: 5.0, channels: 2 };
                        break;
                    case AssetType.SHADER:
                        asset.data = { vertex: 'void main() {}', fragment: 'void main() {}' };
                        break;
                    case AssetType.CONFIG:
                        asset.data = { version: '1.0', settings: {} };
                        break;
                }

                this.activeLoads--;
                this.logger.debug(`Loaded asset: ${id}`);

                // Notify other systems that this asset is loaded
                this.eventSystem.emit(EventType.ASSET_LOADED, { id, type: asset.type });

                // Continue processing the queue if there are more items
                if (this.loadingQueue.length > 0) {
                    this.processLoadingQueue();
                } else if (this.activeLoads === 0) {
                    // All assets are loaded
                    this.eventSystem.emit(EventType.ALL_ASSETS_LOADED, {});
                    this.logger.info('All assets loaded');
                }

                resolve(asset.data);
            }, Math.random() * 500); // Simulate variable loading times
        });
    }

    public getAsset(id: string): any {
        if (!this.assets.has(id)) {
            this.logger.warn(`Asset with ID '${id}' not found`);
            return null;
        }

        const asset = this.assets.get(id)!;

        if (!asset.loaded) {
            this.logger.warn(`Asset with ID '${id}' not yet loaded`);
            // Add to loading queue if not already there
            if (!this.loadingQueue.includes(id)) {
                this.loadingQueue.push(id);
                this.processLoadingQueue();
            }
            return null;
        }

        return asset.data;
    }

    public isLoaded(id: string): boolean {
        if (!this.assets.has(id)) {
            return false;
        }

        return this.assets.get(id)!.loaded;
    }

    public waitForAsset(id: string): Promise<any> {
        if (!this.assets.has(id)) {
            return Promise.reject(new Error(`Asset with ID '${id}' not registered`));
        }

        const asset = this.assets.get(id)!;

        if (asset.loaded) {
            return Promise.resolve(asset.data);
        }

        // If asset is not loaded, load it and return the promise
        return this.loadAsset(id);
    }

    public waitForAllAssets(): Promise<void> {
        const promises: Promise<any>[] = [];

        this.assets.forEach((asset) => {
            if (!asset.loaded) {
                promises.push(this.loadAsset(asset.id));
            }
        });

        return Promise.all(promises).then(() => { });
    }

    public unloadAsset(id: string): void {
        if (!this.assets.has(id)) {
            this.logger.warn(`Cannot unload asset '${id}': not registered`);
            return;
        }

        const asset = this.assets.get(id)!;

        if (asset.loaded) {
            // In a real implementation, this would properly dispose of resources
            asset.loaded = false;
            asset.data = null;

            this.logger.debug(`Unloaded asset: ${id}`);
            this.eventSystem.emit(EventType.ASSET_UNLOADED, { id, type: asset.type });
        }
    }

    public unloadAllAssets(): void {
        this.assets.forEach((asset) => {
            if (asset.loaded) {
                this.unloadAsset(asset.id);
            }
        });

        this.logger.info('All assets unloaded');
    }

    public setConfig(config: Partial<AssetManagerConfig>): void {
        this.config = { ...this.config, ...config };
    }

    public getConfig(): AssetManagerConfig {
        return this.config;
    }
}