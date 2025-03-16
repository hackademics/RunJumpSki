/**
 * Custom error class for audio-related errors
 */
export class AudioError extends Error {
    constructor(
        public readonly operation: string,
        message: string,
        public readonly cause?: Error
    ) {
        super(`[Audio] ${operation}: ${message}${cause ? ` (Cause: ${cause.message})` : ''}`);
        this.name = 'AudioError';
        
        // Maintain proper prototype chain
        Object.setPrototypeOf(this, AudioError.prototype);
    }
} 