/**
 * @file src/core/assets/AssetLoader.ts
 * @description Implements the asset loader that handles loading different asset types.
 * 
 * @dependencies IAssetLoader.ts
 * @relatedFiles IAssetLoader.ts, AssetManager.ts, AssetRegistry.ts
 */

import { IAssetLoader } from "./IAssetLoader";

export class AssetLoader implements IAssetLoader {
  public async loadAsset(url: string): Promise<any> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load asset from ${url}`);
    }
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      return response.json();
    } else if (contentType && contentType.indexOf("text/") !== -1) {
      return response.text();
    } else {
      // Fallback for other asset types (e.g., images, blobs)
      return response.blob();
    }
  }

  public async loadAssets(urls: string[]): Promise<any[]> {
    return Promise.all(urls.map(url => this.loadAsset(url)));
  }
}
