/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Simple logger for game components
 */
export class Logger {
    private static logLevel: LogLevel = 'info';
    private context: string;
    
    /**
     * Create a new logger
     * @param context Context name for this logger
     */
    constructor(context: string) {
        this.context = context;
    }
    
    /**
     * Set the global log level
     */
    public static setGlobalLevel(level: LogLevel): void {
        Logger.logLevel = level;
    }
    
    /**
     * Set the log level for this logger
     */
    public setLevel(level: LogLevel): void {
        // This is a placeholder for future per-logger levels
        // Currently, it only sets the global level
        Logger.setGlobalLevel(level);
    }
    
    /**
     * Log a debug message
     */
    public debug(message: string, ...args: any[]): void {
        if (this.shouldLog('debug')) {
            console.debug([] , ...args);
        }
    }
    
    /**
     * Log an info message
     */
    public info(message: string, ...args: any[]): void {
        if (this.shouldLog('info')) {
            console.info([] , ...args);
        }
    }
    
    /**
     * Log a warning message
     */
    public warn(message: string, ...args: any[]): void {
        if (this.shouldLog('warn')) {
            console.warn([] , ...args);
        }
    }
    
    /**
     * Log an error message
     */
    public error(message: string, ...args: any[]): void {
        if (this.shouldLog('error')) {
            console.error([] , ...args);
        }
    }
    
    /**
     * Check if a log level should be displayed
     */
    private shouldLog(level: LogLevel): boolean {
        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
        const currentLevel = levels.indexOf(Logger.logLevel);
        const requestedLevel = levels.indexOf(level);
        
        return requestedLevel >= currentLevel;
    }
}
