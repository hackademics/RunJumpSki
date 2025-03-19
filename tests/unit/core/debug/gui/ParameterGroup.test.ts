/**
 * @file tests/unit/core/debug/gui/ParameterGroup.test.ts
 * @description Unit tests for the ParameterGroup class
 */

import { ParameterGroup, GroupChangeEvent } from '../../../../../src/core/debug/gui/ParameterGroup';
import { 
  NumericParameter, 
  BooleanParameter, 
  StringParameter 
} from '../../../../../src/core/debug/gui/TweakableParameter';

describe('ParameterGroup', () => {
  let parameterGroup: ParameterGroup;
  let numericParam: NumericParameter;
  let booleanParam: BooleanParameter;
  let stringParam: StringParameter;
  
  beforeEach(() => {
    // Create a new parameter group
    parameterGroup = new ParameterGroup('Test Group', true);
    
    // Create some parameters to add to the group
    numericParam = new NumericParameter({
      name: 'numeric',
      initialValue: 10,
      min: 0,
      max: 100
    });
    
    booleanParam = new BooleanParameter({
      name: 'boolean',
      initialValue: false
    });
    
    stringParam = new StringParameter({
      name: 'string',
      initialValue: 'test'
    });
  });
  
  describe('Initialization', () => {
    test('should initialize with provided name and expanded state', () => {
      expect(parameterGroup.name).toBe('Test Group');
      expect(parameterGroup.expanded).toBe(true);
    });
    
    test('should initialize with default expanded state if not provided', () => {
      const group = new ParameterGroup('Default Group');
      expect(group.expanded).toBe(true); // Default is true
    });
  });
  
  describe('Parameter Management', () => {
    test('should add parameters correctly', () => {
      parameterGroup.addParameter(numericParam);
      parameterGroup.addParameter(booleanParam);
      
      expect(parameterGroup.hasParameter('numeric')).toBe(true);
      expect(parameterGroup.hasParameter('boolean')).toBe(true);
      expect(parameterGroup.hasParameter('nonexistent')).toBe(false);
      
      // Check the parameters collection
      const parameters = parameterGroup.getParameters();
      expect(parameters).toHaveLength(2);
      expect(parameters).toContain(numericParam);
      expect(parameters).toContain(booleanParam);
    });
    
    test('should retrieve parameters by name', () => {
      parameterGroup.addParameter(numericParam);
      parameterGroup.addParameter(booleanParam);
      
      expect(parameterGroup.getParameter('numeric')).toBe(numericParam);
      expect(parameterGroup.getParameter('boolean')).toBe(booleanParam);
      expect(parameterGroup.getParameter('nonexistent')).toBeUndefined();
    });
    
    test('should remove parameters correctly', () => {
      parameterGroup.addParameter(numericParam);
      parameterGroup.addParameter(booleanParam);
      parameterGroup.addParameter(stringParam);
      
      parameterGroup.removeParameter('boolean');
      
      expect(parameterGroup.hasParameter('numeric')).toBe(true);
      expect(parameterGroup.hasParameter('boolean')).toBe(false);
      expect(parameterGroup.hasParameter('string')).toBe(true);
      
      // Check the parameters collection
      const parameters = parameterGroup.getParameters();
      expect(parameters).toHaveLength(2);
      expect(parameters).toContain(numericParam);
      expect(parameters).toContain(stringParam);
      expect(parameters).not.toContain(booleanParam);
    });
    
    test('should not add a parameter with a duplicate name', () => {
      parameterGroup.addParameter(numericParam);
      
      // Create a new parameter with the same name
      const duplicateParam = new NumericParameter({
        name: 'numeric', // Same name
        initialValue: 20
      });
      
      // Console.warn will be called but parameter will not be added
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      parameterGroup.addParameter(duplicateParam);
      
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(parameterGroup.getParameter('numeric')).toBe(numericParam); // Original still there
      expect(parameterGroup.getParameters()).toHaveLength(1); // Still just one parameter
      
      consoleWarnSpy.mockRestore();
    });
    
    test('should warn when trying to remove a non-existent parameter', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      parameterGroup.removeParameter('nonexistent');
      
      expect(consoleWarnSpy).toHaveBeenCalled();
      
      consoleWarnSpy.mockRestore();
    });
  });
  
  describe('Change Notification', () => {
    test('should notify listeners when a parameter is added', () => {
      const listener = jest.fn();
      parameterGroup.addChangeListener(listener);
      
      parameterGroup.addParameter(numericParam);
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'parameterAdded',
          parameter: numericParam
        })
      );
    });
    
    test('should notify listeners when a parameter is removed', () => {
      const listener = jest.fn();
      
      parameterGroup.addParameter(numericParam);
      parameterGroup.addChangeListener(listener);
      
      parameterGroup.removeParameter('numeric');
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'parameterRemoved',
          parameter: numericParam
        })
      );
    });
    
    test('should handle listener removal properly', () => {
      const listener = jest.fn();
      parameterGroup.addChangeListener(listener);
      parameterGroup.removeChangeListener(listener);
      
      parameterGroup.addParameter(numericParam);
      
      expect(listener).not.toHaveBeenCalled();
    });
    
    test('should clear all listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      parameterGroup.addChangeListener(listener1);
      parameterGroup.addChangeListener(listener2);
      parameterGroup.clearChangeListeners();
      
      parameterGroup.addParameter(numericParam);
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
    
    test('should handle errors in listeners gracefully', () => {
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      parameterGroup.addChangeListener(errorListener);
      parameterGroup.addParameter(numericParam);
      
      expect(errorListener).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });
  
  describe('Expanded State', () => {
    test('should toggle expanded state', () => {
      expect(parameterGroup.expanded).toBe(true);
      
      parameterGroup.toggleExpanded();
      expect(parameterGroup.expanded).toBe(false);
      
      parameterGroup.toggleExpanded();
      expect(parameterGroup.expanded).toBe(true);
    });
  });
}); 