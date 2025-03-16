/**
 * Entity state enumeration
 */
export enum EntityState {
    Created = 'created',
    Initialized = 'initialized',
    Active = 'active',
    Disabled = 'disabled',
    Disposed = 'disposed'
}

/**
 * Base entity interface
 * Contains only the essential properties that define an entity
 */
export interface IEntityBase {
    /**
     * Unique identifier for the entity
     */
    readonly id: string;

    /**
     * Current state of the entity
     */
    readonly state: EntityState;

    /**
     * Whether the entity is enabled
     */
    readonly enabled: boolean;
} 