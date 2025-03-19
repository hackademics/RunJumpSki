/**
 * @file src/core/debug/gui/DebugPanelManager.ts
 * @description Manager for debug panels that handles registration and updates.
 */

import * as BABYLON from 'babylonjs';
import { DebugGUI } from './DebugGUI';
import { ParameterGroup } from './ParameterGroup';
import { PhysicsDebugPanel } from './presets/PhysicsDebugPanel';
import { RenderingDebugPanel } from './presets/RenderingDebugPanel';
import { PlayerDebugPanel } from './presets/PlayerDebugPanel';

/**
 * Manager for debug panels
 */
export class DebugPanelManager {
  private debugGUI: DebugGUI;
  private scene: BABYLON.Scene;
  private engine: BABYLON.Engine;
  private physicsPanel: PhysicsDebugPanel | null = null;
  private renderingPanel: RenderingDebugPanel | null = null;
  private playerPanel: PlayerDebugPanel | null = null;
  private customPanels: Map<string, ParameterGroup> = new Map();

  /**
   * Creates a new debug panel manager
   * @param scene The Babylon.js scene
   * @param engine The Babylon.js engine
   */
  constructor(scene: BABYLON.Scene, engine: BABYLON.Engine) {
    this.scene = scene;
    this.engine = engine;
    this.debugGUI = new DebugGUI(scene);
    
    // Register keyboard shortcut to toggle debug GUI
    this.registerKeyboardShortcuts();
  }

  /**
   * Register keyboard shortcuts
   */
  private registerKeyboardShortcuts(): void {
    this.scene.onKeyboardObservable.add((kbInfo) => {
      switch (kbInfo.type) {
        case BABYLON.KeyboardEventTypes.KEYDOWN:
          // F2 to toggle debug GUI
          if (kbInfo.event.code === 'F2') {
            this.toggleDebugGUI();
          }
          break;
      }
    });
  }

  /**
   * Register physics debug panel
   * @param physicsSystem The physics system to debug
   */
  public registerPhysicsPanel(physicsSystem: any): void {
    this.physicsPanel = new PhysicsDebugPanel(physicsSystem);
    this.debugGUI.addGroup(this.physicsPanel.getGroup());
  }

  /**
   * Register rendering debug panel
   */
  public registerRenderingPanel(): void {
    this.renderingPanel = new RenderingDebugPanel(this.scene, this.engine);
    this.debugGUI.addGroup(this.renderingPanel.getGroup());
  }

  /**
   * Register player debug panel
   * @param playerController The player controller to debug
   */
  public registerPlayerPanel(playerController: any): void {
    this.playerPanel = new PlayerDebugPanel(playerController);
    this.debugGUI.addGroup(this.playerPanel.getGroup());
  }

  /**
   * Register a custom parameter group
   * @param group The parameter group to add
   */
  public registerCustomGroup(group: ParameterGroup): void {
    if (this.customPanels.has(group.name)) {
      this.debugGUI.removeGroup(group.name);
    }
    
    this.customPanels.set(group.name, group);
    this.debugGUI.addGroup(group);
  }

  /**
   * Remove a custom parameter group
   * @param groupName Name of the group to remove
   */
  public removeCustomGroup(groupName: string): void {
    if (this.customPanels.has(groupName)) {
      this.debugGUI.removeGroup(groupName);
      this.customPanels.delete(groupName);
    }
  }

  /**
   * Show the debug GUI
   */
  public showDebugGUI(): void {
    this.debugGUI.show();
  }

  /**
   * Hide the debug GUI
   */
  public hideDebugGUI(): void {
    this.debugGUI.hide();
  }

  /**
   * Toggle the debug GUI visibility
   */
  public toggleDebugGUI(): void {
    this.debugGUI.toggle();
  }

  /**
   * Update all panels
   * @param deltaTime Time elapsed since last update
   */
  public update(deltaTime: number): void {
    // Update debug GUI
    this.debugGUI.update(deltaTime);
    
    // Update panels from system state
    if (this.physicsPanel) {
      this.physicsPanel.updateFromSystem();
    }
    
    if (this.renderingPanel) {
      this.renderingPanel.updateFromSystem();
    }
    
    if (this.playerPanel) {
      this.playerPanel.updateFromSystem();
    }
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.debugGUI.dispose();
  }
} 