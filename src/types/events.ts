/**
 * Generic event data interface
 */
export interface EventData {
    [key: string]: any;
}

/**
 * Event handler function type
 */
export type EventHandler = (data: EventData) => void;

/**
 * Event emitter interface
 */
export interface IEventEmitter {
    /**
     * Register an event handler
     * @param event Event name
     * @param handler Handler function
     */
    on(event: string, handler: EventHandler): void;

    /**
     * Register a one-time event handler
     * @param event Event name
     * @param handler Handler function
     */
    once(event: string, handler: EventHandler): void;

    /**
     * Remove an event handler
     * @param event Event name
     * @param handler Handler function to remove
     */
    off(event: string, handler: EventHandler): void;

    /**
     * Emit an event with data
     * @param event Event name
     * @param data Event data
     */
    emit(event: string, data?: EventData): void;

    /**
     * Get the number of handlers for an event
     * @param event Event name
     */
    listenerCount(event: string): number;

    /**
     * Remove all event handlers
     * @param event Optional event name, if not provided all events are cleared
     */
    removeAllListeners(event?: string): void;
}

/**
 * Common game events
 */
export enum GameEvent {
    // Engine events
    INIT = 'init',
    START = 'start',
    STOP = 'stop',
    UPDATE = 'update',
    RENDER = 'render',

    // Physics events
    PHYSICS_UPDATE = 'physics:update',
    COLLISION_START = 'collision:start',
    COLLISION_END = 'collision:end',

    // Player events
    PLAYER_SPAWN = 'player:spawn',
    PLAYER_DEATH = 'player:death',
    PLAYER_STATE_CHANGE = 'player:stateChange',
    PLAYER_JETPACK_START = 'player:jetpackStart',
    PLAYER_JETPACK_STOP = 'player:jetpackStop',
    PLAYER_SKI_START = 'player:skiStart',
    PLAYER_SKI_STOP = 'player:skiStop',

    // Input events
    KEY_DOWN = 'key:down',
    KEY_UP = 'key:up',
    MOUSE_MOVE = 'mouse:move',
    MOUSE_DOWN = 'mouse:down',
    MOUSE_UP = 'mouse:up',

    // Weapon events
    WEAPON_FIRE = 'weapon:fire',
    WEAPON_RELOAD = 'weapon:reload',
    WEAPON_SWITCH = 'weapon:switch',
    PROJECTILE_HIT = 'projectile:hit',

    // Game state events
    GAME_STATE_CHANGE = 'gameState:change',
    LEVEL_LOAD = 'level:load',
    LEVEL_COMPLETE = 'level:complete',
    CHECKPOINT_REACHED = 'checkpoint:reached',

    // UI events
    UI_OPEN = 'ui:open',
    UI_CLOSE = 'ui:close',
    UI_BUTTON_CLICK = 'ui:buttonClick',

    // Audio events
    AUDIO_PLAY = 'audio:play',
    AUDIO_STOP = 'audio:stop',

    // Asset events
    ASSET_LOAD_START = 'asset:loadStart',
    ASSET_LOAD_PROGRESS = 'asset:loadProgress',
    ASSET_LOAD_COMPLETE = 'asset:loadComplete',
    ASSET_LOAD_ERROR = 'asset:loadError'
}