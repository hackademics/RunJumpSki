import { Vector3, Quaternion, Matrix, Scalar } from '@babylonjs/core';

/**
 * Math utilities for game operations
 */
export class MathUtils {
    /**
     * Convert degrees to radians
     * @param degrees Angle in degrees
     * @returns Angle in radians
     */
    public static toRadians(degrees: number): number {
        return degrees * Math.PI / 180;
    }

    /**
     * Convert radians to degrees
     * @param radians Angle in radians
     * @returns Angle in degrees
     */
    public static toDegrees(radians: number): number {
        return radians * 180 / Math.PI;
    }

    /**
     * Linearly interpolate between two values
     * @param a Starting value
     * @param b Target value
     * @param t Interpolation factor (0-1)
     * @returns Interpolated value
     */
    public static lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    /**
     * Clamp a value between min and max
     * @param value Value to clamp
     * @param min Minimum value
     * @param max Maximum value
     * @returns Clamped value
     */
    public static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Smoothly interpolate between two values
     * @param a Starting value
     * @param b Target value
     * @param t Interpolation factor (0-1)
     * @returns Smoothly interpolated value
     */
    public static smoothStep(a: number, b: number, t: number): number {
        t = this.clamp(t, 0, 1);
        t = t * t * (3 - 2 * t); // Smooth step formula
        return this.lerp(a, b, t);
    }

    /**
     * Get a random number between min and max
     * @param min Minimum value
     * @param max Maximum value
     * @returns Random number
     */
    public static random(min: number, max: number): number {
        return min + Math.random() * (max - min);
    }

    /**
     * Get a random integer between min and max (inclusive)
     * @param min Minimum value
     * @param max Maximum value
     * @returns Random integer
     */
    public static randomInt(min: number, max: number): number {
        return Math.floor(this.random(min, max + 1));
    }

    /**
     * Get a random Vector3 within specified ranges
     * @param minX Minimum X value
     * @param maxX Maximum X value
     * @param minY Minimum Y value
     * @param maxY Maximum Y value
     * @param minZ Minimum Z value
     * @param maxZ Maximum Z value
     * @returns Random Vector3
     */
    public static randomVector3(
        minX: number, maxX: number,
        minY: number, maxY: number,
        minZ: number, maxZ: number
    ): Vector3 {
        return new Vector3(
            this.random(minX, maxX),
            this.random(minY, maxY),
            this.random(minZ, maxZ)
        );
    }

    /**
     * Generate a seeded random number
     * @param seed Seed value
     * @returns Random number between 0 and 1
     */
    public static seededRandom(seed: number): number {
        // Simple LCG random algorithm
        const a = 1664525;
        const c = 1013904223;
        const m = Math.pow(2, 32);

        // Calculate next seed
        seed = (a * seed + c) % m;

        // Return normalized value
        return seed / m;
    }

    /**
     * Calculate the angle between two vectors in radians
     * @param v1 First vector
     * @param v2 Second vector
     * @returns Angle in radians
     */
    public static angleBetweenVectors(v1: Vector3, v2: Vector3): number {
        const dot = Vector3.Dot(v1.normalize(), v2.normalize());
        return Math.acos(this.clamp(dot, -1, 1));
    }

    /**
     * Calculate the signed angle between two vectors around an axis
     * @param v1 First vector
     * @param v2 Second vector
     * @param axis Axis around which to measure the angle
     * @returns Signed angle in radians
     */
    public static signedAngleBetweenVectors(v1: Vector3, v2: Vector3, axis: Vector3): number {
        const angle = this.angleBetweenVectors(v1, v2);
        const cross = Vector3.Cross(v1, v2);
        const dot = Vector3.Dot(cross, axis);

        return dot < 0 ? -angle : angle;
    }

