import { EventBus } from '../core/events/EventBus';
import { LoggingMiddleware } from '../core/events/LoggingMiddleware';
import { EventMiddleware } from '../core/events/EventMiddlewareManager';
import { EventType, createEvent } from '../types/events/GameEvents';

/**
 * Example demonstrating the type-safe event system
 */
export class EventSystemExample {
  private eventBus: EventBus;
  
  constructor() {
    // Get the event bus instance
    this.eventBus = EventBus.getInstance();
    
    // Initialize the event bus
    this.eventBus.initialize();
    
    // Add logging middleware
    const loggingMiddleware = new LoggingMiddleware('debug', [
      // Exclude high-frequency events to reduce noise
      EventType.RENDERER_FRAME_START,
      EventType.RENDERER_FRAME_END
    ]);
    
    // Get the middleware function and add it to the event bus
    const middleware = loggingMiddleware.getMiddleware();
    this.eventBus.addMiddleware(middleware);
    
    // Set up event handlers
    this.setupEventHandlers();
    
    // Emit some test events
    this.emitTestEvents();
  }
  
  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    // Handle input events
    this.eventBus.on(EventType.INPUT_KEY, (event) => {
      // Type-safe access to event properties
      console.log(`Key ${event.key} ${event.pressed ? 'pressed' : 'released'}`);
      
      // We can access all properties with type safety
      if (event.pressed && !event.repeat) {
        console.log(`First press of ${event.key}`);
      }
    });
    
    // Handle physics collision events
    this.eventBus.on(EventType.PHYSICS_COLLISION, (event) => {
      console.log(`Collision detected at ${JSON.stringify(event.point)} with impulse ${event.impulse}`);
      
      // Access to the physics bodies involved
      const bodyAId = event.bodyA.object ? 'object-' + Math.random().toString(36).substr(2, 9) : 'unknown';
      const bodyBId = event.bodyB.object ? 'object-' + Math.random().toString(36).substr(2, 9) : 'unknown';
      
      console.log(`Bodies involved: ${bodyAId} and ${bodyBId}`);
    });
    
    // Handle system error events
    this.eventBus.on(EventType.SYSTEM_ERROR, (event) => {
      console.error(`System error in ${event.systemId}: ${event.error.message}`);
      
      if (event.fatal) {
        console.error('Fatal error, system needs to be restarted');
      }
    });
  }
  
  /**
   * Emit some test events
   */
  private emitTestEvents(): void {
    // Emit a key press event
    this.eventBus.emit(
      EventType.INPUT_KEY,
      createEvent(EventType.INPUT_KEY, {
        key: 'Space',
        code: 'Space',
        pressed: true,
        repeat: false
      })
    );
    
    // Emit a system error event
    this.eventBus.emit(
      EventType.SYSTEM_ERROR,
      createEvent(EventType.SYSTEM_ERROR, {
        systemId: 'exampleSystem',
        error: new Error('This is a test error'),
        fatal: false
      })
    );
    
    // Check if there are subscribers for an event
    const hasJumpSubscribers = this.eventBus.hasSubscribers(EventType.INPUT_JUMP);
    console.log(`Has jump subscribers: ${hasJumpSubscribers}`);
    
    // Get event statistics
    const stats = this.eventBus.getStats();
    console.log('Event statistics:', stats.getSummary());
  }
  
  /**
   * Run the example
   */
  public static run(): void {
    console.log('Running Event System Example');
    new EventSystemExample();
  }
} 