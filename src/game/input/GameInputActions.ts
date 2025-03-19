/**
 * GameInputActions - Defines all game-specific input actions
 * These constants are used to map input controls to game actions
 */
export enum GameInputActions {
    // Movement Actions
    MOVE_FORWARD = "MOVE_FORWARD",
    MOVE_BACKWARD = "MOVE_BACKWARD",
    STRAFE_LEFT = "STRAFE_LEFT",
    STRAFE_RIGHT = "STRAFE_RIGHT",
    
    // Jump/Ski Actions
    JUMP = "JUMP",         // Tap spacebar
    SKI = "SKI",           // Hold spacebar
    
    // Jetpack
    JETPACK = "JETPACK",   // Hold RMB
    
    // Weapons
    FIRE_SPINFUSOR = "FIRE_SPINFUSOR", // LMB
    THROW_GRENADE = "THROW_GRENADE",   // G key
    
    // Camera/Aim
    LOOK_X = "LOOK_X",     // Mouse X-axis movement
    LOOK_Y = "LOOK_Y",     // Mouse Y-axis movement
    
    // UI Actions
    PAUSE_GAME = "PAUSE_GAME",
    OPEN_SCOREBOARD = "OPEN_SCOREBOARD",
    
    // Special Actions
    RESTART_RUN = "RESTART_RUN",
    QUICK_SWITCH = "QUICK_SWITCH"
}

/**
 * Input action categories for organization in the UI
 */
export enum InputActionCategory {
    MOVEMENT = "Movement",
    WEAPONS = "Weapons",
    CAMERA = "Camera",
    INTERFACE = "Interface"
}

/**
 * Maps actions to their categories for UI organization
 */
export const ACTION_CATEGORIES: Record<GameInputActions, InputActionCategory> = {
    [GameInputActions.MOVE_FORWARD]: InputActionCategory.MOVEMENT,
    [GameInputActions.MOVE_BACKWARD]: InputActionCategory.MOVEMENT,
    [GameInputActions.STRAFE_LEFT]: InputActionCategory.MOVEMENT,
    [GameInputActions.STRAFE_RIGHT]: InputActionCategory.MOVEMENT,
    [GameInputActions.JUMP]: InputActionCategory.MOVEMENT,
    [GameInputActions.SKI]: InputActionCategory.MOVEMENT,
    [GameInputActions.JETPACK]: InputActionCategory.MOVEMENT,
    
    [GameInputActions.FIRE_SPINFUSOR]: InputActionCategory.WEAPONS,
    [GameInputActions.THROW_GRENADE]: InputActionCategory.WEAPONS,
    
    [GameInputActions.LOOK_X]: InputActionCategory.CAMERA,
    [GameInputActions.LOOK_Y]: InputActionCategory.CAMERA,
    
    [GameInputActions.PAUSE_GAME]: InputActionCategory.INTERFACE,
    [GameInputActions.OPEN_SCOREBOARD]: InputActionCategory.INTERFACE,
    [GameInputActions.RESTART_RUN]: InputActionCategory.INTERFACE,
    [GameInputActions.QUICK_SWITCH]: InputActionCategory.INTERFACE
}; 