/**
 * @file src/examples/OptimizedCollisionDemo.ts
 * @description Demonstrates using spatial partitioning for optimized collision detection
 */

import * as BABYLON from 'babylonjs';
import { PhysicsSystem } from '../core/physics/PhysicsSystem';
import { SpatialPartitioningCollisionSystem } from '../core/physics/SpatialPartitioningCollisionSystem';
import { ServiceLocator } from '../core/base/ServiceLocator';

/**
 * A demo of the optimized collision detection system
 */
export class OptimizedCollisionDemo {
  private canvas: HTMLCanvasElement;
  private engine: BABYLON.Engine;
  private scene: BABYLON.Scene;
  private physicsSystem: PhysicsSystem;
  private collisionSystem: SpatialPartitioningCollisionSystem;
  private fpsCounter!: HTMLDivElement;
  private debugText!: HTMLDivElement;
  
  // Stats variables
  private totalCollisionChecks: number = 0;
  private potentialCollisions: number = 0;
  private actualCollisions: number = 0;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  
  // Settings
  private NUM_OBJECTS = 200;
  private USE_SPATIAL_PARTITIONING = true;
  private VISUALIZATION_ENABLED = true;
  private CELL_SIZE = 20;
  
  /**
   * Creates a new demo
   * @param canvasId Canvas element ID
   */
  constructor(canvasId: string) {
    // Get the canvas element
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error(`Canvas element with ID ${canvasId} not found`);
    }
    
    // Create the UI elements
    this.createUI();
    
    // Create the BabylonJS engine and scene
    this.engine = new BABYLON.Engine(this.canvas, true);
    this.scene = new BABYLON.Scene(this.engine);
    
