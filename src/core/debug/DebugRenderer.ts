/**
 * @file src/core/debug/DebugRenderer.ts
 * @description Provides visual debugging aids for physics and collision systems.
 * 
 * @dependencies IDebugRenderer.ts
 * @relatedFiles IDebugRenderer.ts
 */
import { IDebugRenderer } from "./IDebugRenderer";
import * as BABYLON from 'babylonjs';

/**
 * Options for the debug renderer
 */
export interface DebugRendererOptions {
  /**
   * Whether to enable debug rendering by default
   */
  enabled?: boolean;
  
  /**
   * Color for collision shapes
   */
  collisionColor?: BABYLON.Color3;
  
  /**
   * Color for intersection points
   */
  intersectionColor?: BABYLON.Color3;
  
  /**
   * Color for force vectors
   */
  forceColor?: BABYLON.Color3;
  
  /**
   * Color for velocity vectors
   */
  velocityColor?: BABYLON.Color3;
  
  /**
   * Alpha value for debug meshes
   */
  alpha?: number;
  
  /**
   * Scale for vector visualizations
   */
  vectorScale?: number;
  
  /**
   * Whether to render colliders as wireframes
   */
  wireframe?: boolean;
  
  /**
   * Whether to auto-update debug visualization every frame
   */
  autoUpdate?: boolean;
}

/**
 * Default options for the debug renderer
 */
const DEFAULT_OPTIONS: DebugRendererOptions = {
  enabled: false,
  collisionColor: new BABYLON.Color3(1, 0, 0),
  intersectionColor: new BABYLON.Color3(1, 1, 0),
  forceColor: new BABYLON.Color3(0, 1, 0),
  velocityColor: new BABYLON.Color3(0, 0, 1),
  alpha: 0.3,
  vectorScale: 1.0,
  wireframe: true,
  autoUpdate: true
};

/**
 * Debug renderer for physics and collision visualization
 */
export class DebugRenderer implements IDebugRenderer {
  private scene: BABYLON.Scene;
  private options: DebugRendererOptions;
  private enabled: boolean;
  private debugRoot: BABYLON.TransformNode;
  private debugMeshes: Map<string, BABYLON.Mesh>;
  private debugVectors: Map<string, BABYLON.LinesMesh>;
  private debugSpheres: Map<string, BABYLON.Mesh>;
  private debugMaterial: BABYLON.StandardMaterial = null!;
  private wireframeMaterial: BABYLON.StandardMaterial = null!;
  private updatables: Array<() => void>;
  private instancedSpheres: BABYLON.InstancedMesh[] = [];
  private instancedBoxes: BABYLON.InstancedMesh[] = [];

  /**
   * Creates a new debug renderer
   * @param scene The Babylon.js scene
   * @param options Debug renderer options
   */
  constructor(scene: BABYLON.Scene, options: Partial<DebugRendererOptions> = {}) {
    this.scene = scene;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.enabled = this.options.enabled!;
    this.debugMeshes = new Map();
    this.debugVectors = new Map();
    this.debugSpheres = new Map();
    this.updatables = [];
    
    // Create debug root node
    this.debugRoot = new BABYLON.TransformNode('debugRoot', this.scene);
    this.debugRoot.setEnabled(this.enabled);
    
    // Create debug materials
    this.createDebugMaterials();
    
    // Set up auto-update
    if (this.options.autoUpdate) {
      this.scene.onBeforeRenderObservable.add(() => {
        this.update();
      });
    }
  }
  
  /**
   * Create debug materials
   */
  private createDebugMaterials(): void {
    // Standard material for debug meshes
    this.debugMaterial = new BABYLON.StandardMaterial('debugMaterial', this.scene);
    this.debugMaterial.diffuseColor = this.options.collisionColor!;
    this.debugMaterial.specularColor = BABYLON.Color3.Black();
    this.debugMaterial.alpha = this.options.alpha!;
    this.debugMaterial.backFaceCulling = false;
    
    // Wireframe material
    this.wireframeMaterial = new BABYLON.StandardMaterial('wireframeMaterial', this.scene);
    this.wireframeMaterial.diffuseColor = this.options.collisionColor!;
    this.wireframeMaterial.specularColor = BABYLON.Color3.Black();
    this.wireframeMaterial.wireframe = true;
    this.wireframeMaterial.backFaceCulling = false;
  }
  
