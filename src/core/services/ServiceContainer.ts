import { IServiceContainer, ServiceIdentifier, ServiceOptions, ServiceConstructor } from '../../types/core/ServiceTypes';
import { ServiceError } from '@utils/errors/ServiceError';

interface ServiceRegistration<T> {
    implementation: T | ServiceConstructor<T>;
    instance?: T;
    singleton: boolean;
}

/**
 * Service registration options
 */
export interface ServiceOptions<T> {
    /**
     * Service factory function
     */
    factory: () => T;

    /**
     * Whether the service should be a singleton
     * @default true
     */
    singleton?: boolean;

    /**
     * Service initialization function
     */
    init?: () => void | Promise<void>;

    /**
     * Service disposal function
     */
    dispose?: () => void | Promise<void>;
}

/**
 * Service registration info
 */
interface ServiceInfo<T> {
    instance?: T;
    factory: () => T;
    options: ServiceOptions<T>;
}

/**
 * Service container implementation
 * Provides dependency injection and service management
 */
export class ServiceContainer implements IServiceContainer {
    private static instance: ServiceContainer;
    private services: Map<string, ServiceInfo<any>> = new Map();
    private initialized: boolean = false;
    
    private constructor() {}

    /**
     * Get the singleton instance
     */
    public static getInstance(): ServiceContainer {
        if (!ServiceContainer.instance) {
            ServiceContainer.instance = new ServiceContainer();
        }
        return ServiceContainer.instance;
    }
    
    /**
     * Register a service
     * @param id Service identifier
     * @param factory Service factory function
     * @param options Service options
     */
    public register<T>(id: string, factory: () => T, options: Omit<ServiceOptions<T>, 'factory'>): void {
        if (this.services.has(id)) {
            throw new ServiceError('Service already registered', { id });
        }

        this.services.set(id, {
            factory,
            options: { ...options, factory }
        });
    }
    
    /**
     * Get a service by id
     * @param id Service identifier
     */
    public get<T>(id: string): T {
        const info = this.services.get(id);
        if (!info) {
            throw new ServiceError('Service not found', { id });
        }

        if (info.options.singleton) {
            if (!info.instance) {
                info.instance = info.factory();
            }
            return info.instance;
        }

        return info.factory();
    }
    
    /**
     * Initialize all registered services
     */
    public async initialize(): Promise<void> {
        if (this.initialized) {
            throw new ServiceError('Service container already initialized');
        }

        for (const [id, info] of this.services) {
            try {
                if (info.options.init) {
                    await info.options.init();
                }
            } catch (error) {
                throw new ServiceError('Service initialization failed', { id, error });
            }
        }

        this.initialized = true;
    }
    
    /**
     * Dispose of all services
     */
    public async dispose(): Promise<void> {
        if (!this.initialized) {
            return;
        }

        // Dispose in reverse registration order
        const entries = Array.from(this.services.entries()).reverse();
        
        for (const [id, info] of entries) {
            try {
                if (info.options.dispose) {
                    await info.options.dispose();
                }
            } catch (error) {
                throw new ServiceError('Service disposal failed', { id, error });
            }
        }

        this.services.clear();
        this.initialized = false;
    }
    
    /**
     * Check if a service is registered
     * @param id Service identifier
     */
    public has(id: string): boolean {
        return this.services.has(id);
    }
    
    /**
     * Remove a service
     * @param id Service identifier
     */
    public remove(id: string): void {
        const info = this.services.get(id);
        if (info && info.options.dispose) {
            info.options.dispose();
        }
        this.services.delete(id);
    }
    
    /**
     * Clear all services
     */
    public clear(): void {
        this.services.clear();
    }

    /**
     * Create an instance of a service
     * @param implementation Service implementation or constructor
     * @returns Service instance
     */
    private createInstance<T>(implementation: T | ServiceConstructor<T>): T {
        if (typeof implementation === 'function') {
            return new (implementation as ServiceConstructor<T>)();
        }
        return implementation;
    }
} 