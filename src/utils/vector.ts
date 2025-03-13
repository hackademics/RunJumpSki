import { Vector2, Vector3, Vector4, Matrix, Quaternion } from '@babylonjs/core';
import { MathUtils } from './math';

/**
 * Vector utilities for additional vector operations
 */
export class VectorUtils {
    /**
     * Create a vector from spherical coordinates
     * @param radius Radius of the sphere
     * @param theta Polar angle in radians (0 to PI)
     * @param phi Azimuthal angle in radians (0 to 2PI)
     * @returns Vector3 position
     */
    public static fromSpherical(radius: number, theta: number, phi: number): Vector3 {
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
     * Convert a Vector3 to spherical coordinates
     * @param vector Vector to convert
     * @returns Object with radius, theta, and phi
     */
    public static toSpherical(vector: Vector3): { radius: number, theta: number, phi: number } {
        const radius = vector.length();
        if (radius === 0) {
            return { radius: 0, theta: 0, phi: 0 };
        }

        const theta = Math.acos(MathUtils.clamp(vector.y / radius, -1, 1));
        const phi = Math.atan2(vector.z, vector.x);

        return {
            radius,
            theta,
            phi: phi < 0 ? phi + Math.PI * 2 : phi
        };
    }

    /**
     * Create a vector from cylindrical coordinates
     * @param radius Radius from the y-axis
     * @param theta Angle around the y-axis in radians
     * @param y Height along the y-axis
     * @returns Vector3 position
     */
    public static fromCylindrical(radius: number, theta: number, y: number): Vector3 {
        return new Vector3(
            radius * Math.cos(theta),
            y,
            radius * Math.sin(theta)
        );
    }

    /**
     * Convert a Vector3 to cylindrical coordinates
     * @param vector Vector to convert
     * @returns Object with radius, theta, and y
     */
    public static toCylindrical(vector: Vector3): { radius: number, theta: number, y: number } {
        const radius = Math.sqrt(vector.x * vector.x + vector.z * vector.z);
        const theta = Math.atan2(vector.z, vector.x);

        return {
            radius,
            theta: theta < 0 ? theta + Math.PI * 2 : theta,
            y: vector.y
        };
    }

    /**
     * Calculate the component of a vector in a given direction
     * @param vector The vector to project
     * @param direction The direction to project onto
     * @returns Scalar component
     */
    public static componentAlong(vector: Vector3, direction: Vector3): number {
        const normalizedDirection = direction.normalize();
        return Vector3.Dot(vector, normalizedDirection);
    }

    /**
     * Project a vector onto another vector
     * @param vector The vector to project
     * @param onto The vector to project onto
     * @returns Projected vector
     */
    public static projectOnto(vector: Vector3, onto: Vector3): Vector3 {
        const normalizedOnto = onto.normalize();
        const dot = Vector3.Dot(vector, normalizedOnto);
        return normalizedOnto.scale(dot);
    }

    /**
     * Reject a vector from another vector (opposite of projection)
     * @param vector The vector to reject
     * @param from The vector to reject from
     * @returns Rejected vector
     */
    public static reject(vector: Vector3, from: Vector3): Vector3 {
        const projection = this.projectOnto(vector, from);
        return vector.subtract(projection);
    }

    /**
     * Calculate the angle between the XZ components of two vectors
     * @param v1 First vector
     * @param v2 Second vector
     * @returns Angle in radians
     */
    public static horizontalAngle(v1: Vector3, v2: Vector3): number {
        const h1 = new Vector3(v1.x, 0, v1.z).normalize();
        const h2 = new Vector3(v2.x, 0, v2.z).normalize();

        const dot = Vector3.Dot(h1, h2);
        return Math.acos(MathUtils.clamp(dot, -1, 1));
    }

    /**
     * Calculate the signed horizontal angle between two vectors
     * @param v1 First vector
     * @param v2 Second vector
     * @returns Signed angle in radians
     */
    public static signedHorizontalAngle(v1: Vector3, v2: Vector3): number {
        const h1 = new Vector3(v1.x, 0, v1.z).normalize();
        const h2 = new Vector3(v2.x, 0, v2.z).normalize();

        return Math.atan2(h1.x * h2.z - h1.z * h2.x, h1.x * h2.x + h1.z * h2.z);
    }

    /**
     * Rotate a vector around an axis
     * @param vector Vector to rotate
     * @param axis Axis to rotate around
     * @param angle Angle in radians
     * @returns Rotated vector
     */
    public static rotateAround(vector: Vector3, axis: Vector3, angle: number): Vector3 {
        const q = Quaternion.RotationAxis(axis.normalize(), angle);
        return vector.rotateByQuaternionToRef(q, new Vector3());
    }

    /**
     * Rotate a vector around the Y axis
     * @param vector Vector to rotate
     * @param angle Angle in radians
     * @returns Rotated vector
     */
    public static rotateAroundY(vector: Vector3, angle: number): Vector3 {
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);

        return new Vector3(
            vector.x * cos - vector.z * sin,
            vector.y,
            vector.x * sin + vector.z * cos
        );
    }