  /**
   * Show a debug box
   * @param name Unique name for the box
   * @param min Minimum point
   * @param max Maximum point
   * @param color Optional color
   * @returns The created mesh
   */
  public showBox(name: string, min: BABYLON.Vector3, max: BABYLON.Vector3, color?: BABYLON.Color3): BABYLON.Mesh {
    // Remove existing box if any
    this.removeDebugMesh(name);
    
    // Create box
    const width = max.x - min.x;
    const height = max.y - min.y;
    const depth = max.z - min.z;
    const center = new BABYLON.Vector3(
      min.x + width / 2,
      min.y + height / 2,
      min.z + depth / 2
    );
    
    const box = BABYLON.MeshBuilder.CreateBox(
      `debug_box_${name}`,
      { width, height, depth },
      this.scene
    );
    
    box.position = center;
    box.parent = this.debugRoot;
    
    // Assign material
    const material = this.options.wireframe ? 
      this.wireframeMaterial.clone(`wireframe_${name}`) : 
      this.debugMaterial.clone(`debugMat_${name}`);
    
    if (color) {
      material.diffuseColor = color;
    }
    
    box.material = material;
    
    // Store in debug meshes
    this.debugMeshes.set(name, box);
    
    return box;
  }
  
  /**
   * Show a debug sphere
   * @param name Unique name for the sphere
   * @param center Center position
   * @param radius Radius
   * @param color Optional color
   * @returns The created mesh
   */
  public showSphere(name: string, center: BABYLON.Vector3, radius: number, color?: BABYLON.Color3): BABYLON.Mesh {
    // Remove existing sphere if any
    this.removeDebugMesh(name);
    
    // Create sphere
    const sphere = BABYLON.MeshBuilder.CreateSphere(
      `debug_sphere_${name}`,
      { diameter: radius * 2 },
      this.scene
    );
    
    sphere.position = center;
    sphere.parent = this.debugRoot;
    
    // Assign material
    const material = this.options.wireframe ? 
      this.wireframeMaterial.clone(`wireframe_${name}`) : 
      this.debugMaterial.clone(`debugMat_${name}`);
    
    if (color) {
      material.diffuseColor = color;
    }
    
    sphere.material = material;
    
    // Store in debug meshes
    this.debugMeshes.set(name, sphere);
    
    return sphere;
  }
  
  /**
   * Show a debug vector
   * @param name Unique name for the vector
   * @param startPoint Start point
   * @param direction Direction vector (will be scaled)
   * @param color Optional color
   * @returns The created line mesh
   */
  public showVector(name: string, startPoint: BABYLON.Vector3, direction: BABYLON.Vector3, color?: BABYLON.Color3): BABYLON.LinesMesh {
    // Remove existing vector if any
    this.removeDebugVector(name);
    
    // Scale direction
    const scaledDirection = direction.scale(this.options.vectorScale!);
    const endPoint = startPoint.add(scaledDirection);
    
    // Create vector line
    const points = [startPoint, endPoint];
    const lines = BABYLON.MeshBuilder.CreateLines(
      `debug_vector_${name}`,
      { points },
      this.scene
    );
    
    lines.parent = this.debugRoot;
    
    // Set color
    lines.color = color || this.options.forceColor!;
    
    // Create arrow head
    if (scaledDirection.length() > 0.1) {
      const headSize = 0.1 * scaledDirection.length();
      const arrowHead = this.createArrowHead(endPoint, scaledDirection.normalize(), headSize, lines.color);
      arrowHead.parent = lines;
    }
    
    // Store in debug vectors
    this.debugVectors.set(name, lines);
    
    return lines;
  }
  
  /**
   * Create arrow head for vectors
   * @param position Position of arrow head
   * @param direction Direction
   * @param size Size of arrow head
   * @param color Color
   * @returns The created mesh
   */
  private createArrowHead(position: BABYLON.Vector3, direction: BABYLON.Vector3, size: number, color: BABYLON.Color3): BABYLON.Mesh {
    // Calculate normal vectors
    const normal1 = direction.cross(BABYLON.Vector3.Up());
    const normal2 = direction.cross(normal1);
    
    // If direction is parallel to up vector, use different normal
    if (normal1.length() < 0.01) {
      normal1.copyFrom(direction.cross(BABYLON.Vector3.Forward()));
      normal2.copyFrom(direction.cross(normal1));
    }
    
    normal1.normalize();
    normal2.normalize();
    
    // Calculate points for cone
    const points = [];
    const segments = 8;
    
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const vector = normal1.scale(Math.cos(angle)).add(normal2.scale(Math.sin(angle)));
      points.push(position.add(vector.scale(size * 0.5)));
    }
    
    const tip = position.add(direction.scale(size));
    
    // Create arrow head mesh
    const indices = [];
    const tipIndex = points.length;
    points.push(tip);
    
    for (let i = 0; i < segments; i++) {
      const nextIndex = (i + 1) % segments;
      indices.push(i, nextIndex, tipIndex);
    }
    
    const arrowHead = new BABYLON.Mesh(`arrowHead`, this.scene);
    const vertexData = new BABYLON.VertexData();
    
