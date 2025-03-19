/**
 * @file src/core/debug/visual/PhysicsVisualizer.ts
 * @description Provides visualization of physics forces and velocities using the DebugRenderer.
 */

import * as BABYLON from 'babylonjs';
import { DebugRenderer } from '../DebugRenderer';
import { Scene } from 'babylonjs';
import { IPhysicsSystem } from '../../physics/IPhysicsSystem';

/**
 * Options for physics visualization
 */
export interface PhysicsVisualizerOptions {
  /**
   * Whether to visualize velocity vectors
   */
  showVelocities?: boolean;
  
  /**
   * Whether to visualize force vectors
   */
  showForces?: boolean;
  
  /**
   * Whether to visualize angular velocity
   */
  showAngularVelocities?: boolean;
  
  /**
   * Whether to visualize center of mass
   */
  showCenterOfMass?: boolean;
  
  /**
   * Whether to visualize sleeping state (inactive physics objects)
   */
  showSleepingState?: boolean;
  
  /**
   * Scale factor for velocity vectors
   */
  velocityScale?: number;
  
  /**
   * Scale factor for force vectors
   */
  forceScale?: number;
  
  /**
   * Scale factor for angular velocity visualization
   */
  angularVelocityScale?: number;
  
  /**
   * Size of center of mass visualization
   */
  centerOfMassSize?: number;
  
  /**
   * Color for velocity vectors
   */
  velocityColor?: BABYLON.Color3;
  
  /**
   * Color for force vectors
   */
  forceColor?: BABYLON.Color3;
  
  /**
   * Color for angular velocity visualization
   */
  angularVelocityColor?: BABYLON.Color3;
  
  /**
   * Color for center of mass visualization
   */
  centerOfMassColor?: BABYLON.Color3;
  
  /**
   * Color for sleeping (inactive) physics objects
   */
  sleepingColor?: BABYLON.Color3;
  
  /**
   * Filter function to determine which physics objects to visualize
   */
  filterFunction?: (impostor: BABYLON.PhysicsImpostor) => boolean;
}

/**
 * Default options for physics visualization
 */
const DEFAULT_OPTIONS: PhysicsVisualizerOptions = {
  showVelocities: true,
  showForces: true,
  showAngularVelocities: true,
  showCenterOfMass: true,
  showSleepingState: true,
  velocityScale: 0.3,
  forceScale: 0.01,
  angularVelocityScale: 0.3,
  centerOfMassSize: 0.1,
  velocityColor: new BABYLON.Color3(0, 0, 1),
  forceColor: new BABYLON.Color3(0, 1, 0),
  angularVelocityColor: new BABYLON.Color3(1, 0, 1),
  centerOfMassColor: new BABYLON.Color3(1, 1, 0),
  sleepingColor: new BABYLON.Color3(0.5, 0.5, 0.5),
  filterFunction: () => true
};

/**
 * Visualizes physics-related information like forces and velocities
 */
export class PhysicsVisualizer {
  private debugRenderer: DebugRenderer;
  private options: PhysicsVisualizerOptions;
  private scene: Scene;
  private physicsSystem: IPhysicsSystem;
  private enabled: boolean = false;
  private frameCounter: number = 0;
  private updateFrequency: number = 3; // Update every N frames
  private visualizedImpostors: Map<BABYLON.PhysicsImpostor, {
    velocityVector?: string;
    forceVector?: string;
    angularVelocity?: string;
    centerOfMass?: string;
  }> = new Map();
  
  /**
   * Creates a new physics visualizer
   * @param debugRenderer Debug renderer to use for visualization
   * @param scene The Babylon.js scene
   * @param physicsSystem The physics system
   * @param options Visualization options
   */
  constructor(
    debugRenderer: DebugRenderer,
    scene: Scene,
    physicsSystem: IPhysicsSystem,
    options: Partial<PhysicsVisualizerOptions> = {}
  ) {
    this.debugRenderer = debugRenderer;
    this.scene = scene;
    this.physicsSystem = physicsSystem;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    // Setup visualization update
    this.scene.onBeforeRenderObservable.add(() => {
      if (this.enabled) {
        // Only update every few frames for performance
        if (this.frameCounter % this.updateFrequency === 0) {
          this.updateVisualization();
        }
        this.frameCounter++;
      }
    });
  }
  
