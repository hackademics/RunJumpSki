**RunJumpSki - Game Design Document (GDD)**

---

# 1. Game Overview

**Title:** RunJumpSki  
**Genre:** First-Person Speedrun / Action / Skill-Based  
**Platform:** Web (Desktop Browsers); Cloudflare Hosting  
**Perspective:** First-Person View (Primary), Option for Secondary Perspective (Future)  
**Art Style:** Stylized Low-Poly with Textures Indicating Terrain Grade & Steepness  
**Core Focus:** Fast, fun, challenging, exciting speed runs with strategy-based route selection and target shooting.

---

# 2. Core Game Loop

1. Player starts at **Point A (Start Line)**
2. Race through expansive, open rectangular maps towards **Point B (Finish Line)**
3. Avoid hazards (terrain slow zones, turret fire)
4. Shoot targets for time reductions
5. Destroy turrets to clear safe paths
6. Leverage skiing and jetpack mechanics to maintain momentum
7. Reach the Finish Line under a target time threshold to unlock new maps

---

# 3. Player Objectives

- Complete the course as fast as possible
- Avoid hazards and time penalties
- Avoid turret fire or destroy turrets with grenades or Spinfusor
- Leverage terrain slopes and obstacles to maximize speed
- Shoot targets for time bonuses (reductions)
- Player cannot die or go out of bounds
- Every level has a maximum allowed completion time

---

# 4. Player Movement & Actions

| **Action**          | **Control**           | **Notes**                                   |
|---------------------|-----------------------|---------------------------------------------|
| Run (default)       | WASD                  | No walking; always running                  |
| Jump                | Tap Spacebar          | Works with skiing and jetpack               |
| Ski                 | Hold Spacebar         | Frictionless slide; works on any surface    |
| Jetpack             | Hold RMB              | Limited by energy, strategic use encouraged |
| Shoot Spinfusor     | LMB                   | Consistent fire rate; long-range projectile |
| Grenade             | G                     | Finite grenades per map; deals high damage  |
| Mouse Movement      | Look / Aim            | Free look independent of movement vector    |

---

# 5. Weapons & Tools

## Spinfusor  
- Long-range disc launcher
- Consistent fire rate (no rapid fire)
- No player knockback, but can secretly boost speed if aimed correctly (hidden feature)
- Primary use: destroy targets and turrets

## Grenade  
- Lobbed projectile with ballistic arc
- Deals more damage than Spinfusor
- Limited per map (future pickups possible)
- Primary use: destroy turrets

---

# 6. Energy & Time Penalties

| **System**         | **Details**                                          |
|--------------------|------------------------------------------------------|
| Jetpack Energy     | Depletes while in use; regenerates when grounded     |
| Energy HUD         | Color-coded (Green, Yellow, Red) meter              |
| Time Penalty - Turrets | Getting hit slows player, adds time penalty        |
| Time Penalty - Fall Damage | From high falls onto flat terrain (later maps only) |

---

# 7. Targets & Turrets

## Targets  
- Static positions; equal opportunity across routes
- Explode and disappear on hit
- Vary in size and location to increase difficulty
- Later maps may require multiple hits
- Hitting all targets grants bonus time reduction

## Turrets  
- Triggered by player proximity
- Vary in accuracy and fire rate per map difficulty
- Slight movement (turret spin/gun tracking), mostly stationary
- Different sizes (editable), scalable damage models
- Can be destroyed by Spinfusor (less damage) or Grenade (more damage)
- Visual feedback on damage, explode and fade on destruction

---

# 8. Maps & Terrain

| **Map**    | **Theme**     | **Difficulty** |
|------------|---------------|----------------|
| Forest     | Novice        | Easy           |
| Jungle     | Beginner      | Medium         |
| Desert     | Moderate      | Hard           |
| Arctic     | Expert        | Very Hard      |

- Rectangular maps (Aspect Ratio ~3:1), promoting A ➡️ B flow
- Multiple equal routes (Left, Center, Right) with unique challenges
- Terrain designed with slopes, valleys, flats, ridges
- Boundaries prevent going out of bounds (natural obstacles preferred)
- Terrain telegraphs grade/steepness via texture and color

---

# 9. HUD & UI

| **HUD Element**     | **Description**                                          |
|---------------------|----------------------------------------------------------|
| Energy Meter        | Green-Yellow-Red meter showing jetpack energy            |
| Speedometer         | Shows player current speed                               |
| Timer               | Shows elapsed time of current run                        |
| Target Counter      | Number of targets destroyed / total targets              |
| Grenade Count       | Remaining grenades available on map                      |
| Crosshair           | Reticle for Spinfusor aiming and grenade direction       |

## Menus & UI
- Start Menu (Game overview, controls, objectives)
- Map Select Menu (Locked/Unlocked maps shown)
- End of Run Screen (Run stats, best time, history)
- Leaderboards per map (Future, Cloudflare Durable Objects)

---

# 10. Audio & SFX (MVP)

- Spinfusor Fire
- Spinfusor Hit / Explosion (Targets/Turrets)
- Grenade Lob & Explosion
- Jetpack Whoosh
- No Skiing SFX (minimalism)
- Ambient sounds per map biome (Future)

---

# 11. Progression & Unlocks

- Unlock next map by completing current map under time threshold
- Later maps require both time thresholds and target clears to unlock
- Player time history and date stored (Cloudflare Durable Objects/KV)
- Ability to replay older maps for better times and leaderboard competition

---

# 12. Art Style & Assets

- Stylized low-poly terrain with readable grade/steepness
- Consistent Target & Turret design with size/color variation
- Reusable assets: Rocks, Trees, Logs, Buildings, Pyramids, Bushes
- Camera: First-person with visible Spinfusor, Humanoid shown on Start/Finish sequences (optional)

---

# 13. Future Features / Stretch Goals

- Multiplayer races
- Replay/Ghost system
- AI-assisted map creation tools
- Custom Player Cosmetics (Skins, Effects)
- Procedural map generation with AI validation
- Dynamic environmental hazards (lava, storms, etc.)

---

# 14. Cloudflare Integration Plan

- Pages: Static web hosting
- Durable Objects/KV: Player data, maps, leaderboards
- Workers: Backend game logic (optional in future)
- R2: Asset storage (Maps, Replays)

---

# 15. MVP Development Roadmap

1. Build Player Controller (Movement, Jetpack, Ski)
2. Blockout First Map Terrain (Forest)
3. Add Targets & Turrets with Interactions
4. HUD Implementation (Energy, Speed, Timer, Targets, Grenades)
5. UI Menus (Start Menu, Map Select, End Screen)
6. Audio SFX Implementation
7. Cloudflare Setup for Leaderboards/Data (Phase 2)

---

# 16. Team & Responsibilities

| **Role**         | **Responsibility**                                  |
|------------------|-----------------------------------------------------|
| Game Designer    | Core loop, mechanics, balancing                     |
| Developer        | Player controller, game logic, networking           |
| Artist (Future)  | Terrain, props, UI, and VFX                         |
| Sound Designer (Future) | SFX, ambient sounds                          |
| Backend Dev      | Cloudflare integrations (Leaderboards, Data storage)|

---

# 17. Conclusion

RunJumpSki aims to be a fast, fun, and replayable first-person racing/shooter experience, inspired by the freedom and momentum mastery of classic games like Tribes 2. Focused on skill-based traversal, strategic shooting, and speedrunning excellence, it encourages player mastery through intuitive design and progressively difficult maps.

---

