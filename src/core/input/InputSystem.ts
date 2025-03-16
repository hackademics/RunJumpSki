import { IInputSystem } from './IInputSystem';
import { 
    InputBinding, 
    InputBindingGroup, 
    InputConfig, 
    InputState, 
    InputActionType,
    InputDeviceType,
    InputActionEvent,
    MouseMovementEvent
} from '../../types/core/InputTypes';
import { EventBus } from '../events/EventBus';
import { InputError } from '../../utils/errors/InputError';

/**
 * Implementation of the input system
 */
export class InputSystem implements IInputSystem {
    private static instance: InputSystem;
    private eventBus: EventBus;
    private config!: InputConfig; // Using definite assignment assertion
    private bindings: Map<string, InputBinding>;
    private bindingGroups: Map<string, InputBindingGroup>;
    private bindingGroupMap: Map<string, InputBindingGroup>;
    private state: {
        pressedKeys: Set<string>;
        pressedButtons: Set<number>;
        mousePosition: { x: number; y: number };
        mouseMovement: { x: number; y: number };
        timestamp: number;
    };
    private previousState: {
        pressedKeys: Set<string>;
        pressedButtons: Set<number>;
        mousePosition: { x: number; y: number };
        mouseMovement: { x: number; y: number };
        timestamp: number;
    };
    private isInitialized: boolean;
    private isPointerLocked: boolean;
    private lastMouseX: number;
    private lastMouseY: number;
    private smoothedMouseMovement: { x: number; y: number };
    private boundHandleKeyDown: (event: KeyboardEvent) => void;
    private boundHandleKeyUp: (event: KeyboardEvent) => void;
    private boundHandleMouseDown: (event: MouseEvent) => void;
    private boundHandleMouseUp: (event: MouseEvent) => void;
    private boundHandleMouseMove: (event: MouseEvent) => void;
    private boundHandlePointerLockChange: (event: Event) => void;
    private boundHandleBlur: () => void;
    private gamepads: Map<number, Gamepad>;
    private lastGamepadState: Map<number, GamepadButton[]>;
    private gamepadPollingInterval: number;
    private inputBuffer: {
        inputs: Array<{
            binding: InputBinding;
            timestamp: number;
            value: number;
        }>;
        maxSize: number;
        timeWindow: number;
    };

    private constructor() {
        this.eventBus = EventBus.getInstance();
        this.bindings = new Map();
        this.bindingGroups = new Map();
        this.bindingGroupMap = new Map();
        this.gamepads = new Map();
        this.lastGamepadState = new Map();
        this.gamepadPollingInterval = 1000 / 60; // 60Hz polling
        this.isInitialized = false;
        this.isPointerLocked = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.smoothedMouseMovement = { x: 0, y: 0 };
        
        // Initialize input buffer
        this.inputBuffer = {
            inputs: [],
            maxSize: 32,
            timeWindow: 500 // 500ms window for input buffering
        };
        
        // Bind event handlers
        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
        this.boundHandleKeyUp = this.handleKeyUp.bind(this);
        this.boundHandleMouseDown = this.handleMouseDown.bind(this);
        this.boundHandleMouseUp = this.handleMouseUp.bind(this);
        this.boundHandleMouseMove = this.handleMouseMove.bind(this);
        this.boundHandlePointerLockChange = this.handlePointerLockChange.bind(this);
        this.boundHandleBlur = this.handleBlur.bind(this);
        
        this.state = {
            pressedKeys: new Set(),
            pressedButtons: new Set(),
            mousePosition: { x: 0, y: 0 },
            mouseMovement: { x: 0, y: 0 },
            timestamp: 0
        };
        
        this.previousState = { 
            pressedKeys: new Set(),
            pressedButtons: new Set(),
            mousePosition: { x: 0, y: 0 },
            mouseMovement: { x: 0, y: 0 },
            timestamp: 0
        };
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): InputSystem {
        if (!InputSystem.instance) {
            InputSystem.instance = new InputSystem();
        }
        return InputSystem.instance;
    }

