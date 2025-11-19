/**
 * Test setup - Extract classes from app.js for testing
 */

const fs = require('fs');
const path = require('path');

// Mock Leaflet globally
global.L = {
    latLng: (lat, lng) => ({ lat, lng }),
    marker: () => ({
        addTo: jest.fn(),
        setLatLng: jest.fn(),
        bindPopup: jest.fn().mockReturnThis()
    }),
    divIcon: () => ({}),
    map: () => ({
        setView: jest.fn(),
        addLayer: jest.fn(),
        removeLayer: jest.fn(),
        fitBounds: jest.fn(),
        on: jest.fn()
    }),
    tileLayer: () => ({
        addTo: jest.fn()
    }),
    FeatureGroup: class {
        constructor() {
            this.clearLayers = jest.fn();
        }
        addLayer = jest.fn();
        eachLayer = jest.fn();
    },
    Control: {
        Draw: class {}
    },
    Draw: {
        Event: {
            CREATED: 'draw:created',
            DELETED: 'draw:deleted',
            EDITED: 'draw:edited'
        },
        Polyline: class {},
        Marker: class {}
    },
    EditToolbar: {
        Edit: class {
            enable = jest.fn();
            disable = jest.fn();
        }
    }
};

// Read app.js
const appCode = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

// Extract and execute class definitions using Function constructor
// This creates the classes in the current scope

// Extract Schedule class
const scheduleCode = appCode.match(/class Schedule \{[\s\S]*?\n    \}\n\}/)?.[0];
if (scheduleCode) {
    const scheduleConstructor = new Function('return ' + scheduleCode)();
    global.Schedule = scheduleConstructor;
}

// Extract Train class
const trainCode = appCode.match(/class Train \{[\s\S]*?\n    stop\(\) \{[\s\S]*?\n    \}\n\}/)?.[0];
if (trainCode) {
    // Train class uses L.latLng, make sure it's available
    const trainConstructor = new Function('L', 'return ' + trainCode)(global.L);
    global.Train = trainConstructor;
}

// Extract SimulationEngine class
const simCode = appCode.match(/class SimulationEngine \{[\s\S]*?\n    \}\n\}/)?.[0];
if (simCode) {
    const simConstructor = new Function('return ' + simCode)();
    global.SimulationEngine = simConstructor;
}

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));

// Mock Date.now for consistent testing
const mockNow = 1000000;
global.Date.now = jest.fn(() => mockNow);
