/**
 * @file src/core/events/EventBus.ts
 * @description EventBus is a central event dispatcher that allows systems to subscribe to, unsubscribe from,
 * and dispatch events. This implementation supports multiple listeners per event and follows our engine's
 * modular design guidelines.
 *
 * @dependencies None
 * @relatedFiles EventSystem.ts, EventTypes.ts
 */

type EventListener = (payload?: any) => void;

export class EventBus {
  private static instance: EventBus;
  private listeners: Map<string, Set<EventListener>>;

  // Private constructor to enforce singleton usage.
  private constructor() {
    this.listeners = new Map<string, Set<EventListener>>();
  }

  /**
   * Retrieves the singleton instance of the EventBus.
   * @returns The EventBus instance.
   */
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Subscribes a listener to the specified event.
   * @param event - The event name.
   * @param listener - The callback to invoke when the event is dispatched.
   */
  public subscribe(event: string, listener: EventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set<EventListener>());
    }
    this.listeners.get(event)?.add(listener);
  }

  /**
   * Unsubscribes a listener from the specified event.
   * @param event - The event name.
   * @param listener - The callback to remove.
   */
  public unsubscribe(event: string, listener: EventListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  /**
   * Dispatches an event to all registered listeners.
   * @param event - The event name.
   * @param payload - Optional data to send with the event.
   */
  public dispatch(event: string, payload?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((listener) => listener(payload));
    }
  }
}
