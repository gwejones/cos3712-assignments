# Project Structure (GitHub Pages Mode 1)

Deployment target: GitHub Pages from the `main` branch root (`/`).

## Current Layout

- `index.html` - static app entry point and control-overlay markup/styles
- `src/main.js` - Three.js scene setup, animation loop, and camera/control logic
- `assets/models/` - runtime models loaded by the app (`ship.glb`, `station.glb`)
- `assets/blender/` - Blender working/source files for modeling edits (`ship.blend`, `station.blend`)
- `assets/icons/controls/` - SVG icons used by control buttons, plus icon-source/license notes
- `docs/` - project documentation (`COLOR_PALLETE.md`, this file, and related notes)

## Key Runtime Paths (Stable)

- `index.html`
- `src/main.js`
- `assets/models/station.glb`
- `assets/models/ship.glb`
- `assets/icons/controls/*.svg`

These paths should remain stable because they are referenced directly by the app.

## Modeling Source Of Truth

- Station source model: `assets/blender/station.blend`
- Ship source model: `assets/blender/ship.blend`

Runtime `.glb` files in `assets/models/` are exports for the web app.  
When Blender geometry/material edits are made, re-export matching `.glb` files.

## Controls Icon Assets

- Icon SVG directory: `assets/icons/controls/`
- Icon mapping + licensing notes: `assets/icons/controls/README.md`

The control overlay in `index.html` uses these local SVG files directly via relative links.
