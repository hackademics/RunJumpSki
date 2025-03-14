/**
 * InputMapping.ts
 * Defines input mappings for the game
 */

import { DefaultGameConfig } from '../config/GameConfig';

/**
 * Input action names
 */
export enum InputAction {
    MOVE_FORWARD = 'moveForward',
    MOVE_BACKWARD = 'moveBackward',
    MOVE_LEFT = 'moveLeft',
    MOVE_RIGHT = 'moveRight',
    JUMP = 'jump',
    SKI = 'ski',
    JETPACK = 'jetpack',
    FIRE = 'fire',
    ALT_FIRE = 'altFire',
    RELOAD = 'reload',
    USE = 'use',
    MENU = 'menu'
}

/**
 * Input mapping class
 */
export class InputMapping {
    /**
     * Key to action mapping
     */
    private keyToAction: Map<string, InputAction[]>;
    
    /**
     * Mouse button to action mapping
     */
    private mouseToAction: Map<number, InputAction[]>;
    
    /**
     * Create a new InputMapping
     */
    constructor() {
        this.keyToAction = new Map<string, InputAction[]>();
        this.mouseToAction = new Map<number, InputAction[]>();
        
        // Initialize with default mappings
        this.initDefaultMappings();
    }
    
    /**
     * Initialize default mappings
     */
    private initDefaultMappings(): void {
        // Clear existing mappings
        this.keyToAction.clear();
        this.mouseToAction.clear();
        
        // Map keys to actions
        this.mapKeysToAction(DefaultGameConfig.input.forward, InputAction.MOVE_FORWARD);
        this.mapKeysToAction(DefaultGameConfig.input.backward, InputAction.MOVE_BACKWARD);
        this.mapKeysToAction(DefaultGameConfig.input.left, InputAction.MOVE_LEFT);
        this.mapKeysToAction(DefaultGameConfig.input.right, InputAction.MOVE_RIGHT);
        this.mapKeysToAction(DefaultGameConfig.input.jump, InputAction.JUMP);
        this.mapKeysToAction(DefaultGameConfig.input.ski, InputAction.SKI);
        this.mapKeysToAction(DefaultGameConfig.input.jetpack, InputAction.JETPACK);
        this.mapKeysToAction(DefaultGameConfig.input.reload, InputAction.RELOAD);
        this.mapKeysToAction(DefaultGameConfig.input.use, InputAction.USE);
        this.mapKeysToAction(DefaultGameConfig.input.menu, InputAction.MENU);
        
        // Map mouse buttons to actions
        this.mapMouseToAction(0, InputAction.FIRE);
        this.mapMouseToAction(2, InputAction.ALT_FIRE);
    }
    
    /**
     * Map keys to an action
     * @param keys Keys to map
     * @param action Action to map to
     */
    private mapKeysToAction(keys: string[], action: InputAction): void {
        for (const key of keys) {
            if (key.startsWith('mouse')) {
                // Mouse button
                const buttonIndex = parseInt(key.substring(5));
                this.mapMouseToAction(buttonIndex, action);
            } else {
                // Keyboard key
                if (!this.keyToAction.has(key)) {
                    this.keyToAction.set(key, []);
                }
                this.keyToAction.get(key)!.push(action);
            }
        }
    }
    
    /**
     * Map a mouse button to an action
     * @param button Mouse button index
     * @param action Action to map to
     */
    private mapMouseToAction(button: number, action: InputAction): void {
        if (!this.mouseToAction.has(button)) {
            this.mouseToAction.set(button, []);
        }
        this.mouseToAction.get(button)!.push(action);
    }
    
    /**
     * Get actions for a key
     * @param key Key to get actions for
     * @returns Actions for the key
     */
    public getActionsForKey(key: string): InputAction[] {
        return this.keyToAction.get(key) || [];
    }
    
    /**
     * Get actions for a mouse button
     * @param button Mouse button to get actions for
     * @returns Actions for the mouse button
     */
    public getActionsForMouseButton(button: number): InputAction[] {
        return this.mouseToAction.get(button) || [];
    }
    
    /**
     * Reset to default mappings
     */
    public resetToDefault(): void {
        this.initDefaultMappings();
    }
}
