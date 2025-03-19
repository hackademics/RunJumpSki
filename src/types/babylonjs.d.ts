// Type definitions extending Babylon.js types

import * as BABYLON from 'babylonjs';

declare module 'babylonjs' {
  interface PostProcess {
    enabled: boolean;
  }

  interface ColorCorrectionPostProcess extends PostProcess {
    enabled: boolean;
  }

  interface ChromaticAberrationPostProcess extends PostProcess {
    enabled: boolean;
  }

  interface GrainPostProcess extends PostProcess {
    enabled: boolean;
  }

  interface VignettePostProcess extends PostProcess {
    enabled: boolean;
  }

  interface FxaaPostProcess extends PostProcess {
    enabled: boolean;
  }

  interface DepthOfFieldEffect {
    getPostProcesses(): BABYLON.PostProcess[];
  }

  interface DefaultRenderingPipeline {
    imageProcessing: {
      colorCurves: {
        reset(): void;
        highlightsHue: number;
        highlightsSaturation: number;
        highlightsExposure: number;
        shadowsHue: number;
        shadowsSaturation: number;
        shadowsExposure: number;
      }
    };
  }

  interface ColorCurves {
    reset(): void;
  }
} 