    /**
     * Calculate distance from a point to a line
     * @param point Point to measure from
     * @param lineStart Start of the line
     * @param lineEnd End of the line
     * @returns Distance from point to line
     */
    public static distanceToLine(point: Vector3, lineStart: Vector3, lineEnd: Vector3): number {
        const line = lineEnd.subtract(lineStart);
        const len = line.length();

        if (len === 0) {
            return point.subtract(lineStart).length();
        }

        const lineDir = line.normalize();
        const pointDir = point.subtract(lineStart);
        const projection = Vector3.Dot(pointDir, lineDir);

        // If projection is negative, point is behind the line start
        if (projection <= 0) {
            return pointDir.length();
        }

        // If projection is greater than line length, point is beyond line end
        if (projection >= len) {
            return point.subtract(lineEnd).length();
        }

        // Calculate perpendicular distance
        const projectedPoint = lineStart.add(lineDir.scale(projection));
        return point.subtract(projectedPoint).length();
    }

    /**
     * Calculate closest point on a line to a given point
     * @param point Point to find closest point for
     * @param lineStart Start of the line
     * @param lineEnd End of the line
     * @returns Closest point on the line
     */
    public static closestPointOnLine(point: Vector3, lineStart: Vector3, lineEnd: Vector3): Vector3 {
        const line = lineEnd.subtract(lineStart);
        const len = line.length();

        if (len === 0) {
            return lineStart.clone();
        }

        const lineDir = line.normalize();
        const pointDir = point.subtract(lineStart);
        const projection = Vector3.Dot(pointDir, lineDir);

        // Clamp projection to line segment
        const clampedProjection = MathUtils.clamp(projection, 0, len);

        return lineStart.add(lineDir.scale(clampedProjection));
    }

    /**
     * Calculate the closest point on a plane to a given point
     * @param point Point to find closest point for
     * @param planePoint A point on the plane
     * @param planeNormal The plane normal
     * @returns Closest point on the plane
     */
    public static closestPointOnPlane(point: Vector3, planePoint: Vector3, planeNormal: Vector3): Vector3 {
        const normalizedNormal = planeNormal.normalize();
        const distance = Vector3.Dot(point.subtract(planePoint), normalizedNormal);
        return point.subtract(normalizedNormal.scale(distance));
    }

    /**
     * Check if a point is within a specified radius of a line segment
     * @param point Point to check
     * @param lineStart Start of the line
     * @param lineEnd End of the line
     * @param radius Distance threshold
     * @returns True if the point is within radius of the line segment
     */
    public static isPointNearLine(point: Vector3, lineStart: Vector3, lineEnd: Vector3, radius: number): boolean {
        return this.distanceToLine(point, lineStart, lineEnd) <= radius;
    }

