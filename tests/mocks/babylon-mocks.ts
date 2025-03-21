/**
 * @file tests/mocks/babylonjs.ts
 * @description Centralized mock library for Babylon.js objects in tests
 */

// Mock implementation of Babylon.js classes and utilities
// This file provides consistent mock implementations for use across all tests

/**
 * Mock Vector3 implementation with all required methods
 */
export class Vector3 {
    public x: number;
    public y: number;
    public z: number;
  
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
  
  /**
   * Mock Camera implementation
   */
  export class Camera {
    public name: string;
    public id: string;
    public uniqueId: number;
    public position: Vector3 = new Vector3(0, 0, 0);
    public rotation: Vector3 = new Vector3(0, 0, 0);
    public rotationQuaternion: Quaternion | null = null;
    public fov: number = Math.PI / 4.0;
    public minZ: number = 0.1;
    public maxZ: number = 10000.0;
    public inertia: number = 0.9;
    public mode: number = 0;
    public isIntermediate: boolean = false;
    public viewport: any = { x: 0, y: 0, width: 1, height: 1 };
    public parent: Camera | null = null;
    public target: Vector3 = new Vector3(0, 0, 0);
    public upVector: Vector3 = Vector3.Up();
    
    private _scene: Scene;
    private static _UniqueIdCounter: number = 0;
  
    constructor(name: string, position: Vector3, scene: Scene) {
      this.name = name;
      this.id = name;
      this.uniqueId = Camera._UniqueIdCounter++;
      this.position = position.clone();
      this._scene = scene;
      scene.addCamera(this);
    }
  
    public getScene(): Scene {
      return this._scene;
    }
  
    public attachControl(element: HTMLElement, noPreventDefault?: boolean): void {
      // Mock implementation
    }
  
    public detachControl(element: HTMLElement): void {
      // Mock implementation
    }
  
    public getViewMatrix(): Matrix {
      const result = Matrix.Identity();
      
      if (this.parent) {
        const parentViewMatrix = this.parent.getViewMatrix();
        result.multiplyToRef(parentViewMatrix, result);
      }
      
      return result;
    }
  
    public getProjectionMatrix(): Matrix {
      return Matrix.Identity();
    }
  
    public getTransformationMatrix(): Matrix {
      const view = this.getViewMatrix();
      const projection = this.getProjectionMatrix();
      const result = view.multiply(projection);
      return result;
    }
  
    public setTarget(target: Vector3): void {
      this.target = target.clone();
    }
  
    public getTarget(): Vector3 {
      return this.target.clone();
    }
  
    public createRigCamera(name: string, cameraIndex: number): Camera {
      return new Camera(name, this.position.clone(), this._scene);
    }
  
    public dispose(): void {
      this._scene.removeCamera(this);
    }
  
    public getDirection(axis: Vector3): Vector3 {
      const result = axis.clone();
      // In a real implementation, this would transform the axis based on the camera's orientation
      return result.normalize();
    }
  
    public getForwardRay(length: number = 100): Ray {
      return new Ray(this.position, this.getTarget().subtract(this.position).normalize(), length);
    }
  }
  
  /**
   * Mock FreeCamera implementation
   */
  export class FreeCamera extends Camera {
    public ellipsoid: Vector3 = new Vector3(0.5, 1, 0.5);
    public ellipsoidOffset: Vector3 = new Vector3(0, 0, 0);
    public checkCollisions: boolean = false;
    public applyGravity: boolean = false;
    public speed: number = 1.0;
    public angularSensibility: number = 2000.0;
    
    constructor(name: string, position: Vector3, scene: Scene) {
      super(name, position, scene);
    }
  }
  
  /**
   * Mock ArcRotateCamera implementation
   */
  export class ArcRotateCamera extends Camera {
    public alpha: number = 0;
    public beta: number = 0;
    public radius: number = 10;
    public lowerAlphaLimit: number | null = null;
    public upperAlphaLimit: number | null = null;
    public lowerBetaLimit: number = 0.01;
    public upperBetaLimit: number = Math.PI - 0.01;
    public lowerRadiusLimit: number | null = null;
    public upperRadiusLimit: number | null = null;
    public inertialAlphaOffset: number = 0;
    public inertialBetaOffset: number = 0;
    public inertialRadiusOffset: number = 0;
    public zoomOnFactor: number = 1;
    
    constructor(name: string, alpha: number, beta: number, radius: number, target: Vector3, scene: Scene) {
      super(name, Vector3.Zero(), scene);
      this.alpha = alpha;
      this.beta = beta;
      this.radius = radius;
      this.setTarget(target);
      
      // Set position based on spherical coordinates
      this.position = new Vector3(
        target.x + radius * Math.cos(alpha) * Math.sin(beta),
        target.y + radius * Math.cos(beta),
        target.z + radius * Math.sin(alpha) * Math.sin(beta)
      );
    }
    
    public setPosition(position: Vector3): void {
      // Update spherical coordinates based on position
      const diff = position.subtract(this.target);
      this.radius = diff.length();
      
      if (diff.x === 0 && diff.z === 0) {
        this.beta = diff.y < 0 ? Math.PI : 0;
        this.alpha = 0;
      } else {
        this.beta = Math.acos(diff.y / this.radius);
        this.alpha = Math.atan2(diff.z, diff.x);
      }
      
      this.position = position.clone();
    }
    
    public zoomOn(meshes: Mesh[]): void {
      if (meshes.length === 0) {
        return;
      }
      
      // Mock implementation
      // In a real implementation, this would adjust the radius
      // to ensure all meshes are visible
    }
  }
  
  /**
   * Mock Material implementation
   */
  export class Material {
    public name: string;
    public id: string;
    public uniqueId: number;
    public alpha: number = 1.0;
    public backFaceCulling: boolean = true;
    public wireframe: boolean = false;
    public zOffset: number = 0;
    public alphaMode: number = 0;
    public needDepthPrePass: boolean = false;
    
    private _scene: Scene;
    private static _UniqueIdCounter: number = 0;
  
    constructor(name: string, scene: Scene) {
      this.name = name;
      this.id = name;
      this.uniqueId = Material._UniqueIdCounter++;
      this._scene = scene;
      scene.materials.push(this);
    }
  
    public getScene(): Scene {
      return this._scene;
    }
  
    public isReady(): boolean {
      return true;
    }
  
    public dispose(forceDisposeEffect?: boolean, forceDisposeTextures?: boolean): void {
      const index = this._scene.materials.indexOf(this);
      if (index !== -1) {
        this._scene.materials.splice(index, 1);
      }
    }
  
    public clone(name: string): Material {
      const clonedMaterial = new Material(name, this._scene);
      clonedMaterial.alpha = this.alpha;
      clonedMaterial.backFaceCulling = this.backFaceCulling;
      clonedMaterial.wireframe = this.wireframe;
      clonedMaterial.zOffset = this.zOffset;
      clonedMaterial.alphaMode = this.alphaMode;
      clonedMaterial.needDepthPrePass = this.needDepthPrePass;
      return clonedMaterial;
    }
  }
  
  /**
   * Mock StandardMaterial implementation
   */
  export class StandardMaterial extends Material {
    public diffuseColor: Color3 = new Color3(1, 1, 1);
    public diffuseTexture: any = null;
    public ambientColor: Color3 = new Color3(0, 0, 0);
    public emissiveColor: Color3 = new Color3(0, 0, 0);
    public specularColor: Color3 = new Color3(1, 1, 1);
    public specularPower: number = 64;
    public useAlphaFromDiffuseTexture: boolean = false;
    public useEmissiveAsIllumination: boolean = false;
    public disableLighting: boolean = false;
    
    constructor(name: string, scene: Scene) {
      super(name, scene);
    }
    
    public clone(name: string): StandardMaterial {
      const clonedMaterial = new StandardMaterial(name, this.getScene());
      clonedMaterial.diffuseColor = this.diffuseColor.clone();
      clonedMaterial.ambientColor = this.ambientColor.clone();
      clonedMaterial.emissiveColor = this.emissiveColor.clone();
      clonedMaterial.specularColor = this.specularColor.clone();
      clonedMaterial.specularPower = this.specularPower;
      clonedMaterial.useAlphaFromDiffuseTexture = this.useAlphaFromDiffuseTexture;
      clonedMaterial.useEmissiveAsIllumination = this.useEmissiveAsIllumination;
      clonedMaterial.disableLighting = this.disableLighting;
      
      // Copy base material properties
      clonedMaterial.alpha = this.alpha;
      clonedMaterial.backFaceCulling = this.backFaceCulling;
      clonedMaterial.wireframe = this.wireframe;
      clonedMaterial.zOffset = this.zOffset;
      clonedMaterial.alphaMode = this.alphaMode;
      clonedMaterial.needDepthPrePass = this.needDepthPrePass;
      
      return clonedMaterial;
    }
  }
  
