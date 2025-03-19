/**
 * @file src/core/assets/AssetManager.ts
 * @description Implements the asset manager that orchestrates asset loading and registry.
 * 
 * @dependencies IAssetManager.ts, IAssetLoader.ts, AssetLoader.ts, IAssetRegistry.ts, AssetRegistry.ts
 * @relatedFiles IAssetManager.ts, AssetLoader.ts, AssetRegistry.ts
 */

import { IAssetManager } from "./IAssetManager";
import { IAssetLoader } from "./IAssetLoader";
import { AssetLoader } from "./AssetLoader";
import { IAssetRegistry } from "./IAssetRegistry";
import { AssetRegistry } from "./AssetRegistry";

export class AssetManager implements IAssetManager {
  private loader: IAssetLoader;
  private registry: IAssetRegistry;

  constructor(loader?: IAssetLoader, registry?: IAssetRegistry) {
    this.loader = loader || new AssetLoader();
    this.registry = registry || new AssetRegistry();
  }

  public async loadAsset(key: string, url: string): Promise<any> {
    const asset = await this.loader.loadAsset(url);
    this.registry.registerAsset(key, asset);
    return asset;
  }

  public getAsset(key: string): any {
    return this.registry.getAsset(key);
  }

  public async loadAssets(assetList: { key: string, url: string }[]): Promise<any[]> {
    const assets = await Promise.all(
      assetList.map(item => this.loadAsset(item.key, item.url))
    );
    return assets;
  }

  public clear(): void {
    this.registry.clear();
  }
}
