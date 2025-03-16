import { StateManager } from '../StateManager';
import { StateError } from '../../../utils/errors/StateError';
import { EventBus } from '../../events/EventBus';
import { Logger } from '../../logger/Logger';

// Mock dependencies
jest.mock('../../events/EventBus');
jest.mock('../../logger/Logger');

type TestState = 'idle' | 'walking' | 'running' | 'jumping';

describe('StateManager', () => {
    let stateManager: StateManager<TestState>;
    let mockEventBus: jest.Mocked<EventBus>;
    let mockLogger: jest.Mocked<Logger>;

    beforeEach(() => {
        // Reset singleton instance
        (StateManager as any).instance = undefined;

        // Setup mocks
        mockEventBus = {
            emit: jest.fn(),
            on: jest.fn(),
            off: jest.fn(),
            getInstance: jest.fn().mockReturnThis(),
        } as any;
        (EventBus.getInstance as jest.Mock).mockReturnValue(mockEventBus);

        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
            getInstance: jest.fn().mockReturnThis(),
        } as any;
        (Logger.getInstance as jest.Mock).mockReturnValue(mockLogger);

        stateManager = StateManager.getInstance<TestState>();
    });

    afterEach(() => {
        stateManager.dispose();
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should create singleton instance', () => {
            const instance1 = StateManager.getInstance<TestState>();
            const instance2 = StateManager.getInstance<TestState>();
            expect(instance1).toBe(instance2);
        });

        test('should initialize with default config', () => {
            stateManager.initialize({
                initialState: 'idle',
                transitions: []
            });
            expect(stateManager.getCurrentState()).toBe('idle');
        });

        test('should throw when initializing twice', () => {
            stateManager.initialize({
                initialState: 'idle',
                transitions: []
            });
            expect(() => stateManager.initialize({
                initialState: 'idle',
                transitions: []
            })).toThrow(StateError);
        });

        test('should initialize with custom history size', () => {
            stateManager.initialize({
                initialState: 'idle',
                transitions: [],
                maxHistorySize: 5
            });
            expect(stateManager.getHistory()).toHaveLength(1);
        });
    });

    describe('State Transitions', () => {
        beforeEach(() => {
            stateManager.initialize({
                initialState: 'idle',
                transitions: [
                    { from: 'idle', to: 'walking' },
                    { from: 'walking', to: 'running' },
                    { from: 'running', to: 'idle' },
                    { from: ['idle', 'walking', 'running'], to: 'jumping' }
                ]
            });
        });

        test('should allow valid transitions', async () => {
            await stateManager.transitionTo('walking');
            expect(stateManager.getCurrentState()).toBe('walking');
        });

        test('should prevent invalid transitions', async () => {
            await expect(stateManager.transitionTo('running')).rejects.toThrow(StateError);
        });

        test('should handle array of source states', async () => {
            await stateManager.transitionTo('jumping');
            expect(stateManager.getCurrentState()).toBe('jumping');
        });

        test('should maintain transition history', async () => {
            await stateManager.transitionTo('walking');
            await stateManager.transitionTo('running');
            const history = stateManager.getHistory();
            expect(history).toHaveLength(3);
            expect(history[0].state).toBe('idle');
            expect(history[2].state).toBe('running');
        });

        test('should limit history size', async () => {
            stateManager.initialize({
                initialState: 'idle',
                transitions: [
                    { from: 'idle', to: 'walking' },
                    { from: 'walking', to: 'idle' }
                ],
                maxHistorySize: 2
            });

            await stateManager.transitionTo('walking');
            await stateManager.transitionTo('idle');
            await stateManager.transitionTo('walking');

            const history = stateManager.getHistory();
            expect(history).toHaveLength(2);
            expect(history[0].state).toBe('idle');
            expect(history[1].state).toBe('walking');
        });
    });

    describe('Transition Validation', () => {
        test('should validate transitions', async () => {
            const validateFn = jest.fn().mockReturnValue(true);
            stateManager.initialize({
                initialState: 'idle',
                transitions: [{
                    from: 'idle',
                    to: 'walking',
                    validate: validateFn
                }]
            });

            await stateManager.transitionTo('walking');
            expect(validateFn).toHaveBeenCalled();
        });

        test('should prevent invalid transitions', async () => {
            stateManager.initialize({
                initialState: 'idle',
                transitions: [{
                    from: 'idle',
                    to: 'walking',
                    validate: () => false
                }]
            });

            await expect(stateManager.transitionTo('walking')).rejects.toThrow(StateError);
        });
    });

    describe('Middleware', () => {
        beforeEach(() => {
            stateManager.initialize({
                initialState: 'idle',
                transitions: [{ from: 'idle', to: 'walking' }]
            });
        });

        test('should execute pre-transition middleware', async () => {
            const middleware = jest.fn().mockReturnValue(true);
            stateManager.addPreTransitionMiddleware(middleware);
            await stateManager.transitionTo('walking');
            expect(middleware).toHaveBeenCalledWith('idle', 'walking', undefined);
        });

        test('should execute post-transition middleware', async () => {
            const middleware = jest.fn();
            stateManager.addPostTransitionMiddleware(middleware);
            await stateManager.transitionTo('walking');
            expect(middleware).toHaveBeenCalledWith(expect.objectContaining({
                previousState: 'idle',
                newState: 'walking'
            }));
        });

        test('should block transition if pre-middleware returns false', async () => {
            stateManager.addPreTransitionMiddleware(() => false);
            await expect(stateManager.transitionTo('walking')).rejects.toThrow(StateError);
        });

        test('should handle async middleware', async () => {
            const asyncMiddleware = jest.fn().mockResolvedValue(true);
            stateManager.addPreTransitionMiddleware(asyncMiddleware);
            await stateManager.transitionTo('walking');
            expect(asyncMiddleware).toHaveBeenCalled();
        });
    });

    describe('Event Emission', () => {
        beforeEach(() => {
            stateManager.initialize({
                initialState: 'idle',
                transitions: [{ from: 'idle', to: 'walking' }],
                enableLogging: true
            });
        });

        test('should emit state change events', async () => {
            await stateManager.transitionTo('walking');
            expect(mockEventBus.emit).toHaveBeenCalledWith('state:changed', expect.any(Object));
        });

        test('should log state changes when enabled', async () => {
            await stateManager.transitionTo('walking');
            expect(mockLogger.info).toHaveBeenCalledWith(
                'State transition completed',
                expect.any(Object)
            );
        });

        test('should log errors on failed transitions', async () => {
            await expect(stateManager.transitionTo('running')).rejects.toThrow();
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('Reset and Disposal', () => {
        beforeEach(() => {
            stateManager.initialize({
                initialState: 'idle',
                transitions: [{ from: 'idle', to: 'walking' }]
            });
        });

        test('should reset to initial state', async () => {
            await stateManager.transitionTo('walking');
            await stateManager.reset();
            expect(stateManager.getCurrentState()).toBe('idle');
            expect(stateManager.getHistory()).toHaveLength(1);
        });

        test('should clear all data on disposal', () => {
            stateManager.dispose();
            expect(() => stateManager.getCurrentState()).toThrow(StateError);
        });
    });

    describe('Error Handling', () => {
        test('should throw when using uninitialized', () => {
            expect(() => stateManager.getCurrentState()).toThrow(StateError);
        });

        test('should throw when adding invalid transition', () => {
            stateManager.initialize({
                initialState: 'idle',
                transitions: []
            });

            expect(() => stateManager.addTransition({
                from: 'invalid' as TestState,
                to: 'walking'
            })).toThrow();
        });

        test('should handle transition handler errors', async () => {
            stateManager.initialize({
                initialState: 'idle',
                transitions: [{
                    from: 'idle',
                    to: 'walking',
                    onTransition: () => { throw new Error('Handler error'); }
                }]
            });

            await expect(stateManager.transitionTo('walking')).rejects.toThrow(StateError);
        });
    });
}); 