    /**
     * Check if a moving sphere will collide with a line segment
     * @param sphereCenter Sphere center
     * @param sphereRadius Sphere radius
     * @param sphereVelocity Sphere velocity
     * @param lineStart Start of the line
     * @param lineEnd End of the line
     * @param deltaTime Time step
     * @returns Object with collision information
     */
    public static sphereLineCollision(
        sphereCenter: Vector3,
        sphereRadius: number,
        sphereVelocity: Vector3,
        lineStart: Vector3,
        lineEnd: Vector3,
        deltaTime: number
    ): { collision: boolean, time: number, point: Vector3, normal: Vector3 } | null {
        // Simplified collision detection for a moving sphere against a static line
        // Uses swept sphere approach

        // Check if the sphere is already colliding with the line
        if (this.distanceToLine(sphereCenter, lineStart, lineEnd) <= sphereRadius) {
            const closestPoint = this.closestPointOnLine(sphereCenter, lineStart, lineEnd);
            const normal = sphereCenter.subtract(closestPoint).normalize();

            return {
                collision: true,
                time: 0,
                point: closestPoint,
                normal
            };
        }

        // Check if the sphere will collide with the line during this time step
        const futureCenter = sphereCenter.add(sphereVelocity.scale(deltaTime));

        // Simple approach: check several points along the trajectory
        const steps = 10;
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const testPos = Vector3.Lerp(sphereCenter, futureCenter, t);

            if (this.distanceToLine(testPos, lineStart, lineEnd) <= sphereRadius) {
                const closestPoint = this.closestPointOnLine(testPos, lineStart, lineEnd);
                const normal = testPos.subtract(closestPoint).normalize();

                return {
                    collision: true,
                    time: t * deltaTime,
                    point: closestPoint,
                    normal
                };
            }
        }

