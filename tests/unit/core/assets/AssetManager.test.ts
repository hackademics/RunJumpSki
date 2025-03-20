/**
 * @file tests/unit/core/assets/AssetManager.test.ts
 * @description Unit tests for the AssetManager.
 */

import { AssetManager } from '@core/assets/AssetManager';
import { IAssetLoader } from '@core/assets/IAssetLoader';
import { IAssetRegistry } from '@core/assets/IAssetRegistry';
import { AssetLoader } from '@core/assets/AssetLoader';
import { AssetRegistry } from '@core/assets/AssetRegistry';

// Create spies to monitor constructor calls for default implementation test
jest.mock('@core/assets/AssetLoader');
jest.mock('@core/assets/AssetRegistry'); 

describe('AssetManager', () => {
  let assetManager: AssetManager;
  let mockLoader: IAssetLoader;
  let mockRegistry: IAssetRegistry;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLoader = {
      loadAsset: jest.fn().mockImplementation((url: string) => Promise.resolve(`asset from ${url}`)),
      loadAssets: jest.fn()
    };

    mockRegistry = {
      registerAsset: jest.fn(),
      getAsset: jest.fn().mockReturnValue(undefined),
      removeAsset: jest.fn(),
      clear: jest.fn()
    };

    assetManager = new AssetManager(mockLoader, mockRegistry);
  });

  test('should load asset and register it', async () => {
    const key = 'asset1';
    const url = 'http://example.com/asset1.json';
    const loadedAsset = await assetManager.loadAsset(key, url);
    expect(mockLoader.loadAsset).toHaveBeenCalledWith(url);
    expect(mockRegistry.registerAsset).toHaveBeenCalledWith(key, loadedAsset);
    expect(loadedAsset).toEqual(`asset from ${url}`);
  });

  test('should retrieve an asset from registry', () => {
    (mockRegistry.getAsset as jest.Mock).mockReturnValue('asset1 data');
    const asset = assetManager.getAsset('asset1');
    expect(asset).toEqual('asset1 data');
    expect(mockRegistry.getAsset).toHaveBeenCalledWith('asset1');
  });

  test('should load multiple assets and register them', async () => {
    const assetList = [
      { key: 'asset1', url: 'http://example.com/asset1.json' },
      { key: 'asset2', url: 'http://example.com/asset2.json' }
    ];
    (mockLoader.loadAsset as jest.Mock)
      .mockImplementationOnce((url: string) => Promise.resolve(`asset from ${url}`))
      .mockImplementationOnce((url: string) => Promise.resolve(`asset from ${url}`));

    const assets = await assetManager.loadAssets(assetList);
    expect(assets).toEqual([
      'asset from http://example.com/asset1.json',
      'asset from http://example.com/asset2.json'
    ]);
    expect(mockRegistry.registerAsset).toHaveBeenCalledTimes(2);
  });

  test('should clear all assets', () => {
    assetManager.clear();
    expect(mockRegistry.clear).toHaveBeenCalled();
  });

  test('should initialize with default implementations when not provided', () => {
    // Create an instance with no params to use default implementations
    const defaultManager = new AssetManager();
    
    // Verify that the constructors were called
    expect(AssetLoader).toHaveBeenCalledTimes(1);
    expect(AssetRegistry).toHaveBeenCalledTimes(1);
  });
});
