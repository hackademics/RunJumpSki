/**
 * Base interface for all events in the system
 */
export interface IEvent {
    /**
     * Unique type identifier for the event
     */
    readonly type: string;
    
    /**
     * Timestamp when the event was created
     */
    readonly timestamp: number;
    
    /**
     * Optional source identifier
     */
    readonly source?: string;
  }
  
  /**
   * Event handler function type
   */
  export type EventHandler<T extends IEvent> = (event: T) => void;
  
  /**
   * Event subscription identifier
   */
  export type SubscriptionId = string;
  
  /**
   * Interface for event dispatcher
   */
  export interface IEventDispatcher {
    /**
     * Register a handler for a specific event type
     * @param eventType The event type to subscribe to
     * @param handler The handler function to call when event is dispatched
     * @returns A subscription ID that can be used to unsubscribe
     */
    subscribe<T extends IEvent>(eventType: string, handler: EventHandler<T>): SubscriptionId;
    
    /**
     * Unregister a handler using its subscription ID
     * @param subscriptionId The subscription ID to unsubscribe
     * @returns True if the subscription was found and removed, false otherwise
     */
    unsubscribe(subscriptionId: SubscriptionId): boolean;
    
    /**
     * Dispatch an event to all registered handlers
     * @param event The event to dispatch
     */
    dispatch<T extends IEvent>(event: T): void;
  }