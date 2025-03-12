import { Vector2, Vector3 } from '@babylonjs/core';
import { IEventEmitter, GameEvent } from '../types/events';
import { Logger } from '../utils/logger';

/**
 * Key state mapping
 */
interface KeyState {
  /**
   * Whether the key is currently pressed
   */
  pressed: boolean;
  
  /**
   * Whether the key was just pressed this frame
   */
  justPressed: boolean;
  
  /**
   * Whether the key was just released this frame
   */
  justReleased: boolean;
  
  /**
   * Time when the key was last pressed
   */
  pressTime: number;
}

/**
 * Mouse state
 */
interface MouseState {
  /**
   * Current mouse position
   */
  position: Vector2;
  
  /**
   * Mouse movement delta since last frame
   */
  delta: Vector2;
  
  /**
   * Mouse button states (indexed by button number)
   */
  buttons: Record<number, KeyState>;
  
  /**
   * Mouse wheel delta
   */
  wheelDelta: number;
  
  /**
   * Whether mouse is locked
   */
  locked: boolean;
}

/**
 * Manages user input for the game
 */
export class InputManager {
  private logger: Logger;
  private events: IEventEmitter;
  private canvas: HTMLCanvasElement;
  private keyStates: Record<string, KeyState> = {};
  private mouseState: MouseState;
  private enabled: boolean = true;
  
  // Input mapping to abstract from specific keys
  private inputMap: Record<string, string[]> = {
    'forward': ['w', 'arrowup'],
    'backward': ['s', 'arrowdown'],
    'left': ['a', 'arrowleft'],
    'right': ['d', 'arrowright'],
    'jump': [' ', 'space'],
    'ski': ['shift'],
    'jetpack': ['control'],
    'fire': ['mouse0'], // Left mouse button
    'altFire': ['mouse2'], // Right mouse button
    'reload': ['r'],
    'use': ['e', 'f'],
    'menu': ['escape']
  };
  
  /**
   * Initialize the input manager
   * @param canvas Canvas element to attach listeners to
   * @param events Event emitter for input events
   */
  constructor(canvas: HTMLCanvasElement, events: IEventEmitter) {
    this.logger = new Logger('InputManager');
    this.canvas = canvas;
    this.events = events;
    
    // Initialize mouse state
    this.mouseState = {
      position: new Vector2(0, 0),
      delta: new Vector2(0, 0),
      buttons: {},
      wheelDelta: 0,
      locked: false
    };
    
    try {
      this.logger.info('Initializing input manager...');
      
      // Set up event listeners
      this.setupKeyboardListeners();
      this.setupMouseListeners();
      
      this.logger.info('Input manager initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize input manager', error);
      throw error;
    }
  }
  
  /**
   * Set up keyboard event listeners
   */
  private setupKeyboardListeners(): void {
    // Keydown event
    window.addEventListener('keydown', (event) => {
      if (!this.enabled) return;
      
      const key = event.key.toLowerCase();
      
      // Prevent default actions for game keys
      if (this.isGameKey(key)) {
        event.preventDefault();
      }
      
      // Update key state
      if (!this.keyStates[key]) {
        this.keyStates[key] = {
          pressed: true,
          justPressed: true,
          justReleased: false,
          pressTime: performance.now()
        };
      } else if (!this.keyStates[key].pressed) {
        this.keyStates[key].pressed = true;
        this.keyStates[key].justPressed = true;
        this.keyStates[key].pressTime = performance.now();
      }
      
      // Emit key event
      this.events.emit(GameEvent.KEY_DOWN, { key, repeat: event.repeat });
    });
    
    // Keyup event
    window.addEventListener('keyup', (event) => {
      if (!this.enabled) return;
      
      const key = event.key.toLowerCase();
      
      // Prevent default actions for game keys
      if (this.isGameKey(key)) {
        event.preventDefault();
      }
      
      // Update key state
      if (this.keyStates[key]) {
        this.keyStates[key].pressed = false;
        this.keyStates[key].justReleased = true;
      } else {
        this.keyStates[key] = {
          pressed: false,
          justPressed: false,
          justReleased: true,
          pressTime: 0
        };
      }
      
      // Emit key event
      this.events.emit(GameEvent.KEY_UP, { key });
    });
    
    // Handle focus loss
    window.addEventListener('blur', () => {
      this.resetAllInputs();
    });
  }
  
