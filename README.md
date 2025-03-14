# RunJumpSki

A fast-paced first-person skiing game with jetpacks, inspired by classic skiing games and Tribes.

## Overview

RunJumpSki is a TypeScript-based game that combines skiing mechanics with jetpack-powered movement. Players navigate through terrain with varying surface types, using momentum and physics to achieve high speeds and perform impressive jumps.

## Key Features

- **Dynamic Movement System**: Seamlessly transition between running, skiing, and jetpacking
- **Physics-Based Gameplay**: Realistic momentum conservation and surface friction
- **Terrain System**: Procedurally generated terrain with different surface types (snow, ice, rock, metal)
- **Map Boundaries**: Configurable boundary system with multiple behavior options
- **Visual Indicators**: Color-coded terrain steepness visualization and boundary warnings

## Game Mechanics

### Movement

- **Running**: Basic movement on flat surfaces
- **Skiing**: Reduced friction when moving down slopes
- **Jetpacking**: Vertical thrust with limited energy
- **Momentum Conservation**: Maintain speed across different movement states

### Terrain

- **Surface Types**: Different friction properties for snow, ice, rock, and metal
- **Procedural Generation**: Dynamically created terrain with configurable features
- **Visual Indicators**: Color coding for slope steepness and surface types

## Map Boundary System

The map boundary system prevents players from leaving the playable area and provides visual feedback when approaching boundaries.

### Features

- **Configurable Boundaries**: Set custom X, Y, and Z limits for the playable area
- **Multiple Behaviors**: Choose how the game handles boundary violations:
  - `block`: Stop the player at the boundary
  - `bounce`: Bounce the player off the boundary with configurable bounce factor
  - `teleport`: Teleport the player to the opposite boundary
  - `reset`: Reset the player to a specified position
  - `damage`: Apply damage to the player and reset them
- **Visual Indicators**: Optional visual warnings when approaching boundaries
- **Event System Integration**: Fires events for boundary warnings, out-of-bounds, and player resets

### Usage

```typescript
// Create a map boundary component
const mapBoundary = new MapBoundaryComponent({
    minX: -100,
    maxX: 100,
    minY: -50,
    maxY: 150,
    minZ: -100,
    maxZ: 100,
    useVisualIndicators: true,
    boundaryBehavior: 'bounce',
    bounceFactor: 0.8
});

// Add to player entity
player.addComponent('mapBoundary', mapBoundary);

// Enable visualization in the renderer
renderer.toggleMapBoundaries();
```

## Project Structure

```
src/
├── components/     # Game components (physics, terrain, etc.)
├── config/         # Game configuration
├── core/           # Core systems (rendering, physics, etc.)
├── entities/       # Entity classes
├── systems/        # Game systems
├── types/          # TypeScript type definitions
└── utils/          # Utility functions
```

## Development Status

The project is currently in active development. See `GameDevelopmentTasks.txt` for the current roadmap and progress.

### Completed Features

- Core movement system with running, skiing, and jetpacking
- Physics system with momentum conservation
- Terrain generation with different surface types
- Visual indicators for terrain steepness
- Map boundaries with multiple behavior options

### In Progress

- Start and finish line markers
- Environmental props (trees, rocks)

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Run the development server: `npm start`

## Testing

Run the test suite with:

```
npm test
```

Individual tests can be run with:

```
npm test -- --filter=MapBoundaryTest
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.