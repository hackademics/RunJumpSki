/**
 * Vector3.ts
 * Represents a 3D vector with x, y, and z components
 */

export class Vector3 {
    /**
     * X component of the vector
     */
    public x: number;
    
    /**
     * Y component of the vector
     */
    public y: number;
    
    /**
     * Z component of the vector
     */
    public z: number;
    
    /**
     * Creates a new Vector3
     * @param x X component
     * @param y Y component
     * @param z Z component
     */
    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    
    /**
     * Creates a new Vector3 with the same components as this one
     * @returns A new Vector3 with the same components
     */
    clone(): Vector3 {
        return new Vector3(this.x, this.y, this.z);
    }
    
    /**
     * Sets the components of this vector
     * @param x X component
     * @param y Y component
     * @param z Z component
     * @returns This vector for chaining
     */
    set(x: number, y: number, z: number): Vector3 {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }
    
    /**
     * Copies the components from another vector
     * @param v Vector to copy from
     * @returns This vector for chaining
     */
    copy(v: Vector3): Vector3 {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }
    
    /**
     * Adds another vector to this one
     * @param v Vector to add
     * @returns This vector for chaining
     */
    add(v: Vector3): Vector3 {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }
    
    /**
     * Subtracts another vector from this one
     * @param v Vector to subtract
     * @returns This vector for chaining
     */
    subtract(v: Vector3): Vector3 {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }
    
    /**
     * Multiplies this vector by a scalar
     * @param scalar Scalar to multiply by
     * @returns This vector for chaining
     */
    multiplyScalar(scalar: number): Vector3 {
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        return this;
    }
    
    /**
     * Divides this vector by a scalar
     * @param scalar Scalar to divide by
     * @returns This vector for chaining
     */
    divideScalar(scalar: number): Vector3 {
        if (scalar !== 0) {
            const invScalar = 1 / scalar;
            this.x *= invScalar;
            this.y *= invScalar;
            this.z *= invScalar;
        } else {
            this.x = 0;
            this.y = 0;
            this.z = 0;
        }
        return this;
    }
    
    /**
     * Calculates the dot product with another vector
     * @param v Vector to calculate dot product with
     * @returns Dot product
     */
    dot(v: Vector3): number {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }
    
    /**
     * Calculates the cross product with another vector
     * @param v Vector to calculate cross product with
     * @returns This vector for chaining
     */
    cross(v: Vector3): Vector3 {
        const x = this.y * v.z - this.z * v.y;
        const y = this.z * v.x - this.x * v.z;
        const z = this.x * v.y - this.y * v.x;
        
        this.x = x;
        this.y = y;
        this.z = z;
        
        return this;
    }
    
    /**
     * Calculates the length of this vector
     * @returns Length of the vector
     */
    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    
    /**
     * Calculates the squared length of this vector
     * @returns Squared length of the vector
     */
    lengthSquared(): number {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }
    
    /**
     * Normalizes this vector (makes it unit length)
     * @returns This vector for chaining
     */
    normalize(): Vector3 {
        return this.divideScalar(this.length() || 1);
    }
    
    /**
     * Calculates the distance to another vector
     * @param v Vector to calculate distance to
     * @returns Distance to the other vector
     */
    distanceTo(v: Vector3): number {
        return Math.sqrt(this.distanceToSquared(v));
    }
    
    /**
     * Calculates the squared distance to another vector
     * @param v Vector to calculate squared distance to
     * @returns Squared distance to the other vector
     */
    distanceToSquared(v: Vector3): number {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        
        return dx * dx + dy * dy + dz * dz;
    }
    
    /**
     * Linearly interpolates between this vector and another
     * @param v Vector to interpolate to
     * @param t Interpolation factor (0-1)
     * @returns This vector for chaining
     */
    lerp(v: Vector3, t: number): Vector3 {
        this.x += (v.x - this.x) * t;
        this.y += (v.y - this.y) * t;
        this.z += (v.z - this.z) * t;
        
        return this;
    }
    
    /**
     * Creates a new Vector3 with all components set to zero
     * @returns A new zero vector
     */
    static zero(): Vector3 {
        return new Vector3(0, 0, 0);
    }
    
    /**
     * Creates a new Vector3 with all components set to one
     * @returns A new vector with all components set to one
     */
    static one(): Vector3 {
        return new Vector3(1, 1, 1);
    }
    
    /**
     * Creates a new Vector3 representing the up direction (0, 1, 0)
     * @returns A new up vector
     */
    static up(): Vector3 {
        return new Vector3(0, 1, 0);
    }
    
    /**
     * Creates a new Vector3 representing the down direction (0, -1, 0)
     * @returns A new down vector
     */
    static down(): Vector3 {
        return new Vector3(0, -1, 0);
    }
    
