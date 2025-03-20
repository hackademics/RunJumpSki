/**
 * @file src/core/utils/OptionsUtil.ts
 * @description Utility functions for handling option objects 
 */

/**
 * Type for validation rules
 */
export type ValidationRule<T, K extends keyof T = keyof T> = {
  /** Field to validate */
  field: K;
  /** Whether field is required */
  required?: boolean;
  /** Validation function to check value */
  validate?: (value: T[K]) => boolean;
  /** Error message if validation fails */
  message?: string;
};

/**
 * Utility class for managing option objects
 */
export class OptionsUtil {
  /**
   * Deeply merges options with defaults
   * @param defaults Default options
   * @param options User options
   * @returns Merged options
   */
  public static mergeWithDefaults<T extends Record<string, unknown>>(
    defaults: T,
    options?: Partial<T>
  ): T {
    if (!options) {
      return { ...defaults };
    }

    const result = { ...defaults } as Record<string, unknown>;

    Object.keys(options).forEach(key => {
      const defaultValue = result[key];
      const optionValue = options[key as keyof typeof options];

      // Handle deep merging of objects (but not arrays or classes)
      if (
        defaultValue !== null && 
        optionValue !== null &&
        typeof defaultValue === 'object' && 
        typeof optionValue === 'object' &&
        !Array.isArray(defaultValue) &&
        !Array.isArray(optionValue) &&
        defaultValue.constructor === Object &&
        optionValue.constructor === Object
      ) {
        result[key] = this.mergeWithDefaults(
          defaultValue as Record<string, unknown>, 
          optionValue as Record<string, unknown>
        );
      } else {
        result[key] = optionValue;
      }
    });

    return result as T;
  }

  /**
   * Validates options against rules
   * @param options Options to validate
   * @param rules Validation rules
   * @throws Error if validation fails
   */
  public static validateOptions<T extends Record<string, unknown>>(
    options: T,
    rules: ValidationRule<T>[]
  ): void {
    for (const rule of rules) {
      const field = rule.field as string;
      const value = options[field];
      
      // Check if required
      if (rule.required && (value === undefined || value === null)) {
        throw new Error(
          rule.message || `Required option '${field}' is missing`
        );
      }
      
      // Skip validation if not required and undefined
      if (value === undefined) {
        continue;
      }
      
      // Validate using custom function
      if (rule.validate && !rule.validate(value as T[typeof rule.field])) {
        throw new Error(
          rule.message || `Option '${field}' failed validation`
        );
      }
    }
  }

  /**
   * Creates a typed validation rule
   * @param field Field to validate
   * @param options Rule options
   * @returns Validation rule
   */
  public static createRule<T, K extends keyof T>(
    field: K, 
    options: Omit<ValidationRule<T, K>, 'field'> = {}
  ): ValidationRule<T, K> {
    return {
      field,
      ...options
    };
  }
  
  /**
   * Validator for numeric range
   * @param min Minimum value (inclusive)
   * @param max Maximum value (inclusive)
   * @returns Validation function
   */
  public static numberRange(min: number, max: number) {
    return <T>(value: T): boolean => {
      return typeof value === 'number' && value >= min && value <= max;
    };
  }
  
  /**
   * Validator for string patterns
   * @param pattern Regex pattern
   * @returns Validation function
   */
  public static stringPattern(pattern: RegExp) {
    return <T>(value: T): boolean => {
      return typeof value === 'string' && pattern.test(value);
    };
  }
  
  /**
   * Validator for arrays
   * @param itemValidator Validator for array items
   * @returns Validation function
   */
  public static array<T>(itemValidator?: (item: T) => boolean) {
    return (value: unknown): boolean => {
      if (!Array.isArray(value)) {
        return false;
      }
      
      if (itemValidator) {
        return value.every(item => itemValidator(item as T));
      }
      
      return true;
    };
  }
} 