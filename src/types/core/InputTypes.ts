/**
 * Input action types supported by the system
 */
export enum InputActionType {
    Pressed = 'pressed',
    Released = 'released',
    Held = 'held'
}

/**
 * Input device types
 */
export enum InputDeviceType {
    Keyboard = 'keyboard',
    Mouse = 'mouse',
    Gamepad = 'gamepad'
}

/**
 * Mouse button identifiers
 */
export enum MouseButton {
    Left = 0,
    Middle = 1,
    Right = 2
}

/**
 * Input binding configuration
 */
export interface InputBinding {
    readonly id: string;
    readonly device: InputDeviceType;
    readonly key: string | number; // Key code for keyboard, button index for mouse/gamepad
    readonly actionType: InputActionType;
    readonly description?: string;
}

/**
 * Input action event data
 */
export interface InputActionEvent {
    readonly bindingId: string;
    readonly device: InputDeviceType;
    readonly actionType: InputActionType;
    readonly value: number; // 0-1 for analog inputs, 0/1 for digital
    readonly timestamp: number;
}

/**
 * Mouse movement event data
 */
export interface MouseMovementEvent {
    readonly movementX: number;
    readonly movementY: number;
    readonly deltaX: number;
    readonly deltaY: number;
    readonly timestamp: number;
}

/**
 * Input binding group configuration
 */
export interface InputBindingGroup {
    readonly id: string;
    readonly bindings: InputBinding[];
    readonly enabled: boolean;
}

/**
 * Input manager configuration
 */
export interface InputConfig {
    readonly bindingGroups: InputBindingGroup[];
    readonly mouseSensitivity: number;
    readonly mouseSmoothing: boolean;
    readonly mouseSmoothingFactor: number;
    readonly gamepadDeadzone: number;
}

/**
 * Input state snapshot
 */
export interface InputState {
    readonly pressedKeys: Set<string>;
    readonly pressedButtons: Set<number>;
    readonly mousePosition: { x: number; y: number };
    readonly mouseMovement: { x: number; y: number };
    readonly timestamp: number;
} 