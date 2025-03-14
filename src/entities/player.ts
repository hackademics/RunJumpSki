/**
 * Player.ts
 * Player entity implementation
 */

import { Entity } from './Entity';
import { Vector3 } from '../types/common/Vector3';
import { MovementComponent } from '../components/movement/MovementComponent';
import { InputSystem } from '../input/InputSystem';
import { InputAction } from '../input/InputMapping';
import { Logger } from '../utils/Logger';
import { PhysicsConfig } from '../config/PhysicsConfig';
import { VisualEffectsComponent } from '../components/visual/VisualEffectsComponent';
import { MathUtils } from '../utils/MathUtils';
import { CameraComponent } from '../components/camera/CameraComponent';

/**
 * Player entity
 */
export class Player extends Entity {
    private playerLogger: Logger;
    private inputSystem: InputSystem;
    private movementComponent: MovementComponent;
    private visualEffectsComponent: VisualEffectsComponent;
    private cameraComponent: CameraComponent;
    
    // Camera constraints
    private readonly MAX_PITCH = MathUtils.toRadians(85); // 85 degrees up/down limit
    
    /**
     * Create a new Player
     * @param position Initial position
     * @param rotation Initial rotation
     */
    constructor(
        position: Vector3 = new Vector3(0, 0, 0),
        rotation: Vector3 = new Vector3(0, 0, 0)
    ) {
        super('Player', position, rotation);
        
        this.playerLogger = new Logger('Player');
        this.inputSystem = InputSystem.getInstance();
        
        // Create and add movement component
        this.movementComponent = new MovementComponent();
        this.addComponent('movement', this.movementComponent);
        
        // Create and add visual effects component
        this.visualEffectsComponent = new VisualEffectsComponent();
        this.addComponent('visualEffects', this.visualEffectsComponent);
        
        // Create and add camera component
        this.cameraComponent = new CameraComponent();
        this.addComponent('camera', this.cameraComponent);
        
        this.playerLogger.debug('Player created');
    }
    
    /**
     * Initialize the player
     */
    public override init(): void {
        this.playerLogger.debug('Initializing player');
        
        // Initialize input system
        this.inputSystem.init();
        
        // Initialize components
        super.init();
    }
    
    /**
     * Update the player
     * @param deltaTime Time since last update in seconds
     */
    public override update(deltaTime: number): void {
        // Update input system
        this.inputSystem.update(deltaTime);
        
        // Process input
        this.processInput(deltaTime);
        
        // Update camera speed for dynamic FOV
        if (this.movementComponent && this.cameraComponent) {
            const speed = this.movementComponent.getSpeed();
            this.cameraComponent.setSpeed(speed);
        }
        
        // Update components
        super.update(deltaTime);
    }
    
    /**
     * Clean up the player
     */
    public override dispose(): void {
        this.playerLogger.debug('Disposing player');
        
        // Dispose components
        super.dispose();
    }
    
    /**
     * Process player input
     * @param deltaTime Time since last update in seconds
     */
    private processInput(deltaTime: number): void {
        // Get movement input
        const movementInput = this.inputSystem.getMovementInput();
        
        // Transform movement input based on player orientation
        // Only use the horizontal component of the forward vector for movement
        const forwardDir = this.transform.getForwardVector();
        const horizontalForward = new Vector3(forwardDir.x, 0, forwardDir.z).normalizeInPlace();
        const rightDir = this.transform.getRightVector();
        
        // Scale the direction vectors by the input values
        const forward = horizontalForward.scale(movementInput.z);
        const right = rightDir.scale(movementInput.x);
        
        // Combine movement vectors
        const moveDirection = forward.add(right);
        
        // Set movement input on movement component
        if (moveDirection.lengthSquared() > 0) {
            // Normalize and extract forward/right components
            moveDirection.normalizeInPlace();
            
            // Project the movement direction onto the forward and right axes
            const forwardAmount = moveDirection.dot(horizontalForward);
            const rightAmount = moveDirection.dot(rightDir);
            
            this.movementComponent.setMovementInput(forwardAmount, rightAmount);
        } else {
            this.movementComponent.setMovementInput(0, 0);
        }
        
        // Process jump input - check for both just pressed and held states
        const jumpPressed = this.inputSystem.isActionActive(InputAction.JUMP, 'held');
        const jumpJustPressed = this.inputSystem.isActionActive(InputAction.JUMP, 'pressed');
        
        // If jump was just pressed, we'll try to jump immediately
        if (jumpJustPressed) {
            this.playerLogger.debug('Jump key just pressed, attempting to jump');
            this.movementComponent.tryJump();
        }
        
        // Always update the jump input state
        this.movementComponent.setJumpInput(jumpPressed);
        
        // Process ski input
        const skiPressed = this.inputSystem.isActionActive(InputAction.SKI, 'held');
        this.movementComponent.setSkiInput(skiPressed);
        
        // Process jetpack input
        const jetpackPressed = this.inputSystem.isActionActive(InputAction.JETPACK, 'held');
        this.movementComponent.setJetpackInput(jetpackPressed);
        
        // Process look input
        this.processLookInput();
    }
    
    /**
     * Process look input
     */
    private processLookInput(): void {
        const lookInput = this.inputSystem.getLookInput();
        if (lookInput.x !== 0 || lookInput.y !== 0) {
            // Apply mouse sensitivity
            const sensitivity = this.cameraComponent.getSensitivity();
            
            // Update yaw (horizontal rotation)
            const yaw = -lookInput.x * sensitivity;
            this.transform.rotate(Vector3.up(), yaw);
            
            // Update pitch (vertical rotation) with clamping
            const pitch = -lookInput.y * sensitivity;
            
            // Get current pitch and add new input
            let newPitch = this.cameraComponent.getPitch() + pitch;
            
            // Set the new pitch on the camera component (it will handle clamping)
            this.cameraComponent.setPitch(newPitch);
        }
    }
    
    /**
     * Get the player's movement component
     * @returns Movement component
     */
    public getMovementComponent(): MovementComponent {
        return this.movementComponent;
    }
    
    /**
     * Get the player's current speed
     * @returns Current speed
     */
    public getSpeed(): number {
        return this.movementComponent.getSpeed();
    }
    
    /**
     * Get the player's current energy level
     * @returns Current energy level
     */
    public getEnergy(): number {
        return this.movementComponent.getEnergy();
    }
    
    /**
     * Get the camera component
     * @returns Camera component
     */
    public getCamera(): CameraComponent {
        return this.cameraComponent;
    }
    
    /**
     * Reset the player
     * @param position Position to reset to
     * @param rotation Rotation to reset to
     */
    public reset(
        position: Vector3 = new Vector3(0, 0, 0),
        rotation: Vector3 = new Vector3(0, 0, 0)
    ): void {
        // Reset position and rotation
        this.transform.position = position.clone();
        this.transform.rotation = rotation.clone();
        
        // Reset movement component
        this.movementComponent.reset();
        
        // Reset camera pitch
        this.cameraComponent.setPitch(0);
        
        this.playerLogger.debug('Player reset');
    }
}
