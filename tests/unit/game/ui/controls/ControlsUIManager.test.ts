/**
 * @file tests/unit/game/ui/controls/ControlsUIManager.test.ts
 * @description Tests for the ControlsUIManager class
 */

import { ControlsUIManager } from '../../../../../src/game/ui/controls/ControlsUIManager';
import { ControlsManager } from '../../../../../src/game/input/ControlsManager';
import { GameInputMapper } from '../../../../../src/game/input/GameInputMapper';
import { EventEmitter } from '../../../../../src/core/events/EventEmitter';
import { IStorageAdapter } from '../../../../../src/core/utils/StorageManager';
import { InputEventType } from '../../../../../src/game/input/InputEvents';
import { IInputBindingConfig } from '../../../../../src/core/input/IInputMapper';
import { IControlsConfig } from '../../../../../src/game/input/IControlsConfig';

// Mock the GameInputMapper class to fix the contextBindings issue
jest.mock('../../../../../src/game/input/GameInputMapper', () => {
    return {
        GameInputMapper: jest.fn().mockImplementation(() => {
            return {
                contextBindings: new Map<string, Map<string, IInputBindingConfig>>(),
                getBindingConfig: jest.fn().mockImplementation((key) => {
                    if (key === 'MouseY' || key === 'MouseX') {
                        return { 
                            key, 
                            action: key === 'MouseY' ? 'LOOK_Y' : 'LOOK_X',
                            isAxisControl: true, 
                            sensitivity: 1.0, 
                            isInverted: false 
                        };
                    }
                    return null;
                }),
                activeContext: "default",
                initializeContext: jest.fn(),
                setupDefaultBindings: jest.fn(),
                setMapping: jest.fn(),
                getActionForKey: jest.fn().mockReturnValue(null),
                setBindingConfig: jest.fn(),
                clearMappings: jest.fn(),
                resetToDefaults: jest.fn()
            };
        })
    };
});

// Mock the ControlsManager class
jest.mock('../../../../../src/game/input/ControlsManager', () => {
    // Create a mock controls configuration
    const createMockConfig = (id: string, name: string) => {
        const bindings = new Map<string, any>();
        bindings.set('MOVE_FORWARD', { key: id === 'default' ? 'w' : 'ArrowUp', action: 'MOVE_FORWARD' });
        bindings.set('MOVE_BACKWARD', { key: id === 'default' ? 's' : 'ArrowDown', action: 'MOVE_BACKWARD' });

        return {
            id,
            name,
            bindings,
            mouseSensitivity: 1.0,
            invertYAxis: false,
            getBindingForAction: (action: string) => bindings.get(action)
        } as IControlsConfig;
    };

    // Create mock configs
    const mockConfigs: Map<string, IControlsConfig> = new Map();
    const defaultConfig = createMockConfig('default', 'Default Controls');
    mockConfigs.set('default', defaultConfig);

    // Return the mock implementation
    return {
        ControlsManager: jest.fn().mockImplementation(() => {
            return {
                getActiveConfig: jest.fn().mockReturnValue(defaultConfig),
                getAllConfigs: jest.fn().mockReturnValue([defaultConfig]),
                setActiveConfig: jest.fn().mockImplementation((configId: string) => {
                    if (mockConfigs.has(configId)) {
                        defaultConfig.id = configId; // Fake change of active config
                        return true;
                    }
                    return false;
                }),
                createConfig: jest.fn().mockImplementation((id: string, name: string) => {
                    const newConfig = createMockConfig(id, name);
                    mockConfigs.set(id, newConfig);
                    return newConfig;
                }),
                deleteConfig: jest.fn().mockReturnValue(true),
                updateBinding: jest.fn().mockImplementation((action: string, key: string) => {
                    if (defaultConfig.bindings.has(action)) {
                        defaultConfig.bindings.get(action).key = key;
                        return true;
                    }
                    return false;
                }),
                resetActiveConfig: jest.fn().mockImplementation(() => {
                    defaultConfig.mouseSensitivity = 1.0;
                    defaultConfig.invertYAxis = false;
                    defaultConfig.bindings.get('MOVE_FORWARD').key = 'w';
                })
            };
        })
    };
});

// Mock classes
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
}

