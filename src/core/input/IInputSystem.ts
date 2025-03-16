import { InputBinding, InputBindingGroup, InputConfig, InputState, MouseMovementEvent } from '../../types/core/InputTypes';

/**
 * Interface for the input system
 */
export interface IInputSystem {
    /**
     * Initialize the input system
     */
    initialize(config: InputConfig): void;

    /**
     * Update the input system state
     * @param deltaTime Time since last update in seconds
     */
    update(deltaTime: number): void;

    /**
     * Add an input binding
     */
    addBinding(binding: InputBinding): void;

    /**
     * Remove an input binding
     */
    removeBinding(bindingId: string): void;

    /**
     * Add a binding group
     */
    addBindingGroup(group: InputBindingGroup): void;

    /**
     * Remove a binding group
     */
    removeBindingGroup(groupId: string): void;

    /**
     * Enable/disable a binding group
     */
    setBindingGroupEnabled(groupId: string, enabled: boolean): void;

    /**
     * Check if a key or button is currently pressed
     */
    isPressed(bindingId: string): boolean;

    /**
     * Check if a key or button is currently held
     */
    isHeld(bindingId: string): boolean;

    /**
     * Get the current value of an input (0-1)
     */
    getValue(bindingId: string): number;

    /**
     * Get the current mouse position
     */
    getMousePosition(): { x: number; y: number };

    /**
     * Get the current mouse movement
     */
    getMouseMovement(): { x: number; y: number };

    /**
     * Lock/unlock the mouse pointer
     */
    setPointerLocked(locked: boolean): void;

    /**
     * Get the current input state snapshot
     */
    getState(): InputState;

    /**
     * Clean up resources
     */
    dispose(): void;
} 