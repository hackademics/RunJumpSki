/**
 * @file src/core/debug/gui/presets/PlayerDebugPanel.ts
 * @description Player debug panel with tweakable parameters for the player character.
 */

import * as BABYLON from 'babylonjs';
import { ParameterGroup } from '../ParameterGroup';
import { NumericParameter, BooleanParameter, Vector3Parameter } from '../TweakableParameter';

/**
 * Debug panel for player parameters
 */
export class PlayerDebugPanel {
  private group: ParameterGroup;
  private parameters: Map<string, any>;
  private playerController: any; // Replace with actual player controller type

  /**
   * Creates a new player debug panel
   * @param playerController The player controller to debug
   */
  constructor(playerController: any) {
    this.playerController = playerController;
    this.parameters = new Map();
    this.group = new ParameterGroup('Player', true);
    
    this.createParameters();
  }

  /**
   * Get the parameter group for this panel
   */
  public getGroup(): ParameterGroup {
    return this.group;
  }

  /**
   * Create all player parameters
   */
  private createParameters(): void {
    // Movement speed
    const movementSpeed = new NumericParameter({
      name: 'Movement Speed',
      initialValue: 5.0,
      min: 1.0,
      max: 20.0,
      step: 0.5,
      precision: 1
    });
    
    // Add event listener to update player controller
    movementSpeed.addChangeListener(event => {
      if (this.playerController && this.playerController.setMovementSpeed) {
        this.playerController.setMovementSpeed(event.newValue);
      }
    });
    
    this.group.addParameter(movementSpeed);
    this.parameters.set('movementSpeed', movementSpeed);
    
    // Jump height
    const jumpHeight = new NumericParameter({
      name: 'Jump Height',
      initialValue: 10.0,
      min: 1.0,
      max: 50.0,
      step: 1.0,
      precision: 1
    });
    
    // Add event listener to update player controller
    jumpHeight.addChangeListener(event => {
      if (this.playerController && this.playerController.setJumpHeight) {
        this.playerController.setJumpHeight(event.newValue);
      }
    });
    
    this.group.addParameter(jumpHeight);
    this.parameters.set('jumpHeight', jumpHeight);
    
    // Jetpack force
    const jetpackForce = new NumericParameter({
      name: 'Jetpack Force',
      initialValue: 15.0,
      min: 5.0,
      max: 50.0,
      step: 1.0,
      precision: 1
    });
    
    // Add event listener to update player controller
    jetpackForce.addChangeListener(event => {
      if (this.playerController && this.playerController.setJetpackForce) {
        this.playerController.setJetpackForce(event.newValue);
      }
    });
    
    this.group.addParameter(jetpackForce);
    this.parameters.set('jetpackForce', jetpackForce);
    
    // Jetpack max fuel
    const jetpackMaxFuel = new NumericParameter({
      name: 'Jetpack Max Fuel',
      initialValue: 100.0,
      min: 10.0,
      max: 500.0,
      step: 10.0,
      precision: 0
    });
    
    // Add event listener to update player controller
    jetpackMaxFuel.addChangeListener(event => {
      if (this.playerController && this.playerController.setJetpackMaxFuel) {
        this.playerController.setJetpackMaxFuel(event.newValue);
      }
    });
    
    this.group.addParameter(jetpackMaxFuel);
    this.parameters.set('jetpackMaxFuel', jetpackMaxFuel);
    
    // Jetpack fuel regen rate
    const jetpackFuelRegenRate = new NumericParameter({
      name: 'Fuel Regen Rate',
      initialValue: 10.0,
      min: 0.0,
      max: 50.0,
      step: 1.0,
      precision: 1
    });
    
    // Add event listener to update player controller
    jetpackFuelRegenRate.addChangeListener(event => {
      if (this.playerController && this.playerController.setJetpackFuelRegenRate) {
        this.playerController.setJetpackFuelRegenRate(event.newValue);
      }
    });
    
    this.group.addParameter(jetpackFuelRegenRate);
    this.parameters.set('jetpackFuelRegenRate', jetpackFuelRegenRate);
    
    // Skiing friction
    const skiingFriction = new NumericParameter({
      name: 'Skiing Friction',
      initialValue: 0.1,
      min: 0.0,
      max: 1.0,
      step: 0.05,
      precision: 2
    });
    
    // Add event listener to update player controller
    skiingFriction.addChangeListener(event => {
      if (this.playerController && this.playerController.setSkiingFriction) {
        this.playerController.setSkiingFriction(event.newValue);
      }
    });
    
    this.group.addParameter(skiingFriction);
    this.parameters.set('skiingFriction', skiingFriction);
    
    // Skiing acceleration
    const skiingAcceleration = new NumericParameter({
      name: 'Skiing Acceleration',
      initialValue: 5.0,
      min: 1.0,
      max: 20.0,
      step: 0.5,
      precision: 1
    });
    
    // Add event listener to update player controller
    skiingAcceleration.addChangeListener(event => {
      if (this.playerController && this.playerController.setSkiingAcceleration) {
        this.playerController.setSkiingAcceleration(event.newValue);
      }
    });
    
    this.group.addParameter(skiingAcceleration);
    this.parameters.set('skiingAcceleration', skiingAcceleration);
    
    // Skiing max speed
    const skiingMaxSpeed = new NumericParameter({
      name: 'Skiing Max Speed',
      initialValue: 30.0,
      min: 10.0,
      max: 100.0,
      step: 5.0,
      precision: 0
    });
    
    // Add event listener to update player controller
    skiingMaxSpeed.addChangeListener(event => {
      if (this.playerController && this.playerController.setSkiingMaxSpeed) {
        this.playerController.setSkiingMaxSpeed(event.newValue);
      }
    });
    
    this.group.addParameter(skiingMaxSpeed);
    this.parameters.set('skiingMaxSpeed', skiingMaxSpeed);
    
    // Projectile initial speed
    const projectileSpeed = new NumericParameter({
      name: 'Projectile Speed',
      initialValue: 50.0,
      min: 10.0,
      max: 200.0,
      step: 5.0,
      precision: 0
    });
    
    // Add event listener to update player controller
    projectileSpeed.addChangeListener(event => {
      if (this.playerController && this.playerController.setProjectileSpeed) {
        this.playerController.setProjectileSpeed(event.newValue);
      }
    });
    
    this.group.addParameter(projectileSpeed);
    this.parameters.set('projectileSpeed', projectileSpeed);
    
    // God mode
    const godMode = new BooleanParameter({
      name: 'God Mode',
      initialValue: false,
      labels: {
        true: 'Enabled',
        false: 'Disabled'
      }
    });
    
    // Add event listener to update player controller
    godMode.addChangeListener(event => {
      if (this.playerController && this.playerController.setGodMode) {
        this.playerController.setGodMode(event.newValue);
      }
    });
    
    this.group.addParameter(godMode);
    this.parameters.set('godMode', godMode);
    
    // Player position reset
    const resetPosition = new BooleanParameter({
      name: 'Reset Position',
      initialValue: false,
      labels: {
        true: 'Reset',
        false: 'Normal'
      }
    });
    
    // Add event listener to update player controller
    resetPosition.addChangeListener(event => {
      if (event.newValue && this.playerController && this.playerController.resetPosition) {
        this.playerController.resetPosition();
        // Reset back to false after triggered
        setTimeout(() => {
          resetPosition.value = false;
        }, 100);
      }
    });
    
    this.group.addParameter(resetPosition);
    this.parameters.set('resetPosition', resetPosition);
  }

