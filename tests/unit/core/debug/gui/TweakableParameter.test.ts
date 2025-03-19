/**
 * @file tests/unit/core/debug/gui/TweakableParameter.test.ts
 * @description Unit tests for the TweakableParameter classes
 */

import * as BABYLON from 'babylonjs';
import {
  TweakableParameter,
  NumericParameter,
  BooleanParameter,
  StringParameter,
  OptionParameter,
  Vector3Parameter,
  ParameterChangeEvent
} from '../../../../../src/core/debug/gui/TweakableParameter';

jest.mock('babylonjs');

describe('TweakableParameter', () => {
  // Test implementations for each parameter type
  describe('NumericParameter', () => {
    let numericParameter: NumericParameter;
    
    beforeEach(() => {
      numericParameter = new NumericParameter({
        name: 'test-numeric',
        description: 'Test numeric parameter',
        initialValue: 10,
        min: 0,
        max: 100,
        step: 5,
        precision: 2,
        group: 'Test Group'
      });
    });
    
    test('should initialize with provided values', () => {
      expect(numericParameter.name).toBe('test-numeric');
      expect(numericParameter.description).toBe('Test numeric parameter');
      expect(numericParameter.value).toBe(10);
      expect(numericParameter.min).toBe(0);
      expect(numericParameter.max).toBe(100);
      expect(numericParameter.step).toBe(5);
      expect(numericParameter.precision).toBe(2);
      expect(numericParameter.group).toBe('Test Group');
      expect(numericParameter.persistent).toBe(true);
      expect(numericParameter.readOnly).toBe(false);
    });
    
    test('should initialize with default values when not provided', () => {
      const param = new NumericParameter({
        name: 'minimal',
        initialValue: 5
      });
      
      expect(param.min).toBe(Number.NEGATIVE_INFINITY);
      expect(param.max).toBe(Number.POSITIVE_INFINITY);
      expect(param.step).toBe(1);
      expect(param.precision).toBe(2);
      expect(param.group).toBe('General');
      expect(param.persistent).toBe(true);
      expect(param.readOnly).toBe(false);
    });
    
    test('should update value when set', () => {
      numericParameter.value = 15;
      expect(numericParameter.value).toBe(15);
    });
    
    test('should not update value if read-only', () => {
      const readOnlyParam = new NumericParameter({
        name: 'readonly',
        initialValue: 10,
        readOnly: true
      });
      
      readOnlyParam.value = 20;
      expect(readOnlyParam.value).toBe(10);
    });
    
    test('should validate value against min/max', () => {
      // Too low
      numericParameter.value = -10;
      expect(numericParameter.value).toBe(10); // Value shouldn't change
      
      // Too high
      numericParameter.value = 150;
      expect(numericParameter.value).toBe(10); // Value shouldn't change
      
      // Valid value
      numericParameter.value = 50;
      expect(numericParameter.value).toBe(50);
    });
    
    test('should reset to initial value', () => {
      numericParameter.value = 50;
      numericParameter.reset();
      expect(numericParameter.value).toBe(10);
    });
    
    test('should format value as string', () => {
      numericParameter.value = 25.123;
      expect(numericParameter.getValueAsString()).toBe('25.12');
    });
    
    test('should increment value by step', () => {
      numericParameter.value = 10;
      numericParameter.increment();
      expect(numericParameter.value).toBe(15);
    });
    
    test('should decrement value by step', () => {
      numericParameter.value = 10;
      numericParameter.decrement();
      expect(numericParameter.value).toBe(5);
    });
    
    test('should serialize and deserialize correctly', () => {
      numericParameter.value = 42;
      const serialized = numericParameter.serialize();
      
      // Create a new parameter and deserialize
      const newParam = new NumericParameter({
        name: 'test-numeric',
        initialValue: 10
      });
      
      newParam.deserialize(serialized);
      expect(newParam.value).toBe(42);
    });
    
    test('should notify listeners when value changes', () => {
      const listener = jest.fn();
      numericParameter.addChangeListener(listener);
      
      numericParameter.value = 42;
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          parameter: numericParameter,
          previousValue: 10,
          newValue: 42
        })
      );
    });
    
    test('should not notify listeners when value is the same', () => {
      const listener = jest.fn();
      numericParameter.addChangeListener(listener);
      
      numericParameter.value = 10; // Same as initial value
      
      expect(listener).not.toHaveBeenCalled();
    });
    
    test('should handle listener removal properly', () => {
      const listener = jest.fn();
      numericParameter.addChangeListener(listener);
      numericParameter.removeChangeListener(listener);
      
      numericParameter.value = 42;
      
      expect(listener).not.toHaveBeenCalled();
    });
    
    test('should clear all listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      numericParameter.addChangeListener(listener1);
      numericParameter.addChangeListener(listener2);
      numericParameter.clearChangeListeners();
      
      numericParameter.value = 42;
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });
  
  describe('BooleanParameter', () => {
    let booleanParameter: BooleanParameter;
    
    beforeEach(() => {
      booleanParameter = new BooleanParameter({
        name: 'test-boolean',
        description: 'Test boolean parameter',
        initialValue: false,
        labels: {
          true: 'Enabled',
          false: 'Disabled'
        }
      });
    });
    
    test('should initialize with provided values', () => {
      expect(booleanParameter.name).toBe('test-boolean');
      expect(booleanParameter.description).toBe('Test boolean parameter');
      expect(booleanParameter.value).toBe(false);
      expect(booleanParameter.labels.true).toBe('Enabled');
      expect(booleanParameter.labels.false).toBe('Disabled');
    });
    
    test('should initialize with default labels when not provided', () => {
      const param = new BooleanParameter({
        name: 'minimal',
        initialValue: true
      });
      
      expect(param.labels.true).toBe('True');
      expect(param.labels.false).toBe('False');
    });
    
    test('should toggle value', () => {
      booleanParameter.toggle();
      expect(booleanParameter.value).toBe(true);
      
      booleanParameter.toggle();
      expect(booleanParameter.value).toBe(false);
    });
    
    test('should format value as string using labels', () => {
      expect(booleanParameter.getValueAsString()).toBe('Disabled');
      
      booleanParameter.value = true;
      expect(booleanParameter.getValueAsString()).toBe('Enabled');
    });
    
    test('should serialize and deserialize correctly', () => {
      booleanParameter.value = true;
      const serialized = booleanParameter.serialize();
      
      // Create a new parameter and deserialize
      const newParam = new BooleanParameter({
        name: 'test-boolean',
        initialValue: false
      });
      
      newParam.deserialize(serialized);
      expect(newParam.value).toBe(true);
    });
  });
  
  describe('StringParameter', () => {
    let stringParameter: StringParameter;
    
    beforeEach(() => {
      stringParameter = new StringParameter({
        name: 'test-string',
        description: 'Test string parameter',
        initialValue: 'initial text',
        maxLength: 20,
        pattern: /^[a-zA-Z0-9\s]+$/
      });
    });
    
    test('should initialize with provided values', () => {
      expect(stringParameter.name).toBe('test-string');
      expect(stringParameter.description).toBe('Test string parameter');
      expect(stringParameter.value).toBe('initial text');
      expect(stringParameter.maxLength).toBe(20);
      expect(stringParameter.pattern).toBeInstanceOf(RegExp);
    });
    
    test('should initialize with default values when not provided', () => {
      const param = new StringParameter({
        name: 'minimal',
        initialValue: 'test'
      });
      
      expect(param.maxLength).toBe(Number.POSITIVE_INFINITY);
      expect(param.pattern).toBeNull();
    });
    
    test('should validate string length', () => {
      stringParameter.value = 'This is a valid string';
      expect(stringParameter.value).toBe('This is a valid string');
      
      stringParameter.value = 'This string is too long and should be rejected';
      expect(stringParameter.value).toBe('This is a valid string'); // Unchanged
    });
    
    test('should validate string pattern', () => {
      stringParameter.value = 'Valid123';
      expect(stringParameter.value).toBe('Valid123');
      
      stringParameter.value = 'Invalid@#$%';
      expect(stringParameter.value).toBe('Valid123'); // Unchanged
    });
    
    test('should serialize and deserialize correctly', () => {
      stringParameter.value = 'new value';
      const serialized = stringParameter.serialize();
      
      // Create a new parameter and deserialize
      const newParam = new StringParameter({
        name: 'test-string',
        initialValue: 'initial text'
      });
      
      newParam.deserialize(serialized);
      expect(newParam.value).toBe('new value');
    });
  });
  
  describe('OptionParameter', () => {
    let optionParameter: OptionParameter<string>;
    
    beforeEach(() => {
      optionParameter = new OptionParameter<string>({
        name: 'test-option',
        description: 'Test option parameter',
        initialValue: 'option1',
        options: ['option1', 'option2', 'option3']
      });
    });
    
    test('should initialize with provided values', () => {
      expect(optionParameter.name).toBe('test-option');
      expect(optionParameter.description).toBe('Test option parameter');
      expect(optionParameter.value).toBe('option1');
      expect(optionParameter.options).toEqual(['option1', 'option2', 'option3']);
    });
    
    test('should validate option values', () => {
      optionParameter.value = 'option2';
      expect(optionParameter.value).toBe('option2');
      
      optionParameter.value = 'invalid' as any;
      expect(optionParameter.value).toBe('option2'); // Unchanged
    });
    
    test('should cycle through options', () => {
      expect(optionParameter.value).toBe('option1');
      
      optionParameter.nextOption();
      expect(optionParameter.value).toBe('option2');
      
      optionParameter.nextOption();
      expect(optionParameter.value).toBe('option3');
      
      optionParameter.nextOption();
      expect(optionParameter.value).toBe('option1'); // Cycles back to start
      
      optionParameter.previousOption();
      expect(optionParameter.value).toBe('option3');
    });
    
    test('should use custom option name function', () => {
      const paramWithCustomNames = new OptionParameter<number>({
        name: 'test-option-names',
        initialValue: 1,
        options: [1, 2, 3],
        getOptionName: (option) => `Value ${option}`
      });
      
      expect(paramWithCustomNames.getDisplayName(1)).toBe('Value 1');
      expect(paramWithCustomNames.getDisplayName(2)).toBe('Value 2');
    });
    
    test('should serialize and deserialize correctly', () => {
      optionParameter.value = 'option3';
      const serialized = optionParameter.serialize();
      
      // Create a new parameter and deserialize
      const newParam = new OptionParameter<string>({
        name: 'test-option',
        initialValue: 'option1',
        options: ['option1', 'option2', 'option3']
      });
      
      newParam.deserialize(serialized);
      expect(newParam.value).toBe('option3');
    });
  });
  
  describe('Vector3Parameter', () => {
    let vector3Parameter: Vector3Parameter;
    let mockVector3: BABYLON.Vector3;
    
    beforeEach(() => {
      // Mock a Vector3
      mockVector3 = new BABYLON.Vector3(1, 2, 3);
      
      // Set up the parameter
      vector3Parameter = new Vector3Parameter({
        name: 'test-vector3',
        description: 'Test vector3 parameter',
        initialValue: mockVector3,
        min: new BABYLON.Vector3(-10, -10, -10),
        max: new BABYLON.Vector3(10, 10, 10),
        step: new BABYLON.Vector3(0.1, 0.1, 0.1),
        precision: 2
      });
    });
    
    test('should initialize with provided values', () => {
      expect(vector3Parameter.name).toBe('test-vector3');
      expect(vector3Parameter.description).toBe('Test vector3 parameter');
      expect(vector3Parameter.value).toBe(mockVector3);
      expect(vector3Parameter.min.x).toBe(-10);
      expect(vector3Parameter.max.y).toBe(10);
      expect(vector3Parameter.step.z).toBe(0.1);
      expect(vector3Parameter.precision).toBe(2);
    });
    
    test('should initialize with default values when not provided', () => {
      const param = new Vector3Parameter({
        name: 'minimal',
        initialValue: mockVector3
      });
      
      expect(param.min.x).toBe(Number.NEGATIVE_INFINITY);
      expect(param.max.y).toBe(Number.POSITIVE_INFINITY);
      expect(param.step.z).toBe(0.1);
      expect(param.precision).toBe(2);
    });
    
    test('should format vector as string', () => {
      // Mock toString to format consistently for testing
      (mockVector3.toString as jest.Mock).mockReturnValue('(1.00, 2.00, 3.00)');
      
      expect(vector3Parameter.getValueAsString()).toBe('(1.00, 2.00, 3.00)');
    });
    
    test('should set individual components', () => {
      // Mock a clone for testing purposes
      const clonedVector = new BABYLON.Vector3(1, 2, 3);
      (mockVector3.clone as jest.Mock).mockReturnValue(clonedVector);
      
      vector3Parameter.setComponent('x', 5);
      
      // The new value should be a clone with the x component modified
      expect(mockVector3.clone).toHaveBeenCalled();
      expect(vector3Parameter.value).not.toBe(mockVector3); // Should be a different object
      expect(vector3Parameter.value.x).toBe(5);
    });
    
    test('should validate component values against min/max', () => {
      // Mock a clone for testing purposes
      const clonedVector = new BABYLON.Vector3(1, 2, 3);
      (mockVector3.clone as jest.Mock).mockReturnValue(clonedVector);
      
      // Set x to below minimum
      vector3Parameter.setComponent('x', -20);
      
      // Should not change because value is out of bounds
      expect(vector3Parameter.value).toBe(mockVector3);
    });
    
    test('should increment and decrement components', () => {
      // Mock a clone for testing purpose
      const clonedVector = new BABYLON.Vector3(1, 2, 3);
      (mockVector3.clone as jest.Mock).mockReturnValue(clonedVector);
      
      vector3Parameter.incrementComponent('y');
      
      // The y component should be incremented by the step
      expect(vector3Parameter.value.y).toBe(2.1);
      
      vector3Parameter.decrementComponent('z');
      
      // The z component should be decremented by the step
      expect(vector3Parameter.value.z).toBe(2.9);
    });
    
    test('should serialize and deserialize correctly', () => {
      const serializedVector = { x: 5, y: 6, z: 7 };
      (mockVector3.asArray as jest.Mock).mockReturnValue([5, 6, 7]);
      
      const serialized = vector3Parameter.serialize();
      expect(serialized).toEqual({ x: 5, y: 6, z: 7 });
      
      // Create a new parameter and deserialize
      const newMockVector = new BABYLON.Vector3(0, 0, 0);
      const newParam = new Vector3Parameter({
        name: 'test-vector3',
        initialValue: newMockVector
      });
      
      newParam.deserialize(serialized);
      
      // Should set new values on the vector
      expect(newMockVector.x).toBe(5);
      expect(newMockVector.y).toBe(6);
      expect(newMockVector.z).toBe(7);
    });
  });
}); 