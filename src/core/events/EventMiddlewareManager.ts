import { Logger } from '../logger/Logger';
import { EventType, GameEventMap } from '../../types/events/GameEvents';

/**
 * Middleware function type
 * Takes an event name and data, returns processed data or null to cancel the event
 */
export type EventMiddleware = <T extends EventType>(eventName: T, data: GameEventMap[T]) => GameEventMap[T] | null;

/**
 * Manages middleware for the event system
 */
export class EventMiddlewareManager {
    private middleware: EventMiddleware[] = [];
    private logger: Logger | null = null;

    constructor() {
        try {
            this.logger = Logger.getInstance();
        } catch (error) {
            // Logger not initialized yet, will be set later
        }
    }

    /**
     * Add middleware to the processing chain
     * @param middleware The middleware function to add
     */
    public add(middleware: EventMiddleware): void {
        this.middleware.push(middleware);
        this.logDebug(`Added middleware, total: ${this.middleware.length}`);
    }

    /**
     * Remove middleware from the processing chain
     * @param middleware The middleware function to remove
     */
    public remove(middleware: EventMiddleware): void {
        const index = this.middleware.indexOf(middleware);
        if (index !== -1) {
            this.middleware.splice(index, 1);
            this.logDebug(`Removed middleware, total: ${this.middleware.length}`);
        }
    }

    /**
     * Process an event through all middleware
     * @param eventName The name of the event
     * @param data The event data
     * @returns The processed data, or null if the event was cancelled
     */
    public process<T extends EventType>(eventName: T, data: GameEventMap[T]): GameEventMap[T] | null {
        if (this.middleware.length === 0) {
            return data;
        }

        let processedData: GameEventMap[T] | null = data;

        try {
            for (const middleware of this.middleware) {
                // Cast middleware to handle the specific event type
                const typedMiddleware = middleware as (eventName: T, data: GameEventMap[T]) => GameEventMap[T] | null;
                processedData = typedMiddleware(eventName, processedData as GameEventMap[T]);
                
                // If middleware returns null, cancel the event
                if (processedData === null) {
                    this.logDebug(`Event ${eventName} cancelled by middleware`);
                    return null;
                }
            }
        } catch (error) {
            this.logError(`Error in middleware for event ${eventName}:`, error);
            return null;
        }

        return processedData;
    }

    /**
     * Clear all middleware
     */
    public clear(): void {
        this.middleware = [];
        this.logDebug('Cleared all middleware');
    }

    /**
     * Get the number of middleware functions
     */
    public getCount(): number {
        return this.middleware.length;
    }

    /**
     * Log a debug message
     */
    private logDebug(message: string): void {
        if (this.logger) {
            this.logger.debug(`[EventMiddlewareManager] ${message}`);
        }
    }

    /**
     * Log an error message
     */
    private logError(message: string, error?: any): void {
        if (this.logger) {
            this.logger.error(`[EventMiddlewareManager] ${message}`, error);
        }
    }
} 