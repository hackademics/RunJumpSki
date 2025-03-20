/**
 * @file tests/mocks/babylonjs.ts
 * @description Mock implementation of Babylon.js for testing
 */

// Add the serialize/deserialize utility functions needed by GUI
export function serialize() { return {}; }
export function deserialize() { return {}; }

// Create mock implementation with Jest functions
export class Vector3 {
  public x: number;
  public y: number;
  public z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  public static Zero(): Vector3 {
    return new Vector3(0, 0, 0);
  }

  public static One(): Vector3 {
    return new Vector3(1, 1, 1);
  }

  public static Up(): Vector3 {
    return new Vector3(0, 1, 0);
  }

  public static Forward(): Vector3 {
    return new Vector3(0, 0, 1);
  }

  public static Right(): Vector3 {
    return new Vector3(1, 0, 0);
  }

  public static FromArray(array: number[], offset = 0): Vector3 {
    return new Vector3(
      array[offset],
      array[offset + 1],
      array[offset + 2]
    );
  }

  public add(otherVector: Vector3): Vector3 {
    return new Vector3(
      this.x + otherVector.x,
      this.y + otherVector.y,
      this.z + otherVector.z
    );
  }

  public addInPlace(otherVector: Vector3): Vector3 {
    this.x += otherVector.x;
    this.y += otherVector.y;
    this.z += otherVector.z;
    return this;
  }

  public subtract(otherVector: Vector3): Vector3 {
    return new Vector3(
      this.x - otherVector.x,
      this.y - otherVector.y,
      this.z - otherVector.z
    );
  }

  public scale(scale: number): Vector3 {
    return new Vector3(
      this.x * scale,
      this.y * scale,
      this.z * scale
    );
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
      return new Vector3();
    }
    return new Vector3(
      this.x / len,
      this.y / len,
      this.z / len
    );
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

  public equals(otherVector: Vector3): boolean {
    return this.x === otherVector.x && 
           this.y === otherVector.y && 
           this.z === otherVector.z;
  }

  public equalsWithEpsilon(otherVector: Vector3, epsilon: number = 0.0001): boolean {
    return Math.abs(this.x - otherVector.x) <= epsilon && 
           Math.abs(this.y - otherVector.y) <= epsilon && 
           Math.abs(this.z - otherVector.z) <= epsilon;
  }

