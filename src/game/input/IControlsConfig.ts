/**
 * @file src/game/input/IControlsConfig.ts
 * @description Interface for game control configurations
 */

import { GameInputActions } from "./GameInputActions";

/**
 * Represents a single control binding
 */
export interface IControlBinding {
    /** The action this binding is for */
    action: string;
    
    /** The key or button mapped to this action */
    key: string;
    
    /** Whether the key can be held down to trigger the action */
    isHoldable?: boolean;
    
    /** Whether the action should repeat while key is held */
    isRepeatable?: boolean;
    
    /** For axis controls, whether this is an axis control */
    isAxisControl?: boolean;
    
    /** For axis controls, the sensitivity multiplier */
    sensitivity?: number;
    
    /** For axis controls, whether the axis is inverted */
    isInverted?: boolean;
    
    /** Whether the key can be rebound */
    canRebind?: boolean;
    
    /** User-friendly display name for the control */
    displayName?: string;
}

/**
 * Represents a category of controls
 */
export interface IControlCategory {
    /** Identifier for the category */
    id: string;
    
    /** Display name for the category */
    name: string;
    
    /** The bindings in this category */
    bindings: IControlBinding[];
}

/**
 * Represents a complete controls configuration
 */
export interface IControlsConfig {
    /** Identifier for this configuration */
    id: string;
    
    /** Display name for this configuration */
    name: string;
    
    /** Categories of controls */
    categories: IControlCategory[];
    
    /** Whether this is the default configuration */
    isDefault?: boolean;
    
    /** Mouse sensitivity setting (0.0 to 2.0) */
    mouseSensitivity: number;
    
    /** Whether the Y-axis is inverted */
    invertYAxis: boolean;
    
    /** Gets a binding for a specific action */
    getBindingForAction(action: string): IControlBinding | null;
    
    /** Gets all bindings for a specific action */
    getAllBindingsForAction(action: string): IControlBinding[];
    
    /** Updates a binding */
    updateBinding(action: string, key: string): boolean;
    
    /** Resets to default bindings */
    resetToDefaults(): void;
    
    /** Exports the configuration to a serializable object */
    export(): object;
    
    /** Imports from a serialized configuration */
    import(data: object): boolean;
}

/**
 * Default control categories
 */
export enum ControlCategory {
    MOVEMENT = "movement",
    WEAPONS = "weapons",
    CAMERA = "camera",
    INTERFACE = "interface"
}

/**
 * Mapping of default category display names
 */
export const DEFAULT_CATEGORY_NAMES: Record<ControlCategory, string> = {
    [ControlCategory.MOVEMENT]: "Movement",
    [ControlCategory.WEAPONS]: "Weapons",
    [ControlCategory.CAMERA]: "Camera & Aim",
    [ControlCategory.INTERFACE]: "Interface"
};

/**
 * Default binding mapping
 */
export const DEFAULT_BINDINGS: Record<GameInputActions, IControlBinding> = {
    // Movement
    [GameInputActions.MOVE_FORWARD]: {
        action: GameInputActions.MOVE_FORWARD,
        key: "w",
        isHoldable: true,
        isRepeatable: true,
        canRebind: true,
        displayName: "Move Forward"
    },
    [GameInputActions.MOVE_BACKWARD]: {
        action: GameInputActions.MOVE_BACKWARD,
        key: "s",
        isHoldable: true,
        isRepeatable: true,
        canRebind: true,
        displayName: "Move Backward"
    },
    [GameInputActions.STRAFE_LEFT]: {
        action: GameInputActions.STRAFE_LEFT,
        key: "a",
        isHoldable: true,
        isRepeatable: true,
        canRebind: true,
        displayName: "Strafe Left"
    },
    [GameInputActions.STRAFE_RIGHT]: {
        action: GameInputActions.STRAFE_RIGHT,
        key: "d",
        isHoldable: true,
        isRepeatable: true,
        canRebind: true,
        displayName: "Strafe Right"
    },
    [GameInputActions.JUMP]: {
        action: GameInputActions.JUMP,
        key: " ", // space
        isHoldable: false,
        isRepeatable: false,
        canRebind: true,
        displayName: "Jump"
    },
    [GameInputActions.SKI]: {
        action: GameInputActions.SKI,
        key: " ", // space (held)
        isHoldable: true,
        isRepeatable: false,
        canRebind: true,
        displayName: "Ski (Hold)"
    },
    [GameInputActions.JETPACK]: {
        action: GameInputActions.JETPACK,
        key: "MouseRight",
        isHoldable: true,
        isRepeatable: false,
        canRebind: true,
        displayName: "Jetpack"
    },
    
    // Weapons
    [GameInputActions.FIRE_SPINFUSOR]: {
        action: GameInputActions.FIRE_SPINFUSOR,
        key: "MouseLeft",
        isHoldable: false,
        isRepeatable: false,
        canRebind: true,
        displayName: "Fire Spinfusor"
    },
    [GameInputActions.THROW_GRENADE]: {
        action: GameInputActions.THROW_GRENADE,
        key: "g",
        isHoldable: false,
        isRepeatable: false,
        canRebind: true,
        displayName: "Throw Grenade"
    },
    
    // Camera
    [GameInputActions.LOOK_X]: {
        action: GameInputActions.LOOK_X,
        key: "MouseX",
        isAxisControl: true,
        sensitivity: 1.0,
        canRebind: false,
        displayName: "Look Left/Right"
    },
    [GameInputActions.LOOK_Y]: {
        action: GameInputActions.LOOK_Y,
        key: "MouseY",
        isAxisControl: true,
        isInverted: false,
        sensitivity: 1.0,
        canRebind: false,
        displayName: "Look Up/Down"
    },
    
    // Interface
    [GameInputActions.PAUSE_GAME]: {
        action: GameInputActions.PAUSE_GAME,
        key: "Escape",
        isHoldable: false,
        canRebind: false,
        displayName: "Pause Game"
    },
    [GameInputActions.OPEN_SCOREBOARD]: {
        action: GameInputActions.OPEN_SCOREBOARD,
        key: "Tab",
        isHoldable: true,
        canRebind: true,
        displayName: "Show Scoreboard"
    },
    [GameInputActions.RESTART_RUN]: {
        action: GameInputActions.RESTART_RUN,
        key: "r",
        isHoldable: false,
        canRebind: true,
        displayName: "Restart Run"
    },
    [GameInputActions.QUICK_SWITCH]: {
        action: GameInputActions.QUICK_SWITCH,
        key: "q",
        isHoldable: false,
        canRebind: true,
        displayName: "Quick Switch"
    }
}; 