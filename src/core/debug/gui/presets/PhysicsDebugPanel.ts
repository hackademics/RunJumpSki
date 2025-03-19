/**
 * @file src/core/debug/gui/presets/PhysicsDebugPanel.ts
 * @description Physics debug panel with tweakable parameters for the physics system.
 */

import * as BABYLON from 'babylonjs';
import { ParameterGroup } from '../ParameterGroup';
import { NumericParameter, BooleanParameter, Vector3Parameter } from '../TweakableParameter';
import { PhysicsSystem } from '../../../physics/PhysicsSystem';

/**
 * Debug panel for physics system parameters
 */
export class PhysicsDebugPanel {
  private group: ParameterGroup;
  private physicsSystem: PhysicsSystem;
  private parameters: Map<string, any>;

  /**
   * Creates a new physics debug panel
   * @param physicsSystem The physics system to debug
   */
  constructor(physicsSystem: PhysicsSystem) {
    this.physicsSystem = physicsSystem;
    this.parameters = new Map();
    this.group = new ParameterGroup('Physics', true);
    
    this.createParameters();
  }

  /**
   * Get the parameter group for this panel
   */
  public getGroup(): ParameterGroup {
    return this.group;
  }

  /**
   * Create all physics parameters
   */
  private createParameters(): void {
    // Gravity
    const gravity = new Vector3Parameter({
      name: 'Gravity',
      initialValue: this.physicsSystem.getGravity().clone(),
      min: new BABYLON.Vector3(-30, -30, -30),
      max: new BABYLON.Vector3(30, 30, 30),
      step: new BABYLON.Vector3(0.1, 0.1, 0.1),
      precision: 2
    });
    
    // Add event listener to update physics system
    gravity.addChangeListener(event => {
      this.physicsSystem.setGravity(event.newValue);
    });
    
    this.group.addParameter(gravity);
    this.parameters.set('gravity', gravity);
    
    // Global friction
    const friction = new NumericParameter({
      name: 'Global Friction',
      initialValue: this.physicsSystem.getDefaultFriction(),
      min: 0,
      max: 1,
      step: 0.05,
      precision: 2
    });
    
    // Add event listener to update physics system
    friction.addChangeListener(event => {
      this.physicsSystem.setDefaultFriction(event.newValue);
    });
    
    this.group.addParameter(friction);
    this.parameters.set('friction', friction);
    
    // Global restitution (bounciness)
    const restitution = new NumericParameter({
      name: 'Global Restitution',
      initialValue: this.physicsSystem.getDefaultRestitution(),
      min: 0,
      max: 1,
      step: 0.05,
      precision: 2
    });
    
    // Add event listener to update physics system
    restitution.addChangeListener(event => {
      this.physicsSystem.setDefaultRestitution(event.newValue);
    });
    
    this.group.addParameter(restitution);
    this.parameters.set('restitution', restitution);
    
    // Time scale (physics simulation speed)
    const timeScale = new NumericParameter({
      name: 'Time Scale',
      initialValue: 1.0,
      min: 0.1,
      max: 2.0,
      step: 0.1,
      precision: 1
    });
    
    // Add event listener to update physics system
    timeScale.addChangeListener(event => {
      this.physicsSystem.setTimeScale(event.newValue);
    });
    
    this.group.addParameter(timeScale);
    this.parameters.set('timeScale', timeScale);
    
    // Physics enabled
    const enabled = new BooleanParameter({
      name: 'Physics Enabled',
      initialValue: this.physicsSystem.isEnabled(),
      labels: {
        true: 'Enabled',
        false: 'Disabled'
      }
    });
    
    // Add event listener to update physics system
    enabled.addChangeListener(event => {
      if (event.newValue) {
        this.physicsSystem.enable();
      } else {
        this.physicsSystem.disable();
      }
    });
    
    this.group.addParameter(enabled);
    this.parameters.set('enabled', enabled);
    
    // Use deterministic lock step
    const deterministic = new BooleanParameter({
      name: 'Deterministic',
      initialValue: this.physicsSystem.isDeterministic(),
      labels: {
        true: 'Yes',
        false: 'No'
      }
    });
    
    // Add event listener to update physics system
    deterministic.addChangeListener(event => {
      this.physicsSystem.setDeterministic(event.newValue);
    });
    
    this.group.addParameter(deterministic);
    this.parameters.set('deterministic', deterministic);
    
    // Show collision wireframes
    const showWireframes = new BooleanParameter({
      name: 'Show Colliders',
      initialValue: false,
      labels: {
        true: 'Visible',
        false: 'Hidden'
      }
    });
    
    // Add event listener to update physics system
    showWireframes.addChangeListener(event => {
      this.physicsSystem.showCollisionWireframes(event.newValue);
    });
    
    this.group.addParameter(showWireframes);
    this.parameters.set('showWireframes', showWireframes);
  }

  /**
   * Update parameter values from current physics system state
   */
  public updateFromSystem(): void {
    // Gravity
    const gravityParam = this.parameters.get('gravity') as Vector3Parameter;
    if (gravityParam) {
      gravityParam.value = this.physicsSystem.getGravity().clone();
    }
    
    // Friction
    const frictionParam = this.parameters.get('friction') as NumericParameter;
    if (frictionParam) {
      frictionParam.value = this.physicsSystem.getDefaultFriction();
    }
    
    // Restitution
    const restitutionParam = this.parameters.get('restitution') as NumericParameter;
    if (restitutionParam) {
      restitutionParam.value = this.physicsSystem.getDefaultRestitution();
    }
    
    // Time Scale
    const timeScaleParam = this.parameters.get('timeScale') as NumericParameter;
    if (timeScaleParam) {
      timeScaleParam.value = this.physicsSystem.getTimeScale();
    }
    
    // Enabled
    const enabledParam = this.parameters.get('enabled') as BooleanParameter;
    if (enabledParam) {
      enabledParam.value = this.physicsSystem.isEnabled();
    }
    
    // Deterministic
    const deterministicParam = this.parameters.get('deterministic') as BooleanParameter;
    if (deterministicParam) {
      deterministicParam.value = this.physicsSystem.isDeterministic();
    }
  }
} 