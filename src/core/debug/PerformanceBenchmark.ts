/**
 * @file src/core/debug/PerformanceBenchmark.ts
 * @description Utility for measuring and tracking performance metrics
 */

/**
 * Represents a single benchmark result
 */
export interface BenchmarkResult {
  /** Name of the benchmark */
  name: string;
  /** Display name of the benchmark */
  displayName?: string;
  /** Duration of the benchmark in milliseconds */
  duration: number;
  /** Number of operations performed during the benchmark */
  operations: number;
  /** Operations per second */
  opsPerSecond: number;
  /** Memory used during the benchmark (if available) */
  memoryUsed?: number;
  /** Average frames per second */
  avgFps?: number;
  /** Minimum frames per second */
  minFps?: number;
  /** Maximum frames per second */
  maxFps?: number;
  /** Maximum memory used in bytes */
  maxMemory?: number;
  /** Progress counter */
  progress?: number;
  /** Additional custom metrics */
  customMetrics?: Record<string, number>;
  /** Timestamp when the benchmark was run */
  timestamp: number;
}

/**
 * Defines a benchmark scenario
 */
export interface BenchmarkScenario<T = any> {
  /** Unique name of the scenario */
  name: string;
  /** Display name for the scenario */
  displayName: string;
  /** Description of the scenario */
  description: string;
  /** Setup function called before the scenario runs */
  setup: () => Promise<T>;
  /** Function to run the scenario */
  run: (context: T, onProgress: (progress: number) => void) => Promise<() => void>;
  /** Teardown function called after the scenario completes */
  teardown: () => Promise<void>;
  /** Metrics to calculate from results */
  metrics: Record<string, (result: BenchmarkResult) => number | string>;
}

/**
 * Options for a benchmark
 */
export interface BenchmarkOptions {
  /** Name of the benchmark */
  name: string;
  /** How long to run the benchmark in milliseconds (0 for single run) */
  duration?: number;
  /** Number of iterations to run (ignored if duration > 0) */
  iterations?: number;
  /** Whether to track memory usage (if supported by browser) */
  trackMemory?: boolean;
  /** Whether to log results to console */
  logResults?: boolean;
  /** Custom setup function before the benchmark */
  setup?: () => void | Promise<void>;
  /** Custom teardown function after the benchmark */
  teardown?: () => void | Promise<void>;
}

/**
 * Configuration for the PerformanceBenchmark class
 */
export interface PerformanceBenchmarkConfig {
  /** Babylon.js scene to monitor */
  scene?: BABYLON.Scene;
  /** Babylon.js engine to monitor */
  engine?: BABYLON.Engine;
  /** Whether to show UI for benchmark results */
  showUI?: boolean;
  /** Minimum duration of benchmarks in milliseconds */
  minDuration?: number;
  /** Maximum duration of benchmarks in milliseconds */
  maxDuration?: number;
}

/**
 * Default benchmark options
 */
const DEFAULT_BENCHMARK_OPTIONS: BenchmarkOptions = {
  name: 'Unnamed Benchmark',
  duration: 0,
  iterations: 1,
  trackMemory: true,
  logResults: true
};

/**
 * Default configuration
 */
const DEFAULT_CONFIG: PerformanceBenchmarkConfig = {
  showUI: false,
  minDuration: 5000,  // 5 seconds
  maxDuration: 30000  // 30 seconds
};

/**
 * Utility class for benchmarking performance
 */
export class PerformanceBenchmark {
  private static results: BenchmarkResult[] = [];
  private static benchmarks: Record<string, BenchmarkResult[]> = {};
  
  private config: PerformanceBenchmarkConfig;
  private scenarios: Map<string, BenchmarkScenario> = new Map();
  
