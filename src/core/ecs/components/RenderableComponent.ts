/**
 * @file src/core/ecs/components/RenderableComponent.ts
 * @description Implementation of the RenderableComponent for visual elements
 */

import * as BABYLON from 'babylonjs';
import { Component } from '../Component';
import { IEntity } from '../IEntity';
import { IRenderableComponent } from './IRenderableComponent';
import { ITransformComponent } from './ITransformComponent';

/**
 * Configuration options for RenderableComponent
 */
export interface RenderableComponentOptions {
  /**
   * Whether the renderable is initially visible
   */
  visible?: boolean;
  
  /**
   * Initial opacity (0-1)
   */
  opacity?: number;
  
  /**
   * Whether the renderable casts shadows
   */
  castShadows?: boolean;
  
  /**
   * Whether the renderable receives shadows
   */
  receiveShadows?: boolean;
  
  /**
   * Initial layer mask
   */
  layerMask?: number;
  
  /**
   * The scene node to use
   */
  sceneNode?: BABYLON.Node | null;
  
  /**
   * Whether to apply transform automatically on update
   */
  autoApplyTransform?: boolean;
}

/**
 * Default options for RenderableComponent
 */
export const DEFAULT_RENDERABLECOMPONENT_OPTIONS: RenderableComponentOptions = {
  visible: true,
  opacity: 1.0,
  castShadows: true,
  receiveShadows: true,
  layerMask: 0x0FFFFFFF, // Default layer mask in Babylon.js
  sceneNode: null,
  autoApplyTransform: true
};

/**
 * Implementation of Renderable component
 * Base class for components with visual representation
 */
export class RenderableComponent extends Component implements IRenderableComponent {
  public readonly type: string = 'renderable';
  
  /**
   * Whether the renderable is visible
   */
  private visible: boolean;
  
  /**
   * Opacity value (0-1)
   */
  private opacity: number;
  
  /**
   * Whether the renderable casts shadows
   */
  private castShadows: boolean;
  
  /**
   * Whether the renderable receives shadows
   */
  private receiveShadows: boolean;
  
  /**
   * Layer mask for filtering
   */
  private layerMask: number;
  
  /**
   * The main scene node representing this renderable
   */
  private sceneNode: BABYLON.Node | null;
  
  /**
   * Whether to automatically apply transform on update
   */
  private autoApplyTransform: boolean;
  
  /**
   * Create a new RenderableComponent
   */
  constructor(options: Partial<RenderableComponentOptions> = {}) {
    super({ type: 'renderable' });
    
    // Merge with default options
    const config = { ...DEFAULT_RENDERABLECOMPONENT_OPTIONS, ...options };
    
    this.visible = config.visible !== undefined ? config.visible : DEFAULT_RENDERABLECOMPONENT_OPTIONS.visible!;
    this.opacity = config.opacity !== undefined ? config.opacity : DEFAULT_RENDERABLECOMPONENT_OPTIONS.opacity!;
    this.castShadows = config.castShadows !== undefined ? config.castShadows : DEFAULT_RENDERABLECOMPONENT_OPTIONS.castShadows!;
    this.receiveShadows = config.receiveShadows !== undefined ? config.receiveShadows : DEFAULT_RENDERABLECOMPONENT_OPTIONS.receiveShadows!;
    this.layerMask = config.layerMask !== undefined ? config.layerMask : DEFAULT_RENDERABLECOMPONENT_OPTIONS.layerMask!;
    this.sceneNode = (config.sceneNode === undefined) ? null : config.sceneNode;
    this.autoApplyTransform = config.autoApplyTransform !== undefined ? config.autoApplyTransform : DEFAULT_RENDERABLECOMPONENT_OPTIONS.autoApplyTransform!;
    
    // Apply initial settings to scene node if provided
    if (this.sceneNode) {
      this.applyPropertiesToSceneNode();
    }
  }
  
  /**
   * Initialize the component
   */
  public override init(entity: IEntity): void {
    super.init(entity);
  }
  
  /**
   * Update the component
   */
  public override update(deltaTime: number): void {
    if (!this.isEnabled()) return;
    
    // Apply transform automatically if enabled
    if (this.autoApplyTransform) {
      this.applyTransform();
    }
  }
  
