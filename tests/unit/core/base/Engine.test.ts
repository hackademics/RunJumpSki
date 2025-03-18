  test('should set and get debug mode', () => {
    expect(engine.isDebug()).toBe(false);
    
    engine.setDebug(true);
    expect(engine.isDebug()).toBe(true);
    
    engine.setDebug(false);
    expect(engine.isDebug()).toBe(false);
  });
});
