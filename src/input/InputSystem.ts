/**
 * InputSystem.ts
 * Handles user input for the game
 */

import { Vector3 } from '../types/common/Vector3';
import { IInputSystem, InputActionType } from './IInputSystem';
import { InputMapping, InputAction } from './InputMapping';
import { EventSystem } from '../core/EventSystem';
import { GameEventType } from '../types/events/EventTypes';
import { Logger } from '../utils/Logger';

/**
 * Input system implementation
 */
export class InputSystem implements IInputSystem {
    private static instance: InputSystem;
    
    private logger: Logger;
    private eventSystem: EventSystem;
    private inputMapping: InputMapping;
    
    private keysPressed: Map<string, boolean>;
    private keysJustPressed: Set<string>;
    private keysJustReleased: Set<string>;
    
    private mouseButtonsPressed: Map<number, boolean>;
    private mouseButtonsJustPressed: Set<number>;
    private mouseButtonsJustReleased: Set<number>;
    
    private mousePosition: { x: number, y: number };
    private mouseMovement: { x: number, y: number };
    
    private pointerLocked: boolean;
    
    /**
     * Get the InputSystem instance
     * @returns InputSystem instance
     */
    public static getInstance(): InputSystem {
        if (!InputSystem.instance) {
            InputSystem.instance = new InputSystem();
        }
        return InputSystem.instance;
    }
    
    /**
     * Create a new InputSystem
     */
    private constructor() {
        this.logger = new Logger('InputSystem');
        this.eventSystem = new EventSystem();
        this.inputMapping = new InputMapping();
        
        this.keysPressed = new Map<string, boolean>();
        this.keysJustPressed = new Set<string>();
        this.keysJustReleased = new Set<string>();
        
        this.mouseButtonsPressed = new Map<number, boolean>();
        this.mouseButtonsJustPressed = new Set<number>();
        this.mouseButtonsJustReleased = new Set<number>();
        
        this.mousePosition = { x: 0, y: 0 };
        this.mouseMovement = { x: 0, y: 0 };
        
        this.pointerLocked = false;
    }
    
    /**
     * Initialize the input system
     */
    public init(): void {
        this.logger.debug('Initializing input system');
        
        // Set up event listeners
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        window.addEventListener('mousedown', this.handleMouseDown.bind(this));
        window.addEventListener('mouseup', this.handleMouseUp.bind(this));
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('pointerlockchange', this.handlePointerLockChange.bind(this));
    }
    
    /**
     * Update the input system
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        // Clear just pressed/released sets at the end of the frame
        this.keysJustPressed.clear();
        this.keysJustReleased.clear();
        this.mouseButtonsJustPressed.clear();
        this.mouseButtonsJustReleased.clear();
        
        // Reset mouse movement
        this.mouseMovement = { x: 0, y: 0 };
    }
    
    /**
     * Clean up the input system
     */
    public dispose(): void {
        this.logger.debug('Disposing input system');
        
        // Remove event listeners
        window.removeEventListener('keydown', this.handleKeyDown.bind(this));
        window.removeEventListener('keyup', this.handleKeyUp.bind(this));
        window.removeEventListener('mousedown', this.handleMouseDown.bind(this));
        window.removeEventListener('mouseup', this.handleMouseUp.bind(this));
        window.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        document.removeEventListener('pointerlockchange', this.handlePointerLockChange.bind(this));
        
        // Clear state
        this.keysPressed.clear();
        this.keysJustPressed.clear();
        this.keysJustReleased.clear();
        this.mouseButtonsPressed.clear();
        this.mouseButtonsJustPressed.clear();
        this.mouseButtonsJustReleased.clear();
    }
    
    /**
     * Check if a key is currently pressed
     * @param key Key to check
     * @returns Whether the key is pressed
     */
    public isKeyPressed(key: string): boolean {
        return this.keysPressed.get(key) || false;
    }
    
    /**
     * Check if a key was just pressed this frame
     * @param key Key to check
     * @returns Whether the key was just pressed
     */
    public wasKeyJustPressed(key: string): boolean {
        return this.keysJustPressed.has(key);
    }
    
    /**
     * Check if a key was just released this frame
     * @param key Key to check
     * @returns Whether the key was just released
     */
    public wasKeyJustReleased(key: string): boolean {
        return this.keysJustReleased.has(key);
    }
    
    /**
     * Get the mouse position
     * @returns Mouse position
     */
    public getMousePosition(): { x: number, y: number } {
        return { ...this.mousePosition };
    }
    
    /**
     * Get the mouse movement since last frame
     * @returns Mouse movement
     */
    public getMouseMovement(): { x: number, y: number } {
        return { ...this.mouseMovement };
    }
    
    /**
     * Check if a mouse button is currently pressed
     * @param button Button to check (0 = left, 1 = middle, 2 = right)
     * @returns Whether the button is pressed
     */
    public isMouseButtonPressed(button: number): boolean {
        return this.mouseButtonsPressed.get(button) || false;
    }
    
    /**
     * Get the movement input vector
     * @returns Movement input vector (x = right, y = up, z = forward)
     */
    public getMovementInput(): Vector3 {
        const input = new Vector3(0, 0, 0);
        
        // Forward/backward
        if (this.isActionActive(InputAction.MOVE_FORWARD, 'held')) {
            input.z += 1;
        }
        if (this.isActionActive(InputAction.MOVE_BACKWARD, 'held')) {
            input.z -= 1;
        }
        
        // Left/right
        if (this.isActionActive(InputAction.MOVE_RIGHT, 'held')) {
            input.x += 1;
        }
        if (this.isActionActive(InputAction.MOVE_LEFT, 'held')) {
            input.x -= 1;
        }
        
        // Normalize if needed
        if (input.lengthSquared() > 1) {
            input.normalizeInPlace();
        }
        
        return input;
    }
    
