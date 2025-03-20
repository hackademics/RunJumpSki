/**
 * @file src/core/utils/EventListenerManager.ts
 * @description Utility for managing event listeners with proper cleanup
 */

import { ResourceTracker, ResourceType, IDisposable } from './ResourceTracker';
import { Logger } from './Logger';
import { ServiceLocator } from '../base/ServiceLocator';

/**
 * Types of event targets
 */
export enum EventTargetType {
  WINDOW = 'window',
  DOCUMENT = 'document',
  ELEMENT = 'element',
  BABYLON_ENGINE = 'babylonEngine',
  BABYLON_SCENE = 'babylonScene',
  BABYLON_MESH = 'babylonMesh',
  BABYLON_CAMERA = 'babylonCamera',
  CUSTOM_EMITTER = 'customEmitter'
}

/**
 * Information about an event listener
 */
export interface EventListenerInfo {
  /** Type of event target */
  targetType: EventTargetType;
  /** The target object the listener is attached to */
  target: any;
  /** Event type/name */
  eventName: string;
  /** Callback function */
  callback: (...args: any[]) => void;
  /** Optional options passed to addEventListener */
  options?: AddEventListenerOptions | boolean;
  /** Group identifier for batch operations */
  group?: string;
  /** Custom identifier */
  id?: string;
}

/**
 * Disposable wrapper for an event listener
 */
class EventListenerWrapper implements IDisposable {
  private info: EventListenerInfo;
  private removed: boolean = false;

  /**
   * Create a new event listener wrapper
   * @param info Event listener information
   */
  constructor(info: EventListenerInfo) {
    this.info = info;
  }

  /**
   * Get the event listener information
   */
  public getInfo(): EventListenerInfo {
    return this.info;
  }

  /**
   * Check if the event listener has been removed
   */
  public isRemoved(): boolean {
    return this.removed;
  }

  /**
   * Remove the event listener
   */
  public dispose(): void {
    if (this.removed) {
      return;
    }

    try {
      this.removeEventListener();
      this.removed = true;
    } catch (error) {
      console.error(`Failed to remove event listener: ${error}`);
      // Mark as removed anyway so we don't try again
      this.removed = true;
    }
  }

  /**
   * Remove the event listener from its target
   */
  private removeEventListener(): void {
    const { target, eventName, callback, options } = this.info;
    
    if (!target) {
      throw new Error('Event target is null or undefined');
    }

    switch (this.info.targetType) {
      case EventTargetType.WINDOW:
      case EventTargetType.DOCUMENT:
      case EventTargetType.ELEMENT:
        // Standard DOM event listeners
        target.removeEventListener(eventName, callback, options);
        break;
        
      case EventTargetType.BABYLON_ENGINE:
        // BabylonJS engine events usually use unregisterEvents or observers
        if (eventName === 'resize') {
          target.onResizeObservable.remove(callback);
        } else {
          console.warn(`Unknown engine event: ${eventName}`);
        }
        break;
        
      case EventTargetType.BABYLON_SCENE:
        // BabylonJS scene events
        switch (eventName) {
          case 'beforeRender':
            target.onBeforeRenderObservable.remove(callback);
            break;
          case 'afterRender':
            target.onAfterRenderObservable.remove(callback);
            break;
          case 'beforeCameraRender':
            target.onBeforeCameraRenderObservable.remove(callback);
            break;
          case 'afterCameraRender':
            target.onAfterCameraRenderObservable.remove(callback);
            break;
          case 'pointerDown':
            target.onPointerDown = null;
            break;
          case 'pointerUp':
            target.onPointerUp = null;
            break;
          case 'pointerMove':
            target.onPointerMove = null;
            break;
          default:
            // Try to handle observable naming pattern
            const observableName = `on${eventName.charAt(0).toUpperCase() + eventName.slice(1)}Observable`;
            if (target[observableName]) {
              target[observableName].remove(callback);
            } else {
              console.warn(`Unknown scene event: ${eventName}`);
            }
        }
        break;
        
      case EventTargetType.BABYLON_MESH:
        // BabylonJS mesh events
        switch (eventName) {
          case 'dispose':
            target.onDisposeObservable.remove(callback);
            break;
          default:
            // Try to handle observable naming pattern
            const observableName = `on${eventName.charAt(0).toUpperCase() + eventName.slice(1)}Observable`;
            if (target[observableName]) {
              target[observableName].remove(callback);
            } else {
              console.warn(`Unknown mesh event: ${eventName}`);
            }
        }
        break;
        
      case EventTargetType.BABYLON_CAMERA:
        // BabylonJS camera events
        switch (eventName) {
          case 'position':
            target.onPositionChangedObservable.remove(callback);
            break;
          case 'target':
            target.onTargetChangedObservable.remove(callback);
            break;
          default:
            // Try to handle observable naming pattern
            const observableName = `on${eventName.charAt(0).toUpperCase() + eventName.slice(1)}Observable`;
            if (target[observableName]) {
              target[observableName].remove(callback);
            } else {
              console.warn(`Unknown camera event: ${eventName}`);
            }
        }
        break;
        
      case EventTargetType.CUSTOM_EMITTER:
        // Custom event emitters should have a removeListener, off, or unsubscribe method
        if (typeof target.removeListener === 'function') {
          target.removeListener(eventName, callback);
        } else if (typeof target.off === 'function') {
          target.off(eventName, callback);
        } else if (typeof target.unsubscribe === 'function') {
          target.unsubscribe(eventName, callback);
        } else {
          throw new Error('Custom event emitter does not implement removeListener, off, or unsubscribe method');
        }
        break;
        
      default:
        throw new Error(`Unsupported event target type: ${this.info.targetType}`);
    }
  }
}

