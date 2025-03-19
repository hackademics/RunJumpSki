/**
 * @file src/core/events/EventEmitter.ts
 * @description A lightweight event emitter for game events
 */

/**
 * Type for event listener callback functions
 */
type EventListener = (...args: any[]) => void;

/**
 * Simple event emitter for game events
 */
export class EventEmitter {
  private listeners: Map<string, Set<EventListener>> = new Map();

  /**
   * Registers an event listener
   * @param event The event name
   * @param callback The callback function
   * @returns A function to unregister the listener
   */
  public on(event: string, callback: EventListener): () => void {
    // Initialize the set of listeners for this event if it doesn't exist
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    // Add the callback to the set of listeners
    this.listeners.get(event)!.add(callback);

    // Return a function to unregister the listener
    return () => this.off(event, callback);
  }

  /**
   * Unregisters an event listener
   * @param event The event name
   * @param callback The callback function
   */
  public off(event: string, callback: EventListener): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      
      // Clean up empty sets
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emits an event
   * @param event The event name
   * @param args The arguments to pass to the listeners
   */
  public emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      // Create a copy of the listeners to avoid issues if a listener unregisters itself
      const listeners = Array.from(eventListeners);
      for (const listener of listeners) {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      }
    }
  }

  /**
   * Unregisters all listeners for an event
   * @param event The event name, or undefined to clear all events
   */
  public clear(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Gets the number of listeners for an event
   * @param event The event name
   * @returns The number of listeners
   */
  public listenerCount(event: string): number {
    const eventListeners = this.listeners.get(event);
    return eventListeners ? eventListeners.size : 0;
  }

  /**
   * Checks if an event has any listeners
   * @param event The event name
   * @returns True if the event has listeners, false otherwise
   */
  public hasListeners(event: string): boolean {
    return this.listenerCount(event) > 0;
  }
}
