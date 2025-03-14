/**
 * EventSystem.ts
 * Core event system for game-wide communication
 */

import { IEvent, EventDataMap } from '../types/events/GameEvents';
import { Logger } from '../utils/Logger';

/**
 * Event handler type
 */
type EventHandler<T extends IEvent> = (event: T) => void;

/**
 * Event handler with priority
 */
interface PrioritizedEventHandler<T extends IEvent> {
    handler: EventHandler<T>;
    priority: number;
}

/**
 * Batched event
 */
interface BatchedEvent<T extends IEvent> {
    type: keyof EventDataMap;
    data: T;
}

/**
 * Event filter function
 */
type EventFilter<T extends IEvent> = (event: T) => boolean;

/**
 * Event performance metrics
 */
interface EventMetrics {
    eventType: string;
    callCount: number;
    totalTime: number;
    averageTime: number;
    maxTime: number;
    lastProcessed: number;
}

/**
 * Event system for game-wide communication
 */
export class EventSystem {
    private static instance: EventSystem;
    private logger: Logger;
    private listeners: Map<string, PrioritizedEventHandler<any>[]>;
    private onceListeners: Map<string, PrioritizedEventHandler<any>[]>;
    private filters: Map<string, EventFilter<any>[]>;
    private debugMode: boolean;
    private batchedEvents: BatchedEvent<any>[];
    private isBatching: boolean;
    private isProcessingBatch: boolean;
    private metrics: Map<string, EventMetrics>;
    private collectMetrics: boolean;

    /**
     * Get the singleton instance
     * @returns The EventSystem instance
     */
    public static getInstance(): EventSystem {
        if (!EventSystem.instance) {
            EventSystem.instance = new EventSystem();
        }
        return EventSystem.instance;
    }

    /**
     * Create a new EventSystem
     * @param debugMode Whether to log events for debugging
     * @param collectMetrics Whether to collect performance metrics
     */
    constructor(debugMode: boolean = false, collectMetrics: boolean = false) {
        this.logger = new Logger('EventSystem');
        this.listeners = new Map();
        this.onceListeners = new Map();
        this.filters = new Map();
        this.debugMode = debugMode;
        this.batchedEvents = [];
        this.isBatching = false;
        this.isProcessingBatch = false;
        this.metrics = new Map();
        this.collectMetrics = collectMetrics;
    }

    /**
     * Enable or disable debug mode
     * @param enabled Whether debug mode is enabled
     */
    public setDebugMode(enabled: boolean): void {
        this.debugMode = enabled;
    }

    /**
     * Enable or disable metrics collection
     * @param enabled Whether to collect metrics
     */
    public setMetricsCollection(enabled: boolean): void {
        this.collectMetrics = enabled;
        if (!enabled) {
            this.metrics.clear();
        }
    }

    /**
     * Get event metrics
     * @param eventType Optional event type to filter metrics
     * @returns Event metrics
     */
    public getMetrics(eventType?: string): EventMetrics[] {
        if (eventType) {
            const metric = this.metrics.get(eventType);
            return metric ? [metric] : [];
        }
        return Array.from(this.metrics.values());
    }

    /**
     * Reset event metrics
     * @param eventType Optional event type to reset
     */
    public resetMetrics(eventType?: string): void {
        if (eventType) {
            this.metrics.delete(eventType);
        } else {
            this.metrics.clear();
        }
    }

    /**
     * Start batching events
     * Events will be queued and processed when endBatch is called
     */
    public startBatch(): void {
        if (this.isProcessingBatch) {
            this.logger.warn('Cannot start a new batch while processing a batch');
            return;
        }
        this.isBatching = true;
    }

    /**
     * End batching and process all queued events
     */
    public endBatch(): void {
        if (!this.isBatching) {
            return;
        }

        this.isBatching = false;
        this.isProcessingBatch = true;

        // Process all batched events
        for (const batchedEvent of this.batchedEvents) {
            this.processEvent(
                batchedEvent.type,
                batchedEvent.data
            );
        }

        // Clear the batch
        this.batchedEvents = [];
        this.isProcessingBatch = false;
    }

