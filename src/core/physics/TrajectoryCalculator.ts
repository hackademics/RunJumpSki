/**
 * @file src/core/physics/TrajectoryCalculator.ts
 * @description Utility for calculating projectile trajectories
 */

import * as BABYLON from 'babylonjs';
import { ProjectileConfig } from './IProjectilePhysics';

/**
 * Options for trajectory calculation
 */
export interface TrajectoryCalculationOptions {
  /**
   * Starting position of the trajectory
   */
  startPosition: BABYLON.Vector3;
  
  /**
   * Initial direction (will be normalized)
   */
  direction: BABYLON.Vector3;
  
  /**
   * Projectile configuration
   */
  projectileConfig: ProjectileConfig;
  
  /**
   * Gravitational acceleration vector (defaults to scene gravity or 9.81 m/s² downward)
   */
  gravity?: BABYLON.Vector3;
  
  /**
   * Maximum simulation time in seconds
   */
  maxTime?: number;
  
  /**
   * Time step for simulation in seconds
   */
  timeStep?: number;
  
  /**
   * Maximum number of points to generate
   */
  maxPoints?: number;
}

/**
 * Default options for trajectory calculation
 */
const DEFAULT_TRAJECTORY_OPTIONS: Partial<TrajectoryCalculationOptions> = {
  gravity: new BABYLON.Vector3(0, -9.81, 0),
  maxTime: 10,
  timeStep: 0.05,
  maxPoints: 200
};

/**
 * Result of a trajectory calculation
 */
export interface TrajectoryResult {
  /**
   * Array of positions along the trajectory
   */
  points: BABYLON.Vector3[];
  
  /**
   * Array of velocities at each point
   */
  velocities: BABYLON.Vector3[];
  
  /**
   * Time values for each point
   */
  times: number[];
  
  /**
   * Estimated maximum height reached
   */
  maxHeight: number;
  
  /**
   * Estimated total distance traveled
   */
  totalDistance: number;
  
  /**
   * Estimated flight time before hitting ground or maxTime
   */
  flightTime: number;
}

/**
 * Utility class for calculating projectile trajectories
 */
export class TrajectoryCalculator {
  /**
   * Calculate a projectile trajectory based on the given options
   * @param options Trajectory calculation options
   * @returns Calculated trajectory
   */
  public static calculateTrajectory(options: TrajectoryCalculationOptions): TrajectoryResult {
    // Merge with default options
    const config = {
      ...DEFAULT_TRAJECTORY_OPTIONS,
      ...options
    };
    
    const { 
      startPosition, 
      direction, 
      projectileConfig,
      gravity, 
      maxTime, 
      timeStep,
      maxPoints
    } = config;
    
    // Normalize direction
    const normalizedDirection = direction.normalize();
    
    // Initialize trajectory data
    const points: BABYLON.Vector3[] = [];
    const velocities: BABYLON.Vector3[] = [];
    const times: number[] = [];
    
    // Initial conditions
    let position = startPosition.clone();
    let velocity = normalizedDirection.scale(projectileConfig.initialVelocity);
    let time = 0;
    let maxHeight = startPosition.y;
    let totalDistance = 0;
    let prevPosition = position.clone();
    
    // Add initial point
    points.push(position.clone());
    velocities.push(velocity.clone());
    times.push(time);
    
    // Integration loop
    while (time < maxTime! && points.length < maxPoints!) {
      // Increment time
      time += timeStep!;
      
      // Calculate drag force
      let acceleration = new BABYLON.Vector3(0, 0, 0);
      
      // Add gravity if projectile is affected by it
      if (projectileConfig.affectedByGravity) {
        acceleration.addInPlace(gravity!);
      }
      
      // Calculate air resistance (drag)
      if (velocity.length() > 0) {
        // F_drag = 0.5 * dragCoeff * velocity^2 * direction
        const velocitySquared = velocity.length() ** 2;
        const dragMagnitude = 0.5 * projectileConfig.dragCoefficient * velocitySquared;
        
        const dragDirection = velocity.normalize().scale(-1);
        const dragForce = dragDirection.scale(dragMagnitude);
        
        // a = F/m
        acceleration.addInPlace(dragForce.scale(1 / projectileConfig.mass));
      }
      
      // Update velocity: v = v0 + a*t
      velocity.addInPlace(acceleration.scale(timeStep!));
      
      // Update position: p = p0 + v*t
      const positionDelta = velocity.scale(timeStep!);
      position.addInPlace(positionDelta);
      
      // Check if it's hit the ground (y=0 plane)
      if (prevPosition.y >= 0 && position.y < 0) {
        // Linear interpolation to find exact ground hit point
        const t = -prevPosition.y / (position.y - prevPosition.y);
        const hitPoint = new BABYLON.Vector3(
          prevPosition.x + t * (position.x - prevPosition.x),
          0,
          prevPosition.z + t * (position.z - prevPosition.z)
        );
        
        // Update final point and break
        position = hitPoint;
        time = times[times.length - 1] + t * timeStep!;
        
        points.push(position.clone());
        velocities.push(velocity.clone());
        times.push(time);
        
        // Update total distance
        totalDistance += BABYLON.Vector3.Distance(prevPosition, position);
        break;
      }
      
      // Update max height
      maxHeight = Math.max(maxHeight, position.y);
      
      // Add point to trajectory
      points.push(position.clone());
      velocities.push(velocity.clone());
      times.push(time);
      
      // Update total distance
      totalDistance += BABYLON.Vector3.Distance(prevPosition, position);
      
      // Store current position for next iteration
      prevPosition = position.clone();
    }
    
    return {
      points,
      velocities,
      times,
      maxHeight,
      totalDistance,
      flightTime: times[times.length - 1]
    };
  }
  
