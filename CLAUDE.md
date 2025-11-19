# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Railway Manager is a web-based simulation game for designing and managing railway networks. The project is built with vanilla JavaScript and uses Leaflet.js for interactive mapping. Currently in Phase 2, which includes train simulation, scheduling, and time controls.

## Development Setup

### Running the Application

This is a static web application with no build process required. Simply open `index.html` in a web browser to run the application locally.

For development with live reload, you can use any static server:
```bash
python3 -m http.server 8000
# or
npx serve
```

### Running Tests

Install dependencies and run tests:
```bash
npm install
npm test              # Run tests once
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
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
- **Train**: `{id, name, line, schedule, progress, speed, direction, status, marker}` - Represents a train entity with movement logic
- **Schedule**: `{line, stops, departureTime, frequency}` - Represents a train's route configuration

### Key Libraries

- **Leaflet.js v1.9.4**: Core mapping library loaded from CDN
- **Leaflet.Draw v1.0.4**: Provides drawing and editing tools for map features
- **Jest v29.7.0**: Testing framework (dev dependency)
- Core libraries loaded via CDN, Jest via npm for testing

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
- `this.trains[]`: Array of all train entities
- `this.drawnItems`: Leaflet FeatureGroup containing all map layers
- `this.currentMode`: Tracks whether drawing 'line' or 'stop'
- `this.simulationEngine`: SimulationEngine instance managing time and train updates

No external state management library is used.

## Code Conventions

- Use ES6 class syntax for main application logic
- Store Leaflet layer references within data objects for direct map manipulation
- Use prompt() for simple user input (can be upgraded to modals in future phases)
- Event listeners are bound in `setupEventListeners()` method
- Map event handlers use Leaflet's event system (`map.on()`)

## Testing Requirements

**CRITICAL: All new code must include comprehensive tests.**

### Test Standards

- **Test location**: All tests in `__tests__/` directory with `.test.js` extension
- **Naming convention**: `<component>.test.js` (e.g., `train.test.js`)
- **All tests must pass**: 100% test success rate required

### When Adding New Features

1. **Write tests FIRST** (TDD approach preferred)
2. **Test coverage required for**:
   - All new classes and their methods
   - All new functions
   - Edge cases and error conditions
   - State changes and side effects
3. **Run tests before committing**:
   ```bash
   npm test
   ```
4. **Ensure all tests pass** in CI/CD pipeline before merging

### Testing Approach

This project uses vanilla JavaScript with classes extracted dynamically for testing. Coverage metrics are not tracked due to the class extraction approach, but all functionality is thoroughly tested:
- 46 comprehensive tests across 3 test suites
- Schedule class: route configuration, stop management
- Train class: movement, physics calculations, state management
- SimulationEngine: time controls, train coordination, updates

### Test Structure

Each test file should follow this pattern:
```javascript
describe('ClassName', () => {
    describe('methodName', () => {
        test('should do something specific', () => {
            // Arrange
            // Act
            // Assert
        });
    });
});
```

### CI/CD Integration

- Tests run automatically on every push via GitHub Actions
- Tests must pass for Node.js 18.x and 20.x
- Coverage reports uploaded to artifacts
- Pull requests require passing tests

### Example Test Files

See existing test files for reference:
- `__tests__/train.test.js`: Train class with movement logic
- `__tests__/schedule.test.js`: Schedule class with route configuration
- `__tests__/simulation.test.js`: SimulationEngine with time controls

## Future Development Considerations

Phase 2 provides train simulation foundation. Future phases will need:
- Data persistence (localStorage or backend API)
- Advanced scheduling (departure times, frequencies)
- Passenger demand and revenue system
- Station upgrades and capacity management
- Economic simulation layer
- Pathfinding optimizations for complex networks

When adding new features:
1. **Create new classes** for distinct entities (don't bloat existing classes)
2. **Write tests first** before implementing features
3. **Update CLAUDE.md** with new architecture details
4. **Maintain separation** between train creation and scheduling
5. **Consider performance** for large networks (100+ trains/stations)