    /**
     * Add an event listener
     * @param type Event type
     * @param handler Event handler
     * @param priority Handler priority (higher numbers execute first, default: 0)
     */
    public on<K extends keyof EventDataMap>(
        type: K,
        handler: EventHandler<EventDataMap[K]>,
        priority: number = 0
    ): void {
        if (!this.listeners.has(type as string)) {
            this.listeners.set(type as string, []);
        }
        
        const handlers = this.listeners.get(type as string)!;
        handlers.push({ handler, priority });
        
        // Sort handlers by priority (descending)
        handlers.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Subscribe to an event (alias for on)
     * @param type Event type
     * @param handler Event handler
     * @param priority Handler priority (higher numbers execute first, default: 0)
     */
    public subscribe<K extends keyof EventDataMap>(
        type: K,
        handler: EventHandler<EventDataMap[K]>,
        priority: number = 0
    ): void {
        this.on(type, handler, priority);
    }

    /**
     * Add a one-time event listener
     * @param type Event type
     * @param handler Event handler
     * @param priority Handler priority (higher numbers execute first, default: 0)
     */
    public once<K extends keyof EventDataMap>(
        type: K,
        handler: EventHandler<EventDataMap[K]>,
        priority: number = 0
    ): void {
        if (!this.onceListeners.has(type as string)) {
            this.onceListeners.set(type as string, []);
        }
        
        const handlers = this.onceListeners.get(type as string)!;
        handlers.push({ handler, priority });
        
        // Sort handlers by priority (descending)
        handlers.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Add an event filter
     * @param type Event type
     * @param filter Filter function
     */
    public addFilter<K extends keyof EventDataMap>(
        type: K,
        filter: EventFilter<EventDataMap[K]>
    ): void {
        if (!this.filters.has(type as string)) {
            this.filters.set(type as string, []);
        }
        
        const filters = this.filters.get(type as string)!;
        filters.push(filter);
    }

    /**
     * Remove an event filter
     * @param type Event type
     * @param filter Filter function
     */
    public removeFilter<K extends keyof EventDataMap>(
        type: K,
        filter: EventFilter<EventDataMap[K]>
    ): void {
        if (this.filters.has(type as string)) {
            const filters = this.filters.get(type as string)!;
            const index = filters.indexOf(filter);
            if (index !== -1) {
                filters.splice(index, 1);
            }
        }
    }

    /**
     * Remove an event listener
     * @param type Event type
     * @param handler Event handler
     */
    public off<K extends keyof EventDataMap>(
        type: K,
        handler: EventHandler<EventDataMap[K]>
    ): void {
        if (!this.listeners.has(type as string)) {
            return;
        }
        
        const handlers = this.listeners.get(type as string)!;
        const index = handlers.findIndex(h => h.handler === handler);
        
        if (index !== -1) {
            handlers.splice(index, 1);
        }
    }

    /**
     * Unsubscribe from an event (alias for off)
     * @param type Event type
     * @param handler Event handler
     */
    public unsubscribe<K extends keyof EventDataMap>(
        type: K,
        handler: EventHandler<EventDataMap[K]>
    ): void {
        this.off(type, handler);
    }

    /**
     * Remove all listeners for an event type
     * @param type Event type
     */
    public removeAllListeners<K extends keyof EventDataMap>(type?: K): void {
        if (type) {
            this.listeners.delete(type as string);
            this.onceListeners.delete(type as string);
            this.filters.delete(type as string);
        } else {
            this.listeners.clear();
            this.onceListeners.clear();
            this.filters.clear();
        }
    }

    /**
     * Emit an event
     * @param type Event type
     * @param data Event data
     */
    public emit<K extends keyof EventDataMap>(
        type: K,
        data: Omit<EventDataMap[K], 'type' | 'timestamp'>
    ): void {
        const event = {
            type,
            timestamp: Date.now(),
            ...data
        } as EventDataMap[K];

        if (this.debugMode) {
            this.logger.debug(`Event emitted: ${type}`, event);
        }

        // If batching, add to batch
        if (this.isBatching && !this.isProcessingBatch) {
            this.batchedEvents.push({
                type,
                data: event
            });
            return;
        }

        // Otherwise process immediately
        this.processEvent(type, event);
    }

    /**
     * Process an event (internal)
     * @param type Event type
     * @param event Event data
     */
    private processEvent<K extends keyof EventDataMap>(
        type: K,
        event: EventDataMap[K]
    ): void {
        const typeStr = type as string;
        const startTime = this.collectMetrics ? performance.now() : 0;
        
        // Apply filters
        if (this.filters.has(typeStr)) {
            const filters = this.filters.get(typeStr)!;
            for (const filter of filters) {
                if (!filter(event)) {
                    if (this.debugMode) {
                        this.logger.debug(`Event filtered: ${type}`);
                    }
                    return;
                }
            }
        }

        // Call regular listeners
        if (this.listeners.has(typeStr)) {
            const handlers = this.listeners.get(typeStr)!;
            for (const { handler } of handlers) {
                try {
                    handler(event);
                } catch (error) {
                    this.logger.error(`Error in event handler for ${type}:`, error);
                }
            }
        }

        // Call once listeners
        if (this.onceListeners.has(typeStr)) {
            const handlers = this.onceListeners.get(typeStr)!;
            // Create a copy of the handlers array to avoid issues when handlers are removed
            const handlersToCall = [...handlers];
            // Clear the once listeners for this event
            this.onceListeners.set(typeStr, []);
            
            for (const { handler } of handlersToCall) {
                try {
                    handler(event);
                } catch (error) {
                    this.logger.error(`Error in once event handler for ${type}:`, error);
                }
            }
        }
        
        // Update metrics
        if (this.collectMetrics) {
            const endTime = performance.now();
            const processingTime = endTime - startTime;
            
            if (!this.metrics.has(typeStr)) {
                this.metrics.set(typeStr, {
                    eventType: typeStr,
                    callCount: 0,
                    totalTime: 0,
                    averageTime: 0,
                    maxTime: 0,
                    lastProcessed: Date.now()
                });
            }
            
            const metric = this.metrics.get(typeStr)!;
            metric.callCount++;
            metric.totalTime += processingTime;
            metric.averageTime = metric.totalTime / metric.callCount;
            metric.maxTime = Math.max(metric.maxTime, processingTime);
            metric.lastProcessed = Date.now();
        }
    }

    /**
     * Check if an event type has any listeners
     * @param type Event type
     * @returns Whether the event type has any listeners
     */
    public hasListeners<K extends keyof EventDataMap>(type: K): boolean {
        const hasRegular = this.listeners.has(type as string) && 
                          this.listeners.get(type as string)!.length > 0;
        const hasOnce = this.onceListeners.has(type as string) && 
                       this.onceListeners.get(type as string)!.length > 0;
        return hasRegular || hasOnce;
    }

    /**
     * Get the number of listeners for an event type
     * @param type Event type
     * @returns Number of listeners
     */
    public listenerCount<K extends keyof EventDataMap>(type: K): number {
        let count = 0;
        if (this.listeners.has(type as string)) {
            count += this.listeners.get(type as string)!.length;
        }
        if (this.onceListeners.has(type as string)) {
            count += this.onceListeners.get(type as string)!.length;
        }
        return count;
    }
}
