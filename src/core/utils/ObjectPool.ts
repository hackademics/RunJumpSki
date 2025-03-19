/**
 * @file src/core/utils/ObjectPool.ts
 * @description Generic object pool for reusing objects to reduce garbage collection overhead
 */

/**
 * Interface for factory functions that create pool objects
 */
export interface IPoolObjectFactory<T> {
  create(): T;
}

/**
 * Interface for objects that can be reset for reuse in a pool
 */
export interface IPoolable {
  reset(): void;
}

/**
 * Generic object pool for reusing objects
 * @template T The type of object to pool
 */
export class ObjectPool<T> {
  private objects: T[] = [];
  private factory: IPoolObjectFactory<T>;
  private resetFn?: (obj: T) => void;
  private maxSize: number;
  private size: number = 0;

  /**
   * Creates a new object pool
   * @param factory Factory function to create new objects
   * @param initialSize Initial size of the pool
   * @param maxSize Maximum size of the pool (0 for unlimited)
   * @param resetFn Optional function to reset objects when returning to pool
   */
  constructor(
    factory: IPoolObjectFactory<T>,
    initialSize: number = 0,
    maxSize: number = 1000,
    resetFn?: (obj: T) => void
  ) {
    this.factory = factory;
    this.maxSize = maxSize;
    this.resetFn = resetFn;

    // Pre-populate the pool
    this.grow(initialSize);
  }

  /**
   * Get an object from the pool or create a new one if empty
   * @returns An object from the pool
   */
  public get(): T {
    if (this.objects.length === 0) {
      return this.factory.create();
    }

    this.size--;
    return this.objects.pop()!;
  }

  /**
   * Return an object to the pool
   * @param obj The object to return to the pool
   * @returns True if the object was added to the pool, false if the pool is full
   */
  public release(obj: T): boolean {
    // If the pool is at max capacity, let the object be garbage collected
    if (this.maxSize > 0 && this.size >= this.maxSize) {
      return false;
    }

    // Reset the object if a reset function was provided
    if (this.resetFn) {
      this.resetFn(obj);
    } else if ((obj as unknown as IPoolable).reset) {
      (obj as unknown as IPoolable).reset();
    }

    this.objects.push(obj);
    this.size++;
    return true;
  }

  /**
   * Grow the pool by creating new objects
   * @param count Number of objects to add
   */
  public grow(count: number): void {
    // Don't exceed max size
    if (this.maxSize > 0) {
      const spaceLeft = this.maxSize - this.size;
      count = Math.min(count, spaceLeft);
    }

    for (let i = 0; i < count; i++) {
      this.objects.push(this.factory.create());
    }
    this.size += count;
  }

  /**
   * Clear all objects from the pool
   */
  public clear(): void {
    this.objects = [];
    this.size = 0;
  }

  /**
   * Get the current number of objects in the pool
   * @returns The number of available objects
   */
  public available(): number {
    return this.objects.length;
  }

  /**
   * Get the total size of the pool including used objects
   * @returns The total pool size
   */
  public getSize(): number {
    return this.size;
  }

  /**
   * Get the maximum size of the pool
   * @returns The maximum pool size (0 for unlimited)
   */
  public getMaxSize(): number {
    return this.maxSize;
  }

  /**
   * Set the maximum size of the pool
   * @param maxSize The new maximum size
   */
  public setMaxSize(maxSize: number): void {
    this.maxSize = maxSize;
    
    // If current size exceeds new max, trim the pool
    if (maxSize > 0 && this.size > maxSize) {
      this.objects.splice(0, this.size - maxSize);
      this.size = maxSize;
    }
  }
} 