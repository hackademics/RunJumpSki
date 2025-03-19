/**
 * @file src/core/debug/visual/PlayerPhysicsVisualizer.ts
 * @description Provides visualization of player movement physics using the DebugRenderer.
 */

import * as BABYLON from 'babylonjs';
import { DebugRenderer } from '../DebugRenderer';
import { Scene } from 'babylonjs';

/**
 * Options for player physics visualization
 */
export interface PlayerPhysicsVisualizerOptions {
  /**
   * Whether to visualize velocity vectors
   */
  showVelocity?: boolean;
  
  /**
   * Whether to visualize ground normal vector
   */
  showGroundNormal?: boolean;
  
  /**
   * Whether to visualize movement state
   */
  showMovementState?: boolean;
  
  /**
   * Whether to visualize jetpack thrust
   */
  showJetpackThrust?: boolean;
  
  /**
   * Whether to visualize skiing friction
   */
  showSkiingFriction?: boolean;
  
  /**
   * Whether to show player trajectory prediction
   */
  showTrajectory?: boolean;
  
  /**
   * Scale factor for velocity vector
   */
  velocityScale?: number;
  
  /**
   * Scale factor for ground normal vector
   */
  normalScale?: number;
  
  /**
   * Scale factor for jetpack thrust
   */
  thrustScale?: number;
  
  /**
   * Scale factor for friction force
   */
  frictionScale?: number;
  
  /**
   * Color for velocity vector
   */
  velocityColor?: BABYLON.Color3;
  
  /**
   * Color for ground normal vector
   */
  normalColor?: BABYLON.Color3;
  
  /**
   * Color for jetpack thrust
   */
  thrustColor?: BABYLON.Color3;
  
  /**
   * Color for friction force
   */
  frictionColor?: BABYLON.Color3;
  
  /**
   * Color for trajectory prediction
   */
  trajectoryColor?: BABYLON.Color3;
  
  /**
   * Color for player character base visualization
   */
  playerColor?: BABYLON.Color3;
  
  /**
   * Number of points to use for trajectory prediction
   */
  trajectoryPoints?: number;
  
  /**
   * Time interval for trajectory prediction (in seconds)
   */
  trajectoryTimeStep?: number;
  
  /**
   * Total time to predict trajectory for (in seconds)
   */
  trajectoryTime?: number;
}

/**
 * Default options for player physics visualization
 */
const DEFAULT_OPTIONS: PlayerPhysicsVisualizerOptions = {
  showVelocity: true,
  showGroundNormal: true,
  showMovementState: true,
  showJetpackThrust: true,
  showSkiingFriction: true,
  showTrajectory: true,
  velocityScale: 0.3,
  normalScale: 1.0,
  thrustScale: 0.5,
  frictionScale: 0.5,
  velocityColor: new BABYLON.Color3(0, 0, 1),
  normalColor: new BABYLON.Color3(0, 1, 0),
  thrustColor: new BABYLON.Color3(1, 0.5, 0),
  frictionColor: new BABYLON.Color3(1, 0, 0),
  trajectoryColor: new BABYLON.Color3(0.5, 0.5, 1),
  playerColor: new BABYLON.Color3(0, 0.8, 0.8),
  trajectoryPoints: 20,
  trajectoryTimeStep: 0.1,
  trajectoryTime: 2.0
};

/**
 * Movement states for player visualization
 */
export enum PlayerMovementState {
  STANDING = 'standing',
  WALKING = 'walking',
  RUNNING = 'running',
  JUMPING = 'jumping',
  FALLING = 'falling',
  SKIING = 'skiing',
  JETPACK = 'jetpack',
  SLIDING = 'sliding'
}

/**
 * Player physics data for visualization
 */
export interface PlayerPhysicsData {
  /**
   * Player position
   */
  position: BABYLON.Vector3;
  
  /**
   * Player velocity
   */
  velocity: BABYLON.Vector3;
  
  /**
   * Player facing direction
   */
  direction: BABYLON.Vector3;
  
  /**
   * Player up vector
   */
  up: BABYLON.Vector3;
  
  /**
   * Whether player is grounded
   */
  grounded: boolean;
  
  /**
   * Normal of the ground surface player is standing on (if grounded)
   */
  groundNormal?: BABYLON.Vector3;
  
  /**
   * Current player movement state
   */
  movementState: PlayerMovementState;
  
