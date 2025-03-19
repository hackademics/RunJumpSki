/**
 * @file src/core/debug/gui/TweakableParameter.ts
 * @description Base classes for tweakable parameters in the debug GUI.
 */

import * as BABYLON from 'babylonjs';

/**
 * Event triggered when a parameter value changes
 */
export interface ParameterChangeEvent<T> {
  /**
   * Parameter that changed
   */
  parameter: TweakableParameter<T>;
  
  /**
   * Previous value
   */
  previousValue: T;
  
  /**
   * New value
   */
  newValue: T;
}

/**
 * Type of change listener function
 */
export type ParameterChangeListener<T> = (event: ParameterChangeEvent<T>) => void;

/**
 * Common options for all tweakable parameters
 */
export interface TweakableParameterOptions<T> {
  /**
   * Parameter name
   */
  name: string;
  
  /**
   * Parameter description (tooltip)
   */
  description?: string;
  
  /**
   * Initial value
   */
  initialValue: T;
  
  /**
   * Whether the parameter can be changed
   */
  readOnly?: boolean;
  
  /**
   * Group this parameter belongs to
   */
  group?: string;
  
  /**
   * Whether to persist this parameter when saving presets
   */
  persistent?: boolean;
}

/**
 * Base class for all tweakable parameters
 */
export abstract class TweakableParameter<T> {
  /**
   * Parameter name
   */
  public readonly name: string;
  
  /**
   * Parameter description (tooltip)
   */
  public readonly description: string;
  
  /**
   * Whether the parameter can be changed
   */
  public readonly readOnly: boolean;
  
  /**
   * Group this parameter belongs to
   */
  public readonly group: string;
  
  /**
   * Whether to persist this parameter when saving presets
   */
  public readonly persistent: boolean;
  
  /**
   * Current value
   */
  private _value: T;
  
  /**
   * Listeners for value changes
   */
  private changeListeners: Set<ParameterChangeListener<T>>;
  
  /**
   * Creates a new parameter
   * @param options Parameter options
   */
  constructor(options: TweakableParameterOptions<T>) {
    this.name = options.name;
    this.description = options.description || '';
    this.readOnly = options.readOnly || false;
    this.group = options.group || 'General';
    this.persistent = options.persistent !== false;
    this._value = options.initialValue;
    this.changeListeners = new Set();
  }
  
  /**
   * Get the current value
   */
  public get value(): T {
    return this._value;
  }
  
  /**
   * Set the current value
   */
  public set value(newValue: T) {
    if (this.readOnly) {
      console.warn(`Parameter "${this.name}" is read-only`);
      return;
    }
    
    if (!this.validateValue(newValue)) {
      console.warn(`Invalid value for parameter "${this.name}": ${newValue}`);
      return;
    }
    
    const previousValue = this._value;
    this._value = newValue;
    
    this.notifyChange(previousValue, newValue);
  }
  
  /**
   * Add a change listener
   * @param listener Listener function
   */
  public addChangeListener(listener: ParameterChangeListener<T>): void {
    this.changeListeners.add(listener);
  }
  
  /**
   * Remove a change listener
   * @param listener Listener function to remove
   */
  public removeChangeListener(listener: ParameterChangeListener<T>): void {
    this.changeListeners.delete(listener);
  }
  
  /**
   * Clear all change listeners
   */
  public clearChangeListeners(): void {
    this.changeListeners.clear();
  }
  
  /**
   * Reset the parameter to its initial value
   */
  public abstract reset(): void;
  
  /**
   * Get the parameter value as a string
   */
  public abstract getValueAsString(): string;
  
  /**
   * Serialize the parameter value to JSON
   */
  public abstract serialize(): any;
  
  /**
   * Deserialize from JSON
   * @param value JSON value to deserialize from
   */
  public abstract deserialize(value: any): void;
  
  /**
   * Validate that a value is acceptable for this parameter
   * @param value Value to validate
   */
  protected abstract validateValue(value: T): boolean;
  
