/**
 * @file tests/mocks/babylon-standard.ts
 * @description Standardized mock implementations of Babylon.js classes for testing
 */

// Mock implementations for Babylon.js objects to be used across test files

export class Vector3 {
  constructor(public x: number = 0, public y: number = 0, public z: number = 0) {}

  add(other: Vector3): Vector3 {
    return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z);
  }

  subtract(other: Vector3): Vector3 {
    return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  scale(scalar: number): Vector3 {
    return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  normalize(): Vector3 {
    const len = this.length();
    if (len === 0) {
      return new Vector3(0, 0, 0);
    }
    return this.scale(1 / len);
  }

  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  copyFrom(other: Vector3): Vector3 {
    this.x = other.x;
    this.y = other.y;
    this.z = other.z;
    return this;
  }

  set(x: number, y: number, z: number): Vector3 {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  addInPlace(other: Vector3): Vector3 {
    this.x += other.x;
    this.y += other.y;
    this.z += other.z;
    return this;
  }

  scaleInPlace(scalar: number): Vector3 {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
    return this;
  }

  equals(other: Vector3): boolean {
    return this.x === other.x && this.y === other.y && this.z === other.z;
  }

  equalsWithEpsilon(other: Vector3, epsilon: number = 0.001): boolean {
    return (
      Math.abs(this.x - other.x) < epsilon &&
      Math.abs(this.y - other.y) < epsilon &&
      Math.abs(this.z - other.z) < epsilon
    );
  }

  cross(other: Vector3): Vector3 {
    return new Vector3(
      this.y * other.z - this.z * other.y,
      this.z * other.x - this.x * other.z,
      this.x * other.y - this.y * other.x
    );
  }

  toString(): string {
    return `(${this.x}, ${this.y}, ${this.z})`;
  }

  static Zero(): Vector3 {
    return new Vector3(0, 0, 0);
  }

  static One(): Vector3 {
    return new Vector3(1, 1, 1);
  }

  static Up(): Vector3 {
    return new Vector3(0, 1, 0);
  }

  static Down(): Vector3 {
    return new Vector3(0, -1, 0);
  }

  static Forward(): Vector3 {
    return new Vector3(0, 0, 1);
  }

  static Backward(): Vector3 {
    return new Vector3(0, 0, -1);
  }

  static Right(): Vector3 {
    return new Vector3(1, 0, 0);
  }

  static Left(): Vector3 {
    return new Vector3(-1, 0, 0);
  }
  
  /**
   * Transforms coordinates with the given matrix
   * @param vector Vector to transform
   * @param matrix Transformation matrix
   * @returns Transformed vector
   */
  static TransformCoordinates(vector: Vector3, matrix: Matrix): Vector3 {
    // Basic implementation to transform a vector by a matrix
    const x = vector.x * matrix.m[0] + vector.y * matrix.m[4] + vector.z * matrix.m[8] + matrix.m[12];
    const y = vector.x * matrix.m[1] + vector.y * matrix.m[5] + vector.z * matrix.m[9] + matrix.m[13];
    const z = vector.x * matrix.m[2] + vector.y * matrix.m[6] + vector.z * matrix.m[10] + matrix.m[14];
    const w = vector.x * matrix.m[3] + vector.y * matrix.m[7] + vector.z * matrix.m[11] + matrix.m[15];
    
    // Perspective divide
    if (w !== 0) {
      return new Vector3(x / w, y / w, z / w);
    }
    
    return new Vector3(x, y, z);
  }
  
  /**
   * Transforms normal vectors with the given matrix
   * @param vector Vector to transform
   * @param matrix Transformation matrix
   * @returns Transformed vector
   */
  static TransformNormal(vector: Vector3, matrix: Matrix): Vector3 {
    // For normals, we don't apply translation
    const x = vector.x * matrix.m[0] + vector.y * matrix.m[4] + vector.z * matrix.m[8];
    const y = vector.x * matrix.m[1] + vector.y * matrix.m[5] + vector.z * matrix.m[9];
    const z = vector.x * matrix.m[2] + vector.y * matrix.m[6] + vector.z * matrix.m[10];
    
    return new Vector3(x, y, z);
  }
}

export class Quaternion {
  constructor(public x: number = 0, public y: number = 0, public z: number = 0, public w: number = 1) {}

  clone(): Quaternion {
    return new Quaternion(this.x, this.y, this.z, this.w);
  }

  toEulerAngles(): Vector3 {
    return new Vector3(0, 0, 0); // Mock implementation
  }

  static FromEulerAngles(x: number, y: number, z: number): Quaternion {
    return new Quaternion(0, 0, 0, 1); // Mock implementation
  }

  static RotationAxis(axis: Vector3, angle: number): Quaternion {
    return new Quaternion(0, 0, 0, 1); // Mock implementation
  }
}

export class Matrix {
  private _m: number[] = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];

  get m(): number[] {
    return this._m;
  }

  set m(value: number[]) {
    this._m = value;
  }

  static Identity(): Matrix {
    return new Matrix();
  }

  static Zero(): Matrix {
    const result = new Matrix();
    result.m = [
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0
    ];
    return result;
  }

  clone(): Matrix {
    const result = new Matrix();
    result.m = [...this.m];
    return result;
  }

  multiply(other: Matrix): Matrix {
    // Simple mock implementation
    return this.clone();
  }

  static TranslationToRef(x: number, y: number, z: number, result: Matrix): void {
    result.m[12] = x;
    result.m[13] = y;
    result.m[14] = z;
  }

  static RotationYawPitchRollToRef(yaw: number, pitch: number, roll: number, result: Matrix): void {
    // Simplified mock - just set to identity
    result.m = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
  }

  static ScalingToRef(x: number, y: number, z: number, result: Matrix): void {
    result.m[0] = x;
    result.m[5] = y;
    result.m[10] = z;
  }

  invert(): Matrix {
    return this.clone();
  }

  getTranslation(): Vector3 {
    return new Vector3(this.m[12], this.m[13], this.m[14]);
  }

  getRotation(): Vector3 {
    return new Vector3(0, 0, 0); // Mock implementation
  }

  transformCoordinates(vector: Vector3): Vector3 {
    return vector.clone(); // Simplified implementation
  }
}

export class Color3 {
  constructor(public r: number = 0, public g: number = 0, public b: number = 0) {}

  clone(): Color3 {
    return new Color3(this.r, this.g, this.b);
  }

  static Red(): Color3 {
    return new Color3(1, 0, 0);
  }

  static Green(): Color3 {
    return new Color3(0, 1, 0);
  }

  static Blue(): Color3 {
    return new Color3(0, 0, 1);
  }

  static Black(): Color3 {
    return new Color3(0, 0, 0);
  }

  static White(): Color3 {
    return new Color3(1, 1, 1);
  }
}

export class Color4 {
  constructor(public r: number = 0, public g: number = 0, public b: number = 0, public a: number = 1) {}

  clone(): Color4 {
    return new Color4(this.r, this.g, this.b, this.a);
  }
}

export class Observable<T> {
  private observers: Array<(eventData: T, eventState: any) => void> = [];

  add(callback: (eventData: T, eventState: any) => void): number {
    this.observers.push(callback);
    return this.observers.length - 1;
  }

  remove(observer: number): boolean {
    if (observer >= 0 && observer < this.observers.length) {
      this.observers.splice(observer, 1);
      return true;
    }
    return false;
  }

  notifyObservers(eventData: T, eventState?: any): boolean {
    for (const observer of this.observers) {
      observer(eventData, eventState);
    }
    return true;
  }

  clear(): void {
    this.observers = [];
  }
}

export class MeshBuilder {
  static CreateBox(name: string, options: any, scene?: Scene): Mesh {
    return new Mesh(name, scene);
  }

  static CreateSphere(name: string, options: any, scene?: Scene): Mesh {
    return new Mesh(name, scene);
  }

  static CreateCylinder(name: string, options: any, scene?: Scene): Mesh {
    return new Mesh(name, scene);
  }

  static CreateGround(name: string, options: any, scene?: Scene): Mesh {
    return new Mesh(name, scene);
  }

  static CreatePlane(name: string, options: any, scene?: Scene): Mesh {
    return new Mesh(name, scene);
  }
}

export class Material {
  public name: string;
  public alpha: number = 1.0;
  public backFaceCulling: boolean = true;
  public wireframe: boolean = false;

  constructor(name: string, scene?: Scene) {
    this.name = name;
  }

  clone(name: string): Material {
    const result = new Material(name);
    result.alpha = this.alpha;
    result.backFaceCulling = this.backFaceCulling;
    result.wireframe = this.wireframe;
    return result;
  }

  dispose(): void {}
}

export class StandardMaterial extends Material {
  public diffuseColor: Color3 = new Color3(1, 1, 1);
  public specularColor: Color3 = new Color3(1, 1, 1);
  public emissiveColor: Color3 = new Color3(0, 0, 0);
  public ambientColor: Color3 = new Color3(0, 0, 0);
  public specularPower: number = 64;

  constructor(name: string, scene?: Scene) {
    super(name, scene);
  }

  clone(name: string): StandardMaterial {
    const result = new StandardMaterial(name);
    result.diffuseColor = this.diffuseColor.clone();
    result.specularColor = this.specularColor.clone();
    result.emissiveColor = this.emissiveColor.clone();
    result.ambientColor = this.ambientColor.clone();
    result.specularPower = this.specularPower;
    result.alpha = this.alpha;
    result.backFaceCulling = this.backFaceCulling;
    result.wireframe = this.wireframe;
    return result;
  }
}

export class PhysicsImpostor {
  static BoxImpostor = 1;
  static SphereImpostor = 2;
  static CylinderImpostor = 3;
  static PlaneImpostor = 4;
  static MeshImpostor = 5;
  static NoImpostor = 0;

  public mass: number;
  public friction: number;
  public restitution: number;
  public type: number;
  public object: any;

  constructor(object: any, type: number, options: any, scene?: Scene) {
    this.object = object;
    this.type = type;
    this.mass = options.mass || 0;
    this.friction = options.friction || 0.2;
    this.restitution = options.restitution || 0.2;
  }

  dispose(): void {}

  setLinearVelocity(velocity: Vector3): void {}

  getLinearVelocity(): Vector3 {
    return new Vector3(0, 0, 0);
  }

  setAngularVelocity(velocity: Vector3): void {}

  getAngularVelocity(): Vector3 {
    return new Vector3(0, 0, 0);
  }

  setMass(mass: number): void {
    this.mass = mass;
  }

  applyImpulse(force: Vector3, contactPoint: Vector3): void {}

  applyForce(force: Vector3, contactPoint: Vector3): void {}

  registerOnPhysicsCollide(collider: any, callback: (collider: any, point: any) => void): void {}

  unregisterOnPhysicsCollide(collider: any, callback: (collider: any, point: any) => void): void {}
}

export class Mesh {
  public name: string;
  public position: Vector3 = new Vector3(0, 0, 0);
  public rotation: Vector3 = new Vector3(0, 0, 0);
  public scaling: Vector3 = new Vector3(1, 1, 1);
  public isVisible: boolean = true;
  public material: Material | null = null;
  public physicsImpostor: PhysicsImpostor | null = null;
  public parent: Mesh | null = null;
  public isEnabled: boolean = true;
  public checkCollisions: boolean = false;
  private _scene: Scene | undefined;

  constructor(name: string, scene?: Scene) {
    this.name = name;
    this._scene = scene;
  }

  getScene(): Scene {
    return this._scene || new Scene();
  }

  getWorldMatrix(): Matrix {
    return Matrix.Identity();
  }

  getAbsolutePosition(): Vector3 {
    return this.position.clone();
  }

  clone(name: string, newParent?: Mesh): Mesh {
    const result = new Mesh(name, this._scene);
    result.position = this.position.clone();
    result.rotation = this.rotation.clone();
    result.scaling = this.scaling.clone();
    result.isVisible = this.isVisible;
    result.checkCollisions = this.checkCollisions;
    result.isEnabled = this.isEnabled;
    result.parent = newParent || this.parent;
    return result;
  }

  dispose(): void {}

  computeWorldMatrix(force?: boolean): Matrix {
    return Matrix.Identity();
  }

  getBoundingInfo(): any {
    return {
      boundingBox: {
        minimumWorld: new Vector3(-1, -1, -1),
        maximumWorld: new Vector3(1, 1, 1),
        center: new Vector3(0, 0, 0)
      }
    };
  }

  setEnabled(value: boolean): void {
    this.isEnabled = value;
  }
}

export class Sound {
  public name: string;
  public loop: boolean = false;
  public volume: number = 1.0;
  public isPlaying: boolean = false;
  private _scene: Scene | undefined;

  constructor(name: string, url: string, scene?: Scene, readyCallback?: () => void, options?: any) {
    this.name = name;
    this._scene = scene;
    if (readyCallback) {
      setTimeout(readyCallback, 0);
    }
    
    if (options) {
      this.loop = options.loop || false;
      this.volume = options.volume || 1.0;
    }
  }

  play(): Sound {
    this.isPlaying = true;
    return this;
  }

  stop(): Sound {
    this.isPlaying = false;
    return this;
  }

  pause(): Sound {
    this.isPlaying = false;
    return this;
  }

  dispose(): void {
    this.stop();
  }

  setVolume(volume: number): Sound {
    this.volume = volume;
    return this;
  }

  setPlaybackRate(rate: number): Sound {
    return this;
  }

  attachToMesh(mesh: Mesh): Sound {
    return this;
  }
}

export class Engine {
  public static Instances: Engine[] = [];
  private _fps: number = 60;
  public scenes: Scene[] = [];

  constructor(canvas?: HTMLCanvasElement, antialias?: boolean, options?: any) {
    Engine.Instances.push(this);
  }

  runRenderLoop(callback: () => void): void {}

  resize(): void {}

  getFps(): number {
    return this._fps;
  }

  setHardwareScalingLevel(level: number): void {}

  dispose(): void {
    const index = Engine.Instances.indexOf(this);
    if (index !== -1) {
      Engine.Instances.splice(index, 1);
    }
  }

  displayLoadingUI(): void {}

  hideLoadingUI(): void {}
}

export class Scene {
  public activeCamera: Camera | null = null;
  public meshes: Mesh[] = [];
  public materials: Material[] = [];
  public actionManager: ActionManager | null = null;
  public gravity: Vector3 = new Vector3(0, -9.81, 0);
  public collisionsEnabled: boolean = true;
  public audioEnabled: boolean = true;
  public name: string = "default-scene";
  private _engine: Engine | null = null;

  public onBeforeRenderObservable: Observable<Scene> = new Observable<Scene>();
  public onAfterRenderObservable: Observable<Scene> = new Observable<Scene>();
  public onPointerObservable: Observable<any> = new Observable<any>();
  public onKeyboardObservable: Observable<any> = new Observable<any>();

  constructor(engine?: Engine) {
    this._engine = engine || null;
    if (engine) {
      engine.scenes.push(this);
    }
  }

  getEngine(): Engine {
    return this._engine || new Engine();
  }

  render(): void {}

  dispose(): void {
    this.meshes.forEach(mesh => mesh.dispose());
    this.materials.forEach(material => material.dispose());
    this.onBeforeRenderObservable.clear();
    this.onAfterRenderObservable.clear();
    this.onPointerObservable.clear();
    this.onKeyboardObservable.clear();
  }

  createDefaultCamera(createArcRotateCamera?: boolean): Camera {
    const camera = createArcRotateCamera ? 
      new ArcRotateCamera("default-camera", 0, 0, 10, Vector3.Zero(), this) :
      new FreeCamera("default-camera", new Vector3(0, 0, -10), this);
    
    this.activeCamera = camera;
    return camera;
  }

  createDefaultLight(): any {
    return {};
  }

  getMeshByName(name: string): Mesh | null {
    for (const mesh of this.meshes) {
      if (mesh.name === name) {
        return mesh;
      }
    }
    return null;
  }

  getMeshById(id: string): Mesh | null {
    return this.getMeshByName(id);
  }

  getMaterialByName(name: string): Material | null {
    for (const material of this.materials) {
      if (material.name === name) {
        return material;
      }
    }
    return null;
  }

  enablePhysics(gravity?: Vector3, physicsPlugin?: any): boolean {
    this.gravity = gravity || new Vector3(0, -9.81, 0);
    return true;
  }
}

export abstract class Camera {
  public name: string;
  public position: Vector3;
  public rotation: Vector3 = new Vector3(0, 0, 0);
  public fov: number = 0.8;
  public minZ: number = 0.1;
  public maxZ: number = 1000;
  public speed: number = 1;
  protected _scene: Scene;

  constructor(name: string, position: Vector3, scene: Scene) {
    this.name = name;
    this.position = position;
    this._scene = scene;
  }

  attachControl(element: HTMLElement, noPreventDefault?: boolean): void {}

  detachControl(element: HTMLElement): void {}

  getScene(): Scene {
    return this._scene;
  }

  getViewMatrix(): Matrix {
    return Matrix.Identity();
  }

  getProjectionMatrix(): Matrix {
    return Matrix.Identity();
  }

  dispose(): void {}
}

export class FreeCamera extends Camera {
  constructor(name: string, position: Vector3, scene: Scene) {
    super(name, position, scene);
  }

  setTarget(target: Vector3): void {}
}

export class UniversalCamera extends FreeCamera {
  constructor(name: string, position: Vector3, scene: Scene) {
    super(name, position, scene);
  }
}

export class ArcRotateCamera extends Camera {
  public alpha: number;
  public beta: number;
  public radius: number;
  public target: Vector3;

  constructor(name: string, alpha: number, beta: number, radius: number, target: Vector3, scene: Scene) {
    super(name, new Vector3(0, 0, 0), scene);
    this.alpha = alpha;
    this.beta = beta;
    this.radius = radius;
    this.target = target.clone();
    this.position = this.getPosition();
  }

  getPosition(): Vector3 {
    // Simplified version for testing
    return new Vector3(
      this.target.x + this.radius * Math.cos(this.alpha) * Math.cos(this.beta),
      this.target.y + this.radius * Math.sin(this.beta),
      this.target.z + this.radius * Math.sin(this.alpha) * Math.cos(this.beta)
    );
  }

  setTarget(target: Vector3): void {
    this.target = target.clone();
  }
}

export class ActionManager {
  public static NothingTrigger = 0;
  public static OnPickTrigger = 1;
  public static OnLeftPickTrigger = 2;
  public static OnRightPickTrigger = 3;
  public static OnCenterPickTrigger = 4;
  public static OnPointerOverTrigger = 5;
  public static OnPointerOutTrigger = 6;
  public static OnEveryFrameTrigger = 7;
  public static OnIntersectionEnterTrigger = 8;
  public static OnIntersectionExitTrigger = 9;
  public static OnKeyDownTrigger = 10;
  public static OnKeyUpTrigger = 11;
  
  public actions: Action[] = [];
  
  constructor(scene?: Scene) {}
  
  registerAction(action: Action): Action {
    this.actions.push(action);
    return action;
  }
  
  processTrigger(trigger: number, evt?: any): void {
    this.actions.forEach(action => {
      if (action.trigger === trigger) {
        action.execute(evt);
      }
    });
  }
  
  dispose(): void {
    this.actions = [];
  }
}

export class Action {
  public trigger: number;
  private _condition: (() => boolean) | null = null;
  private _action: ((evt: any) => void) | null = null;
  
  constructor(trigger: number, condition?: () => boolean) {
    this.trigger = trigger;
    this._condition = condition || null;
  }
  
  execute(evt?: any): void {
    if (!this._condition || this._condition()) {
      if (this._action) {
        this._action(evt);
      }
    }
  }
  
  then(action: (evt: any) => void): Action {
    this._action = action;
    return this;
  }
}

export class ExecuteCodeAction extends Action {
  constructor(trigger: number, action: (evt: any) => void, condition?: () => boolean) {
    super(trigger, condition);
    this.then(action);
  }
}

export class SceneLoader {
  static ImportMesh(
    meshNames: string | string[],
    rootUrl: string,
    sceneFilename: string,
    scene: Scene,
    onSuccess?: (meshes: Mesh[], particleSystems: any[], skeletons: any[]) => void,
    onProgress?: () => void,
    onError?: (scene: Scene, message: string, exception?: any) => void
  ): void {
    const meshes: Mesh[] = [];
    const particleSystems: any[] = [];
    const skeletons: any[] = [];
    
    if (typeof meshNames === 'string') {
      meshNames = [meshNames];
    }
    
    // Create a mock mesh for each requested mesh name
    for (const meshName of meshNames) {
      if (meshName !== "") {
        const mesh = new Mesh(meshName, scene);
        meshes.push(mesh);
        scene.meshes.push(mesh);
      }
    }
    
    // Call the success callback if provided
    if (onSuccess) {
      setTimeout(() => onSuccess(meshes, particleSystems, skeletons), 0);
    }
  }
  
  static ImportMeshAsync(
    meshNames: string | string[],
    rootUrl: string,
    sceneFilename: string,
    scene: Scene,
    onProgress?: () => void
  ): Promise<{ meshes: Mesh[], particleSystems: any[], skeletons: any[], animationGroups: any[] }> {
    return new Promise((resolve) => {
      SceneLoader.ImportMesh(
        meshNames,
        rootUrl,
        sceneFilename,
        scene,
        (meshes, particleSystems, skeletons) => {
          resolve({
            meshes,
            particleSystems,
            skeletons,
            animationGroups: []
          });
        }
      );
    });
  }
  
  static Load(
    rootUrl: string,
    sceneFilename: string,
    engine: Engine,
    onSuccess?: (scene: Scene) => void,
    onProgress?: () => void,
    onError?: (scene: Scene, message: string, exception?: any) => void
  ): void {
    const scene = new Scene(engine);
    
    if (onSuccess) {
      setTimeout(() => onSuccess(scene), 0);
    }
  }
  
  static LoadAsync(
    rootUrl: string,
    sceneFilename: string,
    engine: Engine,
    onProgress?: () => void
  ): Promise<Scene> {
    return new Promise((resolve) => {
      SceneLoader.Load(
        rootUrl,
        sceneFilename,
        engine,
        (scene) => {
          resolve(scene);
        }
      );
    });
  }
}

// Export all classes as a default object to mimic the BABYLON namespace
export default {
  Vector3,
  Quaternion,
  Matrix,
  Color3,
  Color4,
  Observable,
  MeshBuilder,
  Material,
  StandardMaterial,
  PhysicsImpostor,
  Mesh,
  Sound,
  Engine,
  Scene,
  Camera,
  FreeCamera,
  UniversalCamera,
  ArcRotateCamera,
  ActionManager,
  Action,
  ExecuteCodeAction,
  SceneLoader
}; 