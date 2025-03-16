import { Scene } from 'babylonjs';

/**
 * Asset types supported by the asset manager
 */
export enum AssetType {
    TEXTURE = 'texture',
    MODEL = 'model',
    SOUND = 'sound',
    MATERIAL = 'material',
    ENVIRONMENT = 'environment',
    PARTICLE = 'particle'
}

/**
 * Configuration for the asset manager
 */
export interface AssetManagerConfig {
    /**
     * Base URL for loading assets
     */
    baseUrl: string;
    
    /**
     * Whether to use CDN for assets
     */
    useCdn?: boolean;
    
    /**
     * Maximum concurrent asset loads
     */
    maxConcurrentLoads?: number;
    
    /**
     * Whether to cache loaded assets
     */
    useCache?: boolean;
    
    /**
     * Timeout for asset loading in milliseconds
     */
    timeout?: number;
}

/**
 * Asset loading options
 */
export interface AssetLoadOptions {
    /**
     * Whether to cache the asset after loading
     */
    cache?: boolean;
    
    /**
     * Custom loader function for the asset
     */
    customLoader?: (scene: Scene, url: string) => Promise<any>;
    
    /**
     * Additional options specific to the asset type
     */
    [key: string]: any;
}

/**
 * Asset loading progress event data
 */
export interface AssetLoadProgress {
    /**
     * Total number of assets to load
     */
    total: number;
    
    /**
     * Number of assets loaded so far
     */
    loaded: number;
    
    /**
     * Name of the current asset being loaded
     */
    currentAsset: string;
    
    /**
     * Loading progress percentage (0-100)
     */
    progress: number;
}

/**
 * Interface for the asset management system
 */
export interface IAssetManager {
    /**
     * Initialize the asset manager
     * @param config Configuration options
     */
    initialize(config: AssetManagerConfig): void;
    
    /**
     * Load a single asset
     * @param type Asset type
     * @param name Asset name/identifier
     * @param url Asset URL
     * @param options Loading options
     */
    loadAsset(type: AssetType, name: string, url: string, options?: AssetLoadOptions): Promise<any>;
    
    /**
     * Load multiple assets
     * @param assets Array of asset definitions to load
     * @param onProgress Progress callback
     */
    loadAssets(assets: Array<{
        type: AssetType;
        name: string;
        url: string;
        options?: AssetLoadOptions;
    }>, onProgress?: (progress: AssetLoadProgress) => void): Promise<Map<string, any>>;
    
    /**
     * Get a loaded asset by name
     * @param name Asset name/identifier
     */
    getAsset(name: string): any;
    
    /**
     * Check if an asset is loaded
     * @param name Asset name/identifier
     */
    isLoaded(name: string): boolean;
    
    /**
     * Unload an asset and optionally remove it from cache
     * @param name Asset name/identifier
     * @param removeFromCache Whether to remove the asset from cache
     */
    unloadAsset(name: string, removeFromCache?: boolean): void;
    
    /**
     * Clear all loaded assets and cache
     */
    clear(): void;
    
    /**
     * Get the loading progress for all assets
     */
    getLoadingProgress(): AssetLoadProgress;
    
    /**
     * Dispose of the asset manager and clean up resources
     */
    dispose(): void;
} 