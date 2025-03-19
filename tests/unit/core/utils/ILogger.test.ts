import { Logger } from '/src/core/utils/Logger.ts';
import { LogLevel } from '../../../src/core/utils/ILogger';
import { LoggingSystem } from '../../../../src/core/utils/LoggingSystem';

describe('Logger', () => {
  let originalConsoleDebug: any;
  let originalConsoleInfo: any;
  let originalConsoleWarn: any;
  let originalConsoleError: any;
  
  // Spy on console methods before each test
  beforeEach(() => {
    originalConsoleDebug = console.debug;
    originalConsoleInfo = console.info;
    originalConsoleWarn = console.warn;
    originalConsoleError = console.error;
    
    console.debug = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });
  
  // Restore original console methods after each test
  afterEach(() => {
    console.debug = originalConsoleDebug;
    console.info = originalConsoleInfo;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });
  
  test('should create logger with default level', () => {
    const logger = new Logger();
    expect(logger.getLevel()).toBe(LogLevel.INFO);
  });
  
  test('should create logger with custom level', () => {
    const logger = new Logger(undefined, LogLevel.DEBUG);
    expect(logger.getLevel()).toBe(LogLevel.DEBUG);
  });
  
  test('should set log level', () => {
    const logger = new Logger();
    logger.setLevel(LogLevel.ERROR);
    expect(logger.getLevel()).toBe(LogLevel.ERROR);
  });
  
  test('should add and remove tags', () => {
    const logger = new Logger();
    logger.addTag('TestTag');
    
    logger.info('Test message with tag');
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('[TestTag]'),
      'Test message with tag'
    );
    
    logger.removeTag('TestTag');
    logger.info('Test message without tag');
    expect(console.info).toHaveBeenCalledWith(
      expect.not.stringContaining('[TestTag]'),
      'Test message without tag'
    );
  });
  
  test('should clear all tags', () => {
    const logger = new Logger();
    logger.addTag('Tag1');
    logger.addTag('Tag2');
    
    logger.clearTags();
    logger.info('Test message without tags');
    expect(console.info).toHaveBeenCalledWith(
      expect.not.stringContaining('[Tag1]'),
      'Test message without tags'
    );
  });
  
  test('should log messages based on level', () => {
    const logger = new Logger(undefined, LogLevel.DEBUG);
    
    logger.debug('Debug message');
    expect(console.debug).toHaveBeenCalledWith(
      expect.stringContaining('DEBUG'),
      'Debug message'
    );
    
    logger.info('Info message');
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('INFO'),
      'Info message'
    );
    
    logger.warn('Warning message');
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('WARN'),
      'Warning message'
    );
    
    logger.error('Error message');
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('ERROR'),
      'Error message'
    );
    
    logger.fatal('Fatal message');
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('FATAL'),
      'Fatal message'
    );
  });
  
  test('should not log messages below current level', () => {
    const logger = new Logger(undefined, LogLevel.WARN);
    
    logger.debug('Debug message');
    expect(console.debug).not.toHaveBeenCalled();
    
    logger.info('Info message');
    expect(console.info).not.toHaveBeenCalled();
    
    logger.warn('Warning message');
    expect(console.warn).toHaveBeenCalled();
  });
  
  test('should include optional parameters', () => {
    const logger = new Logger();
    const obj = { key: 'value' };
    
    logger.info('Message with params', obj, 123);
    expect(console.info).toHaveBeenCalledWith(
      expect.any(String),
      'Message with params',
      obj,
      123
    );
  });
});

describe('LoggingSystem', () => {
  let loggingSystem: LoggingSystem;
  
  beforeEach(() => {
    loggingSystem = new LoggingSystem();
    console.info = jest.fn();
  });
  
  test('should initialize with correct priority', () => {
    expect(loggingSystem.priority).toBe(-1000);
  });
  
  test('should log system initialization', () => {
    loggingSystem.initialize();
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('LogSystem'),
      'LoggingSystem initialized'
    );
  });
  
  test('should log system shutdown', () => {
    loggingSystem.shutdown();
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('LogSystem'),
      'LoggingSystem shutting down'
    );
  });
  
  test('should create child logger', () => {
    console.debug = jest.fn();
    loggingSystem.setLevel(LogLevel.DEBUG);
    
    const childLogger = loggingSystem.createLogger('ChildContext');
    
    expect(console.debug).toHaveBeenCalledWith(
      expect.stringContaining('LogSystem'),
      'Created child logger with context: ChildContext'
    );
    
    childLogger.info('Test from child');
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('[ChildContext]'),
      'Test from child'
    );
  });
});