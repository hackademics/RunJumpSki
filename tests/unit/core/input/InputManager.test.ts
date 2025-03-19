/**
 * @file tests/unit/core/input/InputManager.test.ts
 * @description Unit tests for the InputManager.
 */

import { InputManager } from '@core/input/InputManager';

describe('InputManager', () => {
  let inputManager: InputManager;

  beforeEach(() => {
    inputManager = new InputManager();
  });

  test('should return false for keys that are not pressed', () => {
    expect(inputManager.isKeyPressed('a')).toBe(false);
  });

  test('should set and get key state correctly', () => {
    inputManager.setKeyState('a', true);
    expect(inputManager.isKeyPressed('a')).toBe(true);
    inputManager.setKeyState('a', false);
    expect(inputManager.isKeyPressed('a')).toBe(false);
  });

  test('should set and get mouse position correctly', () => {
    inputManager.setMousePosition(150, 250);
    expect(inputManager.getMousePosition()).toEqual({ x: 150, y: 250 });
  });
});
