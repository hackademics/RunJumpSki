/**
 * @file src/game/input/GameInput.ts
 * @description Game input handling interface and implementation
 */

import * as BABYLON from 'babylonjs';

/**
 * Input state for the game
 */
export interface GameInput {
  /**
   * Horizontal movement input (-1 to 1, left to right)
   */
  horizontal: number;
  
  /**
   * Vertical movement input (-1 to 1, backward to forward)
   */
  vertical: number;
  
  /**
   * Mouse or camera delta X
   */
  mouseDeltaX: number;
  
  /**
   * Mouse or camera delta Y
   */
  mouseDeltaY: number;
  
  /**
   * Jump button state
   */
  jump: boolean;
  
  /**
   * Sprint button state
   */
  sprint: boolean;
  
  /**
   * Ski button state
   */
  ski: boolean;
  
  /**
   * Jetpack button state
   */
  jetpack: boolean;
  
  /**
   * Thrust input for jetpack (0 to 1)
   */
  thrust: number;
  
  /**
   * Action button state
   */
  action: boolean;
  
  /**
   * Pause button state
   */
  pause: boolean;
  
  /**
   * View toggle button state
   */
  viewToggle: boolean;
  
  /**
   * Camera rotation (quaternion)
   */
  cameraRotation: BABYLON.Quaternion;
}

/**
 * Input manager configuration
 */
export interface InputManagerConfig {
  /**
   * Whether to use pointer lock for mouse control
   */
  usePointerLock: boolean;
  
  /**
   * Mouse sensitivity
   */
  mouseSensitivity: number;
  
  /**
   * Controller stick deadzone
   */
  controllerDeadzone: number;
  
  /**
   * Whether to invert Y axis
   */
  invertY: boolean;
  
  /**
   * Whether to use gamepad if available
   */
  useGamepad: boolean;
}

/**
 * Default input manager configuration
 */
export const DEFAULT_INPUT_CONFIG: InputManagerConfig = {
  usePointerLock: true,
  mouseSensitivity: 0.002,
  controllerDeadzone: 0.1,
  invertY: false,
  useGamepad: true
};

/**
 * Input manager class that handles keyboard, mouse and gamepad input
 */
export class InputManager {
  private config: InputManagerConfig;
  private currentState: GameInput;
  private scene: BABYLON.Scene;
  private canvas: HTMLCanvasElement;
  private previousMouseX: number;
  private previousMouseY: number;
  private pointerLocked: boolean;
  private keyboardMap: Map<string, boolean>;
  private gamepad: BABYLON.Gamepad | null;
  
  /**
   * Creates a new input manager
   * @param scene The Babylon.js scene
   * @param canvas The canvas element
   * @param config Input manager configuration
   */
  constructor(scene: BABYLON.Scene, canvas: HTMLCanvasElement, config?: Partial<InputManagerConfig>) {
    this.scene = scene;
    this.canvas = canvas;
    this.config = { ...DEFAULT_INPUT_CONFIG, ...config };
    
    this.previousMouseX = 0;
    this.previousMouseY = 0;
    this.pointerLocked = false;
    this.keyboardMap = new Map<string, boolean>();
    this.gamepad = null;
    
    // Initialize input state
    this.currentState = {
      horizontal: 0,
      vertical: 0,
      mouseDeltaX: 0,
      mouseDeltaY: 0,
      jump: false,
      sprint: false,
      ski: false,
      jetpack: false,
      thrust: 0,
      action: false,
      pause: false,
      viewToggle: false,
      cameraRotation: BABYLON.Quaternion.Identity()
    };
    
    this.initialize();
  }
  
