import { System } from '../base/System';
import { ILogger, LogLevel, LogParam } from './ILogger';
import { Logger } from './Logger';

/**
 * Logging system that integrates with the game engine
 */
export class LoggingSystem extends System implements ILogger {
  private logger: Logger;
  
  /**
   * Create a new LoggingSystem
   * @param initialLevel The initial log level
   */
  constructor(initialLevel: LogLevel = LogLevel.INFO) {
    // Pass priority as an option object instead of setting it after construction
    super({ priority: -1000 });
    this.logger = new Logger('LogSystem', initialLevel);
  }

  /**
   * Initialize the logging system
   */
  public async initialize(): Promise<void> {
    this.info('LoggingSystem initialized');
  }

  /**
   * Update method - nothing to do on frame update for logging
   * @param deltaTime Time since last frame
   */
  public update(deltaTime: number): void {
    // Logging system doesn't need to update each frame
  }

  /**
   * Shutdown the logging system
   */
  public shutdown(): void {
    this.info('LoggingSystem shutting down');
  }

  /**
   * Clean up resources used by the system
   */
  public async dispose(): Promise<void> {
    this.info('LoggingSystem disposing');
    // No special cleanup needed for logger
  }

  /**
   * Set the minimum log level that will be output
   * @param level The minimum level to output
   */
  public setLevel(level: LogLevel): void {
    this.logger.setLevel(level);
  }
  
  /**
   * Get the current minimum log level
   * @returns The current minimum log level
   */
  public getLevel(): LogLevel {
    return this.logger.getLevel();
  }
  
  /**
   * Log a message at the TRACE level
   * @param message Message to log
   * @param args Additional arguments
   */
  public trace(message: string, ...args: LogParam[]): void {
    this.logger.trace(message, ...args);
  }
  
  /**
   * Log a message at the DEBUG level
   * @param message Message to log
   * @param args Additional arguments
   */
  public debug(message: string, ...args: LogParam[]): void {
    this.logger.debug(message, ...args);
  }
  
  /**
   * Log a message at the INFO level
   * @param message Message to log
   * @param args Additional arguments
   */
  public info(message: string, ...args: LogParam[]): void {
    this.logger.info(message, ...args);
  }
  
  /**
   * Log a message at the WARN level
   * @param message Message to log
   * @param args Additional arguments
   */
  public warn(message: string, ...args: LogParam[]): void {
    this.logger.warn(message, ...args);
  }
  
  /**
   * Log a message at the ERROR level
   * @param message Message to log
   * @param args Additional arguments
   */
  public error(message: string, ...args: LogParam[]): void {
    this.logger.error(message, ...args);
  }
  
  /**
   * Log a message at the FATAL level
   * @param message Message to log
   * @param args Additional arguments
   */
  public fatal(message: string, ...args: LogParam[]): void {
    this.logger.fatal(message, ...args);
  }

  /**
   * Add a logger tag for the current context
   * @param tag The tag to add
   */
  public addTag(tag: string): void {
    this.logger.addTag(tag);
  }

  /**
   * Remove a logger tag
   * @param tag The tag to remove
   */
  public removeTag(tag: string): void {
    this.logger.removeTag(tag);
  }

  /**
   * Clear all logger tags
   */
  public clearTags(): void {
    this.logger.clearTags();
  }

  /**
   * Create a child logger with a specific context
   * @param context The context for the child logger
   * @returns A new Logger instance with the specified context
   */
  public createLogger(context: string): ILogger {
    const childLogger = new Logger(context, this.getLevel());
    this.debug(`Created child logger with context: ${context}`);
    return childLogger;
  }
}