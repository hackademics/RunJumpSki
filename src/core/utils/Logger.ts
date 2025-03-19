import { ILogger, LogLevel } from './ILogger';

/**
 * Default implementation of the ILogger interface
 */
export class Logger implements ILogger {
  private level: LogLevel = LogLevel.INFO;
  private tags: string[] = [];

  /**
   * Create a new Logger instance
   * @param context Optional context name for this logger
   * @param initialLevel Initial log level
   */
  constructor(private context?: string, initialLevel?: LogLevel) {
    if (initialLevel !== undefined) {
      this.level = initialLevel;
    }
    
    if (context) {
      this.addTag(context);
    }
  }

  /**
   * Set the minimum log level that will be output
   * @param level The minimum level to output
   */
  public setLevel(level: LogLevel): void {
    this.level = level;
  }
  
  /**
   * Get the current log level
   */
  public getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Log a debug message
   * @param message The message to log
   * @param optionalParams Additional parameters to include
   */
  public debug(message: string, ...optionalParams: any[]): void {
    this.log(LogLevel.DEBUG, message, ...optionalParams);
  }

  /**
   * Log an info message
   * @param message The message to log
   * @param optionalParams Additional parameters to include
   */
  public info(message: string, ...optionalParams: any[]): void {
    this.log(LogLevel.INFO, message, ...optionalParams);
  }

  /**
   * Log a warning message
   * @param message The message to log
   * @param optionalParams Additional parameters to include
   */
  public warn(message: string, ...optionalParams: any[]): void {
    this.log(LogLevel.WARN, message, ...optionalParams);
  }

  /**
   * Log an error message
   * @param message The message to log
   * @param optionalParams Additional parameters to include
   */
  public error(message: string, ...optionalParams: any[]): void {
    this.log(LogLevel.ERROR, message, ...optionalParams);
  }

  /**
   * Log a fatal error message
   * @param message The message to log
   * @param optionalParams Additional parameters to include
   */
  public fatal(message: string, ...optionalParams: any[]): void {
    this.log(LogLevel.FATAL, message, ...optionalParams);
  }

  /**
   * Add a logger tag for the current context
   * @param tag The tag to add
   */
  public addTag(tag: string): void {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  /**
   * Remove a logger tag
   * @param tag The tag to remove
   */
  public removeTag(tag: string): void {
    const index = this.tags.indexOf(tag);
    if (index !== -1) {
      this.tags.splice(index, 1);
    }
  }

  /**
   * Clear all logger tags
   */
  public clearTags(): void {
    this.tags = [];
  }

  /**
   * Internal log method that handles the actual logging
   * @param level The log level
   * @param message The message to log
   * @param optionalParams Additional parameters to include
   */
  private log(level: LogLevel, message: string, ...optionalParams: any[]): void {
    if (level < this.level) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = this.formatPrefix(level, timestamp);
    
    // Select the appropriate console method based on level
    let consoleMethod: (...data: any[]) => void;
    
    switch (level) {
      case LogLevel.DEBUG:
        consoleMethod = console.debug;
        break;
      case LogLevel.INFO:
        consoleMethod = console.info;
        break;
      case LogLevel.WARN:
        consoleMethod = console.warn;
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        consoleMethod = console.error;
        break;
      default:
        consoleMethod = console.log;
    }

    if (optionalParams.length > 0) {
      consoleMethod(prefix, message, ...optionalParams);
    } else {
      consoleMethod(prefix, message);
    }
  }

  /**
   * Format the log prefix with timestamp, level and tags
   * @param level The log level
   * @param timestamp The timestamp
   * @returns The formatted prefix
   */
  private formatPrefix(level: LogLevel, timestamp: string): string {
    const levelStr = LogLevel[level].padEnd(5, ' ');
    const tagsStr = this.tags.length > 0 ? `[${this.tags.join('][')}]` : '';
    
    return `${timestamp} ${levelStr} ${tagsStr}`;
  }
}