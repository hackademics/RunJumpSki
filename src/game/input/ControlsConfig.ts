/**
 * @file src/game/input/ControlsConfig.ts
 * @description Implementation of the default control configuration
 */

import { 
    IControlsConfig, 
    IControlBinding, 
    IControlCategory,
    ControlCategory,
    DEFAULT_CATEGORY_NAMES,
    DEFAULT_BINDINGS
} from "./IControlsConfig";
import { GameInputActions } from "./GameInputActions";
import { InputActionCategory, ACTION_CATEGORIES } from "./GameInputActions";
import { Logger } from "../../core/utils/Logger";
import { ServiceLocator } from "../../core/base/ServiceLocator";

/**
 * Default implementation of the controls configuration
 */
export class ControlsConfig implements IControlsConfig {
    public id: string;
    public name: string;
    public categories: IControlCategory[];
    public isDefault: boolean;
    public mouseSensitivity: number;
    public invertYAxis: boolean;
    
    private bindings: Map<string, IControlBinding>;
    private logger: Logger;
    
    /**
     * Creates a new ControlsConfig with default settings
     * @param id Optional identifier (defaults to 'default')
     * @param name Optional name (defaults to 'Default Controls')
     */
    constructor(id: string = 'default', name: string = 'Default Controls') {
        this.id = id;
        this.name = name;
        this.isDefault = id === 'default';
        this.mouseSensitivity = 1.0;
        this.invertYAxis = false;
        this.bindings = new Map<string, IControlBinding>();
        this.categories = [];
        
        // Initialize logger with default instance
        this.logger = new Logger('ControlsConfig');
        
        // Try to get the logger from ServiceLocator
        try {
            const serviceLocator = ServiceLocator.getInstance();
            if (serviceLocator.has('logger')) {
                this.logger = serviceLocator.get<Logger>('logger');
                // Add context tag
                this.logger.addTag('ControlsConfig');
            }
        } catch (e) {
            this.logger.warn(`Failed to get logger from ServiceLocator: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
        
        this.logger.debug(`Creating controls configuration: ${id}`);
        
        // Setup the controls
        this.resetToDefaults();
    }
    
    /**
     * Gets a binding for a specific action
     * @param action The action to find a binding for
     * @returns The binding or null if not found
     */
    public getBindingForAction(action: string): IControlBinding | null {
        return this.bindings.get(action) || null;
    }
    
    /**
     * Gets all bindings for a specific action
     * @param action The action to find bindings for
     * @returns Array of bindings for the action
     */
    public getAllBindingsForAction(action: string): IControlBinding[] {
        const result: IControlBinding[] = [];
        const binding = this.bindings.get(action);
        if (binding) {
            result.push(binding);
        }
        return result;
    }
    
    /**
     * Updates a binding for an action
     * @param action The action to update
     * @param key The new key to bind
     * @returns True if successful, false otherwise
     */
    public updateBinding(action: string, key: string): boolean {
        const binding = this.bindings.get(action);
        if (binding && binding.canRebind) {
            binding.key = key;
            return true;
        }
        return false;
    }
    
    /**
     * Resets all bindings to their default values
     */
    public resetToDefaults(): void {
        // Clear existing bindings
        this.bindings.clear();
        this.categories = [];
        
        // Set up the default bindings
        for (const action in DEFAULT_BINDINGS) {
            const binding = { ...DEFAULT_BINDINGS[action as GameInputActions] };
            this.bindings.set(action, binding);
        }
        
        // Organize by categories
        this.organizeCategories();
        
        // Reset mouse settings
        this.mouseSensitivity = 1.0;
        this.invertYAxis = false;
    }
    
    /**
     * Organize bindings into categories
     */
    private organizeCategories(): void {
        // Create category maps
        const categoryMaps: Record<string, IControlBinding[]> = {};
        for (const category of Object.values(ControlCategory)) {
            categoryMaps[category] = [];
        }
        
        // Add bindings to appropriate categories
        // Use Array.from to convert Map entries to an array for compatibility
        Array.from(this.bindings.entries()).forEach(([action, binding]) => {
            const actionEnum = action as GameInputActions;
            const category = this.getCategoryForAction(actionEnum);
            if (category) {
                categoryMaps[category].push(binding);
            }
        });
        
        // Create categories
        this.categories = Object.entries(categoryMaps).map(([id, bindings]) => ({
            id,
            name: DEFAULT_CATEGORY_NAMES[id as ControlCategory] || id,
            bindings
        }));
    }
    
    /**
     * Gets the category for an action
     * @param action The action to find the category for
     * @returns The category ID or null if not found
     */
    private getCategoryForAction(action: GameInputActions): string | null {
        const category = ACTION_CATEGORIES[action];
        
        switch (category) {
            case InputActionCategory.MOVEMENT:
                return ControlCategory.MOVEMENT;
            case InputActionCategory.WEAPONS:
                return ControlCategory.WEAPONS;
            case InputActionCategory.CAMERA:
                return ControlCategory.CAMERA;
            case InputActionCategory.INTERFACE:
                return ControlCategory.INTERFACE;
            default:
                return null;
        }
    }
    
    /**
     * Exports the configuration to a serializable object
     * @returns The serialized configuration
     */
    public export(): object {
        const bindingsObj: Record<string, any> = {};
        
        // Use Array.from to convert Map entries to an array for compatibility
        Array.from(this.bindings.entries()).forEach(([action, binding]) => {
            bindingsObj[action] = {
                key: binding.key,
                isHoldable: binding.isHoldable,
                isRepeatable: binding.isRepeatable,
                sensitivity: binding.sensitivity,
                isInverted: binding.isInverted,
                isAxisControl: binding.isAxisControl
            };
        });
        
        return {
            id: this.id,
            name: this.name,
            bindings: bindingsObj,
            mouseSensitivity: this.mouseSensitivity,
            invertYAxis: this.invertYAxis
        };
    }
    
    /**
     * Imports a serialized configuration
     * @param data The serialized configuration
     * @returns True if successful, false otherwise
     */
    public import(data: any): boolean {
        try {
            // Basic validation
            if (!data || typeof data !== 'object' || !data.bindings) {
                return false;
            }
            
            // Set basic properties
            if (data.id) this.id = data.id;
            if (data.name) this.name = data.name;
            if (typeof data.mouseSensitivity === 'number') this.mouseSensitivity = data.mouseSensitivity;
            if (typeof data.invertYAxis === 'boolean') this.invertYAxis = data.invertYAxis;
            
            // Import bindings
            for (const action in data.bindings) {
                const savedBinding = data.bindings[action];
                const currentBinding = this.bindings.get(action);
                
                // Only update if the binding exists and is rebindable
                if (currentBinding && (currentBinding.canRebind !== false)) {
                    currentBinding.key = savedBinding.key;
                    
                    // Copy additional properties if they exist
                    if (typeof savedBinding.isHoldable === 'boolean') currentBinding.isHoldable = savedBinding.isHoldable;
                    if (typeof savedBinding.isRepeatable === 'boolean') currentBinding.isRepeatable = savedBinding.isRepeatable;
                    if (typeof savedBinding.sensitivity === 'number') currentBinding.sensitivity = savedBinding.sensitivity;
                    if (typeof savedBinding.isInverted === 'boolean') currentBinding.isInverted = savedBinding.isInverted;
                    if (typeof savedBinding.isAxisControl === 'boolean') currentBinding.isAxisControl = savedBinding.isAxisControl;
                }
            }
            
            // Re-organize categories
            this.organizeCategories();
            
            this.logger.debug(`Successfully imported configuration: ${this.id}`);
            return true;
        } catch (e) {
            this.logger.error("Error importing controls configuration:", e instanceof Error ? e : String(e));
            return false;
        }
    }
} 