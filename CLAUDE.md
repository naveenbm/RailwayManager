# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Railway Manager is a web-based simulation game for designing and managing railway networks. The project is built with vanilla JavaScript and uses Leaflet.js for interactive mapping. Currently in Phase 1, which focuses on map interaction and network design.

## Development Setup

This is a static web application with no build process required. Simply open `index.html` in a web browser to run the application locally.

For development with live reload, you can use any static server:
```bash
python3 -m http.server 8000
# or
npx serve
```

## Architecture

### Core Components

**RailwayManager Class** (`app.js`): Main application controller that manages:
- Map initialization and tile layer setup
- Drawing controls for lines and stops
- State management for railway lines and stops
- UI updates and event handling

**Data Models**:
- **Line**: `{id, name, layer, color, coordinates}` - Represents a railway line with Leaflet polyline layer
- **Stop**: `{id, name, layer, coordinates}` - Represents a station with Leaflet marker layer

### Key Libraries

- **Leaflet.js v1.9.4**: Core mapping library loaded from CDN
- **Leaflet.Draw v1.0.4**: Provides drawing and editing tools for map features
- Both libraries are loaded via CDN (no npm dependencies)

### Application Flow

1. User clicks "Draw Railway Line" → triggers polyline drawing mode
2. User clicks points on map → creates line coordinates
3. Double-click finalizes line → `handleDrawCreated()` adds to `this.lines` array and map
4. Similar flow for stops using marker drawing mode
5. All features stored in `this.drawnItems` FeatureGroup for bulk operations

### State Management

State is managed entirely in the `RailwayManager` class instance:
- `this.lines[]`: Array of all railway lines
- `this.stops[]`: Array of all stops
- `this.drawnItems`: Leaflet FeatureGroup containing all map layers
- `this.currentMode`: Tracks whether drawing 'line' or 'stop'

No external state management library is used.

## Code Conventions

- Use ES6 class syntax for main application logic
- Store Leaflet layer references within data objects for direct map manipulation
- Use prompt() for simple user input (can be upgraded to modals in future phases)
- Event listeners are bound in `setupEventListeners()` method
- Map event handlers use Leaflet's event system (`map.on()`)

## Future Development Considerations

Phase 1 provides the foundation. Future phases will need:
- Data persistence (localStorage or backend API)
- Train entities and movement simulation
- Time/scheduling system
- Pathfinding algorithms for trains on the network
- Economic/passenger simulation layer

When adding new features, consider extending the `RailwayManager` class or creating separate classes for new entities (e.g., `Train`, `Schedule`, `PassengerSystem`).