    /**
     * Project a vector onto a plane defined by its normal
     * @param vector Vector to project
     * @param planeNormal Normal of the plane
     * @returns Projected vector
     */
    public static projectOnPlane(vector: Vector3, planeNormal: Vector3): Vector3 {
        const normalizedNormal = planeNormal.normalize();
        const dot = Vector3.Dot(vector, normalizedNormal);
        return vector.subtract(normalizedNormal.scale(dot));
    }

    /**
     * Reflect a vector off a surface with a normal
     * @param vector Vector to reflect
     * @param normal Surface normal
     * @returns Reflected vector
     */
    public static reflect(vector: Vector3, normal: Vector3): Vector3 {
        const normalizedNormal = normal.normalize();
        const dot = Vector3.Dot(vector, normalizedNormal);
        return vector.subtract(normalizedNormal.scale(2 * dot));
    }

    /**
     * Calculate the slope angle of a surface in radians
     * @param normal Surface normal
     * @returns Slope angle in radians (0 = flat, PI/2 = vertical)
     */
    public static slopeAngle(normal: Vector3): number {
        const up = new Vector3(0, 1, 0);
        const dot = Vector3.Dot(normal.normalize(), up);
        return Math.acos(this.clamp(dot, -1, 1));
    }

    /**
     * Calculate the direction down a slope based on the surface normal
     * @param normal Surface normal
     * @returns Direction vector pointing down the slope
     */
    public static slopeDirection(normal: Vector3): Vector3 {
        // Project gravity onto the surface plane
        const gravity = new Vector3(0, -1, 0);
        return this.projectOnPlane(gravity, normal).normalize();
    }

    /**
     * Calculate the force of gravity down a slope
     * @param normal Surface normal
     * @param mass Object mass
     * @param gravity Gravity strength (default: 9.81)
     * @returns Force vector
     */
    public static slopeForce(normal: Vector3, mass: number, gravity: number = 9.81): Vector3 {
        const angle = this.slopeAngle(normal);
        const direction = this.slopeDirection(normal);
        const forceMagnitude = mass * gravity * Math.sin(angle);
        return direction.scale(forceMagnitude);
    }

    /**
     * Apply friction to a velocity vector
     * @param velocity Current velocity
     * @param friction Friction coefficient (0-1)
     * @param deltaTime Time step in seconds
     * @returns New velocity after friction
     */
    public static applyFriction(velocity: Vector3, friction: number, deltaTime: number): Vector3 {
        // Simple linear friction model
        const frictionFactor = 1 - this.clamp(friction, 0, 1) * deltaTime;
        return velocity.scale(frictionFactor);
    }

    /**
     * Calculate a spring force
     * @param currentPos Current position
     * @param targetPos Target position
     * @param springConstant Spring stiffness
     * @param damping Damping factor
     * @param velocity Current velocity
     * @returns Spring force vector
     */
    public static springForce(
        currentPos: Vector3,
        targetPos: Vector3,
        springConstant: number,
        damping: number,
        velocity: Vector3
    ): Vector3 {
        // Calculate displacement from rest position
        const displacement = targetPos.subtract(currentPos);

        // Calculate spring force (F = -kx)
        const springForce = displacement.scale(springConstant);

        // Calculate damping force (F = -cv)
        const dampingForce = velocity.scale(-damping);

        // Return combined force
        return springForce.add(dampingForce);
    }

    /**
     * Smooth damp a value towards a target (critically damped spring)
     * Similar to Unity's SmoothDamp
     * @param current Current value
     * @param target Target value
     * @param currentVelocity Current velocity (will be modified)
     * @param smoothTime Approximate time to reach target
     * @param deltaTime Time step
     * @param maxSpeed Optional maximum speed limit
     * @returns New value
     */
    public static smoothDamp(
        current: number,
        target: number,
        currentVelocity: { value: number },
        smoothTime: number,
        deltaTime: number,
        maxSpeed: number = Infinity
    ): number {
        // Based on Unity's SmoothDamp function
        smoothTime = Math.max(0.0001, smoothTime);
        const omega = 2 / smoothTime;

        const x = omega * deltaTime;
        const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

        let change = current - target;
        const originalTo = target;

        // Clamp maximum speed
        const maxChange = maxSpeed * smoothTime;
        change = this.clamp(change, -maxChange, maxChange);
        target = current - change;

        const temp = (currentVelocity.value + omega * change) * deltaTime;
        currentVelocity.value = (currentVelocity.value - omega * temp) * exp;

        let output = target + (change + temp) * exp;

        // Prevent overshooting
        if (originalTo - current > 0 === output > originalTo) {
            output = originalTo;
            currentVelocity.value = (output - originalTo) / deltaTime;
        }

        return output;
    }

