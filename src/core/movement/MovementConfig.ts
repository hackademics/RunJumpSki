import { MovementConfig } from './IMovementSystem';

/**
 * Default configuration for the movement system
 */
export const DEFAULT_MOVEMENT_CONFIG: MovementConfig = {
    // Basic movement
    walkSpeed: 5,         // Units per second
    runSpeed: 10,        // Units per second
    jumpForce: 8,        // Impulse force
    airControl: 0.3,     // Multiplier for air movement
    groundFriction: 0.1, // Ground friction coefficient
    airFriction: 0.01,   // Air friction coefficient

    // Skiing
    skiMinSlope: 0.2,    // Minimum slope angle in radians (approx. 11.5 degrees)
    skiMaxSlope: 0.8,    // Maximum slope angle in radians (approx. 45.8 degrees)
    skiAcceleration: 15, // Base acceleration while skiing
    skiDeceleration: 5,  // Deceleration when not actively skiing
    skiTurnRate: 2,      // How quickly the ski direction can change
    skiGroundFriction: 0.05, // Friction coefficient while skiing

    // Jetpack
    jetpackMaxForce: 12,     // Maximum force the jetpack can apply
    jetpackAcceleration: 20, // How quickly the jetpack reaches max force
    jetpackFuelCapacity: 100, // Maximum fuel amount
    jetpackFuelConsumption: 25, // Fuel consumed per second
    jetpackFuelRegenRate: 10,   // Fuel regenerated per second when not in use
    jetpackMinFuelToActivate: 20 // Minimum fuel required to activate jetpack
}; 