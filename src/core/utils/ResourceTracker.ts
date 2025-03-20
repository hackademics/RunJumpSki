/**
 * @file src/core/utils/ResourceTracker.ts
 * @description Centralized resource tracking system for managing disposable resources
 * 
 * @dependencies babylonjs
 */

import * as BABYLON from 'babylonjs';
import { Logger } from './Logger';
import { ServiceLocator } from '../base/ServiceLocator';

/**
 * Interface for tracked resources that can be disposed
 */
export interface IDisposable {
  /**
   * Dispose the resource and free memory
   */
  dispose(): void;
}

/**
 * Types of resources that can be tracked
 */
export enum ResourceType {
  MESH = 'mesh',
  MATERIAL = 'material',
  TEXTURE = 'texture',
  PARTICLE_SYSTEM = 'particleSystem',
  LIGHT = 'light',
  SOUND = 'sound',
  SHADER = 'shader',
  IMPOSTOR = 'impostor',
  RENDER_TARGET = 'renderTarget',
  ANIMATION = 'animation',
  EVENT_LISTENER = 'eventListener',
  OTHER = 'other'
}

/**
 * Resource information with metadata
 */
export interface TrackedResource {
  /** The actual resource object */
  resource: IDisposable;
  /** Type of resource */
  type: ResourceType;
  /** Optional identifier */
  id?: string;
  /** When the resource was created */
  createdAt: number;
  /** The scene this resource belongs to (if applicable) */
  sceneId?: string;
  /** Optional group identifier for batch operations */
  group?: string;
  /** Custom metadata */
  metadata?: Record<string, any>;
}

/**
 * Options for creating a tracked resource
 */
export interface TrackResourceOptions {
  /** Resource type */
  type: ResourceType;
  /** Optional identifier */
  id?: string;
  /** The scene this resource belongs to (if applicable) */
  sceneId?: string;
  /** Optional group identifier for batch operations */
  group?: string;
  /** Custom metadata */
  metadata?: Record<string, any>;
}

/**
 * Statistics about tracked resources
 */
export interface ResourceStats {
  /** Total count of all tracked resources */
  totalCount: number;
  /** Counts by resource type */
  countsByType: Record<ResourceType, number>;
  /** Counts by group */
  countsByGroup: Record<string, number>;
  /** Counts by scene */
  countsByScene: Record<string, number>;
}

/**
 * Filter options for resource operations
 */
export interface ResourceFilter {
  /** Filter by resource type */
  type?: ResourceType | ResourceType[];
  /** Filter by scene ID */
  sceneId?: string;
  /** Filter by group */
  group?: string;
  /** Filter by ID */
  id?: string;
  /** Filter by custom predicate function */
  predicate?: (resource: TrackedResource) => boolean;
}

/**
 * Centralized system for tracking disposable resources
 */
export class ResourceTracker {
  private resources: Map<string, TrackedResource> = new Map();
  private logger: Logger | null = null;
  private nextId: number = 1;

  /**
   * Create a new ResourceTracker
   */
  constructor() {
    try {
      const serviceLocator = ServiceLocator.getInstance();
      if (serviceLocator.has('logger')) {
        this.logger = serviceLocator.get<Logger>('logger');
      }
    } catch (e) {
      console.warn('Logger not available for ResourceTracker');
    }
  }

  /**
   * Track a resource for later disposal
   * @param resource The resource to track
   * @param options Tracking options
   * @returns Generated unique ID for the resource
   */
  public track<T extends IDisposable>(resource: T, options: TrackResourceOptions): string {
    const resourceId = options.id || `resource_${this.nextId++}`;
    
    this.resources.set(resourceId, {
      resource,
      type: options.type,
      id: resourceId,
      createdAt: Date.now(),
      sceneId: options.sceneId,
      group: options.group,
      metadata: options.metadata
    });
    
    this.logDebug(`Tracked resource: ${resourceId} (${options.type})`);
    
    return resourceId;
  }

