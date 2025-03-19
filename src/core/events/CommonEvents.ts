import { Event, DataEvent } from './Event';

// Event type constants
export const EventTypes = {
  // Engine lifecycle events
  ENGINE_INITIALIZED: 'engine.initialized',
  ENGINE_SHUTDOWN: 'engine.shutdown',
  ENGINE_PAUSED: 'engine.paused',
  ENGINE_RESUMED: 'engine.resumed',
  
  // System lifecycle events
  SYSTEM_REGISTERED: 'system.registered',
  SYSTEM_UNREGISTERED: 'system.unregistered',
  
  // Resource events
  RESOURCE_LOADED: 'resource.loaded',
  RESOURCE_FAILED: 'resource.failed',
  RESOURCE_PROGRESS: 'resource.progress',
  
  // Input events
  INPUT_KEY_DOWN: 'input.key.down',
  INPUT_KEY_UP: 'input.key.up',
  INPUT_MOUSE_MOVE: 'input.mouse.move',
  INPUT_MOUSE_DOWN: 'input.mouse.down',
  INPUT_MOUSE_UP: 'input.mouse.up',
  
  // Scene events
  SCENE_LOADED: 'scene.loaded',
  SCENE_UNLOADED: 'scene.unloaded',
  
  // Entity events
  ENTITY_CREATED: 'entity.created',
  ENTITY_DESTROYED: 'entity.destroyed',
  ENTITY_COMPONENT_ADDED: 'entity.component.added',
  ENTITY_COMPONENT_REMOVED: 'entity.component.removed'
};

/**
 * Event fired when a system is registered or unregistered
 */
export class SystemEvent extends DataEvent<{
  systemType: string;
  priority: number;
}> {
  constructor(type: string, systemType: string, priority: number) {
    super(type, { systemType, priority });
  }
}

/**
 * Event for resource loading updates
 */
export class ResourceEvent extends DataEvent<{
  resourceId: string;
  resourceType: string;
  url?: string;
  progress?: number;
  error?: Error;
}> {
  constructor(type: string, resourceId: string, resourceType: string, options?: {
    url?: string;
    progress?: number;
    error?: Error;
  }) {
    super(type, {
      resourceId,
      resourceType,
      ...(options || {})
    });
  }
}

/**
 * Event for input key actions
 */
export class KeyInputEvent extends DataEvent<{
  key: string;
  code: string;
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
  repeat: boolean;
}> {
  constructor(type: string, key: string, code: string, modifiers: {
    altKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    metaKey?: boolean;
    repeat?: boolean;
  } = {}) {
    super(type, {
      key,
      code,
      altKey: modifiers.altKey || false,
      ctrlKey: modifiers.ctrlKey || false,
      shiftKey: modifiers.shiftKey || false,
      metaKey: modifiers.metaKey || false,
      repeat: modifiers.repeat || false
    });
  }
}

/**
 * Event for mouse input actions
 */
export class MouseInputEvent extends DataEvent<{
  x: number;
  y: number;
  button?: number;
  buttons?: number;
  movementX?: number;
  movementY?: number;
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}> {
  constructor(type: string, x: number, y: number, options: {
    button?: number;
    buttons?: number;
    movementX?: number;
    movementY?: number;
    altKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    metaKey?: boolean;
  } = {}) {
    super(type, {
      x,
      y,
      button: options.button,
      buttons: options.buttons,
      movementX: options.movementX,
      movementY: options.movementY,
      altKey: options.altKey || false,
      ctrlKey: options.ctrlKey || false,
      shiftKey: options.shiftKey || false,
      metaKey: options.metaKey || false
    });
  }
}

/**
 * Event for entity-related actions
 */
export class EntityEvent extends DataEvent<{
  entityId: string;
  componentType?: string;
}> {
  constructor(type: string, entityId: string, componentType?: string) {
    super(type, {
      entityId,
      componentType
    });
  }
}