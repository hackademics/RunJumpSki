/**
 * @file src/core/assets/AssetLifecycleManager.ts
 * @description Manages the lifecycle of assets to ensure proper loading/unloading
 */

import * as BABYLON from 'babylonjs';
import { IAssetManager } from './IAssetManager';
import { ServiceLocator } from '../base/ServiceLocator';

/**
 * Asset usage tracking information
 */
interface AssetUsage {
  /** Asset reference */
  asset: any;
  /** Count of how many entities/systems are using this asset */
  referenceCount: number;
  /** When the asset was last used (timestamp) */
  lastUsed: number;
  /** Whether the asset is marked as persistent (not auto-unloadable) */
  persistent: boolean;
  /** Asset type for specialized handling */
  type: string;
  /** Scene the asset belongs to (if applicable) */
  scene?: BABYLON.Scene;
}

/**
 * Options for the asset lifecycle manager
 */
export interface AssetLifecycleManagerOptions {
  /** Time in milliseconds before unused assets are considered for unloading */
  unloadThreshold: number;
  /** Whether to automatically unload unused assets on scene changes */
  unloadOnSceneChange: boolean;
  /** How often to check for unused assets (in milliseconds) */
  checkInterval: number;
  /** Maximum memory usage in MB before forced cleanup (0 to disable) */
  maxMemoryUsage: number;
}

/**
 * Default options for the asset lifecycle manager
 */
const DEFAULT_OPTIONS: AssetLifecycleManagerOptions = {
  unloadThreshold: 60000, // 1 minute
  unloadOnSceneChange: true,
  checkInterval: 30000, // 30 seconds
  maxMemoryUsage: 0 // Disabled by default
};

/**
 * Manager for asset lifecycle including loading and automatic unloading
 */
export class AssetLifecycleManager {
  /** Assets currently being tracked by their ID */
  private assets: Map<string, AssetUsage> = new Map();
  /** Configuration options */
  private options: AssetLifecycleManagerOptions;
  /** Interval ID for periodic cleanup */
  private cleanupIntervalId: number | null = null;
  /** If automatic cleanup is enabled */
  private autoCleanupEnabled: boolean = true;
  /** Reference to the asset manager */
  private assetManager: IAssetManager | null = null;
  /** Current scene being tracked (for scene changes) */
  private currentScene: BABYLON.Scene | null = null;

  /**
   * Creates a new asset lifecycle manager
   * @param options Configuration options
   */
  constructor(options: Partial<AssetLifecycleManagerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    // Retrieve the asset manager if available
    try {
      this.assetManager = ServiceLocator.getInstance().get<IAssetManager>('assetManager');
    } catch (error) {
      console.warn('AssetLifecycleManager: AssetManager not available in ServiceLocator');
    }
    
    // Start automatic cleanup
    this.startAutoCleanup();
  }

  /**
   * Register an asset for lifecycle management
   * @param id Unique identifier for the asset
   * @param asset The asset to manage
   * @param type Asset type (texture, material, mesh, etc.)
   * @param persistent Whether this asset should persist regardless of usage
   * @param scene Scene the asset belongs to (if applicable)
   * @returns The registered asset
   */
  public registerAsset<T>(
    id: string,
    asset: T,
    type: string,
    persistent: boolean = false,
    scene?: BABYLON.Scene
  ): T {
    // Check if already registered
    if (this.assets.has(id)) {
      // Update last used time and increment reference count
      const usage = this.assets.get(id)!;
      usage.referenceCount++;
      usage.lastUsed = Date.now();
      usage.persistent = usage.persistent || persistent;
      
      return asset;
    }
    
    // Register new asset
    this.assets.set(id, {
      asset,
      referenceCount: 1,
      lastUsed: Date.now(),
      persistent,
      type,
      scene
    });
    
    return asset;
  }

  /**
   * Track a scene for asset management
   * @param scene Scene to track
   */
  public trackScene(scene: BABYLON.Scene): void {
    if (this.currentScene !== scene) {
      const previousScene = this.currentScene;
      this.currentScene = scene;
      
      // Handle scene change cleanup if enabled
      if (previousScene && this.options.unloadOnSceneChange) {
        this.unloadSceneAssets(previousScene);
      }
    }
  }

  /**
   * Get an asset by ID
   * @param id Asset ID
   * @returns The asset or null if not found
   */
  public getAsset<T>(id: string): T | null {
    const usage = this.assets.get(id);
    
    if (usage) {
      // Update usage information
      usage.lastUsed = Date.now();
      return usage.asset as T;
    }
    
    return null;
  }

