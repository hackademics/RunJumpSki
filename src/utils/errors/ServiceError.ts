/**
 * Error thrown when there is a problem with a service
 */
export class ServiceError extends Error {
    constructor(
        public readonly serviceId: string,
        message: string
    ) {
        super(`Service ${serviceId}: ${message}`);
        this.name = 'ServiceError';
    }
} 