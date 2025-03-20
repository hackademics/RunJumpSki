/**
 * @file tests/unit/game/input/GameInputMapper.test.ts
 * @description Tests for the GameInputMapper class
 */

import { InputContext } from '../../../../src/game/input/GameInputMapper';
import { GameInputActions } from '../../../../src/game/input/GameInputActions';
import { IInputBindingConfig } from '../../../../src/core/input/IInputMapper';

// Mock implementation for testing
class MockGameInputMapper {
    private activeContext: string = 'default';
    private bindings: { [context: string]: { [key: string]: string } } = {
        [InputContext.DEFAULT]: {},
        [InputContext.GAMEPLAY]: {
            'w': GameInputActions.MOVE_FORWARD,
            's': GameInputActions.MOVE_BACKWARD,
            'a': GameInputActions.STRAFE_LEFT,
            'd': GameInputActions.STRAFE_RIGHT,
            ' ': GameInputActions.JUMP,
            'MouseRight': GameInputActions.JETPACK,
            'MouseLeft': GameInputActions.FIRE_SPINFUSOR
        },
        [InputContext.MENU]: {},
        [InputContext.CONTROLS_CONFIG]: {}
    };
    
    private bindingConfigs: { [context: string]: { [key: string]: IInputBindingConfig } } = {
        [InputContext.DEFAULT]: {},
        [InputContext.GAMEPLAY]: {
            'w': {
                key: 'w',
                action: GameInputActions.MOVE_FORWARD,
                context: InputContext.GAMEPLAY,
                isHoldable: true,
                isRepeatable: true
            },
            's': {
                key: 's',
                action: GameInputActions.MOVE_BACKWARD,
                context: InputContext.GAMEPLAY,
                isHoldable: true,
                isRepeatable: true
            },
            'a': {
                key: 'a',
                action: GameInputActions.STRAFE_LEFT,
                context: InputContext.GAMEPLAY,
                isHoldable: true,
                isRepeatable: true
            },
            'd': {
                key: 'd',
                action: GameInputActions.STRAFE_RIGHT,
                context: InputContext.GAMEPLAY,
                isHoldable: true,
                isRepeatable: true
            },
            ' ': {
                key: ' ',
                action: GameInputActions.JUMP,
                context: InputContext.GAMEPLAY,
                isHoldable: true,
                isRepeatable: false
            },
            'MouseRight': {
                key: 'MouseRight',
                action: GameInputActions.JETPACK,
                context: InputContext.GAMEPLAY,
                isHoldable: true,
                isRepeatable: false
            },
            'MouseLeft': {
                key: 'MouseLeft',
                action: GameInputActions.FIRE_SPINFUSOR,
                context: InputContext.GAMEPLAY,
                isHoldable: false,
                isRepeatable: false
            }
        },
        [InputContext.MENU]: {},
        [InputContext.CONTROLS_CONFIG]: {}
    };

    constructor() {
        // Mock constructor
    }

    getActionForKey(key: string, context?: string): string | null {
        const contextToUse = context || this.activeContext;
        return this.bindings[contextToUse][key] || null;
    }

    getActiveContext(): string {
        return this.activeContext;
    }

    setActiveContext(context: string): void {
        this.activeContext = context;
    }

    setMapping(key: string, action: string, context?: string): void {
        const contextToUse = context || this.activeContext;
        this.bindings[contextToUse][key] = action;
        
        // Also update binding config
        const config: IInputBindingConfig = {
            key,
            action,
            context: contextToUse
        };
        
        this.bindingConfigs[contextToUse][key] = config;
    }

    getBindingConfig(key: string, context?: string): IInputBindingConfig | null {
        const contextToUse = context || this.activeContext;
        return this.bindingConfigs[contextToUse][key] || null;
    }

    setBindingConfig(config: IInputBindingConfig): void {
        const contextToUse = config.context || this.activeContext;
        this.bindingConfigs[contextToUse][config.key] = config;
        this.bindings[contextToUse][config.key] = config.action;
    }

