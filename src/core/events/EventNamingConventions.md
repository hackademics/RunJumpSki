# Event Naming Conventions

## Overview

This document establishes consistent naming conventions for events throughout the application. Adhering to these conventions makes event handling more predictable and maintainable.

## Event Types

We use two main approaches to events in our application:

1. **Enum-based events** - Used with strongly typed event systems
2. **String-based events** - Used with the EventEmitter

## Enum-Based Event Names

For typed events used with EventSystem and EventDispatcher:

- Use PascalCase for enum names (e.g., `InputEventType`, `TerrainEvents`)
- Use UPPER_SNAKE_CASE for enum values (e.g., `INPUT_BINDING_CHANGED`, `TERRAIN_LOADED`)
- Group related events within the same enum
- Prefix events with a module or feature name to avoid collisions

Example:
```typescript
export enum InputEventType {
  KEY_DOWN = "input.key.down",
  KEY_UP = "input.key.up",
  INPUT_BINDING_CHANGED = "input.binding.changed",
  INPUT_CONTEXT_CHANGED = "input.context.changed"
}
```

## String-Based Event Names

For string events used with EventEmitter:

- Use lowercase with dots as separators (e.g., `ui.controls.open`)
- Structure as `feature.entity.action` or `module.submodule.action`
- Be specific and descriptive
- Include the feature or module name as a prefix to avoid collisions

Example:
```typescript
// Good
eventEmitter.emit('ui.controls.open', data);
eventEmitter.emit('physics.collision.start', collisionData);

// Avoid
eventEmitter.emit('open', data); // Too vague
eventEmitter.emit('controlsOpen', data); // Inconsistent naming
```

## Event Payload Conventions

- Use interfaces to define event payloads for type safety
- Include only relevant data in the payload
- Consider freezing objects to prevent mutation
- Include a timestamp when appropriate

Example:
```typescript
interface CollisionEventPayload {
  readonly entityA: Entity;
  readonly entityB: Entity;
  readonly contactPoint: Vector3;
  readonly timestamp: number;
}
```

## Handling Event Cleanup

Always ensure proper cleanup of event listeners to prevent memory leaks:

- Store references to event listener functions
- Remove event listeners in dispose/destroy methods
- Use the EventEmitter's returned unsubscribe function when available

Example:
```typescript
// Store reference to handler
this.handleKeyDown = this.onKeyDown.bind(this);

// Add listener
document.addEventListener('keydown', this.handleKeyDown);

// Remove listener in cleanup
public dispose(): void {
  document.removeEventListener('keydown', this.handleKeyDown);
}
``` 