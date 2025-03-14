/**
 * IComponent.ts
 * Interface for components
 */

import { IEntity } from '../entities/IEntity';

/**
 * Interface for components
 */
export interface IComponent {
    /**
     * Component type
     */
    readonly type: string;
    
    /**
     * Initialize the component
     * @param entity The entity this component belongs to
     */
    init(entity: IEntity): void;
    
    /**
     * Update the component
     * @param deltaTime Time since last update in seconds
     */
    update(deltaTime: number): void;
    
    /**
     * Check if the component is enabled
     * @returns Whether the component is enabled
     */
    isEnabled(): boolean;
    
    /**
     * Enable or disable the component
     * @param enabled Whether the component is enabled
     */
    setEnabled(enabled: boolean): void;
    
    /**
     * Get the entity this component belongs to
     * @returns The entity or undefined if not attached
     */
    getEntity(): IEntity | undefined;
    
    /**
     * Clean up resources
     */
    dispose(): void;
} 