    /**
     * Creates a new Vector3 representing the right direction (1, 0, 0)
     * @returns A new right vector
     */
    static right(): Vector3 {
        return new Vector3(1, 0, 0);
    }
    
    /**
     * Creates a new Vector3 representing the left direction (-1, 0, 0)
     * @returns A new left vector
     */
    static left(): Vector3 {
        return new Vector3(-1, 0, 0);
    }
    
    /**
     * Creates a new Vector3 representing the forward direction (0, 0, 1)
     * @returns A new forward vector
     */
    static forward(): Vector3 {
        return new Vector3(0, 0, 1);
    }
    
    /**
     * Creates a new Vector3 representing the backward direction (0, 0, -1)
     * @returns A new backward vector
     */
    static backward(): Vector3 {
        return new Vector3(0, 0, -1);
    }
    
    /**
     * Scales this vector by a scalar value
     * @param scalar The scalar value to multiply by
     * @returns This vector after scaling
     */
    scale(scalar: number): Vector3 {
        return new Vector3(
            this.x * scalar,
            this.y * scalar,
            this.z * scalar
        );
    }
    
    /**
     * Scales this vector in place by a scalar value
     * @param scalar The scalar value to multiply by
     * @returns This vector after scaling
     */
    scaleInPlace(scalar: number): Vector3 {
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        return this;
    }
    
    /**
     * Adds another vector to this vector in place
     * @param vector The vector to add
     * @returns This vector after addition
     */
    addInPlace(vector: Vector3): Vector3 {
        this.x += vector.x;
        this.y += vector.y;
        this.z += vector.z;
        return this;
    }
    
    /**
     * Subtracts another vector from this vector in place
     * @param vector The vector to subtract
     * @returns This vector after subtraction
     */
    subtractInPlace(vector: Vector3): Vector3 {
        this.x -= vector.x;
        this.y -= vector.y;
        this.z -= vector.z;
        return this;
    }
    
    /**
     * Normalizes this vector in place (makes it unit length)
     * @returns This vector after normalization
     */
    normalizeInPlace(): Vector3 {
        const len = this.length();
        if (len === 0) {
            return this;
        }
        
        const invLen = 1 / len;
        this.x *= invLen;
        this.y *= invLen;
        this.z *= invLen;
        return this;
    }
    
    /**
     * Copies values from another vector to this vector
     * @param source The source vector to copy from
     * @returns This vector after copying
     */
    copyFrom(source: Vector3): Vector3 {
        this.x = source.x;
        this.y = source.y;
        this.z = source.z;
        return this;
    }
    
    /**
     * Checks if this vector equals another vector
     * @param other The other vector to compare with
     * @returns True if vectors are equal, false otherwise
     */
    equals(other: Vector3): boolean {
        return this.x === other.x && this.y === other.y && this.z === other.z;
    }
    
    /**
     * Creates a new Vector3 from spherical coordinates
     * @param radius The radius
     * @param theta The polar angle in radians
     * @param phi The azimuthal angle in radians
     * @returns A new Vector3 from spherical coordinates
     */
    static FromSpherical(radius: number, theta: number, phi: number): Vector3 {
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);
        
        return new Vector3(
            radius * sinTheta * cosPhi,
            radius * cosTheta,
            radius * sinTheta * sinPhi
        );
    }
    
    /**
     * Calculates the squared distance between two vectors
     * @param a The first vector
     * @param b The second vector
     * @returns The squared distance between the vectors
     */
    static DistanceSquared(a: Vector3, b: Vector3): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        return dx * dx + dy * dy + dz * dz;
    }
    
    /**
     * Calculates the distance between two vectors
     * @param a The first vector
     * @param b The second vector
     * @returns The distance between the vectors
     */
    static Distance(a: Vector3, b: Vector3): number {
        return Math.sqrt(Vector3.DistanceSquared(a, b));
    }
    
    /**
     * Linearly interpolates between two vectors
     * @param start Start vector
     * @param end End vector
     * @param t Interpolation factor (0-1)
     * @returns Interpolated vector
     */
    static Lerp(start: Vector3, end: Vector3, t: number): Vector3 {
        // Clamp t to [0, 1]
        t = Math.max(0, Math.min(1, t));
        
        // Interpolate each component
        return new Vector3(
            start.x + (end.x - start.x) * t,
            start.y + (end.y - start.y) * t,
            start.z + (end.z - start.z) * t
        );
    }
    
    /**
     * Calculates the cross product of two vectors
     * @param a First vector
     * @param b Second vector
     * @returns New vector representing the cross product
     */
    static Cross(a: Vector3, b: Vector3): Vector3 {
        return new Vector3(
            a.y * b.z - a.z * b.y,
            a.z * b.x - a.x * b.z,
            a.x * b.y - a.y * b.x
        );
    }
}
