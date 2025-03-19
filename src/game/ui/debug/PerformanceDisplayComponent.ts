/**
 * @file src/game/ui/debug/PerformanceDisplayComponent.ts
 * @description Implementation of a UI component that displays performance metrics.
 * 
 * @dependencies IPerformanceDisplayComponent.ts, IPerformanceMetricsManager.ts
 */
import * as BABYLON from 'babylonjs';
import * as GUI from 'babylonjs-gui';
import { IPerformanceDisplayComponent, PerformanceDisplayOptions, DEFAULT_PERFORMANCE_DISPLAY_OPTIONS } from './IPerformanceDisplayComponent';
import { PerformanceMetrics, MetricsTimePoint } from '../../../core/debug/metrics/IPerformanceMetricsManager';

/**
 * Creates a small graph canvas for displaying time-series data
 */
class MetricsGraph {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private color: string;
  private backgroundColor: string;
  private data: number[];
  private maxDataPoints: number;
  private minValue: number;
  private maxValue: number;
  private autoScale: boolean;
  private label: string;
  private unit: string;

  /**
   * Creates a new metrics graph
   * @param width Width of the graph in pixels
   * @param height Height of the graph in pixels
   * @param color Color for the graph line
   * @param backgroundColor Background color of the graph
   * @param maxDataPoints Maximum number of data points to display
   * @param label Label for the graph
   * @param unit Unit for the values (e.g. "ms", "fps")
   */
  constructor(
    width: number, 
    height: number, 
    color = '#00ff00', 
    backgroundColor = 'rgba(0, 0, 0, 0.5)',
    maxDataPoints = 100,
    label = '',
    unit = ''
  ) {
    this.width = width;
    this.height = height;
    this.color = color;
    this.backgroundColor = backgroundColor;
    this.data = [];
    this.maxDataPoints = maxDataPoints;
    this.minValue = 0;
    this.maxValue = 100;
    this.autoScale = true;
    this.label = label;
    this.unit = unit;

    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.context = this.canvas.getContext('2d')!;
  }

  /**
   * Add a new data point to the graph
   * @param value The value to add
   */
  public addDataPoint(value: number): void {
    this.data.push(value);
    if (this.data.length > this.maxDataPoints) {
      this.data.shift();
    }

    if (this.autoScale) {
      this.updateScale();
    }

    this.render();
  }

  /**
   * Update the scale of the graph based on current data
   */
  private updateScale(): void {
    if (this.data.length === 0) return;

    let min = Math.min(...this.data);
    let max = Math.max(...this.data);

    // Add some padding to the scale
    const padding = (max - min) * 0.1;
    min = Math.max(0, min - padding);
    max = max + padding;

    this.minValue = min;
    this.maxValue = max;
  }

  /**
   * Set fixed scale for the graph
   * @param min Minimum value
   * @param max Maximum value
   */
  public setScale(min: number, max: number): void {
    this.minValue = min;
    this.maxValue = max;
    this.autoScale = false;
    this.render();
  }

  /**
   * Enable auto-scaling
   */
  public enableAutoScale(): void {
    this.autoScale = true;
    this.updateScale();
    this.render();
  }