  public length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  public lengthSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  public set(x: number, y: number, z: number): Vector3 {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  public toString(): string {
    return `{X: ${this.x} Y: ${this.y} Z: ${this.z}}`;
  }

  public cross(otherVector: Vector3): Vector3 {
    return new Vector3(
      this.y * otherVector.z - this.z * otherVector.y,
      this.z * otherVector.x - this.x * otherVector.z,
      this.x * otherVector.y - this.y * otherVector.x
    );
  }

  public static Distance(v1: Vector3, v2: Vector3): number {
    const dx = v1.x - v2.x;
    const dy = v1.y - v2.y;
    const dz = v1.z - v2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  public static Dot(v1: Vector3, v2: Vector3): number {
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  }

  public static TransformNormal(vector: Vector3, matrix: Matrix): Vector3 {
    // Improved implementation for transforming normal vectors by a matrix
    // For a real implementation, we would apply rotation and scaling but not translation
    
    // Create a result vector
    const result = new Vector3();
    
    // Extract rotation/scaling part from the matrix (top-left 3x3 submatrix)
    // and apply it to the vector
    
    // For X component: m[0]*x + m[1]*y + m[2]*z
    result.x = matrix.m[0] * vector.x + matrix.m[1] * vector.y + matrix.m[2] * vector.z;
    
    // For Y component: m[4]*x + m[5]*y + m[6]*z
    result.y = matrix.m[4] * vector.x + matrix.m[5] * vector.y + matrix.m[6] * vector.z;
    
    // For Z component: m[8]*x + m[9]*y + m[10]*z
    result.z = matrix.m[8] * vector.x + matrix.m[9] * vector.y + matrix.m[10] * vector.z;
    
    return result;
  }
}

export class Vector2 {
  x: number;
  y: number;

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  static Zero() {
    return new Vector2(0, 0);
  }

  static One() {
    return new Vector2(1, 1);
  }
}

export class Color3 {
  r: number;
  g: number;
  b: number;

  constructor(r = 0, g = 0, b = 0) {
    this.r = r;
    this.g = g;
    this.b = b;
  }

  clone() {
    return new Color3(this.r, this.g, this.b);
  }
  
  scale(scale: number) {
    return new Color3(this.r * scale, this.g * scale, this.b * scale);
  }

  static Red() {
    return new Color3(1, 0, 0);
  }

  static Green() {
    return new Color3(0, 1, 0);
  }

  static Blue() {
    return new Color3(0, 0, 1);
  }

  static Black() {
    return new Color3(0, 0, 0);
  }

  static White() {
    return new Color3(1, 1, 1);
  }
}

export class Scene {
  meshes: any[] = [];
  lights: any[] = [];
  cameras: any[] = [];
  activeCamera: any = null;
  onBeforeRenderObservable = {
    add: jest.fn().mockReturnValue(1),
    remove: jest.fn(),
    clear: jest.fn()
  };
  onActiveCameraChanged = {
    add: jest.fn().mockReturnValue(1),
    remove: jest.fn()
  };
  onAfterRenderObservable = {
    add: jest.fn().mockReturnValue(1),
    remove: jest.fn()
  };
  render = jest.fn();
  dispose = jest.fn();
  stopAllAnimations = jest.fn();
  beginAnimation = jest.fn();
  createDefaultCamera = jest.fn();
  getEngine = jest.fn().mockReturnValue({
    getRenderWidth: jest.fn().mockReturnValue(800),
    getRenderHeight: jest.fn().mockReturnValue(600),
    getFps: jest.fn().mockReturnValue(60),
    getRenderingCanvas: jest.fn().mockReturnValue(document.createElement('canvas'))
  });
  getPhysicsEngine = jest.fn().mockReturnValue({
    setTimeStep: jest.fn(),
    dispose: jest.fn()
  });
  audioEnabled = true;
  
  constructor(engine: any = null) {
    if (engine) {
      this.getEngine = jest.fn().mockReturnValue(engine);
    }
  }
  
  getGlowLayerByName = jest.fn();
}

export class NullEngine {
  renderEvenInBackground = true;
  runRenderLoop = jest.fn();
  stopRenderLoop = jest.fn();
  dispose = jest.fn();
  resize = jest.fn();
  getRenderWidth = jest.fn().mockReturnValue(800);
  getRenderHeight = jest.fn().mockReturnValue(600);
}

export class Engine extends NullEngine {
  // All functionality inherited from NullEngine
}

export class Camera {
  position = new Vector3();
  rotation = new Vector3();
  fov = 0.8;
  minZ = 0.1;
  maxZ = 1000;
  private _isDisposed = false;
  
  constructor(name = '', position = new Vector3(), scene = null) {
    this.position = position || new Vector3();
  }
  
  attachControl = jest.fn().mockImplementation(function(element, noPreventDefault) {
    return this;
  });
  
  detachControl = jest.fn().mockImplementation(function(element) {
    return this;
  });
  
  getDirection = jest.fn().mockImplementation(function(target) {
    if (target) {
      target.copyFrom(new Vector3(0, 0, 1));
    }
    return new Vector3(0, 0, 1);
  });
  
  dispose = jest.fn().mockImplementation(function() {
    this._isDisposed = true;
  });
  
  isDisposed = jest.fn().mockImplementation(function() {
    return this._isDisposed;
  });
}

export class FreeCamera extends Camera {
  inputs = {
    attachInput: jest.fn()
  };
  
  setTarget = jest.fn().mockImplementation(function(target) {
    return this;
  });
  
  getTarget = jest.fn().mockReturnValue(new Vector3(0, 0, 0));
  
  getScene = jest.fn().mockImplementation(function() {
    return {
      getEngine: () => ({
        getRenderingCanvas: () => document.createElement('canvas'),
        getAspectRatio: () => 1.77
      })
    };
  });
}

export class UniversalCamera extends FreeCamera {
  aspectRatio = 1.77;
}

export class ArcRotateCamera extends Camera {
  radius = 10;
  alpha = 0;
  beta = 0;
}

export class FollowCamera extends Camera {
  radius = 10;
  heightOffset = 5;
  rotationOffset = 0;
}

export class StandardMaterial {
  diffuseTexture: any = null;
  alpha = 1.0;
  emissiveColor = new Color3();
  backFaceCulling = true;
  dispose = jest.fn();
}

export class ShaderMaterial {
  setVector3 = jest.fn();
  setTexture = jest.fn();
  setFloat = jest.fn();
  dispose = jest.fn();
}

export class PBRMaterial extends StandardMaterial {}

export class RenderTargetTexture {
  renderList: any[] = [];
  dispose = jest.fn();
  constructor(name?: string, size?: any, scene?: Scene, options?: any) {
    this.renderList = [];
  }
}

export class Texture {
  constructor(public url: string, scene?: Scene, noMipmap?: boolean, invertY?: boolean, samplingMode?: number) {}
  dispose = jest.fn();
}

export class Sound {
  constructor(name: string, url: string, scene: Scene, readyCallback?: () => void, options?: any) {}
  play = jest.fn();
  stop = jest.fn();
  pause = jest.fn();
  dispose = jest.fn();
  volume = 1.0;
  isPlaying = false;
}

export class Node {
  name: string = '';
  parent: Node | null = null;
  _children: Node[] = [];
  scene: Scene | null = null;

  constructor(name: string = '', scene: Scene | null = null) {
    this.name = name;
    this.scene = scene;
  }

  getChildren(): Node[] {
    return this._children;
  }

  dispose(): void {}
}

export class TransformNode extends Node {
  position = new Vector3();
  rotation = new Vector3();
  rotationQuaternion: Quaternion | null = null;
  scaling = new Vector3(1, 1, 1);
  private _isEnabled: boolean = true;
  
  constructor(name: string = '', scene: Scene | null = null) {
    super(name, scene);
  }
  
  setEnabled(enabled: boolean): void {
    this._isEnabled = enabled;
  }
  
  isEnabled(): boolean {
    return this._isEnabled;
  }
  
  setParent(parent: Node | null): void {
    this.parent = parent;
  }
}

export class Material {
  name: string = '';
  alpha: number = 1.0;
  
  constructor(name: string = '', scene: Scene | null = null) {
    this.name = name;
  }
  
  dispose(): void {}
}

export class AbstractMesh extends TransformNode {
  visibility: number = 1.0;
  isVisible: boolean = true;
  receiveShadows: boolean = false;
  layerMask: number = 0x0FFFFFFF;
  material: Material | null = null;
  
  constructor(name: string = '', scene: Scene | null = null) {
    super(name, scene);
  }
  
  // Override getChildren to ensure proper type compatibility
  getChildren(): Node[] {
    return super.getChildren();
  }
}

export class Mesh extends AbstractMesh {
  constructor(name = '', scene: any = null) {
    super();
    this.name = name;
    this.scene = scene;
  }
  
  createInstance = jest.fn().mockImplementation((name) => {
    const instance = new Mesh(name);
    instance.parent = this;
    return instance;
  });
}

// Move MeshBuilder class definition here, before it's referenced in the export
export class MeshBuilder {
  static CreateBox = jest.fn().mockImplementation((name, options, scene) => {
    return new Mesh(name, scene);
  });
  
  static CreateSphere = jest.fn().mockImplementation((name, options, scene) => {
    return new Mesh(name, scene);
  });
  
  static CreateCylinder = jest.fn().mockImplementation((name, options, scene) => {
    return new Mesh(name, scene);
  });
  
  static CreatePlane = jest.fn().mockImplementation((name, options, scene) => {
    return new Mesh(name, scene);
  });
  
  static CreateGround = jest.fn().mockImplementation((name, options, scene) => {
    return new Mesh(name, scene);
  });
  
  static CreateDisc = jest.fn().mockImplementation((name, options, scene) => {
    return new Mesh(name, scene);
  });
  
  static CreateTorus = jest.fn().mockImplementation((name, options, scene) => {
    return new Mesh(name, scene);
  });
}

export class Animation {
  static ANIMATIONTYPE_FLOAT = 0;
  static ANIMATIONTYPE_VECTOR3 = 1;
  static ANIMATIONTYPE_QUATERNION = 2;
  static ANIMATIONTYPE_COLOR3 = 3;
  
  static ANIMATIONLOOPMODE_RELATIVE = 0;
  static ANIMATIONLOOPMODE_CYCLE = 1;
  static ANIMATIONLOOPMODE_CONSTANT = 2;
  
  name: string;
  property: string;
  framePerSecond: number;
  dataType: number;
  loopMode: number;
  private keys: any[] = [];
  
  constructor(name: string, property: string, framePerSecond: number, dataType: number, loopMode: number) {
    this.name = name;
    this.property = property;
    this.framePerSecond = framePerSecond;
    this.dataType = dataType;
    this.loopMode = loopMode;
  }
  
  setKeys(keys: any[]): Animation {
    this.keys = keys;
    return this;
  }
  
  static CreateAndStartAnimation(
    name: string,
    target: any,
    targetProperty: string,
    framePerSecond: number,
    totalFrame: number,
    from: any,
    to: any,
    loopMode?: number,
    onAnimationEnd?: () => void
  ) {
    const animation = {
      onAnimationEnd: jest.fn(),
      stop: jest.fn()
    };
    
    if (onAnimationEnd) {
      setTimeout(() => {
        onAnimationEnd();
      }, 0);
    }
    
    return animation;
  }
}

export class Ray {
  origin: Vector3;
  direction: Vector3;
  constructor(origin: Vector3, direction: Vector3) {
    this.origin = origin;
    this.direction = direction;
  }
  intersectsMesh = jest.fn().mockReturnValue({
    hit: true,
    distance: 1,
    pickedPoint: new Vector3(0, 0, 0),
    pickedMesh: null
  });
}

export class PhysicsImpostor {
  static BoxImpostor = 1;
  static SphereImpostor = 2;
  static MeshImpostor = 3;
  static CapsuleImpostor = 4;
  static NoImpostor = 5;
  
  private object: any;
  private type: number;
  private options: any;
  private scene: any;
  public physicsBody: any = {
    setGravity: jest.fn(),
    setCollisionFlags: jest.fn(),
    applyTorque: jest.fn()
  };
  public onCollideEvent: ((collider: PhysicsImpostor, point?: Vector3) => void) | null = null;
  
  constructor(object: any, type: number, options: any, scene: any) {
    this.object = object;
    this.type = type;
    this.options = options;
    this.scene = scene;
  }
  
  setLinearVelocity = jest.fn().mockImplementation(function(velocity: Vector3) {
    if (!this.object.linearVelocity) {
      this.object.linearVelocity = new Vector3();
    }
    this.object.linearVelocity.x = velocity.x;
    this.object.linearVelocity.y = velocity.y;
    this.object.linearVelocity.z = velocity.z;
  });
  
  getLinearVelocity = jest.fn().mockImplementation(function() {
    if (!this.object.linearVelocity) {
      this.object.linearVelocity = new Vector3();
    }
    return this.object.linearVelocity.clone();
  });
  
  setAngularVelocity = jest.fn().mockImplementation(function(velocity: Vector3) {
    if (!this.object.angularVelocity) {
      this.object.angularVelocity = new Vector3();
    }
    this.object.angularVelocity.x = velocity.x;
    this.object.angularVelocity.y = velocity.y;
    this.object.angularVelocity.z = velocity.z;
  });
  
  getAngularVelocity = jest.fn().mockImplementation(function() {
    if (!this.object.angularVelocity) {
      this.object.angularVelocity = new Vector3();
    }
    return this.object.angularVelocity.clone();
  });
  
  applyImpulse = jest.fn();
  applyForce = jest.fn();
  setMass = jest.fn();
  getObjectCenter = jest.fn().mockReturnValue(new Vector3());
  
  getParam = jest.fn().mockImplementation((name: string) => {
    if (name === 'mass') return 1;
    if (name === 'friction') return 0.5;
    if (name === 'restitution') return 0.3;
    return null;
  });
  
  setParam = jest.fn();
  
  registerOnPhysicsCollide = jest.fn().mockImplementation(function(impostors, callback) {
    // Store the callback for testing purposes
    this.onCollideEvent = callback;
    return {
      disconnect: jest.fn()
    };
  });
  
  unregisterOnPhysicsCollide = jest.fn();
  dispose = jest.fn();
}

export class CannonJSPlugin {
  constructor() {}
}

export class Light {
  position: Vector3;
  direction: Vector3;
  intensity: number;
  diffuse: Color3;
  specular: Color3;
  radius: number;
  animations: Animation[] = [];
  
  constructor(name: string, scene: Scene) {
    this.position = new Vector3(0, 0, 0);
    this.direction = new Vector3(0, -1, 0);
    this.intensity = 1.0;
    this.diffuse = new Color3(1, 1, 1);
    this.specular = new Color3(1, 1, 1);
    this.radius = 1.0;
  }
  
  dispose(): void {}
}

export class PointLight extends Light {
  range: number = 10;
  diffuse: Color3 = new Color3(1, 1, 1);
  specular: Color3 = new Color3(1, 1, 1);
  
  constructor(name: string, position: Vector3, scene: Scene) {
    super(name, scene);
    this.position = position;
  }
}

export class HemisphericLight extends Light {}
export class DirectionalLight extends Light {}

export const VertexBuffer = {
  PositionKind: 'position',
  NormalKind: 'normal',
  UVKind: 'uv'
};

export const Tools = {
  CreateScreenshot: jest.fn()
};

export const Observable = {
  add: jest.fn(),
  remove: jest.fn()
};

export const PostProcessingManager = jest.fn().mockImplementation(() => ({
  initialize: jest.fn(),
  addEffect: jest.fn(),
  removeEffect: jest.fn(),
  dispose: jest.fn()
}));

export const PostProcess = jest.fn().mockImplementation(() => ({
  dispose: jest.fn()
}));

export const BlurPostProcess = jest.fn().mockImplementation(() => ({
  dispose: jest.fn()
}));

export class Color4 {
  r: number;
  g: number;
  b: number;
  a: number;

  constructor(r = 0, g = 0, b = 0, a = 1) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  clone() {
    return new Color4(this.r, this.g, this.b, this.a);
  }

  static Red() {
    return new Color4(1, 0, 0, 1);
  }

  static Green() {
    return new Color4(0, 1, 0, 1);
  }

  static Blue() {
    return new Color4(0, 0, 1, 1);
  }

  static Black() {
    return new Color4(0, 0, 0, 1);
  }

  static White() {
    return new Color4(1, 1, 1, 1);
  }
}

export const PhysicsJoint = {
  BallAndSocketJoint: 0,
  DistanceJoint: 1,
  HingeJoint: 2,
  SliderJoint: 3,
  WheelJoint: 4
};

export class ParticleSystem {
  static BLENDMODE_STANDARD = 0;
  static BLENDMODE_ADD = 1;
  static BLENDMODE_MULTIPLY = 2;
  static BLENDMODE_ONEONE = 3;

  private _isStarted: boolean = false;
  
  name: string;
  emitter: any;
  minSize: number = 0.1;
  maxSize: number = 1.0;
  minLifeTime: number = 1.0;
  maxLifeTime: number = 5.0;
  emitRate: number = 10;
  minEmitPower: number = 1;
  maxEmitPower: number = 3;
  updateSpeed: number = 0.01;
  gravity: Vector3 = new Vector3(0, -9.81, 0);
  direction1: Vector3 = new Vector3(0, 1, 0);
  direction2: Vector3 = new Vector3(0, 1, 0);
  minEmitBox: Vector3 = new Vector3(-0.5, -0.5, -0.5);
  maxEmitBox: Vector3 = new Vector3(0.5, 0.5, 0.5);
  color1: { r: number, g: number, b: number, a: number } = { r: 1, g: 1, b: 1, a: 1 };
  color2: { r: number, g: number, b: number, a: number } = { r: 1, g: 1, b: 1, a: 1 };
  blendMode: number = ParticleSystem.BLENDMODE_STANDARD;
  capacity: number;
  
  constructor(name: string, capacity: number, scene?: Scene, customEffect?: any) {
    this.name = name;
    this.capacity = capacity;
  }
  
  start(): ParticleSystem {
    this._isStarted = true;
    return this;
  }
  
  stop(): ParticleSystem {
    this._isStarted = false;
    return this;
  }
  
  isStarted(): boolean {
    return this._isStarted;
  }
  
  dispose = jest.fn();
}

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

  public static Identity(): Quaternion {
    return new Quaternion(0, 0, 0, 1);
  }

  public clone(): Quaternion {
    return new Quaternion(this.x, this.y, this.z, this.w);
  }

  public copyFrom(source: Quaternion): Quaternion {
    this.x = source.x;
    this.y = source.y;
    this.z = source.z;
    this.w = source.w;
    return this;
  }

  public set(x: number, y: number, z: number, w: number): Quaternion {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }

  public toEulerAngles(): Vector3 {
    // Convert quaternion to Euler angles (simplified implementation)
    const euler = new Vector3();
    
    // Simplified conversion formula - in a real implementation this would be more complex
    euler.x = Math.atan2(2 * (this.w * this.x + this.y * this.z), 1 - 2 * (this.x * this.x + this.y * this.y));
    euler.y = Math.asin(2 * (this.w * this.y - this.z * this.x));
    euler.z = Math.atan2(2 * (this.w * this.z + this.x * this.y), 1 - 2 * (this.y * this.y + this.z * this.z));
    
    return euler;
  }

  public static RotationYawPitchRoll(yaw: number, pitch: number, roll: number): Quaternion {
    return new Quaternion(pitch, yaw, roll, 1);
  }

  public static RotationAxis(axis: Vector3, angle: number): Quaternion {
    // Simple implementation for testing purposes
    const quaternion = new Quaternion();
    
    // For a real implementation, would use complex math for axis-angle to quaternion conversion
    // This is just a simplified version for testing
    const sin = Math.sin(angle / 2);
    quaternion.x = axis.x * sin;
    quaternion.y = axis.y * sin;
    quaternion.z = axis.z * sin;
    quaternion.w = Math.cos(angle / 2);
    
    return quaternion;
  }

  public toRotationMatrix(result: Matrix): Matrix {
    // Simple implementation for testing purposes
    // This is a simplified version that doesn't do the full quaternion to matrix conversion
    
    // Create an identity matrix
    for (let i = 0; i < 16; i++) {
      result.m[i] = i % 5 === 0 ? 1 : 0; // Set diagonal to 1
    }
    
    // Apply rotation effect (simplified implementation)
    result.m[0] = 1 - 2 * (this.y * this.y + this.z * this.z);
    result.m[1] = 2 * (this.x * this.y - this.z * this.w);
    result.m[2] = 2 * (this.x * this.z + this.y * this.w);
    
    result.m[4] = 2 * (this.x * this.y + this.z * this.w);
    result.m[5] = 1 - 2 * (this.x * this.x + this.z * this.z);
    result.m[6] = 2 * (this.y * this.z - this.x * this.w);
    
    result.m[8] = 2 * (this.x * this.z - this.y * this.w);
    result.m[9] = 2 * (this.y * this.z + this.x * this.w);
    result.m[10] = 1 - 2 * (this.x * this.x + this.y * this.y);
    
    return result;
  }
}

export class Matrix {
  m = new Array(16).fill(0);
  private _hasRotation: boolean = false;
  
