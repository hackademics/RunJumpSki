/**
 * @file src/index.ts
 * @description Entry point for the RunJumpSki game engine
 */

import { Engine } from './core/base/Engine';

// Export public API
export { Engine } from './core/base/Engine';
export { ISystem, SystemOptions } from './core/base/ISystem';
export { System } from './core/base/System';
export { ServiceLocator } from './core/base/ServiceLocator';

// Initialize engine when module is loaded
const engine = new Engine({ debug: true });

// Export the engine instance
export default engine;