  /**
   * Update parameter values from current player controller state
   */
  public updateFromSystem(): void {
    if (!this.playerController) return;
    
    // Movement speed
    if (this.playerController.getMovementSpeed) {
      const movementSpeedParam = this.parameters.get('movementSpeed') as NumericParameter;
      if (movementSpeedParam) {
        movementSpeedParam.value = this.playerController.getMovementSpeed();
      }
    }
    
    // Jump height
    if (this.playerController.getJumpHeight) {
      const jumpHeightParam = this.parameters.get('jumpHeight') as NumericParameter;
      if (jumpHeightParam) {
        jumpHeightParam.value = this.playerController.getJumpHeight();
      }
    }
    
    // Jetpack force
    if (this.playerController.getJetpackForce) {
      const jetpackForceParam = this.parameters.get('jetpackForce') as NumericParameter;
      if (jetpackForceParam) {
        jetpackForceParam.value = this.playerController.getJetpackForce();
      }
    }
    
    // Jetpack max fuel
    if (this.playerController.getJetpackMaxFuel) {
      const jetpackMaxFuelParam = this.parameters.get('jetpackMaxFuel') as NumericParameter;
      if (jetpackMaxFuelParam) {
        jetpackMaxFuelParam.value = this.playerController.getJetpackMaxFuel();
      }
    }
    
    // Jetpack fuel regen rate
    if (this.playerController.getJetpackFuelRegenRate) {
      const jetpackFuelRegenRateParam = this.parameters.get('jetpackFuelRegenRate') as NumericParameter;
      if (jetpackFuelRegenRateParam) {
        jetpackFuelRegenRateParam.value = this.playerController.getJetpackFuelRegenRate();
      }
    }
    
    // Skiing friction
    if (this.playerController.getSkiingFriction) {
      const skiingFrictionParam = this.parameters.get('skiingFriction') as NumericParameter;
      if (skiingFrictionParam) {
        skiingFrictionParam.value = this.playerController.getSkiingFriction();
      }
    }
    
    // Skiing acceleration
    if (this.playerController.getSkiingAcceleration) {
      const skiingAccelerationParam = this.parameters.get('skiingAcceleration') as NumericParameter;
      if (skiingAccelerationParam) {
        skiingAccelerationParam.value = this.playerController.getSkiingAcceleration();
      }
    }
    
    // Skiing max speed
    if (this.playerController.getSkiingMaxSpeed) {
      const skiingMaxSpeedParam = this.parameters.get('skiingMaxSpeed') as NumericParameter;
      if (skiingMaxSpeedParam) {
        skiingMaxSpeedParam.value = this.playerController.getSkiingMaxSpeed();
      }
    }
    
    // Projectile speed
    if (this.playerController.getProjectileSpeed) {
      const projectileSpeedParam = this.parameters.get('projectileSpeed') as NumericParameter;
      if (projectileSpeedParam) {
        projectileSpeedParam.value = this.playerController.getProjectileSpeed();
      }
    }
    
    // God mode
    if (this.playerController.isGodMode) {
      const godModeParam = this.parameters.get('godMode') as BooleanParameter;
      if (godModeParam) {
        godModeParam.value = this.playerController.isGodMode();
      }
    }
  }
} 