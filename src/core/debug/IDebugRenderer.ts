/**
 * @file src/core/debug/IDebugRenderer.ts
 * @description Interface for DebugRenderer, which renders debug information.
 */

export interface IDebugRenderer {
    /**
     * Renders debug information (e.g., overlays, logs) on the screen.
     */
    renderDebugInfo(): void;
  }
  