/**
 * Manager for tracking and cleaning up event listeners
 */
export class EventListenerManager {
  private resourceTracker: ResourceTracker;
  private listenerCount: number = 0;
  private logger: Logger | null = null;
  
  /**
   * Create a new event listener manager
   * @param resourceTracker Resource tracker for listener registration
   */
  constructor(resourceTracker?: ResourceTracker) {
    if (resourceTracker) {
      this.resourceTracker = resourceTracker;
    } else {
      this.resourceTracker = new ResourceTracker();
    }
    
    try {
      const serviceLocator = ServiceLocator.getInstance();
      if (serviceLocator.has('logger')) {
        this.logger = serviceLocator.get<Logger>('logger');
      }
    } catch (e) {
      console.warn('Logger not available for EventListenerManager');
    }
  }
  
  /**
   * Add an event listener to a DOM element and track for cleanup
   * @param element The DOM element
   * @param eventName The event type
   * @param callback The event handler function
   * @param options Optional event listener options
   * @param group Optional group identifier for batch operations
   * @returns ID for the tracked listener
   */
  public addDOMListener(
    element: HTMLElement | Window | Document,
    eventName: string,
    callback: EventListener,
    options?: AddEventListenerOptions | boolean,
    group?: string
  ): string {
    let targetType: EventTargetType;
    
    if (element === window) {
      targetType = EventTargetType.WINDOW;
    } else if (element === document) {
      targetType = EventTargetType.DOCUMENT;
    } else {
      targetType = EventTargetType.ELEMENT;
    }
    
    const info: EventListenerInfo = {
      targetType,
      target: element,
      eventName,
      callback,
      options,
      group
    };
    
    // Attach the event listener
    element.addEventListener(eventName, callback, options);
    
    // Create a wrapper and track it
    return this.trackListener(new EventListenerWrapper(info), group);
  }
  
  /**
   * Add a listener to a Babylon.js engine event
   * @param engine The Babylon.js engine
   * @param eventName The event name
   * @param callback The callback function
   * @param group Optional group identifier
   * @returns ID for the tracked listener
   */
  public addBabylonEngineListener(
    engine: any, // BABYLON.Engine
    eventName: string,
    callback: (...args: any[]) => void,
    group?: string
  ): string {
    const info: EventListenerInfo = {
      targetType: EventTargetType.BABYLON_ENGINE,
      target: engine,
      eventName,
      callback,
      group
    };
    
    // Attach the event listener based on event type
    if (eventName === 'resize') {
      engine.onResizeObservable.add(callback);
    } else {
      this.logWarning(`Unknown engine event: ${eventName}, listener may not be properly attached`);
    }
    
    // Create a wrapper and track it
    return this.trackListener(new EventListenerWrapper(info), group);
  }
  
