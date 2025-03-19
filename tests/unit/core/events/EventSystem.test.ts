import { EventDispatcher } from '../src/core/events/EventDispatcher';
import { EventSystem } from '../src/core/events/EventSystem';
import { Event, DataEvent } from '../src/core/events/Event';
import { EventTypes, KeyInputEvent, MouseInputEvent } from '../src/core/events/CommonEvents';
import { ServiceLocator } from '../src/core/base/ServiceLocator';
import { LoggingSystem } from '../src/core/utils/LoggingSystem';
import { ILogger } from '../src/core/utils/ILogger';

describe('EventDispatcher', () => {
  let dispatcher: EventDispatcher;
  
  beforeEach(() => {
    dispatcher = new EventDispatcher();
  });
  
  test('should subscribe to events', () => {
    const handler = jest.fn();
    const subscriptionId = dispatcher.subscribe('test.event', handler);
    
    expect(subscriptionId).toBeDefined();
    expect(typeof subscriptionId).toBe('string');
  });
  
  test('should dispatch events to subscribers', () => {
    const handler = jest.fn();
    dispatcher.subscribe('test.event', handler);
    
    const event = new Event('test.event');
    dispatcher.dispatch(event);
    
    expect(handler).toHaveBeenCalledWith(event);
  });
  
  test('should not dispatch to unrelated subscribers', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    
    dispatcher.subscribe('test.event.1', handler1);
    dispatcher.subscribe('test.event.2', handler2);
    
    const event = new Event('test.event.1');
    dispatcher.dispatch(event);
    
    expect(handler1).toHaveBeenCalledWith(event);
    expect(handler2).not.toHaveBeenCalled();
  });
  
  test('should unsubscribe correctly', () => {
    const handler = jest.fn();
    const subscriptionId = dispatcher.subscribe('test.event', handler);
    
    const result = dispatcher.unsubscribe(subscriptionId);
    expect(result).toBe(true);
    
    const event = new Event('test.event');
    dispatcher.dispatch(event);
    
    expect(handler).not.toHaveBeenCalled();
  });
  
  test('should return false when unsubscribing with invalid ID', () => {
    const result = dispatcher.unsubscribe('invalid-id');
    expect(result).toBe(false);
  });
  
  test('should clear all subscriptions for an event type', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    
    dispatcher.subscribe('test.event', handler1);
    dispatcher.subscribe('test.event', handler2);
    
    const count = dispatcher.clearEventType('test.event');
    expect(count).toBe(2);
    
    const event = new Event('test.event');
    dispatcher.dispatch(event);
    
    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });
  
  test('should clear all subscriptions', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    
    dispatcher.subscribe('test.event.1', handler1);
    dispatcher.subscribe('test.event.2', handler2);
    
    const count = dispatcher.clearAll();
    expect(count).toBe(2);
    
    dispatcher.dispatch(new Event('test.event.1'));
    dispatcher.dispatch(new Event('test.event.2'));
    
    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });
  
  test('should handle errors in event handlers', () => {
    const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const goodHandler = jest.fn();
    const badHandler = jest.fn().mockImplementation(() => {
      throw new Error('Handler error');
    });
    
    dispatcher.subscribe('test.event', goodHandler);
    dispatcher.subscribe('test.event', badHandler);
    
    const event = new Event('test.event');
    dispatcher.dispatch(event);
    
    // Good handler should still be called
    expect(goodHandler).toHaveBeenCalledWith(event);
    
    // Bad handler throws but shouldn't break dispatching
    expect(badHandler).toHaveBeenCalledWith(event);
    
    consoleErrorMock.mockRestore();
  });
});

describe('EventSystem', () => {
  let eventSystem: EventSystem;
  let loggingSystem: LoggingSystem;
  
  beforeEach(() => {
    // Reset ServiceLocator between tests
    ServiceLocator.reset();
    
    // Set up logging system first
    loggingSystem = new LoggingSystem();
    ServiceLocator.register<ILogger>(ILogger, loggingSystem);
    
    eventSystem = new EventSystem();
  });
  
  test('should initialize with the correct priority', () => {
    expect(eventSystem.priority).toBe(-900);
  });
  
  test('should initialize and log status', () => {
    const infoSpy = jest.spyOn(loggingSystem, 'info');
    
    eventSystem.initialize();
    
    expect(infoSpy).toHaveBeenCalledWith('EventSystem initialized');
  });
  
  test('should route events to subscribers', () => {
    eventSystem.initialize();
    
    const handler = jest.fn();
    eventSystem.subscribe('test.event', handler);
    
    const event = new Event('test.event');
    eventSystem.dispatch(event);
    
    expect(handler).toHaveBeenCalledWith(event);
  });
  
  test('should support common event types', () => {
    eventSystem.initialize();
    
    // KeyInputEvent handler
    const keyHandler = jest.fn();
    eventSystem.subscribe(EventTypes.INPUT_KEY_DOWN, keyHandler);
    
    const keyEvent = new KeyInputEvent(EventTypes.INPUT_KEY_DOWN, 'a', 'KeyA', {
      ctrlKey: true
    });
    
    eventSystem.dispatch(keyEvent);
    
    expect(keyHandler).toHaveBeenCalledWith(keyEvent);
    expect(keyEvent.data.key).toBe('a');
    expect(keyEvent.data.ctrlKey).toBe(true);
    
    // MouseInputEvent handler
    const mouseHandler = jest.fn();
    eventSystem.subscribe(EventTypes.INPUT_MOUSE_MOVE, mouseHandler);
    
    const mouseEvent = new MouseInputEvent(EventTypes.INPUT_MOUSE_MOVE, 100, 200, {
      movementX: 5,
      movementY: 10
    });
    
    eventSystem.dispatch(mouseEvent);
    
    expect(mouseHandler).toHaveBeenCalledWith(mouseEvent);
    expect(mouseEvent.data.x).toBe(100);
    expect(mouseEvent.data.y).toBe(200);
    expect(mouseEvent.data.movementX).toBe(5);
  });
  
  test('should clean up on shutdown', () => {
    eventSystem.initialize();
    
    const handler = jest.fn();
    eventSystem.subscribe('test.event', handler);
    
    const infoSpy = jest.spyOn(loggingSystem, 'info');
    
    eventSystem.shutdown();
    
    // Verify that the event subscriptions were cleared
    const event = new Event('test.event');
    eventSystem.dispatch(event);
    
    expect(handler).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('cleared 1 subscriptions'));
  });
});