/**
 * @file src/game/input/ControlsManager.ts
 * @description Manages the loading, saving, and resetting of control configurations
 */

import { IControlsConfig } from "./IControlsConfig";
import { ControlsConfig } from "./ControlsConfig";
import { StorageManager, IStorageAdapter } from "../../core/utils/StorageManager";
import { GameInputMapper } from "./GameInputMapper";
import { InputEventType, createBindingChangeData } from "./InputEvents";
import { EventEmitter } from "../../core/events/EventEmitter";
import { Logger } from "../../core/utils/Logger";
import { ServiceLocator } from "../../core/base/ServiceLocator";

/**
 * Storage keys for controls
 */
export enum ControlsStorageKey {
    ACTIVE_CONFIG = "controls.activeConfig",
    CONFIGS = "controls.configs"
}

/**
 * Manages control configurations and persistence
 */
export class ControlsManager extends StorageManager {
    private configs: Map<string, IControlsConfig>;
    private activeConfig: IControlsConfig;
    private eventEmitter: EventEmitter;
    private gameInputMapper: GameInputMapper;
    private logger: Logger;
    
    /**
     * Creates a new ControlsManager
     * @param adapter Storage adapter to use
     * @param inputMapper Game input mapper to update
     * @param eventEmitter Event emitter for control change events
     */
    constructor(
        adapter: IStorageAdapter, 
        inputMapper: GameInputMapper,
        eventEmitter: EventEmitter
    ) {
        super(adapter, "game");
        this.gameInputMapper = inputMapper;
        this.eventEmitter = eventEmitter;
        this.configs = new Map<string, IControlsConfig>();
        
        // Initialize logger with default instance
        this.logger = new Logger('ControlsManager');
        
        // Try to get the logger from ServiceLocator
        try {
            const serviceLocator = ServiceLocator.getInstance();
            if (serviceLocator.has('logger')) {
                this.logger = serviceLocator.get<Logger>('logger');
                // Add context tag
                this.logger.addTag('ControlsManager');
            }
        } catch (e) {
            this.logger.warn(`Failed to get logger from ServiceLocator: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
        
        this.logger.debug('ControlsManager created');
        
        // Create default configuration
        const defaultConfig = new ControlsConfig();
        this.configs.set(defaultConfig.id, defaultConfig);
        this.activeConfig = defaultConfig;
        
        // Load saved configurations
        this.loadConfigurations();
    }
    
    /**
     * Gets the active controls configuration
     */
    public getActiveConfig(): IControlsConfig {
        return this.activeConfig;
    }
    
    /**
     * Sets the active controls configuration
     * @param configId ID of the configuration to activate
     * @returns True if successful, false if config not found
     */
    public setActiveConfig(configId: string): boolean {
        const config = this.configs.get(configId);
        if (!config) {
            return false;
        }
        
        this.activeConfig = config;
        this.applyConfigToInputMapper(config);
        this.save(ControlsStorageKey.ACTIVE_CONFIG, configId);
        
        return true;
    }
    
    /**
     * Gets a controls configuration by ID
     * @param configId ID of the configuration to get
     * @returns The configuration or null if not found
     */
    public getConfig(configId: string): IControlsConfig | null {
        return this.configs.get(configId) || null;
    }
    
    /**
     * Gets all available configurations
     */
    public getAllConfigs(): IControlsConfig[] {
        return Array.from(this.configs.values());
    }
    
    /**
     * Creates a new configuration
     * @param id ID for the new configuration
     * @param name Display name for the configuration
     * @param basedOn Optional ID of configuration to base on
     * @returns The new configuration
     */
    public createConfig(id: string, name: string, basedOn?: string): IControlsConfig {
        // If using a base, copy it
        if (basedOn && this.configs.has(basedOn)) {
            const baseConfig = this.configs.get(basedOn)!;
            const newConfig = new ControlsConfig(id, name);
            
            // Import the base config data
            const baseData = baseConfig.export();
            newConfig.import(baseData);
            
            // Add to configs
            this.configs.set(id, newConfig);
            this.saveConfigurations();
            
            return newConfig;
        }
        
        // Otherwise create from scratch
        const config = new ControlsConfig(id, name);
        this.configs.set(id, config);
        this.saveConfigurations();
        
        return config;
    }
    
    /**
     * Deletes a configuration
     * @param configId ID of the configuration to delete
     * @returns True if successful, false if config not found or is default
     */
    public deleteConfig(configId: string): boolean {
        const config = this.configs.get(configId);
        
        // Don't delete if it's the default or doesn't exist
        if (!config || config.isDefault) {
            return false;
        }
        
        // If deleting active config, switch to default
        if (this.activeConfig.id === configId) {
            this.setActiveConfig('default');
        }
        
        // Remove and save
        this.configs.delete(configId);
        this.saveConfigurations();
        
        return true;
    }
    
    /**
     * Updates a binding in the active configuration
     * @param action Action to rebind
     * @param key New key to bind
     * @returns True if successful
     */
    public updateBinding(action: string, key: string): boolean {
        const oldKey = this.activeConfig.getBindingForAction(action)?.key;
        
        // Update the binding
        if (this.activeConfig.updateBinding(action, key)) {
            // Apply to input mapper
            this.applyConfigToInputMapper(this.activeConfig);
            
            // Save configurations
            this.saveConfigurations();
            
            // Emit binding change event
            this.eventEmitter.emit(
                InputEventType.INPUT_BINDING_CHANGED, 
                createBindingChangeData(action, key, undefined, oldKey)
            );
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Resets the active configuration to defaults
     */
    public resetActiveConfig(): void {
        this.activeConfig.resetToDefaults();
        this.applyConfigToInputMapper(this.activeConfig);
        this.saveConfigurations();
    }
    
    /**
     * Loads saved configurations from storage
     */
    private loadConfigurations(): void {
        try {
            // Load the saved configs
            const savedConfigs = this.load<Record<string, object>>(ControlsStorageKey.CONFIGS, {});
            
            if (savedConfigs) {
                // Import each saved config
                for (const [id, configData] of Object.entries(savedConfigs)) {
                    // Skip if it's the default (we already have it)
                    if (id === 'default') {
                        const defaultConfig = this.configs.get('default')!;
                        defaultConfig.import(configData);
                        continue;
                    }
                    
                    // Create a new config from the saved data
                    const config = new ControlsConfig(id, id); // Temporary name
                    if (config.import(configData)) {
                        this.configs.set(id, config);
                    }
                }
            }
            
            // Load the active config
            const activeConfigId = this.load<string>(ControlsStorageKey.ACTIVE_CONFIG, 'default');
            if (activeConfigId && this.configs.has(activeConfigId)) {
                this.activeConfig = this.configs.get(activeConfigId)!;
            }
            
            // Apply to input mapper
            this.applyConfigToInputMapper(this.activeConfig);
            
            this.logger.debug(`Loaded ${this.configs.size} control configurations`);
            
        } catch (e) {
            this.logger.error("Error loading control configurations:", e instanceof Error ? e : String(e));
            // Fall back to defaults
            this.activeConfig = this.configs.get('default')!;
            this.applyConfigToInputMapper(this.activeConfig);
        }
    }
    
    /**
     * Saves all configurations to storage
     */
    private saveConfigurations(): void {
        const serializedConfigs: Record<string, any> = {};
        
        // Use Array.from to convert Map entries to an array for compatibility
        Array.from(this.configs.entries()).forEach(([id, config]) => {
            serializedConfigs[id] = config.export();
        });
        
        // Save to storage
        this.save(ControlsStorageKey.CONFIGS, serializedConfigs);
        this.save(ControlsStorageKey.ACTIVE_CONFIG, this.activeConfig.id);
    }
    
    /**
     * Applies a configuration to the input mapper
     * @param config Configuration to apply
     */
    private applyConfigToInputMapper(config: IControlsConfig): void {
        // Clear existing mappings
        this.gameInputMapper.clearMappings();
        
        // Apply all bindings from the config
        for (const category of config.categories) {
            for (const binding of category.bindings) {
                this.gameInputMapper.setBindingConfig({
                    key: binding.key,
                    action: binding.action,
                    isHoldable: binding.isHoldable,
                    isRepeatable: binding.isRepeatable,
                    isAxisControl: binding.isAxisControl,
                    isInverted: binding.isInverted,
                    sensitivity: binding.sensitivity
                });
            }
        }
    }
    
    /**
     * Clears all controls storage with this prefix
     */
    public clear(): boolean {
        const adapter = this.adapter as any;
        
        // Use clearWithPrefix if available
        if (adapter.clearWithPrefix && typeof adapter.clearWithPrefix === 'function') {
            return adapter.clearWithPrefix(this.prefix);
        }
        
        // Otherwise remove specific keys
        return this.remove(ControlsStorageKey.CONFIGS) && 
               this.remove(ControlsStorageKey.ACTIVE_CONFIG);
    }
} 