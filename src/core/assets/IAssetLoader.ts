/**
 * @file src/core/assets/IAssetLoader.ts
 * @description Interface for AssetLoader, which handles loading different asset types.
 * 
 * @dependencies None
 * @relatedFiles AssetLoader.ts, IAssetRegistry.ts, IAssetManager.ts
 */

export interface IAssetLoader {
    /**
     * Loads an asset from the specified URL.
     * @param url - The URL of the asset.
     * @returns A Promise resolving with the loaded asset.
     */
    loadAsset(url: string): Promise<any>;
  
    /**
     * Loads multiple assets from an array of URLs.
     * @param urls - Array of asset URLs.
     * @returns A Promise resolving with an array of loaded assets.
     */
    loadAssets(urls: string[]): Promise<any[]>;
  }
  