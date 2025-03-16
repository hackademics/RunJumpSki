/**
 * Error thrown when there is a problem with event handling
 */
export class EventError extends Error {
    constructor(
        public readonly eventType: string,
        message: string,
        public readonly handlerName?: string
    ) {
        super(`Event ${eventType}${handlerName ? ` (${handlerName})` : ''}: ${message}`);
        this.name = 'EventError';
    }
} 