  /**
   * Clean up resources
   */
  public override dispose(): void {
    // Don't dispose the scene node here as it might be managed elsewhere
    // Just clear the reference
    this.sceneNode = null;
    
    super.dispose();
  }
  
  /**
   * Get whether the renderable is visible
   */
  public isVisible(): boolean {
    return this.visible;
  }
  
  /**
   * Set whether the renderable is visible
   */
  public setVisible(visible: boolean): void {
    this.visible = visible;
    
    // Apply to scene node if available
    if (this.sceneNode) {
      // Check if it's a mesh or a mesh-containing node
      if (this.sceneNode instanceof BABYLON.AbstractMesh) {
        this.sceneNode.isVisible = this.visible;
      } else if (this.sceneNode instanceof BABYLON.TransformNode && !(this.sceneNode instanceof BABYLON.AbstractMesh)) {
        // For transform nodes, we need to check if it has children that are meshes
        this.setVisibilityRecursive(this.sceneNode, this.visible);
      }
    }
  }
  
  /**
   * Get the opacity of the renderable
   */
  public getOpacity(): number {
    return this.opacity;
  }
  
  /**
   * Set the opacity of the renderable
   */
  public setOpacity(opacity: number): void {
    // Clamp opacity between 0 and 1
    this.opacity = Math.max(0, Math.min(1, opacity));
    
    // Apply to scene node if available
    if (this.sceneNode) {
      if (this.sceneNode instanceof BABYLON.AbstractMesh) {
        // If it has a material with alpha, set the alpha
        if (this.sceneNode.material) {
          this.sceneNode.visibility = this.opacity;
        }
      } else if (this.sceneNode instanceof BABYLON.TransformNode && !(this.sceneNode instanceof BABYLON.AbstractMesh)) {
        // For transform nodes, we need to check if it has children that are meshes
        this.setOpacityRecursive(this.sceneNode, this.opacity);
      }
    }
  }
  
  /**
   * Get whether the renderable casts shadows
   */
  public getCastShadows(): boolean {
    return this.castShadows;
  }
  
  /**
   * Set whether the renderable casts shadows
   */
  public setCastShadows(castShadows: boolean): void {
    this.castShadows = castShadows;
    
    // Apply to scene node if available
    if (this.sceneNode) {
      if (this.sceneNode instanceof BABYLON.AbstractMesh) {
        // AbstractMesh has getShadowGenerator and setShadowGenerator methods
        this.sceneNode.receiveShadows = this.castShadows;
      } else if (this.sceneNode instanceof BABYLON.TransformNode && !(this.sceneNode instanceof BABYLON.AbstractMesh)) {
        // For transform nodes, we need to check if it has children that are meshes
        this.setCastShadowsRecursive(this.sceneNode, this.castShadows);
      }
    }
  }
  
  /**
   * Get whether the renderable receives shadows
   */
  public getReceiveShadows(): boolean {
    return this.receiveShadows;
  }
  
  /**
   * Set whether the renderable receives shadows
   */
  public setReceiveShadows(receiveShadows: boolean): void {
    this.receiveShadows = receiveShadows;
    
    // Apply to scene node if available
    if (this.sceneNode) {
      if (this.sceneNode instanceof BABYLON.AbstractMesh) {
        this.sceneNode.receiveShadows = this.receiveShadows;
      } else if (this.sceneNode instanceof BABYLON.TransformNode && !(this.sceneNode instanceof BABYLON.AbstractMesh)) {
        // For transform nodes, we need to check if it has children that are meshes
        this.setReceiveShadowsRecursive(this.sceneNode, this.receiveShadows);
      }
    }
  }
  
  /**
   * Get the Layer mask
   */
  public getLayerMask(): number {
    return this.layerMask;
  }
  
  /**
   * Set the Layer mask
   */
  public setLayerMask(mask: number): void {
    this.layerMask = mask;
    
    // Apply to scene node if available
    if (this.sceneNode) {
      if (this.sceneNode instanceof BABYLON.AbstractMesh) {
        this.sceneNode.layerMask = this.layerMask;
      } else if (this.sceneNode instanceof BABYLON.TransformNode && !(this.sceneNode instanceof BABYLON.AbstractMesh)) {
        // For transform nodes, we need to check if it has children that are meshes
        this.setLayerMaskRecursive(this.sceneNode, this.layerMask);
      }
    }
  }
  
