/**
 * @file src/core/renderer/IRenderComponent.ts
 * @description Interface for RenderComponent that enables entities to be rendered.
 * 
 * @dependencies babylonjs, IComponent
 * @relatedFiles RenderComponent.ts
 */
import * as BABYLON from 'babylonjs';
import { IComponent } from '../ecs/IComponent';

/**
 * Interface for render components that enable entities to be rendered
 */
export interface IRenderComponent extends IComponent {
  /**
   * The Babylon.js mesh associated with this component
   */
  mesh: BABYLON.AbstractMesh | null;
  
  /**
   * Whether the component is visible
   */
  isVisible: boolean;
  
  /**
   * Attaches a Babylon.js mesh to this render component and syncs its visibility.
   * @param mesh The Babylon.js mesh to attach.
   */
  setMesh(mesh: BABYLON.AbstractMesh): void;
  
  /**
   * Called each frame to update the render component.
   * This can include logic for animations, visibility toggling, or mesh property updates.
   * @param deltaTime Time elapsed since last update in seconds
   */
  update(deltaTime: number): void;
}
