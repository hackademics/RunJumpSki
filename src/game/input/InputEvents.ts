/**
 * @file src/game/input/InputEvents.ts
 * @description Defines custom events for game input actions
 */

// Event names for the input system
export enum InputEventType {
    // Basic input events
    INPUT_ACTION_START = "input.action.start",
    INPUT_ACTION_END = "input.action.end",
    INPUT_ACTION_REPEAT = "input.action.repeat",
    
    // Axis input events (mouse, gamepad sticks)
    INPUT_AXIS_CHANGE = "input.axis.change",
    
    // Config events
    INPUT_BINDING_CHANGED = "input.binding.changed",
    INPUT_CONTEXT_CHANGED = "input.context.changed",
    
    // Special events
    INPUT_COMBO_TRIGGERED = "input.combo.triggered",
    
    // Game-specific events
    JUMP_PERFORMED = "game.jump.performed",
    SKI_START = "game.ski.start",
    SKI_END = "game.ski.end",
    JETPACK_START = "game.jetpack.start",
    JETPACK_END = "game.jetpack.end",
    WEAPON_FIRED = "game.weapon.fired"
}

// Axis input data interface
export interface IAxisInputData {
    action: string;
    value: number;
    delta: number;
    normalized: number; // Value between -1 and 1
    raw?: number; // Raw input value before processing
}

// Button input data interface
export interface IButtonInputData {
    action: string;
    key: string;
    context: string;
    timestamp: number;
    repeat?: boolean;
}

// Binding change data interface
export interface IBindingChangeData {
    action: string;
    oldKey?: string;
    newKey: string;
    context: string;
}

/**
 * Creates a button input event payload
 */
export function createButtonEventData(
    action: string,
    key: string,
    context: string = "default",
    repeat: boolean = false
): IButtonInputData {
    return {
        action,
        key,
        context,
        timestamp: Date.now(),
        repeat
    };
}

/**
 * Creates an axis input event payload
 */
export function createAxisEventData(
    action: string,
    value: number,
    delta: number,
    raw?: number
): IAxisInputData {
    return {
        action,
        value,
        delta,
        normalized: Math.max(-1, Math.min(1, value)), // Clamp between -1 and 1
        raw
    };
}

/**
 * Creates a binding change event payload
 */
export function createBindingChangeData(
    action: string,
    newKey: string,
    context: string = "default",
    oldKey?: string
): IBindingChangeData {
    return {
        action,
        oldKey,
        newKey,
        context
    };
} 