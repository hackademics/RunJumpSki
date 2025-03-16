/**
 * Custom error class for state machine related errors
 */
export class StateError extends Error {
    constructor(
        public readonly operation: string,
        message: string,
        public readonly cause?: Error
    ) {
        super(`StateError [${operation}]: ${message}${cause ? ` (Cause: ${cause.message})` : ''}`);
        this.name = 'StateError';

        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, StateError);
        }
    }

    /**
     * Create an error for when the state machine is not initialized
     */
    public static notInitialized(): StateError {
        return new StateError(
            'initialization',
            'State machine is not initialized'
        );
    }

    /**
     * Create an error for when the state machine is already initialized
     */
    public static alreadyInitialized(): StateError {
        return new StateError(
            'initialization',
            'State machine is already initialized'
        );
    }

    /**
     * Create an error for invalid state transitions
     * @param from Source state
     * @param to Target state
     */
    public static invalidTransition(from: string | null, to: string): StateError {
        return new StateError(
            'transition',
            `Invalid state transition from '${from}' to '${to}'`
        );
    }

    /**
     * Create an error for middleware rejection
     * @param from Source state
     * @param to Target state
     * @param cause Original error if available
     */
    public static middlewareRejected(from: string | null, to: string, cause?: Error): StateError {
        return new StateError(
            'middleware',
            `State transition from '${from}' to '${to}' was rejected by middleware`,
            cause
        );
    }

    /**
     * Create an error for invalid configuration
     * @param detail Configuration error detail
     */
    public static invalidConfig(detail: string): StateError {
        return new StateError(
            'configuration',
            `Invalid state machine configuration: ${detail}`
        );
    }

    /**
     * Create an error for when the state machine is disposed
     */
    public static disposed(): StateError {
        return new StateError(
            'operation',
            'State machine is disposed'
        );
    }
} 