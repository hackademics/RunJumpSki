import { IEntityBase } from './EntityTypes';

/**
 * Component state enumeration
 */
export enum ComponentState {
    Created = 'created',
    Initialized = 'initialized',
    DependenciesReady = 'dependenciesReady',
    Started = 'started',
    Enabled = 'enabled',
    Disabled = 'disabled',
    Disposed = 'disposed'
}

/**
 * Base component interface
 * Contains only the essential properties that define a component
 */
export interface IComponentBase<TEntity extends IEntityBase = IEntityBase> {
    /**
     * Unique type identifier for the component
     */
    readonly type: string;

    /**
     * List of component types this component depends on
     */
    readonly dependencies: string[];

    /**
     * Initialize the component with its entity
     * @param entity The entity this component belongs to
     */
    init(entity: TEntity): void;
}

/**
 * Component configuration options
 */
export interface ComponentOptions {
    /**
     * Component type identifier
     */
    type: string;
    
    /**
     * Whether the component is enabled by default
     */
    enabled?: boolean;

    /**
     * List of component types this component depends on
     */
    dependencies?: string[];
} 