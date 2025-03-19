/**
 * @file src/game/input/GameInputMapper.ts
 * @description Game-specific input mapper that extends the core InputMapper
 */

import { InputMapper } from "../../core/input/InputMapper";
import { IInputBindingConfig } from "../../core/input/IInputMapper";
import { GameInputActions } from "./GameInputActions";

// Define input contexts for the game
export enum InputContext {
    DEFAULT = "default",
    GAMEPLAY = "gameplay",
    MENU = "menu",
    CONTROLS_CONFIG = "controls_config"
}

/**
 * GameInputMapper extends the core InputMapper with game-specific functionality
 */
export class GameInputMapper extends InputMapper {
    private contextBindings: Map<string, Map<string, IInputBindingConfig>>;

    constructor() {
        super();
        this.activeContext = InputContext.DEFAULT;
        this.contextBindings = new Map<string, Map<string, IInputBindingConfig>>();
        
        // Initialize contexts
        this.initializeContext(InputContext.DEFAULT);
        this.initializeContext(InputContext.GAMEPLAY);
        this.initializeContext(InputContext.MENU);
        this.initializeContext(InputContext.CONTROLS_CONFIG);
        
        // Set up default bindings
        this.setupDefaultBindings();
    }

    /**
     * Initialize a context with empty bindings
     */
    private initializeContext(context: string): void {
        if (!this.contextBindings.has(context)) {
            this.contextBindings.set(context, new Map<string, IInputBindingConfig>());
        }
    }

    /**
     * Set up the default game control bindings
     */
    private setupDefaultBindings(): void {
        // Default movement bindings
        this.setBindingConfig({
            key: "w",
            action: GameInputActions.MOVE_FORWARD,
            context: InputContext.GAMEPLAY,
            isHoldable: true,
            isRepeatable: true
        });

        this.setBindingConfig({
            key: "s",
            action: GameInputActions.MOVE_BACKWARD,
            context: InputContext.GAMEPLAY,
            isHoldable: true,
            isRepeatable: true
        });

        this.setBindingConfig({
            key: "a",
            action: GameInputActions.STRAFE_LEFT,
            context: InputContext.GAMEPLAY,
            isHoldable: true,
            isRepeatable: true
        });

        this.setBindingConfig({
            key: "d",
            action: GameInputActions.STRAFE_RIGHT,
            context: InputContext.GAMEPLAY,
            isHoldable: true,
            isRepeatable: true
        });

        // Jump and Ski
        this.setBindingConfig({
            key: " ", // space
            action: GameInputActions.JUMP,
            context: InputContext.GAMEPLAY,
            isHoldable: true,
            isRepeatable: false
        });

        this.setBindingConfig({
            key: " ", // space (held)
            action: GameInputActions.SKI,
            context: InputContext.GAMEPLAY,
            isHoldable: true,
            isRepeatable: false
        });

        // Jetpack
        this.setBindingConfig({
            key: "MouseRight",
            action: GameInputActions.JETPACK,
            context: InputContext.GAMEPLAY,
            isHoldable: true,
            isRepeatable: false
        });

        // Weapons
        this.setBindingConfig({
            key: "MouseLeft",
            action: GameInputActions.FIRE_SPINFUSOR,
            context: InputContext.GAMEPLAY,
            isHoldable: false,
            isRepeatable: false
        });

        this.setBindingConfig({
            key: "g",
            action: GameInputActions.THROW_GRENADE,
            context: InputContext.GAMEPLAY,
            isHoldable: false,
            isRepeatable: false
        });

        // Camera/Aim
        this.setBindingConfig({
            key: "MouseX",
            action: GameInputActions.LOOK_X,
            context: InputContext.GAMEPLAY,
            isAxisControl: true,
            sensitivity: 1.0
        });

        this.setBindingConfig({
            key: "MouseY",
            action: GameInputActions.LOOK_Y,
            context: InputContext.GAMEPLAY,
            isAxisControl: true,
            isInverted: false,
            sensitivity: 1.0
        });

        // UI Controls
        this.setBindingConfig({
            key: "Escape",
            action: GameInputActions.PAUSE_GAME,
            context: InputContext.GAMEPLAY,
            isHoldable: false
        });

        this.setBindingConfig({
            key: "Tab",
            action: GameInputActions.OPEN_SCOREBOARD,
            context: InputContext.GAMEPLAY,
            isHoldable: true
        });

        // Special actions
        this.setBindingConfig({
            key: "r",
            action: GameInputActions.RESTART_RUN,
            context: InputContext.GAMEPLAY,
            isHoldable: false
        });
    }

