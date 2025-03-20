/**
 * @file tests/unit/core/assets/AssetLifecycleManager.test.ts
 * @description Unit tests for the AssetLifecycleManager.
 */

import { AssetLifecycleManager } from '@core/assets/AssetLifecycleManager';
import { ServiceLocator } from '@core/base/ServiceLocator';
import { IAssetManager } from '@core/assets/IAssetManager';

// Mock BABYLON
jest.mock('babylonjs', () => ({
  Scene: class Scene {
    dispose = jest.fn();
  }
}));

// Mock ServiceLocator
jest.mock('@core/base/ServiceLocator', () => {
  const mockServiceLocator = {
    get: jest.fn(),
    has: jest.fn().mockReturnValue(true),
    register: jest.fn(),
    remove: jest.fn()
  };
  
  return {
    ServiceLocator: {
      getInstance: jest.fn().mockReturnValue(mockServiceLocator)
    }
  };
});

describe('AssetLifecycleManager', () => {
  let assetLifecycleManager: AssetLifecycleManager;
  let mockAssetManager: IAssetManager;
  let mockScene: any;
  let originalDateNow: () => number;
  let mockTime: number = 0;
  
  // Helper to advance the mock time
  const advanceTime = (ms: number) => {
    mockTime += ms;
    jest.setSystemTime(mockTime);
  };
  
  beforeAll(() => {
    // Save original Date.now and mock it
    originalDateNow = Date.now;
    jest.useFakeTimers();
  });
  
  afterAll(() => {
    // Restore original Date.now
    jest.useRealTimers();
  });
  
  beforeEach(() => {
    // Reset mock time
    mockTime = 1000;
    jest.setSystemTime(mockTime);
    
    // Create mock asset manager
    mockAssetManager = {
      loadAsset: jest.fn().mockImplementation((key, url) => Promise.resolve(`loaded-${url}`)),
      loadAssets: jest.fn(),
      getAsset: jest.fn(),
      registerAsset: jest.fn(),
      removeAsset: jest.fn(),
      clear: jest.fn()
    };
    
    // Setup ServiceLocator to return our mock asset manager
    const serviceLocator = ServiceLocator.getInstance();
    (serviceLocator.get as jest.Mock).mockReturnValue(mockAssetManager);
    
    // Create mock scene
    mockScene = {
      dispose: jest.fn()
    };
    
    // Spy on console methods
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Clear intervals to prevent cleanup intervals from running
    jest.spyOn(global, 'setInterval').mockReturnValue(123 as any);
    jest.spyOn(global, 'clearInterval').mockImplementation(() => {});
    
    // Create the asset lifecycle manager with shorter threshold for testing
    assetLifecycleManager = new AssetLifecycleManager({
      unloadThreshold: 1000, // 1 second
      checkInterval: 500 // 0.5 seconds
    });
  });
  
  afterEach(() => {
    // Clean up
    assetLifecycleManager.dispose();
    jest.restoreAllMocks();
  });

  test('should create an instance', () => {
    expect(assetLifecycleManager).toBeDefined();
  });
  
  test('should register an asset and return it', () => {
    const testAsset = { id: 'test-texture' };
    const result = assetLifecycleManager.registerAsset('test-id', testAsset, 'texture');
    
    expect(result).toBe(testAsset);
  });
  
  test('should increment reference count when registering the same asset twice', () => {
    const testAsset = { id: 'test-mesh' };
    
    // Register first time
    assetLifecycleManager.registerAsset('test-id', testAsset, 'mesh');
    
    // Register second time
    assetLifecycleManager.registerAsset('test-id', testAsset, 'mesh');
    
    // Get asset directly to check reference count
    const asset = assetLifecycleManager.getAsset('test-id');
    
    // Use releaseAsset twice to verify reference count is 2
    const count1 = assetLifecycleManager.releaseAsset('test-id');
    const count2 = assetLifecycleManager.releaseAsset('test-id');
    
    expect(count1).toBe(1); // First release should result in count of 1
    expect(count2).toBe(0); // Second release should result in count of 0
  });
  
  test('should mark asset as persistent', () => {
    const testAsset = { id: 'persistent-asset' };
    assetLifecycleManager.registerAsset('persistent-id', testAsset, 'material', true);
    
    // Release all references
    assetLifecycleManager.releaseAsset('persistent-id');
    
    // Advance time past threshold to trigger cleanup eligibility
    advanceTime(2000);
    
    // Run cleanup
    const unloadedCount = assetLifecycleManager.checkUnusedAssets();
    
    // Should not be unloaded because it's persistent
    expect(unloadedCount).toBe(0);
    expect(assetLifecycleManager.getAsset('persistent-id')).toBe(testAsset);
  });
  
  test('should unload unused assets during cleanup', () => {
    const testAsset1 = { id: 'asset1', dispose: jest.fn() };
    const testAsset2 = { id: 'asset2', dispose: jest.fn() };
    
    // Register assets
    assetLifecycleManager.registerAsset('id1', testAsset1, 'texture');
    assetLifecycleManager.registerAsset('id2', testAsset2, 'texture');
    
    // Release references
    assetLifecycleManager.releaseAsset('id1');
    assetLifecycleManager.releaseAsset('id2');
    
    // Advance time past threshold
    advanceTime(2000);
    
    // Run cleanup
    const unloadedCount = assetLifecycleManager.checkUnusedAssets();
    
    // Should have unloaded both assets
    expect(unloadedCount).toBe(2);
    expect(testAsset1.dispose).toHaveBeenCalled();
    expect(testAsset2.dispose).toHaveBeenCalled();
    expect(assetLifecycleManager.getAsset('id1')).toBeNull();
    expect(assetLifecycleManager.getAsset('id2')).toBeNull();
  });
  
  test('should not unload assets that are still in use', () => {
    const testAsset1 = { id: 'used-asset', dispose: jest.fn() };
    const testAsset2 = { id: 'unused-asset', dispose: jest.fn() };
    
    // Register assets
    assetLifecycleManager.registerAsset('used-id', testAsset1, 'texture');
    assetLifecycleManager.registerAsset('unused-id', testAsset2, 'texture');
    
    // Release only the unused asset
    assetLifecycleManager.releaseAsset('unused-id');
    
    // Advance time past threshold
    advanceTime(2000);
    
    // Run cleanup
    const unloadedCount = assetLifecycleManager.checkUnusedAssets();
    
    // Should have unloaded only the unused asset
    expect(unloadedCount).toBe(1);
    expect(testAsset1.dispose).not.toHaveBeenCalled();
    expect(testAsset2.dispose).toHaveBeenCalled();
    expect(assetLifecycleManager.getAsset('used-id')).toBe(testAsset1);
    expect(assetLifecycleManager.getAsset('unused-id')).toBeNull();
  });
  
  test('should acquire and release assets correctly', () => {
    const testAsset = { id: 'acquire-test' };
    
    // Register with initial reference count of 1
    assetLifecycleManager.registerAsset('acquire-id', testAsset, 'material');
    
    // Acquire should increment to 2
    const acquired = assetLifecycleManager.acquireAsset('acquire-id');
    expect(acquired).toBe(testAsset);
    
    // First release should decrement to 1
    const count1 = assetLifecycleManager.releaseAsset('acquire-id');
    expect(count1).toBe(1);
    
    // Second release should decrement to 0
    const count2 = assetLifecycleManager.releaseAsset('acquire-id');
    expect(count2).toBe(0);
    
    // Asset should still be available until cleanup
    expect(assetLifecycleManager.getAsset('acquire-id')).toBe(testAsset);
    
    // Advance time and run cleanup
    advanceTime(2000);
    assetLifecycleManager.checkUnusedAssets();
    
    // Now the asset should be gone
    expect(assetLifecycleManager.getAsset('acquire-id')).toBeNull();
  });
  
  test('should track scene and unload assets when scene changes', () => {
    const scene1 = { dispose: jest.fn() };
    const scene2 = { dispose: jest.fn() };
    
    const sceneAsset1 = { id: 'scene1-asset', dispose: jest.fn() };
    const sceneAsset2 = { id: 'scene2-asset', dispose: jest.fn() };
    
    // Register assets with different scenes
    assetLifecycleManager.registerAsset('scene1-id', sceneAsset1, 'mesh', false, scene1 as any);
    assetLifecycleManager.registerAsset('scene2-id', sceneAsset2, 'mesh', false, scene2 as any);
    
    // Track first scene
    assetLifecycleManager.trackScene(scene1 as any);
    
    // Now switch to second scene - should unload scene1 assets
    assetLifecycleManager.trackScene(scene2 as any);
    
    // Scene1 assets should be unloaded
    expect(sceneAsset1.dispose).toHaveBeenCalled();
    expect(sceneAsset2.dispose).not.toHaveBeenCalled();
    expect(assetLifecycleManager.getAsset('scene1-id')).toBeNull();
    expect(assetLifecycleManager.getAsset('scene2-id')).toBe(sceneAsset2);
  });
  
  test('should get stats about managed assets', () => {
    // Register various assets
    assetLifecycleManager.registerAsset('texture1', { id: 't1' }, 'texture');
    assetLifecycleManager.registerAsset('texture2', { id: 't2' }, 'texture');
    assetLifecycleManager.registerAsset('mesh1', { id: 'm1' }, 'mesh');
    assetLifecycleManager.registerAsset('persistent1', { id: 'p1' }, 'material', true);
    
    // Release some assets
    assetLifecycleManager.releaseAsset('texture1');
    assetLifecycleManager.releaseAsset('mesh1');
    
    // Get stats
    const stats = assetLifecycleManager.getStats();
    
    // Verify stats
    expect(stats.totalAssets).toBe(4);
    expect(stats.persistentAssets).toBe(1);
    expect(stats.unusedAssets).toBe(2); // texture1 and mesh1 are unused
    expect(stats.assetsByType.texture).toBe(2);
    expect(stats.assetsByType.mesh).toBe(1);
    expect(stats.assetsByType.material).toBe(1);
  });
  
  test('should clear all non-persistent assets', () => {
    // Create assets with dispose functions we can track
    const regularAsset = { id: 'regular', dispose: jest.fn() };
    const persistentAsset = { id: 'persistent', dispose: jest.fn() };
    
    // Register assets
    assetLifecycleManager.registerAsset('regular-id', regularAsset, 'texture');
    assetLifecycleManager.registerAsset('persistent-id', persistentAsset, 'texture', true);
    
    // Clear non-persistent assets
    const clearedCount = assetLifecycleManager.clear();
    
    // Should have cleared only the regular asset
    expect(clearedCount).toBe(1);
    expect(regularAsset.dispose).toHaveBeenCalled();
    expect(persistentAsset.dispose).not.toHaveBeenCalled();
    expect(assetLifecycleManager.getAsset('regular-id')).toBeNull();
    expect(assetLifecycleManager.getAsset('persistent-id')).toBe(persistentAsset);
  });
  
  test('should clear all assets including persistent when requested', () => {
    // Create assets with dispose functions we can track
    const regularAsset = { id: 'regular', dispose: jest.fn() };
    const persistentAsset = { id: 'persistent', dispose: jest.fn() };
    
    // Register assets
    assetLifecycleManager.registerAsset('regular-id', regularAsset, 'texture');
    assetLifecycleManager.registerAsset('persistent-id', persistentAsset, 'texture', true);
    
    // Clear all assets including persistent
    const clearedCount = assetLifecycleManager.clear(false);
    
    // Should have cleared both assets
    expect(clearedCount).toBe(2);
    expect(regularAsset.dispose).toHaveBeenCalled();
    expect(persistentAsset.dispose).toHaveBeenCalled();
    expect(assetLifecycleManager.getAsset('regular-id')).toBeNull();
    expect(assetLifecycleManager.getAsset('persistent-id')).toBeNull();
  });
  
  test('should dispose all resources when disposed', () => {
    // Create assets with dispose functions we can track
    const asset1 = { id: 'asset1', dispose: jest.fn() };
    const asset2 = { id: 'asset2', dispose: jest.fn() };
    
    // Register assets
    assetLifecycleManager.registerAsset('id1', asset1, 'texture');
    assetLifecycleManager.registerAsset('id2', asset2, 'texture', true);
    
    // Dispose the manager
    assetLifecycleManager.dispose();
    
    // Should have cleared all assets and stopped interval
    expect(asset1.dispose).toHaveBeenCalled();
    expect(asset2.dispose).toHaveBeenCalled();
    expect(clearInterval).toHaveBeenCalled();
  });
  
  test('should notify asset manager when disposing assets if available', () => {
    // Create an asset
    const testAsset = { id: 'notify-test', dispose: jest.fn() };
    
    // Register asset
    assetLifecycleManager.registerAsset('notify-id', testAsset, 'texture');
    
    // Force unload
    assetLifecycleManager.unloadAsset('notify-id');
    
    // Asset manager should have been notified
    expect(mockAssetManager.removeAsset).toHaveBeenCalledWith('notify-id');
  });
  
  test('should handle errors when disposing assets', () => {
    // Create an asset that throws on dispose
    const problematicAsset = { 
      id: 'error-test', 
      dispose: jest.fn().mockImplementation(() => {
        throw new Error('Disposal error');
      })
    };
    
    // Register asset
    assetLifecycleManager.registerAsset('error-id', problematicAsset, 'texture');
    
    // Force unload - should catch the error
    const result = assetLifecycleManager.unloadAsset('error-id');
    
    // Should report failure
    expect(result).toBe(false);
    expect(console.error).toHaveBeenCalled();
    expect(problematicAsset.dispose).toHaveBeenCalled();
  });
  
  test('should update last used time when getting or marking assets', () => {
    const testAsset = { id: 'usage-test' };
    
    // Register asset
    assetLifecycleManager.registerAsset('usage-id', testAsset, 'material');
    
    // Advance time
    advanceTime(500);
    
    // Get asset which should update last used time
    assetLifecycleManager.getAsset('usage-id');
    
    // Release reference
    assetLifecycleManager.releaseAsset('usage-id');
    
    // Advance time but not past threshold from last usage
    advanceTime(800); // Total: 1300, but last used at 1500
    
    // Run cleanup
    const unloadedCount = assetLifecycleManager.checkUnusedAssets();
    
    // Should not be unloaded yet
    expect(unloadedCount).toBe(0);
    expect(assetLifecycleManager.getAsset('usage-id')).toBe(testAsset);
    
    // Now advance past threshold from last usage
    advanceTime(1000); // Total: 2300, last used at 1500
    
    // Run cleanup
    const unloadedCount2 = assetLifecycleManager.checkUnusedAssets();
    
    // Now it should be unloaded
    expect(unloadedCount2).toBe(1);
    expect(assetLifecycleManager.getAsset('usage-id')).toBeNull();
  });
}); 