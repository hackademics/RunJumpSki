import { StateMachine } from './StateMachine';
import { StateError } from '../../utils/errors/StateError';
import { EventBus } from '../events/EventBus';

// Mock EventBus
jest.mock('../events/EventBus', () => ({
    EventBus: {
        getInstance: jest.fn().mockReturnValue({
            emit: jest.fn(),
            on: jest.fn(),
            off: jest.fn()
        })
    }
}));

describe('StateMachine', () => {
    type TestState = 'idle' | 'loading' | 'ready' | 'error';
    interface TestData {
        value: number;
        message?: string;
    }

    let stateMachine: StateMachine<TestState, TestData>;
    let mockEventBus: jest.Mocked<EventBus>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockEventBus = EventBus.getInstance() as jest.Mocked<EventBus>;
        stateMachine = StateMachine.getInstance<TestState, TestData>();
    });

    afterEach(() => {
        stateMachine.dispose();
    });

    describe('Initialization', () => {
        it('should initialize with default config', () => {
            stateMachine.initialize();
            expect(mockEventBus.emit).toHaveBeenCalledWith('state:initialized', expect.any(Object));
        });

        it('should initialize with custom config', () => {
            const config = {
                initialState: 'idle' as TestState,
                initialData: { value: 0 },
                maxHistorySize: 5,
                emitEvents: false
            };
            stateMachine.initialize(config);
            expect(stateMachine.getCurrentState()).toBe('idle');
            expect(stateMachine.getCurrentData()).toEqual({ value: 0 });
        });

        it('should throw when initializing twice', () => {
            stateMachine.initialize();
            expect(() => stateMachine.initialize()).toThrow(StateError);
        });

        it('should throw with invalid maxHistorySize', () => {
            expect(() => stateMachine.initialize({ maxHistorySize: 0 })).toThrow(StateError);
            expect(() => stateMachine.initialize({ maxHistorySize: -1 })).toThrow(StateError);
        });
    });

    describe('State Transitions', () => {
        beforeEach(() => {
            stateMachine.initialize({
                initialState: 'idle',
                initialData: { value: 0 }
            });
        });

        it('should transition to new state', async () => {
            await stateMachine.transitionTo('loading', { value: 1 });
            expect(stateMachine.getCurrentState()).toBe('loading');
            expect(stateMachine.getCurrentData()).toEqual({ value: 1 });
        });

        it('should emit transition events', async () => {
            await stateMachine.transitionTo('loading', { value: 1 });
            expect(mockEventBus.emit).toHaveBeenCalledWith('state:transitioning', expect.any(Object));
            expect(mockEventBus.emit).toHaveBeenCalledWith('state:transitioned', expect.any(Object));
        });

        it('should maintain history', async () => {
            await stateMachine.transitionTo('loading', { value: 1 });
            await stateMachine.transitionTo('ready', { value: 2 });
            const history = stateMachine.getHistory();
            expect(history).toHaveLength(3); // Including initial state
            expect(history[0].from).toBeNull();
            expect(history[0].to).toBe('idle');
            expect(history[1].from).toBe('idle');
            expect(history[1].to).toBe('loading');
            expect(history[2].from).toBe('loading');
            expect(history[2].to).toBe('ready');
        });

        it('should respect maxHistorySize', async () => {
            stateMachine.initialize({
                initialState: 'idle',
                maxHistorySize: 2
            });

            await stateMachine.transitionTo('loading');
            await stateMachine.transitionTo('ready');
            await stateMachine.transitionTo('error');

            const history = stateMachine.getHistory();
            expect(history).toHaveLength(2);
            expect(history[0].to).toBe('ready');
            expect(history[1].to).toBe('error');
        });
    });

    describe('Middleware', () => {
        const middleware1 = jest.fn().mockResolvedValue(true);
        const middleware2 = jest.fn().mockResolvedValue(true);

        beforeEach(() => {
            stateMachine.initialize({
                initialState: 'idle',
                middleware: [middleware1]
            });
        });

        it('should call middleware during transitions', async () => {
            await stateMachine.transitionTo('loading');
            expect(middleware1).toHaveBeenCalledWith('idle', 'loading', undefined);
        });

        it('should allow adding middleware', async () => {
            stateMachine.addMiddleware(middleware2);
            await stateMachine.transitionTo('loading');
            expect(middleware1).toHaveBeenCalled();
            expect(middleware2).toHaveBeenCalled();
        });

        it('should allow removing middleware', async () => {
            stateMachine.removeMiddleware(middleware1);
            await stateMachine.transitionTo('loading');
            expect(middleware1).not.toHaveBeenCalled();
        });

        it('should stop transition if middleware returns false', async () => {
            const rejectingMiddleware = jest.fn().mockResolvedValue(false);
            stateMachine.addMiddleware(rejectingMiddleware);

            await expect(stateMachine.transitionTo('loading')).rejects.toThrow(StateError);
            expect(stateMachine.getCurrentState()).toBe('idle');
        });
    });

    describe('Validation', () => {
        beforeEach(() => {
            stateMachine.initialize({
                initialState: 'idle',
                validTransitions: {
                    idle: ['loading'],
                    loading: ['ready', 'error'],
                    ready: ['idle'],
                    error: ['idle']
                }
            });
        });

        it('should allow valid transitions', async () => {
            await stateMachine.transitionTo('loading');
            expect(stateMachine.getCurrentState()).toBe('loading');
            await stateMachine.transitionTo('ready');
            expect(stateMachine.getCurrentState()).toBe('ready');
        });

        it('should prevent invalid transitions', async () => {
            await expect(stateMachine.transitionTo('ready')).rejects.toThrow(StateError);
            expect(stateMachine.getCurrentState()).toBe('idle');
        });

        it('should correctly validate transitions', () => {
            expect(stateMachine.isValidTransition('idle', 'loading')).toBe(true);
            expect(stateMachine.isValidTransition('idle', 'ready')).toBe(false);
            expect(stateMachine.isValidTransition('loading', 'ready')).toBe(true);
            expect(stateMachine.isValidTransition('loading', 'idle')).toBe(false);
        });
    });

    describe('Reset and Disposal', () => {
        beforeEach(() => {
            stateMachine.initialize({
                initialState: 'idle',
                initialData: { value: 0 }
            });
        });

        it('should reset to initial state', async () => {
            await stateMachine.transitionTo('loading', { value: 1 });
            stateMachine.reset();
            expect(stateMachine.getCurrentState()).toBe('idle');
            expect(stateMachine.getCurrentData()).toEqual({ value: 0 });
            expect(stateMachine.getHistory()).toHaveLength(1);
        });

        it('should throw when resetting without initial state', () => {
            stateMachine.dispose();
            stateMachine.initialize();
            expect(() => stateMachine.reset()).toThrow(StateError);
        });

        it('should clean up on disposal', () => {
            stateMachine.dispose();
            expect(() => stateMachine.getCurrentState()).toThrow(StateError);
            expect(() => stateMachine.transitionTo('loading')).toThrow(StateError);
        });

        it('should emit events on reset and disposal', async () => {
            await stateMachine.transitionTo('loading');
            stateMachine.reset();
            expect(mockEventBus.emit).toHaveBeenCalledWith('state:reset', expect.any(Object));

            stateMachine.dispose();
            expect(mockEventBus.emit).toHaveBeenCalledWith('state:disposed', undefined);
        });
    });
}); 