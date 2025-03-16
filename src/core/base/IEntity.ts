import { IEntityBase, EntityState } from '../../types/core';
import { IComponent } from './IComponent';

/**
 * Core entity interface
 */
export interface IEntity extends IEntityBase {
    /**
     * Initialize the entity
     * This is called after creation to set up the entity
     */
    init(): void;

    /**
     * Start the entity
     * This is called after all entities are initialized
     */
    start(): void;
    
    /**
     * Add a component to the entity
     * @param component The component to add
     * @returns The added component for chaining
     * @throws {EntityError} if component type already exists
     */
    addComponent<T extends IComponent>(component: T): T;
    
    /**
     * Get a component by type
     * @param type The component type to get
     * @returns The component or undefined if not found
     */
    getComponent<T extends IComponent>(type: string): T | undefined;

    /**
     * Get a required component by type
     * @param type The component type to get
     * @returns The component
     * @throws {EntityError} if component is not found
     */
    getRequiredComponent<T extends IComponent>(type: string): T;

    /**
     * Check if the entity has a component
     * @param type The component type to check
     */
    hasComponent(type: string): boolean;
    
    /**
     * Remove a component by type
     * @param type The component type to remove
     * @returns True if the component was removed, false if not found
     */
    removeComponent(type: string): boolean;
    
    /**
     * Update all components
     * @param deltaTime Time elapsed since last update in seconds
     */
    update(deltaTime: number): void;

    /**
     * Late update all components
     * Called after all entities have been updated
     * @param deltaTime Time elapsed since last update in seconds
     */
    lateUpdate(deltaTime: number): void;

    /**
     * Fixed update all components
     * Called at a fixed time interval
     * @param fixedDeltaTime The fixed time step
     */
    fixedUpdate(fixedDeltaTime: number): void;

    /**
     * Enable the entity and all its components
     */
    enable(): void;

    /**
     * Disable the entity and all its components
     */
    disable(): void;

    /**
     * Check if the entity is enabled
     */
    isEnabled(): boolean;
    
    /**
     * Clean up all components and resources
     */
    dispose(): void;

    /**
     * Get all components
     */
    getAllComponents(): ReadonlyMap<string, IComponent>;

    /**
     * Get the current state
     */
    getState(): EntityState;
}