    /**
     * Get the look input vector
     * @returns Look input vector (x = yaw, y = pitch)
     */
    public getLookInput(): { x: number, y: number } {
        return { 
            x: this.mouseMovement.x,
            y: this.mouseMovement.y
        };
    }
    
    /**
     * Check if an action is active
     * @param actionName Action name
     * @param type Action type
     * @returns Whether the action is active
     */
    public isActionActive(actionName: string, type: InputActionType): boolean {
        // Check keyboard keys
        for (const [key, pressed] of this.keysPressed.entries()) {
            const actions = this.inputMapping.getActionsForKey(key);
            if (actions.includes(actionName as InputAction)) {
                if (type === 'held' && pressed) {
                    return true;
                } else if (type === 'pressed' && this.keysJustPressed.has(key)) {
                    return true;
                } else if (type === 'released' && this.keysJustReleased.has(key)) {
                    return true;
                }
            }
        }
        
        // Check mouse buttons
        for (const [button, pressed] of this.mouseButtonsPressed.entries()) {
            const actions = this.inputMapping.getActionsForMouseButton(button);
            if (actions.includes(actionName as InputAction)) {
                if (type === 'held' && pressed) {
                    return true;
                } else if (type === 'pressed' && this.mouseButtonsJustPressed.has(button)) {
                    return true;
                } else if (type === 'released' && this.mouseButtonsJustReleased.has(button)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Get the value of an action
     * @param actionName Action name
     * @returns Action value (0-1)
     */
    public getActionValue(actionName: string): number {
        // For now, all actions are digital (0 or 1)
        return this.isActionActive(actionName, 'held') ? 1 : 0;
    }
    
    /**
     * Lock the mouse pointer
     */
    public lockPointer(): void {
        const canvas = document.querySelector('canvas');
        if (canvas && !this.pointerLocked) {
            canvas.requestPointerLock();
        }
    }
    
    /**
     * Unlock the mouse pointer
     */
    public unlockPointer(): void {
        if (this.pointerLocked) {
            document.exitPointerLock();
        }
    }
    
    /**
     * Check if the pointer is locked
     * @returns Whether the pointer is locked
     */
    public isPointerLocked(): boolean {
        return this.pointerLocked;
    }
    
    /**
     * Handle key down event
     * @param event Key down event
     */
    private handleKeyDown(event: KeyboardEvent): void {
        const key = event.key;
        
        // Skip if already pressed (repeat)
        if (this.keysPressed.get(key)) {
            return;
        }
        
        // Update state
        this.keysPressed.set(key, true);
        this.keysJustPressed.add(key);
        
        // Dispatch event
        this.eventSystem.emit(GameEventType.INPUT_KEY_DOWN, {
            key: key,
            code: event.code,
            repeat: event.repeat,
            shift: event.shiftKey,
            ctrl: event.ctrlKey,
            alt: event.altKey
        });
    }
    
    /**
     * Handle key up event
     * @param event Key up event
     */
    private handleKeyUp(event: KeyboardEvent): void {
        const key = event.key;
        
        // Update state
        this.keysPressed.set(key, false);
        this.keysJustReleased.add(key);
        
        // Dispatch event
        this.eventSystem.emit(GameEventType.INPUT_KEY_UP, {
            key: key,
            code: event.code,
            repeat: false,
            shift: event.shiftKey,
            ctrl: event.ctrlKey,
            alt: event.altKey
        });
    }
    
    /**
     * Handle mouse down event
     * @param event Mouse down event
     */
    private handleMouseDown(event: MouseEvent): void {
        const button = event.button;
        
        // Update state
        this.mouseButtonsPressed.set(button, true);
        this.mouseButtonsJustPressed.add(button);
        
        // Dispatch event
        this.eventSystem.emit(GameEventType.INPUT_MOUSE_DOWN, {
            button: button,
            x: event.clientX,
            y: event.clientY
        });
    }
    
    /**
     * Handle mouse up event
     * @param event Mouse up event
     */
    private handleMouseUp(event: MouseEvent): void {
        const button = event.button;
        
        // Update state
        this.mouseButtonsPressed.set(button, false);
        this.mouseButtonsJustReleased.add(button);
        
        // Dispatch event
        this.eventSystem.emit(GameEventType.INPUT_MOUSE_UP, {
            button: button,
            x: event.clientX,
            y: event.clientY
        });
    }
    
    /**
     * Handle mouse move event
     * @param event Mouse move event
     */
    private handleMouseMove(event: MouseEvent): void {
        // Update position
        this.mousePosition = {
            x: event.clientX,
            y: event.clientY
        };
        
        // Update movement
        if (this.pointerLocked) {
            this.mouseMovement = {
                x: event.movementX,
                y: event.movementY
            };
        } else {
            this.mouseMovement = { x: 0, y: 0 };
        }
        
        // Dispatch event
        this.eventSystem.emit(GameEventType.INPUT_MOUSE_MOVE, {
            x: event.clientX,
            y: event.clientY,
            movementX: event.movementX,
            movementY: event.movementY
        });
    }
    
    /**
     * Handle pointer lock change event
     */
    private handlePointerLockChange(): void {
        this.pointerLocked = document.pointerLockElement !== null;
        this.logger.debug(`Pointer lock changed: ${this.pointerLocked}`);
    }
}