describe('ControlsUIManager', () => {
    let storageAdapter: MockStorageAdapter;
    let gameInputMapper: GameInputMapper;
    let eventEmitter: EventEmitter;
    let controlsManager: ControlsManager;
    let controlsUIManager: ControlsUIManager;
    
    beforeEach(() => {
        storageAdapter = new MockStorageAdapter();
        gameInputMapper = new GameInputMapper();
        eventEmitter = new EventEmitter();
        controlsManager = new ControlsManager(storageAdapter, gameInputMapper, eventEmitter);
        controlsUIManager = new ControlsUIManager(controlsManager, eventEmitter, gameInputMapper);
    });
    
    it('should initialize properly', () => {
        expect(controlsUIManager).toBeDefined();
        expect(controlsUIManager.isControlsMenuOpen()).toBe(false);
    });
    
    it('should get the active configuration from the controls manager', () => {
        const activeConfig = controlsUIManager.getActiveConfig();
        
        expect(activeConfig).toBeDefined();
        expect(activeConfig.id).toBe('default');
        expect(activeConfig.name).toBe('Default Controls');
    });
    
    it('should get all configurations from the controls manager', () => {
        const configs = controlsUIManager.getAllConfigs();
        
        expect(configs).toBeDefined();
        expect(configs.length).toBeGreaterThan(0);
        expect(configs[0].id).toBe('default');
    });
    
    it('should set the active configuration', () => {
        // Create a custom config
        const customConfig = controlsUIManager.createConfig('custom', 'Custom Controls');
        
        // Set as active
        const result = controlsUIManager.setActiveConfig('custom');
        
        // Check that it was set
        expect(result).toBe(true);
        expect(controlsUIManager.getActiveConfig().id).toBe('custom');
    });
    
    it('should update bindings in the active configuration', () => {
        // Update a binding
        const result = controlsUIManager.updateBinding('MOVE_FORWARD', 'ArrowUp');
        
        // Check that it was updated
        expect(result).toBe(true);
        expect(controlsUIManager.getActiveConfig().getBindingForAction('MOVE_FORWARD')?.key).toBe('ArrowUp');
    });
    
    it('should update mouse settings', () => {
        // Set up an event listener
        let eventFired = false;
        let sensitivity = 0;
        let inverted = false;
        
        eventEmitter.on(InputEventType.INPUT_CONTEXT_CHANGED, (data) => {
            eventFired = true;
            sensitivity = data.mouseSensitivity;
            inverted = data.invertYAxis;
        });
        
        // Update mouse settings
        controlsUIManager.updateMouseSettings(1.5, true);
        
        // Check that settings were updated
        expect(controlsUIManager.getActiveConfig().mouseSensitivity).toBe(1.5);
        expect(controlsUIManager.getActiveConfig().invertYAxis).toBe(true);
        
        // Check that the event was fired
        expect(eventFired).toBe(true);
        expect(sensitivity).toBe(1.5);
        expect(inverted).toBe(true);
    });
    
    it('should reset the active configuration', () => {
        // Modify the default config
        controlsUIManager.updateBinding('MOVE_FORWARD', 'ArrowUp');
        controlsUIManager.updateMouseSettings(1.5, true);
        
        // Check that it was modified
        expect(controlsUIManager.getActiveConfig().getBindingForAction('MOVE_FORWARD')?.key).toBe('ArrowUp');
        expect(controlsUIManager.getActiveConfig().mouseSensitivity).toBe(1.5);
        
        // Reset to defaults
        controlsUIManager.resetActiveConfig();
        
        // Check that it was reset
        expect(controlsUIManager.getActiveConfig().getBindingForAction('MOVE_FORWARD')?.key).toBe('w');
        expect(controlsUIManager.getActiveConfig().mouseSensitivity).toBe(1.0);
        expect(controlsUIManager.getActiveConfig().invertYAxis).toBe(false);
    });
    
    it('should handle opening and closing the controls menu', () => {
        // Set up event listeners
        let openEventFired = false;
        let closeEventFired = false;
        let closeCallbackCalled = false;
        
        eventEmitter.on('ui.controls.open', () => {
            openEventFired = true;
        });
        
        eventEmitter.on('ui.controls.close', () => {
            closeEventFired = true;
        });
        
        // Open the menu with a close callback
        controlsUIManager.openControlsMenu(() => {
            closeCallbackCalled = true;
        });
        
        // Check that it's open
        expect(controlsUIManager.isControlsMenuOpen()).toBe(true);
        expect(openEventFired).toBe(true);
        
        // Close the menu
        controlsUIManager.closeControlsMenu();
        
        // Check that it's closed and the callback was called
        expect(controlsUIManager.isControlsMenuOpen()).toBe(false);
        expect(closeEventFired).toBe(true);
        expect(closeCallbackCalled).toBe(true);
    });
    
    it('should apply changes to the controls', () => {
        // Set up an event listener
        let closeEventFired = false;
        
        eventEmitter.on('ui.controls.close', () => {
            closeEventFired = true;
        });
        
        // Open the menu
        controlsUIManager.openControlsMenu();
        expect(controlsUIManager.isControlsMenuOpen()).toBe(true);
        
        // Apply changes
        controlsUIManager.applyChanges();
        
        // Check that the menu is closed
        expect(controlsUIManager.isControlsMenuOpen()).toBe(false);
        expect(closeEventFired).toBe(true);
    });
}); 