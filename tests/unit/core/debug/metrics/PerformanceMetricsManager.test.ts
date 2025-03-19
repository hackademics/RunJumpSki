/**
 * @file tests/unit/core/debug/metrics/PerformanceMetricsManager.test.ts
 * @description Tests for PerformanceMetricsManager
 */
import * as BABYLON from 'babylonjs';
import { PerformanceMetricsManager } from '../../../../../src/core/debug/metrics/PerformanceMetricsManager';
import { PerformanceMetrics } from '../../../../../src/core/debug/metrics/IPerformanceMetricsManager';

// Mock Babylon.js objects
jest.mock('babylonjs');

describe('PerformanceMetricsManager', () => {
  let manager: PerformanceMetricsManager;
  let mockScene: BABYLON.Scene;
  let mockEngine: Record<string, any>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock engine
    mockEngine = {
      _drawCalls: 100,
      scenes: [{
        textures: ['texture1', 'texture2']
      }]
    };

    // Create mock scene
    mockScene = {
      getEngine: jest.fn().mockReturnValue(mockEngine),
      getTotalVertices: jest.fn().mockReturnValue(5000),
      getActiveIndices: jest.fn().mockReturnValue(9000),
    } as unknown as BABYLON.Scene;

    // Create manager with mock scene
    manager = new PerformanceMetricsManager(mockScene, 100);
    manager.initialize();
  });

  describe('initialization', () => {
    it('should initialize with default metrics values', () => {
      const metrics = manager.getCurrentMetrics();
      expect(metrics.fps).toBe(0);
      expect(metrics.frameTime).toBe(0);
      expect(metrics.custom).toEqual({});
    });
  });

  describe('update', () => {
    it('should update metrics with latest data', () => {
      // Mock performance.now to control time
      const originalNow = performance.now;
      const mockNow = jest.fn();
      mockNow.mockReturnValueOnce(1000);
      mockNow.mockReturnValueOnce(1200);
      performance.now = mockNow;

      // Update with delta time
      manager.update(0.016); // 16ms frame time

      // Call again to update metrics
      manager.update(0.016);

      // Check metrics were updated
      const metrics = manager.getCurrentMetrics();
      expect(metrics.fps).toBeGreaterThan(0);
      expect(metrics.frameTime).toBeGreaterThan(0);
      expect(metrics.drawCalls).toBe(100);
      expect(metrics.activeVertices).toBe(5000);
      expect(metrics.activeFaces).toBe(3000); // 9000 / 3

      // Restore performance.now
      performance.now = originalNow;
    });
  });

  describe('custom metrics', () => {
    it('should register custom metrics', () => {
      manager.registerCustomMetric('playerSpeed', 0);
      const metrics = manager.getCurrentMetrics();
      expect(metrics.custom.playerSpeed).toBe(0);
    });

    it('should update custom metrics', () => {
      manager.registerCustomMetric('playerSpeed', 0);
      manager.updateCustomMetric('playerSpeed', 50);
      const metrics = manager.getCurrentMetrics();
      expect(metrics.custom.playerSpeed).toBe(50);
    });

    it('should create custom metrics if they do not exist', () => {
      manager.updateCustomMetric('ammo', 30);
      const metrics = manager.getCurrentMetrics();
      expect(metrics.custom.ammo).toBe(30);
    });
  });

  describe('metrics history', () => {
    it('should record metrics history when enabled', () => {
      // Mock performance.now to control time
      const originalNow = performance.now;
      const mockNow = jest.fn();
      mockNow.mockReturnValueOnce(1000);
      mockNow.mockReturnValueOnce(1200);
      mockNow.mockReturnValueOnce(1400);
      performance.now = mockNow;

      // Start recording
      manager.startRecording(10);

      // Update metrics a few times
      manager.update(0.016);
      manager.update(0.016);

      // Check history
      const history = manager.getMetricsHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].metrics.fps).toBeGreaterThan(0);

      // Restore performance.now
      performance.now = originalNow;
    });

    it('should clear metrics history', () => {
      // Record some metrics
      manager.startRecording();
      manager.update(0.016);
      manager.update(0.016);

      // Clear history
      manager.clearHistory();

      // Check history is empty
      const history = manager.getMetricsHistory();
      expect(history.length).toBe(0);
    });

    it('should limit history to specified size', () => {
      // Record with small max size
      manager.startRecording(2);

      // Update several times
      for (let i = 0; i < 5; i++) {
        manager.update(0.016);
      }

      // History should be limited to 2 entries
      const history = manager.getMetricsHistory();
      expect(history.length).toBeLessThanOrEqual(2);
    });
  });

  describe('average metrics', () => {
    it('should calculate average metrics over time', () => {
      // Mock performance.now to control time
      const originalNow = performance.now;
      const mockNow = jest.fn();
      let time = 1000;
      mockNow.mockImplementation(() => {
        const currentTime = time;
        time += 1000; // Increment by 1 second each call
        return currentTime;
      });
      performance.now = mockNow;

      // Start recording
      manager.startRecording();

      // Update metrics with different values
      mockEngine._drawCalls = 100;
      manager.update(0.016); // 60 FPS

      mockEngine._drawCalls = 200;
      manager.update(0.033); // 30 FPS

      // Calculate average over 10 seconds (should include all metrics)
      const avgMetrics = manager.getAverageMetrics(10);
      
      // Averages should be between the values
      expect(avgMetrics.fps).toBeGreaterThanOrEqual(30);
      expect(avgMetrics.fps).toBeLessThanOrEqual(60);
      expect(avgMetrics.drawCalls).toBeGreaterThanOrEqual(100);
      expect(avgMetrics.drawCalls).toBeLessThanOrEqual(200);

      // Restore performance.now
      performance.now = originalNow;
    });
  });

  describe('export', () => {
    it('should export metrics to JSON', () => {
      // Record some metrics
      manager.startRecording();
      manager.update(0.016);
      
      // Export to JSON
      const json = manager.exportMetricsToJSON();
      const data = JSON.parse(json);
      
      // Check structure
      expect(data).toHaveProperty('currentMetrics');
      expect(data).toHaveProperty('history');
      expect(data.currentMetrics).toHaveProperty('fps');
      expect(data.currentMetrics).toHaveProperty('frameTime');
    });
  });
}); 