  /**
   * Mark an asset as being used, updating its reference count and last-used time
   * @param id Asset ID
   * @returns True if the asset was found and marked, false otherwise
   */
  public markAssetUsed(id: string): boolean {
    const usage = this.assets.get(id);
    
    if (usage) {
      usage.lastUsed = Date.now();
      return true;
    }
    
    return false;
  }

  /**
   * Mark an asset as persistent so it won't be automatically unloaded
   * @param id Asset ID
   * @param persistent Whether the asset should be persistent
   * @returns True if the asset was found and updated, false otherwise
   */
  public markAssetPersistent(id: string, persistent: boolean = true): boolean {
    const usage = this.assets.get(id);
    
    if (usage) {
      usage.persistent = persistent;
      return true;
    }
    
    return false;
  }

  /**
   * Acquire a reference to an asset, incrementing its reference count
   * @param id Asset ID
   * @returns The asset or null if not found
   */
  public acquireAsset<T>(id: string): T | null {
    const usage = this.assets.get(id);
    
    if (usage) {
      usage.referenceCount++;
      usage.lastUsed = Date.now();
      return usage.asset as T;
    }
    
    return null;
  }

  /**
   * Release a reference to an asset, decrementing its reference count
   * @param id Asset ID
   * @returns The new reference count or -1 if the asset wasn't found
   */
  public releaseAsset(id: string): number {
    const usage = this.assets.get(id);
    
    if (usage) {
      usage.referenceCount = Math.max(0, usage.referenceCount - 1);
      usage.lastUsed = Date.now();
      return usage.referenceCount;
    }
    
    return -1;
  }

  /**
   * Manually unload an asset regardless of reference count
   * @param id Asset ID
   * @returns True if the asset was unloaded, false otherwise
   */
  public unloadAsset(id: string): boolean {
    const usage = this.assets.get(id);
    
    if (!usage) {
      return false;
    }
    
    try {
      this.disposeAsset(usage);
      this.assets.delete(id);
      return true;
    } catch (error) {
      console.error(`Error unloading asset ${id}:`, error);
      return false;
    }
  }

  /**
   * Unload all assets associated with a specific scene
   * @param scene The scene whose assets should be unloaded
   * @returns Number of assets unloaded
   */
  public unloadSceneAssets(scene: BABYLON.Scene): number {
    let unloadedCount = 0;
    
    for (const [id, usage] of this.assets.entries()) {
      // Only unload assets for this scene that aren't persistent
      if (usage.scene === scene && !usage.persistent) {
        try {
          this.disposeAsset(usage);
          this.assets.delete(id);
          unloadedCount++;
        } catch (error) {
          console.error(`Error unloading scene asset ${id}:`, error);
        }
      }
    }
    
    return unloadedCount;
  }

  /**
   * Check for unused assets and unload them if they meet criteria
   * @param force Whether to force unloading even if reference count > 0
   * @returns Number of assets unloaded
   */
  public checkUnusedAssets(force: boolean = false): number {
    const now = Date.now();
    let unloadedCount = 0;
    
    for (const [id, usage] of this.assets.entries()) {
      // Skip persistent assets unless forced
      if (usage.persistent && !force) {
        continue;
      }
      
      // Check if unused and expired, or forced
      const timeSinceLastUse = now - usage.lastUsed;
      if ((usage.referenceCount === 0 && timeSinceLastUse > this.options.unloadThreshold) || force) {
        try {
          this.disposeAsset(usage);
          this.assets.delete(id);
          unloadedCount++;
        } catch (error) {
          console.error(`Error unloading unused asset ${id}:`, error);
        }
      }
    }
    
    return unloadedCount;
  }

  /**
   * Start automatic cleanup of unused assets
   */
  public startAutoCleanup(): void {
    // Stop existing cleanup if running
    this.stopAutoCleanup();
    
    // Start new cleanup interval
    this.autoCleanupEnabled = true;
    this.cleanupIntervalId = window.setInterval(
      () => this.performAutoCleanup(),
      this.options.checkInterval
    );
  }

  /**
   * Stop automatic cleanup of unused assets
   */
  public stopAutoCleanup(): void {
    if (this.cleanupIntervalId !== null) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
    this.autoCleanupEnabled = false;
  }

