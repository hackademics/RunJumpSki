/**
 * @file tests/unit/core/input/InputSystem.test.ts
 * @description Unit tests for the InputSystem.
 */

import { InputSystem } from '@core/input/InputSystem';
import { IInputManager } from '@core/input/IInputManager';
import { IInputMapper } from '@core/input/IInputMapper';

describe('InputSystem', () => {
  let inputSystem: InputSystem;
  let mockInputManager: IInputManager;
  let mockInputMapper: IInputMapper;

  beforeEach(() => {
    // Create mocks for InputManager and InputMapper
    mockInputManager = {
      isKeyPressed: jest.fn(),
      setKeyState: jest.fn(),
      getMousePosition: jest.fn(),
      setMousePosition: jest.fn(),
    };

    mockInputMapper = {
      getActionForKey: jest.fn().mockReturnValue(null),
      setMapping: jest.fn(),
    };

    // Instantiate InputSystem with the mocks
    inputSystem = new InputSystem(mockInputManager, mockInputMapper);
    inputSystem.initialize();
  });

  afterEach(() => {
    inputSystem.destroy();
    jest.restoreAllMocks();
  });

  test('should call setKeyState with true on keydown event', () => {
    const keyDownEvent = new KeyboardEvent('keydown', { key: 'a' });
    window.dispatchEvent(keyDownEvent);
    expect(mockInputManager.setKeyState).toHaveBeenCalledWith('a', true);
  });

  test('should call setKeyState with false on keyup event', () => {
    const keyUpEvent = new KeyboardEvent('keyup', { key: 'a' });
    window.dispatchEvent(keyUpEvent);
    expect(mockInputManager.setKeyState).toHaveBeenCalledWith('a', false);
  });

  test('should call setMousePosition on mousemove event', () => {
    const mouseMoveEvent = new MouseEvent('mousemove', { clientX: 100, clientY: 200 });
    window.dispatchEvent(mouseMoveEvent);
    expect(mockInputManager.setMousePosition).toHaveBeenCalledWith(100, 200);
  });

  test('should log action on keydown if mapping exists', () => {
    // Spy on console.log
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    // Set the mock to return an action for key 'a'
    (mockInputMapper.getActionForKey as jest.Mock).mockReturnValue('testAction');
    const keyDownEvent = new KeyboardEvent('keydown', { key: 'a' });
    window.dispatchEvent(keyDownEvent);
    expect(mockInputMapper.getActionForKey).toHaveBeenCalledWith('a');
    expect(consoleSpy).toHaveBeenCalledWith(`Action triggered: testAction`);
    consoleSpy.mockRestore();
  });
});
