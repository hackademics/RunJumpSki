import { EventMiddleware, EventMiddlewareContext } from '../../../types/core/EventTypes';

/**
 * Middleware that logs event processing
 */
export const createLoggingMiddleware = (
    options: {
        logBefore?: boolean;
        logAfter?: boolean;
        logError?: boolean;
    } = {
        logBefore: true,
        logAfter: true,
        logError: true
    }
): EventMiddleware => {
    return async <T>(context: EventMiddlewareContext<T>, next: () => Promise<T>): Promise<T> => {
        const { eventType, data, timestamp, priority } = context;
        const startTime = Date.now();

        if (options.logBefore) {
            console.log(`[Event ${eventType}] Processing started:`, {
                data,
                timestamp,
                priority
            });
        }

        try {
            const result = await next();

            if (options.logAfter) {
                const duration = Date.now() - startTime;
                console.log(`[Event ${eventType}] Processing completed in ${duration}ms:`, {
                    result,
                    timestamp: Date.now()
                });
            }

            return result;
        } catch (error) {
            if (options.logError) {
                console.error(`[Event ${eventType}] Processing failed:`, error);
            }
            throw error;
        }
    };
}; 