  /**
   * Jetpack thrust force (if using jetpack)
   */
  jetpackThrust?: BABYLON.Vector3;
  
  /**
   * Skiing friction force (if skiing)
   */
  skiingFriction?: BABYLON.Vector3;
  
  /**
   * Player mass for physics calculations
   */
  mass: number;
  
  /**
   * Player height (for visualization)
   */
  height: number;
  
  /**
   * Player radius (for visualization)
   */
  radius: number;
}

/**
 * Visualizes player movement physics
 */
export class PlayerPhysicsVisualizer {
  private debugRenderer: DebugRenderer;
  private options: PlayerPhysicsVisualizerOptions;
  private scene: Scene;
  private enabled: boolean = false;
  private playerData: PlayerPhysicsData | null = null;
  private visualizationIds: {
    playerBody?: string;
    velocity?: string;
    groundNormal?: string;
    jetpackThrust?: string;
    skiingFriction?: string;
    trajectoryPoints?: string[];
    trajectoryLines?: string[];
    stateText?: string;
  } = {};
  
  /**
   * Creates a new player physics visualizer
   * @param debugRenderer Debug renderer to use for visualization
   * @param scene The Babylon.js scene
   * @param options Visualization options
   */
  constructor(
    debugRenderer: DebugRenderer,
    scene: Scene,
    options: Partial<PlayerPhysicsVisualizerOptions> = {}
  ) {
    this.debugRenderer = debugRenderer;
    this.scene = scene;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.visualizationIds = {};
  }
  
  /**
   * Updates the player physics data to visualize
   * @param playerData Current player physics data
   */
  public updatePlayerData(playerData: PlayerPhysicsData): void {
    this.playerData = playerData;
    
    // Update visualization if enabled
    if (this.enabled) {
      this.updateVisualization();
    }
  }
  
  /**
   * Enables player physics visualization
   */
  public enable(): void {
    if (this.enabled) return;
    
    this.enabled = true;
    
    // Update visualization if player data exists
    if (this.playerData) {
      this.updateVisualization();
    }
  }
  
  /**
   * Disables player physics visualization
   */
  public disable(): void {
    if (!this.enabled) return;
    
    this.enabled = false;
    this.clearVisualization();
  }
  
  /**
   * Toggles player physics visualization
   */
  public toggle(): void {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
  }
  
  /**
   * Check if visualization is enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Updates the visualization based on current player data
   */
  private updateVisualization(): void {
    if (!this.enabled || !this.playerData) return;
    
    // Clear previous visualization
    this.clearVisualization();
    
    // Visualize player body
    this.visualizePlayerBody();
    
    // Visualize velocity
    if (this.options.showVelocity) {
      this.visualizeVelocity();
    }
    
    // Visualize ground normal
    if (this.options.showGroundNormal && this.playerData.grounded && this.playerData.groundNormal) {
      this.visualizeGroundNormal();
    }
    
    // Visualize jetpack thrust
    if (this.options.showJetpackThrust && 
        this.playerData.movementState === PlayerMovementState.JETPACK && 
        this.playerData.jetpackThrust) {
      this.visualizeJetpackThrust();
    }
    
    // Visualize skiing friction
    if (this.options.showSkiingFriction && 
        this.playerData.movementState === PlayerMovementState.SKIING && 
        this.playerData.skiingFriction) {
      this.visualizeSkiingFriction();
    }
    
    // Visualize trajectory prediction
    if (this.options.showTrajectory) {
      this.visualizeTrajectory();
    }
    
    // Visualize movement state
    if (this.options.showMovementState) {
      this.visualizeMovementState();
    }
  }
  
  /**
   * Visualizes the player's body
   */
  private visualizePlayerBody(): void {
    if (!this.playerData) return;
    
    // Create capsule for player body
    const position = this.playerData.position.clone();
    const height = this.playerData.height;
    const radius = this.playerData.radius;
    const upVector = this.playerData.up;
    
    // Visualize player capsule
    this.visualizationIds.playerBody = 'player_body';
    
    // Half height of capsule without hemispheres
    const halfHeight = height / 2 - radius;
    
    // Get capsule start and end points
    const start = position.add(upVector.scale(-halfHeight));
    const end = position.add(upVector.scale(halfHeight));
    
    this.debugRenderer.showCapsule(
      this.visualizationIds.playerBody,
      start,
      end,
      radius,
      this.options.playerColor
    );
  }
  
