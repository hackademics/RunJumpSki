/**
 * @file tests/unit/core/base/System.test.ts
 * @description Tests for the base System class
 */

import { System } from '../../../../src/core/base/System';
import { SystemOptions } from '../../../../src/core/base/ISystem';

// Create a test implementation of the abstract System class
class TestSystem extends System {
  public testValue: number = 0;
  
  constructor(options?: SystemOptions) {
    super(options);
  }
  
  public async initialize(): Promise<void> {
    await super.initialize();
    this.testValue = 1;
  }
  
  public update(deltaTime: number): void {
    super.update(deltaTime);
    this.testValue += deltaTime;
  }
  
  public async dispose(): Promise<void> {
    await super.dispose();
    this.testValue = 0;
  }
}

describe('System', () => {
  let system: TestSystem;
  
  beforeEach(() => {
    system = new TestSystem();
  });
  
  afterEach(async () => {
    await system.dispose();
  });
  
  test('should have default options', () => {
    expect(system.name).toBe('TestSystem');
    expect(system.priority).toBe(0);
    expect(system.isEnabled()).toBe(true);
  });
  
  test('should accept custom options', () => {
    const customSystem = new TestSystem({
      name: 'CustomSystem',
      priority: 10,
      enabled: false
    });
    
    expect(customSystem.name).toBe('CustomSystem');
    expect(customSystem.priority).toBe(10);
    expect(customSystem.isEnabled()).toBe(false);
  });
  
  test('should be able to enable and disable', () => {
    system.setEnabled(false);
    expect(system.isEnabled()).toBe(false);
    
    system.setEnabled(true);
    expect(system.isEnabled()).toBe(true);
  });
  
  test('should initialize correctly', async () => {
    expect(system.testValue).toBe(0);
    await system.initialize();
    expect(system.testValue).toBe(1);
  });
  
  test('should update correctly', async () => {
    await system.initialize();
    system.update(0.5);
    expect(system.testValue).toBe(1.5);
    
    system.update(0.5);
    expect(system.testValue).toBe(2);
  });
  
  test('should not update when disabled', async () => {
    await system.initialize();
    system.setEnabled(false);
    
    // Update should be ignored when system is disabled
    system.update(0.5);
    expect(system.testValue).toBe(1);
  });
  
  test('should dispose correctly', async () => {
    await system.initialize();
    expect(system.testValue).toBe(1);
    
    await system.dispose();
    expect(system.testValue).toBe(0);
  });
});
