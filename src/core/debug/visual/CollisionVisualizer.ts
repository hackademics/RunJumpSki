/**
 * @file src/core/debug/visual/CollisionVisualizer.ts
 * @description Provides visualization of collision events and shapes using the DebugRenderer.
 */

import * as BABYLON from 'babylonjs';
import { DebugRenderer } from '../DebugRenderer';
import { Scene } from 'babylonjs';
import { ICollisionSystem, CollisionInfo } from '../../physics/ICollisionSystem';
import { Event } from '../../events/Event';
import { CollisionEventTypes, CollisionEvent, CollisionEventData } from '../../events/CollisionEvents';

/**
 * Options for collision visualization
 */
export interface CollisionVisualizerOptions {
  /**
   * Whether to visualize collision points
   */
  showCollisionPoints?: boolean;
  
  /**
   * Whether to visualize collision normals
   */
  showCollisionNormals?: boolean;
  
  /**
   * Whether to visualize collision shapes
   */
  showCollisionShapes?: boolean;
  
  /**
   * Size of collision point spheres
   */
  collisionPointSize?: number;
  
  /**
   * Length of collision normal vectors
   */
  normalVectorLength?: number;
  
  /**
   * Duration in milliseconds to show transient visualizations (like collision points)
   */
  visualizationDuration?: number;
  
  /**
   * Color for collision points
   */
  collisionPointColor?: BABYLON.Color3;
  
  /**
   * Color for collision normals
   */
  normalVectorColor?: BABYLON.Color3;
  
  /**
   * Color for collision shapes
   */
  collisionShapeColor?: BABYLON.Color3;
}

/**
 * Default options for collision visualization
 */
const DEFAULT_OPTIONS: CollisionVisualizerOptions = {
  showCollisionPoints: true,
  showCollisionNormals: true,
  showCollisionShapes: true,
  collisionPointSize: 0.1,
  normalVectorLength: 1.0,
  visualizationDuration: 1000,
  collisionPointColor: new BABYLON.Color3(1, 1, 0),
  normalVectorColor: new BABYLON.Color3(0, 1, 1),
  collisionShapeColor: new BABYLON.Color3(0.8, 0.1, 0.8)
};

/**
 * Visualizes collision events and shapes
 */
export class CollisionVisualizer {
  private debugRenderer: DebugRenderer;
  private options: CollisionVisualizerOptions;
  private scene: Scene;
  private collisionSystem: ICollisionSystem;
  private eventBus: { on: (eventType: string, callback: (event: Event) => void) => void; off: (eventType: string, callback: (event: Event) => void) => void };
  private collisionListenerAdded: boolean = false;
  private collisionStartHandler: (event: Event) => void;
  private enabled: boolean = false;
  private collisionPointIndex: number = 0;
  private transientVisualizations: Map<string, number> = new Map();
  
  /**
   * Creates a new collision visualizer
   * @param debugRenderer Debug renderer to use for visualization
   * @param scene The Babylon.js scene
   * @param collisionSystem The collision system to listen to for events
   * @param eventBus The event bus to listen for collision events
   * @param options Visualization options
   */
  constructor(
    debugRenderer: DebugRenderer,
    scene: Scene,
    collisionSystem: ICollisionSystem,
    eventBus: { on: (eventType: string, callback: (event: Event) => void) => void; off: (eventType: string, callback: (event: Event) => void) => void },
    options: Partial<CollisionVisualizerOptions> = {}
  ) {
    this.debugRenderer = debugRenderer;
    this.scene = scene;
    this.collisionSystem = collisionSystem;
    this.eventBus = eventBus;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    // Create bound handler to be able to remove it later
    this.collisionStartHandler = this.handleCollisionEvent.bind(this);
    
    // Setup visualization timers
    this.scene.onBeforeRenderObservable.add(() => {
      this.updateTransientVisualizations();
    });
  }
  
  /**
   * Enables collision visualization
   */
  public enable(): void {
    if (this.enabled) return;
    
    this.enabled = true;
    
    // Add event listeners for collisions if not already added
    if (!this.collisionListenerAdded) {
      this.eventBus.on(CollisionEventTypes.COLLISION_START, this.collisionStartHandler);
      this.collisionListenerAdded = true;
    }
  }
  
  /**
   * Disables collision visualization
   */
  public disable(): void {
    if (!this.enabled) return;
    
    this.enabled = false;
    
    // Clean up any active visualizations
    this.clearAllVisualizations();
  }
  
