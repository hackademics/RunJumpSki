/**
 * Custom error class for logger related errors
 */
export class LoggerError extends Error {
    constructor(
        public readonly operation: string,
        message: string,
        public readonly cause?: Error
    ) {
        super(`LoggerError [${operation}]: ${message}${cause ? ` (Cause: ${cause.message})` : ''}`);
        this.name = 'LoggerError';

        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, LoggerError);
        }
    }

    /**
     * Create an error for when the logger is not initialized
     */
    public static notInitialized(): LoggerError {
        return new LoggerError(
            'initialization',
            'Logger is not initialized'
        );
    }

    /**
     * Create an error for when the logger is already initialized
     */
    public static alreadyInitialized(): LoggerError {
        return new LoggerError(
            'initialization',
            'Logger is already initialized'
        );
    }

    /**
     * Create an error for invalid configuration
     * @param detail Configuration error detail
     */
    public static invalidConfig(detail: string): LoggerError {
        return new LoggerError(
            'configuration',
            `Invalid logger configuration: ${detail}`
        );
    }

    /**
     * Create an error for file operations
     * @param operation File operation that failed
     * @param cause Original error if available
     */
    public static fileError(operation: string, cause?: Error): LoggerError {
        return new LoggerError(
            'file',
            `File operation failed: ${operation}`,
            cause
        );
    }

    /**
     * Create an error for when the logger is disposed
     */
    public static disposed(): LoggerError {
        return new LoggerError(
            'operation',
            'Logger is disposed'
        );
    }

    /**
     * Create an error for invalid log level
     * @param level Invalid log level value
     */
    public static invalidLogLevel(level: string): LoggerError {
        return new LoggerError(
            'validation',
            `Invalid log level: ${level}`
        );
    }

    /**
     * Create an error for formatter failures
     * @param cause Original error if available
     */
    public static formatterError(cause?: Error): LoggerError {
        return new LoggerError(
            'formatter',
            'Log entry formatting failed',
            cause
        );
    }

    /**
     * Create an error for when the log storage is full
     */
    public static storageFull(): LoggerError {
        return new LoggerError(
            'storage',
            'Maximum number of log entries reached'
        );
    }
} 