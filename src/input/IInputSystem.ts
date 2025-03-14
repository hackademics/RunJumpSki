/**
 * IInputSystem.ts
 * Interface for the input system
 */

import { Vector3 } from '../types/common/Vector3';

/**
 * Input action type
 */
export type InputActionType = 'pressed' | 'released' | 'held';

/**
 * Input action
 */
export interface InputAction {
    /**
     * Action name
     */
    name: string;
    
    /**
     * Action type
     */
    type: InputActionType;
    
    /**
     * Action value (0-1 for analog, 0 or 1 for digital)
     */
    value: number;
}

/**
 * Input system interface
 */
export interface IInputSystem {
    /**
     * Initialize the input system
     */
    init(): void;
    
    /**
     * Update the input system
     * @param deltaTime Time since last update in seconds
     */
    update(deltaTime: number): void;
    
    /**
     * Clean up the input system
     */
    dispose(): void;
    
    /**
     * Check if a key is currently pressed
     * @param key Key to check
     * @returns Whether the key is pressed
     */
    isKeyPressed(key: string): boolean;
    
    /**
     * Check if a key was just pressed this frame
     * @param key Key to check
     * @returns Whether the key was just pressed
     */
    wasKeyJustPressed(key: string): boolean;
    
    /**
     * Check if a key was just released this frame
     * @param key Key to check
     * @returns Whether the key was just released
     */
    wasKeyJustReleased(key: string): boolean;
    
    /**
     * Get the mouse position
     * @returns Mouse position
     */
    getMousePosition(): { x: number, y: number };
    
    /**
     * Get the mouse movement since last frame
     * @returns Mouse movement
     */
    getMouseMovement(): { x: number, y: number };
    
    /**
     * Check if a mouse button is currently pressed
     * @param button Button to check (0 = left, 1 = middle, 2 = right)
     * @returns Whether the button is pressed
     */
    isMouseButtonPressed(button: number): boolean;
    
    /**
     * Get the movement input vector
     * @returns Movement input vector (x = right, y = up, z = forward)
     */
    getMovementInput(): Vector3;
    
    /**
     * Get the look input vector
     * @returns Look input vector (x = yaw, y = pitch)
     */
    getLookInput(): { x: number, y: number };
    
    /**
     * Check if an action is active
     * @param actionName Action name
     * @param type Action type
     * @returns Whether the action is active
     */
    isActionActive(actionName: string, type: InputActionType): boolean;
    
    /**
     * Get the value of an action
     * @param actionName Action name
     * @returns Action value (0-1)
     */
    getActionValue(actionName: string): number;
    
    /**
     * Lock the mouse pointer
     */
    lockPointer(): void;
    
    /**
     * Unlock the mouse pointer
     */
    unlockPointer(): void;
    
    /**
     * Check if the pointer is locked
     * @returns Whether the pointer is locked
     */
    isPointerLocked(): boolean;
}
