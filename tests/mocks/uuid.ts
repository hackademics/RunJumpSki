/**
 * @file tests/mocks/uuid.ts
 * @description Mock implementation of uuid for testing
 */

// Mock uuid v4 implementation that returns predictable UUIDs for testing
export function v4(): string {
  // Return a deterministic UUID for testing
  return '12345678-1234-4321-abcd-1234567890ab';
}

export default {
  v4
}; 