# Babylon.js API Fixes Needed

This document outlines the API mismatches between our code and the Babylon.js library, with suggested fixes for each component.

## PostProcessingManager.ts

### Issues:
1. `isEnabled` property does not exist on various PostProcess types
   - Affects: `PostProcess`, `ColorCorrectionPostProcess`, `ChromaticAberrationPostProcess`, `GrainPostProcess`, `FxaaPostProcess`
   - Fix: Use `enabled` property instead of `isEnabled`

2. Constructor parameter mismatch in `ChromaticAberrationPostProcess`
   - Expected 5-10 arguments, but got 4
   - Fix: Add missing parameters according to Babylon.js API: 
     ```typescript
     const chromaticAberrationPostProcess = new BABYLON.ChromaticAberrationPostProcess(
       'chromaticAberration',
       1.0, // size ratio
       this.camera,
       1, // sampling mode
       this.engine
     );
     ```

3. Type mismatch in `DepthOfFieldEffect` constructor
   - Camera parameter incorrectly passed as RenderTargetTexture
   - Fix: Update constructor call to match Babylon.js API

4. `getPostProcess` vs `getPostProcesses` method
   - `getPostProcess` does not exist on `DepthOfFieldEffect`
   - Fix: Use `getPostProcesses()[0]` as already implemented for `BloomEffect`

## DepthOfFieldEffect.ts

### Issues:
1. Property name mismatches:
   - `aperture` property does not exist
   - `focalDistance` should be `focusDistance`
   - `blur` property does not exist
   - `kernelSize` property does not exist
   
   Fix: Review the Babylon.js documentation for the correct property names and update accordingly

## ColorCorrectionEffect.ts

### Issues:
1. Missing properties on `ColorCurves`:
   - `reset` method does not exist
   - `highlightsR`, `highlightsG`, `highlightsB` properties don't exist (use `highlightsHue` etc.)
   - `shadowsR`, `shadowsG`, `shadowsB` properties don't exist
   
   Fix: Review the Babylon.js documentation for the correct property names

2. Missing properties on `DefaultRenderingPipeline`:
   - `vignetteEnabled` property does not exist
   - `vignette` property does not exist
   
   Fix: Check the Babylon.js API for the correct way to control vignette effects

## ParticleSystemManager.ts

### Issues:
1. Class does not correctly implement interface:
   - Missing methods from `IParticleSystemManager`: 
     - `createParticleSystemFromPreset`
     - `updateEmitterPosition`
     - `updateEmitRate`
     - `setSystemVisible`
     - And 2 more
   
   Fix: Implement all required methods defined in the interface

## SpeedEffectsController.ts

### Issues:
1. Constructor parameter issue in `PostProcessingManager`:
   - Expected 0 arguments, but got 1 (`scene`)
   
   Fix: Update constructor call to match implementation

2. Missing methods on `IPostProcessingManager`:
   - `addMotionBlurEffect`
   - `addDepthOfFieldEffect`
   - `addColorCorrectionEffect`
   - `updateMotionBlurEffect`
   - `updateDepthOfFieldEffect`
   - `updateColorCorrectionEffect`
   - `setEffectEnabled`
   
   Fix: Update the interface to include these methods

3. Type mismatch in `removeEffect`:
   - String passed where `PostProcessEffectType` enum expected
   
   Fix: Use the correct enum type instead of string identifiers

## ParticleEffect classes

### Issues:
1. Constructor parameters issue in `ParticleSystemManager`:
   - Expected 0 arguments, but got 1 (`scene`)
   
   Fix: Update constructor call to match implementation

2. Property assignment type mismatch:
   - `ITransformComponent | undefined` vs `ITransformComponent | null`
   
   Fix: Initialize to null or check for undefined before assignment

3. Missing properties/methods on `IParticleSystemManager`:
   - `registerExternalParticleSystem`
   - `setEmitting`
   
   Fix: Add these methods to the interface

## General Type Fixes

1. Use more specific types instead of `any` where possible
2. Add null checks before accessing properties that might be null
3. Use optional chaining (`?.`) for accessing properties that might be undefined
4. Add proper type guards to validate types before casting 