    /**
     * Smooth damp a Vector3 towards a target
     * @param current Current vector
     * @param target Target vector
     * @param currentVelocity Current velocity vector (will be modified)
     * @param smoothTime Approximate time to reach target
     * @param deltaTime Time step
     * @param maxSpeed Optional maximum speed limit
     * @returns New vector
     */
    public static smoothDampVector3(
        current: Vector3,
        target: Vector3,
        currentVelocity: Vector3,
        smoothTime: number,
        deltaTime: number,
        maxSpeed: number = Infinity
    ): Vector3 {
        // Apply smooth damp to each component
        const vx = { value: currentVelocity.x };
        const vy = { value: currentVelocity.y };
        const vz = { value: currentVelocity.z };

        const x = this.smoothDamp(current.x, target.x, vx, smoothTime, deltaTime, maxSpeed);
        const y = this.smoothDamp(current.y, target.y, vy, smoothTime, deltaTime, maxSpeed);
        const z = this.smoothDamp(current.z, target.z, vz, smoothTime, deltaTime, maxSpeed);

        // Update velocity vector
        currentVelocity.x = vx.value;
        currentVelocity.y = vy.value;
        currentVelocity.z = vz.value;

        return new Vector3(x, y, z);
    }

    /**
     * Perform spherical linear interpolation between two quaternions
     * @param from Starting quaternion
     * @param to Target quaternion
     * @param t Interpolation factor (0-1)
     * @returns Interpolated quaternion
     */
    public static slerp(from: Quaternion, to: Quaternion, t: number): Quaternion {
        return Quaternion.Slerp(from, to, t);
    }

    /**
     * Calculate a bezier curve point
     * @param t Curve parameter (0-1)
     * @param p0 Start point
     * @param p1 Control point 1
     * @param p2 Control point 2
     * @param p3 End point
     * @returns Point on the curve
     */
    public static bezierCurve(
        t: number,
        p0: Vector3,
        p1: Vector3,
        p2: Vector3,
        p3: Vector3
    ): Vector3 {
        const tt = t * t;
        const ttt = tt * t;
        const u = 1 - t;
        const uu = u * u;
        const uuu = uu * u;

        // Cubic Bezier formula
        const result = p0.scale(uuu)
            .add(p1.scale(3 * uu * t))
            .add(p2.scale(3 * u * tt))
            .add(p3.scale(ttt));

        return result;
    }

    /**
     * Hermite spline interpolation
     * @param t Parameter (0-1)
     * @param p0 Start point
     * @param m0 Start tangent
     * @param p1 End point
     * @param m1 End tangent
     * @returns Interpolated point
     */
    public static hermiteSpline(
        t: number,
        p0: Vector3,
        m0: Vector3,
        p1: Vector3,
        m1: Vector3
    ): Vector3 {
        const t2 = t * t;
        const t3 = t2 * t;

        // Hermite basis functions
        const h00 = 2 * t3 - 3 * t2 + 1;
        const h10 = t3 - 2 * t2 + t;
        const h01 = -2 * t3 + 3 * t2;
        const h11 = t3 - t2;

        // Hermite interpolation formula
        return p0.scale(h00).add(m0.scale(h10)).add(p1.scale(h01)).add(m1.scale(h11));
    }