  constructor() {
    // Initialize as identity matrix
    this.m[0] = 1;
    this.m[5] = 1;
    this.m[10] = 1;
    this.m[15] = 1;
  }

  // Add getter for hasRotation
  get hasRotation(): boolean {
    return this._hasRotation;
  }

  static Identity(): Matrix {
    const result = new Matrix();
    return result;
  }

  static Compose(scaling: Vector3, rotation: Quaternion, translation: Vector3): Matrix {
    // Improved implementation for testing
    const result = new Matrix();
    
    // For testing purposes, we're applying a more realistic matrix composition
    // Set scaling (diagonal elements 0, 5, 10)
    result.m[0] = scaling.x;
    result.m[5] = scaling.y;
    result.m[10] = scaling.z;
    
    // Set translation (elements 12, 13, 14)
    result.m[12] = translation.x;
    result.m[13] = translation.y;
    result.m[14] = translation.z;
    
    // In reality, rotation would be applied properly, but for testing
    // we'll simplify and just store the fact that a rotation was applied
    result._hasRotation = true;
    
    return result;
  }
  
  clone(): Matrix {
    const result = new Matrix();
    for (let i = 0; i < 16; i++) {
      result.m[i] = this.m[i];
    }
    if (this._hasRotation) {
      result._hasRotation = true;
    }
    return result;
  }
  
