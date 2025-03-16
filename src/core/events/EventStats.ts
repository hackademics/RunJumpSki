/**
 * Statistics for the event system
 */
export class EventStats {
    private subscriptionCounts: Map<string, number> = new Map();
    private emitCounts: Map<string, number> = new Map();
    private errorCounts: Map<string, number> = new Map();
    private startTime: number = Date.now();
    private totalEvents: number = 0;
    private totalErrors: number = 0;

    /**
     * Increment the subscription count for an event
     * @param eventName The event name
     */
    public incrementSubscriptionCount(eventName: string): void {
        const count = this.subscriptionCounts.get(eventName) || 0;
        this.subscriptionCounts.set(eventName, count + 1);
    }

    /**
     * Decrement the subscription count for an event
     * @param eventName The event name
     */
    public decrementSubscriptionCount(eventName: string): void {
        const count = this.subscriptionCounts.get(eventName) || 0;
        if (count > 0) {
            this.subscriptionCounts.set(eventName, count - 1);
        }
    }

    /**
     * Increment the emit count for an event
     * @param eventName The event name
     */
    public incrementEmitCount(eventName: string): void {
        const count = this.emitCounts.get(eventName) || 0;
        this.emitCounts.set(eventName, count + 1);
        this.totalEvents++;
    }

    /**
     * Increment the error count for an event
     * @param eventName The event name
     */
    public incrementErrorCount(eventName: string): void {
        const count = this.errorCounts.get(eventName) || 0;
        this.errorCounts.set(eventName, count + 1);
        this.totalErrors++;
    }

    /**
     * Get the subscription count for an event
     * @param eventName The event name
     */
    public getSubscriptionCount(eventName: string): number {
        return this.subscriptionCounts.get(eventName) || 0;
    }

    /**
     * Get the emit count for an event
     * @param eventName The event name
     */
    public getEmitCount(eventName: string): number {
        return this.emitCounts.get(eventName) || 0;
    }

    /**
     * Get the error count for an event
     * @param eventName The event name
     */
    public getErrorCount(eventName: string): number {
        return this.errorCounts.get(eventName) || 0;
    }

    /**
     * Get all event names that have been tracked
     */
    public getEventNames(): string[] {
        const eventNames = new Set<string>();
        
        for (const eventName of this.subscriptionCounts.keys()) {
            eventNames.add(eventName);
        }
        
        for (const eventName of this.emitCounts.keys()) {
            eventNames.add(eventName);
        }
        
        return Array.from(eventNames);
    }

    /**
     * Get the total number of events emitted
     */
    public getTotalEvents(): number {
        return this.totalEvents;
    }

    /**
     * Get the total number of errors
     */
    public getTotalErrors(): number {
        return this.totalErrors;
    }

    /**
     * Get the uptime in milliseconds
     */
    public getUptime(): number {
        return Date.now() - this.startTime;
    }

    /**
     * Get the events per second rate
     */
    public getEventsPerSecond(): number {
        const uptime = this.getUptime() / 1000; // Convert to seconds
        return uptime > 0 ? this.totalEvents / uptime : 0;
    }

    /**
     * Get a summary of the event statistics
     */
    public getSummary(): EventStatsSummary {
        const eventNames = this.getEventNames();
        const eventStats: Record<string, EventStat> = {};
        
        for (const eventName of eventNames) {
            eventStats[eventName] = {
                subscriptions: this.getSubscriptionCount(eventName),
                emits: this.getEmitCount(eventName),
                errors: this.getErrorCount(eventName)
            };
        }
        
        return {
            eventStats,
            totalEvents: this.totalEvents,
            totalErrors: this.totalErrors,
            uptime: this.getUptime(),
            eventsPerSecond: this.getEventsPerSecond()
        };
    }

    /**
     * Reset all statistics
     */
    public reset(): void {
        this.subscriptionCounts.clear();
        this.emitCounts.clear();
        this.errorCounts.clear();
        this.startTime = Date.now();
        this.totalEvents = 0;
        this.totalErrors = 0;
    }
}

/**
 * Statistics for a single event
 */
export interface EventStat {
    subscriptions: number;
    emits: number;
    errors: number;
}

/**
 * Summary of all event statistics
 */
export interface EventStatsSummary {
    eventStats: Record<string, EventStat>;
    totalEvents: number;
    totalErrors: number;
    uptime: number;
    eventsPerSecond: number;
} 