  /**
   * Set up mouse event listeners
   */
  private setupMouseListeners(): void {
    // Mouse move event
    this.canvas.addEventListener('mousemove', (event) => {
      if (!this.enabled) return;
      
      // Calculate mouse position
      const rect = this.canvas.getBoundingClientRect();
      const newPosition = new Vector2(
        event.clientX - rect.left,
        event.clientY - rect.top
      );
      
      // Calculate delta
      const delta = newPosition.subtract(this.mouseState.position);
      this.mouseState.delta = delta;
      this.mouseState.position = newPosition;
      
      // Emit mouse event
      this.events.emit(GameEvent.MOUSE_MOVE, {
        position: this.mouseState.position,
        delta: this.mouseState.delta,
        movementX: event.movementX,
        movementY: event.movementY
      });
    });
    
    // Mouse down event
    this.canvas.addEventListener('mousedown', (event) => {
      if (!this.enabled) return;
      
      const button = event.button;
      
      // Update button state
      if (!this.mouseState.buttons[button]) {
        this.mouseState.buttons[button] = {
          pressed: true,
          justPressed: true,
          justReleased: false,
          pressTime: performance.now()
        };
      } else {
        this.mouseState.buttons[button].pressed = true;
        this.mouseState.buttons[button].justPressed = true;
        this.mouseState.buttons[button].pressTime = performance.now();
      }
      
      // Also update key state for mouse button mapping
      const mouseKey = `mouse${button}`;
      this.keyStates[mouseKey] = {
        pressed: true,
        justPressed: true,
        justReleased: false,
        pressTime: performance.now()
      };
      
      // Emit mouse event
      this.events.emit(GameEvent.MOUSE_DOWN, {
        button,
        position: this.mouseState.position
      });
    });
    
    // Mouse up event
    this.canvas.addEventListener('mouseup', (event) => {
      if (!this.enabled) return;
      
      const button = event.button;
      
      // Update button state
      if (this.mouseState.buttons[button]) {
        this.mouseState.buttons[button].pressed = false;
        this.mouseState.buttons[button].justReleased = true;
      } else {
        this.mouseState.buttons[button] = {
          pressed: false,
          justPressed: false,
          justReleased: true,
          pressTime: 0
        };
      }
      
      // Also update key state for mouse button mapping
      const mouseKey = `mouse${button}`;
      if (this.keyStates[mouseKey]) {
        this.keyStates[mouseKey].pressed = false;
        this.keyStates[mouseKey].justReleased = true;
      } else {
        this.keyStates[mouseKey] = {
          pressed: false,
          justPressed: false,
          justReleased: true,
          pressTime: 0
        };
      }
      
      // Emit mouse event
      this.events.emit(GameEvent.MOUSE_UP, {
        button,
        position: this.mouseState.position
      });
    });
    
    // Mouse wheel event
    this.canvas.addEventListener('wheel', (event) => {
      if (!this.enabled) return;
      
      // Update wheel delta
      this.mouseState.wheelDelta = event.deltaY > 0 ? 1 : -1;
      
      // Emit wheel event
      this.events.emit('mouse:wheel', {
        delta: this.mouseState.wheelDelta,
        raw: event.deltaY
      });
    });
    
    // Pointer lock change
    document.addEventListener('pointerlockchange', () => {
      //this.mouseState.locked = document.pointerLockElement === this.canvas;
      
      // Emit pointer lock event
      this.events.emit('mouse:lock', {
        locked: this.mouseState.locked
      });
    });
  }
  
  /**
   * Update input state
   * @param deltaTime Time since last update in seconds
   */
  public update(deltaTime: number): void {
    // Clear 'just' states after one frame
    for (const key in this.keyStates) {
      this.keyStates[key].justPressed = false;
      this.keyStates[key].justReleased = false;
    }
    
    // Clear mouse button 'just' states
    for (const button in this.mouseState.buttons) {
      this.mouseState.buttons[button].justPressed = false;
      this.mouseState.buttons[button].justReleased = false;
    }
    
    // Reset mouse delta
    this.mouseState.delta.x = 0;
    this.mouseState.delta.y = 0;
    this.mouseState.wheelDelta = 0;
  }
  
  /**
   * Check if a key is currently pressed
   * @param key Key to check
   */
  public isKeyPressed(key: string): boolean {
    key = key.toLowerCase();
    return this.keyStates[key]?.pressed || false;
  }
  
  /**
   * Check if a key was just pressed this frame
   * @param key Key to check
   */
  public isKeyJustPressed(key: string): boolean {
    key = key.toLowerCase();
    return this.keyStates[key]?.justPressed || false;
  }
  
  /**
   * Check if a key was just released this frame
   * @param key Key to check
   */
  public isKeyJustReleased(key: string): boolean {
    key = key.toLowerCase();
    return this.keyStates[key]?.justReleased || false;
  }
  