  multiply(other: Matrix): Matrix {
    // Improved matrix multiplication for testing
    const result = new Matrix();
    
    // Apply other's translation to our translation
    result.m[12] = this.m[12] + other.m[12];
    result.m[13] = this.m[13] + other.m[13];
    result.m[14] = this.m[14] + other.m[14];
    
    // Apply scaling as well (simplified)
    result.m[0] = this.m[0] * other.m[0];
    result.m[5] = this.m[5] * other.m[5];
    result.m[10] = this.m[10] * other.m[10];
    
    // Copy rotation flags
    if (this._hasRotation || other._hasRotation) {
      result._hasRotation = true;
    }
    
    return result;
  }
  
  decompose(scale: Vector3, rotation: Quaternion, translation: Vector3): void {
    // Extract scaling
    scale.x = this.m[0];
    scale.y = this.m[5];
    scale.z = this.m[10];
    
    // Extract translation
    translation.x = this.m[12];
    translation.y = this.m[13];
    translation.z = this.m[14];
    
    // For rotation, we'll set a default value for testing
    rotation.x = 0;
    rotation.y = 0;
    rotation.z = 0;
    rotation.w = 1;
  }
  
  getTranslationToRef(result: Vector3): Vector3 {
    // Extract the translation from the matrix (last column)
    result.x = this.m[12];
    result.y = this.m[13];
    result.z = this.m[14];
    return result;
  }
  
