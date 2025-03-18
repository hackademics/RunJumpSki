# Type Import Reference

## Babylon.js Types
Always import Babylon.js types as:
```typescript
import * as BABYLON from "babylonjs";
Then use:

BABYLON.Vector3
BABYLON.Scene
BABYLON.Engine

Core Engine Types

Import core types from their source:

typescriptCopyimport { IEntity } from "@core/ecs/IEntity";
import { IComponent } from "@core/ecs/IComponent";
import { System } from "@core/base/System";
Never Create Duplicate Types
The following types already exist and should be imported, not recreated:

Vector3 (use BABYLON.Vector3)
Transform (use TransformComponent)
Logger (import from "@core/utils/Logger")