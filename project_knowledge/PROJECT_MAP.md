# Project Map

## Directory Structure
This is the ONLY valid directory structure. Do not create alternative folders or duplicate functionality.

- src/
  - core/
    - base/              # Base abstract classes and interfaces only
    - ecs/               # Entity Component System
    - renderer/          # All rendering functionality goes here, NOT in "rendering"
    - input/             # Input handling systems
    - physics/           # Physics system integration
    - events/            # Event bus and messaging
    - assets/            # Asset loading and management
    - utils/             # Utility functions and helpers
    - debug/             # Debugging tools
  - types/               # Type definitions
  - index.ts             # Entry point

## Naming Conventions
- Components go in `src/core/ecs/components/` or specialized subfolders
- Systems go in their respective domain folders (renderer, physics, etc.)
- Do not create duplicate folders (e.g., NO "rendering" when "renderer" exists)
- Do not create nested component folders like "base/components"