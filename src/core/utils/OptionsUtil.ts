/**
 * @file src/core/utils/OptionsUtil.ts
 * @description Utility functions for handling option objects 
 */

/**
 * Type for validation rules
 */
export type ValidationRule<T> = {
  /** Field to validate */
  field: keyof T;
  /** Whether field is required */
  required?: boolean;
  /** Validation function to check value */
  validate?: (value: any) => boolean;
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
  public static mergeWithDefaults<T extends Record<string, any>>(
    defaults: T,
    options?: Partial<T>
  ): T {
    if (!options) {
      return { ...defaults };
    }

    const result: Record<string, any> = { ...defaults };

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
        result[key] = this.mergeWithDefaults(defaultValue, optionValue);
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
  public static validateOptions<T extends Record<string, any>>(
    options: T,
    rules: ValidationRule<T>[]
  ): void {
    for (const rule of rules) {
      const value = options[rule.field];
      
      // Check if required
      if (rule.required && (value === undefined || value === null)) {
        throw new Error(
          rule.message || `Required option '${String(rule.field)}' is missing`
        );
      }
      
      // Skip validation if not required and undefined
      if (value === undefined) {
        continue;
      }
      
      // Validate using custom function
      if (rule.validate && !rule.validate(value)) {
        throw new Error(
          rule.message || `Option '${String(rule.field)}' failed validation`
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
  public static createRule<T>(
    field: keyof T, 
    options: Omit<ValidationRule<T>, 'field'> = {}
  ): ValidationRule<T> {
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
    return (value: any): boolean => {
      return typeof value === 'number' && value >= min && value <= max;
    };
  }
  
  /**
   * Validator for string patterns
   * @param pattern Regex pattern
   * @returns Validation function
   */
  public static stringPattern(pattern: RegExp) {
    return (value: any): boolean => {
      return typeof value === 'string' && pattern.test(value);
    };
  }
  
  /**
   * Validator for arrays
   * @param itemValidator Validator for array items
   * @returns Validation function
   */
  public static array(itemValidator?: (item: any) => boolean) {
    return (value: any): boolean => {
      if (!Array.isArray(value)) {
        return false;
      }
      
      if (itemValidator) {
        return value.every(item => itemValidator(item));
      }
      
      return true;
    };
  }
} 