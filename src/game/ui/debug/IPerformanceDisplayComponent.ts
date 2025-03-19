/**
 * @file src/game/ui/debug/IPerformanceDisplayComponent.ts
 * @description Interface for a UI component that displays performance metrics.
 */

import { PerformanceMetrics } from '../../../core/debug/metrics/IPerformanceMetricsManager';

/**
 * Configuration options for the performance display component
 */
export interface PerformanceDisplayOptions {
  /**
   * Whether to show the component on startup
   */
  visible: boolean;
  
  /**
   * Position of the display (top-left, top-right, bottom-left, bottom-right)
   */
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  
  /**
   * Update interval in milliseconds
   */
  updateInterval: number;
  
  /**
   * Whether to show FPS
   */
  showFps: boolean;
  
  /**
   * Whether to show frame time
   */
  showFrameTime: boolean;
  
  /**
   * Whether to show draw calls
   */
  showDrawCalls: boolean;
  
  /**
   * Whether to show vertex/face counts
   */
  showGeometry: boolean;
  
  /**
   * Whether to show memory usage
   */
  showMemory: boolean;
  
  /**
   * Whether to show graph visualizations
   */
  showGraphs: boolean;
  
  /**
   * History length in seconds for graphs
   */
  graphHistoryLength: number;
}

/**
 * Default options for the performance display
 */
export const DEFAULT_PERFORMANCE_DISPLAY_OPTIONS: PerformanceDisplayOptions = {
  visible: true,
  position: 'top-right',
  updateInterval: 500,
  showFps: true,
  showFrameTime: true,
  showDrawCalls: true,
  showGeometry: false,
  showMemory: true,
  showGraphs: true,
  graphHistoryLength: 30
};

/**
 * Interface for performance display component
 */
export interface IPerformanceDisplayComponent {
  /**
   * Initialize the component
   */
  initialize(): void;
  
  /**
   * Update the display with new metrics
   * @param metrics Current performance metrics
   */
  update(metrics: PerformanceMetrics): void;
  
  /**
   * Show the performance display
   */
  show(): void;
  
  /**
   * Hide the performance display
   */
  hide(): void;
  
  /**
   * Toggle the visibility of the performance display
   */
  toggle(): void;
  
  /**
   * Check if the display is visible
   * @returns Whether the display is currently visible
   */
  isVisible(): boolean;
  
  /**
   * Update the configuration options
   * @param options New performance display options
   */
  configure(options: Partial<PerformanceDisplayOptions>): void;
  
  /**
   * Toggle the display of a specific metric
   * @param metricName Name of the metric to toggle
   */
  toggleMetric(metricName: keyof PerformanceDisplayOptions): void;
  
  /**
   * Toggle the graph display
   */
  toggleGraphs(): void;
  
  /**
   * Dispose of the display component and clean up resources
   */
  dispose(): void;
} 