    /**
     * Perform barycentric interpolation within a triangle
     * @param p Point to interpolate
     * @param a First triangle vertex
     * @param b Second triangle vertex
     * @param c Third triangle vertex
     * @returns Barycentric coordinates (u, v, w)
     */
    public static barycentric(
        p: Vector3,
        a: Vector3,
        b: Vector3,
        c: Vector3
    ): { u: number, v: number, w: number } {
        const v0 = b.subtract(a);
        const v1 = c.subtract(a);
        const v2 = p.subtract(a);

        const d00 = Vector3.Dot(v0, v0);
        const d01 = Vector3.Dot(v0, v1);
        const d11 = Vector3.Dot(v1, v1);
        const d20 = Vector3.Dot(v2, v0);
        const d21 = Vector3.Dot(v2, v1);

        const denom = d00 * d11 - d01 * d01;

        const v = (d11 * d20 - d01 * d21) / denom;
        const w = (d00 * d21 - d01 * d20) / denom;
        const u = 1.0 - v - w;

        return { u, v, w };
    }

    /**
     * Check if a point is inside a triangle
     * @param p Point to check
     * @param a First triangle vertex
     * @param b Second triangle vertex
     * @param c Third triangle vertex
     * @returns True if the point is inside the triangle
     */
    public static pointInTriangle(p: Vector3, a: Vector3, b: Vector3, c: Vector3): boolean {
        const { u, v, w } = this.barycentric(p, a, b, c);
        return u >= 0 && v >= 0 && w >= 0;
    }

    /**
     * Calculate the area of a triangle
     * @param a First vertex
     * @param b Second vertex
     * @param c Third vertex
     * @returns Triangle area
     */
    public static triangleArea(a: Vector3, b: Vector3, c: Vector3): number {
        const ab = b.subtract(a);
        const ac = c.subtract(a);
        const cross = Vector3.Cross(ab, ac);
        return cross.length() * 0.5;
    }

    /**
     * Perlin noise function (simplified 2D implementation)
     * @param x X coordinate
     * @param y Y coordinate
     * @returns Noise value between -1 and 1
     */
    public static perlinNoise(x: number, y: number): number {
        // Simple implementation for game purposes
        // For a complete implementation, consider using a dedicated noise library
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;

        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);

        const topRight = this.fade(xf) * this.fade(yf);
        const topLeft = this.fade(1 - xf) * this.fade(yf);
        const bottomRight = this.fade(xf) * this.fade(1 - yf);
        const bottomLeft = this.fade(1 - xf) * this.fade(1 - yf);

        const n1 = this.noise2D(X, Y);
        const n2 = this.noise2D(X + 1, Y);
        const n3 = this.noise2D(X, Y + 1);
        const n4 = this.noise2D(X + 1, Y + 1);

        return (n1 * bottomLeft + n2 * bottomRight + n3 * topLeft + n4 * topRight) * 2 - 1;
    }

    /**
     * Fade function for Perlin noise
     * @param t Parameter
     * @returns Faded value
     */
    private static fade(t: number): number {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    /**
     * 2D noise function
     * @param x X coordinate
     * @param y Y coordinate
     * @returns Noise value between 0 and 1
     */
    private static noise2D(x: number, y: number): number {
        const n = x + y * 57;
        const val = (n * 1337) ^ (n * 7331);
        return ((val << 13) ^ val) * ((val * (val * val * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824.0;
    }

    /**
     * Calculate a terrain height using multiple octaves of noise
     * @param x X coordinate
     * @param y Y coordinate
     * @param octaves Number of octaves
     * @param persistence Persistence value (0-1)
     * @param scale Scale factor
     * @returns Height value
     */
    public static terrainNoise(
        x: number,
        y: number,
        octaves: number = 6,
        persistence: number = 0.5,
        scale: number = 0.01
    ): number {
        let total = 0;
        let frequency = scale;
        let amplitude = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            total += this.perlinNoise(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }

        // Normalize to 0-1 range
        return (total / maxValue + 1) * 0.5;
    }
} 
