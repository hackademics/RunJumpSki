/**
 * @file src/core/debug/DebugRenderer.ts
 * @description Renders debug information on the screen.
 * 
 * @dependencies IDebugRenderer.ts
 * @relatedFiles IDebugRenderer.ts
 */
import { IDebugRenderer } from "./IDebugRenderer";

export class DebugRenderer implements IDebugRenderer {
  public renderDebugInfo(): void {
    // For demonstration purposes, log debug info to the console.
    console.log("Rendering debug information...");
    // An advanced implementation could draw overlays on a canvas.
  }
}
