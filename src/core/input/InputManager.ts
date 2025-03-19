/**
 * @file src/core/input/InputManager.ts
 * @description Manages input state by tracking keyboard and mouse events.
 * 
 * @dependencies IInputManager.ts
 * @relatedFiles IInputManager.ts, InputSystem.ts, IInputMapper.ts, InputMapper.ts
 */

import { IInputManager } from "./IInputManager";

export class InputManager implements IInputManager {
  private keys: Map<string, boolean>;
  private mousePosition: { x: number; y: number };

  constructor() {
    this.keys = new Map<string, boolean>();
    this.mousePosition = { x: 0, y: 0 };
  }

  public isKeyPressed(key: string): boolean {
    return this.keys.get(key) || false;
  }

  public setKeyState(key: string, pressed: boolean): void {
    this.keys.set(key, pressed);
  }

  public getMousePosition(): { x: number; y: number } {
    return this.mousePosition;
  }

  public setMousePosition(x: number, y: number): void {
    this.mousePosition = { x, y };
  }
}
