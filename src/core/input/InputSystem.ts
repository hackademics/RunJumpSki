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

export class InputSystem implements IInputSystem {
  private inputManager: IInputManager;
  private inputMapper: IInputMapper;

  constructor(inputManager?: IInputManager, inputMapper?: IInputMapper) {
    // Use dependency injection to allow custom instances, or default to our implementations.
    this.inputManager = inputManager || new InputManager();
    this.inputMapper = inputMapper || new InputMapper();

    // Bind event handlers to maintain the proper context.
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
  }

  public initialize(): void {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("mousemove", this.handleMouseMove);
  }

  public destroy(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("mousemove", this.handleMouseMove);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    this.inputManager.setKeyState(event.key, true);
    const action = this.inputMapper.getActionForKey(event.key);
    if (action) {
      // Here you might dispatch the action to other systems or log it.
      console.log(`Action triggered: ${action}`);
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    this.inputManager.setKeyState(event.key, false);
  }

  private handleMouseMove(event: MouseEvent): void {
    this.inputManager.setMousePosition(event.clientX, event.clientY);
  }
}
