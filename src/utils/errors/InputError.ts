/**
 * Custom error class for input-related errors
 */
export class InputError extends Error {
    /**
     * Creates a new InputError
     * @param operation - The operation that failed (e.g., 'initialization', 'binding', 'update')
     * @param message - Detailed error message
     */
    constructor(
        public readonly operation: string,
        message: string
    ) {
        super(`Input error during ${operation}: ${message}`);
        this.name = 'InputError';
        
        // Ensure proper prototype chain for instanceof checks
        Object.setPrototypeOf(this, new.target.prototype);
    }

    /**
     * Get a string representation of the error
     */
    public toString(): string {
        return `${this.name}: [${this.operation}] ${this.message}`;
    }
}
 