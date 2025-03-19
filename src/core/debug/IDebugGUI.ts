/**
 * @file src/core/debug/IDebugGUI.ts
 * @description Interface for DebugGUI, providing an interactive debugging interface.
 */

export interface IDebugGUI {
    /**
     * Displays the debug GUI.
     */
    showGUI(): void;
  
    /**
     * Updates the debug GUI with the latest data.
     */
    updateGUI(): void;
  
    /**
     * Hides the debug GUI.
     */
    hideGUI(): void;
  }
  