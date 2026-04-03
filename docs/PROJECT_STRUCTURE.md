# Project Structure (GitHub Pages Mode 1)

Deployment target: GitHub Pages from the `main` branch root (`/`).

## Baseline Layout

- `index.html` - static site entry point (must be at repository root)
- `assets/blender/` - Blender working files (`.blend`)
- `assets/models/` - runtime-ready exported models (`.glb`)
- `src/` - JavaScript/Three.js source code
- `docs/` - assignment notes and submission documentation (not site root)

## Asset Naming Convention

- Blender working file path: `assets/blender/station.blend`
- Exported runtime model path: `assets/models/station.glb`

These two paths should remain stable so loaders, scripts, and documentation stay consistent.
