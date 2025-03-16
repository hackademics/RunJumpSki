/**
 * Base event map type
 * Game-specific events should extend this
 */
export interface EventMap {
    [eventName: string]: any;
}

/**
 * Event priority levels
 * Higher priority events are processed first
 */
export enum EventPriority {
    HIGHEST = 1000,
    HIGH = 100,
    NORMAL = 0,
    LOW = -100,
    LOWEST = -1000
}

/**
 * Event handler options
 */
export interface EventHandlerOptions<T = any> {
    /**
     * Handler priority
     * Higher priority handlers are called first
     * @default EventPriority.Normal
     */
    priority?: EventPriority;

    /**
     * Event filter predicate
     * @param data Event data
     * @returns True if the event should be handled
     */
    filter?: (data: T) => boolean;

    /**
     * Whether to handle the event only once
     * @default false
     */
    once?: boolean;

    /**
     * Debug name for the handler
     * Used for debugging and logging
     */
    debugName?: string;
}

/**
 * Event handler registration
 */
export interface EventHandlerRegistration<T = any> {
    /**
     * The event handler function
     */
    handler: (data: T) => void | Promise<void>;

    /**
     * Handler priority
     */
    priority: EventPriority;

    /**
     * Event filter predicate
     */
    filter?: (data: T) => boolean;

    /**
     * Whether to handle the event only once
     */
    once: boolean;

    /**
     * Debug name for the handler
     */
    debugName?: string;
}

/**
 * Context object passed to middleware functions
 */
export interface EventMiddlewareContext<T = any> {
    /** Event type being processed */
    eventType: string;
    /** Event data */
    data: T;
    /** Event timestamp */
    timestamp: number;
    /** Event priority */
    priority: EventPriority;
    /** Event metadata */
    metadata?: Record<string, any>;
}

/**
 * Event middleware function type
 */
export type EventMiddleware = <T>(
    context: EventMiddlewareContext<T>,
    next: () => Promise<T>
) => Promise<T>;

/**
 * Event bus statistics
 */
export interface EventBusStats {
    /**
     * Total number of registered event types
     */
    readonly eventTypeCount: number;

    /**
     * Total number of registered handlers
     */
    readonly handlerCount: number;

    /**
     * Number of handlers per event type
     */
    readonly handlersPerEvent: Readonly<Record<string, number>>;

    /**
     * Number of events emitted
     */
    readonly emitCount: Readonly<Record<string, number>>;

    /**
     * Number of filtered events
     */
    readonly filteredCount: Readonly<Record<string, number>>;

    /**
     * Number of errors per event type
     */
    readonly errorCount: Readonly<Record<string, number>>;

    /**
     * Memory usage statistics
     */
    readonly memoryUsage: {
        /**
         * Total size of event data in bytes
         */
        readonly totalDataSize: number;

        /**
         * Number of retained handlers
         */
        readonly retainedHandlers: number;
    };
}

/**
 * Event batch for processing multiple events of the same type
 */
export interface EventBatch<K extends keyof EventMap> {
    /**
     * Event type
     */
    readonly event: K;

    /**
     * Array of event data to process
     */
    readonly data: ReadonlyArray<EventMap[K]>;

    /**
     * Whether to process the batch in parallel
     * @default false
     */
    readonly parallel?: boolean;
}

/**
 * Event bus interface
 */
export interface IEventBus {
    /**
     * Register an event handler
     * @param event Event type
     * @param handler Event handler function
     * @param options Handler options
     * @throws {EventError} If the handler is invalid
     */
    on<K extends keyof EventMap>(
        event: K,
        handler: (data: EventMap[K]) => void | Promise<void>,
        options?: EventHandlerOptions<EventMap[K]>
    ): void;

    /**
     * Unregister an event handler
     * @param event Event type
     * @param handler Event handler function
     */
    off<K extends keyof EventMap>(
        event: K,
        handler: (data: EventMap[K]) => void | Promise<void>
    ): void;

    /**
     * Emit an event
     * @param event Event type
     * @param data Event data
     * @throws {EventError} If event processing fails
     */
    emit<K extends keyof EventMap>(event: K, data: EventMap[K]): Promise<void>;

    /**
     * Emit a batch of events
     * @param batch Event batch to process
     * @throws {EventError} If batch processing fails
     */
    emitBatch<K extends keyof EventMap>(batch: EventBatch<K>): Promise<void>;

    /**
     * Add event middleware
     * @param middleware Middleware to add
     */
    use(middleware: EventMiddleware): void;

    /**
     * Remove event middleware
     * @param middleware Middleware to remove
     */
    removeMiddleware(middleware: EventMiddleware): void;

    /**
     * Clear all event handlers and middleware
     */
    clear(): void;

    /**
     * Get event bus statistics
     */
    getStats(): EventBusStats;

    /**
     * Get registered handlers for an event type
     * @param event Event type
     */
    getHandlers<K extends keyof EventMap>(
        event: K
    ): ReadonlyArray<EventHandlerRegistration<EventMap[K]>>;

    /**
     * Dispose of the event bus and clean up resources
     */
    dispose(): void;
} 