  /**
   * Notify listeners of a value change
   * @param previousValue Previous value
   * @param newValue New value
   */
  protected notifyChange(previousValue: T, newValue: T): void {
    if (this.equals(previousValue, newValue)) {
      return; // No change
    }
    
    const event: ParameterChangeEvent<T> = {
      parameter: this,
      previousValue,
      newValue
    };
    
    this.changeListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in parameter change listener for "${this.name}":`, error);
      }
    });
  }
  
  /**
   * Check if two values are equal
   * @param a First value
   * @param b Second value
   */
  protected equals(a: T, b: T): boolean {
    return a === b;
  }
}

/**
 * Options for numeric parameters
 */
export interface NumericParameterOptions extends TweakableParameterOptions<number> {
  /**
   * Minimum allowed value
   */
  min?: number;
  
  /**
   * Maximum allowed value
   */
  max?: number;
  
  /**
   * Step size for incrementing/decrementing
   */
  step?: number;
  
  /**
   * Number of decimal places to display
   */
  precision?: number;
}

/**
 * Parameter for numeric values
 */
export class NumericParameter extends TweakableParameter<number> {
  /**
   * Minimum allowed value
   */
  public readonly min: number;
  
  /**
   * Maximum allowed value
   */
  public readonly max: number;
  
  /**
   * Step size for incrementing/decrementing
   */
  public readonly step: number;
  
  /**
   * Number of decimal places to display
   */
  public readonly precision: number;
  
  /**
   * Initial value
   */
  private initialValue: number;
  
  /**
   * Creates a new numeric parameter
   * @param options Parameter options
   */
  constructor(options: NumericParameterOptions) {
    super(options);
    
    this.min = options.min !== undefined ? options.min : Number.MIN_SAFE_INTEGER;
    this.max = options.max !== undefined ? options.max : Number.MAX_SAFE_INTEGER;
    this.step = options.step !== undefined ? options.step : 1;
    this.precision = options.precision !== undefined ? options.precision : 2;
    this.initialValue = options.initialValue;
  }
  
  /**
   * Reset to initial value
   */
  public reset(): void {
    this.value = this.initialValue;
  }
  
  /**
   * Get the value as a string
   */
  public getValueAsString(): string {
    return this.value.toFixed(this.precision);
  }
  
  /**
   * Serialize the parameter
   */
  public serialize(): any {
    return this.value;
  }
  
  /**
   * Deserialize from JSON
   * @param value JSON value to deserialize from
   */
  public deserialize(value: any): void {
    if (typeof value === 'number') {
      this.value = value;
    } else if (typeof value === 'string') {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        this.value = num;
      }
    }
  }
  
  /**
   * Validate a numeric value
   * @param value Value to validate
   */
  protected validateValue(value: number): boolean {
    return !isNaN(value) && value >= this.min && value <= this.max;
  }
  
  /**
   * Increment the value by step
   */
  public increment(): void {
    const newValue = Math.min(this.value + this.step, this.max);
    this.value = parseFloat(newValue.toFixed(this.precision));
  }
  
  /**
   * Decrement the value by step
   */
  public decrement(): void {
    const newValue = Math.max(this.value - this.step, this.min);
    this.value = parseFloat(newValue.toFixed(this.precision));
  }
}

/**
 * Options for boolean parameters
 */
export interface BooleanParameterOptions extends TweakableParameterOptions<boolean> {
  /**
   * Labels for true/false states
   */
  labels?: {
    true: string;
    false: string;
  };
}

/**
 * Parameter for boolean values
 */
export class BooleanParameter extends TweakableParameter<boolean> {
  /**
   * Labels for true/false states
   */
  public readonly labels: {
    true: string;
    false: string;
  };
  
  /**
   * Initial value
   */
  private initialValue: boolean;
  
  /**
   * Creates a new boolean parameter
   * @param options Parameter options
   */
  constructor(options: BooleanParameterOptions) {
    super(options);
    
    this.labels = options.labels || {
      true: 'On',
      false: 'Off'
    };
    this.initialValue = options.initialValue;
  }
  
  /**
   * Reset to initial value
   */
  public reset(): void {
    this.value = this.initialValue;
  }
  
  /**
   * Get the value as a string
   */
  public getValueAsString(): string {
    return this.value ? this.labels.true : this.labels.false;
  }
  
  /**
   * Serialize the parameter
   */
  public serialize(): any {
    return this.value;
  }
  
  /**
   * Deserialize from JSON
   * @param value JSON value to deserialize from
   */
  public deserialize(value: any): void {
    if (typeof value === 'boolean') {
      this.value = value;
    } else if (typeof value === 'string') {
      this.value = value.toLowerCase() === 'true';
    }
  }
  
  /**
   * Validate a boolean value
   * @param value Value to validate
   */
  protected validateValue(value: boolean): boolean {
    return typeof value === 'boolean';
  }
  
  /**
   * Toggle the boolean value
   */
  public toggle(): void {
    this.value = !this.value;
  }
}

/**
 * Options for string parameters
 */
export interface StringParameterOptions extends TweakableParameterOptions<string> {
  /**
   * Maximum length of the string
   */
  maxLength?: number;
  
  /**
   * Pattern to validate against
   */
  pattern?: string | RegExp;
}

/**
 * Parameter for string values
 */
export class StringParameter extends TweakableParameter<string> {
  /**
   * Maximum length of the string
   */
  public readonly maxLength: number;
  
  /**
   * Pattern to validate against
   */
  public readonly pattern: RegExp | null;
  
  /**
   * Initial value
   */
  private initialValue: string;
  
  /**
   * Creates a new string parameter
   * @param options Parameter options
   */
  constructor(options: StringParameterOptions) {
    super(options);
    
    this.maxLength = options.maxLength || Number.MAX_SAFE_INTEGER;
    this.pattern = options.pattern ? (options.pattern instanceof RegExp ? options.pattern : new RegExp(options.pattern)) : null;
    this.initialValue = options.initialValue;
  }
  
  /**
   * Reset to initial value
   */
  public reset(): void {
    this.value = this.initialValue;
  }
  
  /**
   * Get the value as a string
   */
  public getValueAsString(): string {
    return this.value;
  }
  
  /**
   * Serialize the parameter
   */
  public serialize(): any {
    return this.value;
  }
  
  /**
   * Deserialize from JSON
   * @param value JSON value to deserialize from
   */
  public deserialize(value: any): void {
    if (typeof value === 'string') {
      this.value = value;
    } else {
      this.value = String(value);
    }
  }
  
  /**
   * Validate a string value
   * @param value Value to validate
   */
  protected validateValue(value: string): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    
    if (value.length > this.maxLength) {
      return false;
    }
    
    if (this.pattern && !this.pattern.test(value)) {
      return false;
    }
    
    return true;
  }
}

/**
 * Options for option parameters (dropdown/enum)
 */
export interface OptionParameterOptions<T> extends TweakableParameterOptions<T> {
  /**
   * Available options
   */
  options: T[];
  
  /**
   * Function to get display name for an option
   */
  getOptionName?: (option: T) => string;
}

/**
 * Parameter for option/enum values
 */
export class OptionParameter<T> extends TweakableParameter<T> {
  /**
   * Available options
   */
  public readonly options: T[];
  
  /**
   * Function to get display name for an option
   */
  private getOptionName: (option: T) => string;
  
  /**
   * Initial value
   */
  private initialValue: T;
  
  /**
   * Creates a new option parameter
   * @param options Parameter options
   */
  constructor(options: OptionParameterOptions<T>) {
    super(options);
    
    this.options = [...options.options];
    this.getOptionName = options.getOptionName || (option => String(option));
    this.initialValue = options.initialValue;
  }
  
  /**
   * Reset to initial value
   */
  public reset(): void {
    this.value = this.initialValue;
  }
  
  /**
   * Get the value as a string
   */
  public getValueAsString(): string {
    return this.getOptionName(this.value);
  }
  
  /**
   * Get the display name for an option
   * @param option Option to get name for
   */
  public getDisplayName(option: T): string {
    return this.getOptionName(option);
  }
  
  /**
   * Serialize the parameter
   */
  public serialize(): any {
    return this.value;
  }
  
  /**
   * Deserialize from JSON
   * @param value JSON value to deserialize from
   */
  public deserialize(value: any): void {
    // Find the matching option
    const option = this.options.find(opt => opt === value || 
                                    (typeof opt === 'object' && typeof value === 'object' && 
                                     JSON.stringify(opt) === JSON.stringify(value)));
    if (option !== undefined) {
      this.value = option;
    }
  }
  
  /**
   * Validate an option value
   * @param value Value to validate
   */
  protected validateValue(value: T): boolean {
    return this.options.some(option => this.equals(option, value));
  }
  
  /**
   * Check if two option values are equal
   */
  protected equals(a: T, b: T): boolean {
    if (typeof a === 'object' && typeof b === 'object') {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    return a === b;
  }
  
  /**
   * Get next option in the list
   */
  public nextOption(): void {
    const currentIndex = this.options.findIndex(option => this.equals(option, this.value));
    if (currentIndex === -1 || currentIndex === this.options.length - 1) {
      this.value = this.options[0];
    } else {
      this.value = this.options[currentIndex + 1];
    }
  }
  
  /**
   * Get previous option in the list
   */
  public previousOption(): void {
    const currentIndex = this.options.findIndex(option => this.equals(option, this.value));
    if (currentIndex === -1 || currentIndex === 0) {
      this.value = this.options[this.options.length - 1];
    } else {
      this.value = this.options[currentIndex - 1];
    }
  }
}

/**
 * Options for Vector3 parameters
 */
export interface Vector3ParameterOptions extends TweakableParameterOptions<BABYLON.Vector3> {
  /**
   * Minimum allowed values for each component
   */
  min?: BABYLON.Vector3;
  
  /**
   * Maximum allowed values for each component
   */
  max?: BABYLON.Vector3;
  
  /**
   * Step size for incrementing/decrementing each component
   */
  step?: BABYLON.Vector3;
  
  /**
   * Number of decimal places to display for each component
   */
  precision?: number;
}

/**
 * Parameter for Vector3 values
 */
export class Vector3Parameter extends TweakableParameter<BABYLON.Vector3> {
  /**
   * Minimum allowed values for each component
   */
  public readonly min: BABYLON.Vector3;
  
  /**
   * Maximum allowed values for each component
   */
  public readonly max: BABYLON.Vector3;
  
  /**
   * Step size for incrementing/decrementing each component
   */
  public readonly step: BABYLON.Vector3;
  
  /**
   * Number of decimal places to display for each component
   */
  public readonly precision: number;
  
  /**
   * Initial value
   */
  private initialValue: BABYLON.Vector3;
  
  /**
   * Creates a new Vector3 parameter
   * @param options Parameter options
   */
  constructor(options: Vector3ParameterOptions) {
    super(options);
    
    // Make a copy of the initial value
    this.initialValue = options.initialValue.clone();
    
    const minVal = Number.MIN_SAFE_INTEGER;
    const maxVal = Number.MAX_SAFE_INTEGER;
    
    this.min = options.min || new BABYLON.Vector3(minVal, minVal, minVal);
    this.max = options.max || new BABYLON.Vector3(maxVal, maxVal, maxVal);
    this.step = options.step || new BABYLON.Vector3(0.1, 0.1, 0.1);
    this.precision = options.precision !== undefined ? options.precision : 2;
  }
  
  /**
   * Reset to initial value
   */
  public reset(): void {
    this.value = this.initialValue.clone();
  }
  
  /**
   * Get the value as a string
   */
  public getValueAsString(): string {
    const { x, y, z } = this.value;
    return `(${x.toFixed(this.precision)}, ${y.toFixed(this.precision)}, ${z.toFixed(this.precision)})`;
  }
  
  /**
   * Serialize the parameter
   */
  public serialize(): any {
    return {
      x: this.value.x,
      y: this.value.y,
      z: this.value.z
    };
  }
  
  /**
   * Deserialize from JSON
   * @param value JSON value to deserialize from
   */
  public deserialize(value: any): void {
    if (typeof value === 'object' && value !== null) {
      const x = typeof value.x === 'number' ? value.x : parseFloat(value.x || '0');
      const y = typeof value.y === 'number' ? value.y : parseFloat(value.y || '0');
      const z = typeof value.z === 'number' ? value.z : parseFloat(value.z || '0');
      
      if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
        this.value = new BABYLON.Vector3(x, y, z);
      }
    }
  }
  
  /**
   * Validate a Vector3 value
   * @param value Value to validate
   */
  protected validateValue(value: BABYLON.Vector3): boolean {
    if (!(value instanceof BABYLON.Vector3)) {
      return false;
    }
    
    return (
      value.x >= this.min.x && value.x <= this.max.x &&
      value.y >= this.min.y && value.y <= this.max.y &&
      value.z >= this.min.z && value.z <= this.max.z
    );
  }
  
  /**
   * Check if two Vector3 values are equal
   */
  protected equals(a: BABYLON.Vector3, b: BABYLON.Vector3): boolean {
    return BABYLON.Vector3.Distance(a, b) < 0.0001;
  }
  
  /**
   * Set a specific component of the vector
   * @param component Component to set (x, y, or z)
   * @param value New value
   */
  public setComponent(component: 'x' | 'y' | 'z', value: number): void {
    if (this.readOnly) {
      console.warn(`Parameter "${this.name}" is read-only`);
      return;
    }
    
    const newVector = this.value.clone();
    newVector[component] = value;
    
    if (this.validateValue(newVector)) {
      this.value = newVector;
    }
  }
  
  /**
   * Increment a specific component by step
   * @param component Component to increment (x, y, or z)
   */
  public incrementComponent(component: 'x' | 'y' | 'z'): void {
    const step = this.step[component];
    const max = this.max[component];
    const newValue = Math.min(this.value[component] + step, max);
    this.setComponent(component, newValue);
  }
  
  /**
   * Decrement a specific component by step
   * @param component Component to decrement (x, y, or z)
   */
  public decrementComponent(component: 'x' | 'y' | 'z'): void {
    const step = this.step[component];
    const min = this.min[component];
    const newValue = Math.max(this.value[component] - step, min);
    this.setComponent(component, newValue);
  }
} 