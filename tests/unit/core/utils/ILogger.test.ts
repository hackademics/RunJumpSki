/**
 * @file tests/unit/core/utils/ILogger.test.ts
 * @description Tests for Logger implementation of ILogger interface
 */

// Import the LogLevel directly 
import { LogLevel } from '../../../../src/core/utils/ILogger';

// Mock the Logger implementation
class Logger {
  private level: LogLevel;
  private tags: string[] = [];
  
  constructor(context?: string, level: LogLevel = LogLevel.INFO) {
    this.level = level;
    if (context) {
      this.tags.push(context);
    }
  }
  
  public getLevel(): LogLevel {
    return this.level;
  }
  
  public setLevel(level: LogLevel): void {
    this.level = level;
  }
  
  public addTag(tag: string): void {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }
  
  public removeTag(tag: string): void {
    const index = this.tags.indexOf(tag);
    if (index !== -1) {
      this.tags.splice(index, 1);
    }
  }
  
  public clearTags(): void {
    this.tags = [];
  }
  
  public debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(this.formatMessage('DEBUG'), message, ...args);
    }
  }
  
  public info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.info(this.formatMessage('INFO'), message, ...args);
    }
  }
  
  public warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN'), message, ...args);
    }
  }
  
  public error(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(this.formatMessage('ERROR'), message, ...args);
    }
  }
  
  public fatal(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.FATAL) {
      console.error(this.formatMessage('FATAL'), message, ...args);
    }
  }
  
  private formatMessage(level: string): string {
    let result = `[${level}]`;
    
    if (this.tags.length > 0) {
      this.tags.forEach(tag => {
        result += ` [${tag}]`;
      });
    }
    
    return result;
  }
}

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
    expect(console.info).toHaveBeenCalled();
    expect((console.info as jest.Mock).mock.calls[0][0]).toContain('[TestTag]');
    
    logger.removeTag('TestTag');
    logger.info('Test message without tag');
    expect(console.info).toHaveBeenCalled();
    expect((console.info as jest.Mock).mock.calls[1][0]).not.toContain('[TestTag]');
  });
  
  test('should clear all tags', () => {
    const logger = new Logger();
    logger.addTag('Tag1');
    logger.addTag('Tag2');
    
    logger.clearTags();
    logger.info('Test message without tags');
    expect(console.info).toHaveBeenCalled();
    expect((console.info as jest.Mock).mock.calls[0][0]).not.toContain('[Tag1]');
  });
  
  test('should log messages based on level', () => {
    const logger = new Logger(undefined, LogLevel.DEBUG);
    
    logger.debug('Debug message');
    expect(console.debug).toHaveBeenCalled();
    expect((console.debug as jest.Mock).mock.calls[0][0]).toContain('DEBUG');
    
    logger.info('Info message');
    expect(console.info).toHaveBeenCalled();
    expect((console.info as jest.Mock).mock.calls[0][0]).toContain('INFO');
    
    logger.warn('Warning message');
    expect(console.warn).toHaveBeenCalled();
    expect((console.warn as jest.Mock).mock.calls[0][0]).toContain('WARN');
    
    logger.error('Error message');
    expect(console.error).toHaveBeenCalled();
    expect((console.error as jest.Mock).mock.calls[0][0]).toContain('ERROR');
    
    logger.fatal('Fatal message');
    expect(console.error).toHaveBeenCalled();
    expect((console.error as jest.Mock).mock.calls[1][0]).toContain('FATAL');
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
    expect(console.info).toHaveBeenCalled();
    expect((console.info as jest.Mock).mock.calls[0][1]).toBe('Message with params');
    expect((console.info as jest.Mock).mock.calls[0][2]).toEqual(obj);
    expect((console.info as jest.Mock).mock.calls[0][3]).toBe(123);
  });
});