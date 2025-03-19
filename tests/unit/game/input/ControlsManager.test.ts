/**
 * @file tests/unit/game/input/ControlsManager.test.ts
 * @description Tests for the ControlsManager class
 */

import { ControlsManager, ControlsStorageKey } from '../../../../src/game/input/ControlsManager';
import { GameInputMapper } from '../../../../src/game/input/GameInputMapper';
import { IStorageAdapter } from '../../../../src/core/utils/StorageManager';
import { EventEmitter } from '../../../../src/core/events/EventEmitter';
import { GameInputActions } from '../../../../src/game/input/GameInputActions';
import { InputEventType } from '../../../../src/game/input/InputEvents';

// Mock storage adapter
class MockStorageAdapter implements IStorageAdapter {
    private storage: Map<string, string> = new Map();
    
    public save<T>(key: string, value: T): boolean {
        try {
            this.storage.set(key, JSON.stringify(value));
            return true;
        } catch (e) {
            return false;
        }
    }
    
    public load<T>(key: string, defaultValue?: T): T | null {
        const value = this.storage.get(key);
        if (value === undefined) {
            return defaultValue || null;
        }
        return JSON.parse(value) as T;
    }
    
    public remove(key: string): boolean {
        return this.storage.delete(key);
    }
    
    public exists(key: string): boolean {
        return this.storage.has(key);
    }
    
    public clear(): boolean {
        this.storage.clear();
        return true;
    }
    
    public clearWithPrefix(prefix: string): boolean {
        const keysToRemove: string[] = [];
        this.storage.forEach((_, key) => {
            if (key.startsWith(prefix)) {
                keysToRemove.push(key);
            }
        });
        
        keysToRemove.forEach(key => this.storage.delete(key));
        return true;
    }
}

describe('ControlsManager', () => {
    let storageAdapter: MockStorageAdapter;
    let gameInputMapper: GameInputMapper;
    let eventEmitter: EventEmitter;
    let controlsManager: ControlsManager;
    
    beforeEach(() => {
        storageAdapter = new MockStorageAdapter();
        gameInputMapper = new GameInputMapper();
        eventEmitter = new EventEmitter();
        controlsManager = new ControlsManager(storageAdapter, gameInputMapper, eventEmitter);
    });
    
    it('should initialize with a default configuration', () => {
        const activeConfig = controlsManager.getActiveConfig();
        
        expect(activeConfig).not.toBeNull();
        expect(activeConfig.id).toBe('default');
        expect(activeConfig.name).toBe('Default Controls');
    });
    
    it('should save configurations to storage', () => {
        // Get the default config
        const defaultConfig = controlsManager.getConfig('default');
        expect(defaultConfig).not.toBeNull();
        
        // Create a new config
        const customConfig = controlsManager.createConfig('custom', 'Custom Controls');
        expect(customConfig).not.toBeNull();
        expect(customConfig.id).toBe('custom');
        
        // Check that configs were saved to storage
        const savedConfigs = storageAdapter.load<Record<string, object>>(
            `game.${ControlsStorageKey.CONFIGS}`
        );
        
        expect(savedConfigs).not.toBeNull();
        expect(savedConfigs).toHaveProperty('default');
        expect(savedConfigs).toHaveProperty('custom');
    });
    
    it('should load configurations from storage', () => {
        // Create a custom configuration
        const customConfig = controlsManager.createConfig('custom', 'Custom Controls');
        
        // Modify a binding in the custom config
        customConfig.updateBinding(GameInputActions.MOVE_FORWARD, 'ArrowUp');
        
        // Set as active
        controlsManager.setActiveConfig('custom');
        
        // Create a new manager with the same storage
        const newManager = new ControlsManager(storageAdapter, gameInputMapper, eventEmitter);
        
        // Check that it loaded the custom config as active
        const activeConfig = newManager.getActiveConfig();
        expect(activeConfig.id).toBe('custom');
        
        // Check that the modified binding is preserved
        const binding = activeConfig.getBindingForAction(GameInputActions.MOVE_FORWARD);
        expect(binding).not.toBeNull();
        expect(binding?.key).toBe('ArrowUp');
    });
    
    it('should update bindings and emit change events', () => {
        // Set up an event listener
        let eventFired = false;
        let eventAction = '';
        let eventNewKey = '';
        
        eventEmitter.on(InputEventType.INPUT_BINDING_CHANGED, (data) => {
            eventFired = true;
            eventAction = data.action;
            eventNewKey = data.newKey;
        });
        
        // Update a binding
        const result = controlsManager.updateBinding(GameInputActions.MOVE_FORWARD, 'ArrowUp');
        
        // Check that the update succeeded
        expect(result).toBe(true);
        
        // Check that the event was fired
        expect(eventFired).toBe(true);
        expect(eventAction).toBe(GameInputActions.MOVE_FORWARD);
        expect(eventNewKey).toBe('ArrowUp');
        
        // Check that the binding was updated in the active config
        const binding = controlsManager.getActiveConfig().getBindingForAction(GameInputActions.MOVE_FORWARD);
        expect(binding?.key).toBe('ArrowUp');
    });
    
    it('should reset active configuration to defaults', () => {
        // Modify the default config
        controlsManager.updateBinding(GameInputActions.MOVE_FORWARD, 'ArrowUp');
        
        // Check that it was modified
        const modifiedBinding = controlsManager.getActiveConfig().getBindingForAction(GameInputActions.MOVE_FORWARD);
        expect(modifiedBinding?.key).toBe('ArrowUp');
        
        // Reset to defaults
        controlsManager.resetActiveConfig();
        
        // Check that it was reset
        const resetBinding = controlsManager.getActiveConfig().getBindingForAction(GameInputActions.MOVE_FORWARD);
        expect(resetBinding?.key).toBe('w');
    });
    
    it('should not update non-rebindable keys', () => {
        // Try to update the Escape key (not rebindable)
        const result = controlsManager.updateBinding(GameInputActions.PAUSE_GAME, 'p');
        
        // Check that the update failed
        expect(result).toBe(false);
        
        // Check that the binding was not updated
        const binding = controlsManager.getActiveConfig().getBindingForAction(GameInputActions.PAUSE_GAME);
        expect(binding?.key).toBe('Escape');
    });
    
    it('should clear storage with prefix', () => {
        // Create a custom configuration
        controlsManager.createConfig('custom', 'Custom Controls');
        
        // Clear storage
        const result = controlsManager.clear();
        
        // Check that it was cleared
        expect(result).toBe(true);
        expect(storageAdapter.exists(`game.${ControlsStorageKey.CONFIGS}`)).toBe(false);
        expect(storageAdapter.exists(`game.${ControlsStorageKey.ACTIVE_CONFIG}`)).toBe(false);
    });
    
    it('should apply configurations to input mapper', () => {
        // Create a custom config with a modified binding
        const customConfig = controlsManager.createConfig('custom', 'Custom Controls');
        customConfig.updateBinding(GameInputActions.MOVE_FORWARD, 'ArrowUp');
        
        // Set it as active
        controlsManager.setActiveConfig('custom');
        
        // Check that the binding was applied to the input mapper
        const action = gameInputMapper.getActionForKey('ArrowUp');
        expect(action).toBe(GameInputActions.MOVE_FORWARD);
    });
}); 