/**
 * @file src/core/utils/ILogger.ts
 * @description Defines the logger interface and logging levels
 */

import { ISystem } from '../base/ISystem';

/**
 * Log levels
 */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
  NONE = 6
}

/**
 * Interface for logger systems
 */
export interface ILogger extends ISystem {
  /**
   * Log a message at the TRACE level
   * @param message Message to log
   * @param args Additional arguments
   */
  trace(message: string, ...args: any[]): void;
  
  /**
   * Log a message at the DEBUG level
   * @param message Message to log
   * @param args Additional arguments
   */
  debug(message: string, ...args: any[]): void;
  
  /**
   * Log a message at the INFO level
   * @param message Message to log
   * @param args Additional arguments
   */
  info(message: string, ...args: any[]): void;
  
  /**
   * Log a message at the WARN level
   * @param message Message to log
   * @param args Additional arguments
   */
  warn(message: string, ...args: any[]): void;
  
  /**
   * Log a message at the ERROR level
   * @param message Message to log
   * @param args Additional arguments
   */
  error(message: string, ...args: any[]): void;
  
  /**
   * Log a message at the FATAL level
   * @param message Message to log
   * @param args Additional arguments
   */
  fatal(message: string, ...args: any[]): void;
  
  /**
   * Set the minimum log level
   * @param level Minimum log level
   */
  setLevel(level: LogLevel): void;
  
  /**
   * Get the current minimum log level
   * @returns The current minimum log level
   */
  getLevel(): LogLevel;
}