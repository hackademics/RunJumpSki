/**
 * @file src/core/ecs/components/IRenderableComponent.ts
 * @description Interface for renderable components that can be visualized in the scene
 */

import * as BABYLON from 'babylonjs';
import { IComponent } from '../IComponent';

/**
 * Interface for Renderable component
 * Base interface for all components that have a visual representation
 */
export interface IRenderableComponent extends IComponent {
  /**
   * Get whether the renderable is visible
   */
  isVisible(): boolean;
  
  /**
   * Set whether the renderable is visible
   * @param visible - Whether the renderable should be visible
   */
  setVisible(visible: boolean): void;
  
  /**
   * Get the opacity of the renderable
   */
  getOpacity(): number;
  
  /**
   * Set the opacity of the renderable
   * @param opacity - Opacity value between 0 (transparent) and 1 (opaque)
   */
  setOpacity(opacity: number): void;
  
  /**
   * Get whether the renderable casts shadows
   */
  getCastShadows(): boolean;
  
  /**
   * Set whether the renderable casts shadows
   * @param castShadows - Whether the renderable should cast shadows
   */
  setCastShadows(castShadows: boolean): void;
  
  /**
   * Get whether the renderable receives shadows
   */
  getReceiveShadows(): boolean;
  
  /**
   * Set whether the renderable receives shadows
   * @param receiveShadows - Whether the renderable should receive shadows
   */
  setReceiveShadows(receiveShadows: boolean): void;
  
  /**
   * Get the Layer mask used for filtering
   */
  getLayerMask(): number;
  
  /**
   * Set the Layer mask used for filtering
   * @param mask - Layer mask
   */
  setLayerMask(mask: number): void;
  
  /**
   * Get the main scene object that represents this renderable
   * This could be a mesh, a transformNode, etc.
   */
  getSceneNode(): BABYLON.Node | null;
  
  /**
   * Set the main scene object that represents this renderable
   * @param node - Babylon.js scene node
   */
  setSceneNode(node: BABYLON.Node | null): void;
  
  /**
   * Apply the transform of the entity to the renderable
   */
  applyTransform(): void;
}

