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
  /** Duration of the benchmark in milliseconds */
  duration: number;
  /** Number of operations performed during the benchmark */
  operations: number;
  /** Operations per second */
  opsPerSecond: number;
  /** Memory used during the benchmark (if available) */
  memoryUsed?: number;
  /** Additional custom metrics */
  customMetrics?: Record<string, number>;
  /** Timestamp when the benchmark was run */
  timestamp: number;
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
 * Utility class for benchmarking performance
 */
export class PerformanceBenchmark {
  private static results: BenchmarkResult[] = [];
  private static benchmarks: Record<string, BenchmarkResult[]> = {};

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
      console.log(`[Benchmark] ${name}: ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }

  /**
   * Measure the execution time of an async function
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
      console.log(`[Benchmark] ${name}: ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }

  /**
   * Get all benchmark results
   * @returns Array of all benchmark results
   */
  public static getAllResults(): BenchmarkResult[] {
    return [...PerformanceBenchmark.results];
  }

  /**
   * Get benchmark results for a specific benchmark
   * @param name Name of the benchmark
   * @returns Array of benchmark results or empty array if none found
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
   * @param benchmark1 First benchmark name
   * @param benchmark2 Second benchmark name
   * @returns Comparison result as a formatted string
   */
  public static compareBenchmarks(benchmark1: string, benchmark2: string): string {
    const results1 = PerformanceBenchmark.getResultsByName(benchmark1);
    const results2 = PerformanceBenchmark.getResultsByName(benchmark2);
    
    if (results1.length === 0 || results2.length === 0) {
      return `Cannot compare benchmarks: one or both benchmarks not found`;
    }
    
    // Use the most recent result from each benchmark
    const result1 = results1[results1.length - 1];
    const result2 = results2[results2.length - 1];
    
    const durationDiff = ((result2.duration - result1.duration) / result1.duration) * 100;
    const opsDiff = ((result2.opsPerSecond - result1.opsPerSecond) / result1.opsPerSecond) * 100;
    
    let memoryComparison = '';
    if (result1.memoryUsed !== undefined && result2.memoryUsed !== undefined) {
      const memoryDiff = ((result2.memoryUsed - result1.memoryUsed) / result1.memoryUsed) * 100;
      memoryComparison = `Memory: ${memoryDiff >= 0 ? '+' : ''}${memoryDiff.toFixed(2)}%`;
    }
    
    return `
Comparison: ${benchmark1} vs ${benchmark2}
--------------------------------------------
Duration: ${durationDiff >= 0 ? '+' : ''}${durationDiff.toFixed(2)}% (${result1.duration.toFixed(2)}ms vs ${result2.duration.toFixed(2)}ms)
Operations/sec: ${opsDiff >= 0 ? '+' : ''}${opsDiff.toFixed(2)}% (${result1.opsPerSecond.toFixed(2)} vs ${result2.opsPerSecond.toFixed(2)})
${memoryComparison}
    `.trim();
  }

  /**
   * Generate a report of all benchmarks
   * @returns Formatted benchmark report string
   */
  public static generateReport(): string {
    if (PerformanceBenchmark.results.length === 0) {
      return 'No benchmarks have been run.';
    }
    
    let report = 'Performance Benchmark Report\n';
    report += '============================\n\n';
    
    // Group by benchmark name
    Object.keys(PerformanceBenchmark.benchmarks).forEach(name => {
      const benchmarks = PerformanceBenchmark.benchmarks[name];
      const latestBenchmark = benchmarks[benchmarks.length - 1];
      
      report += `Benchmark: ${name}\n`;
      report += `  Last run: ${new Date(latestBenchmark.timestamp).toISOString()}\n`;
      report += `  Duration: ${latestBenchmark.duration.toFixed(2)}ms\n`;
      report += `  Operations: ${latestBenchmark.operations}\n`;
      report += `  Operations/sec: ${latestBenchmark.opsPerSecond.toFixed(2)}\n`;
      
      if (latestBenchmark.memoryUsed !== undefined) {
        report += `  Memory used: ${(latestBenchmark.memoryUsed / (1024 * 1024)).toFixed(2)} MB\n`;
      }
      
      if (benchmarks.length > 1) {
        // Calculate trends
        const firstBenchmark = benchmarks[0];
        const durationDiff = ((latestBenchmark.duration - firstBenchmark.duration) / firstBenchmark.duration) * 100;
        const opsDiff = ((latestBenchmark.opsPerSecond - firstBenchmark.opsPerSecond) / firstBenchmark.opsPerSecond) * 100;
        
        report += `  Trend since first run:\n`;
        report += `    Duration: ${durationDiff >= 0 ? '+' : ''}${durationDiff.toFixed(2)}%\n`;
        report += `    Operations/sec: ${opsDiff >= 0 ? '+' : ''}${opsDiff.toFixed(2)}%\n`;
      }
      
      report += '\n';
    });
    
    return report;
  }

  /**
   * Log a benchmark result to the console
   * @param result Benchmark result to log
   */
  private static logResult(result: BenchmarkResult): void {
    console.log(`
[Benchmark] ${result.name}
  Duration: ${result.duration.toFixed(2)}ms
  Operations: ${result.operations}
  Operations/sec: ${result.opsPerSecond.toFixed(2)}
  ${result.memoryUsed !== undefined ? `Memory used: ${(result.memoryUsed / (1024 * 1024)).toFixed(2)} MB` : ''}
    `.trim());
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
   * @returns True if import was successful
   */
  public static importFromJSON(json: string): boolean {
    try {
      const results = JSON.parse(json) as BenchmarkResult[];
      
      if (!Array.isArray(results)) {
        return false;
      }
      
      // Validate each result
      for (const result of results) {
        if (typeof result.name !== 'string' ||
            typeof result.duration !== 'number' ||
            typeof result.operations !== 'number' ||
            typeof result.opsPerSecond !== 'number' ||
            typeof result.timestamp !== 'number') {
          return false;
        }
      }
      
      // Import valid results
      PerformanceBenchmark.results = results;
      
      // Rebuild benchmarks by name
      PerformanceBenchmark.benchmarks = {};
      for (const result of results) {
        if (!PerformanceBenchmark.benchmarks[result.name]) {
          PerformanceBenchmark.benchmarks[result.name] = [];
        }
        PerformanceBenchmark.benchmarks[result.name].push(result);
      }
      
      return true;
    } catch (error) {
      console.error('Error importing benchmark results:', error);
      return false;
    }
  }
} 