  /**
   * Mock Light implementation
   */
  export class Light {
    public name: string;
    public id: string;
    public uniqueId: number;
    public intensity: number = 1.0;
    public diffuse: Color3 = new Color3(1, 1, 1);
    public specular: Color3 = new Color3(1, 1, 1);
    public range: number = Number.MAX_VALUE;
    public includeOnlyWithLayerMask: number = 0xFFFFFFFF;
    public includedOnlyMeshes: Mesh[] = [];
    public excludedMeshes: Mesh[] = [];
    public excludeWithLayerMask: number = 0;
    
    private _scene: Scene;
    private static _UniqueIdCounter: number = 0;
  
    constructor(name: string, scene: Scene) {
      this.name = name;
      this.id = name;
      this.uniqueId = Light._UniqueIdCounter++;
      this._scene = scene;
      scene.lights.push(this);
    }
  
    public getScene(): Scene {
      return this._scene;
    }
  
    public dispose(): void {
      const index = this._scene.lights.indexOf(this);
      if (index !== -1) {
        this._scene.lights.splice(index, 1);
      }
    }
  
    public clone(name: string): Light {
      const clonedLight = new Light(name, this._scene);
      clonedLight.intensity = this.intensity;
      clonedLight.diffuse = this.diffuse.clone();
      clonedLight.specular = this.specular.clone();
      clonedLight.range = this.range;
      clonedLight.includeOnlyWithLayerMask = this.includeOnlyWithLayerMask;
      clonedLight.excludeWithLayerMask = this.excludeWithLayerMask;
      clonedLight.includedOnlyMeshes = [...this.includedOnlyMeshes];
      clonedLight.excludedMeshes = [...this.excludedMeshes];
      return clonedLight;
    }
  }
  
  /**
   * Mock HemisphericLight implementation
   */
  export class HemisphericLight extends Light {
    public direction: Vector3 = new Vector3(0, 1, 0);
    public groundColor: Color3 = new Color3(0.3, 0.3, 0.3);
    
    constructor(name: string, direction: Vector3, scene: Scene) {
      super(name, scene);
      this.direction = direction.normalize();
    }
    
    public setDirectionToTarget(target: Vector3): Vector3 {
      this.direction = target.subtract(Vector3.Zero()).normalize();
      return this.direction;
    }
    
    public clone(name: string): HemisphericLight {
      const clonedLight = new HemisphericLight(name, this.direction.clone(), this._scene);
      clonedLight.groundColor = this.groundColor.clone();
      
      // Copy base light properties
      clonedLight.intensity = this.intensity;
      clonedLight.diffuse = this.diffuse.clone();
      clonedLight.specular = this.specular.clone();
      clonedLight.range = this.range;
      clonedLight.includeOnlyWithLayerMask = this.includeOnlyWithLayerMask;
      clonedLight.excludeWithLayerMask = this.excludeWithLayerMask;
      clonedLight.includedOnlyMeshes = [...this.includedOnlyMeshes];
      clonedLight.excludedMeshes = [...this.excludedMeshes];
      
      return clonedLight;
    }
  }
  
  /**
   * Mock PointLight implementation
   */
  export class PointLight extends Light {
    public position: Vector3 = new Vector3(0, 0, 0);
    
    constructor(name: string, position: Vector3, scene: Scene) {
      super(name, scene);
      this.position = position.clone();
    }
    
    public clone(name: string): PointLight {
      const clonedLight = new PointLight(name, this.position.clone(), this._scene);
      
      // Copy base light properties
      clonedLight.intensity = this.intensity;
      clonedLight.diffuse = this.diffuse.clone();
      clonedLight.specular = this.specular.clone();
      clonedLight.range = this.range;
      clonedLight.includeOnlyWithLayerMask = this.includeOnlyWithLayerMask;
      clonedLight.excludeWithLayerMask = this.excludeWithLayerMask;
      clonedLight.includedOnlyMeshes = [...this.includedOnlyMeshes];
      clonedLight.excludedMeshes = [...this.excludedMeshes];
      
      return clonedLight;
    }
  }
  
  /**
   * Mock DirectionalLight implementation
   */
  export class DirectionalLight extends Light {
    public direction: Vector3 = new Vector3(0, -1, 0);
    public position: Vector3 = new Vector3(0, 0, 0);
    public shadowMinZ: number = 0;
    public shadowMaxZ: number = 100;
    
    constructor(name: string, direction: Vector3, scene: Scene) {
      super(name, scene);
      this.direction = direction.normalize();
    }
    
    public setDirectionToTarget(target: Vector3): Vector3 {
      this.direction = target.subtract(this.position).normalize();
      return this.direction;
    }
    
    public clone(name: string): DirectionalLight {
      const clonedLight = new DirectionalLight(name, this.direction.clone(), this._scene);
      clonedLight.position = this.position.clone();
      clonedLight.shadowMinZ = this.shadowMinZ;
      clonedLight.shadowMaxZ = this.shadowMaxZ;
      
      // Copy base light properties
      clonedLight.intensity = this.intensity;
      clonedLight.diffuse = this.diffuse.clone();
      clonedLight.specular = this.specular.clone();
      clonedLight.range = this.range;
      clonedLight.includeOnlyWithLayerMask = this.includeOnlyWithLayerMask;
      clonedLight.excludeWithLayerMask = this.excludeWithLayerMask;
      clonedLight.includedOnlyMeshes = [...this.includedOnlyMeshes];
      clonedLight.excludedMeshes = [...this.excludedMeshes];
      
      return clonedLight;
    }
  }
  
  /**
   * Mock TransformNode implementation
   */
  export class TransformNode {
    public name: string;
    public id: string;
    public uniqueId: number;
    public position: Vector3 = new Vector3(0, 0, 0);
    public rotation: Vector3 = new Vector3(0, 0, 0);
    public rotationQuaternion: Quaternion | null = null;
    public scaling: Vector3 = new Vector3(1, 1, 1);
    public parent: TransformNode | null = null;
    
    private _scene: Scene;
    private static _UniqueIdCounter: number = 0;
  
    constructor(name: string, scene: Scene) {
      this.name = name;
      this.id = name;
      this.uniqueId = TransformNode._UniqueIdCounter++;
      this._scene = scene;
      scene.transformNodes.push(this);
    }
  
    public getScene(): Scene {
      return this._scene;
    }
  
    public getWorldMatrix(): Matrix {
      const result = Matrix.Identity();
      
      // Apply scaling
      const scalingMatrix = Matrix.Scaling(this.scaling.x, this.scaling.y, this.scaling.z);
      
      // Apply rotation
      let rotationMatrix = Matrix.Identity();
      if (this.rotationQuaternion) {
        this.rotationQuaternion.toRotationMatrix(rotationMatrix);
      } else {
        rotationMatrix = Matrix.RotationYawPitchRoll(
          this.rotation.y,
          this.rotation.x,
          this.rotation.z
        );
      }
      
      // Apply translation
      const translationMatrix = Matrix.Translation(
        this.position.x,
        this.position.y,
        this.position.z
      );
      
      // Combine transformations
      scalingMatrix.multiplyToRef(rotationMatrix, result);
      result.multiplyToRef(translationMatrix, result);
      
      // Apply parent transformation if any
      if (this.parent) {
        const parentMatrix = this.parent.getWorldMatrix();
        result.multiplyToRef(parentMatrix, result);
      }
      
      return result;
    }
  
    public setParent(parent: TransformNode | null): TransformNode {
      this.parent = parent;
      return this;
    }
  
    public getAbsolutePosition(): Vector3 {
      const worldMatrix = this.getWorldMatrix();
      const result = new Vector3(
        worldMatrix.m[12],
        worldMatrix.m[13],
        worldMatrix.m[14]
      );
      return result;
    }
  
    public dispose(): void {
      const index = this._scene.transformNodes.indexOf(this);
      if (index !== -1) {
        this._scene.transformNodes.splice(index, 1);
      }
    }
  }
  
  /**
   * Mock PhysicsImpostor implementation
   */
  export class PhysicsImpostor {
    public object: any;
    public type: number;
    public mass: number;
    public friction: number;
    public restitution: number;
    public physicsBody: any = null;
    
    private _scene: Scene;
    private _options: any;
  
