// Core engine imports
import { EventBus } from '@core/events/EventBus';

// Component/entity imports
import { IComponent } from './IComponent';
import { IEntity } from './IEntity';

// Utility imports
import { ComponentError } from '@utils/errors/ComponentError';

// Type imports
import { ComponentState, ComponentOptions } from '../../types/core';

/**
 * Base component implementation
 */
export abstract class Component implements IComponent {
    /**
     * Unique type identifier for the component
     */
    public readonly type: string;

    /**
     * List of component types this component depends on
     */
    public readonly dependencies: string[];
    
    /**
     * Entity this component belongs to
     */
    protected entity?: IEntity;
    
    /**
     * Whether the component is enabled
     */
    protected enabled: boolean;

    /**
     * Current state of the component
     */
    protected state: ComponentState;

    /**
     * Event bus instance
     */
    protected eventBus: EventBus;
    
    /**
     * Create a new component
     * @param options Component options
     */
    constructor(options: ComponentOptions) {
        this.type = options.type;
        this.enabled = options.enabled ?? true;
        this.dependencies = options.dependencies ?? [];
        this.state = ComponentState.Created;
        this.eventBus = EventBus.getInstance();
    }
    
    /**
     * Initialize the component with its entity
     * @param entity The entity this component belongs to
     */
    public init(entity: IEntity): void {
        try {
            if (this.state !== ComponentState.Created) {
                throw new ComponentError(
                    this.type,
                    entity.id,
                    'Component has already been initialized'
                );
            }

            this.entity = entity;
            this.state = ComponentState.Initialized;

            // Check dependencies
            if (this.dependencies.length > 0 && !this.hasDependencies()) {
                throw new ComponentError(
                    this.type,
                    this.entity.id,
                    `Missing required dependencies: ${this.getMissingDependencies().join(', ')}`
                );
            }

            // If no dependencies, mark as ready
            if (this.dependencies.length === 0) {
                this.onDependenciesReady();
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            throw new ComponentError(
                this.type,
                this.entity?.id,
                `Initialization failed: ${message}`
            );
        }
    }

    /**
     * Called after all dependencies have been initialized
     */
    public onDependenciesReady(): void {
        if (this.state !== ComponentState.Initialized) {
            throw new ComponentError(
                this.type,
                this.entity?.id,
                'Component must be initialized before dependencies can be ready'
            );
        }
        this.state = ComponentState.DependenciesReady;
    }

    /**
     * Called before the first update
     */
    public onStart(): void {
        if (this.state !== ComponentState.DependenciesReady) {
            throw new ComponentError(
                this.type,
                this.entity?.id,
                'Component dependencies must be ready before starting'
            );
        }
        this.state = ComponentState.Started;
        if (this.enabled) {
            this.onEnable();
        }
    }
    
    /**
     * Update the component
     * @param deltaTime Time elapsed since last update in seconds
     */
    public abstract update(deltaTime: number): void;

    /**
     * Late update, called after all regular updates
     * @param deltaTime Time elapsed since last update in seconds
     */
    public lateUpdate(_deltaTime: number): void {
        // Optional override
    }

    /**
     * Fixed update, called at a fixed time interval
     * @param fixedDeltaTime The fixed time step
     */
    public fixedUpdate(_fixedDeltaTime: number): void {
        // Optional override
    }

    /**
     * Called when the component is enabled
     */
    public onEnable(): void {
        if (this.state === ComponentState.Disposed) {
            throw new ComponentError(
                this.type,
                this.entity?.id,
                'Cannot enable a disposed component'
            );
        }
        this.state = ComponentState.Enabled;
    }

    /**
     * Called when the component is disabled
     */
    public onDisable(): void {
        if (this.state === ComponentState.Disposed) {
            throw new ComponentError(
                this.type,
                this.entity?.id,
                'Cannot disable a disposed component'
            );
        }
        this.state = ComponentState.Disabled;
    }
    
    /**
     * Clean up resources
     */
    public dispose(): void {
        try {
            if (this.state === ComponentState.Disposed) {
                return;
            }

            this.setEnabled(false);
            this.entity = undefined;
            this.state = ComponentState.Disposed;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            throw new ComponentError(
                this.type,
                this.entity?.id,
                `Disposal failed: ${message}`
            );
        }
    }
    
    /**
     * Check if component is enabled
     */
    public isEnabled(): boolean {
        return this.enabled;
    }
    
    /**
     * Enable or disable the component
     */
    public setEnabled(enabled: boolean): void {
        if (this.enabled === enabled) return;
        
        this.enabled = enabled;
        if (enabled) {
            this.onEnable();
        } else {
            this.onDisable();
        }
    }

    /**
     * Get the entity this component belongs to
     */
    public getEntity(): IEntity | undefined {
        return this.entity;
    }

    /**
     * Check if the component has all required dependencies
     */
    public hasDependencies(): boolean {
        return this.getMissingDependencies().length === 0;
    }

    /**
     * Get list of missing dependencies
     */
    protected getMissingDependencies(): string[] {
        if (!this.entity) return this.dependencies;

        return this.dependencies.filter(
            depType => !this.entity?.getComponent(depType)
        );
    }

    /**
     * Get a required dependency
     * @throws {ComponentError} if the dependency is not found
     */
    protected getRequiredComponent<T extends IComponent>(type: string): T {
        const component = this.entity?.getComponent<T>(type);
        if (!component) {
            throw new ComponentError(
                this.type,
                this.entity?.id,
                `Required component not found: ${type}`
            );
        }
        return component;
    }
}
