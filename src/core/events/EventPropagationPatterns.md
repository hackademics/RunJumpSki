# Event Propagation Patterns

## Overview

This document establishes consistent patterns for event propagation throughout the application. Following these patterns ensures a predictable flow of events and makes debugging and maintenance easier.

## Available Event Systems

Our application uses two different event systems:

1. **EventSystem/EventDispatcher** - A typed, interface-based system for core game events
2. **EventEmitter** - A simpler, string-based system for UI and less critical events

## When to Use Each System

- **EventSystem/EventDispatcher**: Use for core game mechanics, physics, entity-component communication, and other critical systems where type safety is important.
- **EventEmitter**: Use for UI events, debug features, and non-critical systems where flexibility is more important than type safety.

## Event Bubbling and Capturing

Unlike DOM events, our custom event systems do not implement capturing and bubbling phases. Events are dispatched directly to registered handlers. To achieve hierarchical event propagation:

1. Create explicit parent-child relationships between event dispatchers
2. Forward events up or down the hierarchy as needed
3. Use consistent naming patterns for related events (e.g., `entity.*.start`, `entity.*.update`, `entity.*.end`)

### Example: Component to Entity Propagation

```typescript
// Component receives an event and propagates to its parent entity
class Component {
  private entity: Entity;
  
  constructor(entity: Entity) {
    this.entity = entity;
    this.eventSystem.subscribe("component.hit", this.onHit.bind(this));
  }
  
  private onHit(event: HitEvent): void {
    // Handle at component level
    this.processHit(event);
    
    // Propagate to entity
    this.eventSystem.dispatch({
      type: "entity.hit",
      entityId: this.entity.id,
      originalEvent: event,
      timestamp: Date.now()
    });
  }
}
```

## Event Ordering

Neither event system guarantees the order in which handlers are called. To implement ordered event processing:

1. Use a priority system for listeners when ordering is important
2. Implement multi-phase events when actions must occur in a specific order
3. Use message queues for events that need to be processed in a specific order

### Example: Priority-Based Event Processing

```typescript
interface PriorityEventHandler<T> {
  handler: (event: T) => void;
  priority: number;
}

class PriorityEventDispatcher<T> {
  private handlers: PriorityEventHandler<T>[] = [];
  
  addHandler(handler: (event: T) => void, priority: number = 0): void {
    this.handlers.push({ handler, priority });
    // Sort by priority (higher numbers first)
    this.handlers.sort((a, b) => b.priority - a.priority);
  }
  
  dispatch(event: T): void {
    for (const { handler } of this.handlers) {
      handler(event);
    }
  }
}
```

## Error Handling

Both event systems catch exceptions in event handlers to prevent one bad handler from breaking the entire event chain. However, error handling strategies should be consistent:

1. Log all errors that occur in event handlers
2. Consider using a centralized error handling service
3. Provide context in error messages (event type, source, etc.)
4. Implement a retry mechanism for critical events

## Debugging Events

To make event-based systems easier to debug:

1. Enable event logging in development builds
2. Implement a way to visualize event flow
3. Add timestamps to events for profiling
4. Consider implementing event replay for complex bugs

## Memory Management and Performance

Follow these guidelines to prevent memory leaks and performance issues:

1. Always remove event listeners when components are destroyed
2. Use weak references for long-lived event subscriptions
3. Batch related events when dispatching multiple events in sequence
4. Throttle high-frequency events when appropriate

## Implementation Patterns

### Publish-Subscribe Pattern

```typescript
// Publisher
class Publisher {
  constructor(private eventSystem: EventSystem) {}
  
  public doSomething(): void {
    // Do work
    this.eventSystem.dispatch({
      type: "publisher.didSomething",
      data: result,
      timestamp: Date.now()
    });
  }
}

// Subscriber
class Subscriber {
  constructor(private eventSystem: EventSystem) {
    this.eventSystem.subscribe("publisher.didSomething", this.onPublisherDidSomething.bind(this));
  }
  
  private onPublisherDidSomething(event: PublisherEvent): void {
    // React to the event
  }
}
```

### Request-Response Pattern

```typescript
// Requester
class Requester {
  constructor(private eventSystem: EventSystem) {}
  
  public async requestData(): Promise<any> {
    return new Promise((resolve) => {
      const requestId = generateUniqueId();
      
      // One-time subscription for this specific response
      const subscriptionId = this.eventSystem.subscribe(
        "data.response", 
        (event: ResponseEvent) => {
          if (event.requestId === requestId) {
            this.eventSystem.unsubscribe(subscriptionId);
            resolve(event.data);
          }
        }
      );
      
      // Send the request
      this.eventSystem.dispatch({
        type: "data.request",
        requestId,
        timestamp: Date.now()
      });
      
      // Optional: Add timeout logic
    });
  }
}

// Responder
class Responder {
  constructor(private eventSystem: EventSystem) {
    this.eventSystem.subscribe("data.request", this.onDataRequest.bind(this));
  }
  
  private onDataRequest(event: RequestEvent): void {
    const data = this.fetchData();
    
    this.eventSystem.dispatch({
      type: "data.response",
      requestId: event.requestId,
      data,
      timestamp: Date.now()
    });
  }
}
``` 