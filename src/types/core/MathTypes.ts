/**
 * 3D Vector
 */
export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

/**
 * 2D Vector
 */
export interface Vector2 {
    x: number;
    y: number;
}

/**
 * Quaternion
 */
export interface Quaternion {
    x: number;
    y: number;
    z: number;
    w: number;
}

/**
 * Color with RGB components
 */
export interface Color3 {
    r: number;
    g: number;
    b: number;
}

/**
 * Color with RGBA components
 */
export interface Color4 extends Color3 {
    a: number;
}

/**
 * 4x4 Matrix
 */
export interface Matrix4 {
    m: Float32Array | number[];
}

/**
 * Axis-aligned bounding box
 */
export interface AABB {
    min: Vector3;
    max: Vector3;
}

/**
 * Ray for raycasting
 */
export interface Ray {
    origin: Vector3;
    direction: Vector3;
}

/**
 * Plane in 3D space
 */
export interface Plane {
    normal: Vector3;
    d: number;
}

/**
 * Sphere for collision detection
 */
export interface Sphere {
    center: Vector3;
    radius: number;
}

/**
 * Transform data
 */
export interface Transform {
    position: Vector3;
    rotation: Quaternion;
    scale: Vector3;
}

/**
 * Viewport dimensions
 */
export interface Viewport {
    x: number;
    y: number;
    width: number;
    height: number;
} 