  /**
   * Create a visual trajectory line in the scene
   * @param scene Babylon.js scene
   * @param trajectory Trajectory result to visualize
   * @param color Color of the trajectory line
   * @param width Width of the trajectory line
   * @returns Line mesh representing the trajectory
   */
  public static createTrajectoryLine(
    scene: BABYLON.Scene,
    trajectory: TrajectoryResult,
    color: BABYLON.Color3 = new BABYLON.Color3(1, 0.5, 0),
    width: number = 2
  ): BABYLON.Mesh {
    // Create a line system
    const line = BABYLON.MeshBuilder.CreateLines(
      "trajectory_line",
      { points: trajectory.points },
      scene
    );
    
    // Set line properties
    line.color = color;
    line.billboardMode = BABYLON.Mesh.BILLBOARDMODE_NONE;
    line.isPickable = false;
    
    // Create material for the line
    const material = new BABYLON.StandardMaterial("trajectory_material", scene);
    material.emissiveColor = color;
    material.disableLighting = true;
    line.material = material;
    
    return line;
  }
  
  /**
   * Calculate aim parameters for hitting a target at a specific position
   * @param startPosition Starting position
   * @param targetPosition Target position to hit
   * @param projectileConfig Projectile configuration
   * @param gravity Gravity vector (defaults to 9.81 m/s² downward)
   * @returns Array of possible launch angles in radians, or empty array if no solution
   */
  public static calculateAimAngles(
    startPosition: BABYLON.Vector3,
    targetPosition: BABYLON.Vector3,
    projectileConfig: ProjectileConfig,
    gravity: BABYLON.Vector3 = new BABYLON.Vector3(0, -9.81, 0)
  ): number[] {
    // Not affected by gravity = direct path
    if (!projectileConfig.affectedByGravity) {
      const direction = targetPosition.subtract(startPosition).normalize();
      return [Math.atan2(direction.y, Math.sqrt(direction.x * direction.x + direction.z * direction.z))];
    }
    
    // Set up the problem in 2D (vertical plane containing start and target)
    const horizontalDistance = new BABYLON.Vector3(
      targetPosition.x - startPosition.x,
      0,
      targetPosition.z - startPosition.z
    ).length();
    
    const verticalDistance = targetPosition.y - startPosition.y;
    const gravityMagnitude = gravity.length();
    
    // Use quadratic formula to solve for launch angle
    // We have: tan(angle) = (v₀² ± sqrt(v₀⁴ - g(g*x² + 2y*v₀²))) / (g*x)
    const velocity = projectileConfig.initialVelocity;
    const velocitySquared = velocity * velocity;
    
    const discriminant = velocitySquared * velocitySquared - 
                         gravityMagnitude * (gravityMagnitude * horizontalDistance * horizontalDistance + 
                                          2 * verticalDistance * velocitySquared);
    
    // No solution if discriminant is negative
    if (discriminant < 0) {
      return [];
    }
    
    const sqrtDiscriminant = Math.sqrt(discriminant);
    const denominator = gravityMagnitude * horizontalDistance;
    
    // Calculate both potential solutions
    const angle1 = Math.atan2(velocitySquared + sqrtDiscriminant, denominator);
    const angle2 = Math.atan2(velocitySquared - sqrtDiscriminant, denominator);
    
    // Return results as array
    const results = [];
    if (!isNaN(angle1)) results.push(angle1);
    if (!isNaN(angle2) && Math.abs(angle1 - angle2) > 0.01) results.push(angle2);
    
    return results;
  }
} 