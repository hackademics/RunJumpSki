/**
 * @file src/core/input/InputMapper.ts
 * @description Maps raw input keys to defined game actions.
 * 
 * @dependencies IInputMapper.ts
 * @relatedFiles IInputMapper.ts, InputSystem.ts, IInputManager.ts, InputManager.ts
 */

import { IInputBindingConfig, IInputMapper } from "./IInputMapper";

export class InputMapper implements IInputMapper {
  private keyMapping: Map<string, string>;
  private bindingConfigs: Map<string, IInputBindingConfig>;
  private defaultKeyMapping: Map<string, string>;
  protected activeContext: string = "default";

  constructor() {
    this.keyMapping = new Map<string, string>();
    this.bindingConfigs = new Map<string, IInputBindingConfig>();
    this.defaultKeyMapping = new Map<string, string>();
    
    // Default mappings (can be extended or overridden)
    this.setMapping("ArrowUp", "moveUp");
    this.setMapping("ArrowDown", "moveDown");
    this.setMapping("ArrowLeft", "moveLeft");
    this.setMapping("ArrowRight", "moveRight");
    this.setMapping("Space", "jump");
    
    // Store these as defaults
    this.defaultKeyMapping = new Map(this.keyMapping);
  }

  public getActionForKey(key: string, context?: string): string | null {
    // Ignore context in base implementation
    return this.keyMapping.get(key) || null;
  }

  public setMapping(key: string, action: string, context?: string): void {
    // Ignore context in base implementation
    this.keyMapping.set(key, action);
  }
  
  public setBindingConfig(config: IInputBindingConfig): void {
    this.bindingConfigs.set(config.key, config);
    this.setMapping(config.key, config.action, config.context);
  }
  
  public getBindingConfig(key: string, context?: string): IInputBindingConfig | null {
    // Ignore context in base implementation
    return this.bindingConfigs.get(key) || null;
  }
  
  public clearMappings(context?: string): void {
    // Ignore context in base implementation
    this.keyMapping.clear();
    this.bindingConfigs.clear();
  }
  
  public resetToDefaults(context?: string): void {
    // Ignore context in base implementation
    this.keyMapping = new Map(this.defaultKeyMapping);
    this.bindingConfigs.clear();
  }
  
  public getKeysForAction(action: string, context?: string): string[] {
    // Ignore context in base implementation
    const keys: string[] = [];
    this.keyMapping.forEach((mappedAction, key) => {
      if (mappedAction === action) {
        keys.push(key);
      }
    });
    return keys;
  }
  
  public setActiveContext(context: string): void {
    this.activeContext = context;
  }
  
  public getActiveContext(): string {
    return this.activeContext;
  }
  
  public isHoldable(key: string, context?: string): boolean {
    const binding = this.getBindingConfig(key, context);
    return binding ? !!binding.isHoldable : false;
  }
  
  public isRepeatable(key: string, context?: string): boolean {
    const binding = this.getBindingConfig(key, context);
    return binding ? !!binding.isRepeatable : false;
  }
}
