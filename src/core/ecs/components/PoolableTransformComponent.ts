/**
 * @file src/core/ecs/components/PoolableTransformComponent.ts
 * @description Implementation of a poolable TransformComponent that can be reused
 */

import * as BABYLON from 'babylonjs';
import { TransformComponent, TransformComponentOptions, DEFAULT_TRANSFORMCOMPONENT_OPTIONS } from './TransformComponent';
import { IEntity } from '../IEntity';
import { ITransformComponent } from './ITransformComponent';
import { IPoolable } from '../../utils/ObjectPool';
import { IPoolObjectFactory } from '../../utils/ObjectPool';
import { ObjectPoolFactory } from '../../utils/ObjectPoolFactory';

/**
 * Implementation of Transform component that supports object pooling
 * Handles entity positioning, rotation, and scale in 3D space and
 * can be reused from an object pool
 */
export class PoolableTransformComponent extends TransformComponent implements IPoolable {
    /**
     * Create a new PoolableTransformComponent
     */
    constructor(options: Partial<TransformComponentOptions> = {}) {
        super(options);
    }
    
    /**
     * Reset the component for reuse
     */
    public reset(): void {
        // Reset position, rotation, and scale to defaults
        this.setPosition(DEFAULT_TRANSFORMCOMPONENT_OPTIONS.position || new BABYLON.Vector3(0, 0, 0));
        this.setRotation(DEFAULT_TRANSFORMCOMPONENT_OPTIONS.rotation || new BABYLON.Vector3(0, 0, 0));
        this.setScale(DEFAULT_TRANSFORMCOMPONENT_OPTIONS.scale || new BABYLON.Vector3(1, 1, 1));
        
        // Reset parent
        this.setParent(null);
        
        // Reset enabled state
        this.setEnabled(true);
    }
    
    /**
     * Factory for creating PoolableTransformComponent instances
     */
    public static Factory: IPoolObjectFactory<PoolableTransformComponent> = {
        create: () => new PoolableTransformComponent()
    };
    
    /**
     * Get a PoolableTransformComponent from the pool
     */
    public static getFromPool(options?: Partial<TransformComponentOptions>): PoolableTransformComponent {
        // Get or create the pool
        const pool = ObjectPoolFactory.getComponentPool(
            'transform',
            PoolableTransformComponent.Factory
        );
        
        // Get a component from the pool
        const component = pool.get();
        
        // Apply options if provided
        if (options) {
            if (options.position) component.setPosition(options.position);
            if (options.rotation) component.setRotation(options.rotation);
            if (options.scale) component.setScale(options.scale);
            if (options.parent) component.setParent(options.parent);
        }
        
        return component;
    }
    
    /**
     * Return a PoolableTransformComponent to the pool
     */
    public static returnToPool(component: PoolableTransformComponent): boolean {
        // Make sure the component is detached from any entity
        component.dispose();
        
        // Return to the pool
        const pool = ObjectPoolFactory.getComponentPool(
            'transform',
            PoolableTransformComponent.Factory
        );
        
        return pool.release(component);
    }
} 