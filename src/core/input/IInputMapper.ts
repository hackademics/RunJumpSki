/**
 * @file src/core/input/IInputMapper.ts
 * @description Interface for mapping raw input keys to game actions.
 */

export interface IInputBindingConfig {
  key: string;
  action: string;
  context?: string;
  isHoldable?: boolean;  // Whether action can be triggered by holding (vs just pressing)
  isRepeatable?: boolean; // Whether action repeats while held
  isAxisControl?: boolean; // Whether this is an axis control (like mouse movement)
  isInverted?: boolean;   // For axis controls, whether axis is inverted
  sensitivity?: number;   // For axis controls, sensitivity multiplier
}

export interface IInputMapper {
  /**
   * Retrieves the game action associated with a given key.
   * @param key - The key to map.
   * @param context - Optional context for contextual bindings
   * @returns The action string if mapped; otherwise, null.
   */
  getActionForKey(key: string, context?: string): string | null;

  /**
   * Sets or updates the mapping from a key to a game action.
   * @param key - The key to map.
   * @param action - The game action to assign.
   * @param context - Optional context for contextual bindings
   */
  setMapping(key: string, action: string, context?: string): void;
  
  /**
   * Sets a detailed input binding configuration
   * @param config - The binding configuration object
   */
  setBindingConfig(config: IInputBindingConfig): void;
  
  /**
   * Gets the full binding configuration for a key
   * @param key - The key to retrieve configuration for
   * @param context - Optional context for contextual bindings
   * @returns The binding configuration if found; otherwise, null
   */
  getBindingConfig(key: string, context?: string): IInputBindingConfig | null;
  
  /**
   * Clears all key mappings
   * @param context - Optional context to clear; if not provided, clears all contexts
   */
  clearMappings(context?: string): void;
  
  /**
   * Resets mappings to default values
   * @param context - Optional context to reset; if not provided, resets all contexts
   */
  resetToDefaults(context?: string): void;
  
  /**
   * Gets all key mappings for a specific action
   * @param action - The action to find keys for
   * @param context - Optional context to search in
   * @returns Array of keys mapped to the action
   */
  getKeysForAction(action: string, context?: string): string[];
  
  /**
   * Sets the current active context for input mapping
   * @param context - The context to activate
   */
  setActiveContext(context: string): void;
  
  /**
   * Gets the current active context
   * @returns The current active context
   */
  getActiveContext(): string;
  
  /**
   * Checks if a key binding is holdable (can be held down)
   * @param key - The key to check
   * @param context - Optional context
   * @returns True if the binding is holdable
   */
  isHoldable(key: string, context?: string): boolean;
  
  /**
   * Checks if a key binding is repeatable (repeats while held)
   * @param key - The key to check
   * @param context - Optional context
   * @returns True if the binding is repeatable
   */
  isRepeatable(key: string, context?: string): boolean;
}
  