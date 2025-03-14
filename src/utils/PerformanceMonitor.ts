/**
 * PerformanceMonitor.ts
 * 
 * A utility for monitoring performance metrics in the game.
 * This class provides methods for tracking frame times, memory usage,
 * and custom performance metrics.
 */

import { Logger } from './Logger';

/**
 * Performance metric data
 */
export interface PerformanceMetric {
    /**
     * Name of the metric
     */
    name: string;
    
    /**
     * Current value of the metric
     */
    value: number;
    
    /**
     * Minimum value recorded
     */
    min: number;
    
    /**
     * Maximum value recorded
     */
    max: number;
    
    /**
     * Average value over the sample period
     */
    average: number;
    
    /**
     * Number of samples collected
     */
    samples: number;
    
    /**
     * Unit of measurement (e.g., 'ms', 'MB', 'fps')
     */
    unit: string;
    
    /**
     * Whether this metric should trigger warnings when exceeding thresholds
     */
    monitored: boolean;
    
    /**
     * Warning threshold
     */
    warningThreshold?: number;
    
    /**
     * Critical threshold
     */
    criticalThreshold?: number;
    
    /**
     * Last time this metric was updated
     */
    lastUpdated: number;
}

/**
 * Performance monitor options
 */
export interface PerformanceMonitorOptions {
    /**
     * Whether to enable the monitor
     * @default true
     */
    enabled?: boolean;
    
    /**
     * Sample size for calculating averages
     * @default 100
     */
    sampleSize?: number;
    
    /**
     * Whether to log warnings when thresholds are exceeded
     * @default true
     */
    logWarnings?: boolean;
    
    /**
     * Whether to track frame time
     * @default true
     */
    trackFrameTime?: boolean;
    
    /**
     * Whether to track memory usage
     * @default true
     */
    trackMemory?: boolean;
    
    /**
     * Interval (in ms) for updating memory usage
     * @default 1000
     */
    memoryUpdateInterval?: number;
}

/**
 * Performance monitor
 * 
 * A singleton class for monitoring performance metrics in the game.
 */
export class PerformanceMonitor {
    private static instance: PerformanceMonitor;
    private logger: Logger;
    private metrics: Map<string, PerformanceMetric> = new Map();
    private enabled: boolean;
    private sampleSize: number;
    private logWarnings: boolean;
    private lastFrameTime: number = 0;
    private memoryUpdateInterval?: number;
    
    /**
     * Create a new performance monitor
     * @param options Performance monitor options
     */
    private constructor(options: PerformanceMonitorOptions = {}) {
        this.logger = new Logger('PerformanceMonitor');
        this.enabled = options.enabled !== undefined ? options.enabled : true;
        this.sampleSize = options.sampleSize || 100;
        this.logWarnings = options.logWarnings !== undefined ? options.logWarnings : true;
        
        // Initialize metrics
        if (options.trackFrameTime !== false) {
            this.initMetric('frameTime', 'ms', true, 16, 33); // Warning at 16ms (60fps), critical at 33ms (30fps)
            this.initMetric('fps', 'fps', true, 30, 15); // Warning at 30fps, critical at 15fps
        }
        
        // Track memory if supported and enabled
        if (options.trackMemory !== false && window.performance && (performance as any).memory) {
            this.initMetric('usedJSHeapSize', 'MB', true, 100, 200);
            this.initMetric('totalJSHeapSize', 'MB', false);
            
            // Start memory tracking interval
            const interval = options.memoryUpdateInterval || 1000;
            this.memoryUpdateInterval = window.setInterval(() => {
                this.updateMemoryMetrics();
            }, interval);
        }
        
        this.logger.debug('Performance monitor initialized');
    }
    