  /**
   * Toggles collision visualization
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
   * Handles collision events
   * @param event The collision event
   */
  private handleCollisionEvent(event: Event): void {
    if (!this.enabled) return;
    
    // Make sure it's a collision event
    const collisionEvent = event as CollisionEvent;
    if (!collisionEvent) return;
    
    const data = collisionEvent.data;
    
    // Visualize collision point
    if (this.options.showCollisionPoints) {
      this.visualizeCollisionPoint(data.collisionPoint);
    }
    
    // Visualize collision normal
    if (this.options.showCollisionNormals) {
      this.visualizeCollisionNormal(data.collisionPoint, data.collisionNormal);
    }
    
    // Visualize collision shapes
    if (this.options.showCollisionShapes) {
      this.visualizeCollisionShapes(data);
    }
  }
  
  /**
   * Visualizes a collision point
   * @param contactPoint Contact point to visualize
   */
  private visualizeCollisionPoint(contactPoint: BABYLON.Vector3): void {
    const pointId = `collision_point_${Date.now()}_${this.collisionPointIndex++}`;
    this.debugRenderer.showCollisionPoint(
      pointId,
      contactPoint,
      this.options.collisionPointSize,
      this.options.collisionPointColor
    );
    
    // Register visualization for cleanup
    this.transientVisualizations.set(pointId, Date.now() + this.options.visualizationDuration!);
  }
  
  /**
   * Visualizes a collision normal as a vector from the contact point
   * @param contactPoint Contact point
   * @param normal The collision normal
   */
  private visualizeCollisionNormal(contactPoint: BABYLON.Vector3, normal: BABYLON.Vector3): void {
    const vectorId = `collision_normal_${Date.now()}_${this.collisionPointIndex}`;
    this.debugRenderer.showVector(
      vectorId,
      contactPoint,
      normal.scale(this.options.normalVectorLength!),
      this.options.normalVectorColor
    );
    
    // Register visualization for cleanup
    this.transientVisualizations.set(vectorId, Date.now() + this.options.visualizationDuration!);
  }
  
  /**
   * Visualizes collision shapes from a collision event data
   * @param data The collision event data
   */
  private visualizeCollisionShapes(data: CollisionEventData): void {
    // Get meshes from impostors
    const meshA = this.getMeshFromImpostor(data.impostor);
    const meshB = data.collidedWithImpostor ? this.getMeshFromImpostor(data.collidedWithImpostor) : null;
    
    // Visualize mesh A bounding box if available
    if (meshA) {
      this.visualizeMeshBoundingBox(meshA, `meshA_${data.entityId}`);
    }
    
    // Visualize mesh B bounding box if available
    if (meshB) {
      this.visualizeMeshBoundingBox(meshB, `meshB_${data.collidedWithEntityId || 'unknown'}`);
    }
  }
  
  /**
   * Gets a mesh from a physics impostor
   * @param impostor The physics impostor
   * @returns The associated mesh or null
   */
  private getMeshFromImpostor(impostor: BABYLON.PhysicsImpostor): BABYLON.AbstractMesh | null {
    if (!impostor.object) return null;
    
    return impostor.object as BABYLON.AbstractMesh;
  }
  
  /**
   * Visualizes a mesh's bounding box
   * @param mesh The mesh to visualize
   * @param identifier Unique identifier for the mesh
   */
  private visualizeMeshBoundingBox(mesh: BABYLON.AbstractMesh, identifier: string): void {
    const boundingInfo = mesh.getBoundingInfo();
    if (!boundingInfo) return;
    
    // Transform bounding box to world space
    const min = boundingInfo.boundingBox.minimumWorld;
    const max = boundingInfo.boundingBox.maximumWorld;
    
    // Create box visualization
    const boxId = `collision_box_${identifier}_${Date.now()}`;
    this.debugRenderer.showBox(boxId, min, max, this.options.collisionShapeColor);
    
    // Register visualization for cleanup
    this.transientVisualizations.set(boxId, Date.now() + this.options.visualizationDuration!);
  }
  
