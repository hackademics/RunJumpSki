/**
 * @file tests/unit/core/utils/ObjectPoolFactory.test.ts
 * @description Unit tests for the ObjectPoolFactory
 */

import { ObjectPoolFactory, IPoolableComponent } from '../../../../src/core/utils/ObjectPoolFactory';
import { ObjectPool, IPoolable, IPoolObjectFactory } from '../../../../src/core/utils/ObjectPool';
import { Component } from '../../../../src/core/ecs/Component';
import { IEntity } from '../../../../src/core/ecs/IEntity';
import { ComponentOptions } from '../../../../src/core/ecs/IComponent';

// Create a simple poolable test object
class PoolableTestObject implements IPoolable {
    public value: number = 0;
    public isReset: boolean = false;
    
    constructor(initialValue: number = 0) {
        this.value = initialValue;
    }
    
    public reset(): void {
        this.value = 0;
        this.isReset = true;
    }
}

// Create a simple poolable test component
class TestPoolableComponent extends Component implements IPoolable {
    public readonly type: string = 'test-poolable';
    public testValue: number = 0;
    
    constructor(options: ComponentOptions = { type: 'test-poolable' }) {
        super(options);
        this.testValue = 0;
    }
    
    public update(deltaTime: number): void {
        // Nothing to do
    }
    
    public reset(): void {
        this.testValue = 0;
        this.setEnabled(true);
    }
}

