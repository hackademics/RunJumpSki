import { CoreSystemRegistry } from '../../src/core/CoreSystemRegistry';
import { ServiceContainer } from '../../src/core/services/ServiceContainer';
import { Logger } from '../../src/core/logger/Logger';
import { EventBus } from '../../src/core/events/EventBus';
import { StateManager } from '../../src/core/state/StateManager';
import { AssetManager } from '../../src/core/assets/AssetManager';
import { InputSystem } from '../../src/core/input/InputSystem';
import { PhysicsSystem } from '../../src/core/physics/PhysicsSystem';
import { RendererSystem } from '../../src/core/renderer/RendererSystem';
import { AudioSystem } from '../../src/core/audio/AudioSystem';

// Mock all core systems
jest.mock('../../src/core/services/ServiceContainer');
jest.mock('../../src/core/logger/Logger');
jest.mock('../../src/core/events/EventBus');
jest.mock('../../src/core/state/StateManager');
jest.mock('../../src/core/assets/AssetManager');
jest.mock('../../src/core/input/InputSystem');
jest.mock('../../src/core/physics/PhysicsSystem');
jest.mock('../../src/core/renderer/RendererSystem');
jest.mock('../../src/core/audio/AudioSystem');

describe('CoreSystemRegistry', () => {
    let registry: CoreSystemRegistry;
    let mockContainer: jest.Mocked<ServiceContainer>;
    let mockLogger: jest.Mocked<Logger>;
    let mockEventBus: jest.Mocked<EventBus>;

    beforeEach(() => {
        // Reset singleton instance
        (CoreSystemRegistry as any).instance = undefined;

        // Setup mocks
        mockContainer = {
            getInstance: jest.fn().mockReturnThis(),
            register: jest.fn(),
            initialize: jest.fn(),
            dispose: jest.fn(),
            get: jest.fn()
        } as any;
        (ServiceContainer.getInstance as jest.Mock).mockReturnValue(mockContainer);

        mockLogger = {
            getInstance: jest.fn().mockReturnThis(),
            initialize: jest.fn(),
            info: jest.fn(),
            error: jest.fn(),
            dispose: jest.fn(),
        } as any;
        (Logger.getInstance as jest.Mock).mockReturnValue(mockLogger);

        mockEventBus = {
            getInstance: jest.fn().mockReturnThis(),
            dispose: jest.fn(),
        } as any;
        (EventBus.getInstance as jest.Mock).mockReturnValue(mockEventBus);

        registry = CoreSystemRegistry.getInstance();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Singleton Pattern', () => {
        test('should create singleton instance', () => {
            const instance1 = CoreSystemRegistry.getInstance();
            const instance2 = CoreSystemRegistry.getInstance();
            expect(instance1).toBe(instance2);
        });
    });

    describe('Initialization', () => {
        test('should initialize all core systems in correct order', async () => {
            await registry.initialize();

            // Verify logger is initialized first
            expect(mockLogger.initialize).toHaveBeenCalled();
            expect(mockContainer.register).toHaveBeenCalled();

            // Verify initialization order
            const loggerInitCall = mockLogger.initialize.mock.invocationCallOrder[0];
            const firstRegisterCall = mockContainer.register.mock.invocationCallOrder[0];
            expect(loggerInitCall).toBeLessThan(firstRegisterCall);

            // Verify all systems are registered
            expect(mockContainer.register).toHaveBeenCalledWith('logger', expect.any(Function), expect.objectContaining({
                id: 'logger',
                implementation: expect.any(Object),
                singleton: true
            }));
            expect(mockContainer.register).toHaveBeenCalledWith('eventBus', expect.any(Function), expect.objectContaining({
                id: 'eventBus',
                implementation: expect.any(Object),
                singleton: true
            }));
            expect(mockContainer.register).toHaveBeenCalledWith('stateManager', expect.any(Function), expect.objectContaining({
                id: 'stateManager',
                implementation: expect.any(Object),
                singleton: true
            }));
            expect(mockContainer.register).toHaveBeenCalledWith('assetManager', expect.any(Function), expect.objectContaining({
                id: 'assetManager',
                implementation: expect.any(Object),
                singleton: true
            }));
            expect(mockContainer.register).toHaveBeenCalledWith('inputSystem', expect.any(Function), expect.objectContaining({
                id: 'inputSystem',
                implementation: expect.any(Object),
                singleton: true
            }));
            expect(mockContainer.register).toHaveBeenCalledWith('physicsSystem', expect.any(Function), expect.objectContaining({
                id: 'physicsSystem',
                implementation: expect.any(Object),
                singleton: true
            }));
            expect(mockContainer.register).toHaveBeenCalledWith('rendererSystem', expect.any(Function), expect.objectContaining({
                id: 'rendererSystem',
                implementation: expect.any(Object),
                singleton: true
            }));
            expect(mockContainer.register).toHaveBeenCalledWith('audioSystem', expect.any(Function), expect.objectContaining({
                id: 'audioSystem',
                implementation: expect.any(Object),
                singleton: true
            }));

            // Verify container is initialized
            expect(mockContainer.initialize).toHaveBeenCalled();
        });

        test('should throw when initializing twice', async () => {
            await registry.initialize();
            await expect(registry.initialize()).rejects.toThrow('Core systems already initialized');
        });

        test('should handle initialization errors', async () => {
            mockContainer.initialize.mockRejectedValue(new Error('Init failed'));
            await expect(registry.initialize()).rejects.toThrow('Init failed');
        });
    });

    describe('Disposal', () => {
        test('should dispose all systems in reverse order', async () => {
            await registry.initialize();
            await registry.dispose();

            // Verify container disposal is called
            expect(mockContainer.dispose).toHaveBeenCalled();

            // Verify systems are disposed in reverse order
            const disposeCalls = mockContainer.register.mock.calls.map(call => call[0]);
            const reverseOrder = disposeCalls.reverse();
            expect(disposeCalls).toEqual(reverseOrder);
        });

        test('should handle disposal errors', async () => {
            await registry.initialize();
            mockContainer.dispose.mockRejectedValue(new Error('Dispose failed'));
            await expect(registry.dispose()).rejects.toThrow('Dispose failed');
        });

        test('should do nothing if not initialized', async () => {
            await registry.dispose();
            expect(mockContainer.dispose).not.toHaveBeenCalled();
        });
    });

    describe('System State', () => {
        test('should track initialization state', async () => {
            expect(registry.isInitialized()).toBe(false);
            await registry.initialize();
            expect(registry.isInitialized()).toBe(true);
            await registry.dispose();
            expect(registry.isInitialized()).toBe(false);
        });
    });

    describe('Error Handling', () => {
        test('should log errors during disposal', async () => {
            await registry.initialize();
            const error = new Error('Dispose error');
            mockContainer.dispose.mockRejectedValue(error);

            await expect(registry.dispose()).rejects.toThrow('Dispose error');
            expect(mockLogger.error).toHaveBeenCalledWith('Error disposing core systems', error, { phase: 'disposal' });
        });
    });

    describe('System Access', () => {
        test('should get system by name when initialized', async () => {
            await registry.initialize();
            const mockSystem = {};
            mockContainer.get.mockReturnValue(mockSystem);
            
            const system = registry.getSystem('testSystem');
            expect(system).toBe(mockSystem);
            expect(mockContainer.get).toHaveBeenCalledWith('testSystem');
        });

        test('should throw when getting system before initialization', () => {
            expect(() => registry.getSystem('testSystem')).toThrow('Core systems not initialized');
        });
    });
}); 