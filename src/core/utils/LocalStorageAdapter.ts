/**
 * @file src/core/utils/LocalStorageAdapter.ts
 * @description Implementation of IStorageAdapter using browser localStorage
 */

import { IStorageAdapter } from "./StorageManager";
import { Logger } from "./Logger";
import { ServiceLocator } from "../base/ServiceLocator";

/**
 * LocalStorageAdapter - Implements storage using browser's localStorage
 */
export class LocalStorageAdapter implements IStorageAdapter {
    private logger: Logger;
    
    /**
     * Creates a new LocalStorageAdapter
     */
    constructor() {
        // Initialize logger with default instance
        this.logger = new Logger('LocalStorageAdapter');
        
        // Try to get the logger from ServiceLocator
        try {
            const serviceLocator = ServiceLocator.getInstance();
            if (serviceLocator.has('logger')) {
                this.logger = serviceLocator.get<Logger>('logger');
                // Add context tag
                this.logger.addTag('LocalStorageAdapter');
            }
        } catch (e) {
            this.logger.warn(`Failed to get logger from ServiceLocator: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
        
        this.logger.debug('LocalStorageAdapter initialized');
    }
    
    /**
     * Saves a value to localStorage
     * @param key Storage key
     * @param value Value to store (will be JSON stringified)
     * @returns True if successful
     */
    public save<T>(key: string, value: T): boolean {
        try {
            const serialized = JSON.stringify(value);
            localStorage.setItem(key, serialized);
            return true;
        } catch (e) {
            this.logger.error(`Error saving to localStorage: ${key}`, e instanceof Error ? e : String(e));
            return false;
        }
    }
    
    /**
     * Loads a value from localStorage
     * @param key Storage key
     * @param defaultValue Default value if key not found
     * @returns The stored value, or defaultValue if not found
     */
    public load<T>(key: string, defaultValue?: T): T | null {
        try {
            const serialized = localStorage.getItem(key);
            if (serialized === null) {
                return defaultValue || null;
            }
            return JSON.parse(serialized) as T;
        } catch (e) {
            this.logger.error(`Error loading from localStorage: ${key}`, e instanceof Error ? e : String(e));
            return defaultValue || null;
        }
    }
    
    /**
     * Removes a value from localStorage
     * @param key Storage key
     * @returns True if successful
     */
    public remove(key: string): boolean {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            this.logger.error(`Error removing from localStorage: ${key}`, e instanceof Error ? e : String(e));
            return false;
        }
    }
    
    /**
     * Checks if a key exists in localStorage
     * @param key Storage key
     * @returns True if exists
     */
    public exists(key: string): boolean {
        return localStorage.getItem(key) !== null;
    }
    
    /**
     * Clears all localStorage
     * @returns True if successful
     */
    public clear(): boolean {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            this.logger.error("Error clearing localStorage", e instanceof Error ? e : String(e));
            return false;
        }
    }
    
    /**
     * Clears only keys with a specific prefix
     * @param prefix The prefix to filter keys by
     * @returns True if successful
     */
    public clearWithPrefix(prefix: string): boolean {
        try {
            const keysToRemove: string[] = [];
            
            // Find all keys with prefix
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    keysToRemove.push(key);
                }
            }
            
            // Remove keys
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            return true;
        } catch (e) {
            this.logger.error(`Error clearing localStorage with prefix: ${prefix}`, e instanceof Error ? e : String(e));
            return false;
        }
    }
} 