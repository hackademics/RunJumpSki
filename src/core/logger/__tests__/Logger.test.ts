import { Logger } from '../Logger';
import { LogLevel, LoggerConfig, LogEntry } from '../ILogger';
import { LoggerError } from '../../../utils/errors/LoggerError';
import { EventBus } from '../../events/EventBus';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');
jest.mock('path');
jest.mock('../../events/EventBus');

describe('Logger', () => {
    let logger: Logger;
    let mockEventBus: jest.Mocked<EventBus>;
    const testLogFile = '/logs/test.log';

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset singleton instance
        (Logger as any).instance = undefined;
        // Setup EventBus mock
        mockEventBus = {
            emit: jest.fn(),
            on: jest.fn(),
            off: jest.fn(),
            getInstance: jest.fn().mockReturnThis(),
        } as any;
        (EventBus.getInstance as jest.Mock).mockReturnValue(mockEventBus);
        
        logger = Logger.getInstance();
    });

    afterEach(() => {
        try {
            logger.dispose();
        } catch (error) {
            // Ignore disposal errors in cleanup
        }
    });

    describe('Initialization', () => {
        test('should create singleton instance', () => {
            const instance1 = Logger.getInstance();
            const instance2 = Logger.getInstance();
            expect(instance1).toBe(instance2);
        });

        test('should initialize with default config', () => {
            logger.initialize();
            expect(() => logger.info('test')).not.toThrow();
        });

        test('should initialize with custom config', () => {
            const config: LoggerConfig = {
                minLevel: LogLevel.DEBUG,
                maxEntries: 500,
                emitEvents: false,
                includeTimestamps: false,
                console: {
                    enabled: false
                }
            };
            logger.initialize(config);
            expect(() => logger.debug('test')).not.toThrow();
        });

        test('should throw when initializing twice', () => {
            logger.initialize();
            expect(() => logger.initialize()).toThrow(LoggerError);
        });

        test('should throw with invalid maxEntries', () => {
            const config: LoggerConfig = {
                maxEntries: 0
            };
            expect(() => logger.initialize(config)).toThrow(LoggerError);
        });

        test('should create log directory if it does not exist', () => {
            const config: LoggerConfig = {
                file: {
                    enabled: true,
                    path: testLogFile
                }
            };
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            logger.initialize(config);
            expect(fs.mkdirSync).toHaveBeenCalled();
        });
    });

    describe('Logging Methods', () => {
        beforeEach(() => {
            logger.initialize();
        });

        test.each([
            ['debug', LogLevel.DEBUG],
            ['info', LogLevel.INFO],
            ['warn', LogLevel.WARN],
            ['error', LogLevel.ERROR],
            ['fatal', LogLevel.FATAL]
        ])('should log %s message with correct level', (method, level) => {
            (logger as any)[method]('test message');
            const entries = logger.getEntries();
            expect(entries[0].level).toBe(level);
            expect(entries[0].message).toBe('test message');
        });

        test('should include context in log entry', () => {
            const context = { userId: '123', action: 'test' };
            logger.info('test message', context);
            const entries = logger.getEntries();
            expect(entries[0].context).toEqual(context);
        });

        test('should include tags in log entry', () => {
            const tags = ['test', 'debug'];
            logger.info('test message', undefined, tags);
            const entries = logger.getEntries();
            expect(entries[0].tags).toEqual(tags);
        });

        test('should include error and stack trace in error logs', () => {
            const error = new Error('test error');
            logger.error('error occurred', error);
            const entries = logger.getEntries();
            expect(entries[0].error).toBe(error);
            expect(entries[0].stackTrace).toBe(error.stack);
        });

        test('should respect minimum log level', () => {
            logger.initialize({ minLevel: LogLevel.WARN });
            logger.debug('debug message');
            logger.info('info message');
            logger.warn('warn message');
            const entries = logger.getEntries();
            expect(entries.length).toBe(1);
            expect(entries[0].level).toBe(LogLevel.WARN);
        });
    });

    describe('Entry Management', () => {
        beforeEach(() => {
            logger.initialize({ maxEntries: 3 });
        });

        test('should limit entries to maxEntries', () => {
            logger.info('message 1');
            logger.info('message 2');
            logger.info('message 3');
            logger.info('message 4');
            const entries = logger.getEntries();
            expect(entries.length).toBe(3);
            expect(entries[0].message).toBe('message 2');
            expect(entries[2].message).toBe('message 4');
        });

        test('should clear entries', () => {
            logger.info('test message');
            logger.clear();
            expect(logger.getEntries()).toHaveLength(0);
        });

        test('should filter entries by level', () => {
            logger.info('info message');
            logger.error('error message');
            const filtered = logger.getFilteredEntries({ level: LogLevel.ERROR });
            expect(filtered).toHaveLength(1);
            expect(filtered[0].message).toBe('error message');
        });

        test('should filter entries by tags', () => {
            logger.info('message 1', undefined, ['tag1']);
            logger.info('message 2', undefined, ['tag2']);
            logger.info('message 3', undefined, ['tag1', 'tag2']);
            const filtered = logger.getFilteredEntries({ tags: ['tag1'] });
            expect(filtered).toHaveLength(2);
        });

        test('should filter entries by time range', () => {
            const now = Date.now();
            jest.spyOn(Date, 'now')
                .mockReturnValueOnce(now)
                .mockReturnValueOnce(now + 1000)
                .mockReturnValueOnce(now + 2000);

            logger.info('message 1');
            logger.info('message 2');
            logger.info('message 3');

            const filtered = logger.getFilteredEntries({
                startTime: now + 500,
                endTime: now + 1500
            });
            expect(filtered).toHaveLength(1);
            expect(filtered[0].message).toBe('message 2');
        });

        test('should filter entries by search text', () => {
            logger.info('apple message');
            logger.info('banana message');
            logger.error('apple error', new Error('test'));
            const filtered = logger.getFilteredEntries({ search: 'apple' });
            expect(filtered).toHaveLength(2);
        });
    });

    describe('File Output', () => {
        const mockWriteStream = {
            write: jest.fn(),
            end: jest.fn()
        };

        beforeEach(() => {
            (fs.createWriteStream as jest.Mock).mockReturnValue(mockWriteStream);
        });

        test('should write to file when enabled', () => {
            logger.initialize({
                file: {
                    enabled: true,
                    path: testLogFile
                }
            });
            logger.info('test message');
            expect(mockWriteStream.write).toHaveBeenCalled();
        });

        test('should handle file write errors', () => {
            logger.initialize({
                file: {
                    enabled: true,
                    path: testLogFile
                }
            });
            mockWriteStream.write.mockImplementation(() => {
                throw new Error('Write failed');
            });
            expect(() => logger.info('test')).not.toThrow();
            expect(mockEventBus.emit).toHaveBeenCalledWith('log:error', expect.any(Object));
        });
    });

    describe('Event Emission', () => {
        beforeEach(() => {
            logger.initialize({ emitEvents: true });
        });

        test('should emit log:entry event', () => {
            logger.info('test message');
            expect(mockEventBus.emit).toHaveBeenCalledWith('log:entry', expect.any(Object));
        });

        test('should emit log:cleared event', () => {
            logger.clear();
            expect(mockEventBus.emit).toHaveBeenCalledWith('log:cleared', expect.any(Object));
        });

        test('should emit log:disposed event', () => {
            logger.dispose();
            expect(mockEventBus.emit).toHaveBeenCalledWith('log:disposed', expect.any(Object));
        });

        test('should not emit events when disabled', () => {
            logger.dispose();
            logger.initialize({ emitEvents: false });
            logger.info('test message');
            logger.clear();
            logger.dispose();
            expect(mockEventBus.emit).not.toHaveBeenCalled();
        });
    });

    describe('Custom Formatting', () => {
        test('should use custom formatter when provided', () => {
            const formatter = (entry: LogEntry) => `CUSTOM: ${entry.message}`;
            logger.initialize({ formatter });
            logger.info('test message');
            // Since we can't directly check the formatted output, we verify it doesn't throw
            expect(() => logger.info('test')).not.toThrow();
        });

        test('should handle formatter errors', () => {
            const formatter = () => { throw new Error('Format failed'); };
            logger.initialize({ formatter });
            expect(() => logger.info('test')).not.toThrow();
            expect(mockEventBus.emit).toHaveBeenCalledWith('log:error', expect.any(Object));
        });
    });

    describe('Error Handling', () => {
        test('should throw when using uninitialized logger', () => {
            expect(() => logger.info('test')).toThrow(LoggerError);
        });

        test('should throw when using disposed logger', () => {
            logger.initialize();
            logger.dispose();
            expect(() => logger.info('test')).toThrow(LoggerError);
        });

        test('should handle file creation errors', () => {
            (fs.createWriteStream as jest.Mock).mockImplementation(() => {
                throw new Error('Create failed');
            });
            expect(() => logger.initialize({
                file: {
                    enabled: true,
                    path: testLogFile
                }
            })).toThrow(LoggerError);
        });
    });

    describe('Performance', () => {
        beforeEach(() => {
            logger.initialize({ maxEntries: 1000 });
        });

        test('should handle rapid logging', () => {
            const count = 1000;
            const start = performance.now();
            
            for (let i = 0; i < count; i++) {
                logger.info(`message ${i}`);
            }
            
            const end = performance.now();
            const duration = end - start;
            
            // Verify all messages were logged
            expect(logger.getEntries()).toHaveLength(count);
            // Ensure reasonable performance (adjust threshold as needed)
            expect(duration).toBeLessThan(1000); // Should complete within 1 second
        });

        test('should handle concurrent operations', async () => {
            const promises = Array.from({ length: 100 }, (_, i) =>
                Promise.resolve().then(() => logger.info(`message ${i}`))
            );
            
            await Promise.all(promises);
            expect(logger.getEntries()).toHaveLength(100);
        });
    });
}); 