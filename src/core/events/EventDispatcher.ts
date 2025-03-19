import { IEvent, IEventDispatcher, EventHandler, SubscriptionId } from './IEvent';
import { v4 as uuidv4 } from 'uuid';
import { ILogger } from '../utils/ILogger';

/**
 * Subscription entry in the event dispatcher
 */
interface Subscription<T extends IEvent> {
  id: SubscriptionId;
  eventType: string;
  handler: EventHandler<T>;
}

/**
 * Implementation of the IEventDispatcher interface
 */
export class EventDispatcher implements IEventDispatcher {
  private subscriptions: Map<string, Subscription<any>[]> = new Map();
  private logger?: ILogger;
  
  /**
   * Create a new EventDispatcher
   * @param logger Optional logger for event activity
   */
  constructor(logger?: ILogger) {
    this.logger = logger;
  }

  /**
   * Register a handler for a specific event type
   * @param eventType The event type to subscribe to
   * @param handler The handler function to call when event is dispatched
   * @returns A subscription ID that can be used to unsubscribe
   */
  public subscribe<T extends IEvent>(eventType: string, handler: EventHandler<T>): SubscriptionId {
    // Generate a unique ID for this subscription
    const subscriptionId = uuidv4();
    
    // Create the subscription entry
    const subscription: Subscription<T> = {
      id: subscriptionId,
      eventType,
      handler
    };
    
    // Add to the map
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }
    
    this.subscriptions.get(eventType)!.push(subscription);
    
    this.logger?.debug(`Subscribed to event ${eventType} with ID ${subscriptionId}`);
    
    return subscriptionId;
  }

  /**
   * Unregister a handler using its subscription ID
   * @param subscriptionId The subscription ID to unsubscribe
   * @returns True if the subscription was found and removed, false otherwise
   */
  public unsubscribe(subscriptionId: SubscriptionId): boolean {
    let found = false;
    
    // Iterate through all event types
    for (const [eventType, subscriptions] of this.subscriptions.entries()) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
      
      if (index !== -1) {
        // Remove the subscription
        subscriptions.splice(index, 1);
        found = true;
        
        this.logger?.debug(`Unsubscribed from event ${eventType} with ID ${subscriptionId}`);
        
        // If no more subscriptions for this event type, remove the entry
        if (subscriptions.length === 0) {
          this.subscriptions.delete(eventType);
        }
        
        break;
      }
    }
    
    return found;
  }

  /**
   * Dispatch an event to all registered handlers
   * @param event The event to dispatch
   */
  public dispatch<T extends IEvent>(event: T): void {
    const eventType = event.type;
    const handlers = this.subscriptions.get(eventType);
    
    if (!handlers || handlers.length === 0) {
      this.logger?.debug(`No handlers registered for event ${eventType}`);
      return;
    }
    
    this.logger?.debug(`Dispatching event ${eventType} to ${handlers.length} handlers`);
    
    // Call each handler with the event
    for (const { handler } of handlers) {
      try {
        handler(event);
      } catch (error) {
        this.logger?.error(`Error in event handler for ${eventType}:`, error);
      }
    }
  }

  /**
   * Unsubscribe all handlers for a specific event type
   * @param eventType The event type to clear
   * @returns The number of subscriptions removed
   */
  public clearEventType(eventType: string): number {
    const handlers = this.subscriptions.get(eventType);
    
    if (!handlers) {
      return 0;
    }
    
    const count = handlers.length;
    this.subscriptions.delete(eventType);
    
    this.logger?.debug(`Cleared ${count} handlers for event ${eventType}`);
    
    return count;
  }

  /**
   * Unsubscribe all handlers for all event types
   * @returns The number of subscriptions removed
   */
  public clearAll(): number {
    let totalCount = 0;
    
    // Count total subscriptions
    for (const handlers of this.subscriptions.values()) {
      totalCount += handlers.length;
    }
    
    this.subscriptions.clear();
    
    this.logger?.debug(`Cleared all event subscriptions (${totalCount} total)`);
    
    return totalCount;
  }
}