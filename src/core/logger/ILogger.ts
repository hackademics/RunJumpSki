import { EventBus } from '../events/EventBus';

/**
 * Log levels in order of severity
 */
export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    FATAL = 'fatal'
}

/**
 * Configuration options for the logger
 */
export interface LoggerConfig {
    /**
     * Minimum log level to process
     * @default LogLevel.INFO
     */
    minLevel?: LogLevel;

    /**
     * Maximum number of log entries to keep in memory
     * @default 1000
     */
    maxEntries?: number;

    /**
     * Whether to emit events for each log entry
     * @default true
     */
    emitEvents?: boolean;

    /**
     * Whether to include timestamps in log entries
     * @default true
     */
    includeTimestamps?: boolean;

    /**
     * Whether to include stack traces for errors
     * @default true
     */
    includeStackTraces?: boolean;

    /**
     * Custom formatter for log entries
     */
    formatter?: (entry: LogEntry) => string;

    /**
     * Optional console output configuration
     */
    console?: {
        enabled: boolean;
        colors?: boolean;
    };

    /**
     * Optional file output configuration
     */
    file?: {
        enabled: boolean;
        path: string;
        maxSize?: number; // in bytes
        maxFiles?: number;
    };
}

/**
 * Represents a log entry
 */
export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: number;
    context?: Record<string, unknown>;
    error?: Error;
    stackTrace?: string;
    tags?: string[];
}

/**
 * Interface for the logger system
 */
export interface ILogger {
    /**
     * Initialize the logger
     * @param config Configuration options
     * @throws {LoggerError} If already initialized
     */
    initialize(config?: LoggerConfig): void;

    /**
     * Log a debug message
     * @param message Message to log
     * @param context Additional context
     * @param tags Optional tags for filtering
     */
    debug(message: string, context?: Record<string, unknown>, tags?: string[]): void;

    /**
     * Log an info message
     * @param message Message to log
     * @param context Additional context
     * @param tags Optional tags for filtering
     */
    info(message: string, context?: Record<string, unknown>, tags?: string[]): void;

    /**
     * Log a warning message
     * @param message Message to log
     * @param context Additional context
     * @param tags Optional tags for filtering
     */
    warn(message: string, context?: Record<string, unknown>, tags?: string[]): void;

    /**
     * Log an error message
     * @param message Message to log
     * @param error Error object
     * @param context Additional context
     * @param tags Optional tags for filtering
     */
    error(message: string, error?: Error, context?: Record<string, unknown>, tags?: string[]): void;

    /**
     * Log a fatal error message
     * @param message Message to log
     * @param error Error object
     * @param context Additional context
     * @param tags Optional tags for filtering
     */
    fatal(message: string, error?: Error, context?: Record<string, unknown>, tags?: string[]): void;

    /**
     * Get all log entries
     * @returns Array of log entries
     */
    getEntries(): LogEntry[];

    /**
     * Get filtered log entries
     * @param filter Filter options
     * @returns Filtered log entries
     */
    getFilteredEntries(filter: {
        level?: LogLevel;
        tags?: string[];
        startTime?: number;
        endTime?: number;
        search?: string;
    }): LogEntry[];

    /**
     * Clear all log entries
     */
    clear(): void;

    /**
     * Dispose of the logger and clean up resources
     */
    dispose(): void;
}

/**
 * Events emitted by the logger
 */
export interface LoggerEvents {
    'log:entry': LogEntry;
    'log:cleared': void;
    'log:error': {
        error: Error;
        context?: Record<string, unknown>;
    };
    'log:disposed': void;
} 