  /**
   * Get the scene node
   */
  public getSceneNode(): BABYLON.Node | null {
    return this.sceneNode;
  }
  
  /**
   * Set the scene node
   */
  public setSceneNode(node: BABYLON.Node | null): void {
    this.sceneNode = node;
    
    // Apply all properties to the new scene node
    if (this.sceneNode) {
      this.applyPropertiesToSceneNode();
    }
  }
  
  /**
   * Apply the properties of this component to the scene node
   */
  private applyPropertiesToSceneNode(): void {
    // Apply all properties at once
    this.setVisible(this.visible);
    this.setOpacity(this.opacity);
    this.setCastShadows(this.castShadows);
    this.setReceiveShadows(this.receiveShadows);
    this.setLayerMask(this.layerMask);
  }
  
  /**
   * Apply the transform to the renderable
   */
  public applyTransform(): void {
    // Get the transform component from the entity
    if (!this.entity) return;
    
    const transformComponent = this.entity.getComponent<ITransformComponent>('transform');
    if (!transformComponent || !this.sceneNode) return;
    
    // Get the world matrix from the transform
    const worldMatrix = transformComponent.getWorldMatrix();
    
    // Apply the transform to the scene node
    if (this.sceneNode instanceof BABYLON.TransformNode) {
      // Extract position, rotation, and scaling from the matrix
      const position = new BABYLON.Vector3();
      const rotation = new BABYLON.Quaternion();
      const scaling = new BABYLON.Vector3();
      
      worldMatrix.decompose(scaling, rotation, position);
      
      // Apply to transform node
      this.sceneNode.position.copyFrom(position);
      this.sceneNode.rotationQuaternion = rotation.clone();
      this.sceneNode.scaling.copyFrom(scaling);
    }
  }
  
  /**
   * Set visibility recursively on a node and its children
   */
  private setVisibilityRecursive(node: BABYLON.Node, visible: boolean): void {
    // If it's a mesh, set visibility directly
    if (node instanceof BABYLON.AbstractMesh) {
      node.isVisible = visible;
    }
    
    // Process children
    node.getChildren().forEach(child => {
      this.setVisibilityRecursive(child, visible);
    });
  }
  
  /**
   * Set opacity recursively on a node and its children
   */
  private setOpacityRecursive(node: BABYLON.Node, opacity: number): void {
    // If it's a mesh, set opacity
    if (node instanceof BABYLON.AbstractMesh) {
      node.visibility = opacity;
    }
    
    // Process children
    node.getChildren().forEach(child => {
      this.setOpacityRecursive(child, opacity);
    });
  }
  
  /**
   * Set cast shadows recursively on a node and its children
   */
  private setCastShadowsRecursive(node: BABYLON.Node, castShadows: boolean): void {
    // If it's a mesh, set cast shadows
    if (node instanceof BABYLON.AbstractMesh) {
      node.receiveShadows = castShadows;
    }
    
    // Process children
    node.getChildren().forEach(child => {
      this.setCastShadowsRecursive(child, castShadows);
    });
  }
  
  /**
   * Set receive shadows recursively on a node and its children
   */
  private setReceiveShadowsRecursive(node: BABYLON.Node, receiveShadows: boolean): void {
    // If it's a mesh, set receive shadows
    if (node instanceof BABYLON.AbstractMesh) {
      node.receiveShadows = receiveShadows;
    }
    
    // Process children
    node.getChildren().forEach(child => {
      this.setReceiveShadowsRecursive(child, receiveShadows);
    });
  }
  
  /**
   * Set layer mask recursively on a node and its children
   */
  private setLayerMaskRecursive(node: BABYLON.Node, layerMask: number): void {
    // If it's a mesh, set layer mask
    if (node instanceof BABYLON.AbstractMesh) {
      node.layerMask = layerMask;
    }
    
    // Process children
    node.getChildren().forEach(child => {
      this.setLayerMaskRecursive(child, layerMask);
    });
  }
}