  getTranslation(): Vector3 {
    // Extract and return the translation
    const result = new Vector3(this.m[12], this.m[13], this.m[14]);
    return result;
  }
}

export class PhysicsComponent {
  impostor: PhysicsImpostor | null = null;
  type: number = PhysicsImpostor.BoxImpostor;
  options: any = { mass: 1, restitution: 0.2, friction: 0.2 };
  
  constructor(type?: number, options?: any) {
    if (type !== undefined) this.type = type;
    if (options) this.options = { ...this.options, ...options };
  }
  
  attachToMesh(mesh: any) {
    this.impostor = new PhysicsImpostor(mesh, this.type, this.options, mesh.scene);
    mesh.physicsImpostor = this.impostor;
    return this.impostor;
  }
  
  dispose() {
    if (this.impostor) {
      this.impostor.dispose();
      this.impostor = null;
    }
  }
}

export class EventBus {
  emit = jest.fn();
  on = jest.fn();
  off = jest.fn();
}

export class Map {
  private _internalMap = new global.Map();
  
  has(key) {
    return this._internalMap.has(key);
  }
  
  get(key) {
    return this._internalMap.get(key);
  }
  
  set(key, value) {
    this._internalMap.set(key, value);
    return this;
  }
  
  delete(key) {
    return this._internalMap.delete(key);
  }
  
