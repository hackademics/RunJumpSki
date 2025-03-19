/**
 * @file src/core/renderer/SceneTransitionManager.ts
 * @description Manages transitions between scenes with various effects.
 *
 * @dependencies babylonjs
 * @relatedFiles SceneManager.ts, ISceneManager.ts
 */

import * as BABYLON from 'babylonjs';
import { SceneTransitionType, SceneTransitionOptions } from './ISceneManager';

/**
 * Manages scene transitions with various effects
 */
export class SceneTransitionManager {
  private engine: BABYLON.Engine;
  private transitionTexture: BABYLON.RenderTargetTexture | null = null;
  private transitionMaterial: BABYLON.Material | null = null;
  private transitionPlane: BABYLON.Mesh | null = null;
  private isTransitioning: boolean = false;
  private logger: BABYLON.Logger | null = null;

  /**
   * Creates a new SceneTransitionManager
   * @param engine The Babylon.js engine
   */
  constructor(engine: BABYLON.Engine) {
    this.engine = engine;
  }

  /**
   * Performs a transition between two scenes
   * @param fromScene Source scene
   * @param toScene Target scene
   * @param options Transition options
   * @returns Promise that resolves when transition completes
   */
  public async transition(
    fromScene: BABYLON.Scene,
    toScene: BABYLON.Scene,
    options: SceneTransitionOptions
  ): Promise<void> {
    if (this.isTransitioning) {
      return Promise.reject(new Error('A transition is already in progress'));
    }

    this.isTransitioning = true;

    try {
      switch (options.type) {
        case SceneTransitionType.FADE:
          await this.fadeTransition(fromScene, toScene, options);
          break;
        case SceneTransitionType.SLIDE:
          await this.slideTransition(fromScene, toScene, options);
          break;
        case SceneTransitionType.DISSOLVE:
          await this.dissolveTransition(fromScene, toScene, options);
          break;
        case SceneTransitionType.ZOOM:
          await this.zoomTransition(fromScene, toScene, options);
          break;
        case SceneTransitionType.NONE:
        default:
          // Immediately switch without transition
          this.switchRenderLoop(toScene);
          break;
      }

      // Dispose previous scene if requested
      if (options.disposePrevious) {
        fromScene.dispose();
      } else {
        // Just pause resources
        this.pauseScene(fromScene);
      }

      return Promise.resolve();
    } catch (error) {
      console.error('Transition failed:', error);
      // Fallback to direct switch
      this.switchRenderLoop(toScene);
      return Promise.reject(error);
    } finally {
      this.isTransitioning = false;
      this.cleanupTransitionResources();
    }
  }

  /**
   * Switches the render loop to a new scene
   * @param targetScene Scene to set as active
   */
  private switchRenderLoop(targetScene: BABYLON.Scene): void {
    this.engine.stopRenderLoop();
    this.engine.runRenderLoop(() => {
      targetScene.render();
    });
  }

  /**
   * Pauses a scene's resources to conserve memory
   * @param scene Scene to pause
   */
  private pauseScene(scene: BABYLON.Scene): void {
    // Stop animations
    scene.stopAllAnimations();

    // Pause audio
    scene.audioEnabled = false;

    // Pause physics if enabled
    if (scene.getPhysicsEngine()) {
      scene.getPhysicsEngine()!.setTimeStep(0);
    }
  }