        return null;
    }

    /**
     * Calculate distance from a point to a plane
     * @param point Point to measure from
     * @param planePoint A point on the plane
     * @param planeNormal The plane normal
     * @returns Signed distance (negative if behind plane)
     */
    public static distanceToPlane(point: Vector3, planePoint: Vector3, planeNormal: Vector3): number {
        const normalizedNormal = planeNormal.normalize();
        return Vector3.Dot(point.subtract(planePoint), normalizedNormal);
    }

    /**
     * Check if a ray intersects a plane
     * @param rayOrigin Ray origin
     * @param rayDirection Ray direction (normalized)
     * @param planePoint A point on the plane
     * @param planeNormal The plane normal
     * @returns Intersection information or null
     */
    public static rayPlaneIntersection(
        rayOrigin: Vector3,
        rayDirection: Vector3,
        planePoint: Vector3,
        planeNormal: Vector3
    ): { point: Vector3, distance: number } | null {
        const normalizedNormal = planeNormal.normalize();
        const denominator = Vector3.Dot(rayDirection, normalizedNormal);

        // Check if ray is parallel to plane
        if (Math.abs(denominator) < 0.0001) {
            return null;
        }

        const t = Vector3.Dot(planePoint.subtract(rayOrigin), normalizedNormal) / denominator;

        // Check if intersection is behind ray origin
        if (t < 0) {
            return null;
        }

        return {
            point: rayOrigin.add(rayDirection.scale(t)),
            distance: t
        };
    }

    /**
     * Check if a ray intersects a sphere
     * @param rayOrigin Ray origin
     * @param rayDirection Ray direction (normalized)
     * @param sphereCenter Sphere center
     * @param sphereRadius Sphere radius
     * @returns Intersection information or null
     */
    public static raySphereIntersection(
        rayOrigin: Vector3,
        rayDirection: Vector3,
        sphereCenter: Vector3,
        sphereRadius: number
    ): { entry: Vector3, exit: Vector3, entryDistance: number, exitDistance: number } | null {
        const m = rayOrigin.subtract(sphereCenter);
        const b = Vector3.Dot(m, rayDirection);
        const c = Vector3.Dot(m, m) - sphereRadius * sphereRadius;

        // Exit if ray origin is outside sphere and ray is pointing away from sphere
        if (c > 0 && b > 0) {
            return null;
        }

        const discriminant = b * b - c;

        // If discriminant is negative, ray misses sphere
        if (discriminant < 0) {
            return null;
        }

        // Calculate intersection distances
        const sqrtDiscriminant = Math.sqrt(discriminant);
        const t1 = -b - sqrtDiscriminant;
        const t2 = -b + sqrtDiscriminant;

        // Calculate intersection points
        const entry = rayOrigin.add(rayDirection.scale(t1 > 0 ? t1 : 0));
        const exit = rayOrigin.add(rayDirection.scale(t2));

        return {
            entry,
            exit,
            entryDistance: t1 > 0 ? t1 : 0,
            exitDistance: t2
        };
    }

    /**
     * Check if a ray intersects a triangle
     * @param rayOrigin Ray origin
     * @param rayDirection Ray direction (normalized)
     * @param v0 First triangle vertex
     * @param v1 Second triangle vertex
     * @param v2 Third triangle vertex
     * @returns Intersection information or null
     */
    public static rayTriangleIntersection(
        rayOrigin: Vector3,
        rayDirection: Vector3,
        v0: Vector3,
        v1: Vector3,
        v2: Vector3
    ): { point: Vector3, distance: number, barycentric: { u: number, v: number, w: number } } | null {
        // Calculate triangle normal
        const edge1 = v1.subtract(v0);
        const edge2 = v2.subtract(v0);
        const normal = Vector3.Cross(edge1, edge2).normalize();

        // Check if ray is parallel to triangle
        const dotNormalDir = Vector3.Dot(normal, rayDirection);
        if (Math.abs(dotNormalDir) < 0.0001) {
            return null;
        }

        // Calculate intersection with triangle plane
        const d = -Vector3.Dot(normal, v0);
        const t = -(Vector3.Dot(normal, rayOrigin) + d) / dotNormalDir;

        // Check if triangle is behind ray
        if (t < 0) {
            return null;
        }

        // Calculate intersection point
        const intersection = rayOrigin.add(rayDirection.scale(t));

        // Check if point is inside triangle using barycentric coordinates
        const barycentric = MathUtils.barycentric(intersection, v0, v1, v2);

        if (barycentric.u >= 0 && barycentric.v >= 0 && barycentric.w >= 0 &&
            barycentric.u <= 1 && barycentric.v <= 1 && barycentric.w <= 1) {
            return {
                point: intersection,
                distance: t,
                barycentric
            };
        }

        return null;
    }

    /**
     * Decompose a vector into components parallel and perpendicular to a reference vector
     * @param vector Vector to decompose
     * @param reference Reference vector
     * @returns Object with parallel and perpendicular components
     */
    public static decomposeVector(vector: Vector3, reference: Vector3): { parallel: Vector3, perpendicular: Vector3 } {
        const parallel = this.projectOnto(vector, reference);
        const perpendicular = vector.subtract(parallel);

        return { parallel, perpendicular };
    }

    /**
     * Limit a vector to a maximum magnitude
     * @param vector Vector to limit
     * @param maxMagnitude Maximum allowed magnitude
     * @returns Limited vector
     */
    public static limitVector(vector: Vector3, maxMagnitude: number): Vector3 {
        const magnitude = vector.length();

        if (magnitude > maxMagnitude) {
            return vector.normalize().scale(maxMagnitude);
        }

        return vector.clone();
    }

    /**
     * Create a rotation from a direction vector (looking along the direction)
     * @param direction Direction to look at
     * @param upVector Up vector reference (default is world up)
     * @returns Quaternion representing the rotation
     */
    public static rotationFromDirection(direction: Vector3, upVector: Vector3 = new Vector3(0, 1, 0)): Quaternion {
        // Handle case of vector pointing straight up or down
        if (Math.abs(Vector3.Dot(direction.normalize(), upVector.normalize())) > 0.99) {
            const slight = new Vector3(0.01, 0, 0);
            direction = direction.add(slight).normalize();
        }

        // Create look-at matrix and extract rotation quaternion
        const matrix = Matrix.LookAtLH(Vector3.Zero(), direction, upVector);
        const rotation = Quaternion.FromRotationMatrix(matrix.invert());

        return rotation;
    }

    /**
     * Calculate a facing direction from Euler angles
     * @param yaw Yaw angle in radians (around Y axis)
     * @param pitch Pitch angle in radians (around X axis)
     * @returns Direction vector
     */
    public static directionFromAngles(yaw: number, pitch: number): Vector3 {
        const cosPitch = Math.cos(pitch);

        return new Vector3(
            Math.sin(yaw) * cosPitch,
            Math.sin(pitch),
            Math.cos(yaw) * cosPitch
        ).normalize();
    }

    /**
     * Calculate Euler angles from a direction vector
     * @param direction Direction vector
     * @returns Object with yaw and pitch in radians
     */
    public static anglesToDirection(direction: Vector3): { yaw: number, pitch: number } {
        const normalizedDir = direction.normalize();

        return {
            yaw: Math.atan2(normalizedDir.x, normalizedDir.z),
            pitch: Math.asin(MathUtils.clamp(normalizedDir.y, -1, 1))
        };
    }

    /**
     * Smoothly interpolate between two vectors
     * @param current Current vector
     * @param target Target vector
     * @param smoothFactor Smoothing factor (0-1, smaller is smoother)
     * @param deltaTime Time step
     * @returns Interpolated vector
     */
    public static smoothVector(current: Vector3, target: Vector3, smoothFactor: number, deltaTime: number): Vector3 {
        const t = MathUtils.clamp(1.0 - Math.pow(smoothFactor, deltaTime), 0, 1);
        return Vector3.Lerp(current, target, t);
    }

    /**
     * Calculate steering force for seeking a target
     * @param position Current position
     * @param velocity Current velocity
     * @param target Target position
     * @param maxSpeed Maximum speed
     * @param maxForce Maximum steering force
     * @returns Steering force vector
     */
    public static seekForce(
        position: Vector3,
        velocity: Vector3,
        target: Vector3,
        maxSpeed: number,
        maxForce: number
    ): Vector3 {
        // Calculate desired velocity
        const desired = target.subtract(position).normalize().scale(maxSpeed);

        // Calculate steering force
        const steering = desired.subtract(velocity);

        // Limit to maximum force
        return this.limitVector(steering, maxForce);
    }

    /**
     * Calculate steering force for arriving at a target with deceleration
     * @param position Current position
     * @param velocity Current velocity
     * @param target Target position
     * @param maxSpeed Maximum speed
     * @param maxForce Maximum steering force
     * @param slowingDistance Distance to start slowing down
     * @returns Steering force vector
     */
    public static arriveForce(
        position: Vector3,
        velocity: Vector3,
        target: Vector3,
        maxSpeed: number,
        maxForce: number,
        slowingDistance: number
    ): Vector3 {
        // Calculate desired velocity
        const toTarget = target.subtract(position);
        const distance = toTarget.length();

        // Use maximum speed until within slowing distance
        let speed = maxSpeed;
        if (distance < slowingDistance) {
            speed = maxSpeed * (distance / slowingDistance);
        }

        const desired = distance > 0
            ? toTarget.normalize().scale(speed)
            : new Vector3(0, 0, 0);

        // Calculate steering force
        const steering = desired.subtract(velocity);

        // Limit to maximum force
        return this.limitVector(steering, maxForce);
    }

    /**
     * Calculate steering force for avoidance of an obstacle
     * @param position Current position
     * @param velocity Current velocity
     * @param obstacle Obstacle position
     * @param obstacleRadius Obstacle radius
     * @param maxSpeed Maximum speed
     * @param maxForce Maximum steering force
     * @param lookAheadDistance Distance to look ahead for obstacles
     * @returns Steering force vector
     */
    public static avoidForce(
        position: Vector3,
        velocity: Vector3,
        obstacle: Vector3,
        obstacleRadius: number,
        maxSpeed: number,
        maxForce: number,
        lookAheadDistance: number
    ): Vector3 {
        if (velocity.length() < 0.01) {
            return new Vector3(0, 0, 0);
        }

        // Calculate look-ahead position
        const direction = velocity.normalize();
        const lookAhead = position.add(direction.scale(lookAheadDistance));

        // Calculate distance to obstacle
        const toObstacle = obstacle.subtract(position);
        const distance = toObstacle.length();

        // Check if obstacle is too far to worry about
        if (distance > lookAheadDistance + obstacleRadius) {
            return new Vector3(0, 0, 0);
        }

        // Check if we're on collision course
        const closestDistance = this.distanceToLine(obstacle, position, lookAhead);

        if (closestDistance > obstacleRadius) {
            return new Vector3(0, 0, 0);
        }

        // Calculate avoidance force
        const closestPoint = this.closestPointOnLine(obstacle, position, lookAhead);
        const avoidDirection = closestPoint.subtract(obstacle).normalize();

        // Scale force by how close we are to collision and how soon it will happen
        const avoidanceForce = avoidDirection.scale(maxForce);

        return avoidanceForce;
    }
}