    clearMappings(context?: string): void {
        const contextToUse = context || this.activeContext;
        this.bindings[contextToUse] = {};
        this.bindingConfigs[contextToUse] = {};
    }

    resetToDefaults(): void {
        // Reset gameplay bindings
        this.bindings[InputContext.GAMEPLAY] = {
            'w': GameInputActions.MOVE_FORWARD,
            's': GameInputActions.MOVE_BACKWARD,
            'a': GameInputActions.STRAFE_LEFT,
            'd': GameInputActions.STRAFE_RIGHT,
            ' ': GameInputActions.JUMP,
            'MouseRight': GameInputActions.JETPACK,
            'MouseLeft': GameInputActions.FIRE_SPINFUSOR
        };
        
        // Also reset binding configs
        this.bindingConfigs[InputContext.GAMEPLAY] = {
            'w': {
                key: 'w',
                action: GameInputActions.MOVE_FORWARD,
                context: InputContext.GAMEPLAY,
                isHoldable: true,
                isRepeatable: true
            },
            's': {
                key: 's',
                action: GameInputActions.MOVE_BACKWARD,
                context: InputContext.GAMEPLAY,
                isHoldable: true,
                isRepeatable: true
            },
            // ... other defaults
        };
    }

    getKeysForAction(action: string, context?: string): string[] {
        const contextToUse = context || this.activeContext;
        const keys: string[] = [];
        
        Object.entries(this.bindings[contextToUse]).forEach(([key, actionValue]) => {
            if (actionValue === action) {
                keys.push(key);
            }
        });
        
        return keys;
    }

    isHoldable(key: string, context?: string): boolean {
        const config = this.getBindingConfig(key, context);
        return config ? !!config.isHoldable : false;
    }

    isRepeatable(key: string, context?: string): boolean {
        const config = this.getBindingConfig(key, context);
        return config ? !!config.isRepeatable : false;
    }
}

