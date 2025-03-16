/**
 * 3D vector type
 */
export interface Vector3 {
    /**
     * X component
     */
    x: number;
    
    /**
     * Y component
     */
    y: number;
    
    /**
     * Z component
     */
    z: number;
}

/**
 * Create a new Vector3
 */
export function createVector3(x: number = 0, y: number = 0, z: number = 0): Vector3 {
    return { x, y, z };
}

/**
 * Add two vectors
 */
export function addVectors(a: Vector3, b: Vector3): Vector3 {
    return {
        x: a.x + b.x,
        y: a.y + b.y,
        z: a.z + b.z
    };
}

/**
 * Subtract vector b from vector a
 */
export function subtractVectors(a: Vector3, b: Vector3): Vector3 {
    return {
        x: a.x - b.x,
        y: a.y - b.y,
        z: a.z - b.z
    };
}

/**
 * Scale a vector by a scalar
 */
export function scaleVector(vector: Vector3, scale: number): Vector3 {
    return {
        x: vector.x * scale,
        y: vector.y * scale,
        z: vector.z * scale
    };
}

/**
 * Calculate the length/magnitude of a vector
 */
export function vectorLength(vector: Vector3): number {
    return Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
}

/**
 * Normalize a vector (make it unit length)
 */
export function normalizeVector(vector: Vector3): Vector3 {
    const length = vectorLength(vector);
    if (length === 0) {
        return { x: 0, y: 0, z: 0 };
    }
    return {
        x: vector.x / length,
        y: vector.y / length,
        z: vector.z / length
    };
}

/**
 * Calculate the dot product of two vectors
 */
export function dotProduct(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Calculate the cross product of two vectors
 */
export function crossProduct(a: Vector3, b: Vector3): Vector3 {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
    };
}
