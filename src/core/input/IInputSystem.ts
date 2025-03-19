/**
 * @file src/core/input/IInputSystem.ts
 * @description Interface for the InputSystem, responsible for handling input events.
 */

export interface IInputSystem {
    /**
     * Initializes the input system by registering event listeners.
     */
    initialize(): void;
  
    /**
     * Destroys the input system by removing event listeners.
     */
    destroy(): void;
  }
  