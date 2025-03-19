/**
 * @file src/core/utils/errors/BaseError.ts
 * @description Base error class for the engine. All custom errors should extend this class.
 *
 * @dependencies None
 * @relatedFiles ComponentError.ts
 */
export class BaseError extends Error {
    public readonly name: string;
  
    constructor(message: string) {
      super(message);
      this.name = new.target.name;
      // Maintains proper stack trace (only available on V8)
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      }
    }
  }
  