import { System } from '../base/System';
import { ILogger, LogLevel } from './ILogger';
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
    super();
    // Set a low priority so logging system initializes first
    this.priority = -1000;
    this.logger = new Logger('LogSystem', initialLevel);
  }

  /**
   * Initialize the logging system
   */
  public initialize(): void {
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
   * Set the minimum log level that will be output
   * @param level The minimum level to output
   */
  public setLevel(level: LogLevel): void {
    this.logger.setLevel(level);
  }
  
  /**
   * Get the current log level
   */
  public getLevel(): LogLevel {
    return this.logger.getLevel();
  }

  /**
   * Log a debug message
   * @param message The message to log
   * @param optionalParams Additional parameters to include
   */
  public debug(message: string, ...optionalParams: any[]): void {
    this.logger.debug(message, ...optionalParams);
  }

  /**
   * Log an info message
   * @param message The message to log
   * @param optionalParams Additional parameters to include
   */
  public info(message: string, ...optionalParams: any[]): void {
    this.logger.info(message, ...optionalParams);
  }

  /**
   * Log a warning message
   * @param message The message to log
   * @param optionalParams Additional parameters to include
   */
  public warn(message: string, ...optionalParams: any[]): void {
    this.logger.warn(message, ...optionalParams);
  }

  /**
   * Log an error message
   * @param message The message to log
   * @param optionalParams Additional parameters to include
   */
  public error(message: string, ...optionalParams: any[]): void {
    this.logger.error(message, ...optionalParams);
  }

  /**
   * Log a fatal error message
   * @param message The message to log
   * @param optionalParams Additional parameters to include
   */
  public fatal(message: string, ...optionalParams: any[]): void {
    this.logger.fatal(message, ...optionalParams);
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