  /**
   * Visualizes the player's velocity
   */
  private visualizeVelocity(): void {
    if (!this.playerData) return;
    
    const { position, velocity } = this.playerData;
    
    // Skip if velocity is very small
    if (velocity.length() < 0.01) return;
    
    // Create velocity vector
    this.visualizationIds.velocity = 'player_velocity';
    this.debugRenderer.showVector(
      this.visualizationIds.velocity,
      position,
      velocity.scale(this.options.velocityScale!),
      this.options.velocityColor
    );
  }
  
  /**
   * Visualizes the ground normal
   */
  private visualizeGroundNormal(): void {
    if (!this.playerData || !this.playerData.groundNormal) return;
    
    const { position, groundNormal } = this.playerData;
    
    // Create ground normal vector
    this.visualizationIds.groundNormal = 'player_ground_normal';
    this.debugRenderer.showVector(
      this.visualizationIds.groundNormal,
      position,
      groundNormal.scale(this.options.normalScale!),
      this.options.normalColor
    );
  }
  
  /**
   * Visualizes jetpack thrust
   */
  private visualizeJetpackThrust(): void {
    if (!this.playerData || !this.playerData.jetpackThrust) return;
    
    const { position, jetpackThrust } = this.playerData;
    
    // Create jetpack thrust vector
    this.visualizationIds.jetpackThrust = 'player_jetpack_thrust';
    this.debugRenderer.showVector(
      this.visualizationIds.jetpackThrust,
      position,
      jetpackThrust.scale(this.options.thrustScale!),
      this.options.thrustColor
    );
  }
  
  /**
   * Visualizes skiing friction
   */
  private visualizeSkiingFriction(): void {
    if (!this.playerData || !this.playerData.skiingFriction) return;
    
    const { position, skiingFriction } = this.playerData;
    
    // Create skiing friction vector
    this.visualizationIds.skiingFriction = 'player_skiing_friction';
    this.debugRenderer.showVector(
      this.visualizationIds.skiingFriction,
      position,
      skiingFriction.scale(this.options.frictionScale!),
      this.options.frictionColor
    );
  }
  
  /**
   * Visualizes the predicted trajectory
   */
  private visualizeTrajectory(): void {
    if (!this.playerData) return;
    
    const { position, velocity, mass } = this.playerData;
    
    // Initialize trajectory arrays if needed
    if (!this.visualizationIds.trajectoryPoints) {
      this.visualizationIds.trajectoryPoints = [];
    }
    
    if (!this.visualizationIds.trajectoryLines) {
      this.visualizationIds.trajectoryLines = [];
    }
    
    // Clear previous trajectory points and lines
    this.clearTrajectory();
    
    // Predict trajectory using simple physics
    const gravity = new BABYLON.Vector3(0, -9.81, 0);
    const timeStep = this.options.trajectoryTimeStep!;
    const numSteps = Math.floor(this.options.trajectoryTime! / timeStep);
    
    // Variables for simulation
    let currentPos = position.clone();
    let currentVel = velocity.clone();
    let prevPos = currentPos.clone();
    
    // Array to store trajectory points
    const trajectoryPoints: BABYLON.Vector3[] = [currentPos.clone()];
    
    // Simulate physics for trajectory
    for (let i = 0; i < numSteps; i++) {
      // Store previous position
      prevPos.copyFrom(currentPos);
      
      // Apply gravity (and any other forces)
      const acceleration = gravity.clone();
      
      // Update velocity
      currentVel.addInPlace(acceleration.scale(timeStep));
      
      // Update position
      currentPos.addInPlace(currentVel.scale(timeStep));
      
      // Add point to trajectory
      trajectoryPoints.push(currentPos.clone());
      
      // Visualize point
      const pointId = `trajectory_point_${i}`;
      this.debugRenderer.showCollisionPoint(
        pointId,
        currentPos,
        0.05,
        this.options.trajectoryColor
      );
      this.visualizationIds.trajectoryPoints.push(pointId);
      
      // Visualize line segment
      if (i > 0) {
        const lineId = `trajectory_line_${i}`;
        const linePoints = [prevPos, currentPos];
        const lineMesh = this.debugRenderer.showVector(
          lineId,
          prevPos,
          currentPos.subtract(prevPos),
          this.options.trajectoryColor
        );
        this.visualizationIds.trajectoryLines.push(lineId);
      }
    }
  }
  
