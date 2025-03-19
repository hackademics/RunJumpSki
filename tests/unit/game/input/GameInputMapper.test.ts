/**
 * @file tests/unit/game/input/GameInputMapper.test.ts
 * @description Tests for the GameInputMapper class
 */

import { GameInputMapper, InputContext } from '../../../../src/game/input/GameInputMapper';
import { GameInputActions } from '../../../../src/game/input/GameInputActions';
import { IInputBindingConfig } from '../../../../src/core/input/IInputMapper';

describe('GameInputMapper', () => {
    let gameInputMapper: GameInputMapper;

    beforeEach(() => {
        gameInputMapper = new GameInputMapper();
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