    /**
     * Retrieves the game action for a key in the current or specified context
     */
    public getActionForKey(key: string, context?: string): string | null {
        const contextToUse = context || this.activeContext;
        
        // First check the specific context
        const contextBindings = this.contextBindings.get(contextToUse);
        if (contextBindings && contextBindings.has(key)) {
            return contextBindings.get(key)!.action;
        }
        
        // Then check the default context if we're not already checking it
        if (contextToUse !== InputContext.DEFAULT) {
            const defaultBindings = this.contextBindings.get(InputContext.DEFAULT);
            if (defaultBindings && defaultBindings.has(key)) {
                return defaultBindings.get(key)!.action;
            }
        }
        
        // Fall back to the parent implementation
        return super.getActionForKey(key);
    }

    /**
     * Sets a key mapping in the specified or current context
     */
    public setMapping(key: string, action: string, context?: string): void {
        const contextToUse = context || this.activeContext;
        
        // Ensure the context exists
        this.initializeContext(contextToUse);
        
        // Create a basic binding config
        const bindingConfig: IInputBindingConfig = {
            key,
            action,
            context: contextToUse
        };
        
        // Set in the context bindings
        const contextBindings = this.contextBindings.get(contextToUse)!;
        contextBindings.set(key, bindingConfig);
    }

    /**
     * Sets a detailed binding configuration
     */
    public setBindingConfig(config: IInputBindingConfig): void {
        const contextToUse = config.context || this.activeContext;
        
        // Ensure the context exists
        this.initializeContext(contextToUse);
        
        // Set in the context bindings
        const contextBindings = this.contextBindings.get(contextToUse)!;
        contextBindings.set(config.key, config);
    }

    /**
     * Gets the full binding configuration for a key
     */
    public getBindingConfig(key: string, context?: string): IInputBindingConfig | null {
        const contextToUse = context || this.activeContext;
        
        // Check the specified context
        const contextBindings = this.contextBindings.get(contextToUse);
        if (contextBindings && contextBindings.has(key)) {
            return contextBindings.get(key)!;
        }
        
        // Check the default context if not already checking it
        if (contextToUse !== InputContext.DEFAULT) {
            const defaultBindings = this.contextBindings.get(InputContext.DEFAULT);
            if (defaultBindings && defaultBindings.has(key)) {
                return defaultBindings.get(key)!;
            }
        }
        
        return null;
    }

    /**
     * Clears all key mappings for a context
     */
    public clearMappings(context?: string): void {
        if (context) {
            // Clear a specific context
            this.contextBindings.set(context, new Map<string, IInputBindingConfig>());
        } else {
            // Clear all contexts
            this.contextBindings.clear();
            this.initializeContext(InputContext.DEFAULT);
            this.initializeContext(InputContext.GAMEPLAY);
            this.initializeContext(InputContext.MENU);
            this.initializeContext(InputContext.CONTROLS_CONFIG);
        }
    }

    /**
     * Resets mappings to default values
     */
    public resetToDefaults(context?: string): void {
        // If a specific context, only reset that one
        if (context) {
            this.contextBindings.set(context, new Map<string, IInputBindingConfig>());
            this.initializeContext(context);
        } else {
            // Otherwise reset everything
            this.clearMappings();
        }
        
        // Re-initialize the default bindings
        this.setupDefaultBindings();
    }

    /**
     * Resolves the context to use
     * @param context Optional context
     * @returns The resolved context
     */
    private resolveContext(context?: string): string {
        return context || this.activeContext;
    }

    /**
     * Gets all key mappings for a specific action
     * @param action - The action to find keys for
     * @param context - Optional context to search in
     * @returns Array of keys mapped to the action
     */
    public getKeysForAction(action: string, context?: string): string[] {
        const keys: string[] = [];
        const resolvedContext = this.resolveContext(context);
        
        // Get bindings for the specified context
        const contextBindings = this.contextBindings.get(resolvedContext);
        if (contextBindings) {
            // Use Array.from to convert Map entries to an array for compatibility
            Array.from(contextBindings.entries()).forEach(([key, config]) => {
                if (config.action === action) {
                    keys.push(key);
                }
            });
        }
        
        // If no context specified, or nothing found in the context,
        // fall back to default context
        if ((!context || keys.length === 0) && resolvedContext !== InputContext.DEFAULT) {
            const defaultBindings = this.contextBindings.get(InputContext.DEFAULT);
            if (defaultBindings) {
                // Use Array.from to convert Map entries to an array for compatibility
                Array.from(defaultBindings.entries()).forEach(([key, config]) => {
                    if (config.action === action) {
                        keys.push(key);
                    }
                });
            }
        }
        
        return keys;
    }

    /**
     * Checks if a key binding is holdable
     */
    public isHoldable(key: string, context?: string): boolean {
        const bindingConfig = this.getBindingConfig(key, context);
        return bindingConfig ? !!bindingConfig.isHoldable : false;
    }

    /**
     * Checks if a key binding is repeatable
     */
    public isRepeatable(key: string, context?: string): boolean {
        const bindingConfig = this.getBindingConfig(key, context);
        return bindingConfig ? !!bindingConfig.isRepeatable : false;
    }
} 