  /**
   * Track a Babylon.js mesh
   * @param mesh The mesh to track
   * @param options Tracking options
   * @returns Resource ID
   */
  public trackMesh(mesh: BABYLON.AbstractMesh, options?: Partial<TrackResourceOptions>): string {
    return this.track(mesh, {
      type: ResourceType.MESH,
      sceneId: mesh.getScene()?.uid?.toString(),
      ...options
    });
  }

  /**
   * Track a Babylon.js material
   * @param material The material to track
   * @param options Tracking options
   * @returns Resource ID
   */
  public trackMaterial(material: BABYLON.Material, options?: Partial<TrackResourceOptions>): string {
    return this.track(material, {
      type: ResourceType.MATERIAL,
      sceneId: material.getScene()?.uid?.toString(),
      ...options
    });
  }

  /**
   * Track a Babylon.js texture
   * @param texture The texture to track
   * @param options Tracking options
   * @returns Resource ID
   */
  public trackTexture(texture: BABYLON.BaseTexture, options?: Partial<TrackResourceOptions>): string {
    return this.track(texture, {
      type: ResourceType.TEXTURE,
      sceneId: texture.getScene()?.uid?.toString(),
      ...options
    });
  }

  /**
   * Track a Babylon.js particle system
   * @param particleSystem The particle system to track
   * @param options Tracking options
   * @returns Resource ID
   */
  public trackParticleSystem(particleSystem: BABYLON.IParticleSystem, options?: Partial<TrackResourceOptions>): string {
    return this.track(particleSystem, {
      type: ResourceType.PARTICLE_SYSTEM,
      sceneId: (particleSystem as any).getScene?.()?.uid?.toString(),
      ...options
    });
  }

  /**
   * Track a render target texture
   * @param renderTarget The render target to track
   * @param options Tracking options
   * @returns Resource ID
   */
  public trackRenderTarget(renderTarget: BABYLON.RenderTargetTexture, options?: Partial<TrackResourceOptions>): string {
    return this.track(renderTarget, {
      type: ResourceType.RENDER_TARGET,
      sceneId: renderTarget.getScene()?.uid?.toString(),
      ...options
    });
  }

  /**
   * Track a general event listener for cleanup
   * @param listener Object with dispose method to remove event listener
   * @param options Tracking options
   * @returns Resource ID
   */
  public trackEventListener(listener: IDisposable, options?: Partial<TrackResourceOptions>): string {
    return this.track(listener, {
      type: ResourceType.EVENT_LISTENER,
      ...options
    });
  }

  /**
   * Get a tracked resource by ID
   * @param id Resource ID
   * @returns The tracked resource or undefined if not found
   */
  public getResource(id: string): TrackedResource | undefined {
    return this.resources.get(id);
  }

  /**
   * Check if a resource with the given ID is being tracked
   * @param id Resource ID
   * @returns True if the resource is being tracked
   */
  public isTracked(id: string): boolean {
    return this.resources.has(id);
  }

  /**
   * Dispose a specific resource and remove it from tracking
   * @param id Resource ID
   * @returns True if the resource was found and disposed
   */
  public disposeResource(id: string): boolean {
    const resource = this.resources.get(id);
    if (!resource) {
      this.logDebug(`Resource not found for disposal: ${id}`);
      return false;
    }
    
    try {
      resource.resource.dispose();
      this.resources.delete(id);
      this.logDebug(`Disposed resource: ${id} (${resource.type})`);
      return true;
    } catch (error) {
      this.logError(`Error disposing resource ${id}: ${error}`);
      // Remove from tracking even if disposal failed
      this.resources.delete(id);
      return false;
    }
  }

  /**
   * Dispose resources matching the filter
   * @param filter Filter to match resources
   * @returns Number of resources disposed
   */
  public disposeByFilter(filter: ResourceFilter): number {
    const resourcesIds = this.findResourcesByFilter(filter);
    let disposedCount = 0;
    
    for (const id of resourcesIds) {
      if (this.disposeResource(id)) {
        disposedCount++;
      }
    }
    
    return disposedCount;
  }

