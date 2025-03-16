import { EventType, GameEventMap, createEvent } from '../../types/events/GameEvents';
import { EventMiddleware, EventMiddlewareManager } from './EventMiddlewareManager';
import { EventStats } from './EventStats';
import { Logger } from '../logger/Logger';

/**
 * Type for event handlers
 */
type EventHandler = (data: any) => void;

/**
 * Event bus for game-wide communication
 * Provides type-safe event emission and subscription
 */
export class EventBus {
    private static instance: EventBus;
    private handlers: Map<string, Set<EventHandler>> = new Map();
    private middlewareManager: EventMiddlewareManager;
    private stats: EventStats;
    private logger: Logger | null = null;
    private disposed = false;

    private constructor() {
        this.middlewareManager = new EventMiddlewareManager();
        this.stats = new EventStats();
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }

    /**
     * Initialize the event bus
     */
    public initialize(): void {
        this.logger = Logger.getInstance();
        this.logInfo('EventBus initialized');
        
        // Emit initialization event
        this.emit(
            EventType.SYSTEM_INITIALIZED, 
            createEvent(EventType.SYSTEM_INITIALIZED, { systemId: 'eventBus' })
        );
    }

    /**
     * Subscribe to an event
     * @param eventType The event type to subscribe to
     * @param handler The handler function to call when the event is emitted
     */
    public on<T extends EventType>(eventType: T, handler: (data: GameEventMap[T]) => void): void {
        if (this.disposed) {
            this.logWarning(`Cannot subscribe to event ${eventType} - EventBus is disposed`);
            return;
        }

        const eventName = eventType.toString();
        if (!this.handlers.has(eventName)) {
            this.handlers.set(eventName, new Set());
        }
        this.handlers.get(eventName)?.add(handler);
        
        this.stats.incrementSubscriptionCount(eventName);
        this.logDebug(`Subscribed to event: ${eventName}`);
    }

    /**
     * Unsubscribe from an event
     * @param eventType The event type to unsubscribe from
     * @param handler The handler function to remove
     */
    public off<T extends EventType>(eventType: T, handler: (data: GameEventMap[T]) => void): void {
        if (this.disposed) {
            this.logWarning(`Cannot unsubscribe from event ${eventType} - EventBus is disposed`);
            return;
        }

        const eventName = eventType.toString();
        const handlers = this.handlers.get(eventName);
        if (handlers) {
            handlers.delete(handler);
            this.stats.decrementSubscriptionCount(eventName);
            this.logDebug(`Unsubscribed from event: ${eventName}`);
        }
    }

    /**
     * Process an event through all middleware
     * @param eventType The event type to process
     * @param data The event data
     * @returns The processed data, or null if the event was cancelled
     */
    private processMiddleware<T extends EventType>(eventType: T, data: GameEventMap[T]): GameEventMap[T] | null {
        return this.middlewareManager.process(eventType, data);
    }

    /**
     * Emit an event
     * @param eventType The event type to emit
     * @param data The event data
     */
    public emit<T extends EventType>(eventType: T, data: GameEventMap[T]): void {
        if (this.disposed) {
            this.logWarning(`Cannot emit event ${eventType} - EventBus is disposed`);
            return;
        }

        const eventName = eventType.toString();
        
        // Apply middleware
        const processedData = this.processMiddleware(eventType, data);
        if (!processedData) {
            // Event was cancelled by middleware
            this.logDebug(`Event ${eventName} cancelled by middleware`);
            return;
        }

        // Get handlers
        const handlers = this.handlers.get(eventName);
        if (!handlers || handlers.size === 0) {
            this.logDebug(`No handlers for event: ${eventName}`);
            return;
        }

        // Call handlers
        try {
            handlers.forEach(handler => {
                try {
                    handler(processedData);
                } catch (error) {
                    this.logError(`Error in event handler for ${eventName}:`, error);
                    this.stats.incrementErrorCount(eventName);
                    
                    // Emit error event
                    this.emit(
                        EventType.SYSTEM_ERROR, 
                        createEvent(EventType.SYSTEM_ERROR, {
                            systemId: 'eventBus',
                            error: error instanceof Error ? error : new Error(String(error)),
                            fatal: false
                        })
                    );
                }
            });
            
            this.stats.incrementEmitCount(eventName);
            this.logDebug(`Emitted event: ${eventName}`);
        } catch (error) {
            this.logError(`Error emitting event ${eventName}:`, error);
            this.stats.incrementErrorCount(eventName);
        }
    }

    /**
     * Check if there are any subscribers for an event
     * @param eventType The event type to check
     */
    public hasSubscribers<T extends EventType>(eventType: T): boolean {
        if (this.disposed) return false;
        
        const eventName = eventType.toString();
        const handlers = this.handlers.get(eventName);
        return !!handlers && handlers.size > 0;
    }

    /**
     * Get the number of subscribers for an event
     * @param eventType The event type to check
     */
    public getSubscriberCount<T extends EventType>(eventType: T): number {
        if (this.disposed) return 0;
        
        const eventName = eventType.toString();
        const handlers = this.handlers.get(eventName);
        return handlers ? handlers.size : 0;
    }

    /**
     * Add middleware to process events before they are emitted
     * @param middleware The middleware function
     */
    public addMiddleware(middleware: EventMiddleware): void {
        if (this.disposed) {
            this.logWarning('Cannot add middleware - EventBus is disposed');
            return;
        }
        
        this.middlewareManager.add(middleware);
    }

    /**
     * Remove middleware
     * @param middleware The middleware function to remove
     */
    public removeMiddleware(middleware: EventMiddleware): void {
        if (this.disposed) {
            this.logWarning('Cannot remove middleware - EventBus is disposed');
            return;
        }
        
        this.middlewareManager.remove(middleware);
    }

    /**
     * Get event statistics
     */
    public getStats(): EventStats {
        return this.stats;
    }

    /**
     * Reset event statistics
     */
    public resetStats(): void {
        this.stats.reset();
    }

    /**
     * Dispose the event bus
     */
    public dispose(): void {
        if (this.disposed) return;
        
        this.logInfo('Disposing EventBus');
        
        // Emit disposed event
        this.emit(
            EventType.SYSTEM_DISPOSED, 
            createEvent(EventType.SYSTEM_DISPOSED, { systemId: 'eventBus' })
        );
        
        // Clear all handlers
        this.handlers.clear();
        this.middlewareManager.clear();
        this.stats.reset();
        this.disposed = true;
        
        this.logInfo('EventBus disposed');
    }

    /**
     * Check if the event bus is disposed
     */
    public isDisposed(): boolean {
        return this.disposed;
    }

    /**
     * Log a debug message
     */
    private logDebug(message: string): void {
        if (this.logger) {
            this.logger.debug(`[EventBus] ${message}`);
        }
    }

    /**
     * Log an info message
     */
    private logInfo(message: string): void {
        if (this.logger) {
            this.logger.info(`[EventBus] ${message}`);
        }
    }

    /**
     * Log a warning message
     */
    private logWarning(message: string): void {
        if (this.logger) {
            this.logger.warn(`[EventBus] ${message}`);
        }
    }

    /**
     * Log an error message
     */
    private logError(message: string, error?: any): void {
        if (this.logger) {
            this.logger.error(`[EventBus] ${message}`, error);
        }
    }
}