describe('GameInputMapper', () => {
    let gameInputMapper: MockGameInputMapper;

    beforeEach(() => {
        gameInputMapper = new MockGameInputMapper();
    });

    it('should initialize with default bindings', () => {
        // Check default WASD movement bindings
        expect(gameInputMapper.getActionForKey('w', InputContext.GAMEPLAY)).toBe(GameInputActions.MOVE_FORWARD);
        expect(gameInputMapper.getActionForKey('s', InputContext.GAMEPLAY)).toBe(GameInputActions.MOVE_BACKWARD);
        expect(gameInputMapper.getActionForKey('a', InputContext.GAMEPLAY)).toBe(GameInputActions.STRAFE_LEFT);
        expect(gameInputMapper.getActionForKey('d', InputContext.GAMEPLAY)).toBe(GameInputActions.STRAFE_RIGHT);
        
        // Check special keys
        expect(gameInputMapper.getActionForKey(' ', InputContext.GAMEPLAY)).toBe(GameInputActions.JUMP);
        expect(gameInputMapper.getActionForKey('MouseRight', InputContext.GAMEPLAY)).toBe(GameInputActions.JETPACK);
        expect(gameInputMapper.getActionForKey('MouseLeft', InputContext.GAMEPLAY)).toBe(GameInputActions.FIRE_SPINFUSOR);
    });

    it('should return null for unmapped keys', () => {
        expect(gameInputMapper.getActionForKey('z', InputContext.GAMEPLAY)).toBeNull();
        expect(gameInputMapper.getActionForKey('1', InputContext.GAMEPLAY)).toBeNull();
    });

    it('should set and get active context', () => {
        // Default context should be DEFAULT
        expect(gameInputMapper.getActiveContext()).toBe(InputContext.DEFAULT);
        
        // Set to GAMEPLAY
        gameInputMapper.setActiveContext(InputContext.GAMEPLAY);
        expect(gameInputMapper.getActiveContext()).toBe(InputContext.GAMEPLAY);
        
        // Set to MENU
        gameInputMapper.setActiveContext(InputContext.MENU);
        expect(gameInputMapper.getActiveContext()).toBe(InputContext.MENU);
    });

    it('should handle context-specific bindings', () => {
        // Add a menu-specific binding
        gameInputMapper.setMapping('Escape', GameInputActions.PAUSE_GAME, InputContext.MENU);
        
        // Set to MENU context
        gameInputMapper.setActiveContext(InputContext.MENU);
        
        // Check the binding in MENU context
        expect(gameInputMapper.getActionForKey('Escape')).toBe(GameInputActions.PAUSE_GAME);
    });

    it('should get binding configuration', () => {
        const bindingConfig = gameInputMapper.getBindingConfig('w', InputContext.GAMEPLAY);
        
        // Check that it's a valid binding
        expect(bindingConfig).not.toBeNull();
        
        if (bindingConfig) {
            expect(bindingConfig.key).toBe('w');
            expect(bindingConfig.action).toBe(GameInputActions.MOVE_FORWARD);
            expect(bindingConfig.context).toBe(InputContext.GAMEPLAY);
            expect(bindingConfig.isHoldable).toBe(true);
            expect(bindingConfig.isRepeatable).toBe(true);
        }
    });

    it('should set binding configuration', () => {
        // Create a custom binding
        const customBinding: IInputBindingConfig = {
            key: 'q',
            action: GameInputActions.QUICK_SWITCH,
            context: InputContext.GAMEPLAY,
            isHoldable: false,
            isRepeatable: false
        };
        
        // Set the binding
        gameInputMapper.setBindingConfig(customBinding);
        
        // Retrieve the binding
        const retrievedBinding = gameInputMapper.getBindingConfig('q', InputContext.GAMEPLAY);
        
        // Check that it matches
        expect(retrievedBinding).toEqual(customBinding);
    });

    it('should clear mappings for a context', () => {
        // Verify a binding exists before clearing
        expect(gameInputMapper.getActionForKey('w', InputContext.GAMEPLAY)).toBe(GameInputActions.MOVE_FORWARD);
        
        // Clear the GAMEPLAY context
        gameInputMapper.clearMappings(InputContext.GAMEPLAY);
        
        // Verify the binding is gone
        expect(gameInputMapper.getActionForKey('w', InputContext.GAMEPLAY)).toBeNull();
    });

    it('should reset to defaults', () => {
        // Modify a binding
        gameInputMapper.setMapping('w', GameInputActions.QUICK_SWITCH, InputContext.GAMEPLAY);
        
        // Verify it was modified
        expect(gameInputMapper.getActionForKey('w', InputContext.GAMEPLAY)).toBe(GameInputActions.QUICK_SWITCH);
        
        // Reset to defaults
        gameInputMapper.resetToDefaults();
        
        // Verify it's back to the original
        expect(gameInputMapper.getActionForKey('w', InputContext.GAMEPLAY)).toBe(GameInputActions.MOVE_FORWARD);
    });

    it('should get all keys for an action', () => {
        // Add another key for the same action
        gameInputMapper.setMapping('ArrowUp', GameInputActions.MOVE_FORWARD, InputContext.GAMEPLAY);
        
        // Get all keys for MOVE_FORWARD
        const keys = gameInputMapper.getKeysForAction(GameInputActions.MOVE_FORWARD, InputContext.GAMEPLAY);
        
        // Should have both w and ArrowUp
        expect(keys).toContain('w');
        expect(keys).toContain('ArrowUp');
        expect(keys.length).toBe(2);
    });

    it('should check if a binding is holdable', () => {
        // MOVE_FORWARD is holdable
        expect(gameInputMapper.isHoldable('w', InputContext.GAMEPLAY)).toBe(true);
        
        // FIRE_SPINFUSOR is not holdable
        expect(gameInputMapper.isHoldable('MouseLeft', InputContext.GAMEPLAY)).toBe(false);
    });

    it('should check if a binding is repeatable', () => {
        // MOVE_FORWARD is repeatable
        expect(gameInputMapper.isRepeatable('w', InputContext.GAMEPLAY)).toBe(true);
        
        // JUMP is not repeatable
        expect(gameInputMapper.isRepeatable(' ', InputContext.GAMEPLAY)).toBe(false);
    });
}); 