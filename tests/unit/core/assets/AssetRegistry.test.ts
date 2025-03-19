/**
 * @file tests/unit/core/assets/AssetRegistry.test.ts
 * @description Unit tests for the AssetRegistry.
 */

import { AssetRegistry } from '@core/assets/AssetRegistry';

describe('AssetRegistry', () => {
  let registry: AssetRegistry;

  beforeEach(() => {
    registry = new AssetRegistry();
  });

  test('should register and retrieve an asset', () => {
    const key = 'asset1';
    const asset = { data: 'test' };
    registry.registerAsset(key, asset);
    expect(registry.getAsset(key)).toEqual(asset);
  });

  test('should return undefined for non-existent asset', () => {
    expect(registry.getAsset('nonexistent')).toBeUndefined();
  });

  test('should remove an asset', () => {
    const key = 'asset1';
    const asset = { data: 'test' };
    registry.registerAsset(key, asset);
    registry.removeAsset(key);
    expect(registry.getAsset(key)).toBeUndefined();
  });

  test('should clear all assets', () => {
    registry.registerAsset('asset1', { data: 'a' });
    registry.registerAsset('asset2', { data: 'b' });
    registry.clear();
    expect(registry.getAsset('asset1')).toBeUndefined();
    expect(registry.getAsset('asset2')).toBeUndefined();
  });
});