  clear() {
    this._internalMap.clear();
  }
  
  keys() {
    return this._internalMap.keys();
  }
  
  values() {
    return this._internalMap.values();
  }
  
  entries() {
    return this._internalMap.entries();
  }
  
  forEach(callback) {
    this._internalMap.forEach(callback);
  }
  
  get size() {
    return this._internalMap.size;
  }
}

export class GlowLayer {
  name: string;
  intensity: number;
  blurKernelSize: number;
  
  constructor(name: string, scene: Scene) {
    this.name = name;
    this.intensity = 1.0;
    this.blurKernelSize = 32;
  }
  
  addIncludedOnlyMesh(mesh: Mesh): Mesh {
    return mesh;
  }

  addExcludedMesh = jest.fn();
  dispose = jest.fn();
}

export class ParticleSystemManager {
  private scene: Scene | null = null;
  private particleSystems: Record<string, any> = {};
  private nextId = 1;
  
  /**
   * Initialize the particle manager
   * @param scene BABYLON Scene to use
   */
  public initialize(scene: Scene): void {
    this.scene = scene;
  }

  public createParticleSystemFromPreset = jest.fn((options: any) => {
    const id = `particle_${this.nextId++}`;
    this.particleSystems[id] = {
      id,
      options,
      emitter: options.emitter
    };
    return id;
  });

  public updateEmitterPosition = jest.fn((id: string, position: Vector3) => {
    if (id in this.particleSystems) {
      this.particleSystems[id].emitter = position;
    }
    return this;
  });

  public updateEmitRate = jest.fn((id: string, emitRate: number) => {
    if (id in this.particleSystems) {
      this.particleSystems[id].emitRate = emitRate;
    }
    return this;
  });

  public setSystemVisible = jest.fn((id: string, visible: boolean) => {
    if (id in this.particleSystems) {
      this.particleSystems[id].visible = visible;
    }
    return this;
  });

  public removeParticleSystem = jest.fn((id: string) => {
    if (id in this.particleSystems) {
      delete this.particleSystems[id];
    }
    return this;
  });

  public dispose = jest.fn(() => {
    this.particleSystems = {};
    this.scene = null;
    return this;
  });
}

// Mock Component for Entity Component System
export class Component {
  type: string;
  private entity: any = null;
  private enabled: boolean = true;
  
  constructor(options: { type: string }) {
    this.type = options.type;
  }
  
  init(entity: any): void {
    this.entity = entity;
  }
  
  isEnabled(): boolean {
    return this.enabled;
  }
  
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  getEntity(): any {
    return this.entity;
  }
  
  update(deltaTime: number): void {}
  
  dispose(): void {
    this.entity = null;
  }
}

// Mock TransformComponent for CameraComponent tests
export class TransformComponent extends Component {
  private position: Vector3 = new Vector3(0, 0, 0);
  private rotation: Vector3 = new Vector3(0, 0, 0);
  private scaling: Vector3 = new Vector3(1, 1, 1);
  private parent: TransformComponent | null = null;
  private localMatrix: Matrix = Matrix.Identity();
  private worldMatrix: Matrix = Matrix.Identity();
  private dirty: boolean = true;
  