  /**
   * Check if a mapped input is pressed
   * @param action Input action to check
   */
  public isActionPressed(action: string): boolean {
    const keys = this.inputMap[action];
    if (!keys) {
      return false;
    }
    
    // Return true if any of the mapped keys are pressed
    return keys.some(key => this.isKeyPressed(key));
  }
  
  /**
   * Check if a mapped input was just pressed this frame
   * @param action Input action to check
   */
  public isActionJustPressed(action: string): boolean {
    const keys = this.inputMap[action];
    if (!keys) {
      return false;
    }
    
    // Return true if any of the mapped keys were just pressed
    return keys.some(key => this.isKeyJustPressed(key));
  }
  
  /**
   * Check if a mapped input was just released this frame
   * @param action Input action to check
   */
  public isActionJustReleased(action: string): boolean {
    const keys = this.inputMap[action];
    if (!keys) {
      return false;
    }
    
    // Return true if any of the mapped keys were just released
    return keys.some(key => this.isKeyJustReleased(key));
  }
  
  /**
   * Get movement input vector
   */
  public getMovementVector(): Vector3 {
    const x = (this.isActionPressed('right') ? 1 : 0) - (this.isActionPressed('left') ? 1 : 0);
    const z = (this.isActionPressed('forward') ? 1 : 0) - (this.isActionPressed('backward') ? 1 : 0);
    
    return new Vector3(x, 0, z).normalize();
  }
  
  /**
   * Get mouse position
   */
  public getMousePosition(): Vector2 {
    return this.mouseState.position.clone();
  }
  
  /**
   * Get mouse movement delta
   */
  public getMouseDelta(): Vector2 {
    return this.mouseState.delta.clone();
  }
  
  /**
   * Get mouse wheel delta
   */
  public getMouseWheelDelta(): number {
    return this.mouseState.wheelDelta;
  }
  
  /**
   * Request pointer lock on canvas
   */
  public requestPointerLock(): void {
    if (!this.mouseState.locked) {
      this.canvas.requestPointerLock();
    }
  }
  
  /**
   * Release pointer lock
   */
  public releasePointerLock(): void {
    if (this.mouseState.locked) {
      document.exitPointerLock();
    }
  }
  
  /**
   * Check if pointer is locked
   */
  public isPointerLocked(): boolean {
    return this.mouseState.locked;
  }
  
  /**
   * Enable or disable input
   * @param enabled Whether input is enabled
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    if (!enabled) {
      this.resetAllInputs();
    }
  }
  
  /**
   * Reset all input states
   */
  private resetAllInputs(): void {
    // Reset key states
    for (const key in this.keyStates) {
      this.keyStates[key].pressed = false;
      this.keyStates[key].justPressed = false;
      this.keyStates[key].justReleased = false;
    }
    
    // Reset mouse button states
    for (const button in this.mouseState.buttons) {
      this.mouseState.buttons[button].pressed = false;
      this.mouseState.buttons[button].justPressed = false;
      this.mouseState.buttons[button].justReleased = false;
    }
    
    // Reset mouse deltas
    this.mouseState.delta.x = 0;
    this.mouseState.delta.y = 0;
    this.mouseState.wheelDelta = 0;
    
    this.events.emit('input:reset', {});
  }
  
  /**
   * Check if a key is a game key
   * @param key Key to check
   */
  private isGameKey(key: string): boolean {
    // Check if key is in any input map
    for (const action in this.inputMap) {
      if (this.inputMap[action].includes(key)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Remap an input action to new keys
   * @param action Action to remap
   * @param keys New keys to map to
   */
  public remapInput(action: string, keys: string[]): void {
    if (this.inputMap[action]) {
      this.inputMap[action] = keys.map(key => key.toLowerCase());
      this.logger.debug(`Remapped ${action} to ${keys.join(', ')}`);
    } else {
      this.logger.warn(`Cannot remap unknown action: ${action}`);
    }
  }
  
  /**
   * Get the current input mapping
   */
  public getInputMap(): Record<string, string[]> {
    return { ...this.inputMap };
  }
  
  /**
   * Reset input mapping to defaults
   */
  public resetInputMap(): void {
    this.inputMap = {
      'forward': ['w', 'arrowup'],
      'backward': ['s', 'arrowdown'],
      'left': ['a', 'arrowleft'],
      'right': ['d', 'arrowright'],
      'jump': [' ', 'space'],
      'ski': ['shift'],
      'jetpack': ['control'],
      'fire': ['mouse0'], // Left mouse button
      'altFire': ['mouse2'], // Right mouse button
      'reload': ['r'],
      'use': ['e', 'f'],
      'menu': ['escape']
    };
    
    this.logger.debug('Input mapping reset to defaults');
  }
}