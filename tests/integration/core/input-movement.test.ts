import { InputSystem } from '../../../src/core/input/InputSystem';
import { MovementSystem } from '../../../src/core/movement/MovementSystem';
import { EventBus } from '../../../src/core/events/EventBus';
import { ServiceContainer } from '../../../src/core/services/ServiceContainer';
import { Logger } from '../../../src/core/logger/Logger';
import { wait, runFrames } from '../helpers';
import { Vector3 } from '../../../src/types/common/Vector3';

// Mock keyboard events
const createKeyboardEvent = (type: string, key: string, code: string) => {
  return {
    type,
    key,
    code,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn()
  } as unknown as KeyboardEvent;
};

describe('Input and Movement Integration', () => {
  let inputSystem: InputSystem;
  let movementSystem: MovementSystem;
  let eventBus: EventBus;
  let serviceContainer: ServiceContainer;
  
  beforeEach(async () => {
    // Setup service container
    serviceContainer = ServiceContainer.getInstance();
    
    // Setup logger
    const logger = Logger.getInstance();
    logger.initialize();
    serviceContainer.register('logger', () => logger, {
      id: 'logger',
      implementation: logger,
      singleton: true
    });
    
    // Setup event bus
    eventBus = EventBus.getInstance();
    serviceContainer.register('eventBus', () => eventBus, {
      id: 'eventBus',
      implementation: eventBus,
      singleton: true
    });
    
    // Setup input system
    inputSystem = InputSystem.getInstance();
    inputSystem.initialize({
      keyboard: true,
      mouse: true,
      gamepad: false,
      touch: false,
      preventDefaults: true,
      usePointerLock: false
    });
    serviceContainer.register('input', () => inputSystem, {
      id: 'input',
      implementation: inputSystem,
      singleton: true
    });
    
    // Setup movement system
    movementSystem = MovementSystem.getInstance();
    movementSystem.initialize({
      maxSpeed: 10,
      acceleration: 20,
      deceleration: 10,
      jumpForce: 8,
      gravity: 20,
      airControl: 0.3
    });
    serviceContainer.register('movement', () => movementSystem, {
      id: 'movement',
      implementation: movementSystem,
      singleton: true
    });
    
    // Wait for systems to fully initialize
    await wait(100);
  });
  
  afterEach(() => {
    // Clean up
    inputSystem.dispose();
    movementSystem.dispose();
    eventBus.dispose();
    serviceContainer.dispose();
  });
  
  test('should initialize both systems successfully', () => {
    expect(inputSystem).toBeDefined();
    expect(movementSystem).toBeDefined();
  });
  
  test('should process keyboard input and emit movement events', () => {
    // Spy on event bus
    const emitSpy = jest.spyOn(eventBus, 'emit');
    
    // Simulate key press
    const keyDownEvent = createKeyboardEvent('keydown', 'w', 'KeyW');
    window.dispatchEvent(keyDownEvent);
    
    // Update input system
    inputSystem.update(1/60);
    
    // Verify input event was emitted
    expect(emitSpy).toHaveBeenCalledWith('input:key', expect.objectContaining({
      key: 'w',
      code: 'KeyW',
      pressed: true
    }));
    
    // Verify movement input was processed
    expect(emitSpy).toHaveBeenCalledWith('input:movement', expect.objectContaining({
      direction: expect.any(Object)
    }));
  });
  
  test('should translate input events to movement commands', () => {
    // Create a test entity
    const entityId = 'test-player';
    
    // Register entity with movement system
    movementSystem.registerEntity(entityId, {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true
    });
    
    // Simulate forward movement input
    eventBus.emit('input:movement', {
      direction: { x: 0, y: 0, z: 1 },
      magnitude: 1
    });
    
    // Update movement system
    movementSystem.update(1/60);
    
    // Get updated position
    const position = movementSystem.getEntityPosition(entityId);
    const velocity = movementSystem.getEntityVelocity(entityId);
    
    // Verify entity moved forward
    expect(velocity.z).toBeGreaterThan(0);
    expect(position.z).toBeGreaterThan(0);
  });
  
  test('should handle combined movement inputs', () => {
    // Create a test entity
    const entityId = 'test-player';
    
    // Register entity with movement system
    movementSystem.registerEntity(entityId, {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true
    });
    
    // Simulate diagonal movement input (forward + right)
    eventBus.emit('input:movement', {
      direction: { x: 1, y: 0, z: 1 },
      magnitude: 1
    });
    
    // Update movement system multiple times
    runFrames((deltaTime) => {
      movementSystem.update(deltaTime);
    }, 10);
    
    // Get updated position
    const position = movementSystem.getEntityPosition(entityId);
    
    // Verify entity moved diagonally
    expect(position.x).toBeGreaterThan(0);
    expect(position.z).toBeGreaterThan(0);
  });
  
  test('should handle jump commands', () => {
    // Create a test entity
    const entityId = 'test-player';
    
    // Register entity with movement system
    movementSystem.registerEntity(entityId, {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true
    });
    
    // Initial y position
    const initialPosition = movementSystem.getEntityPosition(entityId);
    
    // Simulate jump input
    eventBus.emit('input:jump', { entityId });
    
    // Update movement system
    movementSystem.update(1/60);
    
    // Get updated velocity
    const velocity = movementSystem.getEntityVelocity(entityId);
    
    // Verify entity is jumping (positive y velocity)
    expect(velocity.y).toBeGreaterThan(0);
    
    // Run several updates to see the jump arc
    runFrames((deltaTime) => {
      movementSystem.update(deltaTime);
    }, 10);
    
    // Get position after several frames
    const midPosition = movementSystem.getEntityPosition(entityId);
    
    // Verify entity moved upward
    expect(midPosition.y).toBeGreaterThan(initialPosition.y);
    
    // Run more updates to complete the jump
    runFrames((deltaTime) => {
      movementSystem.update(deltaTime);
    }, 30);
    
    // Get final velocity
    const finalVelocity = movementSystem.getEntityVelocity(entityId);
    
    // Verify entity is falling back down (negative y velocity)
    expect(finalVelocity.y).toBeLessThan(0);
  });
}); 