    constructor(object: any, type: number, options: any, scene: Scene) {
      this.object = object;
      this.type = type;
      this._options = options || {};
      this._scene = scene;
      
      this.mass = options.mass || 0;
      this.friction = options.friction || 0.2;
      this.restitution = options.restitution || 0.2;
      
      // If attached to a mesh, set the impostor reference
      if (object instanceof Mesh) {
        object.physicsImpostor = this;
      }
    }
  
    public dispose(): void {
      if (this.object instanceof Mesh) {
        this.object.physicsImpostor = null;
      }
    }
  
    public getObjectExtendSize(): Vector3 {
      if (this.object instanceof Mesh) {
        // In a real implementation, this would calculate the actual size
        return new Vector3(1, 1, 1);
      }
      return new Vector3(1, 1, 1);
    }
  
    public getLinearVelocity(): Vector3 {
      return new Vector3(0, 0, 0);
    }
  
    public setLinearVelocity(velocity: Vector3): void {
      // Mock implementation
    }
  
    public getAngularVelocity(): Vector3 {
      return new Vector3(0, 0, 0);
    }
  
    public setAngularVelocity(velocity: Vector3): void {
      // Mock implementation
    }
  
    public applyImpulse(force: Vector3, contactPoint: Vector3): void {
      // Mock implementation
    }
  
    public applyForce(force: Vector3, contactPoint: Vector3): void {
      // Mock implementation
    }
  
    public createJoint(otherImpostor: PhysicsImpostor, jointType: number, jointData: any): void {
      // Mock implementation
    }
  
    public sleep(): void {
      // Mock implementation
    }
  
    public wakeUp(): void {
      // Mock implementation
    }
  
    // Static properties for impostor types
    public static NoImpostor: number = 0;
    public static SphereImpostor: number = 1;
    public static BoxImpostor: number = 2;
    public static PlaneImpostor: number = 3;
    public static MeshImpostor: number = 4;
    public static CylinderImpostor: number = 7;
    public static ParticleImpostor: number = 8;
    public static HeightmapImpostor: number = 9;
  }
  
  /**
   * Mock Ray implementation
   */
  export class Ray {
    public origin: Vector3;
    public direction: Vector3;
    public length: number;
  
    constructor(origin: Vector3, direction: Vector3, length: number = Number.MAX_VALUE) {
      this.origin = origin.clone();
      this.direction = direction.normalize();
      this.length = length;
    }
  
    public intersectsMesh(mesh: Mesh, fastCheck: boolean = false): { hit: boolean, distance: number, pickedPoint: Vector3 | null, pickedMesh: Mesh | null } {
      // Mock implementation - in real tests, you might want to customize this
      return {
        hit: false,
        distance: 0,
        pickedPoint: null,
        pickedMesh: null
      };
    }
  
    public intersectsBoxMinMax(minimum: Vector3, maximum: Vector3): { hit: boolean, distance: number } {
      // Mock implementation
      return {
        hit: false,
        distance: 0
      };
    }
  
    public intersectsSphere(sphere: { center: Vector3, radius: number }): { hit: boolean, distance: number } {
      // Mock implementation
      return {
        hit: false,
        distance: 0
      };
    }
  
    public clone(): Ray {
      return new Ray(this.origin, this.direction, this.length);
    }
  }
  
  /**
   * Mock GlowLayer implementation
   */
  export class GlowLayer {
    public name: string;
    public intensity: number = 1.0;
    public blurKernelSize: number = 16;
    public addIncludedOnlyMesh: jest.Mock = jest.fn();
    public removeIncludedOnlyMesh: jest.Mock = jest.fn();
    
    private _scene: Scene;
  
    constructor(name: string, scene: Scene) {
      this.name = name;
      this._scene = scene;
    }
  
    public render(): void {
      // Mock implementation
    }
  
    public dispose(): void {
      // Mock implementation
    }
  }
  
  /**
   * Mock ActionManager implementation
   */
  export class ActionManager {
    private _scene: Scene;
    private _actions: any[] = [];
  
    constructor(scene: Scene) {
      this._scene = scene;
    }
  
    public registerAction(action: any): ActionManager {
      this._actions.push(action);
      return this;
    }
  
    public unregisterAction(action: any): ActionManager {
      const index = this._actions.indexOf(action);
      if (index !== -1) {
        this._actions.splice(index, 1);
      }
      return this;
    }
  
    public dispose(): void {
      this._actions = [];
    }
  }
  
  /**
   * Utility functions and constants
   */
  export const VertexBuffer = {
    PositionKind: "position",
    NormalKind: "normal",
    UVKind: "uv",
    UV2Kind: "uv2",
    UV3Kind: "uv3",
    UV4Kind: "uv4",
    UV5Kind: "uv5",
    UV6Kind: "uv6",
    ColorKind: "color",
    MatricesIndicesKind: "matricesIndices",
    MatricesWeightsKind: "matricesWeights",
    MatricesIndicesExtraKind: "matricesIndicesExtra",
    MatricesWeightsExtraKind: "matricesWeightsExtra",
    TangentKind: "tangent",
  };
  
  export function CreatePlane(name: string, options: any, scene: Scene): Mesh {
    return Mesh.CreatePlane(name, options, scene);
  }
  
  export function CreateBox(name: string, options: any, scene: Scene): Mesh {
    return Mesh.CreateBox(name, options, scene);
  }
  
  export function CreateSphere(name: string, options: any, scene: Scene): Mesh {
    return Mesh.CreateSphere(name, options, scene);
  }
  
  export function CreateCylinder(name: string, options: any, scene: Scene): Mesh {
    return Mesh.CreateCylinder(name, options, scene);
  }
  
  export function CreateGround(name: string, options: any, scene: Scene): Mesh {
    return Mesh.CreateGround(name, options, scene);
  }
  
  export function CreateGroundFromHeightMap(name: string, url: string, options: any, scene: Scene): Mesh {
    return Mesh.CreateGroundFromHeightMap(name, url, options, scene);
  }
  
  /**
   * Extra helper mock methods that aren't part of the standard Babylon.js API
   * but are useful for testing
   */
  
  /**
   * Creates a mockable DOM element
   */
  export function createMockCanvas(): HTMLCanvasElement {
    return {
      width: 800,
      height: 600,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      getBoundingClientRect: jest.fn().mockReturnValue({
        width: 800,
        height: 600,
        top: 0,
        left: 0,
        bottom: 600,
        right: 800
      }),
      style: {},
      getContext: jest.fn().mockReturnValue({
        canvas: { width: 800, height: 600 },
        viewport: jest.fn(),
        clear: jest.fn(),
        disable: jest.fn(),
        enable: jest.fn(),
        cullFace: jest.fn(),
        drawElements: jest.fn(),
        createBuffer: jest.fn(),
        bindBuffer: jest.fn(),
        bufferData: jest.fn(),
        useProgram: jest.fn()
      })
    } as unknown as HTMLCanvasElement;
  }
  
  /**
   * Creates a mock window object with required properties for tests
   */
  export function createMockWindow(): Window {
    return {
      innerWidth: 800,
      innerHeight: 600,
      devicePixelRatio: 1,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      requestAnimationFrame: jest.fn().mockImplementation(callback => {
        setTimeout(callback, 0);
        return 0;
      }),
      cancelAnimationFrame: jest.fn(),
      document: {
        createElement: jest.fn().mockImplementation(type => {
          if (type === 'canvas') {
            return createMockCanvas();
          }
          return {} as HTMLElement;
        })
      }
    } as unknown as Window;
  }
  
  /**
   * Setup global mock for window in Jest
   */
  export function setupWindowMock(): void {
    global.window = createMockWindow();
  }
  
  /**
   * Cleanup global mocks
   */
  export function cleanupWindowMock(): void {
    delete global.window;
  }
  
  // Export all Babylon.js classes and utilities
  export default {
    Vector3,
    Vector4,
    Matrix,
    Quaternion,
    Color3,
    Color4,
    Scene,
    Engine,
    Mesh,
    Camera,
    FreeCamera,
    ArcRotateCamera,
    Material,
    StandardMaterial,
    Light,
    HemisphericLight,
    PointLight,
    DirectionalLight,
    TransformNode,
    PhysicsImpostor,
    Ray,
    GlowLayer,
    ActionManager,
    VertexBuffer,
    CreatePlane,
    CreateBox,
    CreateSphere,
    CreateCylinder,
    CreateGround,
    CreateGroundFromHeightMap,
    // Test utilities
    createMockCanvas,
    createMockWindow,
    setupWindowMock,
    cleanupWindowMock
  };
  
