/**
 * @file src/core/debug/serialization/DebugPresetManager.ts
 * @description Manager for saving and loading debug parameter presets.
 */

import { ParameterGroup } from '../gui/ParameterGroup';
import { TweakableParameter } from '../gui/TweakableParameter';

/**
 * Interface for preset metadata
 */
interface PresetMetadata {
  name: string;
  description: string;
  dateCreated: string;
  lastModified: string;
}

/**
 * Interface for parameter value in preset
 */
interface ParameterValue {
  name: string;
  value: any;
}

/**
 * Interface for group data in preset
 */
interface GroupData {
  name: string;
  parameters: ParameterValue[];
}

/**
 * Interface for a complete preset
 */
export interface Preset {
  metadata: PresetMetadata;
  groups: GroupData[];
}

/**
 * Storage adapter interface for saving/loading presets
 */
export interface IStorageAdapter {
  saveItem(key: string, value: string): void;
  loadItem(key: string): string | null;
  removeItem(key: string): void;
  listKeys(prefix: string): string[];
}

/**
 * LocalStorage adapter implementation
 */
export class LocalStorageAdapter implements IStorageAdapter {
  private prefix: string;

  /**
   * Create a new LocalStorage adapter
   * @param prefix Prefix for all storage keys
   */
  constructor(prefix: string = 'debugPreset_') {
    this.prefix = prefix;
  }

  /**
   * Save an item to storage
   * @param key Key to save under
   * @param value Value to save
   */
  public saveItem(key: string, value: string): void {
    localStorage.setItem(this.prefix + key, value);
  }

  /**
   * Load an item from storage
   * @param key Key to load
   */
  public loadItem(key: string): string | null {
    return localStorage.getItem(this.prefix + key);
  }

  /**
   * Remove an item from storage
   * @param key Key to remove
   */
  public removeItem(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  /**
   * List all keys in storage with the prefix
   */
  public listKeys(additionalPrefix: string = ''): string[] {
    const keys: string[] = [];
    const fullPrefix = this.prefix + additionalPrefix;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(fullPrefix)) {
        keys.push(key.substring(this.prefix.length));
      }
    }
    
    return keys;
  }
}

/**
 * Manager for debug parameter presets
 */
export class DebugPresetManager {
  private storageAdapter: IStorageAdapter;
  private groups: Map<string, ParameterGroup>;
  
  /**
   * Create a new preset manager
   * @param storageAdapter Storage adapter for persistence
   */
  constructor(storageAdapter: IStorageAdapter = new LocalStorageAdapter()) {
    this.storageAdapter = storageAdapter;
    this.groups = new Map();
  }
  
  /**
   * Register a parameter group
   * @param group Parameter group to register
   */
  public registerGroup(group: ParameterGroup): void {
    this.groups.set(group.name, group);
  }
  
  /**
   * Unregister a parameter group
   * @param groupName Name of group to unregister
   */
  public unregisterGroup(groupName: string): void {
    this.groups.delete(groupName);
  }
  
  /**
   * Save current parameter values as a preset
   * @param name Preset name
   * @param description Preset description
   */
  public savePreset(name: string, description: string = ''): void {
    // Create preset object
    const preset: Preset = {
      metadata: {
        name,
        description,
        dateCreated: new Date().toISOString(),
        lastModified: new Date().toISOString()
      },
      groups: []
    };
    
    // Add all registered groups and their parameters
    this.groups.forEach(group => {
      const groupData: GroupData = {
        name: group.name,
        parameters: []
      };
      
      // Add each parameter in the group
      group.getParameters().forEach(param => {
        if (param.persistent) {
          groupData.parameters.push({
            name: param.name,
            value: param.serialize()
          });
        }
      });
      
      preset.groups.push(groupData);
    });
    
    // Save to storage
    this.storageAdapter.saveItem(name, JSON.stringify(preset));
  }
  
  /**
   * Load a preset by name
   * @param name Preset name
   * @returns True if loaded successfully
   */
  public loadPreset(name: string): boolean {
    const presetJson = this.storageAdapter.loadItem(name);
    if (!presetJson) {
      console.warn(`Preset "${name}" not found`);
      return false;
    }
    
    try {
      const preset: Preset = JSON.parse(presetJson);
      
      // Apply preset to registered groups
      preset.groups.forEach(groupData => {
        const group = this.groups.get(groupData.name);
        if (!group) {
          console.warn(`Group "${groupData.name}" not found, skipping`);
          return;
        }
        
        // Apply each parameter value
        groupData.parameters.forEach(paramData => {
          const param = group.getParameter(paramData.name);
          if (!param) {
            console.warn(`Parameter "${paramData.name}" not found in group "${groupData.name}", skipping`);
            return;
          }
          
          // Deserialize and apply value
          param.deserialize(paramData.value);
        });
      });
      
      return true;
    } catch (error) {
      console.error(`Error loading preset "${name}":`, error);
      return false;
    }
  }
  
  /**
   * Delete a preset by name
   * @param name Preset name
   */
  public deletePreset(name: string): void {
    this.storageAdapter.removeItem(name);
  }
  
  /**
   * List all available presets
   */
  public listPresets(): PresetMetadata[] {
    const presets: PresetMetadata[] = [];
    
    this.storageAdapter.listKeys().forEach(key => {
      const presetJson = this.storageAdapter.loadItem(key);
      if (presetJson) {
        try {
          const preset: Preset = JSON.parse(presetJson);
          presets.push(preset.metadata);
        } catch (error) {
          console.warn(`Error parsing preset "${key}":`, error);
        }
      }
    });
    
    return presets;
  }
  
  /**
   * Save current parameter values to a new default preset
   */
  public saveDefaults(): void {
    this.savePreset('_default', 'Default parameter values');
  }
  
  /**
   * Reset parameters to their original values
   */
  public resetToDefaults(): boolean {
    return this.loadPreset('_default');
  }
  
  /**
   * Export all presets as a JSON string
   */
  public exportAllPresets(): string {
    const allPresets: { [key: string]: Preset } = {};
    
    this.storageAdapter.listKeys().forEach(key => {
      const presetJson = this.storageAdapter.loadItem(key);
      if (presetJson) {
        try {
          allPresets[key] = JSON.parse(presetJson);
        } catch (error) {
          console.warn(`Error parsing preset "${key}" for export:`, error);
        }
      }
    });
    
    return JSON.stringify(allPresets, null, 2);
  }
  
  /**
   * Import presets from a JSON string
   * @param json JSON string containing presets
   * @param overwrite Whether to overwrite existing presets
   */
  public importPresets(json: string, overwrite: boolean = false): boolean {
    try {
      const presets: { [key: string]: Preset } = JSON.parse(json);
      
      Object.entries(presets).forEach(([name, preset]) => {
        if (!overwrite && this.storageAdapter.loadItem(name)) {
          console.warn(`Preset "${name}" already exists, skipping (set overwrite to true to replace)`);
          return;
        }
        
        this.storageAdapter.saveItem(name, JSON.stringify(preset));
      });
      
      return true;
    } catch (error) {
      console.error('Error importing presets:', error);
      return false;
    }
  }
} 