  /**
   * Creates a new transition scene
   * @returns A new BABYLON scene for transitions
   */
  private createTransitionScene(): BABYLON.Scene {
    const scene = new BABYLON.Scene(this.engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
    return scene;
  }

  /**
   * Performs a fade transition between scenes
   * @param fromScene Source scene
   * @param toScene Target scene
   * @param options Transition options
   * @returns Promise that resolves when transition completes
   */
  private async fadeTransition(
    fromScene: BABYLON.Scene,
    toScene: BABYLON.Scene,
    options: SceneTransitionOptions
  ): Promise<void> {
    this.isTransitioning = true;
    this.logger?.debug('Starting fade transition');

    // Capture the current scene to a texture
    const texture = await this.captureSceneToTexture(fromScene);

    // Create a transition scene with a camera and plane
    const transitionScene = this.createTransitionScene();
    const camera = new BABYLON.Camera(
      'transitionCamera',
      new BABYLON.Vector3(0, 0, -10),
      transitionScene
    );
    camera.position = new BABYLON.Vector3(0, 0, -10);

    // Create a plane and apply the captured texture as a material
    const plane = BABYLON.MeshBuilder.CreatePlane(
      'transitionPlane',
      {
        width: 2,
        height: 2 * (this.engine.getRenderHeight() / this.engine.getRenderWidth()),
      },
      transitionScene
    );

    const material = new BABYLON.StandardMaterial('planeMaterial', transitionScene);
    material.diffuseTexture = texture;
    material.specularColor = new BABYLON.Color3(0, 0, 0);
    material.backFaceCulling = false;
    plane.material = material;

    // Create animation for fading out
    const duration = options.duration || 1000; // Default to 1 second
    const frames = 60;
    const _fadeOutAnim = new BABYLON.Animation(
      'fadeOut',
      'material.alpha',
      frames,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const keyFrames = [];
    keyFrames.push({ frame: 0, value: 1 });
    keyFrames.push({ frame: frames, value: 0 });
    _fadeOutAnim.setKeys(keyFrames);

    // Store references
    this.transitionPlane = plane;
    this.transitionMaterial = material;
    this.transitionTexture = texture;

    // Start rendering the transition scene
    this.engine.stopRenderLoop();
    this.engine.runRenderLoop(() => {
      transitionScene.render();
    });

    return new Promise<void>(resolve => {
      // First half: fade out from current scene
      BABYLON.Animation.CreateAndStartAnimation(
        'fadeOut',
        material,
        'alpha',
        60,
        60 * (duration / 2000), // half the duration in frames at 60fps
        1.0,
        0.0,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
        new BABYLON.QuadraticEase(),
        () => {
          // At halfway point, switch the texture to the new scene
          // Render the target scene once to a texture
          const toTexture = this.captureSceneToTexture(toScene);
          material.diffuseTexture?.dispose();
          material.diffuseTexture = toTexture;

          // Second half: fade in to new scene
          BABYLON.Animation.CreateAndStartAnimation(
            'fadeIn',
            material,
            'alpha',
            60,
            60 * (duration / 2000), // half the duration in frames at 60fps
            0.0,
            1.0,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
            new BABYLON.QuadraticEase(),
            () => {
              // Transition complete, switch to target scene
              this.switchRenderLoop(toScene);
              transitionScene.dispose();
              resolve();
            }
          );
        }
      );
    });
  }

  /**
   * Performs a slide transition between scenes
   * @param fromScene Source scene
   * @param toScene Target scene
   * @param options Transition options
   * @returns Promise that resolves when transition completes
   */
  private async slideTransition(
    fromScene: BABYLON.Scene,
    toScene: BABYLON.Scene,
    options: SceneTransitionOptions
  ): Promise<void> {
    // Create a transition camera and render target texture for the from scene
    const fromTexture = this.captureSceneToTexture(fromScene);
    const toTexture = this.captureSceneToTexture(toScene);

    // Create transition scene
    const transitionScene = new BABYLON.Scene(this.engine);
    const camera = new BABYLON.FreeCamera(
      'transitionCamera',
      new BABYLON.Vector3(0, 0, -10),
      transitionScene
    );
    camera.setTarget(BABYLON.Vector3.Zero());

    // Create planes to display both scenes
    const aspectRatio = this.engine.getRenderHeight() / this.engine.getRenderWidth();
    const fromPlane = BABYLON.MeshBuilder.CreatePlane(
      'fromPlane',
      {
        width: 2,
        height: 2 * aspectRatio,
      },
      transitionScene
    );

    const toPlane = BABYLON.MeshBuilder.CreatePlane(
      'toPlane',
      {
        width: 2,
        height: 2 * aspectRatio,
      },
      transitionScene
    );

    // Position the planes (one next to the other)
    const slideDirection = options.slideDirection || 'right'; // Default slide direction
    switch (slideDirection) {
      case 'right':
        fromPlane.position.x = 0;
        toPlane.position.x = 2;
        break;
      case 'left':
        fromPlane.position.x = 0;
        toPlane.position.x = -2;
        break;
      case 'up':
        fromPlane.position.y = 0;
        toPlane.position.y = 2 * aspectRatio;
        break;
      case 'down':
        fromPlane.position.y = 0;
        toPlane.position.y = -2 * aspectRatio;
        break;
    }

    // Create materials with the scene textures
    const fromMaterial = new BABYLON.StandardMaterial('fromMaterial', transitionScene);
    fromMaterial.diffuseTexture = fromTexture;
    fromMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
    fromMaterial.backFaceCulling = false;
    fromPlane.material = fromMaterial;

    const toMaterial = new BABYLON.StandardMaterial('toMaterial', transitionScene);
    toMaterial.diffuseTexture = toTexture;
    toMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
    toMaterial.backFaceCulling = false;
    toPlane.material = toMaterial;

    // Store references
    this.transitionPlane = fromPlane; // Just store one for cleanup
    this.transitionMaterial = fromMaterial;
    this.transitionTexture = fromTexture;

    // Start rendering the transition scene
    this.engine.stopRenderLoop();
    this.engine.runRenderLoop(() => {
      transitionScene.render();
    });

    // Create slide animation
    const duration = options.duration || 1000;

    return new Promise<void>(resolve => {
      // Create animation for both planes
      const targetPositions = {
        fromX: 0,
        fromY: 0,
        toX: 0,
        toY: 0,
      };

      // Set target positions based on slide direction
      switch (slideDirection) {
        case 'right':
          targetPositions.fromX = -2;
          targetPositions.toX = 0;
          break;
        case 'left':
          targetPositions.fromX = 2;
          targetPositions.toX = 0;
          break;
        case 'up':
          targetPositions.fromY = -2 * aspectRatio;
          targetPositions.toY = 0;
          break;
        case 'down':
          targetPositions.fromY = 2 * aspectRatio;
          targetPositions.toY = 0;
          break;
      }

      // Animate from plane
      if (slideDirection === 'right' || slideDirection === 'left') {
        BABYLON.Animation.CreateAndStartAnimation(
          'slideFromX',
          fromPlane,
          'position.x',
          60,
          60 * (duration / 1000),
          fromPlane.position.x,
          targetPositions.fromX,
          BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
          new BABYLON.CubicEase()
        );
      } else {
        BABYLON.Animation.CreateAndStartAnimation(
          'slideFromY',
          fromPlane,
          'position.y',
          60,
          60 * (duration / 1000),
          fromPlane.position.y,
          targetPositions.fromY,
          BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
          new BABYLON.CubicEase()
        );
      }

      // Animate to plane
      if (slideDirection === 'right' || slideDirection === 'left') {
        BABYLON.Animation.CreateAndStartAnimation(
          'slideToX',
          toPlane,
          'position.x',
          60,
          60 * (duration / 1000),
          toPlane.position.x,
          targetPositions.toX,
          BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
          new BABYLON.CubicEase(),
          () => {
            // Transition complete, switch to target scene
            this.switchRenderLoop(toScene);
            transitionScene.dispose();
            resolve();
          }
        );
      } else {
        BABYLON.Animation.CreateAndStartAnimation(
          'slideToY',
          toPlane,
          'position.y',
          60,
          60 * (duration / 1000),
          toPlane.position.y,
          targetPositions.toY,
          BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
          new BABYLON.CubicEase(),
          () => {
            // Transition complete, switch to target scene
            this.switchRenderLoop(toScene);
            transitionScene.dispose();
            resolve();
          }
        );
      }
    });
  }

  /**
   * Performs a dissolve transition between scenes
   * @param fromScene Source scene
   * @param toScene Target scene
   * @param options Transition options
   * @returns Promise that resolves when transition completes
   */
  private async dissolveTransition(
    fromScene: BABYLON.Scene,
    toScene: BABYLON.Scene,
    options: SceneTransitionOptions
  ): Promise<void> {
    // Create textures from both scenes
    const fromTexture = this.captureSceneToTexture(fromScene);
    const toTexture = this.captureSceneToTexture(toScene);

    // Create transition scene
    const transitionScene = new BABYLON.Scene(this.engine);
    const camera = new BABYLON.FreeCamera(
      'transitionCamera',
      new BABYLON.Vector3(0, 0, -10),
      transitionScene
    );
    camera.setTarget(BABYLON.Vector3.Zero());

    // Create a plane for the transition
    const plane = BABYLON.MeshBuilder.CreatePlane(
      'transitionPlane',
      {
        width: 2,
        height: 2 * (this.engine.getRenderHeight() / this.engine.getRenderWidth()),
      },
      transitionScene
    );

    // Create shader material for dissolve effect
    const shaderMaterial = new BABYLON.ShaderMaterial(
      'dissolveShader',
      transitionScene,
      {
        vertex: 'dissolve',
        fragment: 'dissolve',
      },
      {
        attributes: ['position', 'normal', 'uv'],
        uniforms: ['world', 'worldView', 'worldViewProjection', 'view', 'projection'],
        samplers: ['textureSampler1', 'textureSampler2', 'noiseTexture'],
      }
    );

    // Create/get noise texture for transition effect
    const noiseTexture = new BABYLON.NoiseProceduralTexture('dissolveNoise', 256, transitionScene);
    noiseTexture.octaves = 4;
    noiseTexture.persistence = 1.2;
    noiseTexture.animationSpeedFactor = 0;

    // Set shader uniforms and textures
    shaderMaterial.setTexture('textureSampler1', fromTexture);
    shaderMaterial.setTexture('textureSampler2', toTexture);
    shaderMaterial.setTexture('noiseTexture', noiseTexture);
    shaderMaterial.setFloat('dissolveAmount', 0.0);

    plane.material = shaderMaterial;

    // Store references for cleanup
    this.transitionPlane = plane;
    this.transitionMaterial = shaderMaterial;
    this.transitionTexture = fromTexture;

    // Start rendering the transition scene
    this.engine.stopRenderLoop();
    this.engine.runRenderLoop(() => {
      transitionScene.render();
    });

    // Create dissolve animation
    const duration = options.duration || 1000;

    return new Promise<void>(resolve => {
      BABYLON.Animation.CreateAndStartAnimation(
        'dissolve',
        shaderMaterial,
        'dissolveAmount',
        60,
        60 * (duration / 1000),
        0.0,
        1.0,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
        new BABYLON.SineEase(),
        () => {
          // Transition complete, switch to target scene
          this.switchRenderLoop(toScene);
          transitionScene.dispose();
          noiseTexture.dispose();
          resolve();
        }
      );
    });
  }

  /**
   * Performs a zoom transition between scenes
   * @param fromScene Source scene
   * @param toScene Target scene
   * @param options Transition options
   * @returns Promise that resolves when transition completes
   */
  private async zoomTransition(
    fromScene: BABYLON.Scene,
    toScene: BABYLON.Scene,
    options: SceneTransitionOptions
  ): Promise<void> {
    // Create a transition camera and render target texture for both scenes
    const fromTexture = this.captureSceneToTexture(fromScene);
    const toTexture = this.captureSceneToTexture(toScene);

    // Create transition scene
    const transitionScene = new BABYLON.Scene(this.engine);
    const camera = new BABYLON.FreeCamera(
      'transitionCamera',
      new BABYLON.Vector3(0, 0, -10),
      transitionScene
    );
    camera.setTarget(BABYLON.Vector3.Zero());

    // Create planes for both scenes (one in front of the other)
    const fromPlane = BABYLON.MeshBuilder.CreatePlane(
      'fromPlane',
      {
        width: 2,
        height: 2 * (this.engine.getRenderHeight() / this.engine.getRenderWidth()),
      },
      transitionScene
    );

    const toPlane = BABYLON.MeshBuilder.CreatePlane(
      'toPlane',
      {
        width: 2,
        height: 2 * (this.engine.getRenderHeight() / this.engine.getRenderWidth()),
      },
      transitionScene
    );

    // Position the planes (one behind the other)
    fromPlane.position.z = 0;
    toPlane.position.z = -1; // Behind the from plane

    // Create materials for both planes
    const fromMaterial = new BABYLON.StandardMaterial('fromMaterial', transitionScene);
    fromMaterial.diffuseTexture = fromTexture;
    fromMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
    fromMaterial.backFaceCulling = false;
    fromPlane.material = fromMaterial;

    const toMaterial = new BABYLON.StandardMaterial('toMaterial', transitionScene);
    toMaterial.diffuseTexture = toTexture;
    toMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
    toMaterial.backFaceCulling = false;
    toPlane.material = toMaterial;

    // Add alpha blending to from plane (to see through it as it scales)
    fromMaterial.alpha = 1.0;

    // Store references for cleanup
    this.transitionPlane = fromPlane;
    this.transitionMaterial = fromMaterial;
    this.transitionTexture = fromTexture;

    // Start rendering the transition scene
    this.engine.stopRenderLoop();
    this.engine.runRenderLoop(() => {
      transitionScene.render();
    });

    // Create zoom animation
    const duration = options.duration || 1000;
    const zoomType = options.zoomType || 'zoomOut'; // Default zoom type

    return new Promise<void>(resolve => {
      if (zoomType === 'zoomOut') {
        // Zoom out from current scene, revealing new scene behind it
        // Scale animation for fromPlane
        BABYLON.Animation.CreateAndStartAnimation(
          'zoomScale',
          fromPlane,
          'scaling',
          60,
          60 * (duration / 1000),
          new BABYLON.Vector3(1, 1, 1),
          new BABYLON.Vector3(5, 5, 5),
          BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
          new BABYLON.CubicEase()
        );

        // Alpha animation for fromPlane
        BABYLON.Animation.CreateAndStartAnimation(
          'zoomAlpha',
          fromMaterial,
          'alpha',
          60,
          60 * (duration / 1000),
          1.0,
          0.0,
          BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
          new BABYLON.CubicEase(),
          () => {
            // Transition complete
            this.switchRenderLoop(toScene);
            transitionScene.dispose();
            resolve();
          }
        );
      } else {
        // zoomIn
        // Zoom in to new scene
        // Position target scene further away
        toPlane.position.z = -10;
        toPlane.scaling = new BABYLON.Vector3(5, 5, 5);

        // First, fade out the current scene
        BABYLON.Animation.CreateAndStartAnimation(
          'fadeOutCurrent',
          fromMaterial,
          'alpha',
          60,
          60 * (duration / 2000), // half duration
          1.0,
          0.0,
          BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
          new BABYLON.CubicEase(),
          () => {
            // Hide the first plane when faded out
            fromPlane.isVisible = false;

            // Then zoom in the new scene
            BABYLON.Animation.CreateAndStartAnimation(
              'zoomInNew',
              toPlane,
              'position.z',
              60,
              60 * (duration / 2000), // half duration
              -10,
              0,
              BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
              new BABYLON.CubicEase()
            );

            BABYLON.Animation.CreateAndStartAnimation(
              'scaleInNew',
              toPlane,
              'scaling',
              60,
              60 * (duration / 2000), // half duration
              new BABYLON.Vector3(5, 5, 5),
              new BABYLON.Vector3(1, 1, 1),
              BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
              new BABYLON.CubicEase(),
              () => {
                // Transition complete
                this.switchRenderLoop(toScene);
                transitionScene.dispose();
                resolve();
              }
            );
          }
        );
      }
    });
  }

  /**
   * Captures a scene to a render target texture
   * @param scene Scene to capture
   * @returns Render target texture with the scene rendered to it
   */
  private captureSceneToTexture(scene: BABYLON.Scene): BABYLON.RenderTargetTexture {
    const rtTexture = new BABYLON.RenderTargetTexture(
      'sceneCapture',
      {
        width: this.engine.getRenderWidth(),
        height: this.engine.getRenderHeight(),
      },
      scene,
      false, // Don't generate mipmap levels
      false, // Use default sampling mode
      BABYLON.Constants.TEXTURETYPE_UNSIGNED_INT // Use default texture type
    );

    // Render all meshes
    scene.meshes.forEach(mesh => {
      if (mesh.isVisible) {
        rtTexture.renderList!.push(mesh);
      }
    });

    // Render once to the texture
    rtTexture.render();

    return rtTexture;
  }

  /**
   * Cleans up resources used for transitions
   */
  private cleanupTransitionResources(): void {
    if (this.transitionTexture) {
      this.transitionTexture.dispose();
      this.transitionTexture = null;
    }

    if (this.transitionMaterial) {
      this.transitionMaterial.dispose();
      this.transitionMaterial = null;
    }

    if (this.transitionPlane) {
      this.transitionPlane.dispose();
      this.transitionPlane = null;
    }
  }
}
