/**
 * @file src/core/debug/gui/presets/RenderingDebugPanel.ts
 * @description Rendering debug panel with tweakable parameters for the rendering system.
 */

import * as BABYLON from 'babylonjs';
import { ParameterGroup } from '../ParameterGroup';
import { NumericParameter, BooleanParameter, OptionParameter } from '../TweakableParameter';

/**
 * Debug panel for rendering system parameters
 */
export class RenderingDebugPanel {
  private group: ParameterGroup;
  private scene: BABYLON.Scene;
  private engine: BABYLON.Engine;
  private parameters: Map<string, any>;

  /**
   * Creates a new rendering debug panel
   * @param scene The Babylon.js scene
   * @param engine The Babylon.js engine
   */
  constructor(scene: BABYLON.Scene, engine: BABYLON.Engine) {
    this.scene = scene;
    this.engine = engine;
    this.parameters = new Map();
    this.group = new ParameterGroup('Rendering', true);
    
    this.createParameters();
  }

  /**
   * Get the parameter group for this panel
   */
  public getGroup(): ParameterGroup {
    return this.group;
  }

  /**
   * Create all rendering parameters
   */
  private createParameters(): void {
    // FPS limit
    const fpsLimit = new NumericParameter({
      name: 'FPS Limit',
      initialValue: this.engine.getFps(),
      min: 30,
      max: 144,
      step: 1,
      precision: 0
    });
    
    // Add event listener to update engine
    fpsLimit.addChangeListener(event => {
      this.engine.setHardwareScalingLevel(1 / (event.newValue / 60));
    });
    
    this.group.addParameter(fpsLimit);
    this.parameters.set('fpsLimit', fpsLimit);
    
    // Hardware scaling level
    const hardwareScaling = new NumericParameter({
      name: 'Hardware Scaling',
      initialValue: this.engine.getHardwareScalingLevel(),
      min: 0.5,
      max: 2,
      step: 0.1,
      precision: 1
    });
    
    // Add event listener to update engine
    hardwareScaling.addChangeListener(event => {
      this.engine.setHardwareScalingLevel(event.newValue);
    });
    
    this.group.addParameter(hardwareScaling);
    this.parameters.set('hardwareScaling', hardwareScaling);
    
    // Shadows enabled
    const shadowsEnabled = new BooleanParameter({
      name: 'Shadows',
      initialValue: this.scene.shadowsEnabled,
      labels: {
        true: 'Enabled',
        false: 'Disabled'
      }
    });
    
    // Add event listener to update scene
    shadowsEnabled.addChangeListener(event => {
      this.scene.shadowsEnabled = event.newValue;
    });
    
    this.group.addParameter(shadowsEnabled);
    this.parameters.set('shadowsEnabled', shadowsEnabled);
    
    // Fog enabled
    const fogEnabled = new BooleanParameter({
      name: 'Fog',
      initialValue: this.scene.fogEnabled,
      labels: {
        true: 'Enabled',
        false: 'Disabled'
      }
    });
    
    // Add event listener to update scene
    fogEnabled.addChangeListener(event => {
      this.scene.fogEnabled = event.newValue;
    });
    
    this.group.addParameter(fogEnabled);
    this.parameters.set('fogEnabled', fogEnabled);
    
    // Fog density
    const fogDensity = new NumericParameter({
      name: 'Fog Density',
      initialValue: this.scene.fogDensity,
      min: 0,
      max: 0.1,
      step: 0.001,
      precision: 3
    });
    
    // Add event listener to update scene
    fogDensity.addChangeListener(event => {
      this.scene.fogDensity = event.newValue;
    });
    
    this.group.addParameter(fogDensity);
    this.parameters.set('fogDensity', fogDensity);
    
    // Ambient light intensity
    const ambientIntensity = new NumericParameter({
      name: 'Ambient Intensity',
      initialValue: this.scene.ambientColor ? this.scene.ambientColor.r : 0,
      min: 0,
      max: 1,
      step: 0.05,
      precision: 2
    });
    
    // Add event listener to update scene
    ambientIntensity.addChangeListener(event => {
      this.scene.ambientColor = new BABYLON.Color3(event.newValue, event.newValue, event.newValue);
    });
    
    this.group.addParameter(ambientIntensity);
    this.parameters.set('ambientIntensity', ambientIntensity);
    
    // Rendering mode
    const renderingModes = [
      { name: 'Solid', value: 0 },
      { name: 'Wireframe', value: 1 },
      { name: 'Point', value: 2 }
    ];
    
    const renderingMode = new OptionParameter({
      name: 'Rendering Mode',
      initialValue: renderingModes[0],
      options: renderingModes,
      getOptionName: (option) => option.name
    });
    
    // Add event listener to update meshes
    renderingMode.addChangeListener(event => {
      this.scene.meshes.forEach(mesh => {
        if (event.newValue.name === 'Wireframe') {
          mesh.material!.wireframe = true;
        } else if (event.newValue.name === 'Point') {
          mesh.material!.pointsCloud = true;
        } else {
          if (mesh.material) {
            mesh.material.wireframe = false;
            mesh.material.pointsCloud = false;
          }
        }
      });
    });
    
    this.group.addParameter(renderingMode);
    this.parameters.set('renderingMode', renderingMode);
    
    // Fullscreen
    const fullscreen = new BooleanParameter({
      name: 'Fullscreen',
      initialValue: this.engine.isFullscreen,
      labels: {
        true: 'Yes',
        false: 'No'
      }
    });
    
    // Add event listener to update engine
    fullscreen.addChangeListener(event => {
      if (event.newValue && !this.engine.isFullscreen) {
        this.engine.enterFullscreen(true);
      } else if (!event.newValue && this.engine.isFullscreen) {
        this.engine.exitFullscreen();
      }
    });
    
    this.group.addParameter(fullscreen);
    this.parameters.set('fullscreen', fullscreen);
    
    // Anti-aliasing
    const antiAliasing = new BooleanParameter({
      name: 'Anti-aliasing',
      initialValue: this.engine.getCaps().standardDerivatives,
      labels: {
        true: 'Enabled',
        false: 'Disabled'
      }
    });
    
    this.group.addParameter(antiAliasing);
    this.parameters.set('antiAliasing', antiAliasing);
    
    // Background color
    const clearColor = new BooleanParameter({
      name: 'Dark Background',
      initialValue: this.scene.clearColor.r < 0.5,
      labels: {
        true: 'Yes',
        false: 'No'
      }
    });
    
    // Add event listener to update scene
    clearColor.addChangeListener(event => {
      if (event.newValue) {
        this.scene.clearColor = new BABYLON.Color4(0.2, 0.2, 0.3, 1);
      } else {
        this.scene.clearColor = new BABYLON.Color4(0.8, 0.8, 0.9, 1);
      }
    });
    
    this.group.addParameter(clearColor);
    this.parameters.set('clearColor', clearColor);
  }

