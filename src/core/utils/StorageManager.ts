/**
 * @file src/core/utils/StorageManager.ts
 * @description Abstract storage interface for browser persistence
 */

/**
 * Interface for storage adapters
 */
export interface IStorageAdapter {
    /**
     * Saves a value to storage
     * @param key Storage key
     * @param value Value to store (will be JSON stringified)
     * @returns True if successful, false otherwise
     */
    save<T>(key: string, value: T): boolean;
    
    /**
     * Loads a value from storage
     * @param key Storage key
     * @param defaultValue Default value if key not found
     * @returns The stored value, or defaultValue if not found
     */
    load<T>(key: string, defaultValue?: T): T | null;
    
    /**
     * Removes a value from storage
     * @param key Storage key
     * @returns True if successful, false otherwise
     */
    remove(key: string): boolean;
    
    /**
     * Checks if a key exists in storage
     * @param key Storage key
     * @returns True if exists, false otherwise
     */
    exists(key: string): boolean;
    
    /**
     * Clears all storage
     * @returns True if successful, false otherwise
     */
    clear(): boolean;
}

/**
 * Abstract storage manager that uses a storage adapter
 */
export abstract class StorageManager {
    protected adapter: IStorageAdapter;
    protected prefix: string;
    
    /**
     * Creates a new StorageManager
     * @param adapter Storage adapter implementation
     * @param prefix Optional key prefix for namespace isolation
     */
    constructor(adapter: IStorageAdapter, prefix: string = '') {
        this.adapter = adapter;
        this.prefix = prefix;
    }
    
    /**
     * Gets the prefixed key
     * @param key The base key
     * @returns The prefixed key
     */
    protected getKey(key: string): string {
        return this.prefix ? `${this.prefix}.${key}` : key;
    }
    
    /**
     * Saves a value to storage
     * @param key Storage key
     * @param value Value to store
     * @returns True if successful, false otherwise
     */
    public save<T>(key: string, value: T): boolean {
        return this.adapter.save(this.getKey(key), value);
    }
    
    /**
     * Loads a value from storage
     * @param key Storage key
     * @param defaultValue Default value if key not found
     * @returns The stored value, or defaultValue if not found
     */
    public load<T>(key: string, defaultValue?: T): T | null {
        return this.adapter.load(this.getKey(key), defaultValue);
    }
    
    /**
     * Removes a value from storage
     * @param key Storage key
     * @returns True if successful, false otherwise
     */
    public remove(key: string): boolean {
        return this.adapter.remove(this.getKey(key));
    }
    
    /**
     * Checks if a key exists in storage
     * @param key Storage key
     * @returns True if exists, false otherwise
     */
    public exists(key: string): boolean {
        return this.adapter.exists(this.getKey(key));
    }
    
    /**
     * Clears all storage with this prefix
     * @returns True if successful, false otherwise
     */
    public abstract clear(): boolean;
} 