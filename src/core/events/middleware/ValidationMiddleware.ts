import { EventMiddleware, EventMiddlewareContext } from '../../../types/core/EventTypes';

/**
 * Validation rule type
 */
type ValidationRule<T> = {
    validate: (data: T) => boolean | Promise<boolean>;
    message: string;
};

/**
 * Create a validation middleware
 * @param rules Validation rules per event type
 */
export const createValidationMiddleware = (
    rules: Record<string, ValidationRule<any>[]>
): EventMiddleware => {
    return async <T>(context: EventMiddlewareContext<T>, next: () => Promise<T>): Promise<T> => {
        const { eventType, data } = context;
        const eventRules = rules[eventType];

        if (eventRules) {
            for (const rule of eventRules) {
                const isValid = await rule.validate(data);
                if (!isValid) {
                    throw new Error(`Validation failed for event ${eventType}: ${rule.message}`);
                }
            }
        }

        return next();
    };
}; 