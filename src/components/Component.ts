/**
 * Component.ts
 * Base component class for game entities
 */

import { IComponent } from './IComponent';
import { IEntity } from '../entities/IEntity';

/**
 * Base component class
 */
export abstract class Component implements IComponent {
    /**
     * Component type
     */
    public readonly type: string;
    
    /**
     * Entity this component belongs to
     */
    protected entity?: IEntity;
    
    /**
     * Whether the component is enabled
     */
    protected enabled: boolean = true;
    
    /**
     * Create a new component
     * @param type Component type
     */
    constructor(type: string) {
        this.type = type;
    }
    
    /**
     * Initialize the component
     * @param entity The entity this component belongs to
     */
    public init(entity: IEntity): void {
        this.entity = entity;
    }
    
    /**
     * Update the component
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        // To be implemented by subclasses
    }
    
    /**
     * Check if the component is enabled
     * @returns Whether the component is enabled
     */
    public isEnabled(): boolean {
        return this.enabled;
    }
    
    /**
     * Enable or disable the component
     * @param enabled Whether the component is enabled
     */
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }
    
    /**
     * Get the entity this component belongs to
     * @returns The entity or undefined if not attached
     */
    public getEntity(): IEntity | undefined {
        return this.entity;
    }
    
    /**
     * Clean up resources
     */
    public dispose(): void {
        this.entity = undefined;
    }
} 