/**
 * MathUtils.ts
 * Utility functions for mathematical operations
 */

import { Vector3 } from '../types/common/Vector3';

export class MathUtils {
    /**
     * Small value for floating-point comparisons
     */
    public static readonly EPSILON: number = 1e-6;

    /**
     * Standard gravity acceleration (m/s²)
     */
    public static readonly GRAVITY: number = 9.81;

    /**
     * Convert degrees to radians
     * @param degrees Angle in degrees
     * @returns Angle in radians
     */
    public static toRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    /**
     * Convert radians to degrees
     * @param radians Angle in radians
     * @returns Angle in degrees
     */
    public static toDegrees(radians: number): number {
        return radians * (180 / Math.PI);
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
     * Linear interpolation between two values
     * @param a Start value
     * @param b End value
     * @param t Interpolation factor (0-1)
     * @returns Interpolated value
     */
    public static lerp(a: number, b: number, t: number): number {
        t = MathUtils.clamp(t, 0, 1);
        return a + (b - a) * t;
    }

    /**
     * Smooth step interpolation
     * @param a Start value
     * @param b End value
     * @param t Interpolation factor (0-1)
     * @returns Smoothly interpolated value
     */
    public static smoothStep(a: number, b: number, t: number): number {
        t = MathUtils.clamp(t, 0, 1);
        t = t * t * (3 - 2 * t); // Smooth step formula
        return a + (b - a) * t;
    }

    /**
     * Smoother step interpolation (Ken Perlin's version)
     * @param a Start value
     * @param b End value
     * @param t Interpolation factor (0-1)
     * @returns More smoothly interpolated value
     */
    public static smootherStep(a: number, b: number, t: number): number {
        t = MathUtils.clamp(t, 0, 1);
        t = t * t * t * (t * (t * 6 - 15) + 10); // Smoother step formula
        return a + (b - a) * t;
    }

    /**
     * Calculate the angle between two vectors in radians
     * @param a First vector
     * @param b Second vector
     * @returns Angle in radians
     */
    public static angleBetween(a: Vector3, b: Vector3): number {
        const dot = a.dot(b);
        const lenA = a.length();
        const lenB = b.length();
        
        if (lenA === 0 || lenB === 0) {
            return 0;
        }
        
        const cosAngle = MathUtils.clamp(dot / (lenA * lenB), -1, 1);
        return Math.acos(cosAngle);
    }

    /**
     * Calculate the signed angle between two vectors around an axis
     * @param a First vector
     * @param b Second vector
     * @param axis Axis to measure angle around
     * @returns Signed angle in radians
     */
    public static signedAngleBetween(a: Vector3, b: Vector3, axis: Vector3): number {
        const angle = MathUtils.angleBetween(a, b);
        const cross = a.cross(b);
        const dot = cross.dot(axis);
        
        return dot < 0 ? -angle : angle;
    }

    /**
     * Calculate the reflection of a vector off a surface with normal
     * @param vector Incident vector
     * @param normal Surface normal
     * @returns Reflected vector
     */
    public static reflect(vector: Vector3, normal: Vector3): Vector3 {
        const normalizedNormal = normal.normalize();
        const dot = vector.dot(normalizedNormal);
        return vector.subtract(normalizedNormal.scale(2 * dot));
    }

    /**
     * Calculate the projection of a vector onto another vector
     * @param vector Vector to project
     * @param onto Vector to project onto
     * @returns Projected vector
     */
    public static projectVector(vector: Vector3, onto: Vector3): Vector3 {
        const ontoNormalized = onto.normalize();
        const dot = vector.dot(ontoNormalized);
        return ontoNormalized.scale(dot);
    }

    /**
     * Calculate the rejection of a vector from another vector
     * (component perpendicular to the onto vector)
     * @param vector Vector to reject
     * @param from Vector to reject from
     * @returns Rejected vector
     */
    public static rejectVector(vector: Vector3, from: Vector3): Vector3 {
        const projection = MathUtils.projectVector(vector, from);
        return vector.subtract(projection);
    }

    /**
     * Calculate the slope angle of a surface normal
     * @param normal Surface normal
     * @returns Slope angle in degrees
     */
    static slopeAngle(normal: Vector3): number {
        return MathUtils.angleBetween(normal, Vector3.up());
    }

    /**
     * Calculate the direction of a slope
     * @param normal Surface normal
     * @returns Direction of the slope (normalized)
     */
    static slopeDirection(normal: Vector3): Vector3 {
        // If normal is pointing straight up, return zero vector
        if (normal.equals(Vector3.up())) {
            return Vector3.zero();
        }
        
        // Project normal onto horizontal plane
        const horizontalNormal = new Vector3(normal.x, 0, normal.z);
        
        // If horizontal component is too small, return zero vector
        if (horizontalNormal.lengthSquared() < 0.0001) {
            return Vector3.zero();
        }
        
        // Return normalized direction
        return horizontalNormal.normalize();
    }

    /**
     * Generate a random number between min and max
     * @param min Minimum value
     * @param max Maximum value
     * @returns Random number
     */
    public static random(min: number, max: number): number {
        return min + Math.random() * (max - min);
    }

    /**
     * Generate a random integer between min and max (inclusive)
     * @param min Minimum value
     * @param max Maximum value
     * @returns Random integer
     */
    public static randomInt(min: number, max: number): number {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Generate a random point inside a sphere
     * @param radius Sphere radius
     * @returns Random point
     */
    public static randomPointInSphere(radius: number): Vector3 {
        // Generate random spherical coordinates
        const theta = MathUtils.random(0, Math.PI * 2);
        const phi = MathUtils.random(0, Math.PI);
        const r = MathUtils.random(0, radius);
        
        // Convert to Cartesian coordinates
        return Vector3.FromSpherical(r, theta, phi);
    }

    /**
     * Generate a random point on a sphere surface
     * @param radius Sphere radius
     * @returns Random point
     */
    public static randomPointOnSphere(radius: number): Vector3 {
        // Generate random spherical coordinates
        const theta = MathUtils.random(0, Math.PI * 2);
        const phi = MathUtils.random(0, Math.PI);
        
        // Convert to Cartesian coordinates
        return Vector3.FromSpherical(radius, theta, phi);
    }

    /**
     * Calculate spring force
     * @param currentPos Current position
     * @param restPos Rest position
     * @param springConstant Spring constant
     * @param damping Damping factor
     * @param velocity Current velocity
     * @returns Spring force
     */
    public static springForce(
        currentPos: Vector3, 
        restPos: Vector3, 
        springConstant: number, 
        damping: number, 
        velocity: Vector3
    ): Vector3 {
        // Calculate displacement from rest position
        const displacement = restPos.subtract(currentPos);
        
        // Calculate spring force (F = -kx)
        const springForce = displacement.scale(springConstant);
        
        // Calculate damping force (F = -bv)
        const dampingForce = velocity.scale(-damping);
        
        // Return total force
        return springForce.add(dampingForce);
    }

    /**
     * Check if a point is inside a sphere
     * @param point Point to check
     * @param center Sphere center
     * @param radius Sphere radius
     * @returns Whether the point is inside the sphere
     */
    public static isPointInSphere(point: Vector3, center: Vector3, radius: number): boolean {
        return Vector3.DistanceSquared(point, center) <= radius * radius;
    }

    /**
     * Check if a ray intersects a sphere
     * @param rayOrigin Ray origin
     * @param rayDirection Ray direction (normalized)
     * @param sphereCenter Sphere center
     * @param sphereRadius Sphere radius
     * @returns Distance to intersection or -1 if no intersection
     */
    public static rayIntersectsSphere(
        rayOrigin: Vector3, 
        rayDirection: Vector3, 
        sphereCenter: Vector3, 
        sphereRadius: number
    ): number {
        const oc = rayOrigin.subtract(sphereCenter);
        const a = rayDirection.dot(rayDirection);
        const b = 2.0 * oc.dot(rayDirection);
        const c = oc.dot(oc) - sphereRadius * sphereRadius;
        const discriminant = b * b - 4 * a * c;
        
        if (discriminant < 0) {
            return -1;
        }
        
        const t = (-b - Math.sqrt(discriminant)) / (2.0 * a);
        return t >= 0 ? t : -1;
    }

    /**
     * Approximate equality check for floating-point numbers
     * @param a First value
     * @param b Second value
     * @param epsilon Tolerance (default: EPSILON)
     * @returns Whether the values are approximately equal
     */
    public static approximately(a: number, b: number, epsilon: number = MathUtils.EPSILON): boolean {
        return Math.abs(a - b) < epsilon;
    }

    /**
     * Calculate gravity force based on slope
     * @param normal Surface normal
     * @param mass Object mass
     * @param gravity Gravity strength
     * @returns Gravity force vector
     */
    static calculateGravityForce(normal: Vector3, mass: number, gravity: number): Vector3 {
        // Calculate gravity direction (down)
        const gravityDir = Vector3.down();
        
        // Calculate gravity force magnitude
        const gravityForce = gravityDir.scale(mass * gravity);
        
        // Project gravity onto the slope
        const normalComponent = normal.scale(gravityForce.dot(normal));
        const tangentialComponent = gravityForce.subtract(normalComponent);
        
        return tangentialComponent;
    }

    /**
     * Calculate friction force
     * @param normal Normal force magnitude
     * @param frictionCoefficient Coefficient of friction
     * @param velocityDirection Direction of velocity (normalized)
     * @returns Friction force vector
     */
    public static calculateFrictionForce(
        normal: number, 
        frictionCoefficient: number, 
        velocityDirection: Vector3
    ): Vector3 {
        // Calculate friction magnitude (F = μN)
        const frictionMagnitude = normal * frictionCoefficient;
        
        // Friction acts opposite to velocity
        return velocityDirection.scale(-frictionMagnitude);
    }

    /**
     * Calculate drag force
     * @param velocity Velocity vector
     * @param dragCoefficient Drag coefficient
     * @param area Cross-sectional area
     * @param airDensity Air density (default: 1.225 kg/m³)
     * @returns Drag force vector
     */
    public static calculateDragForce(
        velocity: Vector3, 
        dragCoefficient: number, 
        area: number, 
        airDensity: number = 1.225
    ): Vector3 {
        const speed = velocity.length();
        
        // If not moving, no drag
        if (speed < MathUtils.EPSILON) {
            return Vector3.zero();
        }
        
        // Calculate drag magnitude (F = 0.5 * ρ * v² * Cd * A)
        const dragMagnitude = 0.5 * airDensity * speed * speed * dragCoefficient * area;
        
        // Drag acts opposite to velocity
        return velocity.normalize().scale(-dragMagnitude);
    }

    /**
     * Calculate collision response (bounce)
     * @param velocity Incoming velocity
     * @param normal Surface normal
     * @param restitution Coefficient of restitution (bounciness)
     * @returns New velocity after collision
     */
    public static calculateCollisionResponse(
        velocity: Vector3, 
        normal: Vector3, 
        restitution: number
    ): Vector3 {
        // Calculate velocity component along normal
        const normalVelocity = normal.scale(velocity.dot(normal));
        
        // Calculate tangential velocity component
        const tangentialVelocity = velocity.subtract(normalVelocity);
        
        // Apply restitution to normal component (bounce)
        const newNormalVelocity = normalVelocity.scale(-restitution);
        
        // Return combined velocity
        return tangentialVelocity.add(newNormalVelocity);
    }

    /**
     * Predict position after time with constant velocity
     * @param initialPosition Initial position
     * @param velocity Velocity vector
     * @param time Time in seconds
     * @returns Predicted position
     */
    public static predictPosition(
        initialPosition: Vector3, 
        velocity: Vector3, 
        time: number
    ): Vector3 {
        return initialPosition.add(velocity.scale(time));
    }

    /**
     * Predict position after time with constant acceleration
     * @param initialPosition Initial position
     * @param initialVelocity Initial velocity
     * @param acceleration Acceleration vector
     * @param time Time in seconds
     * @returns Predicted position
     */
    public static predictPositionWithAcceleration(
        initialPosition: Vector3, 
        initialVelocity: Vector3, 
        acceleration: Vector3, 
        time: number
    ): Vector3 {
        // p = p0 + v0*t + 0.5*a*t²
        const velocityComponent = initialVelocity.scale(time);
        const accelerationComponent = acceleration.scale(0.5 * time * time);
        return initialPosition.add(velocityComponent).add(accelerationComponent);
    }

    /**
     * Calculate the force needed to reach a target velocity in a given time
     * @param mass Object mass
     * @param currentVelocity Current velocity
     * @param targetVelocity Target velocity
     * @param time Time to reach target
     * @returns Force vector
     */
    public static calculateForceToReachVelocity(
        mass: number,
        currentVelocity: Vector3,
        targetVelocity: Vector3,
        time: number
    ): Vector3 {
        // Calculate required acceleration: a = (v_target - v_current) / time
        const velocityDifference = targetVelocity.subtract(currentVelocity);
        const requiredAcceleration = velocityDifference.scale(1 / time);
        
        // Calculate force: F = m * a
        return requiredAcceleration.scale(mass);
    }

    /**
     * Check if a ray intersects a plane
     * @param rayOrigin Ray origin
     * @param rayDirection Ray direction (normalized)
     * @param planePoint Point on the plane
     * @param planeNormal Plane normal (normalized)
     * @returns Distance to intersection or -1 if no intersection
     */
    public static rayIntersectsPlane(
        rayOrigin: Vector3,
        rayDirection: Vector3,
        planePoint: Vector3,
        planeNormal: Vector3
    ): number {
        const denominator = rayDirection.dot(planeNormal);
        
        // Ray is parallel to the plane
        if (Math.abs(denominator) < MathUtils.EPSILON) {
            return -1;
        }
        
        const t = planePoint.subtract(rayOrigin).dot(planeNormal) / denominator;
        
        // Intersection is behind the ray origin
        if (t < 0) {
            return -1;
        }
        
        return t;
    }

    /**
     * Calculate the shortest distance from a point to a line
     * @param point Point
     * @param linePoint Point on the line
     * @param lineDirection Line direction (normalized)
     * @returns Shortest distance
     */
    public static pointToLineDistance(
        point: Vector3,
        linePoint: Vector3,
        lineDirection: Vector3
    ): number {
        const toPoint = point.subtract(linePoint);
        const projection = MathUtils.projectVector(toPoint, lineDirection);
        const perpendicular = toPoint.subtract(projection);
        return perpendicular.length();
    }

    /**
     * Calculate the slope direction from a normal vector
     * @param normal Surface normal
     * @returns Slope direction vector (normalized)
     */
    public static slopeDirectionFromNormal(normal: Vector3): Vector3 {
        // Project normal onto horizontal plane
        const normalHorizontal = new Vector3(normal.x, 0, normal.z);
        
        // If the normal is nearly vertical, return zero vector
        if (normalHorizontal.lengthSquared() < 0.0001) {
            return Vector3.zero();
        }
        
        // Direction is perpendicular to horizontal component of normal
        return new Vector3(-normal.x, 0, -normal.z).normalize();
    }
}
