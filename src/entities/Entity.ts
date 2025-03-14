/**
 * Entity.ts
 * Base entity class for game objects
 */

import { Transform } from '../types/common/Transform';
import { Vector3 } from '../types/common/Vector3';
import { IComponent, IEntity, ComponentConstructor } from './IEntity';
import { Logger } from '../utils/Logger';

/**
 * Base entity class
 */
export class Entity implements IEntity {
    private static nextId: number = 1;
    private components: Map<string, IComponent>;
    private componentsByType: Map<Function, IComponent>;
    private logger: Logger;

    /**
     * Unique entity ID
     */
    public id: number;

    /**
     * Entity name
     */
    public name: string;

    /**
     * Entity transform
     */
    public transform: Transform;

    /**
     * Whether the entity is active
     */
    public active: boolean;

    /**
     * Parent entity (if any)
     */
    public parent?: IEntity;

    /**
     * Child entities
     */
    public children: IEntity[];

    /**
     * Create a new Entity
     * @param name Entity name
     * @param position Initial position
     * @param rotation Initial rotation
     * @param scale Initial scale
     */
    constructor(
        name: string = 'Entity',
        position: Vector3 = new Vector3(0, 0, 0),
        rotation: Vector3 = new Vector3(0, 0, 0),
        scale: Vector3 = new Vector3(1, 1, 1)
    ) {
        this.id = Entity.nextId++;
        this.name = name;
        this.transform = new Transform(position, rotation, scale);
        this.active = true;
        this.components = new Map<string, IComponent>();
        this.componentsByType = new Map<Function, IComponent>();
        this.children = [];
        this.logger = new Logger(`Entity:${this.name}:${this.id}`);
    }

    /**
     * Initialize the entity
     */
    public init(): void {
        this.logger.debug('Initializing entity');
        
        // Initialize all components
        this.components.forEach(component => {
            component.init(this);
        });

        // Initialize all children
        this.children.forEach(child => {
            child.init();
        });
    }

    /**
     * Update the entity
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        if (!this.active) {
            return;
        }

        // Update all components
        this.components.forEach(component => {
            component.update(deltaTime);
        });

        // Update all children
        this.children.forEach(child => {
            child.update(deltaTime);
        });
    }

    /**
     * Clean up the entity
     */
    public dispose(): void {
        this.logger.debug('Disposing entity');
        
        // Dispose all components
        this.components.forEach(component => {
            component.dispose();
        });
        
        // Clear components
        this.components.clear();
        this.componentsByType.clear();

        // Dispose all children
        this.children.forEach(child => {
            child.dispose();
        });

        // Clear children
        this.children = [];

        // Remove from parent if exists
        if (this.parent) {
            this.parent.removeChild(this);
            this.parent = undefined;
        }
    }

    /**
     * Add a component to the entity
     * @param componentName Component name
     * @param component Component instance
     */
    public addComponent<T extends IComponent>(componentName: string, component: T): void {
        if (this.components.has(componentName)) {
            this.logger.warn(`Component '${componentName}' already exists on entity`);
            return;
        }

        // Set the component's entity reference
        component.entity = this;

        // Add to maps
        this.components.set(componentName, component);
        this.componentsByType.set(component.constructor, component);
        
        this.logger.debug(`Added component '${componentName}'`);
    }

    /**
     * Get a component from the entity
     * @param componentName Component name
     * @returns Component instance or undefined if not found
     */
    public getComponent<T extends IComponent>(componentName: string): T | undefined {
        return this.components.get(componentName) as T | undefined;
    }

    /**
     * Get a component by type
     * @param componentType Component constructor
     * @returns Component instance or undefined if not found
     */
    public getComponentByType<T extends IComponent>(componentType: ComponentConstructor<T>): T | undefined {
        return this.componentsByType.get(componentType) as T | undefined;
    }

    /**
     * Check if the entity has a component
     * @param componentName Component name
     * @returns Whether the entity has the component
     */
    public hasComponent(componentName: string): boolean {
        return this.components.has(componentName);
    }

