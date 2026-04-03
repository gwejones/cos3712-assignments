# COS3712 Interactive 3D Space Station (Part 1)

This repository is for **Assessment 2 - Part 1** of the COS3712 space station project.
It focuses on building and animating an interactive 3D space station using a JavaScript/WebGL stack (Three.js) with Blender-produced assets.

## Scope

Part 1 covers:

- Space station construction using primitives
- Object animation (station components and spacecraft)
- Perspective projection
- Camera navigation and user controls

## Part 1 Objectives

- Build a 3D space station using primitives.
- Animate spacecraft and rotating components.
- Implement full camera navigation.
- Use perspective projection.

## Mandatory Implementation Requirements (Part 1)

### 1) Space Station Structure

- Central core using cylinders or spheres
- Minimum **6** docking modules
- Minimum **4** solar panel arrays
- Minimum **2** communication towers
- Station must rotate slowly in space
- Must demonstrate scaling, rotation, and translation

### 2) Spacecraft and Animation

- Minimum **4** spacecraft following defined orbital paths
- Smooth continuous movement using translation and rotation
- Controls to pause/resume all ships simultaneously

### 3) Camera and User Controls

- Free camera movement: forward/backward, left/right, up/down
- Zoom in/out
- Switch between external orbit view and first-person docking view
- Camera movement must be smooth

## Submission Requirements (Part 1)

- Zip folder containing all source code
- Documentation (PDF or video) including proof of compilation
- Proof of working animations (screenshots or video)
- Explanation of how to use camera and user controls
- Explanation of incomplete features (if any)

Failure to submit documentation results in a mark of zero.

## Part 1 Rubric Weighting (Part A)

- Station Layout and Structure: **35%**
- Animated Objects: **25%**
- Camera Movement and Control: **30%**
- Documentation and Explanation: **10%**

## Technical Stack

- JavaScript + WebGL (`three.js`)
- Blender for modelling
- Export final runtime model(s) as `.glb`

## Deployment

This project is structured for GitHub Pages:

- Publish from `main` branch
- Folder: repository root (`/`)

That means `index.html` is kept at the repository root and static assets are loaded via relative paths.

## Repository Structure

- `index.html` - site entry point for GitHub Pages
- `assets/blender/` - Blender working files (`.blend`)
- `assets/models/` - runtime exported models (`.glb`)
- `src/` - application source code
- `docs/` - project and submission documentation

Expected core asset paths:

- `assets/blender/station.blend`
- `assets/models/station.glb`

## Academic Integrity

Projects must be individually produced. Submissions that appear too similar may be awarded zero.
