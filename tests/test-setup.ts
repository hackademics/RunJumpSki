// This file is run before each test file
// Perfect for setting up mocks for BabylonJS, Cloudflare Workers, etc.

// Mock canvas and WebGL context for BabylonJS
class MockCanvas {
  getContext() {
    return {
      getExtension: () => null,
      getParameter: () => null,
      getProgramParameter: () => null,
      getShaderParameter: () => null,
      createBuffer: () => ({}),
      bindBuffer: () => {},
      bufferData: () => {},
      createProgram: () => ({}),
      createShader: () => ({}),
      shaderSource: () => {},
      compileShader: () => {},
      attachShader: () => {},
      linkProgram: () => {},
      useProgram: () => {},
      getAttribLocation: () => 0,
      getUniformLocation: () => ({}),
      enableVertexAttribArray: () => {},
      vertexAttribPointer: () => {},
      uniform1f: () => {},
      uniform1i: () => {},
      uniform2f: () => {},
      uniform3f: () => {},
      uniform4f: () => {},
      drawArrays: () => {},
      drawElements: () => {},
    };
  }
  addEventListener() {}
  removeEventListener() {}
  clientWidth = 800;
  clientHeight = 600;
  style = {};
}

// Mock WebGL for BabylonJS
global.WebGLRenderingContext = function() {};
global.HTMLCanvasElement = MockCanvas;
global.document.createElement = (tag: string) => {
  if (tag === 'canvas') return new MockCanvas();
  return {} as any;
};

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(callback, 0) as unknown as number;
};

// Mock cancelAnimationFrame
global.cancelAnimationFrame = (handle: number) => {
  clearTimeout(handle);
};

// Mock AudioContext
class MockAudioContext {
  createGain() {
    return {
      connect: () => {},
      gain: { value: 1 }
    };
  }
  createOscillator() {
    return {
      connect: () => {},
      start: () => {},
      stop: () => {},
      frequency: { value: 440 }
    };
  }
  createAnalyser() {
    return {
      connect: () => {},
      fftSize: 2048,
      getByteFrequencyData: () => {},
      getByteTimeDomainData: () => {}
    };
  }
  createBufferSource() {
    return {
      connect: () => {},
      start: () => {},
      stop: () => {},
      buffer: null
    };
  }
  destination = {};
}

global.AudioContext = MockAudioContext as any;
global.webkitAudioContext = MockAudioContext as any;

// Mock pointer lock API
Element.prototype.requestPointerLock = jest.fn();
document.exitPointerLock = jest.fn();

// Cloudflare workers mocks can be added here when needed
