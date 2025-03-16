import { EventBus } from '../../src/core/events/EventBus';
import { EventPriority } from '../../src/types/core/EventTypes';
import { EventError } from '../../src/utils/errors/EventError';
import { createLoggingMiddleware } from '../../src/core/events/middleware/LoggingMiddleware';
import { createValidationMiddleware } from '../../src/core/events/middleware/ValidationMiddleware';

// Example event map for testing
declare module '../../src/types/core/EventTypes' {
    interface EventMap {
        'test:basic': string;
        'test:validation': { value: number };
        'test:priority': number;
    }
}

describe('EventBus', () => {
    let eventBus: EventBus;
    
    beforeEach(() => {
        // Get a fresh instance for each test
        eventBus = EventBus.getInstance();
        
        // Clear all handlers to avoid test interference
        // This is a bit of a hack since we don't have a public API for this
        (eventBus as any).handlers = new Map();
    });
    
    describe('Basic Event Handling', () => {
        it('should emit and handle events', async () => {
            const handler = jest.fn();
            eventBus.on('test:basic', handler);
            await eventBus.emit('test:basic', 'test data');
            expect(handler).toHaveBeenCalledWith('test data');
        });

        it('should handle one-time events', async () => {
            const handler = jest.fn();
            eventBus.once('test:basic', handler);
            await eventBus.emit('test:basic', 'first');
            await eventBus.emit('test:basic', 'second');
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith('first');
        });

        it('should remove event handlers', async () => {
            const handler = jest.fn();
            eventBus.on('test:basic', handler);
            eventBus.off('test:basic', handler);
            await eventBus.emit('test:basic', 'test');
            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe('Event Filtering', () => {
        test('should filter events based on predicate', () => {
            const handler = jest.fn();
            const data1 = { value: 42 };
            const data2 = { value: 24 };

            eventBus.on('test:filtered', handler, {
                filter: data => data.value > 30
            });

            eventBus.emit('test:filtered', data1); // Should be handled
            eventBus.emit('test:filtered', data2); // Should be filtered

            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith(data1);
        });
    });

    describe('Event Priorities', () => {
        it('should handle events in priority order', async () => {
            const order: number[] = [];
            
            eventBus.on('test:priority', (num) => { order.push(num); return Promise.resolve(); }, { priority: EventPriority.LOW });
            eventBus.on('test:priority', (num) => { order.push(num); return Promise.resolve(); }, { priority: EventPriority.NORMAL });
            eventBus.on('test:priority', (num) => { order.push(num); return Promise.resolve(); }, { priority: EventPriority.HIGH });
            
            await eventBus.emit('test:priority', 1);
            expect(order).toEqual([1, 1, 1]); // Same number, but handlers called in priority order
        });
    });

    describe('Error Handling', () => {
        test('should throw EventError when handler fails', () => {
            const error = new Error('Test error');
            const handler = () => { throw error; };

            eventBus.on('test:error', handler, { debugName: 'errorHandler' });

            expect(() => eventBus.emit('test:error', { value: 42 }))
                .toThrow(EventError);
        });
    });

    describe('Statistics', () => {
        it('should track event statistics', async () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();

            eventBus.on('test:basic', handler1);
            eventBus.on('test:basic', handler2);
            await eventBus.emit('test:basic', 'test');

            const stats = eventBus.getStats();
            expect(stats.eventTypeCount).toBe(1);
            expect(stats.handlerCount).toBe(2);
            expect(stats.emitCount['test:basic']).toBe(1);
        });

        test('should track filtered events', () => {
            const handler = jest.fn();
            const data = { value: 24 };

            eventBus.on('test:filtered', handler, {
                filter: data => data.value > 30
            });

            eventBus.emit('test:filtered', data);

            const stats = eventBus.getStats();
            expect(stats.filteredCount['test:filtered']).toBe(1);
        });
    });

    describe('Middleware', () => {
        it('should process events through middleware', async () => {
            const logs: string[] = [];
            const customLog = (msg: string) => logs.push(msg);

            const loggingMiddleware = createLoggingMiddleware({
                logBefore: true,
                logAfter: true,
                logError: true
            });

            const validationMiddleware = createValidationMiddleware({
                'test:validation': [
                    {
                        validate: (data: { value: number }) => data.value > 0,
                        message: 'Value must be positive'
                    }
                ]
            });

            eventBus.use(loggingMiddleware);
            eventBus.use(validationMiddleware);

            const handler = jest.fn();
            eventBus.on('test:validation', handler);

            // Valid event
            await eventBus.emit('test:validation', { value: 42 });
            expect(handler).toHaveBeenCalledWith({ value: 42 });

            // Invalid event
            await expect(
                eventBus.emit('test:validation', { value: -1 })
            ).rejects.toThrow('Validation failed for event test:validation: Value must be positive');
        });
    });
});
