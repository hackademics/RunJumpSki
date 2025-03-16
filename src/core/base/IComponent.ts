import { IComponentBase } from '../../types/core';
import { IEntity } from './IEntity';

/**
 * Core component interface
 */
export interface IComponent extends IComponentBase<IEntity> {
    /**
     * Called after all dependencies have been initialized
     * Override this to set up dependency relationships
     */
    onDependenciesReady(): void;
    
    /**
     * Called before the first update
     * Override this to perform any necessary setup
     */
    onStart(): void;
    
    /**
     * Update the component
     * @param deltaTime Time elapsed since last update in seconds
     */
    update(deltaTime: number): void;
    
    /**
     * Late update, called after all regular updates
     * Override this for operations that need updated state from other components
     * @param deltaTime Time elapsed since last update in seconds
     */
    lateUpdate(deltaTime: number): void;
    
    /**
     * Fixed update, called at a fixed time interval
     * Override this for physics and other time-sensitive operations
     * @param fixedDeltaTime The fixed time step
     */
    fixedUpdate(fixedDeltaTime: number): void;
    
    /**
     * Called when the component is enabled
     */
    onEnable(): void;
    
    /**
     * Called when the component is disabled
     */
    onDisable(): void;
    
    /**
     * Clean up resources
     */
    dispose(): void;
    
    /**
     * Check if component is enabled
     */
    isEnabled(): boolean;
    
    /**
     * Enable or disable the component
     */
    setEnabled(enabled: boolean): void;
    
    /**
     * Get the entity this component belongs to
     */
    getEntity(): IEntity | undefined;
    
    /**
     * Check if the component has all required dependencies
     */
    hasDependencies(): boolean;
}