    /**
     * Initialize the input system
     */
    public initialize(config: InputConfig): void {
        if (this.isInitialized) {
            throw new InputError('initialization', 'Input system is already initialized');
        }

        this.config = config;
        
        // Set up event listeners with bound handlers
        window.addEventListener('keydown', this.boundHandleKeyDown);
        window.addEventListener('keyup', this.boundHandleKeyUp);
        window.addEventListener('mousedown', this.boundHandleMouseDown);
        window.addEventListener('mouseup', this.boundHandleMouseUp);
        window.addEventListener('mousemove', this.boundHandleMouseMove);
        window.addEventListener('pointerlockchange', this.boundHandlePointerLockChange);
        window.addEventListener('blur', this.boundHandleBlur);
        window.addEventListener('gamepadconnected', this.handleGamepadConnected.bind(this));
        window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected.bind(this));

        // Initialize binding groups
        config.bindingGroups.forEach(group => this.addBindingGroup(group));

        this.isInitialized = true;
    }

    /**
     * Update input state
     */
    public update(deltaTime: number): void {
        if (!this.isInitialized) {
            throw new InputError('update', 'Input system is not initialized');
        }

        // Update gamepad state
        this.updateGamepads();

        // Store previous state with proper deep cloning
        this.previousState = {
            pressedKeys: new Set(this.state.pressedKeys),
            pressedButtons: new Set(this.state.pressedButtons),
            mousePosition: { ...this.state.mousePosition },
            mouseMovement: { ...this.state.mouseMovement },
            timestamp: this.state.timestamp
        };

        // Clean up old input buffer entries
        this.cleanInputBuffer();

        // Update mouse movement smoothing
        if (this.config.mouseSmoothing) {
            this.smoothedMouseMovement.x = this.lerp(
                this.smoothedMouseMovement.x,
                this.state.mouseMovement.x,
                this.config.mouseSmoothingFactor * deltaTime
            );
            this.smoothedMouseMovement.y = this.lerp(
                this.smoothedMouseMovement.y,
                this.state.mouseMovement.y,
                this.config.mouseSmoothingFactor * deltaTime
            );
        }

        // Process held inputs
        this.bindings.forEach(binding => {
            if (binding.actionType === InputActionType.Held) {
                if (this.isPressed(binding.id)) {
                    this.emitInputEvent(binding, 1);
                }
            }
        });

        // Reset frame-specific state
        this.state.mouseMovement = { x: 0, y: 0 };
        this.state.timestamp = Date.now();
    }

    /**
     * Add an input binding
     */
    public addBinding(binding: InputBinding): void {
        if (this.bindings.has(binding.id)) {
            throw new InputError('binding', `Binding with id ${binding.id} already exists`);
        }
        this.bindings.set(binding.id, binding);
    }

    /**
     * Remove an input binding
     */
    public removeBinding(bindingId: string): void {
        this.bindings.delete(bindingId);
    }

    /**
     * Add a binding group
     */
    public addBindingGroup(group: InputBindingGroup): void {
        if (this.bindingGroups.has(group.id)) {
            throw new InputError('binding', `Binding group with id ${group.id} already exists`);
        }
        this.bindingGroups.set(group.id, group);
        group.bindings.forEach(binding => {
            this.addBinding(binding);
            this.updateBindingGroupCache(binding);
        });
    }

    /**
     * Remove a binding group
     */
    public removeBindingGroup(groupId: string): void {
        const group = this.bindingGroups.get(groupId);
        if (group) {
            group.bindings.forEach(binding => {
                this.removeBinding(binding.id);
                this.bindingGroupMap.delete(binding.id);
            });
            this.bindingGroups.delete(groupId);
        }
    }

    /**
     * Enable/disable a binding group
     */
    public setBindingGroupEnabled(groupId: string, enabled: boolean): void {
        const group = this.bindingGroups.get(groupId);
        if (group) {
            this.bindingGroups.set(groupId, { ...group, enabled });
        }
    }

    /**
     * Check if an input is pressed
     */
    public isPressed(bindingId: string): boolean {
        const binding = this.bindings.get(bindingId);
        if (!binding) return false;
        
        // Check if the binding's group is enabled
        const group = this.findBindingGroup(bindingId);
        if (group && !group.enabled) return false;
        
        let gamepad: Gamepad | undefined;
        
        switch (binding.device) {
            case InputDeviceType.Keyboard:
                return this.state.pressedKeys.has(binding.key as string);
            case InputDeviceType.Mouse:
                return this.state.pressedButtons.has(binding.key as number);
            case InputDeviceType.Gamepad:
                gamepad = Array.from(this.gamepads.values())[0];
                if (!gamepad) return false;
                
                if (typeof binding.key === 'number') {
                    return gamepad.buttons[binding.key]?.pressed || false;
                } else if (typeof binding.key === 'string' && binding.key.startsWith('axis')) {
                    const axisIndex = parseInt(binding.key.slice(4));
                    const value = gamepad.axes[axisIndex] || 0;
                    const threshold = binding.threshold || 0.5;
                    return Math.abs(value) > threshold;
                }
                return false;
            default:
                return false;
        }
    }

    /**
     * Check if an input is held
     */
    public isHeld(bindingId: string): boolean {
        // For now, just use isPressed, but in the future we could add timing logic
        return this.isPressed(bindingId);
    }

    /**
     * Get input value
     */
    public getValue(bindingId: string): number {
        const binding = this.bindings.get(bindingId);
        if (!binding) return 0;
        
        // Check if the binding's group is enabled
        const group = this.findBindingGroup(bindingId);
        if (group && !group.enabled) return 0;
        
        let gamepad: Gamepad | undefined;
        let axisIndex: number;
        let value: number;
        
        switch (binding.device) {
            case InputDeviceType.Keyboard:
                return this.state.pressedKeys.has(binding.key as string) ? 1 : 0;
            case InputDeviceType.Mouse:
                return this.state.pressedButtons.has(binding.key as number) ? 1 : 0;
            case InputDeviceType.Gamepad:
                gamepad = Array.from(this.gamepads.values())[0];
                if (!gamepad) return 0;
                
                if (typeof binding.key === 'number') {
                    return gamepad.buttons[binding.key]?.value || 0;
                } else if (typeof binding.key === 'string' && binding.key.startsWith('axis')) {
                    axisIndex = parseInt(binding.key.slice(4));
                    value = gamepad.axes[axisIndex] || 0;
                    
                    // Apply deadzone
                    const deadzone = binding.deadzone || 0.1;
                    if (Math.abs(value) < deadzone) {
                        return 0;
                    }
                    
                    // Normalize value after deadzone
                    const sign = Math.sign(value);
                    value = (Math.abs(value) - deadzone) / (1 - deadzone);
                    return sign * value;
                }
                return 0;
            default:
                return 0;
        }
    }

    /**
     * Get mouse position
     */
    public getMousePosition(): { x: number; y: number } {
        return this.state.mousePosition;
    }

    /**
     * Get mouse movement
     */
    public getMouseMovement(): { x: number; y: number } {
        return this.config.mouseSmoothing ? this.smoothedMouseMovement : this.state.mouseMovement;
    }

    /**
     * Set pointer lock
     */
    public setPointerLocked(locked: boolean): void {
        if (locked && !this.isPointerLocked) {
            document.body.requestPointerLock();
        } else if (!locked && this.isPointerLocked) {
            document.exitPointerLock();
        }
    }

    /**
     * Get current state
     */
    public getState(): InputState {
        return { ...this.state };
    }

    /**
     * Clean up
     */
    public dispose(): void {
        // Remove event listeners with bound handlers
        window.removeEventListener('keydown', this.boundHandleKeyDown);
        window.removeEventListener('keyup', this.boundHandleKeyUp);
        window.removeEventListener('mousedown', this.boundHandleMouseDown);
        window.removeEventListener('mouseup', this.boundHandleMouseUp);
        window.removeEventListener('mousemove', this.boundHandleMouseMove);
        window.removeEventListener('pointerlockchange', this.boundHandlePointerLockChange);
        window.removeEventListener('blur', this.boundHandleBlur);
        window.removeEventListener('gamepadconnected', this.handleGamepadConnected.bind(this));
        window.removeEventListener('gamepaddisconnected', this.handleGamepadDisconnected.bind(this));
        
        this.bindings.clear();
        this.bindingGroups.clear();
        this.bindingGroupMap.clear();
        this.gamepads.clear();
        this.lastGamepadState.clear();
        this.inputBuffer.inputs = [];
        this.isInitialized = false;
    }

    /**
     * Get the input buffer for a specific binding within the time window
     */
    public getInputBuffer(bindingId: string): Array<{ timestamp: number; value: number }> {
        const now = Date.now();
        return this.inputBuffer.inputs
            .filter(input => input.binding.id === bindingId && 
                           now - input.timestamp <= this.inputBuffer.timeWindow)
            .map(({ timestamp, value }) => ({ timestamp, value }));
    }

    private handleKeyDown(event: KeyboardEvent): void {
        if (!this.isInitialized) return;

        // Prevent default for bound keys
        if (Array.from(this.bindings.values()).some(binding => 
            binding.device === InputDeviceType.Keyboard && binding.key === event.code)) {
            event.preventDefault();
        }

        this.state.pressedKeys.add(event.code);
        this.processInput(event.code, InputDeviceType.Keyboard, InputActionType.Pressed);
    }

    private handleKeyUp(event: KeyboardEvent): void {
        if (!this.isInitialized) return;

        this.state.pressedKeys.delete(event.code);
        this.processInput(event.code, InputDeviceType.Keyboard, InputActionType.Released);
    }

    private handleMouseDown(event: MouseEvent): void {
        if (!this.isInitialized) return;

        // Prevent default for bound mouse buttons
        if (Array.from(this.bindings.values()).some(binding => 
            binding.device === InputDeviceType.Mouse && binding.key === event.button)) {
            event.preventDefault();
        }

        this.state.pressedButtons.add(event.button);
        this.processInput(event.button, InputDeviceType.Mouse, InputActionType.Pressed);
    }

    private handleMouseUp(event: MouseEvent): void {
        if (!this.isInitialized) return;

        this.state.pressedButtons.delete(event.button);
        this.processInput(event.button, InputDeviceType.Mouse, InputActionType.Released);
    }

    private handleMouseMove(event: MouseEvent): void {
        if (!this.isInitialized) return;

        if (this.isPointerLocked) {
            const movementX = event.movementX * this.config.mouseSensitivity;
            const movementY = event.movementY * this.config.mouseSensitivity;

            this.state.mouseMovement.x = movementX;
            this.state.mouseMovement.y = movementY;

            const mouseEvent: MouseMovementEvent = {
                movementX,
                movementY,
                deltaX: movementX,
                deltaY: movementY,
                timestamp: Date.now()
            };

            this.eventBus.emit('input:mouse:move', mouseEvent);
        } else {
            this.state.mousePosition.x = event.clientX;
            this.state.mousePosition.y = event.clientY;
        }
    }

    private handlePointerLockChange(): void {
        this.isPointerLocked = document.pointerLockElement === document.body;
        this.eventBus.emit('input:pointer:lock', { locked: this.isPointerLocked });
    }

    private handleBlur(): void {
        if (!this.isInitialized) return;

        // Clear all pressed inputs on window blur
        this.state.pressedKeys.clear();
        this.state.pressedButtons.clear();
        this.state.mouseMovement = { x: 0, y: 0 };

        // Emit release events for all held bindings
        this.bindings.forEach(binding => {
            if (this.isPressed(binding.id)) {
                this.emitInputEvent(binding, 0);
            }
        });
    }

    private handleGamepadConnected(event: GamepadEvent): void {
        if (!this.isInitialized) return;
        
        const gamepad = event.gamepad;
        this.gamepads.set(gamepad.index, gamepad);
        this.lastGamepadState.set(gamepad.index, Array.from(gamepad.buttons));
        
        this.eventBus.emit('input:gamepad:connected', {
            index: gamepad.index,
            id: gamepad.id
        });
    }

    private handleGamepadDisconnected(event: GamepadEvent): void {
        if (!this.isInitialized) return;
        
        const gamepad = event.gamepad;
        this.gamepads.delete(gamepad.index);
        this.lastGamepadState.delete(gamepad.index);
        
        this.eventBus.emit('input:gamepad:disconnected', {
            index: gamepad.index,
            id: gamepad.id
        });
    }

    private updateGamepads(): void {
        const gamepads = navigator.getGamepads();
        if (!gamepads) return;

        for (const gamepad of gamepads) {
            if (!gamepad) continue;
            
            this.gamepads.set(gamepad.index, gamepad);
            const lastState = this.lastGamepadState.get(gamepad.index);
            
            if (!lastState) {
                this.lastGamepadState.set(gamepad.index, Array.from(gamepad.buttons));
                continue;
            }

            // Process buttons with bounds checking
            const buttonCount = Math.min(gamepad.buttons.length, lastState.length);
            for (let index = 0; index < buttonCount; index++) {
                const button = gamepad.buttons[index];
                if (!button) continue;

                const value = button.value;
                const wasPressed = lastState[index]?.pressed;
                const isPressed = button.pressed;

                if (wasPressed !== isPressed) {
                    this.processInput(
                        index,
                        InputDeviceType.Gamepad,
                        isPressed ? InputActionType.Pressed : InputActionType.Released,
                        value
                    );
                } else if (isPressed && Math.abs(value - (lastState[index]?.value || 0)) > Number.EPSILON) {
                    this.processInput(
                        index,
                        InputDeviceType.Gamepad,
                        InputActionType.Held,
                        value
                    );
                }
            }

            // Process axes with bounds checking
            const axisCount = gamepad.axes.length;
            for (let i = 0; i < axisCount; i++) {
                const value = gamepad.axes[i];
                if (typeof value !== 'number') continue;

                if (Math.abs(value) > this.config.gamepadDeadzone) {
                    this.processInput(
                        `axis${i}`,
                        InputDeviceType.Gamepad,
                        InputActionType.Held,
                        value
                    );
                }
            }
            
            this.lastGamepadState.set(gamepad.index, Array.from(gamepad.buttons));
        }
    }

    private processInput(key: string | number, device: InputDeviceType, actionType: InputActionType, value: number = 1): void {
        this.bindings.forEach(binding => {
            if (binding.device === device && binding.key === key) {
                const group = this.findBindingGroup(binding.id);
                if (!group || group.enabled) {
                    if (binding.actionType === actionType || 
                        (binding.actionType === InputActionType.Held && actionType === InputActionType.Pressed)) {
                        this.emitInputEvent(binding, value);
                        this.addToInputBuffer(binding, value);
                    }
                }
            }
        });
    }

    private emitInputEvent(binding: InputBinding, value: number): void {
        const event: InputActionEvent = {
            bindingId: binding.id,
            device: binding.device,
            actionType: binding.actionType,
            value,
            timestamp: Date.now()
        };
        this.eventBus.emit('input:action', event);
    }

    private findBindingGroup(bindingId: string): InputBindingGroup | undefined {
        return this.bindingGroupMap.get(bindingId);
    }

    private updateBindingGroupCache(binding: InputBinding): void {
        for (const group of this.bindingGroups.values()) {
            if (group.bindings.some(b => b.id === binding.id)) {
                this.bindingGroupMap.set(binding.id, group);
                return;
            }
        }
    }

    private lerp(start: number, end: number, t: number): number {
        return start + (end - start) * Math.min(Math.max(t, 0), 1);
    }

    private addToInputBuffer(binding: InputBinding, value: number): void {
        const now = performance.now(); // Use performance.now() for more precise timing
        
        this.inputBuffer.inputs.push({
            binding,
            timestamp: now,
            value
        });

        // Trim buffer if it exceeds max size
        if (this.inputBuffer.inputs.length > this.inputBuffer.maxSize) {
            this.inputBuffer.inputs = this.inputBuffer.inputs.slice(-this.inputBuffer.maxSize);
        }
    }

    private cleanInputBuffer(): void {
        const now = performance.now();
        const cutoff = now - this.inputBuffer.timeWindow;
        
        // Use filter in place to avoid array creation
        let writeIndex = 0;
        for (let readIndex = 0; readIndex < this.inputBuffer.inputs.length; readIndex++) {
            const input = this.inputBuffer.inputs[readIndex];
            if (input.timestamp >= cutoff) {
                if (writeIndex !== readIndex) {
                    this.inputBuffer.inputs[writeIndex] = input;
                }
                writeIndex++;
            }
        }
        this.inputBuffer.inputs.length = writeIndex;
    }
} 