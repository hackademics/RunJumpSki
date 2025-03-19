/**
 * @file src/core/debug/gui/ParameterGroup.ts
 * @description Class for managing collections of tweakable parameters.
 */

import { TweakableParameter, ParameterChangeEvent } from './TweakableParameter';

/**
 * Event triggered when a parameter is added or removed from a group
 */
export interface GroupChangeEvent {
  /**
   * Type of change
   */
  type: 'parameterAdded' | 'parameterRemoved';
  
  /**
   * Parameter that was added or removed
   */
  parameter: TweakableParameter<any>;
}

/**
 * Type of change listener function
 */
export type GroupChangeListener = (event: GroupChangeEvent) => void;

/**
 * Class for managing collections of tweakable parameters
 */
export class ParameterGroup {
  /**
   * Group name
   */
  public readonly name: string;
  
  /**
   * Whether the group is expanded in the GUI
   */
  public expanded: boolean;
  
  /**
   * Parameters in this group
   */
  private parameters: Map<string, TweakableParameter<any>>;
  
  /**
   * Listeners for group changes
   */
  private changeListeners: Set<GroupChangeListener>;
  
  /**
   * Creates a new parameter group
   * @param name Group name
   * @param expanded Whether the group is expanded by default
   */
  constructor(name: string, expanded: boolean = true) {
    this.name = name;
    this.expanded = expanded;
    this.parameters = new Map();
    this.changeListeners = new Set();
  }
  
  /**
   * Add a parameter to this group
   * @param parameter Parameter to add
   */
  public addParameter(parameter: TweakableParameter<any>): void {
    if (this.parameters.has(parameter.name)) {
      console.warn(`Parameter "${parameter.name}" already exists in group "${this.name}"`);
      return;
    }
    
    this.parameters.set(parameter.name, parameter);
    
    // Notify listeners
    this.notifyChange({
      type: 'parameterAdded',
      parameter
    });
  }
  
  /**
   * Remove a parameter from this group
   * @param parameterName Name of the parameter to remove
   */
  public removeParameter(parameterName: string): void {
    const parameter = this.parameters.get(parameterName);
    if (!parameter) {
      console.warn(`Parameter "${parameterName}" not found in group "${this.name}"`);
      return;
    }
    
    this.parameters.delete(parameterName);
    
    // Notify listeners
    this.notifyChange({
      type: 'parameterRemoved',
      parameter
    });
  }
  
  /**
   * Get a parameter by name
   * @param name Parameter name
   */
  public getParameter(name: string): TweakableParameter<any> | undefined {
    return this.parameters.get(name);
  }
  
  /**
   * Get all parameters in this group
   */
  public getParameters(): TweakableParameter<any>[] {
    return Array.from(this.parameters.values());
  }
  
  /**
   * Check if a parameter exists in this group
   * @param name Parameter name
   */
  public hasParameter(name: string): boolean {
    return this.parameters.has(name);
  }
  
  /**
   * Add a change listener
   * @param listener Listener function
   */
  public addChangeListener(listener: GroupChangeListener): void {
    this.changeListeners.add(listener);
  }
  
  /**
   * Remove a change listener
   * @param listener Listener function to remove
   */
  public removeChangeListener(listener: GroupChangeListener): void {
    this.changeListeners.delete(listener);
  }
  
  /**
   * Clear all change listeners
   */
  public clearChangeListeners(): void {
    this.changeListeners.clear();
  }
  
  /**
   * Toggle the expanded state of this group
   */
  public toggleExpanded(): void {
    this.expanded = !this.expanded;
  }
  
  /**
   * Notify listeners of a group change
   * @param event Change event
   */
  private notifyChange(event: GroupChangeEvent): void {
    this.changeListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in group change listener for "${this.name}":`, error);
      }
    });
  }
} 