  /**
   * Manually visualize a collision between physics objects
   * @param info Collision information
   */
  public visualizeCollision(info: CollisionInfo): void {
    if (!this.enabled) return;
    
    // Visualize collision point
    if (this.options.showCollisionPoints) {
      this.visualizeCollisionPoint(info.point);
    }
    
    // Visualize collision normal
    if (this.options.showCollisionNormals) {
      this.visualizeCollisionNormal(info.point, info.normal);
    }
    
    // Visualize collision shapes
    if (this.options.showCollisionShapes) {
      const meshA = this.getMeshFromImpostor(info.initiator);
      const meshB = this.getMeshFromImpostor(info.collider);
      
      if (meshA) {
        this.visualizeMeshBoundingBox(meshA, `initiator_${Date.now()}`);
      }
      
      if (meshB) {
        this.visualizeMeshBoundingBox(meshB, `collider_${Date.now()}`);
      }
    }
  }
  
  /**
   * Visualizes a capsule collider
   * @param position The position of the capsule
   * @param height The height of the capsule
   * @param radius The radius of the capsule
   * @param upAxis The up axis of the capsule
   * @param identifier Unique identifier for the capsule
   */
  public visualizeCapsuleCollider(
    position: BABYLON.Vector3,
    height: number,
    radius: number,
    upAxis: BABYLON.Vector3,
    identifier: string
  ): void {
    if (!this.enabled) return;
    
    // Calculate capsule end points
    const halfHeight = height / 2 - radius;
    const start = position.add(upAxis.scale(-halfHeight));
    const end = position.add(upAxis.scale(halfHeight));
    
    // Create capsule visualization
    const capsuleId = `collision_capsule_${identifier}`;
    this.debugRenderer.showCapsule(capsuleId, start, end, radius, this.options.collisionShapeColor);
  }
  
  /**
   * Visualizes a sphere collider
   * @param position The position of the sphere
   * @param radius The radius of the sphere
   * @param identifier Unique identifier for the sphere
   */
  public visualizeSphereCollider(
    position: BABYLON.Vector3,
    radius: number,
    identifier: string
  ): void {
    if (!this.enabled) return;
    
    // Create sphere visualization
    const sphereId = `collision_sphere_${identifier}`;
    this.debugRenderer.showSphere(sphereId, position, radius, this.options.collisionShapeColor);
  }
  
  /**
   * Visualizes a box collider
   * @param min The minimum point of the box
   * @param max The maximum point of the box
   * @param identifier Unique identifier for the box
   */
  public visualizeBoxCollider(
    min: BABYLON.Vector3,
    max: BABYLON.Vector3,
    identifier: string
  ): void {
    if (!this.enabled) return;
    
    // Create box visualization
    const boxId = `collision_box_${identifier}`;
    this.debugRenderer.showBox(boxId, min, max, this.options.collisionShapeColor);
  }
  
  /**
   * Updates transient visualizations and removes expired ones
   */
  private updateTransientVisualizations(): void {
    if (!this.enabled) return;
    
    const currentTime = Date.now();
    const expiredIds: string[] = [];
    
    // Find expired visualizations
    this.transientVisualizations.forEach((expirationTime, id) => {
      if (currentTime > expirationTime) {
        expiredIds.push(id);
      }
    });
    
    // Remove expired visualizations
    expiredIds.forEach(id => {
      this.removeVisualization(id);
    });
  }
  
  /**
   * Removes a specific visualization
   * @param id The visualization ID to remove
   */
  private removeVisualization(id: string): void {
    // Check what type of visualization it is based on the ID
    if (id.startsWith('collision_point_')) {
      // Remove point
      this.debugRenderer.removeDebugSphere(id);
    } else if (id.startsWith('collision_normal_')) {
      // Remove vector
      this.debugRenderer.removeDebugVector(id);
    } else if (id.startsWith('collision_box_') || id.startsWith('collision_sphere_') || id.startsWith('collision_capsule_')) {
      // Remove mesh
      this.debugRenderer.removeDebugMesh(id);
    }
    
    // Remove from tracking
    this.transientVisualizations.delete(id);
  }
  
  /**
   * Clears all visualizations
   */
  private clearAllVisualizations(): void {
    // Remove all visualizations
    this.transientVisualizations.clear();
    
    // Clear debug renderer
    this.debugRenderer.clear();
  }
  
  /**
   * Cleans up resources
   */
  public dispose(): void {
    this.disable();
    
    // Remove scene observer
    this.scene.onBeforeRenderObservable.clear();
    
    // Remove collision listener if added
    if (this.collisionListenerAdded) {
      this.eventBus.off(CollisionEventTypes.COLLISION_START, this.collisionStartHandler);
      this.collisionListenerAdded = false;
    }
    
    // Clear all visualizations
    this.clearAllVisualizations();
  }
} 