import { EventType, GameEventMap } from '../../types/events/GameEvents';
import { Logger } from '../logger/Logger';
import { EventMiddleware } from './EventMiddlewareManager';

/**
 * Middleware that logs all events passing through the event bus
 */
export class LoggingMiddleware {
  private logger: Logger;
  private logLevel: 'debug' | 'info' | 'warn' | 'error';
  private excludedEvents: Set<EventType>;
  
  /**
   * Create a new logging middleware
   * @param logLevel The log level to use
   * @param excludedEvents Events to exclude from logging
   */
  constructor(logLevel: 'debug' | 'info' | 'warn' | 'error' = 'debug', excludedEvents: EventType[] = []) {
    this.logger = Logger.getInstance();
    this.logLevel = logLevel;
    this.excludedEvents = new Set(excludedEvents);
  }
  
  /**
   * Get the middleware function
   */
  public getMiddleware(): EventMiddleware {
    return <T extends EventType>(eventName: T, data: GameEventMap[T]): GameEventMap[T] => {
      if (!this.excludedEvents.has(eventName)) {
        const logContext = { eventData: data };
        
        switch (this.logLevel) {
          case 'debug':
            this.logger.debug(`[EVENT] ${eventName}`, logContext);
            break;
          case 'info':
            this.logger.info(`[EVENT] ${eventName}`, logContext);
            break;
          case 'warn':
            this.logger.warn(`[EVENT] ${eventName}`, logContext);
            break;
          case 'error':
            this.logger.error(`[EVENT] ${eventName}`);
            break;
        }
      }
      
      // Pass through the data unchanged
      return data;
    };
  }
  
  /**
   * Add events to exclude from logging
   * @param events Events to exclude
   */
  public exclude(events: EventType[]): void {
    for (const event of events) {
      this.excludedEvents.add(event);
    }
  }
  
  /**
   * Remove events from the exclusion list
   * @param events Events to include
   */
  public include(events: EventType[]): void {
    for (const event of events) {
      this.excludedEvents.delete(event);
    }
  }
  
  /**
   * Set the log level
   * @param level The new log level
   */
  public setLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    this.logLevel = level;
  }
} 