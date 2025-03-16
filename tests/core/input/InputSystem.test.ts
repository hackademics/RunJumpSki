import { InputSystem } from '../../../src/core/input/InputSystem';
import { EventBus } from '../../../src/core/events/EventBus';
import { 
    InputActionType, 
    InputDeviceType, 
    InputBinding,
    InputBindingGroup,
    InputConfig
} from '../../../src/types/core/InputTypes';
import { InputError } from '../../../src/utils/errors/InputError';

jest.mock('../../../src/core/events/EventBus');

describe('InputSystem', () => {
    let inputSystem: InputSystem;
    let eventBus: jest.Mocked<EventBus>;
    let mockConfig: InputConfig;

    // Mock GamepadButton type
    interface MockGamepadButton {
        pressed: boolean;
        touched: boolean;
        value: number;
    }

    // Mock Gamepad for testing
    interface MockGamepad {
        axes: number[];
        buttons: MockGamepadButton[];
        connected: boolean;
        id: string;
        index: number;
        mapping: 'standard' | 'xr-standard' | '';
        timestamp: number;
        vibrationActuator: null | {
            type: 'dual-rumble';
            playEffect: () => Promise<boolean>;
            reset: () => Promise<boolean>;
        };
        hapticActuators: [];
    }

    let mockGamepad: MockGamepad;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock event bus
        eventBus = EventBus.getInstance() as jest.Mocked<EventBus>;

        // Create test config
        mockConfig = {
            bindingGroups: [
                {
                    id: 'movement',
                    enabled: true,
                    bindings: [
                        {
                            id: 'move_forward',
                            device: InputDeviceType.Keyboard,
                            key: 'KeyW',
                            actionType: InputActionType.Held
                        },
                        {
                            id: 'jump',
                            device: InputDeviceType.Keyboard,
                            key: 'Space',
                            actionType: InputActionType.Pressed
                        }
                    ]
                },
                {
                    id: 'combat',
                    enabled: true,
                    bindings: [
                        {
                            id: 'fire',
                            device: InputDeviceType.Mouse,
                            key: 0, // Left click
                            actionType: InputActionType.Pressed
                        }
                    ]
                }
            ],
            mouseSensitivity: 1.0,
            mouseSmoothing: true,
            mouseSmoothingFactor: 0.5,
            gamepadDeadzone: 0.1
        };

        // Mock gamepad with proper types
        mockGamepad = {
            axes: [0, 0, 0, 0],
            buttons: [
                { pressed: false, touched: false, value: 0 },
                { pressed: false, touched: false, value: 0 }
            ],
            connected: true,
            id: 'Mock Gamepad',
            index: 0,
            mapping: 'standard',
            timestamp: Date.now(),
            vibrationActuator: {
                type: 'dual-rumble',
                playEffect: () => Promise.resolve(true),
                reset: () => Promise.resolve(true)
            },
            hapticActuators: []
        };

        // Mock navigator.getGamepads with our mock type
        global.navigator.getGamepads = jest.fn().mockReturnValue([mockGamepad]);

        // Get system instance
        inputSystem = InputSystem.getInstance();
        inputSystem.initialize(mockConfig);
    });

    afterEach(() => {
        inputSystem.dispose();
    });

    describe('Initialization', () => {
        it('should initialize with config', () => {
            expect(() => inputSystem.initialize(mockConfig)).toThrow(InputError);
        });

        it('should set up binding groups', () => {
            expect(inputSystem.isPressed('move_forward')).toBe(false);
            expect(inputSystem.isPressed('jump')).toBe(false);
            expect(inputSystem.isPressed('fire')).toBe(false);
        });
    });

    describe('Keyboard Input', () => {
        it('should handle key press and release', () => {
            // Simulate key press
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
            expect(inputSystem.isPressed('move_forward')).toBe(true);
            expect(eventBus.emit).toHaveBeenCalledWith('input:action', expect.objectContaining({
                bindingId: 'move_forward',
                device: InputDeviceType.Keyboard,
                actionType: InputActionType.Held,
                value: 1
            }));

            // Simulate key release
            window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
            expect(inputSystem.isPressed('move_forward')).toBe(false);
        });

        it('should handle multiple keys', () => {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
            
            expect(inputSystem.isPressed('move_forward')).toBe(true);
            expect(inputSystem.isPressed('jump')).toBe(true);
        });

        it('should clear keys on blur', () => {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
            expect(inputSystem.isPressed('move_forward')).toBe(true);

            window.dispatchEvent(new Event('blur'));
            expect(inputSystem.isPressed('move_forward')).toBe(false);
        });
    });

    describe('Mouse Input', () => {
        it('should handle mouse buttons', () => {
            window.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
            expect(inputSystem.isPressed('fire')).toBe(true);

            window.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
            expect(inputSystem.isPressed('fire')).toBe(false);
        });

        it('should handle mouse movement with pointer lock', () => {
            // Mock pointer lock
            Object.defineProperty(document, 'pointerLockElement', {
                value: document.body,
                writable: true
            });

            const movement = { movementX: 10, movementY: -5 };
            window.dispatchEvent(new MouseEvent('mousemove', movement));

            const mouseMovement = inputSystem.getMouseMovement();
            expect(mouseMovement.x).toBe(movement.movementX * mockConfig.mouseSensitivity);
            expect(mouseMovement.y).toBe(movement.movementY * mockConfig.mouseSensitivity);
        });

        it('should apply mouse smoothing', () => {
            Object.defineProperty(document, 'pointerLockElement', {
                value: document.body,
                writable: true
            });

            // Simulate multiple mouse movements
            window.dispatchEvent(new MouseEvent('mousemove', { movementX: 10, movementY: 10 }));
            inputSystem.update(1/60); // 60 FPS

            const smoothedMovement = inputSystem.getMouseMovement();
            expect(smoothedMovement.x).toBeLessThan(10); // Should be smoothed
            expect(smoothedMovement.y).toBeLessThan(10); // Should be smoothed
        });
    });

    describe('Binding Groups', () => {
        it('should enable/disable binding groups', () => {
            inputSystem.setBindingGroupEnabled('movement', false);
            
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
            expect(inputSystem.isPressed('move_forward')).toBe(false);

            inputSystem.setBindingGroupEnabled('movement', true);
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
            expect(inputSystem.isPressed('move_forward')).toBe(true);
        });

        it('should handle binding group removal', () => {
            inputSystem.removeBindingGroup('movement');
            
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
            expect(inputSystem.isPressed('move_forward')).toBe(false);
            expect(inputSystem.isPressed('jump')).toBe(false);
        });
    });

    describe('State Management', () => {
        it('should maintain previous state', () => {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
            inputSystem.update(1/60);
            
            const state = inputSystem.getState();
            expect(state.pressedKeys.has('KeyW')).toBe(true);
        });

        it('should reset frame-specific state', () => {
            Object.defineProperty(document, 'pointerLockElement', {
                value: document.body,
                writable: true
            });

            window.dispatchEvent(new MouseEvent('mousemove', { movementX: 10, movementY: 10 }));
            inputSystem.update(1/60);

            const state = inputSystem.getState();
            expect(state.mouseMovement.x).toBe(0);
            expect(state.mouseMovement.y).toBe(0);
        });
    });

    describe('Error Handling', () => {
        it('should throw on duplicate binding', () => {
            const binding: InputBinding = {
                id: 'move_forward',
                device: InputDeviceType.Keyboard,
                key: 'KeyW',
                actionType: InputActionType.Held
            };

            expect(() => inputSystem.addBinding(binding)).toThrow(InputError);
        });

        it('should throw on duplicate binding group', () => {
            const group: InputBindingGroup = {
                id: 'movement',
                enabled: true,
                bindings: []
            };

            expect(() => inputSystem.addBindingGroup(group)).toThrow(InputError);
        });
    });

    describe('Edge Cases', () => {
        it('should handle rapid key presses', () => {
            // Simulate very fast key presses
            for (let i = 0; i < 10; i++) {
                window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
                window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
            }
            
            const buffer = inputSystem.getInputBuffer('jump');
            expect(buffer.length).toBeGreaterThan(0);
            expect(buffer.length).toBeLessThanOrEqual(32); // Max buffer size
        });

        it('should handle simultaneous key presses', () => {
            const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'];
            keys.forEach(key => {
                window.dispatchEvent(new KeyboardEvent('keydown', { code: key }));
            });

            // All keys should be registered
            expect(inputSystem.isPressed('move_forward')).toBe(true);
            expect(inputSystem.isPressed('jump')).toBe(true);

            // Release all keys
            keys.forEach(key => {
                window.dispatchEvent(new KeyboardEvent('keyup', { code: key }));
            });
        });

        it('should handle invalid input device types', () => {
            const invalidBinding: InputBinding = {
                id: 'invalid',
                device: 999 as InputDeviceType, // Invalid device type
                key: 'Space',
                actionType: InputActionType.Pressed
            };

            expect(() => inputSystem.addBinding(invalidBinding)).toThrow(InputError);
        });

        it('should handle null gamepad values', () => {
            // Mock navigator.getGamepads to return null values
            global.navigator.getGamepads = jest.fn().mockReturnValue([null, null, null, null]);
            
            // Should not throw when updating
            expect(() => inputSystem.update(1/60)).not.toThrow();
        });

        it('should handle undefined gamepad values', () => {
            // Mock navigator.getGamepads to return undefined
            global.navigator.getGamepads = jest.fn().mockReturnValue(undefined);
            
            // Should not throw when updating
            expect(() => inputSystem.update(1/60)).not.toThrow();
        });

        it('should handle invalid axis indices', () => {
            const binding: InputBinding = {
                id: 'invalid_axis',
                device: InputDeviceType.Gamepad,
                key: 'axis999', // Invalid axis index
                actionType: InputActionType.Held
            };

            inputSystem.addBinding(binding);
            
            // Update should not throw with invalid axis
            expect(() => inputSystem.update(1/60)).not.toThrow();
            expect(inputSystem.getValue('invalid_axis')).toBe(0);
        });

        it('should handle extremely large mouse movements', () => {
            Object.defineProperty(document, 'pointerLockElement', {
                value: document.body,
                writable: true
            });

            // Simulate extremely large mouse movement
            window.dispatchEvent(new MouseEvent('mousemove', { 
                movementX: 9999,
                movementY: 9999
            }));

            const movement = inputSystem.getMouseMovement();
            expect(Math.abs(movement.x)).toBeLessThan(9999); // Should be clamped
            expect(Math.abs(movement.y)).toBeLessThan(9999); // Should be clamped
        });

        it('should handle negative mouse sensitivity', () => {
            const configWithNegativeSensitivity: InputConfig = {
                ...mockConfig,
                mouseSensitivity: -1.0
            };

            // Should clamp to positive value or handle appropriately
            inputSystem.initialize(configWithNegativeSensitivity);
            
            Object.defineProperty(document, 'pointerLockElement', {
                value: document.body,
                writable: true
            });

            window.dispatchEvent(new MouseEvent('mousemove', { 
                movementX: 10,
                movementY: 10
            }));

            const movement = inputSystem.getMouseMovement();
            expect(movement.x).not.toBeNaN();
            expect(movement.y).not.toBeNaN();
        });

        it('should handle extremely small time deltas', () => {
            // Update with very small delta time
            expect(() => inputSystem.update(0.0001)).not.toThrow();
        });

        it('should handle zero time delta', () => {
            // Update with zero delta time
            expect(() => inputSystem.update(0)).not.toThrow();
        });

        it('should handle negative time delta', () => {
            // Update with negative delta time
            expect(() => inputSystem.update(-1)).not.toThrow();
        });
    });

    describe('Gamepad Input', () => {
        beforeEach(() => {
            // Mock navigator.getGamepads with proper mock gamepad
            global.navigator.getGamepads = jest.fn().mockReturnValue([{
                ...mockGamepad,
                vibrationActuator: {
                    type: 'dual-rumble',
                    playEffect: () => Promise.resolve(true),
                    reset: () => Promise.resolve(true)
                }
            }]);
        });

        it('should handle gamepad connection', () => {
            const gamepad = {
                index: 0,
                id: 'Test Gamepad',
                buttons: [],
                axes: [],
                connected: true,
                mapping: 'standard' as 'standard',
                timestamp: Date.now(),
                vibrationActuator: null
            };

            window.dispatchEvent(new GamepadEvent('gamepadconnected', { gamepad }));
            expect(eventBus.emit).toHaveBeenCalledWith('input:gamepad:connected', {
                index: 0,
                id: 'Test Gamepad'
            });
        });

        it('should handle gamepad disconnection', () => {
            const gamepad = {
                index: 0,
                id: 'Test Gamepad',
                buttons: [],
                axes: [],
                connected: false,
                mapping: 'standard' as 'standard',
                timestamp: Date.now(),
                vibrationActuator: null
            };

            window.dispatchEvent(new GamepadEvent('gamepaddisconnected', { gamepad }));
            expect(eventBus.emit).toHaveBeenCalledWith('input:gamepad:disconnected', {
                index: 0,
                id: 'Test Gamepad'
            });
        });

        it('should handle gamepad button press', () => {
            // Add gamepad binding
            const binding: InputBinding = {
                id: 'gamepad_action',
                device: InputDeviceType.Gamepad,
                key: 0,
                actionType: InputActionType.Pressed
            };

            const group: InputBindingGroup = {
                id: 'gamepad',
                enabled: true,
                bindings: [binding]
            };

            inputSystem.addBindingGroup(group);

            // Simulate button press
            (global.navigator as any).getGamepads = jest.fn().mockReturnValue([{
                index: 0,
                id: 'Test Gamepad',
                buttons: [
                    { pressed: true, value: 1 },
                    { pressed: false, value: 0 }
                ],
                axes: [0, 0, 0, 0]
            }]);

            inputSystem.update(1/60);
            expect(inputSystem.isPressed('gamepad_action')).toBe(true);
            expect(inputSystem.getValue('gamepad_action')).toBe(1);
        });

        it('should handle analog input', () => {
            // Add analog binding
            const binding: InputBinding = {
                id: 'analog_stick',
                device: InputDeviceType.Gamepad,
                key: 'axis0',
                actionType: InputActionType.Held
            };

            const group: InputBindingGroup = {
                id: 'gamepad',
                enabled: true,
                bindings: [binding]
            };

            inputSystem.addBindingGroup(group);

            // Simulate analog movement
            (global.navigator as any).getGamepads = jest.fn().mockReturnValue([{
                index: 0,
                id: 'Test Gamepad',
                buttons: [
                    { pressed: false, value: 0 },
                    { pressed: false, value: 0 }
                ],
                axes: [0.75, 0, 0, 0]
            }]);

            inputSystem.update(1/60);
            expect(inputSystem.getValue('analog_stick')).toBe(0.75);
        });

        it('should respect gamepad deadzone', () => {
            // Add analog binding
            const binding: InputBinding = {
                id: 'analog_stick',
                device: InputDeviceType.Gamepad,
                key: 'axis0',
                actionType: InputActionType.Held
            };

            const group: InputBindingGroup = {
                id: 'gamepad',
                enabled: true,
                bindings: [binding]
            };

            inputSystem.addBindingGroup(group);

            // Simulate small analog movement within deadzone
            (global.navigator as any).getGamepads = jest.fn().mockReturnValue([{
                index: 0,
                id: 'Test Gamepad',
                buttons: [
                    { pressed: false, value: 0 },
                    { pressed: false, value: 0 }
                ],
                axes: [0.05, 0, 0, 0] // Less than deadzone of 0.1
            }]);

            inputSystem.update(1/60);
            expect(inputSystem.getValue('analog_stick')).toBe(0);
        });
    });

    describe('Input Buffer', () => {
        it('should buffer input events', () => {
            // Simulate key press
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
            
            const buffer = inputSystem.getInputBuffer('move_forward');
            expect(buffer.length).toBe(1);
            expect(buffer[0].value).toBe(1);
        });

        it('should clean up old buffer entries', () => {
            // Simulate old input
            const oldTime = Date.now() - 1000; // 1 second ago
            jest.spyOn(Date, 'now').mockReturnValueOnce(oldTime);
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));

            // Reset mock and simulate new input
            jest.spyOn(Date, 'now').mockRestore();
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));

            inputSystem.update(1/60); // Trigger cleanup

            const forwardBuffer = inputSystem.getInputBuffer('move_forward');
            expect(forwardBuffer.length).toBe(0); // Old input should be cleaned up

            const jumpBuffer = inputSystem.getInputBuffer('jump');
            expect(jumpBuffer.length).toBe(1); // New input should remain
        });

        it('should respect buffer size limit', () => {
            // Simulate many inputs
            for (let i = 0; i < 40; i++) { // More than buffer size of 32
                window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
                window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
            }

            const buffer = inputSystem.getInputBuffer('move_forward');
            expect(buffer.length).toBeLessThanOrEqual(32);
        });
    });
}); 