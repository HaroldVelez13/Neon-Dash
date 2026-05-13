# Project Specifications

## Overview
Neon Dash is a fast-paced endless runner game built with vanilla JavaScript, HTML5 Canvas, and CSS. The player controls a neon cube that must avoid obstacles while surviving as long as possible.

## Project Structure
- **Root Directory**: `/home/harold/projects/first-oc`
- **Configuration Directory**: `.opencode/`
- **Main Files**:
  - `index.html` - Main HTML structure
  - `game.js` - Game logic and rendering
  - `styles.css` - Visual styling

## Game Features

### Core Mechanics
- **Player Control**: Single-button input (Space, Click, or Tap) to jump
- **Obstacles**: Randomly generated red neon barriers
- **Scoring**: Points awarded for each obstacle passed
- **Combo System**: Consecutive obstacles multiply points (up to 5x)
- **Difficulty Curve**: Speed and frequency increase progressively

### Visual Effects
- **Neon Aesthetic**: Glowing cyan player, red obstacles
- **Particle System**: Explosion effects on jump, score, and crash
- **Screen Shake**: Impact feedback on collision
- **Flash Effects**: Visual feedback on scoring
- **Trail Effect**: Player leaves a fading trail
- **Pulse Animation**: Obstacles glow with varying intensity

### Audio Feedback
- **Jump Sound**: Rising pitch effect
- **Score Sound**: Ascending tone based on combo
- **Crash Sound**: Harsh sawto wave on collision

### UI Elements
- **Score Display**: Current score with neon glow
- **Best Score**: Persisted in localStorage
- **Combo Display**: Shows active combo multiplier
- **Start Screen**: Game title and instructions
- **Game Over Screen**: Final score and restart button

## Technical Specifications

### Technologies Used
- **HTML5 Canvas**: Game rendering
- **Vanilla JavaScript**: No external dependencies
- **CSS3**: Styling with neon effects and animations
- **Web Audio API**: Sound effects generation

### Performance
- **60 FPS Target**: Smooth animations
- **Responsive Design**: Adapts to container size
- **Efficient Rendering**: Particle cleanup and optimization

### Storage
- **localStorage**: Best score persistence (`neonDashBestScore`)

## Configuration Files

### `.opencode/rules.mdc`
- Main configuration file for the project
- Defines project-wide rules and settings

### `.opencode/ignored.txt`
- Specifies files and directories to ignore
- Similar to `.gitignore` functionality

## Git Configuration
- **Remote**: `https://github.com/HaroldVelez13/Neon-Dash.git`
- **Branch**: `main`

## Guidelines

### Code Style
- Follow JavaScript conventions
- Maintain consistency across the codebase
- Use meaningful variable and function names
- No external dependencies

### File Organization
- `index.html` - Structure only
- `game.js` - All game logic
- `styles.css` - All styling

### Documentation
- Keep documentation up to date
- Document public APIs and interfaces
- Include usage examples where applicable

## Notes
- Project created as first-oc (first open code project)
- Configuration managed through `.opencode/` directory
- No external libraries or frameworks used
