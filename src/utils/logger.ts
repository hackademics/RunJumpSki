/**
* Log level enumeration
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
interface LoggerConfig {
    /**
     * Minimum log level to output
     */
    level: LogLevel;

    /**
     * Whether to include timestamps in logs
     */
    timestamps: boolean;

    /**
     * Whether to output to console
     */
    console: boolean;

    /**
     * Custom log handler
     */
    handler?: (level: LogLevel, source: string, message: string, data?: any) => void;
}

/**
 * Default logger configuration
 */
const defaultConfig: LoggerConfig = {
    level: LogLevel.INFO,
    timestamps: true,
    console: true
};

/**
 * Current global logger configuration
 */
let globalConfig: LoggerConfig = { ...defaultConfig };

/**
 * Utility for consistent logging
 */
export class Logger {
    private source: string;

    /**
     * Create a new logger
     * @param source Source identifier for this logger
     */
    constructor(source: string) {
        this.source = source;
    }

    /**
     * Log a debug message
     * @param message Log message
     * @param data Optional data to log
     */
    public debug(message: string, data?: any): void {
        this.log(LogLevel.DEBUG, message, data);
    }

    /**
     * Log an info message
     * @param message Log message
     * @param data Optional data to log
     */
    public info(message: string, data?: any): void {
        this.log(LogLevel.INFO, message, data);
    }

    /**
     * Log a warning message
     * @param message Log message
     * @param data Optional data to log
     */
    public warn(message: string, data?: any): void {
        this.log(LogLevel.WARN, message, data);
    }

    /**
     * Log an error message
     * @param message Log message
     * @param error Optional error to log
     */
    public error(message: string, error?: any): void {
        this.log(LogLevel.ERROR, message, error);
    }

    /**
     * Log a message with specific level
     * @param level Log level
     * @param message Log message
     * @param data Optional data to log
     */
    private log(level: LogLevel, message: string, data?: any): void {
        if (level < globalConfig.level) {
            return;
        }

        // Format message
        let formattedMessage = `[${this.source}] ${message}`;

        // Add timestamp if configured
        if (globalConfig.timestamps) {
            const timestamp = new Date().toISOString();
            formattedMessage = `[${timestamp}] ${formattedMessage}`;
        }

        // Use custom handler if available
        if (globalConfig.handler) {
            globalConfig.handler(level, this.source, message, data);
            return;
        }

        // Console logging if enabled
        if (globalConfig.console) {
            switch (level) {
                case LogLevel.DEBUG:
                    console.debug(formattedMessage, data);
                    break;
                case LogLevel.INFO:
                    console.info(formattedMessage, data);
                    break;
                case LogLevel.WARN:
                    console.warn(formattedMessage, data);
                    break;
                case LogLevel.ERROR:
                    console.error(formattedMessage, data);
                    break;
            }
        }
    }

    /**
     * Configure global logger settings
     * @param config Logger configuration
     */
    public static configure(config: Partial<LoggerConfig>): void {
        globalConfig = { ...globalConfig, ...config };
    }

    /**
     * Set global minimum log level
     * @param level Minimum log level
     */
    public static setLevel(level: LogLevel): void {
        globalConfig.level = level;
    }

    /**
     * Enable or disable console output
     * @param enabled Whether console output is enabled
     */
    public static enableConsole(enabled: boolean): void {
        globalConfig.console = enabled;
    }

    /**
     * Enable or disable timestamps
     * @param enabled Whether timestamps are enabled
     */
    public static enableTimestamps(enabled: boolean): void {
        globalConfig.timestamps = enabled;
    }

    /**
     * Set custom log handler
     * @param handler Custom log handler function
     */
    public static setHandler(handler: (level: LogLevel, source: string, message: string, data?: any) => void): void {
        globalConfig.handler = handler;
    }

    /**
     * Reset to default configuration
     */
    public static resetConfig(): void {
        globalConfig = { ...defaultConfig };
    }
}
