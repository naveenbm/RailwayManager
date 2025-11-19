// Railway Manager - Main Application Logic

class RailwayManager {
    constructor() {
        this.map = null;
        this.drawnItems = null;
        this.lines = [];
        this.stops = [];
        this.currentMode = null;
        this.editMode = false;
        this.editHandler = null;
        this.lineColors = ['#FF0000', '#0000FF', '#00FF00', '#FF00FF', '#FFA500', '#00FFFF'];
        this.colorIndex = 0;

        this.init();
    }

    init() {
        this.initMap();
        this.setupDrawControls();
        this.setupEventListeners();
    }

    initMap() {
        // Initialize map centered on a default location (e.g., New York City)
        this.map = L.map('map').setView([40.7128, -74.0060], 12);

        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(this.map);

        // Initialize feature group for drawn items
        this.drawnItems = new L.FeatureGroup();
        this.map.addLayer(this.drawnItems);
    }

    setupDrawControls() {
        // Create draw control but don't add it to map
        // We'll trigger drawing programmatically
        this.drawControl = new L.Control.Draw({
            draw: {
                polyline: {
                    shapeOptions: {
                        color: this.getNextColor(),
                        weight: 4
                    }
                },
                polygon: false,
                circle: false,
                rectangle: false,
                circlemarker: false,
                marker: {
                    icon: L.icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    })
                }
            },
            edit: {
                featureGroup: this.drawnItems,
                remove: true
            }
        });

        // Listen for draw events
        this.map.on(L.Draw.Event.CREATED, (e) => this.handleDrawCreated(e));
        this.map.on(L.Draw.Event.DELETED, (e) => this.handleDrawDeleted(e));
        this.map.on(L.Draw.Event.EDITED, (e) => this.handleDrawEdited(e));
    }

    setupEventListeners() {
        document.getElementById('drawLineBtn').addEventListener('click', () => this.startDrawingLine());
        document.getElementById('addStopBtn').addEventListener('click', () => this.startAddingStop());
        document.getElementById('editModeBtn').addEventListener('click', () => this.toggleEditMode());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearAll());
    }

    getNextColor() {
        const color = this.lineColors[this.colorIndex];
        this.colorIndex = (this.colorIndex + 1) % this.lineColors.length;
        return color;
    }

    startDrawingLine() {
        this.currentMode = 'line';
        const color = this.getNextColor();

        // Create a new polyline drawer
        const polylineDrawer = new L.Draw.Polyline(this.map, {
            shapeOptions: {
                color: color,
                weight: 4,
                opacity: 0.8
            }
        });
        polylineDrawer.enable();

        // Store color for this drawing session
        this.currentLineColor = color;
    }

    startAddingStop() {
        this.currentMode = 'stop';

        // Create a custom blue marker for stops
        const stopIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        const markerDrawer = new L.Draw.Marker(this.map, {
            icon: stopIcon
        });
        markerDrawer.enable();
    }

    handleDrawCreated(e) {
        const type = e.layerType;
        const layer = e.layer;

        this.drawnItems.addLayer(layer);

        if (type === 'polyline' && this.currentMode === 'line') {
            this.addLine(layer);
        } else if (type === 'marker' && this.currentMode === 'stop') {
            this.addStop(layer);
        }

        this.currentMode = null;
    }

    handleDrawDeleted(e) {
        const layers = e.layers;
        layers.eachLayer((layer) => {
            // Remove from lines or stops arrays
            this.lines = this.lines.filter(line => line.layer !== layer);
            this.stops = this.stops.filter(stop => stop.layer !== layer);
        });

        this.updateUI();
    }

    handleDrawEdited(e) {
        const layers = e.layers;
        layers.eachLayer((layer) => {
            // Update coordinates in lines array
            const line = this.lines.find(l => l.layer === layer);
            if (line) {
                line.coordinates = layer.getLatLngs();
            }

            // Update coordinates in stops array
            const stop = this.stops.find(s => s.layer === layer);
            if (stop) {
                stop.coordinates = layer.getLatLng();
            }
        });

        this.updateUI();
    }

    toggleEditMode() {
        this.editMode = !this.editMode;
        const editBtn = document.getElementById('editModeBtn');

        if (this.editMode) {
            // Enable edit mode
            editBtn.classList.add('active');
            editBtn.textContent = 'Exit Edit Mode';

            // Create and enable the edit handler
            this.editHandler = new L.EditToolbar.Edit(this.map, {
                featureGroup: this.drawnItems
            });
            this.editHandler.enable();
        } else {
            // Disable edit mode
            editBtn.classList.remove('active');
            editBtn.textContent = 'Edit Mode';

            // Disable the edit handler
            if (this.editHandler) {
                this.editHandler.disable();
                this.editHandler = null;
            }
        }
    }

    addLine(layer) {
        const lineNumber = this.lines.length + 1;
        const lineName = `Line ${lineNumber}`;
        const color = layer.options.color || this.currentLineColor;

        const line = {
            id: Date.now(),
            name: lineName,
            layer: layer,
            color: color,
            coordinates: layer.getLatLngs()
        };

        this.lines.push(line);

        // Add popup to line
        layer.bindPopup(`<b>${lineName}</b><br>Click to edit or delete`);

        // Make line clickable
        layer.on('click', () => {
            const newName = prompt('Enter line name:', line.name);
            if (newName) {
                line.name = newName;
                layer.setPopupContent(`<b>${newName}</b><br>Click to edit or delete`);
                this.updateUI();
            }
        });

        this.updateUI();
    }

    addStop(layer) {
        const stopNumber = this.stops.length + 1;
        const stopName = prompt('Enter stop name:', `Stop ${stopNumber}`) || `Stop ${stopNumber}`;

        const stop = {
            id: Date.now(),
            name: stopName,
            layer: layer,
            coordinates: layer.getLatLng()
        };

        this.stops.push(stop);

        // Add popup to marker
        layer.bindPopup(`<b>${stopName}</b><br>Click to edit`).openPopup();

        // Make marker clickable to edit name
        layer.on('click', () => {
            const newName = prompt('Enter stop name:', stop.name);
            if (newName) {
                stop.name = newName;
                layer.setPopupContent(`<b>${newName}</b><br>Click to edit`);
                this.updateUI();
            }
        });

        this.updateUI();
    }

    updateUI() {
        this.updateLinesList();
        this.updateStopsList();
    }

    updateLinesList() {
        const linesList = document.getElementById('linesList');

        if (this.lines.length === 0) {
            linesList.innerHTML = '<div class="empty-state">No railway lines yet. Click "Draw Railway Line" to start.</div>';
            return;
        }

        linesList.innerHTML = this.lines.map(line => `
            <div class="line-item" data-id="${line.id}">
                <h3>
                    <span class="color-indicator" style="background-color: ${line.color}"></span>
                    ${line.name}
                </h3>
                <p>${line.coordinates.length} points</p>
            </div>
        `).join('');

        // Add click handlers to zoom to lines
        document.querySelectorAll('.line-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const lineId = parseInt(e.currentTarget.dataset.id);
                const line = this.lines.find(l => l.id === lineId);
                if (line) {
                    this.map.fitBounds(line.layer.getBounds());
                    line.layer.openPopup();
                }
            });
        });
    }

    updateStopsList() {
        const stopsList = document.getElementById('stopsList');

        if (this.stops.length === 0) {
            stopsList.innerHTML = '<div class="empty-state">No stops yet. Click "Add Stop" to place one.</div>';
            return;
        }

        stopsList.innerHTML = this.stops.map(stop => `
            <div class="stop-item" data-id="${stop.id}">
                <h3>${stop.name}</h3>
                <p>Lat: ${stop.coordinates.lat.toFixed(4)}, Lng: ${stop.coordinates.lng.toFixed(4)}</p>
            </div>
        `).join('');

        // Add click handlers to zoom to stops
        document.querySelectorAll('.stop-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const stopId = parseInt(e.currentTarget.dataset.id);
                const stop = this.stops.find(s => s.id === stopId);
                if (stop) {
                    this.map.setView(stop.coordinates, 15);
                    stop.layer.openPopup();
                }
            });
        });
    }

    clearAll() {
        if (confirm('Are you sure you want to clear all lines and stops?')) {
            this.drawnItems.clearLayers();
            this.lines = [];
            this.stops = [];
            this.colorIndex = 0;
            this.updateUI();
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.railwayManager = new RailwayManager();
});
