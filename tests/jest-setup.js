/**
 * @file jest.setup.js
 * @description Setup file for Jest to configure Babylon.js mocking for all tests
 */

// Import the Babylon.js mock module
const BABYLON = require('./mocks/babylonjs');

// Setup global mocks
beforeAll(() => {
  // Setup window mock
  BABYLON.setupWindowMock();
  
  // Add BABYLON to global object for ease of access in tests
  global.BABYLON = BABYLON;
  
  // Mock canvas element
  global.HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({
      data: new Array(4),
    })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => []),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
  }));
  
  // Mock ResizeObserver if needed by your tests
  global.ResizeObserver = class ResizeObserver {
    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();
  };
  
  // Mock requestAnimationFrame
  global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
  global.cancelAnimationFrame = jest.fn();
});

// Clean up mocks after all tests
afterAll(() => {
  // Clean up window mock
  BABYLON.cleanupWindowMock();
  
  // Remove global BABYLON
  delete global.BABYLON;
});

// Helper function to create a standard test scene
global.createTestScene = () => {
  const canvas = BABYLON.createMockCanvas();
  const engine = new BABYLON.Engine(canvas);
  const scene = new BABYLON.Scene(engine);
  const camera = new BABYLON.FreeCamera('default camera', new BABYLON.Vector3(0, 0, -10), scene);
  scene.activeCamera = camera;
  
  return { canvas, engine, scene, camera };
};