    vertexData.positions = points.reduce((array, point) => {
      array.push(point.x, point.y, point.z);
      return array;
    }, [] as number[]);
    
    vertexData.indices = indices;
    vertexData.applyToMesh(arrowHead);
    
    // Create and assign material
    const material = new BABYLON.StandardMaterial(`arrowHeadMaterial`, this.scene);
    material.diffuseColor = color;
    material.specularColor = BABYLON.Color3.Black();
    material.backFaceCulling = false;
    
    arrowHead.material = material;
    
    return arrowHead;
  }
  
  /**
   * Show a collision point
   * @param name Unique name for the point
   * @param position Position
   * @param size Size of point visualization
   * @param color Optional color
   * @returns The created mesh
   */
  public showCollisionPoint(name: string, position: BABYLON.Vector3, size: number = 0.1, color?: BABYLON.Color3): BABYLON.Mesh {
    // Remove existing point if any
    this.removeDebugSphere(name);
    
    // Create sphere for point
    const sphere = BABYLON.MeshBuilder.CreateSphere(
      `debug_point_${name}`,
      { diameter: size * 2 },
      this.scene
    );
    
    sphere.position = position;
    sphere.parent = this.debugRoot;
    
    // Assign material
    const material = new BABYLON.StandardMaterial(`pointMat_${name}`, this.scene);
    material.diffuseColor = color || this.options.intersectionColor!;
    material.specularColor = BABYLON.Color3.Black();
    material.emissiveColor = material.diffuseColor.scale(0.5);
    
    sphere.material = material;
    
    // Store in debug spheres
    this.debugSpheres.set(name, sphere);
    
    return sphere;
  }
  
  /**
   * Show collision points as instances for better performance
   * @param positions Array of positions
   * @param size Size of points
   * @param color Optional color
   */
  public showCollisionPoints(positions: BABYLON.Vector3[], size: number = 0.1, color?: BABYLON.Color3): void {
    // Clear previous instances
    this.clearInstances();
    
    if (positions.length === 0) return;
    
    // Create template sphere
    const sphere = BABYLON.MeshBuilder.CreateSphere(
      'debug_point_template',
      { diameter: size * 2 },
      this.scene
    );
    
    sphere.isVisible = false;
    
    // Assign material
    const material = new BABYLON.StandardMaterial('pointMat_instances', this.scene);
    material.diffuseColor = color || this.options.intersectionColor!;
    material.specularColor = BABYLON.Color3.Black();
    material.emissiveColor = material.diffuseColor.scale(0.5);
    
    sphere.material = material;
    
    // Create instances
    for (let i = 0; i < positions.length; i++) {
      const instance = sphere.createInstance(`point_instance_${i}`);
      instance.position = positions[i];
      instance.parent = this.debugRoot;
      this.instancedSpheres.push(instance);
    }
  }
  
  /**
   * Show a debug capsule
   * @param name Unique name for the capsule
   * @param start Start position
   * @param end End position
   * @param radius Radius
   * @param color Optional color
   * @returns The created mesh
   */
  public showCapsule(name: string, start: BABYLON.Vector3, end: BABYLON.Vector3, radius: number, color?: BABYLON.Color3): BABYLON.Mesh {
    // Remove existing capsule if any
    this.removeDebugMesh(name);
    
    // Calculate capsule parameters
    const distance = BABYLON.Vector3.Distance(start, end);
    const direction = end.subtract(start).normalize();
    
    // Create cylinder for body
    const cylinder = BABYLON.MeshBuilder.CreateCylinder(
      `debug_capsule_body_${name}`,
      {
        height: distance,
        diameter: radius * 2,
        tessellation: 16
      },
      this.scene
    );
    
    // Create spheres for ends
    const startSphere = BABYLON.MeshBuilder.CreateSphere(
      `debug_capsule_start_${name}`,
      { diameter: radius * 2, segments: 16 },
      this.scene
    );
    
    const endSphere = BABYLON.MeshBuilder.CreateSphere(
      `debug_capsule_end_${name}`,
      { diameter: radius * 2, segments: 16 },
      this.scene
    );
    
    // Position parts
    const center = start.add(end).scale(0.5);
    cylinder.position = center;
    
    // Rotate cylinder to align with direction
    const rotationAxis = BABYLON.Vector3.Cross(BABYLON.Vector3.Up(), direction);
    let angle = Math.acos(BABYLON.Vector3.Dot(BABYLON.Vector3.Up(), direction));
    
    if (rotationAxis.length() < 0.001) {
      // If direction is parallel to up, set rotation accordingly
      if (direction.y < 0) {
        cylinder.rotation = new BABYLON.Vector3(Math.PI, 0, 0);
      }
    } else {
      rotationAxis.normalize();
      cylinder.rotationQuaternion = BABYLON.Quaternion.RotationAxis(rotationAxis, angle);
    }
    
    startSphere.position = start;
    endSphere.position = end;
    
    // Create parent mesh
    const capsule = BABYLON.Mesh.MergeMeshes(
      [cylinder, startSphere, endSphere],
      true,
      true,
      undefined,
      false,
      true
    );
    
    if (capsule) {
      capsule.name = `debug_capsule_${name}`;
      capsule.parent = this.debugRoot;
      
      // Assign material
      const material = this.options.wireframe ? 
        this.wireframeMaterial.clone(`wireframe_${name}`) : 
        this.debugMaterial.clone(`debugMat_${name}`);
      
      if (color) {
        material.diffuseColor = color;
      }
      
      capsule.material = material;
      
      // Store in debug meshes
      this.debugMeshes.set(name, capsule);
      
      return capsule;
    }
    
    // Fallback if merge failed
    console.warn(`Failed to merge capsule, returning cylinder instead`);
    
    cylinder.name = `debug_capsule_${name}`;
    cylinder.parent = this.debugRoot;
    
    // Assign material
    const material = this.options.wireframe ? 
      this.wireframeMaterial.clone(`wireframe_${name}`) : 
      this.debugMaterial.clone(`debugMat_${name}`);
    
    if (color) {
      material.diffuseColor = color;
    }
    
    cylinder.material = material;
    
    // Store in debug meshes
    this.debugMeshes.set(name, cylinder);
    
    return cylinder;
  }
  
  /**
   * Register an updatable function for the debug renderer
   * @param updateFunction Function to call on update
   */
  public registerUpdatable(updateFunction: () => void): void {
    this.updatables.push(updateFunction);
  }
  
  /**
   * Remove a debug mesh
   * @param name Name of mesh to remove
   */
  public removeDebugMesh(name: string): void {
    const mesh = this.debugMeshes.get(name);
    if (mesh) {
      mesh.dispose();
      this.debugMeshes.delete(name);
    }
  }
  
  /**
   * Remove a debug vector
   * @param name Name of vector to remove
   */
  public removeDebugVector(name: string): void {
    const vector = this.debugVectors.get(name);
    if (vector) {
      vector.dispose();
      this.debugVectors.delete(name);
    }
  }
  
  /**
   * Remove a debug sphere
   * @param name Name of sphere to remove
   */
  public removeDebugSphere(name: string): void {
    const sphere = this.debugSpheres.get(name);
    if (sphere) {
      sphere.dispose();
      this.debugSpheres.delete(name);
    }
  }
  
  /**
   * Clear all debug visualizations
   */
  public clear(): void {
    // Clear debug meshes
    this.debugMeshes.forEach(mesh => {
      mesh.dispose();
    });
    this.debugMeshes.clear();
    
    // Clear debug vectors
    this.debugVectors.forEach(vector => {
      vector.dispose();
    });
    this.debugVectors.clear();
    
    // Clear debug spheres
    this.debugSpheres.forEach(sphere => {
      sphere.dispose();
    });
    this.debugSpheres.clear();
    
    // Clear instances
    this.clearInstances();
  }
  
  /**
   * Clear instanced meshes
   */
  private clearInstances(): void {
    // Clear instanced spheres
    this.instancedSpheres.forEach(instance => {
      instance.dispose();
    });
    this.instancedSpheres = [];
    
    // Clear instanced boxes
    this.instancedBoxes.forEach(instance => {
      instance.dispose();
    });
    this.instancedBoxes = [];
  }
  
  /**
   * Enable debug rendering
   */
  public enable(): void {
    this.enabled = true;
    this.debugRoot.setEnabled(true);
  }
  
  /**
   * Disable debug rendering
   */
  public disable(): void {
    this.enabled = false;
    this.debugRoot.setEnabled(false);
  }
  
  /**
   * Toggle debug rendering
   */
  public toggle(): void {
    this.enabled = !this.enabled;
    this.debugRoot.setEnabled(this.enabled);
  }
  
  /**
   * Check if debug rendering is enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Renders debug information on the screen
   * Implements IDebugRenderer interface
   */
  public renderDebugInfo(): void {
    // Update all debug visualizations if enabled
    if (this.enabled) {
      this.update();
    }
  }
  
  /**
   * Update debug visualizations
   */
  public update(): void {
    if (!this.enabled) return;
    
    // Call all updatable functions
    this.updatables.forEach(update => {
      update();
    });
  }
  
  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.clear();
    
    // Dispose of materials
    this.debugMaterial.dispose();
    this.wireframeMaterial.dispose();
    
    // Dispose of root node
    this.debugRoot.dispose();
    
    // Remove update observable
    if (this.options.autoUpdate) {
      this.scene.onBeforeRenderObservable.clear();
    }
  }
}
