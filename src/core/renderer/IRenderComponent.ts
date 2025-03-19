/**
 * @file src/core/ecs/components/RenderComponent.ts
 * @description RenderComponent implements IRenderComponent to enable entities to be rendered.
 * It maintains a reference to a Babylon.js mesh, controls its visibility, and provides an update method.
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

  constructor() {
    // Initialize with no mesh and default visible state.
    this.mesh = null;
    this.isVisible = true;
  }

  /**
   * Attaches a Babylon.js mesh to this render component and syncs its visibility.
   * @param mesh The Babylon.js mesh to attach.
   */
  public setMesh(mesh: BABYLON.AbstractMesh): void {
    this.mesh = mesh;
    // Ensure the mesh's visibility reflects the component's state.
    this.mesh.isVisible = this.isVisible;
  }

  /**
   * Called each frame to update the render component.
   * This can include logic for animations, visibility toggling, or mesh property updates.
   */
  public update(): void {
    if (this.mesh) {
      // For demonstration, simply ensure the mesh's visibility is in sync.
      this.mesh.isVisible = this.isVisible;
      // Additional per-frame update logic can be added here.
    }
  }
}