  /**
   * Dispose all resources of a specific type
   * @param type Resource type to dispose
   * @returns Number of resources disposed
   */
  public disposeByType(type: ResourceType): number {
    return this.disposeByFilter({ type });
  }

  /**
   * Dispose all resources associated with a scene
   * @param sceneId Scene ID
   * @returns Number of resources disposed
   */
  public disposeByScene(sceneId: string): number {
    return this.disposeByFilter({ sceneId });
  }

  /**
   * Dispose all resources in a group
   * @param group Group name
   * @returns Number of resources disposed
   */
  public disposeByGroup(group: string): number {
    return this.disposeByFilter({ group });
  }

  /**
   * Dispose all tracked resources
   * @returns Number of resources disposed
   */
  public disposeAll(): number {
    const count = this.resources.size;
    
    this.logDebug(`Disposing all ${count} tracked resources`);
    
    for (const [id] of this.resources) {
      this.disposeResource(id);
    }
    
    // Just in case any disposeResource calls failed, clear the map
    this.resources.clear();
    
    return count;
  }

  /**
   * Find resource IDs matching a filter
   * @param filter Filter criteria
   * @returns Array of resource IDs
   */
  public findResourcesByFilter(filter: ResourceFilter): string[] {
    const results: string[] = [];
    
    for (const [id, resource] of this.resources) {
      if (this.matchesFilter(resource, filter)) {
        results.push(id);
      }
    }
    
    return results;
  }

  /**
   * Get statistics about tracked resources
   * @returns Resource statistics
   */
  public getStats(): ResourceStats {
    const stats: ResourceStats = {
      totalCount: this.resources.size,
      countsByType: {} as Record<ResourceType, number>,
      countsByGroup: {},
      countsByScene: {}
    };
    
    // Initialize counts for all resource types
    Object.values(ResourceType).forEach(type => {
      stats.countsByType[type] = 0;
    });
    
    // Count resources
    for (const resource of this.resources.values()) {
      // Count by type
      stats.countsByType[resource.type]++;
      
      // Count by group
      if (resource.group) {
        stats.countsByGroup[resource.group] = (stats.countsByGroup[resource.group] || 0) + 1;
      }
      
      // Count by scene
      if (resource.sceneId) {
        stats.countsByScene[resource.sceneId] = (stats.countsByScene[resource.sceneId] || 0) + 1;
      }
    }
    
    return stats;
  }

  /**
   * Get all tracked resources
   * @returns Array of all tracked resources
   */
  public getAllResources(): TrackedResource[] {
    return Array.from(this.resources.values());
  }

  /**
   * Check if a resource matches a filter
   * @param resource The resource to check
   * @param filter The filter to apply
   * @returns True if the resource matches the filter
   */
  private matchesFilter(resource: TrackedResource, filter: ResourceFilter): boolean {
    // Check type
    if (filter.type) {
      if (Array.isArray(filter.type)) {
        if (!filter.type.includes(resource.type)) {
          return false;
        }
      } else if (resource.type !== filter.type) {
        return false;
      }
    }
    
    // Check scene ID
    if (filter.sceneId && resource.sceneId !== filter.sceneId) {
      return false;
    }
    
    // Check group
    if (filter.group && resource.group !== filter.group) {
      return false;
    }
    
    // Check ID
    if (filter.id && resource.id !== filter.id) {
      return false;
    }
    
    // Check predicate
    if (filter.predicate && !filter.predicate(resource)) {
      return false;
    }
    
    return true;
  }

  /**
   * Log a debug message
   * @param message Message to log
   */
  private logDebug(message: string): void {
    if (this.logger) {
      this.logger.debug(`[ResourceTracker] ${message}`);
    }
  }

  /**
   * Log an error message
   * @param message Error message
   */
  private logError(message: string): void {
    if (this.logger) {
      this.logger.error(`[ResourceTracker] ${message}`);
    } else {
      console.error(`[ResourceTracker] ${message}`);
    }
  }
} 