  /**
   * Initialize input handling
   */
  private initialize(): void {
    // Set up keyboard events
    this.scene.onKeyboardObservable.add((kbInfo) => {
      // Track key state
      if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
        this.keyboardMap.set(kbInfo.event.code, true);
      } else if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYUP) {
        this.keyboardMap.set(kbInfo.event.code, false);
      }
    });
    
    // Set up mouse events
    this.scene.onPointerObservable.add((pointerInfo) => {
      if (this.config.usePointerLock && this.pointerLocked) {
        if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
          const event = pointerInfo.event as PointerEvent;
          
          // Store deltas
          this.currentState.mouseDeltaX = event.movementX * this.config.mouseSensitivity;
          this.currentState.mouseDeltaY = event.movementY * (this.config.invertY ? 1 : -1) * 
            this.config.mouseSensitivity;
        }
      } else {
        if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
          const event = pointerInfo.event as PointerEvent;
          
          // Calculate deltas from previous position
          this.currentState.mouseDeltaX = (event.clientX - this.previousMouseX) * 
            this.config.mouseSensitivity;
          this.currentState.mouseDeltaY = (event.clientY - this.previousMouseY) * 
            (this.config.invertY ? 1 : -1) * this.config.mouseSensitivity;
          
          this.previousMouseX = event.clientX;
          this.previousMouseY = event.clientY;
        }
      }
      
      // Handle pointer down/up for actions
      if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
        if (pointerInfo.event.button === 0) { // Left click
          this.currentState.action = true;
        }
      } else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERUP) {
        if (pointerInfo.event.button === 0) { // Left click
          this.currentState.action = false;
        }
      }
    });
    
    // Set up pointer lock if enabled
    if (this.config.usePointerLock) {
      // Request pointer lock when canvas is clicked
      this.canvas.addEventListener('click', () => {
        this.canvas.requestPointerLock = this.canvas.requestPointerLock ||
          (this.canvas as any).mozRequestPointerLock ||
          (this.canvas as any).webkitRequestPointerLock;
        
        if (this.canvas.requestPointerLock) {
          this.canvas.requestPointerLock();
        }
      });
      
      // Handle pointer lock change
      const pointerLockChange = () => {
        this.pointerLocked = (
          document.pointerLockElement === this.canvas ||
          (document as any).mozPointerLockElement === this.canvas ||
          (document as any).webkitPointerLockElement === this.canvas
        );
      };
      
      // Listen for pointer lock change events
      document.addEventListener('pointerlockchange', pointerLockChange, false);
      document.addEventListener('mozpointerlockchange', pointerLockChange, false);
      document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
    }
    
    // Set up gamepad support if enabled
    if (this.config.useGamepad) {
      // Register gamepad connected event
      const gamepadManager = new BABYLON.GamepadManager();
      gamepadManager.onGamepadConnectedObservable.add((gamepad) => {
        this.gamepad = gamepad;
      });
      
      // Register gamepad disconnected event
      gamepadManager.onGamepadDisconnectedObservable.add((gamepad) => {
        if (this.gamepad === gamepad) {
          this.gamepad = null;
        }
      });
    }
  }
  
  /**
   * Update the input state
   * @returns Current input state
   */
  public update(): GameInput {
    // Reset delta values
    this.currentState.mouseDeltaX = 0;
    this.currentState.mouseDeltaY = 0;
    
    // Handle keyboard input
    this.updateKeyboardInput();
    
    // Handle gamepad input if available
    if (this.gamepad && this.config.useGamepad) {
      this.updateGamepadInput();
    }
    
    // Return the current state
    return this.currentState;
  }
  
  /**
   * Update keyboard input state
   */
  private updateKeyboardInput(): void {
    // Movement
    this.currentState.horizontal = 0;
    this.currentState.vertical = 0;
    
    if (this.isKeyDown('KeyW') || this.isKeyDown('ArrowUp')) {
      this.currentState.vertical += 1;
    }
    
    if (this.isKeyDown('KeyS') || this.isKeyDown('ArrowDown')) {
      this.currentState.vertical -= 1;
    }
    
    if (this.isKeyDown('KeyA') || this.isKeyDown('ArrowLeft')) {
      this.currentState.horizontal -= 1;
    }
    
    if (this.isKeyDown('KeyD') || this.isKeyDown('ArrowRight')) {
      this.currentState.horizontal += 1;
    }
    
    // Actions
    this.currentState.jump = this.isKeyDown('Space');
    this.currentState.sprint = this.isKeyDown('ShiftLeft') || this.isKeyDown('ShiftRight');
    this.currentState.ski = this.isKeyDown('KeyC');
    this.currentState.jetpack = this.isKeyDown('KeyJ');
    this.currentState.thrust = this.isKeyDown('Space') ? 1 : 0;
    this.currentState.pause = this.isKeyDown('Escape');
    this.currentState.viewToggle = this.isKeyDown('KeyV');
  }
  
  /**
   * Update gamepad input state
   */
  private updateGamepadInput(): void {
    if (!this.gamepad) return;
    
    const pad = this.gamepad;
    const deadzone = this.config.controllerDeadzone;
    
    // Left stick for movement
    const leftX = Math.abs(pad.leftStick.x) > deadzone ? pad.leftStick.x : 0;
    const leftY = Math.abs(pad.leftStick.y) > deadzone ? pad.leftStick.y : 0;
    
    // Right stick for camera
    const rightX = Math.abs(pad.rightStick.x) > deadzone ? pad.rightStick.x : 0;
    const rightY = Math.abs(pad.rightStick.y) > deadzone ? pad.rightStick.y : 0;
    
    // Apply gamepad input if greater than current value
    if (Math.abs(leftX) > Math.abs(this.currentState.horizontal)) {
      this.currentState.horizontal = leftX;
    }
    
    if (Math.abs(leftY) > Math.abs(this.currentState.vertical)) {
      this.currentState.vertical = -leftY; // Inverted Y axis on gamepad
    }
    
    // Camera movement from right stick
    this.currentState.mouseDeltaX += rightX * 0.05;
    this.currentState.mouseDeltaY += rightY * (this.config.invertY ? 1 : -1) * 0.05;
    
    // Buttons - using Xbox controller mapping
    // A button (0), B button (1), X button (2), Y button (3)
    // LB (4), RB (5), LT (6), RT (7), Select (8), Start (9)
    this.currentState.jump = this.currentState.jump || 
      (pad.browserGamepad.buttons[0]?.pressed ?? false);
    this.currentState.sprint = this.currentState.sprint || 
      (pad.browserGamepad.buttons[1]?.pressed ?? false);
    this.currentState.ski = this.currentState.ski || 
      (pad.browserGamepad.buttons[6]?.pressed ?? false);
    this.currentState.jetpack = this.currentState.jetpack || 
      (pad.browserGamepad.buttons[7]?.pressed ?? false);
    this.currentState.thrust = Math.max(this.currentState.thrust, 
      pad.browserGamepad.buttons[7]?.value ?? 0);
    this.currentState.action = this.currentState.action || 
      (pad.browserGamepad.buttons[2]?.pressed ?? false);
    this.currentState.pause = this.currentState.pause || 
      (pad.browserGamepad.buttons[9]?.pressed ?? false);
    this.currentState.viewToggle = this.currentState.viewToggle || 
      (pad.browserGamepad.buttons[3]?.pressed ?? false);
  }
  
  /**
   * Check if a key is currently pressed
   * @param keyCode Key code to check
   * @returns Whether the key is pressed
   */
  private isKeyDown(keyCode: string): boolean {
    return this.keyboardMap.get(keyCode) === true;
  }
  
  /**
   * Get the current input state
   * @returns Current input state
   */
  public getInput(): GameInput {
    return { ...this.currentState };
  }
  
  /**
   * Dispose of the input manager
   */
  public dispose(): void {
    // Clean up event listeners and resources
    if (this.config.usePointerLock) {
      document.removeEventListener('pointerlockchange', () => {});
      document.removeEventListener('mozpointerlockchange', () => {});
      document.removeEventListener('webkitpointerlockchange', () => {});
    }
  }
}
