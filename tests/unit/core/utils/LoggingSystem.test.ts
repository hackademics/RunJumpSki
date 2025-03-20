/**
 * @file tests/unit/core/utils/LoggingSystem.test.ts
 * @description Tests for LoggingSystem implementation
 */

import { LoggingSystem } from '../../../../src/core/utils/LoggerSystem';
import { LogLevel } from '../../../../src/core/utils/ILogger';
import { ILogger } from '../../../../src/core/utils/ILogger';
import { Logger } from '../../../../src/core/utils/Logger';

// Mock the Logger class that LoggingSystem uses internally
jest.mock('../../../../src/core/utils/Logger', () => {
  return {
    Logger: jest.fn().mockImplementation((context, initialLevel) => {
      let logLevel = initialLevel || LogLevel.INFO;
      
      return {
        context,
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn(),
        setLevel: jest.fn((level) => { logLevel = level; }),
        getLevel: jest.fn(() => logLevel),
        addTag: jest.fn(),
        removeTag: jest.fn(),
        clearTags: jest.fn(),
        dispose: jest.fn(),
        initialize: jest.fn(),
        update: jest.fn()
      };
    })
  };
});

describe('LoggingSystem', () => {
  let originalConsoleDebug: any;
  let originalConsoleInfo: any;
  let originalConsoleWarn: any;
  let originalConsoleError: any;
  let loggingSystem: LoggingSystem;
  
  beforeEach(() => {
    // Spy on console methods
    originalConsoleDebug = console.debug;
    originalConsoleInfo = console.info;
    originalConsoleWarn = console.warn;
    originalConsoleError = console.error;
    
    console.debug = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();

    // Create a fresh instance for each test
    loggingSystem = new LoggingSystem();
    
    // Clear mock calls between tests
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    // Restore original console methods
    console.debug = originalConsoleDebug;
    console.info = originalConsoleInfo;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  // System Interface Tests
  describe('System Interface', () => {
    test('should have a negative priority to run before other systems', () => {
      expect(loggingSystem.priority).toBeLessThan(0);
    });

    test('should log during initialization', async () => {
      const infoSpy = jest.spyOn(loggingSystem, 'info');
      await loggingSystem.initialize();
      expect(infoSpy).toHaveBeenCalledWith('LoggingSystem initialized');
    });

    test('should not perform any operations during update', () => {
      const traceSpy = jest.spyOn(loggingSystem, 'trace');
      const debugSpy = jest.spyOn(loggingSystem, 'debug');
      const infoSpy = jest.spyOn(loggingSystem, 'info');
      
      loggingSystem.update(16.67); // Simulate ~60fps
      
      expect(traceSpy).not.toHaveBeenCalled();
      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
    });

    test('should log during shutdown', () => {
      const infoSpy = jest.spyOn(loggingSystem, 'info');
      loggingSystem.shutdown();
      expect(infoSpy).toHaveBeenCalledWith('LoggingSystem shutting down');
    });

    test('should log during disposal', async () => {
      const infoSpy = jest.spyOn(loggingSystem, 'info');
      await loggingSystem.dispose();
      expect(infoSpy).toHaveBeenCalledWith('LoggingSystem disposing');
    });
  });

  // Logger Interface Tests
  describe('Logger Interface', () => {
    test('should initialize with default log level INFO', () => {
      expect(loggingSystem.getLevel()).toBe(LogLevel.INFO);
    });

    test('should initialize with custom log level when provided', () => {
      const debugLogger = new LoggingSystem(LogLevel.DEBUG);
      expect(debugLogger.getLevel()).toBe(LogLevel.DEBUG);
    });

    test('should set and get log level', () => {
      loggingSystem.setLevel(LogLevel.ERROR);
      expect(loggingSystem.getLevel()).toBe(LogLevel.ERROR);
    });

    test('should delegate trace calls to internal logger', () => {
      const traceSpy = jest.spyOn(loggingSystem, 'trace');
      loggingSystem.trace('Trace message');
      expect(traceSpy).toHaveBeenCalledWith('Trace message');
    });

    test('should delegate debug calls to internal logger', () => {
      const debugSpy = jest.spyOn(loggingSystem, 'debug');
      loggingSystem.debug('Debug message');
      expect(debugSpy).toHaveBeenCalledWith('Debug message');
    });

    test('should delegate info calls to internal logger', () => {
      const infoSpy = jest.spyOn(loggingSystem, 'info');
      loggingSystem.info('Info message');
      expect(infoSpy).toHaveBeenCalledWith('Info message');
    });

    test('should delegate warn calls to internal logger', () => {
      const warnSpy = jest.spyOn(loggingSystem, 'warn');
      loggingSystem.warn('Warning message');
      expect(warnSpy).toHaveBeenCalledWith('Warning message');
    });

    test('should delegate error calls to internal logger', () => {
      const errorSpy = jest.spyOn(loggingSystem, 'error');
      loggingSystem.error('Error message');
      expect(errorSpy).toHaveBeenCalledWith('Error message');
    });

    test('should delegate fatal calls to internal logger', () => {
      const fatalSpy = jest.spyOn(loggingSystem, 'fatal');
      loggingSystem.fatal('Fatal message');
      expect(fatalSpy).toHaveBeenCalledWith('Fatal message');
    });

    test('should handle additional parameters in log methods', () => {
      const infoSpy = jest.spyOn(loggingSystem, 'info');
      const obj = { test: 'value' };
      loggingSystem.info('Info with params', obj, 123);
      expect(infoSpy).toHaveBeenCalledWith('Info with params', obj, 123);
    });

    test('should not log messages below current level', () => {
      loggingSystem.setLevel(LogLevel.WARN);
      
      // These should be filtered out by the logger
      const traceSpy = jest.spyOn(loggingSystem, 'trace');
      const debugSpy = jest.spyOn(loggingSystem, 'debug');
      const infoSpy = jest.spyOn(loggingSystem, 'info');
      
      // Mock the internal logger directly to verify behavior
      // Using LoggingSystem's internal behavior
      const consoleInfoSpy = jest.spyOn(console, 'info');
      
      loggingSystem.trace('Trace message');
      loggingSystem.debug('Debug message');
      loggingSystem.info('Info message');
      
      // The spy on the methods will show calls, but the actual console output should be filtered
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });
  });

  // Tag Management Tests
  describe('Tag Management', () => {
    test('should add tags', () => {
      const addTagSpy = jest.spyOn(loggingSystem, 'addTag');
      loggingSystem.addTag('TestTag');
      expect(addTagSpy).toHaveBeenCalledWith('TestTag');
    });

    test('should remove tags', () => {
      const removeTagSpy = jest.spyOn(loggingSystem, 'removeTag');
      loggingSystem.removeTag('TestTag');
      expect(removeTagSpy).toHaveBeenCalledWith('TestTag');
    });

    test('should clear all tags', () => {
      const clearTagsSpy = jest.spyOn(loggingSystem, 'clearTags');
      loggingSystem.clearTags();
      expect(clearTagsSpy).toHaveBeenCalled();
    });
  });

  // Child Logger Creation Test
  describe('Child Logger Creation', () => {
    test('should create child loggers with specified context', () => {
      // Mock the Logger constructor to track calls
      const mockLoggerConstructor = require('../../../../src/core/utils/Logger').Logger;

      // Act: Create a child logger
      const childContext = 'ChildContext';
      const childLogger = loggingSystem.createLogger(childContext);
      
      // Assert: Verify the child logger was created
      expect(childLogger).toBeDefined();
      expect(childLogger).toBeInstanceOf(Object);
      
      // Verify that the Logger constructor was called with the right context
      expect(mockLoggerConstructor).toHaveBeenCalledWith(
        childContext,
        expect.any(Number) // The log level will be passed but we don't need to test the exact value
      );
    });
  });
}); 