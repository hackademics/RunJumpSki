/**
 * @file tests/unit/core/utils/EventListenerManager.test.ts
 * @description Unit tests for the EventListenerManager utility
 */

import { 
  EventListenerManager, 
  EventTargetType 
} from '../../../../src/core/utils/EventListenerManager';
import { ResourceTracker, ResourceType } from '../../../../src/core/utils/ResourceTracker';
import * as BABYLON from 'babylonjs';

// Mock BABYLON objects
jest.mock('babylonjs');

describe('EventListenerManager', () => {
  let eventListenerManager: EventListenerManager;
  let resourceTracker: ResourceTracker;
  
  // Mock DOM elements and event handlers
  let mockElement: HTMLElement;
  let mockCallback: jest.Mock;
  
  // Mock Babylon.js objects
  let mockEngine: any;
  let mockScene: any;
  let mockMesh: any;
  
  // Mock event emitters
  class MockEventEmitter {
    public listeners: Record<string, Function[]> = {};
    
    on(event: string, callback: Function): void {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(callback);
    }
    
    off(event: string, callback: Function): void {
      if (this.listeners[event]) {
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
      }
    }
    
    emit(event: string, ...args: any[]): void {
      if (this.listeners[event]) {
        this.listeners[event].forEach(callback => callback(...args));
      }
    }
  }
  
  beforeEach(() => {
    // Create a new ResourceTracker for each test
    resourceTracker = new ResourceTracker();
    jest.spyOn(resourceTracker, 'track');
    jest.spyOn(resourceTracker, 'disposeResource');
    jest.spyOn(resourceTracker, 'disposeByGroup');
    jest.spyOn(resourceTracker, 'disposeByType');
    
    // Create the EventListenerManager with the ResourceTracker
    eventListenerManager = new EventListenerManager(resourceTracker);
    
    // Mock DOM element
    mockElement = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    } as unknown as HTMLElement;
    
    // Mock callback function
    mockCallback = jest.fn();
    
    // Mock Babylon.js engine
    mockEngine = {
      onResizeObservable: {
        add: jest.fn(),
        remove: jest.fn()
      }
    };
    
    // Mock Babylon.js scene
    mockScene = {
      onBeforeRenderObservable: {
        add: jest.fn(),
        remove: jest.fn()
      },
      onAfterRenderObservable: {
        add: jest.fn(),
        remove: jest.fn()
      },
      onPointerDown: null,
      onPointerUp: null,
      onPointerMove: null
    };
    
    // Mock Babylon.js mesh
    mockMesh = {
      onDisposeObservable: {
        add: jest.fn(),
        remove: jest.fn()
      }
    };
    
    jest.clearAllMocks();
  });
  
  describe('DOM event listeners', () => {
    it('should add and track a DOM event listener', () => {
      const listenerId = eventListenerManager.addDOMListener(
        mockElement,
        'click',
        mockCallback,
        { capture: true },
        'testGroup'
      );
      
      // Verify the listener was added to the element
      expect(mockElement.addEventListener).toHaveBeenCalledWith(
        'click',
        mockCallback,
        { capture: true }
      );
      
      // Verify the listener was tracked
      expect(resourceTracker.track).toHaveBeenCalled();
      expect(listenerId).toBeDefined();
      
      // Verify the tracked resource has correct metadata
      const trackCall = (resourceTracker.track as jest.Mock).mock.calls[0];
      expect(trackCall[1].type).toBe(ResourceType.EVENT_LISTENER);
      expect(trackCall[1].group).toBe('testGroup');
      expect(trackCall[1].metadata.eventName).toBe('click');
      expect(trackCall[1].metadata.targetType).toBe(EventTargetType.ELEMENT);
    });
    
    it('should remove a DOM event listener', () => {
      const listenerId = eventListenerManager.addDOMListener(
        mockElement,
        'click',
        mockCallback
      );
      
      eventListenerManager.removeListener(listenerId);
      
      // Verify the listener was removed
      expect(resourceTracker.disposeResource).toHaveBeenCalledWith(listenerId);
      expect(mockElement.removeEventListener).toHaveBeenCalledWith(
        'click',
        mockCallback,
        undefined
      );
    });
  });
  
  describe('Babylon.js event listeners', () => {
    it('should add and track a Babylon engine event listener', () => {
      const listenerId = eventListenerManager.addBabylonEngineListener(
        mockEngine,
        'resize',
        mockCallback,
        'engineGroup'
      );
      
      // Verify the listener was added to the engine
      expect(mockEngine.onResizeObservable.add).toHaveBeenCalledWith(mockCallback);
      
      // Verify the listener was tracked
      expect(resourceTracker.track).toHaveBeenCalled();
      expect(listenerId).toBeDefined();
      
      // Verify the tracked resource has correct metadata
      const trackCall = (resourceTracker.track as jest.Mock).mock.calls[0];
      expect(trackCall[1].type).toBe(ResourceType.EVENT_LISTENER);
      expect(trackCall[1].group).toBe('engineGroup');
      expect(trackCall[1].metadata.eventName).toBe('resize');
      expect(trackCall[1].metadata.targetType).toBe(EventTargetType.BABYLON_ENGINE);
    });
    
    it('should add and track a Babylon scene event listener', () => {
      const listenerId = eventListenerManager.addBabylonSceneListener(
        mockScene,
        'beforeRender',
        mockCallback,
        'sceneGroup'
      );
      
      // Verify the listener was added to the scene
      expect(mockScene.onBeforeRenderObservable.add).toHaveBeenCalledWith(mockCallback);
      
      // Verify the listener was tracked
      expect(resourceTracker.track).toHaveBeenCalled();
      expect(listenerId).toBeDefined();
      
      // Verify the tracked resource has correct metadata
      const trackCall = (resourceTracker.track as jest.Mock).mock.calls[0];
      expect(trackCall[1].type).toBe(ResourceType.EVENT_LISTENER);
      expect(trackCall[1].group).toBe('sceneGroup');
      expect(trackCall[1].metadata.eventName).toBe('beforeRender');
      expect(trackCall[1].metadata.targetType).toBe(EventTargetType.BABYLON_SCENE);
    });
    
    it('should set property-based scene event listeners', () => {
      const listenerId = eventListenerManager.addBabylonSceneListener(
        mockScene,
        'pointerDown',
        mockCallback
      );
      
      // Verify the listener was set on the scene
      expect(mockScene.onPointerDown).toBe(mockCallback);
      
      // Verify the listener was tracked
      expect(resourceTracker.track).toHaveBeenCalled();
      expect(listenerId).toBeDefined();
    });
    
    it('should remove a Babylon event listener', () => {
      const listenerId = eventListenerManager.addBabylonEngineListener(
        mockEngine,
        'resize',
        mockCallback
      );
      
      eventListenerManager.removeListener(listenerId);
      
      // Verify the listener was removed
      expect(resourceTracker.disposeResource).toHaveBeenCalledWith(listenerId);
      expect(mockEngine.onResizeObservable.remove).toHaveBeenCalledWith(mockCallback);
    });
  });
  
  describe('Custom event emitters', () => {
    it('should add and track a listener on a custom event emitter', () => {
      const mockEmitter = new MockEventEmitter();
      jest.spyOn(mockEmitter, 'on');
      
      const listenerId = eventListenerManager.addCustomEmitterListener(
        mockEmitter,
        'customEvent',
        mockCallback,
        'emitterGroup'
      );
      
      // Verify the listener was added to the emitter
      expect(mockEmitter.on).toHaveBeenCalledWith('customEvent', mockCallback);
      
      // Verify the listener was tracked
      expect(resourceTracker.track).toHaveBeenCalled();
      expect(listenerId).toBeDefined();
      
      // Verify the tracked resource has correct metadata
      const trackCall = (resourceTracker.track as jest.Mock).mock.calls[0];
      expect(trackCall[1].type).toBe(ResourceType.EVENT_LISTENER);
      expect(trackCall[1].group).toBe('emitterGroup');
      expect(trackCall[1].metadata.eventName).toBe('customEvent');
      expect(trackCall[1].metadata.targetType).toBe(EventTargetType.CUSTOM_EMITTER);
      
      // Verify the listener works
      mockEmitter.emit('customEvent', 'testArg');
      expect(mockCallback).toHaveBeenCalledWith('testArg');
    });
    
    it('should remove a listener from a custom event emitter', () => {
      const mockEmitter = new MockEventEmitter();
      jest.spyOn(mockEmitter, 'off');
      
      const listenerId = eventListenerManager.addCustomEmitterListener(
        mockEmitter,
        'customEvent',
        mockCallback
      );
      
      eventListenerManager.removeListener(listenerId);
      
      // Verify the listener was removed
      expect(resourceTracker.disposeResource).toHaveBeenCalledWith(listenerId);
      expect(mockEmitter.off).toHaveBeenCalledWith('customEvent', mockCallback);
      
      // Verify the listener no longer works
      mockEmitter.emit('customEvent', 'testArg');
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });
  
  describe('Batch operations', () => {
    beforeEach(() => {
      // Add multiple listeners in different groups
      eventListenerManager.addDOMListener(mockElement, 'click', mockCallback, undefined, 'group1');
      eventListenerManager.addDOMListener(mockElement, 'mousedown', mockCallback, undefined, 'group1');
      eventListenerManager.addDOMListener(mockElement, 'mouseup', mockCallback, undefined, 'group2');
      eventListenerManager.addBabylonEngineListener(mockEngine, 'resize', mockCallback, 'group2');
      eventListenerManager.addBabylonSceneListener(mockScene, 'beforeRender', mockCallback, 'group3');
    });
    
    it('should remove listeners by group', () => {
      const removedCount = eventListenerManager.removeListenersByGroup('group1');
      
      expect(removedCount).toBe(2);
      expect(resourceTracker.disposeByGroup).toHaveBeenCalledWith('group1');
    });
    
    it('should remove all listeners', () => {
      const removedCount = eventListenerManager.removeAllListeners();
      
      expect(resourceTracker.disposeByType).toHaveBeenCalledWith(ResourceType.EVENT_LISTENER);
    });
    
    it('should return the correct listener count', () => {
      // Mock the stats returned by ResourceTracker
      jest.spyOn(resourceTracker, 'getStats').mockReturnValue({
        totalCount: 10,
        countsByType: {
          [ResourceType.EVENT_LISTENER]: 5,
          [ResourceType.MESH]: 2,
          [ResourceType.MATERIAL]: 3
        } as any,
        countsByGroup: {},
        countsByScene: {}
      });
      
      const count = eventListenerManager.getListenerCount();
      expect(count).toBe(5);
    });
  });
}); 