describe('ObjectPoolFactory', () => {
    // Clear all pools before each test
    beforeEach(() => {
        ObjectPoolFactory.clearAllPools();
    });
    
    describe('Generic Object Pooling', () => {
        test('should create a new pool', () => {
            // Arrange
            const factory: IPoolObjectFactory<PoolableTestObject> = {
                create: () => new PoolableTestObject()
            };
            
            // Act
            const pool = ObjectPoolFactory.createPool<PoolableTestObject>('test-pool', factory, 5, 10);
            
            // Assert
            expect(pool).toBeInstanceOf(ObjectPool);
            expect(pool.available()).toBe(5);
            expect(pool.getMaxSize()).toBe(10);
        });
        
        test('should return the same pool when requesting an existing pool', () => {
            // Arrange
            const factory: IPoolObjectFactory<PoolableTestObject> = {
                create: () => new PoolableTestObject()
            };
            const pool1 = ObjectPoolFactory.createPool<PoolableTestObject>('test-pool', factory, 5, 10);
            
            // Act
            const pool2 = ObjectPoolFactory.createPool<PoolableTestObject>('test-pool', factory, 3, 20);
            
            // Assert
            expect(pool2).toBe(pool1);
            expect(pool2.available()).toBe(5); // Should maintain original settings
            expect(pool2.getMaxSize()).toBe(10);
        });
        
        test('should check if a pool exists', () => {
            // Arrange
            const factory: IPoolObjectFactory<PoolableTestObject> = {
                create: () => new PoolableTestObject()
            };
            ObjectPoolFactory.createPool<PoolableTestObject>('test-pool', factory);
            
            // Act & Assert
            expect(ObjectPoolFactory.hasPool('test-pool')).toBe(true);
            expect(ObjectPoolFactory.hasPool('nonexistent-pool')).toBe(false);
        });
        
        test('should get an existing pool', () => {
            // Arrange
            const factory: IPoolObjectFactory<PoolableTestObject> = {
                create: () => new PoolableTestObject()
            };
            const createdPool = ObjectPoolFactory.createPool<PoolableTestObject>('test-pool', factory);
            
            // Act
            const retrievedPool = ObjectPoolFactory.getPool<PoolableTestObject>('test-pool');
            
            // Assert
            expect(retrievedPool).toBe(createdPool);
        });
        
        test('should return undefined when getting a non-existent pool', () => {
            // Act
            const pool = ObjectPoolFactory.getPool<PoolableTestObject>('nonexistent-pool');
            
            // Assert
            expect(pool).toBeUndefined();
        });
        
        test('should remove a pool', () => {
            // Arrange
            const factory: IPoolObjectFactory<PoolableTestObject> = {
                create: () => new PoolableTestObject()
            };
            ObjectPoolFactory.createPool<PoolableTestObject>('test-pool', factory);
            
            // Act
            const result = ObjectPoolFactory.removePool('test-pool');
            
            // Assert
            expect(result).toBe(true);
            expect(ObjectPoolFactory.hasPool('test-pool')).toBe(false);
        });
        
        test('should return false when removing a non-existent pool', () => {
            // Act
            const result = ObjectPoolFactory.removePool('nonexistent-pool');
            
            // Assert
            expect(result).toBe(false);
        });
        
        test('should clear all pools', () => {
            // Arrange
            const factory: IPoolObjectFactory<PoolableTestObject> = {
                create: () => new PoolableTestObject()
            };
            ObjectPoolFactory.createPool<PoolableTestObject>('test-pool-1', factory);
            ObjectPoolFactory.createPool<PoolableTestObject>('test-pool-2', factory);
            
            // Act
            ObjectPoolFactory.clearAllPools();
            
            // Assert
            expect(ObjectPoolFactory.hasPool('test-pool-1')).toBe(false);
            expect(ObjectPoolFactory.hasPool('test-pool-2')).toBe(false);
        });
        
        test('should get pool statistics', () => {
            // Arrange
            const factory: IPoolObjectFactory<PoolableTestObject> = {
                create: () => new PoolableTestObject()
            };
            ObjectPoolFactory.createPool<PoolableTestObject>('test-pool-1', factory, 5);
            ObjectPoolFactory.createPool<PoolableTestObject>('test-pool-2', factory, 10);
            
            // Act
            const stats = ObjectPoolFactory.getPoolStats();
            
            // Assert
            expect(stats['test-pool-1'].total).toBe(5);
            expect(stats['test-pool-1'].available).toBe(5);
            expect(stats['test-pool-2'].total).toBe(10);
            expect(stats['test-pool-2'].available).toBe(10);
        });
    });
    
    describe('Component Pooling', () => {
        test('should create a component pool', () => {
            // Arrange
            const factory: IPoolObjectFactory<TestPoolableComponent> = {
                create: () => new TestPoolableComponent()
            };
            
            // Act
            const pool = ObjectPoolFactory.getComponentPool<TestPoolableComponent>('test-poolable', factory);
            
            // Assert
            expect(pool).toBeInstanceOf(ObjectPool);
            expect(ObjectPoolFactory.hasPool('component:test-poolable')).toBe(true);
        });
        
        test('should return the same component pool when requesting the same component type', () => {
            // Arrange
            const factory: IPoolObjectFactory<TestPoolableComponent> = {
                create: () => new TestPoolableComponent()
            };
            const pool1 = ObjectPoolFactory.getComponentPool<TestPoolableComponent>('test-poolable', factory);
            
            // Act
            const pool2 = ObjectPoolFactory.getComponentPool<TestPoolableComponent>('test-poolable', factory);
            
            // Assert
            expect(pool2).toBe(pool1);
        });
        
        test('should use default options when none are provided', () => {
            // Arrange
            const factory: IPoolObjectFactory<TestPoolableComponent> = {
                create: () => new TestPoolableComponent()
            };
            
            // Act
            const pool = ObjectPoolFactory.getComponentPool<TestPoolableComponent>('test-poolable', factory);
            
            // Assert
            expect(pool.available()).toBe(10); // DEFAULT_COMPONENT_POOL_OPTIONS.initialSize
            expect(pool.getMaxSize()).toBe(100); // DEFAULT_COMPONENT_POOL_OPTIONS.maxSize
        });
        
        test('should use provided options when creating a component pool', () => {
            // Arrange
            const factory: IPoolObjectFactory<TestPoolableComponent> = {
                create: () => new TestPoolableComponent()
            };
            
            // Act
            const pool = ObjectPoolFactory.getComponentPool<TestPoolableComponent>(
                'test-poolable', 
                factory, 
                {
                    initialSize: 5,
                    maxSize: 20
                }
            );
            
            // Assert
            expect(pool.available()).toBe(5);
            expect(pool.getMaxSize()).toBe(20);
        });
    });
}); 