  /**
   * Create a new PerformanceBenchmark instance
   * @param config Configuration options
   */
  constructor(config: PerformanceBenchmarkConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Define a benchmark scenario
   * @param scenario The scenario definition
   */
  public defineScenario<T>(scenario: BenchmarkScenario<T>): void {
    if (this.scenarios.has(scenario.name)) {
      console.warn(`Scenario with name "${scenario.name}" already exists and will be overwritten`);
    }
    this.scenarios.set(scenario.name, scenario);
  }
  
  /**
   * Get a scenario by name
   * @param name The name of the scenario
   * @returns The scenario or undefined if not found
   */
  public getScenario<T>(name: string): BenchmarkScenario<T> | undefined {
    return this.scenarios.get(name) as BenchmarkScenario<T> | undefined;
  }
  
  /**
   * Get all defined scenarios
   * @returns Array of scenario names
   */
  public getScenarioNames(): string[] {
    return Array.from(this.scenarios.keys());
  }
  
  /**
   * Run a benchmark scenario
   * @param scenarioName Name of the scenario to run
   * @param duration Duration to run the scenario in milliseconds
   * @returns The benchmark result
   */
  public async runScenario(scenarioName: string, duration?: number): Promise<BenchmarkResult> {
    const scenario = this.scenarios.get(scenarioName);
    if (!scenario) {
      throw new Error(`Scenario "${scenarioName}" not found`);
    }
    
    const actualDuration = duration || this.config.minDuration || 5000;
    
    // Create result object
    const result: BenchmarkResult = {
      name: scenario.name,
      displayName: scenario.displayName,
      duration: 0,
      operations: 0,
      opsPerSecond: 0,
      progress: 0,
      timestamp: Date.now(),
      avgFps: 0,
      minFps: Infinity,
      maxFps: 0,
      maxMemory: 0
    };
    
    try {
      // Setup
      const context = await scenario.setup();
      
      // Track performance data
      let frameCount = 0;
      let minFps = Infinity;
      let maxFps = 0;
      let lastTime = performance.now();
      let maxMemory = 0;
      
      // Progress tracker
      const onProgress = (progress: number) => {
        result.progress = progress;
      };
      
      // Performance monitoring
      const performanceObserver = this.config.scene ? this.setupPerformanceObserver(
        (fps, memory) => {
          frameCount++;
          minFps = Math.min(minFps, fps);
          maxFps = Math.max(maxFps, fps);
          maxMemory = Math.max(maxMemory, memory || 0);
        }
      ) : null;
      
      // Run the scenario
      const startTime = performance.now();
      const cleanup = await scenario.run(context, onProgress);
      
      // Wait until the duration expires
      while (performance.now() - startTime < actualDuration) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Run the cleanup function returned by the scenario
      if (cleanup) {
        cleanup();
      }
      
      // Calculate metrics
      const endTime = performance.now();
      result.duration = endTime - startTime;
      result.operations = result.progress || 0;
      result.opsPerSecond = result.operations / (result.duration / 1000);
      result.avgFps = frameCount / (result.duration / 1000);
      result.minFps = minFps === Infinity ? 0 : minFps;
      result.maxFps = maxFps;
      result.maxMemory = maxMemory;
      
      // Stop performance monitoring
      if (performanceObserver) {
        performanceObserver();
      }
      
      // Add custom metrics
      result.customMetrics = {};
      for (const [metricName, metricFn] of Object.entries(scenario.metrics)) {
        const value = metricFn(result);
        if (typeof value === 'number') {
          result.customMetrics[metricName] = value;
        }
      }
      
      // Teardown
      await scenario.teardown();
      
      // Store result
      PerformanceBenchmark.results.push(result);
      
      if (!PerformanceBenchmark.benchmarks[scenario.name]) {
        PerformanceBenchmark.benchmarks[scenario.name] = [];
      }
      PerformanceBenchmark.benchmarks[scenario.name].push(result);
      
      return result;
    } catch (error) {
      console.error(`Error running scenario "${scenarioName}":`, error);
      throw error;
    }
  }
  
  /**
   * Setup performance observer for tracking FPS and memory
   * @param callback Function to call with performance data
   * @returns Function to stop observing
   */
  private setupPerformanceObserver(
    callback: (fps: number, memory?: number) => void
  ): () => void {
    if (!this.config.scene || !this.config.engine) {
      return () => {};
    }
    
    const { scene, engine } = this.config;
    let lastTime = performance.now();
    let frames = 0;
    
    const observer = scene.onAfterRenderObservable.add(() => {
      frames++;
      const now = performance.now();
      const elapsed = now - lastTime;
      
      // Calculate FPS every 500ms
      if (elapsed >= 500) {
        const fps = (frames / elapsed) * 1000;
        let memory: number | undefined;
        
        // Get memory if available
        if (window.performance && (performance as any).memory) {
          memory = (performance as any).memory.usedJSHeapSize;
        }
        
        callback(fps, memory);
        
        // Reset counters
        lastTime = now;
        frames = 0;
      }
    });
    
    return () => {
      if (observer) {
        scene.onAfterRenderObservable.remove(observer);
      }
    };
  }

  /**
   * Run a benchmark synchronously
   * @param fn Function to benchmark
   * @param options Benchmark options
   * @returns The benchmark result
   */
  public static run(fn: () => void, options: Partial<BenchmarkOptions> = {}): BenchmarkResult {
    const opts = { ...DEFAULT_BENCHMARK_OPTIONS, ...options };
    
    // Set up
    if (opts.setup) {
      opts.setup();
    }
    
    let operations = 0;
    let startMemory = 0;
    let endMemory = 0;
    
    // Track memory if supported and requested
    if (opts.trackMemory && window.performance && (performance as any).memory) {
      startMemory = (performance as any).memory.usedJSHeapSize;
    }
    
    const startTime = performance.now();
    
    // Run based on duration or iterations
    if (opts.duration && opts.duration > 0) {
      const endTime = startTime + opts.duration;
      while (performance.now() < endTime) {
        fn();
        operations++;
      }
    } else {
      const iterations = opts.iterations || 1;
      for (let i = 0; i < iterations; i++) {
        fn();
        operations++;
      }
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Track memory if supported and requested
    if (opts.trackMemory && window.performance && (performance as any).memory) {
      endMemory = (performance as any).memory.usedJSHeapSize;
    }
    
    // Clean up
    if (opts.teardown) {
      opts.teardown();
    }
    
    // Calculate results
    const result: BenchmarkResult = {
      name: opts.name,
      duration,
      operations,
      opsPerSecond: operations / (duration / 1000),
      timestamp: Date.now()
    };
    
    if (opts.trackMemory && startMemory > 0) {
      result.memoryUsed = endMemory - startMemory;
    }
    
    // Store result
    PerformanceBenchmark.results.push(result);
    
    // Store in named benchmark collection
    if (!PerformanceBenchmark.benchmarks[opts.name]) {
      PerformanceBenchmark.benchmarks[opts.name] = [];
    }
    PerformanceBenchmark.benchmarks[opts.name].push(result);
    
    // Log if requested
    if (opts.logResults) {
      this.logResult(result);
    }
    
    return result;
  }

  /**
   * Run an asynchronous benchmark
   * @param fn Async function to benchmark
   * @param options Benchmark options
   * @returns Promise resolving to the benchmark result
   */
  public static async runAsync(
    fn: () => Promise<void>,
    options: Partial<BenchmarkOptions> = {}
  ): Promise<BenchmarkResult> {
    const opts = { ...DEFAULT_BENCHMARK_OPTIONS, ...options };
    
    // Set up
    if (opts.setup) {
      const setupResult = opts.setup();
      if (setupResult instanceof Promise) {
        await setupResult;
      }
    }
    
    let operations = 0;
    let startMemory = 0;
    let endMemory = 0;
    
    // Track memory if supported and requested
    if (opts.trackMemory && window.performance && (performance as any).memory) {
      startMemory = (performance as any).memory.usedJSHeapSize;
    }
    
    const startTime = performance.now();
    
    // Run based on duration or iterations
    if (opts.duration && opts.duration > 0) {
      const endTime = startTime + opts.duration;
      while (performance.now() < endTime) {
        await fn();
        operations++;
      }
    } else {
      const iterations = opts.iterations || 1;
      for (let i = 0; i < iterations; i++) {
        await fn();
        operations++;
      }
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Track memory if supported and requested
    if (opts.trackMemory && window.performance && (performance as any).memory) {
      endMemory = (performance as any).memory.usedJSHeapSize;
    }
    
    // Clean up
    if (opts.teardown) {
      const teardownResult = opts.teardown();
      if (teardownResult instanceof Promise) {
        await teardownResult;
      }
    }
    
    // Calculate results
    const result: BenchmarkResult = {
      name: opts.name,
      duration,
      operations,
      opsPerSecond: operations / (duration / 1000),
      timestamp: Date.now()
    };
    
    if (opts.trackMemory && startMemory > 0) {
      result.memoryUsed = endMemory - startMemory;
    }
    
    // Store result
    PerformanceBenchmark.results.push(result);
    
    // Store in named benchmark collection
    if (!PerformanceBenchmark.benchmarks[opts.name]) {
      PerformanceBenchmark.benchmarks[opts.name] = [];
    }
    PerformanceBenchmark.benchmarks[opts.name].push(result);
    
    // Log if requested
    if (opts.logResults) {
      this.logResult(result);
    }
    
    return result;
  }

  /**
   * Measure the execution time of a function
   * @param fn Function to measure
   * @param name Optional name for the measurement
   * @returns The execution time in milliseconds
   */
  public static measure(fn: () => void, name?: string): number {
    const startTime = performance.now();
    fn();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    if (name) {
      console.log(`[${name}] Execution time: ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }

  /**
   * Measure the execution time of an asynchronous function
   * @param fn Async function to measure
   * @param name Optional name for the measurement
   * @returns Promise resolving to the execution time in milliseconds
   */
  public static async measureAsync(fn: () => Promise<void>, name?: string): Promise<number> {
    const startTime = performance.now();
    await fn();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    if (name) {
      console.log(`[${name}] Execution time: ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }

  /**
   * Get all benchmark results
   * @returns Array of benchmark results
   */
  public static getAllResults(): BenchmarkResult[] {
    return [...PerformanceBenchmark.results];
  }

  /**
   * Get benchmark results for a specific benchmark name
   * @param name Name of the benchmark
   * @returns Array of benchmark results for the given name
   */
  public static getResultsByName(name: string): BenchmarkResult[] {
    return PerformanceBenchmark.benchmarks[name] || [];
  }

  /**
   * Clear all benchmark results
   */
  public static clearResults(): void {
    PerformanceBenchmark.results = [];
    PerformanceBenchmark.benchmarks = {};
  }

  /**
   * Compare two benchmarks
   * @param benchmark1 Name of the first benchmark
   * @param benchmark2 Name of the second benchmark
   * @returns Comparison as a string
   */
  public static compareBenchmarks(benchmark1: string, benchmark2: string): string {
    const results1 = PerformanceBenchmark.getResultsByName(benchmark1);
    const results2 = PerformanceBenchmark.getResultsByName(benchmark2);
    
    if (results1.length === 0 || results2.length === 0) {
      return `Cannot compare: missing results for ${results1.length === 0 ? benchmark1 : benchmark2}`;
    }
    
    // Calculate averages
    const avg1 = results1.reduce((sum, r) => sum + r.opsPerSecond, 0) / results1.length;
    const avg2 = results2.reduce((sum, r) => sum + r.opsPerSecond, 0) / results2.length;
    
    // Calculate percentage difference
    const diff = avg1 - avg2;
    const percentDiff = (diff / avg2) * 100;
    
    // Determine which is faster
    const faster = avg1 > avg2 ? benchmark1 : benchmark2;
    const slower = faster === benchmark1 ? benchmark2 : benchmark1;
    const absDiff = Math.abs(percentDiff);
    
    return `${faster} is ${absDiff.toFixed(2)}% faster than ${slower}`;
  }

  /**
   * Generate a report of all benchmarks
   * @returns Report as a string
   */
  public static generateReport(): string {
    if (PerformanceBenchmark.results.length === 0) {
      return 'No benchmark results available.';
    }
    
    let report = '=== BENCHMARK REPORT ===\n\n';
    
    // Group by benchmark name
    Object.keys(PerformanceBenchmark.benchmarks).forEach(name => {
      const benchmarks = PerformanceBenchmark.benchmarks[name];
      
      // Calculate statistics
      const opsSec = benchmarks.map(b => b.opsPerSecond);
      const avgOpsSec = opsSec.reduce((sum, ops) => sum + ops, 0) / opsSec.length;
      const minOpsSec = Math.min(...opsSec);
      const maxOpsSec = Math.max(...opsSec);
      
      report += `## ${name}\n`;
      report += `Runs: ${benchmarks.length}\n`;
      report += `Avg ops/sec: ${avgOpsSec.toFixed(2)}\n`;
      report += `Min ops/sec: ${minOpsSec.toFixed(2)}\n`;
      report += `Max ops/sec: ${maxOpsSec.toFixed(2)}\n`;
      
      // Add memory usage if available
      const memoryBenchmarks = benchmarks.filter(b => b.memoryUsed !== undefined);
      if (memoryBenchmarks.length > 0) {
        const avgMemory = memoryBenchmarks.reduce((sum, b) => sum + (b.memoryUsed || 0), 0) / memoryBenchmarks.length;
        report += `Avg memory: ${(avgMemory / (1024 * 1024)).toFixed(2)} MB\n`;
      }
      
      report += '\n';
    });
    
    return report;
  }

  /**
   * Log a benchmark result to the console
   * @param result The benchmark result to log
   */
  private static logResult(result: BenchmarkResult): void {
    console.log(
      `Benchmark [${result.name}]: ${result.operations} ops in ${result.duration.toFixed(2)}ms ` +
      `(${result.opsPerSecond.toFixed(2)} ops/sec)`
    );
    
    if (result.memoryUsed) {
      console.log(`Memory used: ${(result.memoryUsed / (1024 * 1024)).toFixed(2)} MB`);
    }
  }

  /**
   * Export benchmark results to JSON
   * @returns JSON string of all benchmark results
   */
  public static exportToJSON(): string {
    return JSON.stringify(PerformanceBenchmark.results, null, 2);
  }

  /**
   * Import benchmark results from JSON
   * @param json JSON string of benchmark results
   * @returns Whether the import was successful
   */
  public static importFromJSON(json: string): boolean {
    try {
      const results = JSON.parse(json) as BenchmarkResult[];
      
      if (!Array.isArray(results)) {
        return false;
      }
      
      // Replace current results
      PerformanceBenchmark.results = results;
      
      // Rebuild benchmarks map
      PerformanceBenchmark.benchmarks = {};
      for (const result of results) {
        if (!PerformanceBenchmark.benchmarks[result.name]) {
          PerformanceBenchmark.benchmarks[result.name] = [];
        }
        PerformanceBenchmark.benchmarks[result.name].push(result);
      }
      
      return true;
    } catch (e) {
      console.error('Failed to import benchmark results:', e);
      return false;
    }
  }
} 