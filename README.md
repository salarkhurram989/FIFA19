# ⚽ FIFA19 — 3D Football Simulation

A browser-based 3D football simulation prototype built with **Three.js/WebGL**. The current version uses a single self-contained `index.html` so GitHub Pages can serve the game directly.

## 🎮 Play Online

### [▶ LAUNCH FIFA19](https://salarkhurram989.github.io/FIFA19/)

## ✨ Current Features

- Real-time Three.js/WebGL 3D rendering
- High-contrast football pitch markings
- Center circle, penalty areas, six-yard areas and goal lines
- Stadium shell, floodlights, directional shadows and ambient lighting
- 22 capsule-based football players
- Distinct Home/Away kits
- Player team rings and active-player marker
- WASD + Arrow-key movement
- 1.5× sprint with Shift
- Player acceleration and inertia
- 360° movement
- Player-to-player collision resolution
- Player/ball collision detection
- Physical ball velocity, gravity, drag, bounce and friction
- Ball spin and Magnus-force curve
- Driven passing toward the nearest useful teammate
- Charged shooting
- Green / Yellow / Red timed finishing
- Q player switching
- R ball reset
- Three camera modes
- Dynamic attacking/defensive AI movement
- Goalkeeper positioning
- Goal trigger and live scoreboard updates
- MM:SS match timer
- Mobile/touch control overlay
- Keyboard focus-loss recovery
- Arrow/Space page-scroll prevention

## 🕹️ Controls

| Action | Keyboard | Touch UI |
|---|---|---|
| Move | WASD / Arrow Keys | Direction buttons |
| Sprint | Shift | SPRINT |
| Pass | E | PASS E |
| Shoot | Hold Space, release | SHOOT SPACE |
| Switch player | Q | SWITCH Q |
| Reset ball | R | — |
| Camera | C | CAM C |

### Shooting

Hold **Space** to charge the shot. Release Space to shoot. The timing system evaluates the release point and displays **GREEN**, **YELLOW**, or **RED** finishing quality.

### Passing

Press **E** while within 1.5 units of the ball. The system searches for a useful nearby teammate and applies physical ball velocity toward that player.

## 🧠 Physics & Gameplay

### Ball

The ball uses a custom lightweight physics layer with:

```text
Mass              0.43 kg
Drag coefficient  0.25
Restitution       0.78
Angular drag      0.05
Magnus multiplier 0.00035
Radius            0.11 m
```

Ball motion includes gravity, aerodynamic drag, spin decay, Magnus force, pitch friction and boundary/goal interactions.

### Player collisions

Players use capsule-like gameplay dimensions and a horizontal capsule approximation. Overlapping players are separated every simulation frame to prevent clipping through teammates and opponents.

### Ball collisions

The ball is checked against player body volumes. When contact occurs, relative velocity is used to produce a deflection/impulse rather than teleporting the ball.

## 📷 Camera Modes

Press **C** to cycle through:

1. **Tele-Broadcast** — elevated match camera following the ball.
2. **Overhead** — tactical top-down view.
3. **Follow Camera** — lower camera following the controlled player.

## 🤖 AI

The prototype AI maintains formation anchors while shifting toward the ball, performs contextual pressure, moves attacking players into useful spaces, and continuously positions goalkeepers around the ball's lateral threat.

## ⏱️ Match System

The match clock runs continuously in simulation time and displays `MM:SS`. Goals are detected when the ball crosses the goal line inside the goal mouth, immediately updating the scoreboard and resetting the ball to the center spot.

## 🗂️ Project Structure

```text
FIFA19/
├── index.html     # Complete game: HTML + CSS + Three.js gameplay code
├── game.js        # Previous prototype implementation kept for reference
├── style.css      # Previous prototype stylesheet kept for reference
└── README.md      # Project documentation
```

The live GitHub Pages build uses **`index.html`** directly.

## 🚀 Running Locally

Because the game imports Three.js as an ES module, use a local HTTP server rather than opening the file through `file://`.

Example:

```text
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

## 🌐 GitHub Pages

Live website:

**https://salarkhurram989.github.io/FIFA19/**

Repository:

**https://github.com/salarkhurram989/FIFA19**

## 📌 Project Status

This is an independent football simulation prototype inspired by the presentation and gameplay concepts of late-2010s football games. It does **not** contain EA Sports/FIFA proprietary source code, assets, trademarks, player likenesses, or copyrighted game data.

## 🔧 Future Development

- Full 11v11 tactical state machine
- More advanced goalkeeper saves and decision making
- Animation blend trees and motion matching
- Tackles and physical contact animations
- Set pieces and free kicks
- Better ball-foot contact animation
- Replay/cinematic camera system
- Stadium crowd and audio systems
- Team selection and match menus
- Persistent player attributes
- Improved pitch wear textures
- Performance optimization and quality settings

---

**FIFA19 — Independent 3D Football Simulation Prototype**
