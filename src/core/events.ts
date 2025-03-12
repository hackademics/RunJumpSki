import { Logger } from '../utils/logger';
import { IEventEmitter, EventHandler, EventData } from '../types/events';

/**
 * Event emitter for game-wide communication
 */
export class EventEmitter implements IEventEmitter {
    private logger: Logger;
    private events: Map<string, EventHandler[]> = new Map();

    constructor() {
        this.logger = new Logger('EventEmitter');
    }

    /**
     * Register an event handler
     * @param event Event name
     * @param handler Handler function
     */
    public on(event: string, handler: EventHandler): void {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }

        const handlers = this.events.get(event);
        if (handlers && !handlers.includes(handler)) {
            handlers.push(handler);
            this.logger.debug(`Registered handler for event: ${event}`);
        }
    }

    /**
     * Register a one-time event handler
     * @param event Event name
     * @param handler Handler function
     */
    public once(event: string, handler: EventHandler): void {
        const onceHandler: EventHandler = (data: EventData) => {
            this.off(event, onceHandler);
            handler(data);
        };

        this.on(event, onceHandler);
    }

    /**
     * Remove an event handler
     * @param event Event name
     * @param handler Handler function to remove
     */
    public off(event: string, handler: EventHandler): void {
        if (!this.events.has(event)) {
            return;
        }

        const handlers = this.events.get(event);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index !== -1) {
                handlers.splice(index, 1);
                this.logger.debug(`Removed handler for event: ${event}`);
            }

            // Clean up empty event arrays
            if (handlers.length === 0) {
                this.events.delete(event);
            }
        }
    }

    /**
     * Emit an event with data
     * @param event Event name
     * @param data Event data
     */
    public emit(event: string, data: EventData = {}): void {
        if (!this.events.has(event)) {
            return;
        }

        const handlers = this.events.get(event);
        if (handlers) {
            try {
                // Create a copy of the handlers array to avoid issues if handlers
                // modify the array during iteration (e.g., by calling off())
                const handlersCopy = [...handlers];

                for (const handler of handlersCopy) {
                    handler(data);
                }

                this.logger.debug(`Emitted event: ${event} with ${handlers.length} handlers`);
            } catch (error) {
                this.logger.error(`Error emitting event ${event}`, error);
            }
        }
    }

    /**
     * Get the number of handlers for an event
     * @param event Event name
     */
    public listenerCount(event: string): number {
        return this.events.has(event) ? (this.events.get(event)?.length || 0) : 0;
    }

    /**
     * Remove all event handlers
     * @param event Optional event name, if not provided all events are cleared
     */
    public removeAllListeners(event?: string): void {
        if (event) {
            this.events.delete(event);
            this.logger.debug(`Removed all listeners for event: ${event}`);
        } else {
            this.events.clear();
            this.logger.debug('Removed all event listeners');
        }
    }
}