  /**
   * Add a listener to a Babylon.js scene event
   * @param scene The Babylon.js scene
   * @param eventName The event name
   * @param callback The callback function
   * @param group Optional group identifier
   * @returns ID for the tracked listener
   */
  public addBabylonSceneListener(
    scene: any, // BABYLON.Scene
    eventName: string,
    callback: (...args: any[]) => void,
    group?: string
  ): string {
    const info: EventListenerInfo = {
      targetType: EventTargetType.BABYLON_SCENE,
      target: scene,
      eventName,
      callback,
      group
    };
    
    // Attach the event listener based on event type
    switch (eventName) {
      case 'beforeRender':
        scene.onBeforeRenderObservable.add(callback);
        break;
      case 'afterRender':
        scene.onAfterRenderObservable.add(callback);
        break;
      case 'beforeCameraRender':
        scene.onBeforeCameraRenderObservable.add(callback);
        break;
      case 'afterCameraRender':
        scene.onAfterCameraRenderObservable.add(callback);
        break;
      case 'pointerDown':
        scene.onPointerDown = callback;
        break;
      case 'pointerUp':
        scene.onPointerUp = callback;
        break;
      case 'pointerMove':
        scene.onPointerMove = callback;
        break;
      default:
        // Try to use observable naming pattern
        const observableName = `on${eventName.charAt(0).toUpperCase() + eventName.slice(1)}Observable`;
        if (scene[observableName]) {
          scene[observableName].add(callback);
        } else {
          this.logWarning(`Unknown scene event: ${eventName}, listener may not be properly attached`);
        }
    }
    
    // Create a wrapper and track it
    return this.trackListener(new EventListenerWrapper(info), group);
  }
  
  /**
   * Add a listener to a custom event emitter
   * @param emitter The event emitter object
   * @param eventName The event name
   * @param callback The callback function
   * @param group Optional group identifier
   * @returns ID for the tracked listener
   */
  public addCustomEmitterListener(
    emitter: any,
    eventName: string,
    callback: (...args: any[]) => void,
    group?: string
  ): string {
    const info: EventListenerInfo = {
      targetType: EventTargetType.CUSTOM_EMITTER,
      target: emitter,
      eventName,
      callback,
      group
    };
    
    // Attach the event listener based on available methods
    if (typeof emitter.addListener === 'function') {
      emitter.addListener(eventName, callback);
    } else if (typeof emitter.on === 'function') {
      emitter.on(eventName, callback);
    } else if (typeof emitter.addEventListener === 'function') {
      emitter.addEventListener(eventName, callback);
    } else if (typeof emitter.subscribe === 'function') {
      emitter.subscribe(eventName, callback);
    } else {
      throw new Error('Custom event emitter does not implement a recognized event registration method');
    }
    
    // Create a wrapper and track it
    return this.trackListener(new EventListenerWrapper(info), group);
  }
  
  /**
   * Remove a specific event listener
   * @param id The listener ID
   * @returns True if the listener was found and removed
   */
  public removeListener(id: string): boolean {
    return this.resourceTracker.disposeResource(id);
  }
  
  /**
   * Remove all listeners in a specific group
   * @param group The group name
   * @returns Number of listeners removed
   */
  public removeListenersByGroup(group: string): number {
    return this.resourceTracker.disposeByGroup(group);
  }
  
  /**
   * Remove all event listeners
   * @returns Number of listeners removed
   */
  public removeAllListeners(): number {
    return this.resourceTracker.disposeByType(ResourceType.EVENT_LISTENER);
  }
  
  /**
   * Get the count of tracked listeners
   * @returns Number of tracked listeners
   */
  public getListenerCount(): number {
    return this.resourceTracker.getStats().countsByType[ResourceType.EVENT_LISTENER] || 0;
  }
  
  /**
   * Track an event listener wrapper
   * @param wrapper The event listener wrapper
   * @param group Optional group identifier
   * @returns ID for the tracked listener
   */
  private trackListener(wrapper: EventListenerWrapper, group?: string): string {
    const id = `listener_${++this.listenerCount}`;
    
    return this.resourceTracker.track(wrapper, {
      type: ResourceType.EVENT_LISTENER,
      id,
      group,
      metadata: {
        eventName: wrapper.getInfo().eventName,
        targetType: wrapper.getInfo().targetType
      }
    });
  }
  
  /**
   * Log a warning message
   * @param message The warning message
   */
  private logWarning(message: string): void {
    if (this.logger) {
      this.logger.warn(`[EventListenerManager] ${message}`);
    } else {
      console.warn(`[EventListenerManager] ${message}`);
    }
  }
} 