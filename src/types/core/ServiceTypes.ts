/**
 * Service identifier type
 */
export type ServiceIdentifier = string;

/**
 * Service constructor type
 */
export type ServiceConstructor<T> = new (...args: any[]) => T;

/**
 * Service registration options
 */
export interface ServiceOptions<T> {
    /**
     * Service identifier
     */
    id: ServiceIdentifier;

    /**
     * Service instance or constructor
     */
    implementation: T | ServiceConstructor<T>;

    /**
     * Whether the service should be treated as a singleton
     * If true, the same instance will be returned for all requests
     * @default true
     */
    singleton?: boolean;
}

/**
 * Service container interface
 */
export interface IServiceContainer {
    /**
     * Register a service
     * @param options Service registration options
     */
    register<T>(options: ServiceOptions<T>): void;

    /**
     * Get a service by its identifier
     * @param id Service identifier
     * @returns The service instance
     * @throws ServiceError if the service is not found
     */
    get<T>(id: ServiceIdentifier): T;

    /**
     * Check if a service exists
     * @param id Service identifier
     */
    has(id: ServiceIdentifier): boolean;

    /**
     * Remove a service
     * @param id Service identifier
     * @returns True if the service was removed
     */
    remove(id: ServiceIdentifier): boolean;

    /**
     * Clear all services
     */
    clear(): void;
} 