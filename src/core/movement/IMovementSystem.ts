import { Vector3 } from '../../types/core/MathTypes';
import { PhysicsImpostor } from 'babylonjs';

/**
 * Configuration for the movement system
 */
export interface MovementConfig {
    // Basic movement
    walkSpeed: number;
    runSpeed: number;
    jumpForce: number;
    airControl: number;
    groundFriction: number;
    airFriction: number;

    // Skiing
    skiMinSlope: number;
    skiMaxSlope: number;
    skiAcceleration: number;
    skiDeceleration: number;
    skiTurnRate: number;
    skiGroundFriction: number;

    // Jetpack
    jetpackMaxForce: number;
    jetpackAcceleration: number;
    jetpackFuelCapacity: number;
    jetpackFuelConsumption: number;
    jetpackFuelRegenRate: number;
    jetpackMinFuelToActivate: number;
}

/**
 * Current state of movement
 */
export interface MovementState {
    // Basic state
    isGrounded: boolean;
    isJumping: boolean;
    isRunning: boolean;
    velocity: Vector3;
    
    // Skiing state
    isSkiing: boolean;
    skiSpeed: number;
    skiDirection: Vector3;
    slopeAngle: number;
    
    // Jetpack state
    isJetpackActive: boolean;
    jetpackFuel: number;
    jetpackForce: Vector3;
}

/**
 * Movement input data
 */
export interface MovementInput {
    moveDirection: Vector3;
    lookDirection: Vector3;
    jump: boolean;
    run: boolean;
    ski: boolean;
    jetpack: boolean;
}

/**
 * Interface for the movement system
 */
export interface IMovementSystem {
    /**
     * Initialize the movement system
     */
    initialize(config: MovementConfig): void;

    /**
     * Attach physics body for movement
     */
    attachBody(body: PhysicsImpostor): void;

    /**
     * Update movement based on input
     */
    update(input: MovementInput, deltaTime: number): void;

    /**
     * Get current movement state
     */
    getState(): MovementState;

    /**
     * Set position directly (for teleporting/respawning)
     */
    setPosition(position: Vector3): void;

    /**
     * Set rotation directly
     */
    setRotation(rotation: Vector3): void;

    /**
     * Reset movement state (e.g., after death)
     */
    reset(): void;

    /**
     * Clean up resources
     */
    dispose(): void;

    // Event handlers
    onGroundContact(callback: (normal: Vector3) => void): void;
    onJumpStart(callback: () => void): void;
    onJumpEnd(callback: () => void): void;
    onSkiStart(callback: () => void): void;
    onSkiEnd(callback: () => void): void;
    onJetpackStart(callback: () => void): void;
    onJetpackEnd(callback: () => void): void;
} 