  constructor(options: any = {}) {
    super({ type: 'transform' });
    
    if (options.position) {
      this.position.copyFrom(options.position);
    }
    
    if (options.rotation) {
      this.rotation.copyFrom(options.rotation);
    }
    
    if (options.scaling) {
      this.scaling.copyFrom(options.scaling);
    }
    
    if (options.parent) {
      this.parent = options.parent;
    }
    
    this.updateMatrices();
  }
  
  getPosition(): Vector3 {
    return this.position.clone();
  }
  
  setPosition(position: Vector3): void;
  setPosition(x: number, y: number, z: number): void;
  setPosition(positionOrX: Vector3 | number, y?: number, z?: number): void {
    if (positionOrX instanceof Vector3) {
      this.position.copyFrom(positionOrX);
    } else if (typeof y === 'number' && typeof z === 'number') {
      this.position.set(positionOrX, y, z);
    }
    this.dirty = true;
    this.updateMatrices();
  }
  
  getRotation(): Vector3 {
    return this.rotation.clone();
  }
  
  setRotation(rotation: Vector3): void;
  setRotation(x: number, y: number, z: number): void;
  setRotation(rotationOrX: Vector3 | number, y?: number, z?: number): void {
    if (rotationOrX instanceof Vector3) {
      this.rotation.copyFrom(rotationOrX);
    } else if (typeof y === 'number' && typeof z === 'number') {
      this.rotation.set(rotationOrX, y, z);
    }
    this.dirty = true;
    this.updateMatrices();
  }
  
  getScale(): Vector3 {
    return this.scaling.clone();
  }
  
  setScale(scale: Vector3): void;
  setScale(scale: number): void;
  setScale(x: number, y: number, z: number): void;
  setScale(scaleOrX: Vector3 | number, y?: number, z?: number): void {
    if (scaleOrX instanceof Vector3) {
      this.scaling.copyFrom(scaleOrX);
    } else if (typeof y === 'undefined' && typeof z === 'undefined') {
      // Uniform scale
      this.scaling.set(scaleOrX as number, scaleOrX as number, scaleOrX as number);
    } else if (typeof y === 'number' && typeof z === 'number') {
      this.scaling.set(scaleOrX as number, y, z);
    }
    this.dirty = true;
    this.updateMatrices();
  }
  
  getLocalMatrix(): Matrix {
    if (this.dirty) {
      this.updateMatrices();
    }
    return this.localMatrix.clone();
  }
  
  getWorldMatrix(): Matrix {
    if (this.dirty) {
      this.updateMatrices();
    }
    return this.worldMatrix.clone();
  }
  
  translate(offset: Vector3): void;
  translate(x: number, y: number, z: number): void;
  translate(offsetOrX: Vector3 | number, y?: number, z?: number): void {
    if (offsetOrX instanceof Vector3) {
      this.position.addInPlace(offsetOrX);
    } else if (typeof y === 'number' && typeof z === 'number') {
      this.position.addInPlace(new Vector3(offsetOrX, y, z));
    }
    this.dirty = true;
    this.updateMatrices();
  }
  
  rotate(rotation: Vector3): void;
  rotate(x: number, y: number, z: number): void;
  rotate(rotationOrX: Vector3 | number, y?: number, z?: number): void {
    if (rotationOrX instanceof Vector3) {
      this.rotation.addInPlace(rotationOrX);
    } else if (typeof y === 'number' && typeof z === 'number') {
      this.rotation.addInPlace(new Vector3(rotationOrX, y, z));
    }
    this.dirty = true;
    this.updateMatrices();
  }
  
  lookAt(target: Vector3): void {
    // Calculate direction vector from position to target
    const direction = target.subtract(this.position).normalize();
    
    // Calculate a simplified lookAt rotation
    // This is a more realistic implementation that actually sets proper rotation values
    
    // Assuming Y is up, calculate yaw (rotation around Y axis)
    const yaw = Math.atan2(direction.x, direction.z);
    
    // Calculate pitch (rotation around X axis)
    const pitch = -Math.atan2(direction.y, Math.sqrt(direction.x * direction.x + direction.z * direction.z));
    
    // Set rotation values (roll is kept at 0)
    this.rotation.set(pitch, yaw, 0);
    
    this.dirty = true;
    this.updateMatrices();
  }
  
  getForward(): Vector3 {
    // Get the forward direction vector (local Z axis transformed by rotation)
    const forward = new Vector3(0, 0, 1);
    
    // Create rotation matrix from Euler angles
    const rotationQuaternion = Quaternion.RotationYawPitchRoll(
      this.rotation.y, this.rotation.x, this.rotation.z
    );
    
    const rotationMatrix = Matrix.Compose(
      new Vector3(1, 1, 1), // Unit scale
      rotationQuaternion,
      new Vector3(0, 0, 0)  // No translation
    );
    
    return Vector3.TransformNormal(forward, rotationMatrix);
  }
  
