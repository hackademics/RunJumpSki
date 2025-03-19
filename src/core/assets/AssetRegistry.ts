/**
 * @file src/core/assets/AssetRegistry.ts
 * @description Implements the asset registry to track and manage loaded assets.
 * 
 * @dependencies IAssetRegistry.ts
 * @relatedFiles IAssetRegistry.ts, AssetManager.ts
 */

import { IAssetRegistry } from "./IAssetRegistry";

export class AssetRegistry implements IAssetRegistry {
  private registry: Map<string, any> = new Map<string, any>();

  public registerAsset(key: string, asset: any): void {
    this.registry.set(key, asset);
  }

  public getAsset(key: string): any {
    return this.registry.get(key);
  }

  public removeAsset(key: string): void {
    this.registry.delete(key);
  }

  public clear(): void {
    this.registry.clear();
  }
}
