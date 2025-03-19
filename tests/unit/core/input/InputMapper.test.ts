/**
 * @file tests/unit/core/input/InputMapper.test.ts
 * @description Unit tests for the InputMapper.
 */

import { InputMapper } from '@core/input/InputMapper';

describe('InputMapper', () => {
  let inputMapper: InputMapper;

  beforeEach(() => {
    inputMapper = new InputMapper();
  });

  test('should return default action for mapped keys', () => {
    expect(inputMapper.getActionForKey('ArrowUp')).toBe('moveUp');
    expect(inputMapper.getActionForKey('ArrowDown')).toBe('moveDown');
    expect(inputMapper.getActionForKey('ArrowLeft')).toBe('moveLeft');
    expect(inputMapper.getActionForKey('ArrowRight')).toBe('moveRight');
    expect(inputMapper.getActionForKey('Space')).toBe('jump');
  });

  test('should return null for unmapped keys', () => {
    expect(inputMapper.getActionForKey('KeyZ')).toBeNull();
  });

  test('should allow updating key mappings', () => {
    inputMapper.setMapping('KeyZ', 'customAction');
    expect(inputMapper.getActionForKey('KeyZ')).toBe('customAction');
  });
});