    /**
     * Get the performance monitor instance
     * @param options Performance monitor options
     * @returns Performance monitor instance
     */
    public static getInstance(options: PerformanceMonitorOptions = {}): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor(options);
        }
        return PerformanceMonitor.instance;
    }
    
    /**
     * Initialize a metric
     * @param name Metric name
     * @param unit Unit of measurement
     * @param monitored Whether to monitor this metric for warnings
     * @param warningThreshold Warning threshold
     * @param criticalThreshold Critical threshold
     */
    private initMetric(name: string, unit: string, monitored: boolean = false, warningThreshold?: number, criticalThreshold?: number): void {
        this.metrics.set(name, {
            name,
            value: 0,
            min: Number.MAX_VALUE,
            max: 0,
            average: 0,
            samples: 0,
            unit,
            monitored,
            warningThreshold,
            criticalThreshold,
            lastUpdated: performance.now()
        });
    }
    
    /**
     * Begin frame timing
     */
    public beginFrame(): void {
        if (!this.enabled) return;
        this.lastFrameTime = performance.now();
    }
    
    /**
     * End frame timing and update metrics
     */
    public endFrame(): void {
        if (!this.enabled || this.lastFrameTime === 0) return;
        
        const now = performance.now();
        const frameTime = now - this.lastFrameTime;
        const fps = 1000 / frameTime;
        
        this.updateMetric('frameTime', frameTime);
        this.updateMetric('fps', fps);
    }
    
    /**
     * Update memory metrics
     */
    private updateMemoryMetrics(): void {
        if (!this.enabled || !window.performance || !(performance as any).memory) return;
        
        const memory = (performance as any).memory;
        const usedJSHeapSize = memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
        const totalJSHeapSize = memory.totalJSHeapSize / (1024 * 1024); // Convert to MB
        
        this.updateMetric('usedJSHeapSize', usedJSHeapSize);
        this.updateMetric('totalJSHeapSize', totalJSHeapSize);
    }
    
    /**
     * Update a metric
     * @param name Metric name
     * @param value Metric value
     */
    public updateMetric(name: string, value: number): void {
        if (!this.enabled) return;
        
        // Get or create metric
        let metric = this.metrics.get(name);
        if (!metric) {
            this.initMetric(name, '');
            metric = this.metrics.get(name)!;
        }
        
        // Update metric values
        metric.value = value;
        metric.min = Math.min(metric.min, value);
        metric.max = Math.max(metric.max, value);
        
        // Update average
        metric.average = ((metric.average * metric.samples) + value) / (metric.samples + 1);
        metric.samples = Math.min(metric.samples + 1, this.sampleSize);
        metric.lastUpdated = performance.now();
        
        // Check thresholds if monitored
        if (this.logWarnings && metric.monitored) {
            if (metric.criticalThreshold !== undefined && 
                (name === 'fps' ? value < metric.criticalThreshold : value > metric.criticalThreshold)) {
                this.logger.error(`Critical ${name}: ${value.toFixed(2)}${metric.unit} (threshold: ${metric.criticalThreshold}${metric.unit})`);
            } else if (metric.warningThreshold !== undefined && 
                (name === 'fps' ? value < metric.warningThreshold : value > metric.warningThreshold)) {
                this.logger.warn(`High ${name}: ${value.toFixed(2)}${metric.unit} (threshold: ${metric.warningThreshold}${metric.unit})`);
            }
        }
    }
    
    /**
     * Start timing a custom operation
     * @param name Operation name
     * @returns Start time
     */
    public startTimer(name: string): number {
        return performance.now();
    }
    
    /**
     * End timing a custom operation and update metrics
     * @param name Operation name
     * @param startTime Start time from startTimer
     * @param warningThreshold Warning threshold in ms
     */
    public endTimer(name: string, startTime: number, warningThreshold?: number): number {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Create metric if it doesn't exist
        if (!this.metrics.has(name)) {
            this.initMetric(name, 'ms', warningThreshold !== undefined, warningThreshold, warningThreshold ? warningThreshold * 2 : undefined);
        }
        
        // Update metric
        this.updateMetric(name, duration);
        
        return duration;
    }
    
    /**
     * Get a metric
     * @param name Metric name
     * @returns Metric or undefined if not found
     */
    public getMetric(name: string): PerformanceMetric | undefined {
        return this.metrics.get(name);
    }
    
    /**
     * Get all metrics
     * @returns Map of metrics
     */
    public getAllMetrics(): Map<string, PerformanceMetric> {
        return new Map(this.metrics);
    }
    
    /**
     * Enable or disable the monitor
     * @param enabled Whether the monitor is enabled
     */
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }
    
    /**
     * Check if the monitor is enabled
     * @returns Whether the monitor is enabled
     */
    public isEnabled(): boolean {
        return this.enabled;
    }
    
    /**
     * Reset all metrics
     */
    public reset(): void {
        for (const [name, metric] of this.metrics.entries()) {
            this.metrics.set(name, {
                ...metric,
                value: 0,
                min: Number.MAX_VALUE,
                max: 0,
                average: 0,
                samples: 0,
                lastUpdated: performance.now()
            });
        }
    }
    
    /**
     * Dispose the monitor and clean up resources
     */
    public dispose(): void {
        if (this.memoryUpdateInterval) {
            window.clearInterval(this.memoryUpdateInterval);
            this.memoryUpdateInterval = undefined;
        }
        
        this.metrics.clear();
        this.logger.debug('Performance monitor disposed');
    }
} 