/**
 * @file tests/mocks/events.ts
 * @description Mock implementation of event system for testing
 */

export class EventBus {
  on = jest.fn();
  off = jest.fn();
  emit = jest.fn();
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
}

export const eventBus = new EventBus(); 