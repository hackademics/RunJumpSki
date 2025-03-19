import { IEvent } from './IEvent';

/**
 * Base implementation of the IEvent interface
 */
export class Event implements IEvent {
  /**
   * Unique type identifier for the event
   */
  public readonly type: string;
  
  /**
   * Timestamp when the event was created
   */
  public readonly timestamp: number;
  
  /**
   * Optional source identifier
   */
  public readonly source?: string;
  
  /**
   * Create a new event
   * @param type The event type
   * @param source Optional source identifier
   */
  constructor(type: string, source?: string) {
    this.type = type;
    this.timestamp = Date.now();
    this.source = source;
  }
}

/**
 * Basic generic event class for simple data payloads
 */
export class DataEvent<T> extends Event {
  /**
   * The event data payload
   */
  public readonly data: T;
  
  /**
   * Create a new data event
   * @param type The event type
   * @param data The event data
   * @param source Optional source identifier
   */
  constructor(type: string, data: T, source?: string) {
    super(type, source);
    this.data = data;
  }
}