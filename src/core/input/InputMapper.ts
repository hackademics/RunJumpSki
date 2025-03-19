/**
 * @file src/core/input/InputMapper.ts
 * @description Maps raw input keys to defined game actions.
 * 
 * @dependencies IInputMapper.ts
 * @relatedFiles IInputMapper.ts, InputSystem.ts, IInputManager.ts, InputManager.ts
 */

import { IInputMapper } from "./IInputMapper";

export class InputMapper implements IInputMapper {
  private keyMapping: Map<string, string>;

  constructor() {
    this.keyMapping = new Map<string, string>();
    // Default mappings (can be extended or overridden)
    this.keyMapping.set("ArrowUp", "moveUp");
    this.keyMapping.set("ArrowDown", "moveDown");
    this.keyMapping.set("ArrowLeft", "moveLeft");
    this.keyMapping.set("ArrowRight", "moveRight");
    this.keyMapping.set("Space", "jump");
  }

  public getActionForKey(key: string): string | null {
    return this.keyMapping.get(key) || null;
  }

  public setMapping(key: string, action: string): void {
    this.keyMapping.set(key, action);
  }
}