  /**
   * Get statistics about managed assets
   * @returns Asset management statistics
   */
  public getStats(): {
    totalAssets: number;
    persistentAssets: number;
    unusedAssets: number;
    assetsByType: Record<string, number>;
  } {
    const now = Date.now();
    let persistentAssets = 0;
    let unusedAssets = 0;
    const assetsByType: Record<string, number> = {};
    
    for (const usage of this.assets.values()) {
      // Count by type
      assetsByType[usage.type] = (assetsByType[usage.type] || 0) + 1;
      
      // Count persistent assets
      if (usage.persistent) {
        persistentAssets++;
      }
      
      // Count potentially unloadable assets
      const timeSinceLastUse = now - usage.lastUsed;
      if (usage.referenceCount === 0 && timeSinceLastUse > this.options.unloadThreshold && !usage.persistent) {
        unusedAssets++;
      }
    }
    
    return {
      totalAssets: this.assets.size,
      persistentAssets,
      unusedAssets,
      assetsByType
    };
  }

  /**
   * Dispose of assets based on their type
   * @param usage Asset usage information
   */
  private disposeAsset(usage: AssetUsage): void {
    const asset = usage.asset;
    
    // Skip if already disposed
    if (!asset) return;
    
    // Handle different asset types differently
    switch (usage.type) {
      case 'texture':
        if (asset instanceof BABYLON.Texture) {
          asset.dispose();
        }
        break;
        
      case 'material':
        if (asset instanceof BABYLON.Material) {
          asset.dispose();
        }
        break;
        
      case 'mesh':
        if (asset instanceof BABYLON.Mesh) {
          asset.dispose();
        }
        break;
        
      case 'sound':
        if (asset instanceof BABYLON.Sound) {
          asset.dispose();
        }
        break;
        
      case 'sprite':
        if (asset instanceof BABYLON.Sprite) {
          asset.dispose();
        }
        break;
        
      case 'particleSystem':
        if (asset.dispose) {
          asset.dispose();
        }
        break;
        
      default:
        // Generic approach for other types
        if (asset && typeof asset.dispose === 'function') {
          asset.dispose();
        }
        
        // Notify the asset manager if available
        if (this.assetManager) {
          // Instead of assuming unregisterAsset exists, check the manager's interface
          this.notifyAssetManagerOfDisposal(asset);
        }
    }
  }

  /**
   * Notify the asset manager that an asset has been disposed
   * This method provides a safe way to communicate with the asset manager
   * without assuming specific methods exist
   * @param asset The asset that was disposed
   */
  private notifyAssetManagerOfDisposal(asset: any): void {
    if (!this.assetManager) return;

    try {
      // Check if the asset manager has methods for unregistering
      const manager = this.assetManager as any;
      
      // Try various possible method names that might exist
      if (typeof manager.unregisterAsset === 'function') {
        manager.unregisterAsset(asset);
      } else if (typeof manager.removeAsset === 'function') {
        manager.removeAsset(asset);
      } else if (typeof manager.releaseAsset === 'function') {
        manager.releaseAsset(asset);
      }
      // If none of these methods exist, we can't notify the asset manager
    } catch (error) {
      // Ignore errors from the asset manager
      console.debug('Could not notify asset manager of asset disposal', error);
    }
  }

  /**
   * Check current memory usage and perform cleanup if necessary
   */
  private performAutoCleanup(): void {
    if (!this.autoCleanupEnabled) return;
    
    let forceCleanup = false;
    
    // Check memory usage if threshold is set
    if (this.options.maxMemoryUsage > 0 && window.performance && (performance as any).memory) {
      const memoryInfo = (performance as any).memory;
      const currentMemoryMB = memoryInfo.usedJSHeapSize / (1024 * 1024);
      
      // Force cleanup if memory usage exceeds threshold
      if (currentMemoryMB > this.options.maxMemoryUsage) {
        forceCleanup = true;
      }
    }
    
    // Perform cleanup
    this.checkUnusedAssets(forceCleanup);
  }

  /**
   * Clear all managed assets, disposing them in the process
   * @param preservePersistent Whether to preserve persistent assets
   * @returns Number of assets disposed
   */
  public clear(preservePersistent: boolean = true): number {
    let disposedCount = 0;
    
    for (const [id, usage] of this.assets.entries()) {
      if (preservePersistent && usage.persistent) {
        continue;
      }
      
      try {
        this.disposeAsset(usage);
        this.assets.delete(id);
        disposedCount++;
      } catch (error) {
        console.error(`Error disposing asset ${id}:`, error);
      }
    }
    
    return disposedCount;
  }

  /**
   * Dispose the asset lifecycle manager, clearing all assets and stopping auto-cleanup
   */
  public dispose(): void {
    this.stopAutoCleanup();
    this.clear(false);
    this.assets.clear();
  }
} 