  /**
   * Enables physics visualization
   */
  public enable(): void {
    if (this.enabled) return;
    
    this.enabled = true;
    this.updateVisualization();
  }
  
  /**
   * Disables physics visualization
   */
  public disable(): void {
    if (!this.enabled) return;
    
    this.enabled = false;
    this.clearVisualization();
  }
  
  /**
   * Toggles physics visualization
   */
  public toggle(): void {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
  }
  
  /**
   * Check if visualization is enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Sets the update frequency (in frames)
   * @param frequency Number of frames between visualization updates
   */
  public setUpdateFrequency(frequency: number): void {
    this.updateFrequency = Math.max(1, frequency);
  }
  
  /**
   * Updates the physics visualization
   */
  private updateVisualization(): void {
    if (!this.enabled) return;
    
    // Clear previous visualization
    this.clearVisualization();
    
    // Get all physics impostors from the scene
    const impostors = this.getAllImpostors();
    
    // Visualize each impostor that passes the filter
    impostors
      .filter(impostor => this.options.filterFunction!(impostor))
      .forEach(impostor => {
        this.visualizeImpostor(impostor);
      });
  }
  
  /**
   * Gets all physics impostors from the scene
   */
  private getAllImpostors(): BABYLON.PhysicsImpostor[] {
    // Try to get all impostors from BabylonJS
    const physicsEngine = this.scene.getPhysicsEngine();
    if (!physicsEngine) return [];
    
    // Get all meshes with impostors
    return this.scene.meshes
      .filter(mesh => mesh.physicsImpostor)
      .map(mesh => mesh.physicsImpostor!);
  }
  
  /**
   * Visualizes a physics impostor
   * @param impostor The physics impostor to visualize
   */
  private visualizeImpostor(impostor: BABYLON.PhysicsImpostor): void {
    const mesh = impostor.object as BABYLON.AbstractMesh;
    if (!mesh) return;
    
    const impostorVisualization = {
      velocityVector: undefined as string | undefined,
      forceVector: undefined as string | undefined,
      angularVelocity: undefined as string | undefined,
      centerOfMass: undefined as string | undefined
    };
    
    // Get the position of the impostor
    const position = mesh.position.clone();
    
    // Visualize velocity
    if (this.options.showVelocities) {
      const velocity = impostor.getLinearVelocity();
      if (velocity && velocity.length() > 0.01) {
        const velocityId = `velocity_${mesh.uniqueId}`;
        this.debugRenderer.showVector(velocityId, position, velocity.scale(this.options.velocityScale!), this.options.velocityColor);
        impostorVisualization.velocityVector = velocityId;
      }
    }
    
    // Visualize applied forces (if available)
    if (this.options.showForces) {
      // BabylonJS doesn't expose applied forces directly, but we can visualize impulses
      // This is a placeholder - in a real implementation you might need to track forces elsewhere
      const totalImpulse = impostor.getLinearVelocity()?.scale(impostor.mass || 1);
      if (totalImpulse && totalImpulse.length() > 0.01) {
        const forceId = `force_${mesh.uniqueId}`;
        this.debugRenderer.showVector(forceId, position, totalImpulse.scale(this.options.forceScale!), this.options.forceColor);
        impostorVisualization.forceVector = forceId;
      }
    }
    
    // Visualize angular velocity
    if (this.options.showAngularVelocities) {
      const angularVelocity = impostor.getAngularVelocity();
      if (angularVelocity && angularVelocity.length() > 0.01) {
        const angularId = `angular_${mesh.uniqueId}`;
        this.debugRenderer.showVector(angularId, position, angularVelocity.scale(this.options.angularVelocityScale!), this.options.angularVelocityColor);
        impostorVisualization.angularVelocity = angularId;
      }
    }
    
    // Visualize center of mass
    if (this.options.showCenterOfMass) {
      const centerOfMassId = `com_${mesh.uniqueId}`;
      // In BabylonJS, the center of mass is typically at the object's position
      // For compound bodies, this would need to be calculated
      this.debugRenderer.showCollisionPoint(
        centerOfMassId,
        position,
        this.options.centerOfMassSize,
        this.options.centerOfMassColor
      );
      impostorVisualization.centerOfMass = centerOfMassId;
    }
    
    // Visualize sleeping state
    if (this.options.showSleepingState) {
      // Check if the physics object is sleeping based on its velocity
      // Objects with very low velocity are typically sleeping in physics engines
      const velocity = impostor.getLinearVelocity();
      const angularVelocity = impostor.getAngularVelocity();
      const isSleeping = (!velocity || velocity.lengthSquared() < 0.0001) && 
                        (!angularVelocity || angularVelocity.lengthSquared() < 0.0001);
      
      if (isSleeping) {
        const sleepingMeshId = `sleeping_${mesh.uniqueId}`;
        // Create a box around the mesh to indicate it's sleeping
        const boundingInfo = mesh.getBoundingInfo();
        const min = boundingInfo.boundingBox.minimumWorld;
        const max = boundingInfo.boundingBox.maximumWorld;
        
        this.debugRenderer.showBox(sleepingMeshId, min, max, this.options.sleepingColor);
      }
    }
    
    // Store visualization IDs for later cleanup
    this.visualizedImpostors.set(impostor, impostorVisualization);
  }
  
