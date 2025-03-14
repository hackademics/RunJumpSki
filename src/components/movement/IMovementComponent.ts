/**
 * IMovementComponent.ts
 * Interface for movement component
 */

import { Vector3 } from '../../types/common/Vector3';
import { IComponent } from '../../entities/IEntity';
import { MovementState, TerrainData, MovementStateHandler } from './MovementState';

/**
 * Movement component interface
 */
export interface IMovementComponent extends IComponent {
    /**
     * Get the current movement state
     * @returns Current movement state
     */
    getState(): MovementState;

    /**
     * Get the state handler for a specific state
     * @param state Movement state
     * @returns State handler for the specified state
     */
    getStateHandler(state: MovementState): MovementStateHandler;

    /**
     * Get the current state handler
     * @returns Current state handler
     */
    getCurrentStateHandler(): MovementStateHandler;

    /**
     * Transition to a new state
     * @param newState New state
     * @param reason Reason for transition
     * @returns Whether the transition was successful
     */
    transitionToState(newState: MovementState, reason: string): boolean;

    /**
     * Get the current velocity
     * @returns Current velocity
     */
    getVelocity(): Vector3;

    /**
     * Get the current speed (magnitude of velocity)
     * @returns Current speed
     */
    getSpeed(): number;

    /**
     * Get the current energy level
     * @returns Current energy level
     */
    getEnergy(): number;

    /**
     * Get the maximum energy level
     * @returns Maximum energy level
     */
    getMaxEnergy(): number;

    /**
     * Get the time spent in the current state
     * @returns Time in seconds
     */
    getTimeInState(): number;

    /**
     * Check if the entity is grounded
     * @returns Whether the entity is grounded
     */
    isGrounded(): boolean;

    /**
     * Get the current terrain data
     * @returns Current terrain data or undefined if not grounded
     */
    getTerrainData(): TerrainData | undefined;

    /**
     * Apply a force to the entity
     * @param force Force vector
     * @param contactPoint Contact point (optional)
     */
    applyForce(force: Vector3, contactPoint?: Vector3): void;

    /**
     * Apply an impulse to the entity
     * @param impulse Impulse vector
     * @param contactPoint Contact point (optional)
     */
    applyImpulse(impulse: Vector3, contactPoint?: Vector3): void;

    /**
     * Set the velocity directly
     * @param velocity New velocity
     */
    setVelocity(velocity: Vector3): void;

    /**
     * Set the movement input
     * @param forward Forward input (-1 to 1)
     * @param right Right input (-1 to 1)
     */
    setMovementInput(forward: number, right: number): void;

    /**
     * Set the jump input
     * @param jumping Whether jump is pressed
     */
    setJumpInput(jumping: boolean): void;

    /**
     * Try to perform a jump
     * @returns Whether the jump was successful
     */
    tryJump(): boolean;

    /**
     * Check if jump is on cooldown
     * @returns Object with isOnCooldown status and remainingTime in seconds
     */
    getJumpCooldownStatus(): { isOnCooldown: boolean; remainingTime: number };

    /**
     * Set the jump cooldown time
     * @param cooldownTime Cooldown time in seconds
     */
    setJumpCooldownTime(cooldownTime: number): void;

    /**
     * Set the ski input
     * @param skiing Whether ski is held
     */
    setSkiInput(skiing: boolean): void;

    /**
     * Set the jetpack input
     * @param jetpacking Whether jetpack is held
     */
    setJetpackInput(jetpacking: boolean): void;

    /**
     * Update terrain data for movement calculations
     * @param terrainData Terrain data
     */
    updateTerrainData(terrainData: TerrainData): void;

    /**
     * Perform a disk jump
     * @param direction Direction to jump
     * @returns Whether the disk jump was successful
     */
    diskJump(direction: Vector3): boolean;

    /**
     * Apply weapon recoil
     * @param direction Direction of recoil
     * @param force Force of recoil
     */
    applyWeaponRecoil(direction: Vector3, force: number): void;

    /**
     * Set the grounded state
     * @param grounded Whether the entity is grounded
     */
    setGrounded(grounded: boolean): void;

    /**
     * Set the energy level
     * @param energy New energy level
     */
    setEnergy(energy: number): void;

    /**
     * Add energy
     * @param amount Amount to add
     * @returns New energy level
     */
    addEnergy(amount: number): number;

    /**
     * Use energy
     * @param amount Amount to use
     * @returns Whether there was enough energy
     */
    useEnergy(amount: number): boolean;

    /**
     * Get the movement parameters
     * @returns Movement parameters
     */
    getMovementParams(): {
        runSpeed: number;
        jumpForce: number;
        airControl: number;
        jetpackForce: number;
        maxSpeed: number;
        gravity: number;
    };

    /**
     * Set a movement parameter
     * @param param Parameter name
     * @param value New value
     */
    setMovementParam(
        param: 'runSpeed' | 'jumpForce' | 'airControl' | 'jetpackForce' | 'maxSpeed' | 'gravity',
        value: number
    ): void;

    /**
     * Reset the movement component to its default state
     */
    reset(): void;
}
