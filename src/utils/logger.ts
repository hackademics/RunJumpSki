/**
 * Logger.ts
 * Utility for logging messages with different levels
 */

/**
 * Log levels
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
    /**
     * Minimum log level to display
     */
    minLevel: LogLevel;
    
    /**
     * Whether to include timestamps in log messages
     */
    showTimestamp: boolean;
    
    /**
     * Whether to include the logger name in log messages
     */
    showLoggerName: boolean;
}

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
    minLevel: LogLevel.DEBUG,
    showTimestamp: true,
    showLoggerName: true
};

/**
 * Global logger configuration
 */
let globalConfig: LoggerConfig = { ...DEFAULT_CONFIG };

/**
 * Set the global logger configuration
 * @param config New configuration
 */
export function setLoggerConfig(config: Partial<LoggerConfig>): void {
    globalConfig = { ...globalConfig, ...config };
}

/**
 * Reset the global logger configuration to defaults
 */
export function resetLoggerConfig(): void {
    globalConfig = { ...DEFAULT_CONFIG };
}

/**
 * Logger class for logging messages with different levels
 */
export class Logger {
    /**
     * Name of the logger
     */
    private name: string;
    
    /**
     * Configuration for this logger
     */
    private config: LoggerConfig;
    
    /**
     * Creates a new logger
     * @param name Name of the logger
     * @param config Configuration for this logger (overrides global config)
     */
    constructor(name: string, config?: Partial<LoggerConfig>) {
        this.name = name;
        this.config = { ...globalConfig, ...config };
    }
    
    /**
     * Log a debug message
     * @param message Message to log
     * @param data Additional data to log
     */
    public debug(message: string, ...data: any[]): void {
        this.log(LogLevel.DEBUG, message, data);
    }
    
    /**
     * Log an info message
     * @param message Message to log
     * @param data Additional data to log
     */
    public info(message: string, ...data: any[]): void {
        this.log(LogLevel.INFO, message, data);
    }
    
    /**
     * Log a warning message
     * @param message Message to log
     * @param data Additional data to log
     */
    public warn(message: string, ...data: any[]): void {
        this.log(LogLevel.WARN, message, data);
    }
    
    /**
     * Log an error message
     * @param message Message to log
     * @param data Additional data to log
     */
    public error(message: string, ...data: any[]): void {
        this.log(LogLevel.ERROR, message, data);
    }
    
    /**
     * Log a message with the specified level
     * @param level Log level
     * @param message Message to log
     * @param data Additional data to log
     */
    private log(level: LogLevel, message: string, data: any[]): void {
        if (level < this.config.minLevel) {
            return;
        }
        
        const timestamp = this.config.showTimestamp ? `[${new Date().toISOString()}]` : '';
        const loggerName = this.config.showLoggerName ? `[${this.name}]` : '';
        const levelStr = LogLevel[level];
        
        const prefix = `${timestamp}${loggerName}[${levelStr}]`;
        
        switch (level) {
            case LogLevel.DEBUG:
                console.debug(prefix, message, ...data);
                break;
            case LogLevel.INFO:
                console.info(prefix, message, ...data);
                break;
            case LogLevel.WARN:
                console.warn(prefix, message, ...data);
                break;
            case LogLevel.ERROR:
                console.error(prefix, message, ...data);
                break;
        }
    }
}