  /**
   * Visualizes a world space point with a force vector
   * @param position The position to visualize
   * @param force The force vector
   * @param identifier Unique identifier
   */
  public visualizeForce(position: BABYLON.Vector3, force: BABYLON.Vector3, identifier: string): void {
    if (!this.enabled) return;
    
    const forceId = `custom_force_${identifier}`;
    this.debugRenderer.showVector(forceId, position, force.scale(this.options.forceScale!), this.options.forceColor);
  }
  
  /**
   * Visualizes a world space point with a velocity vector
   * @param position The position to visualize
   * @param velocity The velocity vector
   * @param identifier Unique identifier
   */
  public visualizeVelocity(position: BABYLON.Vector3, velocity: BABYLON.Vector3, identifier: string): void {
    if (!this.enabled) return;
    
    const velocityId = `custom_velocity_${identifier}`;
    this.debugRenderer.showVector(velocityId, position, velocity.scale(this.options.velocityScale!), this.options.velocityColor);
  }
  
  /**
   * Clears all visualizations
   */
  public clearVisualization(): void {
    // Clear all visualized impostors
    this.visualizedImpostors.forEach((visualization, impostor) => {
      if (visualization.velocityVector) {
        this.debugRenderer.removeDebugVector(visualization.velocityVector);
      }
      
      if (visualization.forceVector) {
        this.debugRenderer.removeDebugVector(visualization.forceVector);
      }
      
      if (visualization.angularVelocity) {
        this.debugRenderer.removeDebugVector(visualization.angularVelocity);
      }
      
      if (visualization.centerOfMass) {
        this.debugRenderer.removeDebugSphere(visualization.centerOfMass);
      }
      
      // Clear sleeping visualization
      if (this.options.showSleepingState) {
        const mesh = impostor.object as BABYLON.AbstractMesh;
        if (mesh) {
          this.debugRenderer.removeDebugMesh(`sleeping_${mesh.uniqueId}`);
        }
      }
    });
    
    // Clear the map
    this.visualizedImpostors.clear();
  }
  
  /**
   * Cleans up resources
   */
  public dispose(): void {
    this.disable();
    
    // Remove scene observer
    this.scene.onBeforeRenderObservable.clear();
  }
} 