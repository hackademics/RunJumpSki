import { EventBus } from '../events/EventBus';
import { ILogger, LoggerConfig, LogEntry, LogLevel, LoggerEvents } from './ILogger';
import { LoggerError } from '../../utils/errors/LoggerError';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Implementation of the logger system
 */
export class Logger implements ILogger {
    private static instance: Logger;
    private initialized: boolean = false;
    private disposed: boolean = false;
    private entries: LogEntry[] = [];
    private config: LoggerConfig = {
        minLevel: LogLevel.INFO,
        maxEntries: 1000,
        emitEvents: true,
        includeTimestamps: true,
        includeStackTraces: true,
        console: {
            enabled: true,
            colors: true
        }
    };
    private eventBus: EventBus;
    private fileStream: fs.WriteStream | null = null;

    private readonly CONSOLE_COLORS = {
        [LogLevel.DEBUG]: '\x1b[36m', // Cyan
        [LogLevel.INFO]: '\x1b[32m',  // Green
        [LogLevel.WARN]: '\x1b[33m',  // Yellow
        [LogLevel.ERROR]: '\x1b[31m', // Red
        [LogLevel.FATAL]: '\x1b[35m', // Magenta
        RESET: '\x1b[0m'
    };

    private constructor() {
        this.eventBus = EventBus.getInstance();
    }

    /**
     * Get the singleton instance of the logger
     */
    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    public initialize(config?: LoggerConfig): void {
        if (this.initialized) {
            throw LoggerError.alreadyInitialized();
        }

        if (this.disposed) {
            throw LoggerError.disposed();
        }

        // Merge provided config with defaults
        this.config = {
            ...this.config,
            ...config
        };

        // Validate config
        if (this.config.maxEntries !== undefined && this.config.maxEntries < 1) {
            throw LoggerError.invalidConfig('maxEntries must be greater than 0');
        }

        // Initialize file logging if enabled
        if (this.config.file?.enabled) {
            try {
                const dir = path.dirname(this.config.file.path);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                this.fileStream = fs.createWriteStream(this.config.file.path, { flags: 'a' });
            } catch (error) {
                throw LoggerError.fileError('Failed to create log file', error as Error);
            }
        }

        this.initialized = true;
    }

    public debug(message: string, context?: Record<string, unknown>, tags?: string[]): void {
        this.log(LogLevel.DEBUG, message, undefined, context, tags);
    }

    public info(message: string, context?: Record<string, unknown>, tags?: string[]): void {
        this.log(LogLevel.INFO, message, undefined, context, tags);
    }

    public warn(message: string, context?: Record<string, unknown>, tags?: string[]): void {
        this.log(LogLevel.WARN, message, undefined, context, tags);
    }

    public error(message: string, error?: Error, context?: Record<string, unknown>, tags?: string[]): void {
        this.log(LogLevel.ERROR, message, error, context, tags);
    }

    public fatal(message: string, error?: Error, context?: Record<string, unknown>, tags?: string[]): void {
        this.log(LogLevel.FATAL, message, error, context, tags);
    }

    public getEntries(): LogEntry[] {
        this.ensureInitialized();
        return [...this.entries];
    }

    public getFilteredEntries(filter: {
        level?: LogLevel;
        tags?: string[];
        startTime?: number;
        endTime?: number;
        search?: string;
    }): LogEntry[] {
        this.ensureInitialized();

        return this.entries.filter(entry => {
            if (filter.level && entry.level !== filter.level) return false;
            if (filter.tags && !filter.tags.every(tag => entry.tags?.includes(tag))) return false;
            if (filter.startTime && entry.timestamp < filter.startTime) return false;
            if (filter.endTime && entry.timestamp > filter.endTime) return false;
            if (filter.search) {
                const searchLower = filter.search.toLowerCase();
                return entry.message.toLowerCase().includes(searchLower) ||
                    entry.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
                    entry.error?.message.toLowerCase().includes(searchLower);
            }
            return true;
        });
    }

    public clear(): void {
        this.ensureInitialized();
        this.entries = [];
        if (this.config.emitEvents) {
            this.eventBus.emit('log:cleared', { timestamp: Date.now() });
        }
    }

    public dispose(): void {
        if (this.disposed) {
            return;
        }

        if (this.fileStream) {
            this.fileStream.end();
            this.fileStream = null;
        }

        if (this.config.emitEvents) {
            this.eventBus.emit('log:disposed', { timestamp: Date.now() });
        }

        this.entries = [];
        this.initialized = false;
        this.disposed = true;
    }

    private log(
        level: LogLevel,
        message: string,
        error?: Error,
        context?: Record<string, unknown>,
        tags?: string[]
    ): void {
        this.ensureInitialized();

        // Check minimum log level
        if (this.isLevelEnabled(level)) {
            const entry: LogEntry = {
                level,
                message,
                timestamp: Date.now(),
                context,
                error,
                tags,
                stackTrace: error && this.config.includeStackTraces ? error.stack : undefined
            };

            // Add to entries
            this.addEntry(entry);

            // Format and output
            this.outputEntry(entry);

            // Emit event
            if (this.config.emitEvents) {
                this.eventBus.emit('log:entry', entry);
            }
        }
    }

    private addEntry(entry: LogEntry): void {
        this.entries.push(entry);

        // Trim if needed
        if (this.config.maxEntries && this.entries.length > this.config.maxEntries) {
            this.entries = this.entries.slice(-this.config.maxEntries);
        }
    }

    private outputEntry(entry: LogEntry): void {
        try {
            const formatted = this.formatEntry(entry);

            // Console output
            if (this.config.console?.enabled) {
                const color = this.config.console.colors ? this.CONSOLE_COLORS[entry.level] : '';
                const reset = this.config.console.colors ? this.CONSOLE_COLORS.RESET : '';
                console.log(`${color}${formatted}${reset}`);
            }

            // File output
            if (this.fileStream) {
                this.fileStream.write(formatted + '\n');
            }
        } catch (error) {
            if (this.config.emitEvents) {
                this.eventBus.emit('log:error', {
                    error: LoggerError.formatterError(error as Error),
                    context: { entry }
                });
            }
        }
    }

    private formatEntry(entry: LogEntry): string {
        if (this.config.formatter) {
            return this.config.formatter(entry);
        }

        const timestamp = this.config.includeTimestamps ? `[${new Date(entry.timestamp).toISOString()}] ` : '';
        const level = `[${entry.level.toUpperCase()}] `;
        const tags = entry.tags?.length ? `[${entry.tags.join(', ')}] ` : '';
        const context = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
        const error = entry.error ? `\nError: ${entry.error.message}` : '';
        const stack = entry.stackTrace ? `\nStack: ${entry.stackTrace}` : '';

        return `${timestamp}${level}${tags}${entry.message}${context}${error}${stack}`;
    }

    private isLevelEnabled(level: LogLevel): boolean {
        const levels = Object.values(LogLevel);
        const minIndex = levels.indexOf(this.config.minLevel || LogLevel.INFO);
        const currentIndex = levels.indexOf(level);
        return currentIndex >= minIndex;
    }

    private ensureInitialized(): void {
        if (!this.initialized) {
            throw LoggerError.notInitialized();
        }
        if (this.disposed) {
            throw LoggerError.disposed();
        }
    }
} 