  getRight(): Vector3 {
    // Get the right direction vector (local X axis transformed by rotation)
    const right = new Vector3(1, 0, 0);
    
    // Create rotation matrix from Euler angles
    const rotationQuaternion = Quaternion.RotationYawPitchRoll(
      this.rotation.y, this.rotation.x, this.rotation.z
    );
    
    const rotationMatrix = Matrix.Compose(
      new Vector3(1, 1, 1), // Unit scale
      rotationQuaternion,
      new Vector3(0, 0, 0)  // No translation
    );
    
    return Vector3.TransformNormal(right, rotationMatrix);
  }
  
  getUp(): Vector3 {
    // Get the up direction vector (local Y axis transformed by rotation)
    const up = new Vector3(0, 1, 0);
    
    // Create rotation matrix from Euler angles
    const rotationQuaternion = Quaternion.RotationYawPitchRoll(
      this.rotation.y, this.rotation.x, this.rotation.z
    );
    
    const rotationMatrix = Matrix.Compose(
      new Vector3(1, 1, 1), // Unit scale
      rotationQuaternion,
      new Vector3(0, 0, 0)  // No translation
    );
    
    return Vector3.TransformNormal(up, rotationMatrix);
  }
  
  setParent(parent: TransformComponent | null): void {
    this.parent = parent;
    this.dirty = true;
    this.updateMatrices();
  }
  
  getParent(): TransformComponent | null {
    return this.parent;
  }
  
  private updateMatrices(): void {
    this.dirty = false;
    
    // Create local matrix from position, rotation, and scale
    const rotationQ = new Quaternion(); // dummy quaternion for testing
    this.localMatrix = Matrix.Compose(this.scaling, rotationQ, this.position);
    
    // If we have a parent, compute world matrix by combining with parent's world matrix
    if (this.parent) {
      const parentWorldMatrix = this.parent.getWorldMatrix();
      this.worldMatrix = this.localMatrix.multiply(parentWorldMatrix);
    } else {
      this.worldMatrix = this.localMatrix.clone();
    }
  }
}

// UUID generator function for Entity tests
export function generateUUID() {
  return 'generated-uuid-' + Math.random().toString(36).substring(2, 15);
}

// Mock Entity for testing
export class Entity {
  id: string;
  private components: Record<string, Component> = {};
  
  constructor(id: string = generateUUID()) {
    this.id = id;
  }
  
  getComponent<T>(type: string): T | null {
    return type in this.components ? this.components[type] as unknown as T : null;
  }
  
  addComponent(component: Component): void {
    if (!component || !component.type) {
      return;
    }
    
    this.components[component.type] = component;
    component.init(this);
  }
  
  removeComponent(type: string): boolean {
    if (type in this.components) {
      const component = this.components[type];
      component?.dispose();
      delete this.components[type];
      return true;
    }
    return false;
  }
  
  update(deltaTime: number): void {
    Object.values(this.components).forEach(component => {
      if (component.isEnabled()) {
        component.update(deltaTime);
      }
    });
  }
  
  dispose(): void {
    Object.values(this.components).forEach(component => {
      component.dispose();
    });
    this.components = {};
  }
}

// Add SceneLoader class to the mock before it's referenced
export class SceneLoader {
  static RegisterPlugin = jest.fn();
  static Load = jest.fn();
  static LoadAssetContainer = jest.fn();
  static Append = jest.fn();
  static AppendAsync = jest.fn();
  
  static ImportMesh = jest.fn().mockImplementation((meshNames, path, filename, scene, onSuccess, onProgress, onError) => {
    if (onSuccess) {
      // Create a mock mesh for the callback
      const mockMesh = new Mesh('importedMesh');
      onSuccess([mockMesh], [], [], []);
    }
    return null;
  });
  
  static ImportMeshAsync = jest.fn().mockImplementation((meshNames, path, filename, scene) => {
    return new Promise((resolve) => {
      const mockMesh = new Mesh('importedMesh');
      resolve({
        meshes: [mockMesh],
        particleSystems: [],
        skeletons: [],
        animationGroups: []
      });
    });
  });
}

// Default exports for common Babylon.js types
export default {
  Vector3,
  Vector2,
  Color3,
  Color4,
  Scene,
  Engine,
  NullEngine,
  FreeCamera,
  UniversalCamera,
  ArcRotateCamera,
  FollowCamera,
  StandardMaterial,
  ShaderMaterial,
  PBRMaterial,
  RenderTargetTexture,
  Texture,
  Sound,
  MeshBuilder,
  Animation,
  Ray,
  PhysicsImpostor,
  CannonJSPlugin,
  TransformNode,
  Light,
  PointLight,
  HemisphericLight,
  DirectionalLight,
  VertexBuffer,
  Tools,
  Observable,
  PostProcessingManager,
  PostProcess,
  BlurPostProcess,
  PhysicsJoint,
  ParticleSystem,
  Quaternion,
  Matrix,
  AbstractMesh,
  Mesh,
  PhysicsComponent,
  EventBus,
  Map,
  GlowLayer,
  ParticleSystemManager,
  serialize,
  deserialize,
  generateUUID,
  Component,
  TransformComponent,
  Entity,
  SceneLoader
}; 