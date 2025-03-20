/**
 * @file src/core/renderer/RenderComponent.ts
 * @description RenderComponent implements IRenderComponent to enable entities to be rendered.
 * It maintains a reference to a Babylon.js mesh, controls its visibility, and provides an update method.
 * 
 * @dependencies IRenderComponent, babylonjs, IComponent
 * @relatedFiles IRenderComponent.ts
 */
import * as BABYLON from 'babylonjs';
import { IRenderComponent } from './IRenderComponent';
import { IComponent } from '../ecs/IComponent';
import { IEntity } from '../ecs/IEntity';

/**
 * Component that enables entities to be rendered
 */
export class RenderComponent implements IRenderComponent {
  /**
   * The type identifier for this component
   */
  public readonly type: string = 'render';
  
  /**
   * The mesh associated with this component
   */
  public mesh: BABYLON.AbstractMesh | null;
  
  /**
   * Whether the component is visible
   */
  public isVisible: boolean;
  
  /**
   * The entity this component is attached to
   */
  private entity: IEntity | null = null;
  
  /**
   * Whether the component is enabled
   */
  private enabled: boolean = true;
  
  /**
   * Creates a new render component
   */
  constructor() {
    this.mesh = null;
    this.isVisible = true;
  }
  
  /**
   * Initializes the component with an entity
   * @param entity The entity to attach to
   */
  public initialize(entity: IEntity): void {
    this.entity = entity;
  }
  
  /**
   * Updates the component
   * @param deltaTime Time elapsed since last update
   */
  public update(deltaTime: number): void {
    if (!this.enabled || !this.mesh) {
      return;
    }
    
    // Update mesh visibility
    this.mesh.isVisible = this.isVisible;
    
    // Additional update logic can be added here
  }
  
  /**
   * Disposes of the component and its resources
   */
  public dispose(): void {
    // Clean up resources
    this.mesh = null;
    this.entity = null;
  }
  
  /**
   * Checks if the component is enabled
   * @returns Whether the component is enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Sets whether the component is enabled
   * @param enabled Whether to enable the component
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    // Update mesh visibility if enabled state changes
    if (this.mesh) {
      this.mesh.setEnabled(enabled);
    }
  }
  
  /**
   * Attaches a Babylon.js mesh to this render component
   * @param mesh The mesh to attach
   */
  public setMesh(mesh: BABYLON.AbstractMesh): void {
    this.mesh = mesh;
    
    // Sync mesh state with component state
    if (this.mesh) {
      this.mesh.isVisible = this.isVisible;
      this.mesh.setEnabled(this.enabled);
    }
  }
  
  /**
   * Gets the entity this component is attached to
   * @returns The entity or null if not attached
   */
  public getEntity(): IEntity | null {
    return this.entity;
  }
}

