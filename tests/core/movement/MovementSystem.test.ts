import { PhysicsImpostor, Vector3 as BabylonVector3, Scene, Engine } from 'babylonjs';
import { MovementSystem } from '../../../src/core/movement/MovementSystem';
import { MovementConfig } from '../../../src/core/movement/IMovementSystem';
import { Vector3 } from '../../../src/types/core/MathTypes';
import { PhysicsSystem } from '../../../src/core/physics/PhysicsSystem';
import { EventBus } from '../../../src/core/events/EventBus';

jest.mock('babylonjs');
jest.mock('../../../src/core/physics/PhysicsSystem');
jest.mock('../../../src/core/events/EventBus');

describe('MovementSystem', () => {
    let movementSystem: MovementSystem;
    let mockPhysicsBody: jest.Mocked<PhysicsImpostor>;
    let mockPhysicsSystem: jest.Mocked<PhysicsSystem>;
    let mockEventBus: jest.Mocked<typeof EventBus>;

    const defaultConfig: MovementConfig = {
        // Basic movement
        walkSpeed: 5,
        runSpeed: 10,
        jumpForce: 8,
        airControl: 0.3,
        groundFriction: 0.1,
        airFriction: 0.01,

        // Skiing
        skiMinSlope: 0.2,
        skiMaxSlope: 0.8,
        skiAcceleration: 15,
        skiDeceleration: 5,
        skiTurnRate: 2,
        skiGroundFriction: 0.05,

        // Jetpack
        jetpackMaxForce: 12,
        jetpackAcceleration: 20,
        jetpackFuelCapacity: 100,
        jetpackFuelConsumption: 25,
        jetpackFuelRegenRate: 10,
        jetpackMinFuelToActivate: 20
    };

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Create mock physics body
        mockPhysicsBody = {
            registerOnPhysicsCollide: jest.fn(),
            getObjectCenter: jest.fn().mockReturnValue(new BabylonVector3(0, 0, 0))
        } as unknown as jest.Mocked<PhysicsImpostor>;

        // Create mock physics system
        mockPhysicsSystem = {
            getInstance: jest.fn().mockReturnThis(),
            raycast: jest.fn(),
            applyForce: jest.fn(),
            applyImpulse: jest.fn(),
            setPosition: jest.fn(),
            setRotation: jest.fn(),
            getLinearVelocity: jest.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
            setLinearVelocity: jest.fn(),
            setAngularVelocity: jest.fn()
        } as unknown as jest.Mocked<PhysicsSystem>;

        // Create mock event bus
        mockEventBus = {
            getInstance: jest.fn().mockReturnValue({
                on: jest.fn(),
                emit: jest.fn()
            })
        } as unknown as jest.Mocked<typeof EventBus>;

        // Get movement system instance
        movementSystem = MovementSystem.getInstance();
        movementSystem.initialize(defaultConfig);
        movementSystem.attachBody(mockPhysicsBody);
    });

    afterEach(() => {
        movementSystem.dispose();
    });

    describe('Initialization', () => {
        it('should initialize with config', () => {
            const system = MovementSystem.getInstance();
            system.initialize(defaultConfig);
            expect(system).toBeDefined();
        });

        it('should throw error when initializing twice', () => {
            const system = MovementSystem.getInstance();
            system.initialize(defaultConfig);
            expect(() => system.initialize(defaultConfig)).toThrow();
        });
    });

    describe('Basic Movement', () => {
        it('should apply walk force when moving', () => {
            movementSystem.update({
                moveDirection: { x: 1, y: 0, z: 0 },
                lookDirection: { x: 1, y: 0, z: 0 },
                jump: false,
                run: false,
                ski: false,
                jetpack: false
            }, 1/60);

            expect(mockPhysicsSystem.applyForce).toHaveBeenCalledWith(
                mockPhysicsBody,
                expect.objectContaining({ x: expect.any(Number), y: 0, z: 0 })
            );
        });

        it('should apply run force when running', () => {
            movementSystem.update({
                moveDirection: { x: 1, y: 0, z: 0 },
                lookDirection: { x: 1, y: 0, z: 0 },
                jump: false,
                run: true,
                ski: false,
                jetpack: false
            }, 1/60);

            expect(mockPhysicsSystem.applyForce).toHaveBeenCalledWith(
                mockPhysicsBody,
                expect.objectContaining({ 
                    x: expect.any(Number),
                    y: 0,
                    z: 0
                })
            );
        });

        it('should apply jump force when jumping', () => {
            // Mock ground check
            mockPhysicsSystem.raycast.mockReturnValueOnce({ normal: new BabylonVector3(0, 1, 0) });

            movementSystem.update({
                moveDirection: { x: 0, y: 0, z: 0 },
                lookDirection: { x: 0, y: 0, z: 1 },
                jump: true,
                run: false,
                ski: false,
                jetpack: false
            }, 1/60);

            expect(mockPhysicsSystem.applyImpulse).toHaveBeenCalledWith(
                mockPhysicsBody,
                expect.objectContaining({ x: 0, y: expect.any(Number), z: 0 })
            );
        });

        it('should not jump when in air', () => {
            // Mock no ground
            mockPhysicsSystem.raycast.mockReturnValueOnce(null);

            movementSystem.update({
                moveDirection: { x: 0, y: 0, z: 0 },
                lookDirection: { x: 0, y: 0, z: 1 },
                jump: true,
                run: false,
                ski: false,
                jetpack: false
            }, 1/60);

            expect(mockPhysicsSystem.applyImpulse).not.toHaveBeenCalled();
        });
    });

    describe('Skiing', () => {
        it('should activate skiing on slope', () => {
            // Mock slope check
            mockPhysicsSystem.raycast.mockReturnValueOnce({
                normal: new BabylonVector3(0.2, 0.8, 0)
            });

            movementSystem.update({
                moveDirection: { x: 1, y: 0, z: 0 },
                lookDirection: { x: 1, y: 0, z: 0 },
                jump: false,
                run: false,
                ski: true,
                jetpack: false
            }, 1/60);

            const state = movementSystem.getState();
            expect(state.isSkiing).toBe(true);
        });

        it('should not activate skiing on flat ground', () => {
            // Mock flat ground
            mockPhysicsSystem.raycast.mockReturnValueOnce({
                normal: new BabylonVector3(0, 1, 0)
            });

            movementSystem.update({
                moveDirection: { x: 1, y: 0, z: 0 },
                lookDirection: { x: 1, y: 0, z: 0 },
                jump: false,
                run: false,
                ski: true,
                jetpack: false
            }, 1/60);

            const state = movementSystem.getState();
            expect(state.isSkiing).toBe(false);
        });
    });

    describe('Jetpack', () => {
        it('should activate jetpack with sufficient fuel', () => {
            movementSystem.update({
                moveDirection: { x: 0, y: 0, z: 0 },
                lookDirection: { x: 0, y: 0, z: 1 },
                jump: false,
                run: false,
                ski: false,
                jetpack: true
            }, 1/60);

            const state = movementSystem.getState();
            expect(state.isJetpackActive).toBe(true);
            expect(mockPhysicsSystem.applyForce).toHaveBeenCalled();
        });

        it('should consume fuel while active', () => {
            // Initial state
            const initialState = movementSystem.getState();
            const initialFuel = initialState.jetpackFuel;

            // Activate jetpack
            movementSystem.update({
                moveDirection: { x: 0, y: 0, z: 0 },
                lookDirection: { x: 0, y: 0, z: 1 },
                jump: false,
                run: false,
                ski: false,
                jetpack: true
            }, 1);

            const finalState = movementSystem.getState();
            expect(finalState.jetpackFuel).toBeLessThan(initialFuel);
        });

        it('should regenerate fuel when inactive', () => {
            // Deplete some fuel first
            movementSystem.update({
                moveDirection: { x: 0, y: 0, z: 0 },
                lookDirection: { x: 0, y: 0, z: 1 },
                jump: false,
                run: false,
                ski: false,
                jetpack: true
            }, 1);

            const depleted = movementSystem.getState().jetpackFuel;

            // Let it regenerate
            movementSystem.update({
                moveDirection: { x: 0, y: 0, z: 0 },
                lookDirection: { x: 0, y: 0, z: 1 },
                jump: false,
                run: false,
                ski: false,
                jetpack: false
            }, 1);

            const regenerated = movementSystem.getState().jetpackFuel;
            expect(regenerated).toBeGreaterThan(depleted);
        });
    });

    describe('Event Handling', () => {
        it('should emit ground contact event', () => {
            const mockEventEmit = jest.fn();
            (EventBus.getInstance() as any).emit = mockEventEmit;

            // Simulate ground contact
            mockPhysicsSystem.raycast.mockReturnValueOnce({
                normal: new BabylonVector3(0, 1, 0)
            });

            movementSystem.update({
                moveDirection: { x: 0, y: 0, z: 0 },
                lookDirection: { x: 0, y: 0, z: 1 },
                jump: false,
                run: false,
                ski: false,
                jetpack: false
            }, 1/60);

            expect(mockEventEmit).toHaveBeenCalledWith(
                'movement:groundContact',
                expect.any(Object)
            );
        });

        it('should emit jump events', () => {
            const mockEventEmit = jest.fn();
            (EventBus.getInstance() as any).emit = mockEventEmit;

            // Mock ground check for jump
            mockPhysicsSystem.raycast.mockReturnValueOnce({
                normal: new BabylonVector3(0, 1, 0)
            });

            // Perform jump
            movementSystem.update({
                moveDirection: { x: 0, y: 0, z: 0 },
                lookDirection: { x: 0, y: 0, z: 1 },
                jump: true,
                run: false,
                ski: false,
                jetpack: false
            }, 1/60);

            expect(mockEventEmit).toHaveBeenCalledWith(
                'movement:jumpStart',
                undefined
            );
        });
    });
}); 