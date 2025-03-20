/**
 * @file src/core/ecs/components/PoolableMeshComponent.ts
 * @description Implementation of a poolable MeshComponent that can be reused
 */

import * as BABYLON from 'babylonjs';
import { MeshComponent, MeshComponentOptions, DEFAULT_MESHCOMPONENT_OPTIONS } from './MeshComponent';
import { IEntity } from '../IEntity';
import { IMeshComponent } from './IMeshComponent';
import { IPoolable } from '../../utils/ObjectPool';
import { IPoolObjectFactory } from '../../utils/ObjectPool';
import { ObjectPoolFactory } from '../../utils/ObjectPoolFactory';
import { ResourceTracker } from '../../utils/ResourceTracker';
import { ServiceLocator } from '../../base/ServiceLocator';

/**
 * Implementation of Mesh component that supports object pooling
 * Handles rendering of 3D meshes in the scene and can be reused from an object pool
 */
export class PoolableMeshComponent extends MeshComponent implements IPoolable {
    private static resourceTracker: ResourceTracker;
    
    /**
     * Create a new PoolableMeshComponent
     */
    constructor(options: Partial<MeshComponentOptions> = {}) {
        // Get the resource tracker from ServiceLocator or create a new one
        if (!PoolableMeshComponent.resourceTracker) {
            try {
                const serviceLocator = ServiceLocator.getInstance();
                PoolableMeshComponent.resourceTracker = serviceLocator.has('resourceTracker') 
                    ? serviceLocator.get<ResourceTracker>('resourceTracker') 
                    : new ResourceTracker();
            } catch (e) {
                PoolableMeshComponent.resourceTracker = new ResourceTracker();
            }
        }
        
        // Add resource tracker to options
        options.resourceTracker = PoolableMeshComponent.resourceTracker;
        
        super(options);
    }
    
    /**
     * Reset the component for reuse
     */
    public reset(): void {
        // Clear existing mesh and material
        this.dispose();
        
        // Reset to defaults
        this.setMesh(DEFAULT_MESHCOMPONENT_OPTIONS.mesh || null);
        this.setMaterial(DEFAULT_MESHCOMPONENT_OPTIONS.material || null);
        this.setPickable(DEFAULT_MESHCOMPONENT_OPTIONS.isPickable || true);
        this.setCollisionEnabled(DEFAULT_MESHCOMPONENT_OPTIONS.collisionEnabled || true);
        
        // Reset visibility and other renderable properties
        this.setVisible(true);
        this.setOpacity(1);
        this.setCastShadows(true);
        this.setReceiveShadows(true);
        
        // Reset enabled state
        this.setEnabled(true);
    }
    
    /**
     * Factory for creating PoolableMeshComponent instances
     */
    public static Factory: IPoolObjectFactory<PoolableMeshComponent> = {
        create: () => new PoolableMeshComponent()
    };
    
    /**
     * Get a PoolableMeshComponent from the pool
     */
    public static getFromPool(options?: Partial<MeshComponentOptions>): PoolableMeshComponent {
        // Get or create the pool
        const pool = ObjectPoolFactory.getComponentPool(
            'mesh',
            PoolableMeshComponent.Factory
        );
        
        // Get a component from the pool
        const component = pool.get();
        
        // Apply options if provided
        if (options) {
            if (options.mesh !== undefined) component.setMesh(options.mesh);
            if (options.material !== undefined) component.setMaterial(options.material);
            if (options.isPickable !== undefined) component.setPickable(options.isPickable);
            if (options.collisionEnabled !== undefined) component.setCollisionEnabled(options.collisionEnabled);
        }
        
        return component;
    }
    
    /**
     * Return a PoolableMeshComponent to the pool
     */
    public static returnToPool(component: PoolableMeshComponent): boolean {
        // Make sure the component is detached from any entity
        component.dispose();
        
        // Return to the pool
        const pool = ObjectPoolFactory.getComponentPool(
            'mesh',
            PoolableMeshComponent.Factory
        );
        
        return pool.release(component);
    }
} 