  /**
   * Update parameter values from current scene and engine state
   */
  public updateFromSystem(): void {
    // FPS limit
    const fpsLimitParam = this.parameters.get('fpsLimit') as NumericParameter;
    if (fpsLimitParam) {
      fpsLimitParam.value = this.engine.getFps();
    }
    
    // Hardware scaling
    const hardwareScalingParam = this.parameters.get('hardwareScaling') as NumericParameter;
    if (hardwareScalingParam) {
      hardwareScalingParam.value = this.engine.getHardwareScalingLevel();
    }
    
    // Shadows
    const shadowsEnabledParam = this.parameters.get('shadowsEnabled') as BooleanParameter;
    if (shadowsEnabledParam) {
      shadowsEnabledParam.value = this.scene.shadowsEnabled;
    }
    
    // Fog
    const fogEnabledParam = this.parameters.get('fogEnabled') as BooleanParameter;
    if (fogEnabledParam) {
      fogEnabledParam.value = this.scene.fogEnabled;
    }
    
    // Fog density
    const fogDensityParam = this.parameters.get('fogDensity') as NumericParameter;
    if (fogDensityParam) {
      fogDensityParam.value = this.scene.fogDensity;
    }
    
    // Ambient intensity
    const ambientIntensityParam = this.parameters.get('ambientIntensity') as NumericParameter;
    if (ambientIntensityParam && this.scene.ambientColor) {
      ambientIntensityParam.value = this.scene.ambientColor.r;
    }
    
    // Fullscreen
    const fullscreenParam = this.parameters.get('fullscreen') as BooleanParameter;
    if (fullscreenParam) {
      fullscreenParam.value = this.engine.isFullscreen;
    }
    
    // Background color
    const clearColorParam = this.parameters.get('clearColor') as BooleanParameter;
    if (clearColorParam) {
      clearColorParam.value = this.scene.clearColor.r < 0.5;
    }
  }
} 