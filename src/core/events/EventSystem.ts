import { System } from '../base/System';
import { IEvent, IEventDispatcher, EventHandler, SubscriptionId } from './IEvent';
import { EventDispatcher } from './EventDispatcher';
import { ILogger } from '../utils/ILogger';
import { ServiceLocator } from '../base/ServiceLocator';

/**
 * System that manages events and event dispatching
 */
export class EventSystem extends System implements IEventDispatcher {
  private dispatcher: EventDispatcher;
  private logger?: ILogger;
  
  /**
   * Create a new EventSystem
   */
  constructor() {
    super();
    // Set a low priority so event system initializes early
    this.priority = -900;  // Just after logging system
  }

  /**
   * Initialize the event system
   */
  public async initialize(): Promise<void> {
    // Get the logger if available
    try {
      this.logger = ServiceLocator.resolve<ILogger>(ILogger);
      this.logger.addTag('EventSystem');
    } catch (e) {
      // Logger not registered, continue without it
      console.info('EventSystem initialized (no logger available)');
    }
    
    this.dispatcher = new EventDispatcher(this.logger);
    
    this.logger?.info('EventSystem initialized');
  }
  

  /**
   * Update method - nothing to do on frame update for events
   * @param deltaTime Time since last frame
   */
  public update(deltaTime: number): void {
    // Event system doesn't need to update each frame
  }

  /**
   * Shutdown the event system
   */
  public shutdown(): void {
    const count = this.dispatcher.clearAll();
    this.logger?.info(`EventSystem shutting down, cleared ${count} subscriptions`);
  }

  /**
   * Register a handler for a specific event type
   * @param eventType The event type to subscribe to
   * @param handler The handler function to call when event is dispatched
   * @returns A subscription ID that can be used to unsubscribe
   */
  public subscribe<T extends IEvent>(eventType: string, handler: EventHandler<T>): SubscriptionId {
    return this.dispatcher.subscribe(eventType, handler);
  }

  /**
   * Unregister a handler using its subscription ID
   * @param subscriptionId The subscription ID to unsubscribe
   * @returns True if the subscription was found and removed, false otherwise
   */
  public unsubscribe(subscriptionId: SubscriptionId): boolean {
    return this.dispatcher.unsubscribe(subscriptionId);
  }

  /**
   * Dispatch an event to all registered handlers
   * @param event The event to dispatch
   */
  public dispatch<T extends IEvent>(event: T): void {
    this.dispatcher.dispatch(event);
  }

  /**
   * Unsubscribe all handlers for a specific event type
   * @param eventType The event type to clear
   * @returns The number of subscriptions removed
   */
  public clearEventType(eventType: string): number {
    return this.dispatcher.clearEventType(eventType);
  }

  /**
   * Unsubscribe all handlers for all event types
   * @returns The number of subscriptions removed
   */
  public clearAll(): number {
    return this.dispatcher.clearAll();
  }
}