/**
 * @file src/core/input/IInputManager.ts
 * @description Interface for the InputManager, responsible for managing keyboard and mouse input state.
 */

export interface IInputManager {
    /**
     * Checks if a given key is currently pressed.
     * @param key - The key to check.
     * @returns True if the key is pressed; otherwise, false.
     */
    isKeyPressed(key: string): boolean;
  
    /**
     * Sets the pressed state for a key.
     * @param key - The key to update.
     * @param pressed - True if the key is pressed; otherwise, false.
     */
    setKeyState(key: string, pressed: boolean): void;
  
    /**
     * Gets the current mouse position.
     * @returns An object with x and y coordinates.
     */
    getMousePosition(): { x: number; y: number };
  
    /**
     * Updates the current mouse position.
     * @param x - The x-coordinate.
     * @param y - The y-coordinate.
     */
    setMousePosition(x: number, y: number): void;
  }
  