    // Configure scene
    this.scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.1, 1);
    
    // Initialize physics
    this.physicsSystem = new PhysicsSystem();
    this.physicsSystem.initialize(this.scene);
    
    // Create the optimized collision system
    this.collisionSystem = new SpatialPartitioningCollisionSystem({
      cellSize: this.CELL_SIZE,
      visualize: this.VISUALIZATION_ENABLED,
      useSpatialPartitioning: this.USE_SPATIAL_PARTITIONING,
      visualizeBroadPhase: this.VISUALIZATION_ENABLED,
      spatialGridUpdateInterval: 100
    });
    
    // Initialize the collision system
    this.collisionSystem.initialize(this.physicsSystem);
    
    // Assign to service locator
    this.registerWithServiceLocator('collisionSystem', this.collisionSystem);
    
    // Set up scene
    this.createScene();
    
    // Start the render loop
    this.engine.runRenderLoop(() => {
      this.scene.render();
      this.update();
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }
  
  /**
   * Registers a service with the service locator, adapting to whatever method
   * is available in the actual ServiceLocator implementation
   */
  private registerWithServiceLocator(key: string, service: any): void {
    // Check which method is available on ServiceLocator and use it
    if (typeof (ServiceLocator as any).provide === 'function') {
      (ServiceLocator as any).provide(key, service);
    } else if (typeof (ServiceLocator as any).register === 'function') {
      (ServiceLocator as any).register(key, service);
    } else if (typeof (ServiceLocator as any).registerService === 'function') {
      (ServiceLocator as any).registerService(key, service);
    } else {
      console.warn(`Could not register service '${key}' - no registration method found on ServiceLocator`);
    }
  }
  
  /**
   * Creates the UI elements
   */
  private createUI(): void {
    // Create FPS counter
    this.fpsCounter = document.createElement('div');
    this.fpsCounter.style.position = 'absolute';
    this.fpsCounter.style.top = '10px';
    this.fpsCounter.style.left = '10px';
    this.fpsCounter.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.fpsCounter.style.color = 'white';
    this.fpsCounter.style.padding = '5px';
    this.fpsCounter.style.fontFamily = 'monospace';
    this.fpsCounter.style.fontSize = '14px';
    document.body.appendChild(this.fpsCounter);
    
    // Create debug text
    this.debugText = document.createElement('div');
    this.debugText.style.position = 'absolute';
    this.debugText.style.top = '50px';
    this.debugText.style.left = '10px';
    this.debugText.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.debugText.style.color = 'white';
    this.debugText.style.padding = '5px';
    this.debugText.style.fontFamily = 'monospace';
    this.debugText.style.fontSize = '14px';
    this.debugText.style.width = '300px';
    document.body.appendChild(this.debugText);
    
    // Create controls
    this.createControls();
  }
  
  /**
   * Creates UI controls
   */
  private createControls(): void {
    const controlsDiv = document.createElement('div');
    controlsDiv.style.position = 'absolute';
    controlsDiv.style.top = '10px';
    controlsDiv.style.right = '10px';
    controlsDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    controlsDiv.style.color = 'white';
    controlsDiv.style.padding = '10px';
    controlsDiv.style.fontFamily = 'Arial, sans-serif';
    controlsDiv.style.fontSize = '14px';
    controlsDiv.style.width = '250px';
    document.body.appendChild(controlsDiv);
    
    // Title
    const title = document.createElement('h3');
    title.textContent = 'Optimized Collision Demo';
    title.style.marginTop = '0';
    controlsDiv.appendChild(title);
    
    // Toggle spatial partitioning
    const spatialToggle = this.createCheckbox(
      'Use Spatial Partitioning', 
      this.USE_SPATIAL_PARTITIONING,
      (checked) => {
        this.USE_SPATIAL_PARTITIONING = checked;
        this.collisionSystem.setUseSpatialPartitioning(checked);
      }
    );
    controlsDiv.appendChild(spatialToggle);
    
    // Toggle visualization
    const visualToggle = this.createCheckbox(
      'Show Visualization', 
      this.VISUALIZATION_ENABLED,
      (checked) => {
        this.VISUALIZATION_ENABLED = checked;
        // Recreate system with new settings
        this.resetCollisionSystem();
      }
    );
    controlsDiv.appendChild(visualToggle);
    
    // Cell size slider
    const cellSizeLabel = document.createElement('div');
    cellSizeLabel.textContent = `Cell Size: ${this.CELL_SIZE}`;
    controlsDiv.appendChild(cellSizeLabel);
    
    const cellSizeSlider = document.createElement('input');
    cellSizeSlider.type = 'range';
    cellSizeSlider.min = '5';
    cellSizeSlider.max = '50';
    cellSizeSlider.value = this.CELL_SIZE.toString();
    cellSizeSlider.style.width = '100%';
    cellSizeSlider.addEventListener('input', () => {
      this.CELL_SIZE = parseInt(cellSizeSlider.value, 10);
      cellSizeLabel.textContent = `Cell Size: ${this.CELL_SIZE}`;
      this.resetCollisionSystem();
    });
    controlsDiv.appendChild(cellSizeSlider);
    
    // Object count slider
    const objectCountLabel = document.createElement('div');
    objectCountLabel.textContent = `Object Count: ${this.NUM_OBJECTS}`;
    controlsDiv.appendChild(objectCountLabel);
    
    const objectCountSlider = document.createElement('input');
    objectCountSlider.type = 'range';
    objectCountSlider.min = '10';
    objectCountSlider.max = '1000';
    objectCountSlider.value = this.NUM_OBJECTS.toString();
    objectCountSlider.style.width = '100%';
    objectCountSlider.addEventListener('input', () => {
      this.NUM_OBJECTS = parseInt(objectCountSlider.value, 10);
      objectCountLabel.textContent = `Object Count: ${this.NUM_OBJECTS}`;
      this.resetScene();
    });
    controlsDiv.appendChild(objectCountSlider);
    
    // Add reset button
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset Demo';
    resetButton.style.width = '100%';
    resetButton.style.padding = '5px';
    resetButton.style.marginTop = '10px';
    resetButton.addEventListener('click', () => {
      this.resetScene();
    });
    controlsDiv.appendChild(resetButton);
  }
  
  /**
   * Creates a checkbox control
   */
  private createCheckbox(label: string, initialValue: boolean, onChange: (checked: boolean) => void): HTMLDivElement {
    const container = document.createElement('div');
    container.style.margin = '5px 0';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = initialValue;
    checkbox.id = `checkbox_${label.replace(/\s+/g, '_')}`;
    checkbox.addEventListener('change', () => {
      onChange(checkbox.checked);
    });
    
    const labelElement = document.createElement('label');
    labelElement.htmlFor = checkbox.id;
    labelElement.textContent = label;
    labelElement.style.marginLeft = '5px';
    
    container.appendChild(checkbox);
    container.appendChild(labelElement);
    
    return container;
  }
  
  /**
   * Resets the collision system with current settings
   */
  private resetCollisionSystem(): void {
    // Dispose the current collision system
    this.collisionSystem.destroy();
    
    // Create a new one with updated settings
    this.collisionSystem = new SpatialPartitioningCollisionSystem({
      cellSize: this.CELL_SIZE,
      visualize: this.VISUALIZATION_ENABLED,
      useSpatialPartitioning: this.USE_SPATIAL_PARTITIONING,
      visualizeBroadPhase: this.VISUALIZATION_ENABLED,
      spatialGridUpdateInterval: 100
    });
    
    // Initialize the new system
    this.collisionSystem.initialize(this.physicsSystem);
    
    // Update service locator
    this.registerWithServiceLocator('collisionSystem', this.collisionSystem);
  }
  
  /**
   * Resets the entire scene
   */
  private resetScene(): void {
    // Dispose all meshes in the scene
    this.scene.meshes.slice().forEach(mesh => {
      mesh.dispose();
    });
    
    // Reset collision system
    this.resetCollisionSystem();
    
    // Recreate the scene
    this.createScene();
    
    // Reset stats
    this.totalCollisionChecks = 0;
    this.potentialCollisions = 0;
    this.actualCollisions = 0;
  }
  
  /**
   * Creates the demo scene
   */
  private createScene(): void {
    // Create camera
    const camera = new BABYLON.ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 3,
      200,
      BABYLON.Vector3.Zero(),
      this.scene
    );
    camera.attachControl(this.canvas, true);
    camera.minZ = 0.1;
    
    // Create lights
    const hemisphericLight = new BABYLON.HemisphericLight(
      'hemisphericLight',
      new BABYLON.Vector3(0, 1, 0),
      this.scene
    );
    hemisphericLight.intensity = 0.7;
    
    const directionalLight = new BABYLON.DirectionalLight(
      'directionalLight',
      new BABYLON.Vector3(0.5, -1, 1),
      this.scene
    );
    directionalLight.intensity = 0.5;
    
    // Create ground
    const ground = BABYLON.MeshBuilder.CreateGround(
      'ground',
      { width: 500, height: 500 },
      this.scene
    );
    const groundMaterial = new BABYLON.StandardMaterial('groundMaterial', this.scene);
    groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.3);
    groundMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    ground.material = groundMaterial;
    
    // Create physics for ground
    const groundImpostor = new BABYLON.PhysicsImpostor(
      ground,
      BABYLON.PhysicsImpostor.BoxImpostor,
      { mass: 0, friction: 0.5, restitution: 0.7 },
      this.scene
    );
    
    // Create objects
    this.createRandomObjects(this.NUM_OBJECTS);
    
    // Track collision stats
    this.trackCollisionStats();
  }
  
  /**
   * Creates random physics objects in the scene
   */
  private createRandomObjects(count: number): void {
    const shapes = [
      // Box factory
      (position: BABYLON.Vector3) => {
        const size = 2 + Math.random() * 4;
        const box = BABYLON.MeshBuilder.CreateBox(
          `box_${position.x}_${position.z}`,
          { width: size, height: size, depth: size },
          this.scene
        );
        box.position = position;
        return box;
      },
      // Sphere factory
      (position: BABYLON.Vector3) => {
        const radius = 1 + Math.random() * 2;
        const sphere = BABYLON.MeshBuilder.CreateSphere(
          `sphere_${position.x}_${position.z}`,
          { diameter: radius * 2 },
          this.scene
        );
        sphere.position = position;
        return sphere;
      },
      // Cylinder factory
      (position: BABYLON.Vector3) => {
        const radius = 1 + Math.random() * 2;
        const height = 2 + Math.random() * 4;
        const cylinder = BABYLON.MeshBuilder.CreateCylinder(
          `cylinder_${position.x}_${position.z}`,
          { height, diameter: radius * 2 },
          this.scene
        );
        cylinder.position = position;
        return cylinder;
      }
    ];
    
    // Material colors
    const colors = [
      new BABYLON.Color3(0.8, 0.2, 0.2), // Red
      new BABYLON.Color3(0.2, 0.8, 0.2), // Green
      new BABYLON.Color3(0.2, 0.2, 0.8), // Blue
      new BABYLON.Color3(0.8, 0.8, 0.2), // Yellow
      new BABYLON.Color3(0.8, 0.2, 0.8), // Purple
      new BABYLON.Color3(0.2, 0.8, 0.8)  // Cyan
    ];
    
    // Create the objects
    const impostors: BABYLON.PhysicsImpostor[] = [];
    
    for (let i = 0; i < count; i++) {
      // Random position, keeping objects within a certain area
      const position = new BABYLON.Vector3(
        (Math.random() - 0.5) * 400,
        10 + Math.random() * 30,
        (Math.random() - 0.5) * 400
      );
      
      // Random shape
      const shapeIndex = Math.floor(Math.random() * shapes.length);
      const mesh = shapes[shapeIndex](position);
      
      // Random color
      const material = new BABYLON.StandardMaterial(`material_${i}`, this.scene);
      material.diffuseColor = colors[Math.floor(Math.random() * colors.length)];
      material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
      mesh.material = material;
      
      // Random rotation
      mesh.rotation = new BABYLON.Vector3(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      // Random mass between 0.1 and 10
      const mass = 0.1 + Math.random() * 9.9;
      
      // Create physics impostor
      const impostorType = this.getImpostorTypeForShape(shapeIndex);
      const impostor = new BABYLON.PhysicsImpostor(
        mesh,
        impostorType,
        { mass, friction: 0.5, restitution: 0.5 },
        this.scene
      );
      
      // Add to impostors array
      impostors.push(impostor);
    }
    
    // Register collision handlers for some objects (not all, to reduce callback overhead)
    for (let i = 0; i < Math.min(50, count); i += 2) {
      this.collisionSystem.registerCollisionHandler(
        impostors[i],
        null, // Any object
        (collisionInfo) => {
          this.handleCollision(collisionInfo);
        }
      );
    }
  }
  
  /**
   * Gets the appropriate impostor type for a shape
   */
  private getImpostorTypeForShape(shapeIndex: number): number {
    switch (shapeIndex) {
      case 0: // Box
        return BABYLON.PhysicsImpostor.BoxImpostor;
      case 1: // Sphere
        return BABYLON.PhysicsImpostor.SphereImpostor;
      case 2: // Cylinder
        return BABYLON.PhysicsImpostor.CylinderImpostor;
      default:
        return BABYLON.PhysicsImpostor.BoxImpostor;
    }
  }
  
  /**
   * Handles object collisions
   */
  private handleCollision(collisionInfo: any): void {
    // Increment actual collision count
    this.actualCollisions++;
    
    // Flash the meshes on collision
    const createFlashEffect = (impostor: BABYLON.PhysicsImpostor) => {
      if (!impostor.object) return;
      
      const mesh = impostor.object as BABYLON.AbstractMesh;
      const originalMaterial = mesh.material as BABYLON.StandardMaterial;
      if (!originalMaterial) return;
      
      // Create a flash material
      const flashMaterial = new BABYLON.StandardMaterial('flash_material', this.scene);
      flashMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
      flashMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
      flashMaterial.specularColor = new BABYLON.Color3(1, 1, 1);
      
      // Apply flash material
      mesh.material = flashMaterial;
      
      // Reset after a short time
      setTimeout(() => {
        if (mesh.isDisposed()) return;
        mesh.material = originalMaterial;
      }, 100);
    };
    
    // Apply flash effect to both colliding objects
    createFlashEffect(collisionInfo.initiator);
    createFlashEffect(collisionInfo.collider);
  }
  
  /**
   * Tracks the collision stats by monkey patching some methods
   */
  private trackCollisionStats(): void {
    // Monkey patch the findPotentialCollisions method to count potential collisions
    const originalFindPotentialCollisions = (this.collisionSystem as any).findPotentialCollisions;
    (this.collisionSystem as any).findPotentialCollisions = () => {
      const result = originalFindPotentialCollisions.call(this.collisionSystem);
      this.potentialCollisions += result.length;
      return result;
    };
    
    // Monkey patch the areColliding method to count checks
    const originalAreColliding = (this.collisionSystem as any).areColliding;
    (this.collisionSystem as any).areColliding = (a: any, b: any) => {
      this.totalCollisionChecks++;
      return originalAreColliding.call(this.collisionSystem, a, b);
    };
  }
  
  /**
   * Updates the demo
   */
  private update(): void {
    // Update collision system
    this.collisionSystem.update(this.scene.getAnimationRatio() / 60);
    
    // Update FPS counter
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFrameTime >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / (now - this.lastFrameTime));
      this.fpsCounter.textContent = `FPS: ${fps}`;
      this.frameCount = 0;
      this.lastFrameTime = now;
    }
    
    // Update debug text
    this.updateDebugText();
  }
  
  /**
   * Updates the debug text with collision stats
   */
  private updateDebugText(): void {
    // Calculate collision check ratio
    const ratio = this.potentialCollisions > 0 ? 
      (this.totalCollisionChecks / this.potentialCollisions).toFixed(2) : '0';
      
    const debugInfo = [
      `Objects: ${this.NUM_OBJECTS}`,
      `Spatial partitioning: ${this.USE_SPATIAL_PARTITIONING ? 'ON' : 'OFF'}`,
      `Cell size: ${this.CELL_SIZE}`,
      `Potential collisions: ${this.potentialCollisions}`,
      `Actual collision checks: ${this.totalCollisionChecks}`,
      `Actual collisions: ${this.actualCollisions}`,
      `Checks per potential: ${ratio}`
    ];
    
    this.debugText.textContent = debugInfo.join('\n');
  }
}

/**
 * Starts the demo when the window loads
 */
window.addEventListener('DOMContentLoaded', () => {
  // Get the canvas element ID from the page
  const canvasElement = document.getElementById('renderCanvas');
  
  if (canvasElement) {
    // Create and start the demo
    new OptimizedCollisionDemo('renderCanvas');
  } else {
    console.error('Canvas element not found! Add a canvas with id="renderCanvas" to the HTML.');
  }
}); 