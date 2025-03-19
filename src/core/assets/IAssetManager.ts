/**
 * @file src/core/assets/IAssetManager.ts
 * @description Interface for AssetManager, which manages asset loading and tracking.
 * 
 * @dependencies IAssetLoader.ts, IAssetRegistry.ts
 * @relatedFiles AssetManager.ts, AssetLoader.ts, AssetRegistry.ts
 */

export interface IAssetManager {
    /**
     * Loads an asset from a URL and registers it with a key.
     * @param key - Unique identifier for the asset.
     * @param url - URL of the asset.
     * @returns A Promise resolving with the loaded asset.
     */
    loadAsset(key: string, url: string): Promise<any>;
  
    /**
     * Retrieves a registered asset by its key.
     * @param key - Unique identifier for the asset.
     * @returns The asset if found, otherwise undefined.
     */
    getAsset(key: string): any;
  
    /**
     * Loads multiple assets from an array of key-url pairs.
     * @param assetList - Array of objects with key and url properties.
     * @returns A Promise resolving with an array of loaded assets.
     */
    loadAssets(assetList: { key: string, url: string }[]): Promise<any[]>;
  
    /**
     * Clears all registered assets.
     */
    clear(): void;
  }
  