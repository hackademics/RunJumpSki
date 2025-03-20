/**
 * @file src/core/input/InputSystem.ts
 * @description Core input system that handles keyboard and mouse events and delegates them to the InputManager and InputMapper.
 * 
 * @dependencies IInputSystem.ts, IInputManager.ts, InputManager.ts, IInputMapper.ts, InputMapper.ts
 * @relatedFiles IInputSystem.ts, IInputManager.ts, IInputMapper.ts
 */

import { IInputSystem } from "./IInputSystem";
import { IInputManager } from "./IInputManager";
import { InputManager } from "./InputManager";
import { IInputMapper } from "./IInputMapper";
import { InputMapper } from "./InputMapper";
import { EventListenerManager } from "../utils/EventListenerManager";
import { Logger } from "../utils/Logger";
import { ServiceLocator } from "../base/ServiceLocator";

export class InputSystem implements IInputSystem {
  private inputManager: IInputManager;
  private inputMapper: IInputMapper;
  private eventListenerManager: EventListenerManager;
  private logger: Logger;
  private isInitialized: boolean = false;

  /**
   * Creates a new InputSystem
   * @param inputManager Optional custom input manager
   * @param inputMapper Optional custom input mapper
   * @param eventListenerManager Optional event listener manager
   */
  constructor(
    inputManager?: IInputManager, 
    inputMapper?: IInputMapper,
    eventListenerManager?: EventListenerManager
  ) {
    // Use dependency injection to allow custom instances, or default to our implementations.
    this.inputManager = inputManager || new InputManager();
    this.inputMapper = inputMapper || new InputMapper();
    this.eventListenerManager = eventListenerManager || new EventListenerManager();

    // Try to get the logger from ServiceLocator
    try {
      const serviceLocator = ServiceLocator.getInstance();
      this.logger = serviceLocator.has('logger') 
        ? serviceLocator.get<Logger>('logger') 
        : new Logger('InputSystem');
    } catch (e) {
      this.logger = new Logger('InputSystem');
      console.warn('ServiceLocator not available for InputSystem, using default logger');
    }

    // Bind event handlers to maintain the proper context.
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    
    this.logger.debug('InputSystem created');
  }

  /**
   * Initializes the input system by registering event listeners
   */
  public initialize(): void {
    if (this.isInitialized) {
      this.logger.warn('InputSystem already initialized');
      return;
    }
    
    this.logger.debug('Initializing InputSystem');
    
    // Register event listeners using EventListenerManager
    this.eventListenerManager.addDOMListener(
      window,
      "keydown",
      this.handleKeyDown as EventListener,
      undefined,
      'inputSystem'
    );
    
    this.eventListenerManager.addDOMListener(
      window,
      "keyup",
      this.handleKeyUp as EventListener,
      undefined,
      'inputSystem'
    );
    
    this.eventListenerManager.addDOMListener(
      window,
      "mousemove",
      this.handleMouseMove as EventListener,
      undefined,
      'inputSystem'
    );
    
    this.isInitialized = true;
    this.logger.debug('InputSystem initialized');
  }

  /**
   * Disposes the input system by removing event listeners
   */
  public dispose(): void {
    if (!this.isInitialized) {
      this.logger.warn('InputSystem not initialized, nothing to dispose');
      return;
    }
    
    this.logger.debug('Disposing InputSystem');
    
    // Remove all event listeners registered by this system
    this.eventListenerManager.removeListenersByGroup('inputSystem');
    
    this.isInitialized = false;
    this.logger.debug('InputSystem disposed');
  }

  /**
   * Handles key down events
   */
  private handleKeyDown(event: Event): void {
    const keyEvent = event as KeyboardEvent;
    this.inputManager.setKeyState(keyEvent.key, true);
    const action = this.inputMapper.getActionForKey(keyEvent.key);
    if (action) {
      // Here you might dispatch the action to other systems
      this.logger.debug(`Action triggered: ${action}`);
    }
  }

  /**
   * Handles key up events
   */
  private handleKeyUp(event: Event): void {
    const keyEvent = event as KeyboardEvent;
    this.inputManager.setKeyState(keyEvent.key, false);
  }

  /**
   * Handles mouse move events
   */
  private handleMouseMove(event: Event): void {
    const mouseEvent = event as MouseEvent;
    this.inputManager.setMousePosition(mouseEvent.clientX, mouseEvent.clientY);
  }
}