    /**
     * Remove a component from the entity
     * @param componentName Component name
     * @returns Whether the component was removed
     */
    public removeComponent(componentName: string): boolean {
        if (!this.components.has(componentName)) {
            return false;
        }

        const component = this.components.get(componentName);
        if (component) {
            // Remove entity reference
            component.entity = undefined;
            
            // Dispose the component
            component.dispose();
            
            // Remove from maps
            this.components.delete(componentName);
            this.componentsByType.delete(component.constructor);
        }

        this.logger.debug(`Removed component '${componentName}'`);
        return true;
    }

    /**
     * Get the entity's position
     * @returns Position vector
     */
    public getPosition(): Vector3 {
        return this.transform.position;
    }

    /**
     * Set the entity's position
     * @param position Position vector
     */
    public setPosition(position: Vector3): void {
        this.transform.position = position;
    }

    /**
     * Get the entity's rotation
     * @returns Rotation vector
     */
    public getRotation(): Vector3 {
        return this.transform.rotation;
    }

    /**
     * Set the entity's rotation
     * @param rotation Rotation vector
     */
    public setRotation(rotation: Vector3): void {
        this.transform.rotation = rotation;
    }

    /**
     * Get the entity's scale
     * @returns Scale vector
     */
    public getScale(): Vector3 {
        return this.transform.scale;
    }

    /**
     * Set the entity's scale
     * @param scale Scale vector
     */
    public setScale(scale: Vector3): void {
        this.transform.scale = scale;
    }

    /**
     * Activate the entity
     */
    public activate(): void {
        this.active = true;
    }

    /**
     * Deactivate the entity
     */
    public deactivate(): void {
        this.active = false;
    }

    /**
     * Add a child entity
     * @param child Child entity
     */
    public addChild(child: IEntity): void {
        // Remove from previous parent if exists
        if (child.parent) {
            child.parent.removeChild(child);
        }

        // Set parent reference
        child.parent = this;
        
        // Add to children
        this.children.push(child);
        
        this.logger.debug(`Added child entity '${child.name}' (ID: ${child.id})`);
    }

    /**
     * Remove a child entity
     * @param child Child entity
     * @returns Whether the child was removed
     */
    public removeChild(child: IEntity): boolean {
        const index = this.children.indexOf(child);
        if (index === -1) {
            return false;
        }

        // Remove parent reference
        child.parent = undefined;
        
        // Remove from children
        this.children.splice(index, 1);
        
        this.logger.debug(`Removed child entity '${child.name}' (ID: ${child.id})`);
        return true;
    }

    /**
     * Get the world position (including parent transforms)
     * @returns World position
     */
    public getWorldPosition(): Vector3 {
        if (!this.parent) {
            return this.transform.position.clone();
        }

        // Apply parent's world position
        const parentWorldPosition = this.parent.getWorldPosition();
        
        // Apply parent's world rotation to our local position
        const parentWorldRotation = this.parent.getWorldRotation();
        
        // Create a transform with parent's world values
        const parentWorldTransform = new Transform(
            parentWorldPosition,
            parentWorldRotation
        );
        
        // Calculate our position in parent's local space
        const localPosition = this.transform.position.clone();
        
        // Apply parent's forward and right vectors to our position
        const forward = parentWorldTransform.getForwardVector().scale(localPosition.z);
        const right = parentWorldTransform.getRightVector().scale(localPosition.x);
        const up = parentWorldTransform.getUpVector().scale(localPosition.y);
        
        // Combine to get world position
        return parentWorldPosition.add(forward).add(right).add(up);
    }

    /**
     * Get the world rotation (including parent transforms)
     * @returns World rotation
     */
    public getWorldRotation(): Vector3 {
        if (!this.parent) {
            return this.transform.rotation.clone();
        }

        // Add parent's world rotation to our local rotation
        const parentWorldRotation = this.parent.getWorldRotation();
        return new Vector3(
            this.transform.rotation.x + parentWorldRotation.x,
            this.transform.rotation.y + parentWorldRotation.y,
            this.transform.rotation.z + parentWorldRotation.z
        );
    }

    /**
     * Get the world scale (including parent transforms)
     * @returns World scale
     */
    public getWorldScale(): Vector3 {
        if (!this.parent) {
            return this.transform.scale.clone();
        }

        // Multiply parent's world scale with our local scale
        const parentWorldScale = this.parent.getWorldScale();
        return new Vector3(
            this.transform.scale.x * parentWorldScale.x,
            this.transform.scale.y * parentWorldScale.y,
            this.transform.scale.z * parentWorldScale.z
        );
    }
}