    // Basic operations
    public add(other: Vector3): Vector3 {
      return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z);
    }
  
    public addInPlace(other: Vector3): Vector3 {
      this.x += other.x;
      this.y += other.y;
      this.z += other.z;
      return this;
    }
  
    public subtract(other: Vector3): Vector3 {
      return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z);
    }
  
    public subtractInPlace(other: Vector3): Vector3 {
      this.x -= other.x;
      this.y -= other.y;
      this.z -= other.z;
      return this;
    }
  
    public multiply(other: Vector3): Vector3 {
      return new Vector3(this.x * other.x, this.y * other.y, this.z * other.z);
    }
  
    public multiplyInPlace(other: Vector3): Vector3 {
      this.x *= other.x;
      this.y *= other.y;
      this.z *= other.z;
      return this;
    }
  
    public scale(scale: number): Vector3 {
      return new Vector3(this.x * scale, this.y * scale, this.z * scale);
    }
  
    public scaleInPlace(scale: number): Vector3 {
      this.x *= scale;
      this.y *= scale;
      this.z *= scale;
      return this;
    }
  
    public normalize(): Vector3 {
      const len = this.length();
      if (len === 0) {
        return this.clone();
      }
      return this.scale(1.0 / len);
    }
  
    public normalizeInPlace(): Vector3 {
      const len = this.length();
      if (len === 0) {
        return this;
      }
      
      this.x /= len;
      this.y /= len;
      this.z /= len;
      return this;
    }
  
    public length(): number {
      return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
  
    public lengthSquared(): number {
      return this.x * this.x + this.y * this.y + this.z * this.z;
    }
  
    public clone(): Vector3 {
      return new Vector3(this.x, this.y, this.z);
    }
  
    public copyFrom(source: Vector3): Vector3 {
      this.x = source.x;
      this.y = source.y;
      this.z = source.z;
      return this;
    }
  
    public set(x: number, y: number, z: number): Vector3 {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
  
    public equals(other: Vector3): boolean {
      return this.x === other.x && this.y === other.y && this.z === other.z;
    }
  
    public equalsWithEpsilon(other: Vector3, epsilon: number = 0.001): boolean {
      return (
        Math.abs(this.x - other.x) < epsilon &&
        Math.abs(this.y - other.y) < epsilon &&
        Math.abs(this.z - other.z) < epsilon
      );
    }
  
    public negate(): Vector3 {
      return new Vector3(-this.x, -this.y, -this.z);
    }
  
    // Static methods
    public static Zero(): Vector3 {
      return new Vector3(0, 0, 0);
    }
  
    public static One(): Vector3 {
      return new Vector3(1, 1, 1);
    }
  
    public static Up(): Vector3 {
      return new Vector3(0, 1, 0);
    }
  
    public static Down(): Vector3 {
      return new Vector3(0, -1, 0);
    }
  
    public static Forward(): Vector3 {
      return new Vector3(0, 0, 1);
    }
  
    public static Backward(): Vector3 {
      return new Vector3(0, 0, -1);
    }
  
    public static Right(): Vector3 {
      return new Vector3(1, 0, 0);
    }
  
    public static Left(): Vector3 {
      return new Vector3(-1, 0, 0);
    }
  
    public static Distance(a: Vector3, b: Vector3): number {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dz = a.z - b.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
  
    public static Dot(a: Vector3, b: Vector3): number {
      return a.x * b.x + a.y * b.y + a.z * b.z;
    }
  
    public static Cross(a: Vector3, b: Vector3): Vector3 {
      return new Vector3(
        a.y * b.z - a.z * b.y,
        a.z * b.x - a.x * b.z,
        a.x * b.y - a.y * b.x
      );
    }
  
    public static Normalize(vector: Vector3): Vector3 {
      return vector.normalize();
    }
  
    public static TransformCoordinates(vector: Vector3, transformation: Matrix): Vector3 {
      const result = Vector3.Zero();
      Vector3.TransformCoordinatesToRef(vector, transformation, result);
      return result;
    }
  
    public static TransformCoordinatesToRef(vector: Vector3, transformation: Matrix, result: Vector3): void {
      const x = vector.x;
      const y = vector.y;
      const z = vector.z;
      const m = transformation.m;
  
      const w = x * m[3] + y * m[7] + z * m[11] + m[15];
  
      result.x = (x * m[0] + y * m[4] + z * m[8] + m[12]) / w;
      result.y = (x * m[1] + y * m[5] + z * m[9] + m[13]) / w;
      result.z = (x * m[2] + y * m[6] + z * m[10] + m[14]) / w;
    }
  
    public static TransformNormal(vector: Vector3, transformation: Matrix): Vector3 {
      const result = Vector3.Zero();
      Vector3.TransformNormalToRef(vector, transformation, result);
      return result;
    }
  
    public static TransformNormalToRef(vector: Vector3, transformation: Matrix, result: Vector3): void {
      const x = vector.x;
      const y = vector.y;
      const z = vector.z;
      const m = transformation.m;
  
      result.x = x * m[0] + y * m[4] + z * m[8];
      result.y = x * m[1] + y * m[5] + z * m[9];
      result.z = x * m[2] + y * m[6] + z * m[10];
    }
  
    public static Lerp(start: Vector3, end: Vector3, amount: number): Vector3 {
      const x = start.x + ((end.x - start.x) * amount);
      const y = start.y + ((end.y - start.y) * amount);
      const z = start.z + ((end.z - start.z) * amount);
  
      return new Vector3(x, y, z);
    }
  }
  
  /**
   * Mock Color3 implementation
   */
  export class Color3 {
    public r: number;
    public g: number;
    public b: number;
  
    constructor(r = 0, g = 0, b = 0) {
      this.r = r;
      this.g = g;
      this.b = b;
    }
  
    public static Red(): Color3 {
      return new Color3(1, 0, 0);
    }
  
    public static Green(): Color3 {
      return new Color3(0, 1, 0);
    }
  
    public static Blue(): Color3 {
      return new Color3(0, 0, 1);
    }
  
    public static Black(): Color3 {
      return new Color3(0, 0, 0);
    }
  
    public static White(): Color3 {
      return new Color3(1, 1, 1);
    }
  
    public toColor4(alpha = 1): Color4 {
      return new Color4(this.r, this.g, this.b, alpha);
    }
  
    public asArray(): number[] {
      return [this.r, this.g, this.b];
    }
  
    public clone(): Color3 {
      return new Color3(this.r, this.g, this.b);
    }
  }
  
  /**
   * Mock Color4 implementation
   */
  export class Color4 {
    public r: number;
    public g: number;
    public b: number;
    public a: number;
  
    constructor(r = 0, g = 0, b = 0, a = 1) {
      this.r = r;
      this.g = g;
      this.b = b;
      this.a = a;
    }
  
    public static FromColor3(color3: Color3, alpha = 1): Color4 {
      return new Color4(color3.r, color3.g, color3.b, alpha);
    }
  
    public asArray(): number[] {
      return [this.r, this.g, this.b, this.a];
    }
  
    public clone(): Color4 {
      return new Color4(this.r, this.g, this.b, this.a);
    }
  }
  
  /**
   * Mock Matrix implementation with all required methods
   */
  export class Matrix {
    public m: number[] = new Array(16).fill(0);
  
    constructor() {
      this.identity();
    }
  
    public identity(): Matrix {
      this.m[0] = 1;
      this.m[1] = 0;
      this.m[2] = 0;
      this.m[3] = 0;
      this.m[4] = 0;
      this.m[5] = 1;
      this.m[6] = 0;
      this.m[7] = 0;
      this.m[8] = 0;
      this.m[9] = 0;
      this.m[10] = 1;
      this.m[11] = 0;
      this.m[12] = 0;
      this.m[13] = 0;
      this.m[14] = 0;
      this.m[15] = 1;
      return this;
    }
  
    public clone(): Matrix {
      const result = new Matrix();
      result.m = [...this.m];
      return result;
    }
  
    public copyFrom(source: Matrix): Matrix {
      this.m = [...source.m];
      return this;
    }
  
    public getRow(index: number): Vector4 {
      if (index < 0 || index > 3) {
        return new Vector4(0, 0, 0, 0);
      }
      const offset = index * 4;
      return new Vector4(this.m[offset], this.m[offset + 1], this.m[offset + 2], this.m[offset + 3]);
    }
  
    public setRow(index: number, row: Vector4): Matrix {
      if (index < 0 || index > 3) {
        return this;
      }
      const offset = index * 4;
      this.m[offset] = row.x;
      this.m[offset + 1] = row.y;
      this.m[offset + 2] = row.z;
      this.m[offset + 3] = row.w;
      return this;
    }
  
    public multiply(other: Matrix): Matrix {
      const result = new Matrix();
      this.multiplyToRef(other, result);
      return result;
    }
  
    public multiplyToRef(other: Matrix, result: Matrix): void {
      const m = this.m;
      const om = other.m;
      const rm = result.m;
  
      const m0 = m[0], m1 = m[1], m2 = m[2], m3 = m[3];
      const m4 = m[4], m5 = m[5], m6 = m[6], m7 = m[7];
      const m8 = m[8], m9 = m[9], m10 = m[10], m11 = m[11];
      const m12 = m[12], m13 = m[13], m14 = m[14], m15 = m[15];
  
      const om0 = om[0], om1 = om[1], om2 = om[2], om3 = om[3];
      const om4 = om[4], om5 = om[5], om6 = om[6], om7 = om[7];
      const om8 = om[8], om9 = om[9], om10 = om[10], om11 = om[11];
      const om12 = om[12], om13 = om[13], om14 = om[14], om15 = om[15];
  
      rm[0] = m0 * om0 + m1 * om4 + m2 * om8 + m3 * om12;
      rm[1] = m0 * om1 + m1 * om5 + m2 * om9 + m3 * om13;
      rm[2] = m0 * om2 + m1 * om6 + m2 * om10 + m3 * om14;
      rm[3] = m0 * om3 + m1 * om7 + m2 * om11 + m3 * om15;
  
      rm[4] = m4 * om0 + m5 * om4 + m6 * om8 + m7 * om12;
      rm[5] = m4 * om1 + m5 * om5 + m6 * om9 + m7 * om13;
      rm[6] = m4 * om2 + m5 * om6 + m6 * om10 + m7 * om14;
      rm[7] = m4 * om3 + m5 * om7 + m6 * om11 + m7 * om15;
  
      rm[8] = m8 * om0 + m9 * om4 + m10 * om8 + m11 * om12;
      rm[9] = m8 * om1 + m9 * om5 + m10 * om9 + m11 * om13;
      rm[10] = m8 * om2 + m9 * om6 + m10 * om10 + m11 * om14;
      rm[11] = m8 * om3 + m9 * om7 + m10 * om11 + m11 * om15;
  
      rm[12] = m12 * om0 + m13 * om4 + m14 * om8 + m15 * om12;
      rm[13] = m12 * om1 + m13 * om5 + m14 * om9 + m15 * om13;
      rm[14] = m12 * om2 + m13 * om6 + m14 * om10 + m15 * om14;
      rm[15] = m12 * om3 + m13 * om7 + m14 * om11 + m15 * om15;
    }
  
    public transpose(): Matrix {
      const result = new Matrix();
      this.transposeToRef(result);
      return result;
    }
  
    public transposeToRef(result: Matrix): void {
      const rm = result.m;
      const m = this.m;
  
      rm[0] = m[0];
      rm[1] = m[4];
      rm[2] = m[8];
      rm[3] = m[12];
  
      rm[4] = m[1];
      rm[5] = m[5];
      rm[6] = m[9];
      rm[7] = m[13];
  
      rm[8] = m[2];
      rm[9] = m[6];
      rm[10] = m[10];
      rm[11] = m[14];
  
      rm[12] = m[3];
      rm[13] = m[7];
      rm[14] = m[11];
      rm[15] = m[15];
    }
  
    public invert(): Matrix {
      const result = new Matrix();
      this.invertToRef(result);
      return result;
    }
  
    public invertToRef(result: Matrix): void {
      const m = this.m;
      const rm = result.m;
  
      // Calculate the determinant
      const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
      const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
      const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
      const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
  
      const b00 = a00 * a11 - a01 * a10;
      const b01 = a00 * a12 - a02 * a10;
      const b02 = a00 * a13 - a03 * a10;
      const b03 = a01 * a12 - a02 * a11;
      const b04 = a01 * a13 - a03 * a11;
      const b05 = a02 * a13 - a03 * a12;
      const b06 = a20 * a31 - a21 * a30;
      const b07 = a20 * a32 - a22 * a30;
      const b08 = a20 * a33 - a23 * a30;
      const b09 = a21 * a32 - a22 * a31;
      const b10 = a21 * a33 - a23 * a31;
      const b11 = a22 * a33 - a23 * a32;
  
      // Calculate the determinant
      let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  
      if (!det) {
        // Set identity if determinant is zero
        result.identity();
        return;
      }
  
      det = 1.0 / det;
  
      rm[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
      rm[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
      rm[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
      rm[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
      rm[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
      rm[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
      rm[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
      rm[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
      rm[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
      rm[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
      rm[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
      rm[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
      rm[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
      rm[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
      rm[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
      rm[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    }
  
    public determinant(): number {
      const m = this.m;
  
      const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
      const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
      const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
      const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
  
      const b00 = a00 * a11 - a01 * a10;
      const b01 = a00 * a12 - a02 * a10;
      const b02 = a00 * a13 - a03 * a10;
      const b03 = a01 * a12 - a02 * a11;
      const b04 = a01 * a13 - a03 * a11;
      const b05 = a02 * a13 - a03 * a12;
      const b06 = a20 * a31 - a21 * a30;
      const b07 = a20 * a32 - a22 * a30;
      const b08 = a20 * a33 - a23 * a30;
      const b09 = a21 * a32 - a22 * a31;
      const b10 = a21 * a33 - a23 * a31;
      const b11 = a22 * a33 - a23 * a32;
  
      return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    }
  
    public decompose(scale?: Vector3, rotation?: Quaternion, translation?: Vector3): boolean {
      scale = scale || new Vector3(1, 1, 1);
      rotation = rotation || new Quaternion(0, 0, 0, 1);
      translation = translation || new Vector3(0, 0, 0);
  
      const m = this.m;
      translation.x = m[12];
      translation.y = m[13];
      translation.z = m[14];
  
      // Extract scale
      const sx = Math.sqrt(m[0] * m[0] + m[1] * m[1] + m[2] * m[2]);
      const sy = Math.sqrt(m[4] * m[4] + m[5] * m[5] + m[6] * m[6]);
      const sz = Math.sqrt(m[8] * m[8] + m[9] * m[9] + m[10] * m[10]);
  
      scale.x = sx;
      scale.y = sy;
      scale.z = sz;
  
      // Calculate rotation
      // For simplicity, we're using a slightly less accurate method
      const rotMatrix = new Matrix();
      rotMatrix.m[0] = m[0] / sx;
      rotMatrix.m[1] = m[1] / sx;
      rotMatrix.m[2] = m[2] / sx;
      rotMatrix.m[4] = m[4] / sy;
      rotMatrix.m[5] = m[5] / sy;
      rotMatrix.m[6] = m[6] / sy;
      rotMatrix.m[8] = m[8] / sz;
      rotMatrix.m[9] = m[9] / sz;
      rotMatrix.m[10] = m[10] / sz;
      rotMatrix.m[15] = 1;
  
      Quaternion.FromRotationMatrixToRef(rotMatrix, rotation);
  
      return true;
    }
  
    // Static methods
    public static Identity(): Matrix {
      return new Matrix();
    }
  
    public static Zero(): Matrix {
      const result = new Matrix();
      result.m.fill(0);
      return result;
    }
  
    public static FromValues(
      m00: number, m01: number, m02: number, m03: number,
      m10: number, m11: number, m12: number, m13: number,
      m20: number, m21: number, m22: number, m23: number,
      m30: number, m31: number, m32: number, m33: number
    ): Matrix {
      const result = new Matrix();
      const m = result.m;
      m[0] = m00; m[1] = m01; m[2] = m02; m[3] = m03;
      m[4] = m10; m[5] = m11; m[6] = m12; m[7] = m13;
      m[8] = m20; m[9] = m21; m[10] = m22; m[11] = m23;
      m[12] = m30; m[13] = m31; m[14] = m32; m[15] = m33;
      return result;
    }
  
    public static FromArray(array: number[], offset: number = 0): Matrix {
      const result = new Matrix();
      Matrix.FromArrayToRef(array, offset, result);
      return result;
    }
  
    public static FromArrayToRef(array: number[], offset: number, result: Matrix): void {
      const m = result.m;
      for (let i = 0; i < 16; i++) {
        m[i] = array[i + offset];
      }
    }
  
    public static RotationX(angle: number): Matrix {
      const result = new Matrix();
      Matrix.RotationXToRef(angle, result);
      return result;
    }
  
    public static RotationXToRef(angle: number, result: Matrix): void {
      const s = Math.sin(angle);
      const c = Math.cos(angle);
      
      result.identity();
      result.m[5] = c;
      result.m[6] = s;
      result.m[9] = -s;
      result.m[10] = c;
    }
  
    public static RotationY(angle: number): Matrix {
      const result = new Matrix();
      Matrix.RotationYToRef(angle, result);
      return result;
    }
  
    public static RotationYToRef(angle: number, result: Matrix): void {
      const s = Math.sin(angle);
      const c = Math.cos(angle);
      
      result.identity();
      result.m[0] = c;
      result.m[2] = -s;
      result.m[8] = s;
      result.m[10] = c;
    }
  
    public static RotationZ(angle: number): Matrix {
      const result = new Matrix();
      Matrix.RotationZToRef(angle, result);
      return result;
    }
  
    public static RotationZToRef(angle: number, result: Matrix): void {
      const s = Math.sin(angle);
      const c = Math.cos(angle);
      
      result.identity();
      result.m[0] = c;
      result.m[1] = s;
      result.m[4] = -s;
      result.m[5] = c;
    }
  
    public static RotationAxis(axis: Vector3, angle: number): Matrix {
      const result = new Matrix();
      Matrix.RotationAxisToRef(axis, angle, result);
      return result;
    }
  
    public static RotationAxisToRef(axis: Vector3, angle: number, result: Matrix): void {
      const s = Math.sin(angle);
      const c = Math.cos(angle);
      const c1 = 1 - c;
      
      const x = axis.x;
      const y = axis.y;
      const z = axis.z;
      
      result.identity();
      
      result.m[0] = x * x * c1 + c;
      result.m[1] = x * y * c1 + z * s;
      result.m[2] = x * z * c1 - y * s;
      
      result.m[4] = y * x * c1 - z * s;
      result.m[5] = y * y * c1 + c;
      result.m[6] = y * z * c1 + x * s;
      
      result.m[8] = z * x * c1 + y * s;
      result.m[9] = z * y * c1 - x * s;
      result.m[10] = z * z * c1 + c;
    }
  
    public static Translation(x: number, y: number, z: number): Matrix {
      const result = new Matrix();
      Matrix.TranslationToRef(x, y, z, result);
      return result;
    }
  
    public static TranslationToRef(x: number, y: number, z: number, result: Matrix): void {
      result.identity();
      result.m[12] = x;
      result.m[13] = y;
      result.m[14] = z;
    }
  
    public static Scaling(x: number, y: number, z: number): Matrix {
      const result = new Matrix();
      Matrix.ScalingToRef(x, y, z, result);
      return result;
    }
  
    public static ScalingToRef(x: number, y: number, z: number, result: Matrix): void {
      result.identity();
      result.m[0] = x;
      result.m[5] = y;
      result.m[10] = z;
    }
  
    public static LookAtLH(eye: Vector3, target: Vector3, up: Vector3): Matrix {
      const result = new Matrix();
      Matrix.LookAtLHToRef(eye, target, up, result);
      return result;
    }
    
    public static LookAtLHToRef(eye: Vector3, target: Vector3, up: Vector3, result: Matrix): void {
      // Calculate zAxis, xAxis, and yAxis for the view matrix
      const zAxis = target.subtract(eye).normalize();
      const xAxis = Vector3.Cross(up, zAxis).normalize();
      const yAxis = Vector3.Cross(zAxis, xAxis).normalize();
      
      // Set up result matrix
      const m = result.m;
      
      m[0] = xAxis.x;
      m[1] = yAxis.x;
      m[2] = zAxis.x;
      m[3] = 0;
      
      m[4] = xAxis.y;
      m[5] = yAxis.y;
      m[6] = zAxis.y;
      m[7] = 0;
      
      m[8] = xAxis.z;
      m[9] = yAxis.z;
      m[10] = zAxis.z;
      m[11] = 0;
      
      m[12] = -Vector3.Dot(xAxis, eye);
      m[13] = -Vector3.Dot(yAxis, eye);
      m[14] = -Vector3.Dot(zAxis, eye);
      m[15] = 1;
    }
  }
  
  /**
   * Mock Vector4 implementation
   */
  export class Vector4 {
    public x: number;
    public y: number;
    public z: number;
    public w: number;
  
    constructor(x = 0, y = 0, z = 0, w = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
      this.w = w;
    }
  
    public add(other: Vector4): Vector4 {
      return new Vector4(
        this.x + other.x,
        this.y + other.y,
        this.z + other.z,
        this.w + other.w
      );
    }
  
    public subtract(other: Vector4): Vector4 {
      return new Vector4(
        this.x - other.x,
        this.y - other.y,
        this.z - other.z,
        this.w - other.w
      );
    }
  
    public scale(scale: number): Vector4 {
      return new Vector4(
        this.x * scale,
        this.y * scale,
        this.z * scale,
        this.w * scale
      );
    }
  
    public normalize(): Vector4 {
      const len = this.length();
      if (len === 0) {
        return this.clone();
      }
      return this.scale(1.0 / len);
    }
  
    public length(): number {
      return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    }
  
    public lengthSquared(): number {
      return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
    }
  
    public clone(): Vector4 {
      return new Vector4(this.x, this.y, this.z, this.w);
    }
  
    public copyFrom(source: Vector4): Vector4 {
      this.x = source.x;
      this.y = source.y;
      this.z = source.z;
      this.w = source.w;
      return this;
    }
  
    // Static methods
    public static Zero(): Vector4 {
      return new Vector4(0, 0, 0, 0);
    }
  
    public static One(): Vector4 {
      return new Vector4(1, 1, 1, 1);
    }
  
    public static FromArray(array: number[], offset: number = 0): Vector4 {
      return new Vector4(
        array[offset],
        array[offset + 1],
        array[offset + 2],
        array[offset + 3]
      );
    }
  }
  
  /**
   * Mock Quaternion implementation
   */
  export class Quaternion {
    public x: number;
    public y: number;
    public z: number;
    public w: number;
  
    constructor(x = 0, y = 0, z = 0, w = 1) {
      this.x = x;
      this.y = y;
      this.z = z;
      this.w = w;
    }
  
    public clone(): Quaternion {
      return new Quaternion(this.x, this.y, this.z, this.w);
    }
  
    public conjugate(): Quaternion {
      return new Quaternion(-this.x, -this.y, -this.z, this.w);
    }
  
    public normalize(): Quaternion {
      const length = Math.sqrt(
        this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w
      );
      
      if (length === 0) {
        return this.clone();
      }
      
      const inv = 1.0 / length;
      return new Quaternion(
        this.x * inv,
        this.y * inv,
        this.z * inv,
        this.w * inv
      );
    }
  
    public multiply(other: Quaternion): Quaternion {
      const result = new Quaternion();
      this.multiplyToRef(other, result);
      return result;
    }
  
    public multiplyToRef(other: Quaternion, ref: Quaternion): void {
      const x = this.x * other.w + this.y * other.z - this.z * other.y + this.w * other.x;
      const y = -this.x * other.z + this.y * other.w + this.z * other.x + this.w * other.y;
      const z = this.x * other.y - this.y * other.x + this.z * other.w + this.w * other.z;
      const w = -this.x * other.x - this.y * other.y - this.z * other.z + this.w * other.w;
      
      ref.x = x;
      ref.y = y;
      ref.z = z;
      ref.w = w;
    }
  
    public toRotationMatrix(result: Matrix): Matrix {
      const xx = this.x * this.x;
      const yy = this.y * this.y;
      const zz = this.z * this.z;
      const xy = this.x * this.y;
      const zw = this.z * this.w;
      const zx = this.z * this.x;
      const yw = this.y * this.w;
      const yz = this.y * this.z;
      const xw = this.x * this.w;
      
      const m = result.m;
      
      m[0] = 1.0 - (2.0 * (yy + zz));
      m[1] = 2.0 * (xy + zw);
      m[2] = 2.0 * (zx - yw);
      m[3] = 0;
      
      m[4] = 2.0 * (xy - zw);
      m[5] = 1.0 - (2.0 * (zz + xx));
      m[6] = 2.0 * (yz + xw);
      m[7] = 0;
      
      m[8] = 2.0 * (zx + yw);
      m[9] = 2.0 * (yz - xw);
      m[10] = 1.0 - (2.0 * (yy + xx));
      m[11] = 0;
      
      m[12] = 0;
      m[13] = 0;
      m[14] = 0;
      m[15] = 1.0;
      
      return result;
    }
  
    // Static methods
    public static Identity(): Quaternion {
      return new Quaternion(0, 0, 0, 1);
    }
  
    public static RotationAxis(axis: Vector3, angle: number): Quaternion {
      const halfAngle = angle * 0.5;
      const s = Math.sin(halfAngle);
      const c = Math.cos(halfAngle);
      
      return new Quaternion(
        axis.x * s,
        axis.y * s,
        axis.z * s,
        c
      );
    }
  
    public static FromRotationMatrix(matrix: Matrix): Quaternion {
      const result = new Quaternion();
      Quaternion.FromRotationMatrixToRef(matrix, result);
      return result;
    }
  
    public static FromRotationMatrixToRef(matrix: Matrix, result: Quaternion): void {
      const m = matrix.m;
      const trace = m[0] + m[5] + m[10];
      let s: number;
      
      if (trace > 0) {
        s = 0.5 / Math.sqrt(trace + 1.0);
        
        result.w = 0.25 / s;
        result.x = (m[6] - m[9]) * s;
        result.y = (m[8] - m[2]) * s;
        result.z = (m[1] - m[4]) * s;
      } else if ((m[0] > m[5]) && (m[0] > m[10])) {
        s = 2.0 * Math.sqrt(1.0 + m[0] - m[5] - m[10]);
        
        result.w = (m[6] - m[9]) / s;
        result.x = 0.25 * s;
        result.y = (m[1] + m[4]) / s;
        result.z = (m[8] + m[2]) / s;
      } else if (m[5] > m[10]) {
        s = 2.0 * Math.sqrt(1.0 + m[5] - m[0] - m[10]);
        
        result.w = (m[8] - m[2]) / s;
        result.x = (m[1] + m[4]) / s;
        result.y = 0.25 * s;
        result.z = (m[6] + m[9]) / s;
      } else {
        s = 2.0 * Math.sqrt(1.0 + m[10] - m[0] - m[5]);
        
        result.w = (m[1] - m[4]) / s;
        result.x = (m[8] + m[2]) / s;
        result.y = (m[6] + m[9]) / s;
        result.z = 0.25 * s;
      }
    }
  
    public static Slerp(left: Quaternion, right: Quaternion, amount: number): Quaternion {
      const result = new Quaternion();
      Quaternion.SlerpToRef(left, right, amount, result);
      return result;
    }
  
    public static SlerpToRef(left: Quaternion, right: Quaternion, amount: number, result: Quaternion): void {
      let num2: number;
      let num3: number;
      let num = left.x * right.x + left.y * right.y + left.z * right.z + left.w * right.w;
      let flag = false;
      
      if (num < 0) {
        flag = true;
        num = -num;
      }
      
      if (num > 0.999999) {
        num3 = 1 - amount;
        num2 = flag ? -amount : amount;
      } else {
        const num4 = Math.acos(num);
        const num5 = 1.0 / Math.sin(num4);
        num3 = Math.sin((1.0 - amount) * num4) * num5;
        num2 = flag ? -Math.sin(amount * num4) * num5 : Math.sin(amount * num4) * num5;
      }
      
      result.x = num3 * left.x + num2 * right.x;
      result.y = num3 * left.y + num2 * right.y;
      result.z = num3 * left.z + num2 * right.z;
      result.w = num3 * left.w + num2 * right.w;
    }
  }
  
  /**
   * Mock Scene implementation
   */
  export class Scene {
    public activeCamera: Camera | null = null;
    public meshes: Mesh[] = [];
    public lights: Light[] = [];
    public materials: Material[] = [];
    public cameras: Camera[] = [];
    public transformNodes: TransformNode[] = [];
    public actionManager: ActionManager | null = null;
    public gravity: Vector3 = new Vector3(0, -9.81, 0);
    public collisionsEnabled: boolean = false;
    
    // Observable patterns
    public onBeforeRenderObservable = {
      add: jest.fn().mockImplementation((callback) => {
        return { remove: jest.fn() };
      }),
      remove: jest.fn()
    };
    
    public onAfterRenderObservable = {
      add: jest.fn().mockImplementation((callback) => {
        return { remove: jest.fn() };
      }),
      remove: jest.fn()
    };
    
    public onReadyObservable = {
      add: jest.fn().mockImplementation((callback) => {
        return { remove: jest.fn() };
      }),
      remove: jest.fn()
    };
  
    private _engine: Engine;
  
    constructor(engine: Engine) {
      this._engine = engine;
    }
  
    public render(updateCameras?: boolean, ignoreAnimations?: boolean): boolean {
      // Mock implementation
      return true;
    }
  
    public getEngine(): Engine {
      return this._engine;
    }
  
    public getAnimationRatio(): number {
      return 1.0;
    }
  
    public beginAnimation(target: any, from: number, to: number, loop?: boolean, speedRatio?: number, onAnimationEnd?: () => void): any {
      // Mock implementation
      const animatable = {
        onAnimationEnd: onAnimationEnd ? { add: (callback: () => void) => callback() } : undefined
      };
      
      if (onAnimationEnd) {
        setTimeout(onAnimationEnd, 0);
      }
      
      return animatable;
    }
  
    public dispose(): void {
      // Cleanup all resources
      this.meshes.forEach(mesh => mesh.dispose());
      this.materials.forEach(material => material.dispose());
      this.cameras.forEach(camera => camera.dispose());
      this.lights.forEach(light => light.dispose());
      
      this.meshes = [];
      this.materials = [];
      this.cameras = [];
      this.lights = [];
      this.transformNodes = [];
      this.activeCamera = null;
    }
  
    public createDefaultCameraOrLight(): Camera {
      const camera = new FreeCamera("default camera", new Vector3(0, 0, -10), this);
      this.activeCamera = camera;
      this.cameras.push(camera);
      return camera;
    }
  
    public createDefaultLight(): Light {
      const light = new HemisphericLight("default light", new Vector3(0, 1, 0), this);
      this.lights.push(light);
      return light;
    }
  
    public addMesh(mesh: Mesh): void {
      this.meshes.push(mesh);
    }
  
    public removeMesh(mesh: Mesh): void {
      const index = this.meshes.indexOf(mesh);
      if (index !== -1) {
        this.meshes.splice(index, 1);
      }
    }
  
    public getMeshByName(name: string): Mesh | null {
      return this.meshes.find(mesh => mesh.name === name) || null;
    }
  
    public getMeshById(id: string): Mesh | null {
      return this.meshes.find(mesh => mesh.id === id) || null;
    }
  
    public getMeshByUniqueId(uniqueId: number): Mesh | null {
      return this.meshes.find(mesh => mesh.uniqueId === uniqueId) || null;
    }
  
    public addCamera(camera: Camera): void {
      this.cameras.push(camera);
    }
  
    public removeCamera(camera: Camera): void {
      const index = this.cameras.indexOf(camera);
      if (index !== -1) {
        this.cameras.splice(index, 1);
      }
    }
  
    public getCameraByName(name: string): Camera | null {
      return this.cameras.find(camera => camera.name === name) || null;
    }
  
    public addLight(light: Light): void {
      this.lights.push(light);
    }
  
    public removeLight(light: Light): void {
      const index = this.lights.indexOf(light);
      if (index !== -1) {
        this.lights.splice(index, 1);
      }
    }
  
    public getLightByName(name: string): Light | null {
      return this.lights.find(light => light.name === name) || null;
    }
  
    public getGlowLayerByName(name: string): GlowLayer | null {
      return null; // Mock implementation - can be extended as needed
    }
  
    public enablePhysics(gravity: Vector3, physicsPlugin: any): void {
      this.gravity = gravity;
      this.collisionsEnabled = true;
    }
  }
  
  /**
   * Mock Engine implementation
   */
  export class Engine {
    public renderEvenInBackground: boolean = true;
    public scenes: Scene[] = [];
    public isPointerLock: boolean = false;
    public width: number = 800;
    public height: number = 600;
    
    private _canvas: HTMLCanvasElement | null = null;
    private _renderLoop: (() => void) | null = null;
  
    constructor(canvas: HTMLCanvasElement | null = null, antialias: boolean = false) {
      this._canvas = canvas;
    }
  
    public getCaps(): any {
      return {
        maxTexturesImageUnits: 16,
        maxVertexTextureImageUnits: 16,
        maxCombinedTexturesImageUnits: 32,
        maxTextureSize: 8192,
        maxCubemapTextureSize: 8192,
        maxRenderTextureSize: 8192,
        maxVertexAttribs: 16,
        maxVaryingVectors: 16,
        maxFragmentUniformVectors: 1024,
        maxVertexUniformVectors: 1024,
        standardDerivatives: true,
        s3tc: true,
        hardwareOcclusionQuery: true,
        fragmentDepthSupported: true,
        highPrecisionShaderSupported: true,
        drawBuffersExtension: true,
        stencilBuffer: true,
        instancedArrays: true,
        textureFloat: true,
        textureAnisotropicFilterExtension: true,
        textureFloatLinearFiltering: true,
        textureFloatRender: true,
        textureHalfFloat: true,
        textureHalfFloatLinear: true,
        textureHalfFloatRender: true,
        textureLOD: true,
        multiview: false,
        timerQuery: false
      };
    }
    
    public runRenderLoop(renderFunction: () => void): void {
      this._renderLoop = renderFunction;
    }
  
    public stopRenderLoop(): void {
      this._renderLoop = null;
    }
  
    public resize(): void {
      // Mock implementation
    }
  
    public clear(color: Color4, backBuffer: boolean, depth: boolean, stencil: boolean = false): void {
      // Mock implementation
    }
  
    public beginFrame(): void {
      // Mock implementation
    }
  
    public endFrame(): void {
      // Mock implementation
    }
  
    public createEffect(baseName: any, attributesNames: string[], uniformsNames: string[], samplers: string[], defines: string, fallbacks: any = null, onCompiled: any = null, onError: any = null): any {
      return {
        isReady: () => true,
        getAttributesNames: () => attributesNames,
        getAttributeLocation: (name: string) => 0,
        getAttributeLocationByName: (name: string) => 0,
        getUniformLocations: () => ({}),
        setTexture: () => {},
        setTextureArray: () => {},
        setTextureFromPostProcess: () => {},
        setFloat: () => {},
        setFloat2: () => {},
        setFloat3: () => {},
        setFloat4: () => {},
        setVector2: () => {},
        setVector3: () => {},
        setVector4: () => {},
        setMatrix: () => {},
        setMatrix3x3: () => {},
        setMatrix2x2: () => {},
        bindUniformBlock: () => {}
      };
    }
  
    public dispose(): void {
      this.stopRenderLoop();
      this.scenes.forEach(scene => scene.dispose());
      this.scenes = [];
    }
  }
  
  /**
   * Mock Mesh implementation
   */
  export class Mesh {
    public name: string;
    public id: string;
    public uniqueId: number;
    public position: Vector3 = new Vector3(0, 0, 0);
    public rotation: Vector3 = new Vector3(0, 0, 0);
    public rotationQuaternion: Quaternion | null = null;
    public scaling: Vector3 = new Vector3(1, 1, 1);
    public parent: Mesh | null = null;
    public material: Material | null = null;
    public visibility: number = 1;
    public isVisible: boolean = true;
    public isEnabled: boolean = true;
    public animations: any[] = [];
    public isPickable: boolean = true;
    public receiveShadows: boolean = false;
    public renderingGroupId: number = 0;
    public physicsImpostor: PhysicsImpostor | null = null;
    public checkCollisions: boolean = false;
    public billboardMode: number = 0;
    public ellipsoid: Vector3 = new Vector3(0.5, 1, 0.5);
    public ellipsoidOffset: Vector3 = new Vector3(0, 0, 0);
    
    private _scene: Scene;
    private _disposed: boolean = false;
    private static _UniqueIdCounter: number = 0;
  
    constructor(name: string, scene: Scene) {
      this.name = name;
      this.id = name;
      this.uniqueId = Mesh._UniqueIdCounter++;
      this._scene = scene;
      scene.addMesh(this);
    }
  
    public getScene(): Scene {
      return this._scene;
    }
  
    public getWorldMatrix(): Matrix {
      const result = Matrix.Identity();
      
      // Apply scaling
      const scalingMatrix = Matrix.Scaling(this.scaling.x, this.scaling.y, this.scaling.z);
      
      // Apply rotation
      let rotationMatrix = Matrix.Identity();
      if (this.rotationQuaternion) {
        this.rotationQuaternion.toRotationMatrix(rotationMatrix);
      } else {
        rotationMatrix = Matrix.RotationYawPitchRoll(
          this.rotation.y,
          this.rotation.x,
          this.rotation.z
        );
      }
      
      // Apply translation
      const translationMatrix = Matrix.Translation(
        this.position.x,
        this.position.y,
        this.position.z
      );
      
      // Combine transformations
      scalingMatrix.multiplyToRef(rotationMatrix, result);
      result.multiplyToRef(translationMatrix, result);
      
      // Apply parent transformation if any
      if (this.parent) {
        const parentMatrix = this.parent.getWorldMatrix();
        result.multiplyToRef(parentMatrix, result);
      }
      
      return result;
    }
  
    public setParent(mesh: Mesh | null): Mesh {
      this.parent = mesh;
      return this;
    }
  
    public getAbsolutePosition(): Vector3 {
      const worldMatrix = this.getWorldMatrix();
      const result = new Vector3(
        worldMatrix.m[12],
        worldMatrix.m[13],
        worldMatrix.m[14]
      );
      return result;
    }
  
    public setAbsolutePosition(position: Vector3): Mesh {
      if (this.parent) {
        const invParentMatrix = this.parent.getWorldMatrix().invert();
        const worldPosition = Vector3.TransformCoordinates(position, invParentMatrix);
        this.position = worldPosition;
      } else {
        this.position = position.clone();
      }
      return this;
    }
  
    public getDirection(axis: Vector3): Vector3 {
      const result = axis.clone();
      const worldMatrix = this.getWorldMatrix();
      
      const x = axis.x;
      const y = axis.y;
      const z = axis.z;
      
      result.x = x * worldMatrix.m[0] + y * worldMatrix.m[4] + z * worldMatrix.m[8];
      result.y = x * worldMatrix.m[1] + y * worldMatrix.m[5] + z * worldMatrix.m[9];
      result.z = x * worldMatrix.m[2] + y * worldMatrix.m[6] + z * worldMatrix.m[10];
      
      return result.normalize();
    }
  
    public lookAt(targetPoint: Vector3, yawCor: number = 0, pitchCor: number = 0, rollCor: number = 0): Mesh {
      const dv = targetPoint.subtract(this.position);
      const yaw = -Math.atan2(dv.z, dv.x) - Math.PI / 2;
      const len = Math.sqrt(dv.x * dv.x + dv.z * dv.z);
      const pitch = Math.atan2(dv.y, len);
      
      this.rotation = new Vector3(pitch + pitchCor, yaw + yawCor, rollCor);
      
      return this;
    }
  
    public dispose(doNotRecurse?: boolean, disposeMaterialAndTextures?: boolean): void {
      if (this._disposed) {
        return;
      }
      
      this._disposed = true;
      
      if (this.physicsImpostor) {
        this.physicsImpostor.dispose();
        this.physicsImpostor = null;
      }
      
      if (disposeMaterialAndTextures && this.material) {
        this.material.dispose();
        this.material = null;
      }
      
      this._scene.removeMesh(this);
    }
  
    public clone(name: string, newParent?: Mesh): Mesh {
      const clonedMesh = new Mesh(name, this._scene);
      
      clonedMesh.position = this.position.clone();
      clonedMesh.rotation = this.rotation.clone();
      if (this.rotationQuaternion) {
        clonedMesh.rotationQuaternion = this.rotationQuaternion.clone();
      }
      clonedMesh.scaling = this.scaling.clone();
      clonedMesh.material = this.material;
      clonedMesh.visibility = this.visibility;
      clonedMesh.isVisible = this.isVisible;
      clonedMesh.isEnabled = this.isEnabled;
      clonedMesh.isPickable = this.isPickable;
      clonedMesh.receiveShadows = this.receiveShadows;
      clonedMesh.renderingGroupId = this.renderingGroupId;
      clonedMesh.checkCollisions = this.checkCollisions;
      clonedMesh.billboardMode = this.billboardMode;
      clonedMesh.ellipsoid = this.ellipsoid.clone();
      clonedMesh.ellipsoidOffset = this.ellipsoidOffset.clone();
      
      if (newParent) {
        clonedMesh.setParent(newParent);
      } else if (this.parent) {
        clonedMesh.setParent(this.parent);
      }
      
      return clonedMesh;
    }
  
    // Static methods
    public static CreateBox(name: string, options: any, scene: Scene): Mesh {
      return new Mesh(name, scene);
    }
  
    public static CreateSphere(name: string, options: any, scene: Scene): Mesh {
      return new Mesh(name, scene);
    }
  
    public static CreateCylinder(name: string, options: any, scene: Scene): Mesh {
      return new Mesh(name, scene);
    }
  
    public static CreatePlane(name: string, options: any, scene: Scene): Mesh {
      return new Mesh(name, scene);
    }
  
    public static CreateGround(name: string, options: any, scene: Scene): Mesh {
      return new Mesh(name, scene);
    }
  
  
  }