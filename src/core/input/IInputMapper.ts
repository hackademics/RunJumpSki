/**
 * @file src/core/input/IInputMapper.ts
 * @description Interface for mapping raw input keys to game actions.
 */

export interface IInputMapper {
    /**
     * Retrieves the game action associated with a given key.
     * @param key - The key to map.
     * @returns The action string if mapped; otherwise, null.
     */
    getActionForKey(key: string): string | null;
  
    /**
     * Sets or updates the mapping from a key to a game action.
     * @param key - The key to map.
     * @param action - The game action to assign.
     */
    setMapping(key: string, action: string): void;
  }
  