  /**
   * Clears trajectory visualization
   */
  private clearTrajectory(): void {
    // Clear trajectory points
    if (this.visualizationIds.trajectoryPoints) {
      this.visualizationIds.trajectoryPoints.forEach(id => {
        this.debugRenderer.removeDebugSphere(id);
      });
      this.visualizationIds.trajectoryPoints = [];
    }
    
    // Clear trajectory lines
    if (this.visualizationIds.trajectoryLines) {
      this.visualizationIds.trajectoryLines.forEach(id => {
        this.debugRenderer.removeDebugVector(id);
      });
      this.visualizationIds.trajectoryLines = [];
    }
  }
  
  /**
   * Visualizes the current movement state
   */
  private visualizeMovementState(): void {
    if (!this.playerData) return;
    
    // TODO: Add GUI text visualization for movement state
    // This would typically require the GUI system from BabylonJS
    // For simplicity, this implementation uses debug spheres with different colors
    
    // Get position above player
    const position = this.playerData.position.clone();
    position.y += this.playerData.height + 0.5;
    
    // Use different colors for different movement states
    let stateColor: BABYLON.Color3;
    
    switch (this.playerData.movementState) {
      case PlayerMovementState.STANDING:
        stateColor = new BABYLON.Color3(0.5, 0.5, 0.5); // Gray
        break;
      case PlayerMovementState.WALKING:
        stateColor = new BABYLON.Color3(0, 0.5, 0); // Dark green
        break;
      case PlayerMovementState.RUNNING:
        stateColor = new BABYLON.Color3(0, 1, 0); // Bright green
        break;
      case PlayerMovementState.JUMPING:
        stateColor = new BABYLON.Color3(1, 1, 0); // Yellow
        break;
      case PlayerMovementState.FALLING:
        stateColor = new BABYLON.Color3(1, 0.5, 0); // Orange
        break;
      case PlayerMovementState.SKIING:
        stateColor = new BABYLON.Color3(0, 0, 1); // Blue
        break;
      case PlayerMovementState.JETPACK:
        stateColor = new BABYLON.Color3(1, 0, 1); // Magenta
        break;
      case PlayerMovementState.SLIDING:
        stateColor = new BABYLON.Color3(0, 1, 1); // Cyan
        break;
      default:
        stateColor = new BABYLON.Color3(1, 1, 1); // White
    }
    
    // Create state indicator
    const stateId = 'player_state';
    this.debugRenderer.showCollisionPoint(stateId, position, 0.2, stateColor);
    
    // Store ID for cleanup
    this.visualizationIds.stateText = stateId;
  }
  
  /**
   * Clears all visualizations
   */
  private clearVisualization(): void {
    // Clear player body
    if (this.visualizationIds.playerBody) {
      this.debugRenderer.removeDebugMesh(this.visualizationIds.playerBody);
      this.visualizationIds.playerBody = undefined;
    }
    
    // Clear velocity vector
    if (this.visualizationIds.velocity) {
      this.debugRenderer.removeDebugVector(this.visualizationIds.velocity);
      this.visualizationIds.velocity = undefined;
    }
    
    // Clear ground normal vector
    if (this.visualizationIds.groundNormal) {
      this.debugRenderer.removeDebugVector(this.visualizationIds.groundNormal);
      this.visualizationIds.groundNormal = undefined;
    }
    
    // Clear jetpack thrust vector
    if (this.visualizationIds.jetpackThrust) {
      this.debugRenderer.removeDebugVector(this.visualizationIds.jetpackThrust);
      this.visualizationIds.jetpackThrust = undefined;
    }
    
    // Clear skiing friction vector
    if (this.visualizationIds.skiingFriction) {
      this.debugRenderer.removeDebugVector(this.visualizationIds.skiingFriction);
      this.visualizationIds.skiingFriction = undefined;
    }
    
    // Clear trajectory
    this.clearTrajectory();
    
    // Clear state text
    if (this.visualizationIds.stateText) {
      this.debugRenderer.removeDebugSphere(this.visualizationIds.stateText);
      this.visualizationIds.stateText = undefined;
    }
  }
  
  /**
   * Cleans up resources
   */
  public dispose(): void {
    this.disable();
    this.playerData = null;
  }
} 