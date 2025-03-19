/**
 * @file src/core/assets/IAssetRegistry.ts
 * @description Interface for AssetRegistry, which tracks and manages loaded assets.
 * 
 * @dependencies None
 * @relatedFiles AssetRegistry.ts, IAssetManager.ts
 */

export interface IAssetRegistry {
    /**
     * Registers an asset with a unique key.
     * @param key - Unique identifier for the asset.
     * @param asset - The asset to register.
     */
    registerAsset(key: string, asset: any): void;
  
    /**
     * Retrieves an asset by its key.
     * @param key - Unique identifier for the asset.
     * @returns The asset if found, otherwise undefined.
     */
    getAsset(key: string): any;
  
    /**
     * Removes an asset from the registry.
     * @param key - Unique identifier for the asset.
     */
    removeAsset(key: string): void;
  
    /**
     * Clears all assets from the registry.
     */
    clear(): void;
  }
  