  /**
   * Render the graph to the canvas
   */
  private render(): void {
    const ctx = this.context;
    const { width, height } = this;

    // Clear the canvas
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    if (this.data.length <= 1) return;

    // Draw the graph
    ctx.beginPath();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1;

    const valueRange = this.maxValue - this.minValue;
    const stepSize = width / (this.maxDataPoints - 1);

    for (let i = 0; i < this.data.length; i++) {
      const x = i * stepSize;
      const normalizedValue = valueRange === 0 ? 0.5 : (this.data[i] - this.minValue) / valueRange;
      const y = height - (normalizedValue * height);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    // Draw the latest value
    const latestValue = this.data[this.data.length - 1];
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.label}: ${latestValue.toFixed(1)}${this.unit}`, width - 4, 12);
  }

  /**
   * Get the canvas element
   * @returns Canvas element containing the graph
   */
  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Get the image data URL for the graph
   * @returns Data URL for the graph image
   */
  public getDataURL(): string {
    return this.canvas.toDataURL();
  }

  /**
   * Clear all data points
   */
  public clear(): void {
    this.data = [];
    this.render();
  }

  /**
   * Resize the graph
   * @param width New width
   * @param height New height
   */
  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.render();
  }
}

/**
 * Implementation of the performance display component using Babylon.js GUI
 */
export class PerformanceDisplayComponent implements IPerformanceDisplayComponent {
  private scene: BABYLON.Scene;
  private advancedTexture: GUI.AdvancedDynamicTexture;
  private container: GUI.StackPanel;
  private metricsLabels: Record<string, GUI.TextBlock>;
  private options: PerformanceDisplayOptions;
  private visible: boolean;
  private fpsGraph: MetricsGraph;
  private frameTimeGraph: MetricsGraph;
  private fpsImage: GUI.Image;
  private frameTimeImage: GUI.Image;
  private metricsHistoryLength: number;
  private graphImages: Record<string, GUI.Image>;

  /**
   * Creates a new performance display component
   * @param scene The Babylon.js scene
   * @param options Display options
   */
  constructor(scene: BABYLON.Scene, options: Partial<PerformanceDisplayOptions> = {}) {
    this.scene = scene;
    this.options = { ...DEFAULT_PERFORMANCE_DISPLAY_OPTIONS, ...options };
    this.visible = this.options.visible;
    this.metricsLabels = {};
    this.graphImages = {};
    this.metricsHistoryLength = this.options.graphHistoryLength * (1000 / this.options.updateInterval);

    // Create the AdvancedDynamicTexture for GUI
    this.advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI('PerformanceMonitorUI', true, this.scene);
    
    // Create the main container
    this.container = new GUI.StackPanel();
    this.container.width = '220px';
    this.container.height = '300px';
    this.container.background = 'rgba(0, 0, 0, 0.5)';
    this.container.color = 'white';
    this.container.fontSize = 14;
    this.container.paddingTop = '5px';
    this.container.paddingBottom = '5px';
    this.container.paddingLeft = '5px';
    this.container.paddingRight = '5px';
    this.container.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    this.container.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.container.isVisible = this.visible;
    
    // Position the container based on options
    this.updatePosition();
    
    // Add to the UI
    this.advancedTexture.addControl(this.container);

    // Create graphs
    this.fpsGraph = new MetricsGraph(200, 40, '#00ff00', 'rgba(0, 0, 0, 0.3)', this.metricsHistoryLength, 'FPS', '');
    this.frameTimeGraph = new MetricsGraph(200, 40, '#00ffff', 'rgba(0, 0, 0, 0.3)', this.metricsHistoryLength, 'Frame', 'ms');

    // Set fixed scale for FPS to avoid too much fluctuation
    this.fpsGraph.setScale(0, 120);

    // Create graph images
    this.fpsImage = new GUI.Image('fpsGraph', this.fpsGraph.getDataURL());
    this.fpsImage.width = '200px';
    this.fpsImage.height = '40px';
    this.fpsImage.isVisible = this.options.showGraphs;
    this.graphImages['fps'] = this.fpsImage;

    this.frameTimeImage = new GUI.Image('frameTimeGraph', this.frameTimeGraph.getDataURL());
    this.frameTimeImage.width = '200px';
    this.frameTimeImage.height = '40px';
    this.frameTimeImage.isVisible = this.options.showGraphs;
    this.graphImages['frameTime'] = this.frameTimeImage;
  }

  /**
   * Initialize the component
   */
  public initialize(): void {
    // Create title
    const title = new GUI.TextBlock();
    title.text = 'PERFORMANCE';
    title.height = '20px';
    title.color = 'white';
    title.fontSize = 16;
    title.fontWeight = 'bold';
    title.resizeToFit = true;
    this.container.addControl(title);

    // Create divider
    const divider = new GUI.Rectangle();
    divider.height = '1px';
    divider.background = 'white';
    divider.alpha = 0.5;
    divider.width = 1;
    divider.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.container.addControl(divider);

    // Create FPS label
    const fpsLabel = new GUI.TextBlock();
    fpsLabel.text = 'FPS: --';
    fpsLabel.height = '16px';
    fpsLabel.color = 'white';
    fpsLabel.resizeToFit = true;
    fpsLabel.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.metricsLabels['fps'] = fpsLabel;
    this.container.addControl(fpsLabel);
    
    // Add FPS graph
    this.container.addControl(this.fpsImage);

    // Create frame time label
    const frameTimeLabel = new GUI.TextBlock();
    frameTimeLabel.text = 'Frame Time: -- ms';
    frameTimeLabel.height = '16px';
    frameTimeLabel.color = 'white';
    frameTimeLabel.resizeToFit = true;
    frameTimeLabel.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.metricsLabels['frameTime'] = frameTimeLabel;
    this.container.addControl(frameTimeLabel);
    
    // Add frame time graph
    this.container.addControl(this.frameTimeImage);

    // Create draw calls label
    const drawCallsLabel = new GUI.TextBlock();
    drawCallsLabel.text = 'Draw Calls: --';
    drawCallsLabel.height = '16px';
    drawCallsLabel.color = 'white';
    drawCallsLabel.resizeToFit = true;
    drawCallsLabel.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    drawCallsLabel.isVisible = this.options.showDrawCalls;
    this.metricsLabels['drawCalls'] = drawCallsLabel;
    this.container.addControl(drawCallsLabel);

    // Create geometry label
    const geometryLabel = new GUI.TextBlock();
    geometryLabel.text = 'Vertices: -- | Faces: --';
    geometryLabel.height = '16px';
    geometryLabel.color = 'white';
    geometryLabel.resizeToFit = true;
    geometryLabel.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    geometryLabel.isVisible = this.options.showGeometry;
    this.metricsLabels['geometry'] = geometryLabel;
    this.container.addControl(geometryLabel);

    // Create memory label
    const memoryLabel = new GUI.TextBlock();
    memoryLabel.text = 'Memory: -- MB';
    memoryLabel.height = '16px';
    memoryLabel.color = 'white';
    memoryLabel.resizeToFit = true;
    memoryLabel.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    memoryLabel.isVisible = this.options.showMemory;
    this.metricsLabels['memory'] = memoryLabel;
    this.container.addControl(memoryLabel);

    // Create help text
    const helpText = new GUI.TextBlock();
    helpText.text = 'Press F3 to toggle display';
    helpText.height = '16px';
    helpText.color = 'white';
    helpText.alpha = 0.7;
    helpText.fontSize = 12;
    helpText.resizeToFit = true;
    helpText.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.container.addControl(helpText);

    // Update initial visibility
    this.container.isVisible = this.visible;
  }

  /**
   * Update the display with new metrics
   * @param metrics Current performance metrics
   */
  public update(metrics: PerformanceMetrics): void {
    // Update FPS
    if (this.options.showFps) {
      this.metricsLabels['fps'].text = `FPS: ${metrics.fps.toFixed(0)}`;
      this.fpsGraph.addDataPoint(metrics.fps);
      this.fpsImage.source = this.fpsGraph.getDataURL();
    }

    // Update frame time
    if (this.options.showFrameTime) {
      this.metricsLabels['frameTime'].text = `Frame Time: ${metrics.frameTime.toFixed(2)} ms`;
      this.frameTimeGraph.addDataPoint(metrics.frameTime);
      this.frameTimeImage.source = this.frameTimeGraph.getDataURL();
    }

    // Update draw calls
    if (this.options.showDrawCalls) {
      this.metricsLabels['drawCalls'].text = `Draw Calls: ${metrics.drawCalls || 0}`;
    }

    // Update geometry
    if (this.options.showGeometry) {
      const vertices = metrics.activeVertices !== undefined ? metrics.activeVertices.toLocaleString() : '--';
      const faces = metrics.activeFaces !== undefined ? metrics.activeFaces.toLocaleString() : '--';
      this.metricsLabels['geometry'].text = `Vertices: ${vertices} | Faces: ${faces}`;
    }

    // Update memory
    if (this.options.showMemory && metrics.memoryUsage !== undefined) {
      this.metricsLabels['memory'].text = `Memory: ${metrics.memoryUsage.toFixed(0)} MB`;
    }
  }

  /**
   * Show the performance display
   */
  public show(): void {
    this.visible = true;
    this.container.isVisible = true;
  }

  /**
   * Hide the performance display
   */
  public hide(): void {
    this.visible = false;
    this.container.isVisible = false;
  }

  /**
   * Toggle the visibility of the performance display
   */
  public toggle(): void {
    this.visible = !this.visible;
    this.container.isVisible = this.visible;
  }

  /**
   * Check if the display is visible
   * @returns Whether the display is currently visible
   */
  public isVisible(): boolean {
    return this.visible;
  }

  /**
   * Update the configuration options
   * @param options New performance display options
   */
  public configure(options: Partial<PerformanceDisplayOptions>): void {
    this.options = { ...this.options, ...options };
    
    // Update position if it changed
    if (options.position) {
      this.updatePosition();
    }

    // Update visibility of metrics
    if (options.showFps !== undefined) {
      this.metricsLabels['fps'].isVisible = options.showFps;
      this.graphImages['fps'].isVisible = options.showFps && this.options.showGraphs;
    }

    if (options.showFrameTime !== undefined) {
      this.metricsLabels['frameTime'].isVisible = options.showFrameTime;
      this.graphImages['frameTime'].isVisible = options.showFrameTime && this.options.showGraphs;
    }

    if (options.showDrawCalls !== undefined) {
      this.metricsLabels['drawCalls'].isVisible = options.showDrawCalls;
    }

    if (options.showGeometry !== undefined) {
      this.metricsLabels['geometry'].isVisible = options.showGeometry;
    }

    if (options.showMemory !== undefined) {
      this.metricsLabels['memory'].isVisible = options.showMemory;
    }

    if (options.showGraphs !== undefined) {
      this.toggleGraphs();
    }

    // Update history length if changed
    if (options.graphHistoryLength !== undefined) {
      this.metricsHistoryLength = options.graphHistoryLength * (1000 / this.options.updateInterval);
    }
  }

  /**
   * Toggle the display of a specific metric
   * @param metricName Name of the metric to toggle
   */
  public toggleMetric(metricName: keyof PerformanceDisplayOptions): void {
    if (typeof this.options[metricName] === 'boolean') {
      const newValue = !this.options[metricName];
      this.options = {
        ...this.options,
        [metricName]: newValue
      };
      
      switch (metricName) {
        case 'showFps':
          this.metricsLabels['fps'].isVisible = newValue;
          this.graphImages['fps'].isVisible = newValue && this.options.showGraphs;
          break;
        case 'showFrameTime':
          this.metricsLabels['frameTime'].isVisible = newValue;
          this.graphImages['frameTime'].isVisible = newValue && this.options.showGraphs;
          break;
        case 'showDrawCalls':
          this.metricsLabels['drawCalls'].isVisible = newValue;
          break;
        case 'showGeometry':
          this.metricsLabels['geometry'].isVisible = newValue;
          break;
        case 'showMemory':
          this.metricsLabels['memory'].isVisible = newValue;
          break;
        case 'showGraphs':
          this.toggleGraphs();
          break;
      }
    }
  }

  /**
   * Toggle the graph display
   */
  public toggleGraphs(): void {
    this.options.showGraphs = !this.options.showGraphs;
    Object.keys(this.graphImages).forEach(key => {
      const metricEnabled = (this.options as any)[`show${key.charAt(0).toUpperCase() + key.slice(1)}`];
      this.graphImages[key].isVisible = this.options.showGraphs && metricEnabled;
    });
  }

  /**
   * Update the position of the display based on the current options
   */
  private updatePosition(): void {
    switch (this.options.position) {
      case 'top-left':
        this.container.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        this.container.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        break;
      case 'top-right':
        this.container.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        this.container.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        break;
      case 'bottom-left':
        this.container.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.container.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        break;
      case 'bottom-right':
        this.container.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.container.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        break;
    }
  }

  /**
   * Dispose of the display component and clean up resources
   */
  public dispose(): void {
    this.advancedTexture.dispose();
  }
} 