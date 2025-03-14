/**
 * IEntity.ts
 * Interface for game entities
 */

import { Transform } from '../types/common/Transform';
import { Vector3 } from '../types/common/Vector3';

/**
 * Component interface
 */
export interface IComponent {
    /**
     * The entity this component belongs to
     */
    entity?: IEntity;

    /**
     * Initialize the component
     * @param entity The entity this component is attached to
     */
    init(entity: IEntity): void;

    /**
     * Update the component
     * @param deltaTime Time since last update in seconds
     */
    update(deltaTime: number): void;

    /**
     * Clean up the component
     */
    dispose(): void;
}

/**
 * Component constructor type
 */
export type ComponentConstructor<T extends IComponent> = new (...args: any[]) => T;

/**
 * Entity interface
 */
export interface IEntity {
    /**
     * Unique entity ID
     */
    id: number;

    /**
     * Entity name
     */
    name: string;

    /**
     * Entity transform
     */
    transform: Transform;

    /**
     * Whether the entity is active
     */
    active: boolean;

    /**
     * Parent entity (if any)
     */
    parent?: IEntity;

    /**
     * Child entities
     */
    children: IEntity[];

    /**
     * Initialize the entity
     */
    init(): void;

    /**
     * Update the entity
     * @param deltaTime Time since last update in seconds
     */
    update(deltaTime: number): void;

    /**
     * Clean up the entity
     */
    dispose(): void;

    /**
     * Add a component to the entity
     * @param componentName Component name
     * @param component Component instance
     */
    addComponent<T extends IComponent>(componentName: string, component: T): void;

    /**
     * Get a component from the entity
     * @param componentName Component name
     * @returns Component instance or undefined if not found
     */
    getComponent<T extends IComponent>(componentName: string): T | undefined;

    /**
     * Get a component by type
     * @param componentType Component constructor
     * @returns Component instance or undefined if not found
     */
    getComponentByType<T extends IComponent>(componentType: ComponentConstructor<T>): T | undefined;

    /**
     * Check if the entity has a component
     * @param componentName Component name
     * @returns Whether the entity has the component
     */
    hasComponent(componentName: string): boolean;

    /**
     * Remove a component from the entity
     * @param componentName Component name
     * @returns Whether the component was removed
     */
    removeComponent(componentName: string): boolean;

    /**
     * Get the entity's position
     * @returns Position vector
     */
    getPosition(): Vector3;

    /**
     * Set the entity's position
     * @param position Position vector
     */
    setPosition(position: Vector3): void;

    /**
     * Get the entity's rotation
     * @returns Rotation vector
     */
    getRotation(): Vector3;

    /**
     * Set the entity's rotation
     * @param rotation Rotation vector
     */
    setRotation(rotation: Vector3): void;

    /**
     * Get the entity's scale
     * @returns Scale vector
     */
    getScale(): Vector3;

    /**
     * Set the entity's scale
     * @param scale Scale vector
     */
    setScale(scale: Vector3): void;

    /**
     * Activate the entity
     */
    activate(): void;

    /**
     * Deactivate the entity
     */
    deactivate(): void;

    /**
     * Add a child entity
     * @param child Child entity
     */
    addChild(child: IEntity): void;

    /**
     * Remove a child entity
     * @param child Child entity
     * @returns Whether the child was removed
     */
    removeChild(child: IEntity): boolean;

    /**
     * Get the world position (including parent transforms)
     * @returns World position
     */
    getWorldPosition(): Vector3;

    /**
     * Get the world rotation (including parent transforms)
     * @returns World rotation
     */
    getWorldRotation(): Vector3;

    /**
     * Get the world scale (including parent transforms)
     * @returns World scale
     */
    getWorldScale(): Vector3;
}
