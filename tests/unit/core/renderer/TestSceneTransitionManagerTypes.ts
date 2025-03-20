/**
 * @file tests/unit/core/renderer/TestSceneTransitionManagerTypes.ts
 * @description Type definitions for testing private members of SceneTransitionManager
 */

import * as BABYLON from 'babylonjs';
import { SceneTransitionOptions } from '../../../../src/core/renderer/ISceneManager';

/**
 * Interface exposing private members of SceneTransitionManager for testing
 */
export interface ISceneTransitionManagerPrivate {
  // Private properties
  transitionTexture: BABYLON.RenderTargetTexture | null;
  transitionMaterial: BABYLON.Material | null;
  transitionPlane: BABYLON.Mesh | null;
  isTransitioning: boolean;
  
  // Private methods
  switchRenderLoop: (targetScene: BABYLON.Scene) => void;
  pauseScene: (scene: BABYLON.Scene) => void;
  createTransitionScene: () => BABYLON.Scene;
  fadeTransition: (
    fromScene: BABYLON.Scene,
    toScene: BABYLON.Scene,
    options: SceneTransitionOptions
  ) => Promise<void>;
  slideTransition: (
    fromScene: BABYLON.Scene,
    toScene: BABYLON.Scene,
    options: SceneTransitionOptions
  ) => Promise<void>;
  dissolveTransition: (
    fromScene: BABYLON.Scene,
    toScene: BABYLON.Scene,
    options: SceneTransitionOptions
  ) => Promise<void>;
  zoomTransition: (
    fromScene: BABYLON.Scene, 
    toScene: BABYLON.Scene,
    options: SceneTransitionOptions
  ) => Promise<void>;
  captureSceneToTexture: (scene: BABYLON.Scene) => BABYLON.RenderTargetTexture;
  cleanupTransitionResources: () => void;
} 