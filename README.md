# ⚽ FIFA19 — 3D Football Simulation

A browser-based 3D football simulation prototype focused on realistic ball physics, player movement, shooting, passing, AI positioning, and broadcast-style presentation.

## 🎮 Play Online

**[▶ Launch FIFA19](https://salarkhurram989.github.io/FIFA19/)**

## ✨ Features

- 3D football pitch and stadium presentation
- Real-time ball rigidbody-style physics
- Ball drag, bounce, friction and spin
- Magnus-effect curve for shots
- Player acceleration and inertia
- 360° player movement and dribbling
- Dynamic first-touch error system
- Driven ground passing
- Charged shooting
- Timed Finishing system with green/yellow/red timing states
- Basic defensive and attacking AI
- Goalkeeper positioning
- Broadcast-style Tele camera
- Alternate gameplay camera
- Stadium lighting and shadows
- Dynamic pitch wear during the match
- Scoreboard and match timer HUD

## 🕹️ Controls

| Action | Control |
|---|---|
| Move | WASD / Arrow Keys |
| Sprint | Shift |
| Pass | Space |
| Shoot | Hold E, release to shoot |
| Switch camera | C |
| Reset match | R |

## 🧠 Gameplay Systems

### Ball Physics
The simulation includes configurable mass, drag, restitution, friction, angular velocity and Magnus-force parameters. Ball interactions are designed around velocity and impulse rather than teleporting the ball between predefined points.

### Player Movement
Players use acceleration and inertia instead of instantaneous direction changes. Movement direction is independent from player orientation to support 360° dribbling and more natural turns.

### First Touch
First-touch quality varies according to incoming ball speed and player control characteristics, producing controlled variation instead of identical receptions.

### Shooting
Shots support power charging, trajectory variation, spin and timed-finishing states. Finesse-style shots use additional sidespin to create curved trajectories.

### AI
The prototype includes tactical positioning concepts for defensive shape, pressing, attacking movement and goalkeeper positioning.

### Pitch Wear
Player activity progressively modifies the pitch-wear state to provide visual match-time degradation.

## 🗂️ Project Structure

```text
FIFA19/
├── index.html     # Game entry point and HUD
├── style.css      # Interface and visual styling
├── game.js        # Core gameplay, physics, AI and rendering
└── README.md      # Project documentation
```

## 🚀 Running Locally

1. Clone the repository.
2. Open `index.html` in a modern browser, or serve the folder with a local HTTP server.
3. Start the match and use the controls above.

## 🌐 GitHub Pages

This project is published using GitHub Pages:

**https://salarkhurram989.github.io/FIFA19/**

## 📌 Project Status

This is an original football simulation prototype inspired by the gameplay concepts and presentation style of late-2010s football games. It does **not** contain EA Sports/FIFA proprietary source code, assets, trademarks, player likenesses, or other copyrighted game data.

## 🔧 Future Development

Planned areas for expansion include:

- More advanced team tactics
- Improved goalkeeper decision making
- More animation states and transitions
- Better collision and tackle reactions
- Set pieces and free kicks
- More detailed stadium environments
- Replay and cinematic camera system
- Audio commentary and stadium audio
- Match menus and team selection
- Performance and mobile optimization

## 📄 License

This project is an independent educational/game-development prototype. Replace this section with a specific open-source license if you decide to distribute the source under one.

---

**FIFA19 — Football Simulation Prototype**  
Built as an independent game-development project.
