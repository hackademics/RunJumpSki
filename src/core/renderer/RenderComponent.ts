/**
 * @file src/core/ecs/components/RenderComponent.ts
 * @description RenderComponent implements IRenderComponent to enable entities to be rendered.
 * It maintains a reference to a Babylon.js mesh, controls its visibility, and provides per-frame update,
 * along with standard component lifecycle methods.
 * 
 * @dependencies IRenderComponent, babylonjs, IComponent
 * @relatedFiles IRenderComponent.ts
 */
import * as BABYLON from 'babylonjs';
import { IRenderComponent } from './IRenderComponent';
import { IComponent } from '@core/ecs/IComponent';

export class RenderComponent implements IRenderComponent, IComponent {
  public mesh: BABYLON.AbstractMesh | null;
  public isVisible: boolean;
  public type: string;
  public isEnabled: boolean;

  constructor() {
    this.mesh = null;
    this.isVisible = true;
    this.type = "RenderComponent";
    this.isEnabled = true;
  }

  /**
   * Initializes the render component.
   */
  public init(): void {
    console.log("RenderComponent initialized.");
  }

  /**
   * Disposes of the render component.
   */
  public dispose(): void {
    console.log("RenderComponent disposed.");
  }

  /**
   * Enables or disables the component.
   * @param enabled - true to enable, false to disable.
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    // Optionally synchronize visibility:
    this.isVisible = enabled;
    if (this.mesh) {
      this.mesh.isVisible = this.isVisible;
    }
  }

  /**
   * Attaches a Babylon.js mesh to the component and syncs its visibility.
   * @param mesh - The Babylon.js mesh.
   */
  public setMesh(mesh: BABYLON.AbstractMesh): void {
    this.mesh = mesh;
    this.mesh.isVisible = this.isVisible;
  }

  /**
   * Updates the render component (typically called each frame).
   */
  public update(): void {
    if (this.mesh) {
      this.mesh.isVisible = this.isVisible;
      // Add additional per-frame update logic here.
    }
  }
}
