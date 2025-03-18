/**
 * @file tests/unit/core/base/ServiceLocator.test.ts
 * @description Tests for the ServiceLocator class
 */

import { ServiceLocator } from '../../../../src/core/base/ServiceLocator';

describe('ServiceLocator', () => {
  beforeEach(() => {
    // Clear all services before each test
    ServiceLocator.getInstance().clear();
  });
  
  test('should be a singleton', () => {
    const instance1 = ServiceLocator.getInstance();
    const instance2 = ServiceLocator.getInstance();
    
    expect(instance1).toBe(instance2);
  });
  
  test('should register and retrieve services', () => {
    const serviceLocator = ServiceLocator.getInstance();
    const testService = { value: 'test' };
    
    serviceLocator.register('testService', testService);
    
    const retrievedService = serviceLocator.get<{ value: string }>('testService');
    expect(retrievedService).toBe(testService);
    expect(retrievedService.value).toBe('test');
  });
  
  test('should check if a service exists', () => {
    const serviceLocator = ServiceLocator.getInstance();
    const testService = { value: 'test' };
    
    expect(serviceLocator.has('testService')).toBe(false);
    
    serviceLocator.register('testService', testService);
    
    expect(serviceLocator.has('testService')).toBe(true);
  });
  
  test('should remove a service', () => {
    const serviceLocator = ServiceLocator.getInstance();
    const testService = { value: 'test' };
    
    serviceLocator.register('testService', testService);
    expect(serviceLocator.has('testService')).toBe(true);
    
    const removed = serviceLocator.remove('testService');
    expect(removed).toBe(true);
    expect(serviceLocator.has('testService')).toBe(false);
    
    // Removing a non-existent service should return false
    const removedAgain = serviceLocator.remove('testService');
    expect(removedAgain).toBe(false);
  });
  
  test('should clear all services', () => {
    const serviceLocator = ServiceLocator.getInstance();
    
    serviceLocator.register('service1', { value: 1 });
    serviceLocator.register('service2', { value: 2 });
    
    expect(serviceLocator.has('service1')).toBe(true);
    expect(serviceLocator.has('service2')).toBe(true);
    
    serviceLocator.clear();
    
    expect(serviceLocator.has('service1')).toBe(false);
    expect(serviceLocator.has('service2')).toBe(false);
  });
  
  test('should throw an error when getting a non-existent service', () => {
    const serviceLocator = ServiceLocator.getInstance();
    
    expect(() => {
      serviceLocator.get('nonExistentService');
    }).toThrow('Service not found: nonExistentService');
  });
  
  test('should overwrite an existing service', () => {
    const serviceLocator = ServiceLocator.getInstance();
    const testService1 = { value: 'test1' };
    const testService2 = { value: 'test2' };
    
    serviceLocator.register('testService', testService1);
    
    // This should log a warning but not throw an error
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    serviceLocator.register('testService', testService2);
    expect(consoleSpy).toHaveBeenCalledWith("Service 'testService' is being overwritten");
    consoleSpy.mockRestore();
    
    const retrievedService = serviceLocator.get<{ value: string }>('testService');
    expect(retrievedService).toBe(testService2);
    expect(retrievedService.value).toBe('test2');
  });
});
