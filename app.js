// Railway Manager - Main Application Logic

// ==================== Passenger Class ====================
class Passenger {
    constructor(id, origin, destination) {
        this.id = id;
        this.origin = origin; // Stop object
        this.destination = destination; // Stop object
        this.boardedTrain = null;
        this.status = 'waiting'; // 'waiting', 'traveling', 'delivered'
        this.waitTime = 0; // seconds
        this.tripStartTime = null;
    }

    board(train) {
        this.boardedTrain = train;
        this.status = 'traveling';
        this.tripStartTime = Date.now();
    }

    alight() {
        this.status = 'delivered';
        this.boardedTrain = null;
    }
}

// ==================== Economic System ====================
class EconomicSystem {
    constructor(startingMoney = 50000) {
        this.money = startingMoney;
        this.totalRevenue = 0;
        this.totalCosts = 0;
        this.baseFare = 5; // Base fare per passenger
        this.farePerKm = 0.10; // Additional fare per km
        this.trainOperatingCostPerSec = 0.05; // Cost per second per train
        this.lineMaintenanceCostPerSec = 0.02; // Cost per second per line
    }

    earnRevenue(amount, reason = 'passenger') {
        this.money += amount;
        this.totalRevenue += amount;
    }

    spendMoney(amount, reason = 'operating') {
        this.money -= amount;
        this.totalCosts += amount;
        return this.money >= 0; // Return true if still solvent
    }

    calculatePassengerFare(distance) {
        return this.baseFare + (distance / 1000) * this.farePerKm;
    }

    getBalance() {
        return this.money;
    }

    getProfit() {
        return this.totalRevenue - this.totalCosts;
    }
}

// ==================== Schedule Class ====================
class Schedule {
    constructor(line, stops = []) {
        this.line = line; // Reference to line object
        this.stops = stops; // Array of stop objects this train will visit
        this.departureTime = null; // Optional: scheduled departure time
        this.frequency = null; // Optional: how often train runs (in minutes)
    }

    hasStop(stopId) {
        return this.stops.some(stop => stop.id === stopId);
    }
}

// ==================== Train Class ====================
class Train {
    constructor(id, name, line = null) {
        this.id = id;
        this.name = name;
        this.line = line; // Reference to line object (optional)
        this.schedule = null; // Schedule object with route and stops
        this.progress = 0; // 0 to 1, position along the line
        this.speed = 0.01; // Base speed per update (adjustable)
        this.direction = 1; // 1 for forward, -1 for backward
        this.status = 'stopped'; // 'stopped', 'running', or 'unscheduled'
        this.marker = null; // Leaflet marker for visual representation
        this.currentPosition = null; // LatLng object

        // Phase 3: Passenger capacity
        this.capacity = 100; // Maximum passengers
        this.passengers = []; // Current passengers on board
        this.totalPassengersDelivered = 0;
    }

    update(deltaTime, simulationSpeed) {
        if (this.status !== 'running' || !this.line) return;

        // Move the train along the line
        const adjustedSpeed = this.speed * deltaTime * simulationSpeed;
        this.progress += adjustedSpeed * this.direction;

        // Handle reaching end of line (reverse direction)
        if (this.progress >= 1) {
            this.progress = 1;
            this.direction = -1;
        } else if (this.progress <= 0) {
            this.progress = 0;
            this.direction = 1;
        }

        // Update position on map
        this.updatePosition();
    }

    updatePosition() {
        if (!this.line || !this.line.layer) return;

        const coordinates = this.line.coordinates;
        if (coordinates.length < 2) return;

        // Calculate position along the polyline
        const position = this.getPositionAlongLine(coordinates, this.progress);
        this.currentPosition = position;

        // Update marker position
        if (this.marker) {
            this.marker.setLatLng(position);
        }
    }

    getPositionAlongLine(coords, progress) {
        // Calculate total length of the line
        let totalLength = 0;
        const segments = [];

        for (let i = 0; i < coords.length - 1; i++) {
            const from = coords[i];
            const to = coords[i + 1];
            const segmentLength = this.distance(from, to);
            segments.push({ from, to, length: segmentLength });
            totalLength += segmentLength;
        }

        // Find the segment and position within it
        const targetDistance = totalLength * progress;
        let accumulatedDistance = 0;

        for (const segment of segments) {
            if (accumulatedDistance + segment.length >= targetDistance) {
                const segmentProgress = (targetDistance - accumulatedDistance) / segment.length;
                return this.interpolate(segment.from, segment.to, segmentProgress);
            }
            accumulatedDistance += segment.length;
        }

        // Return last point if something goes wrong
        return coords[coords.length - 1];
    }

    distance(point1, point2) {
        const lat1 = point1.lat;
        const lon1 = point1.lng;
        const lat2 = point2.lat;
        const lon2 = point2.lng;

        const R = 6371e3; // Earth radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    interpolate(point1, point2, progress) {
        return L.latLng(
            point1.lat + (point2.lat - point1.lat) * progress,
            point1.lng + (point2.lng - point1.lng) * progress
        );
    }

    // Phase 3: Passenger management
    boardPassengers(passengers) {
        const availableSpace = this.capacity - this.passengers.length;
        const toBoard = passengers.slice(0, availableSpace);

        toBoard.forEach(passenger => {
            passenger.board(this);
            this.passengers.push(passenger);
        });

        return toBoard;
    }

    alightPassengers(stop) {
        const alighting = this.passengers.filter(p => p.destination.id === stop.id);

        alighting.forEach(passenger => {
            passenger.alight();
            this.totalPassengersDelivered++;
        });

        this.passengers = this.passengers.filter(p => p.destination.id !== stop.id);

        return alighting;
    }

    getOccupancy() {
        return this.passengers.length;
    }

    getOccupancyPercent() {
        return (this.passengers.length / this.capacity) * 100;
    }

    start() {
        this.status = 'running';
    }

    stop() {
        this.status = 'stopped';
    }
}

// ==================== Simulation Engine ====================
class SimulationEngine {
    constructor(railwayManager) {
        this.railwayManager = railwayManager;
        this.isRunning = false;
        this.simulationSpeed = 1;
        this.simulationTime = 0; // in seconds
        this.lastUpdateTime = 0;
        this.animationFrameId = null;
        this.lastCostUpdate = 0; // Track when costs were last applied
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastUpdateTime = Date.now();
        this.lastCostUpdate = this.simulationTime;
        this.update();
    }

    pause() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    update() {
        if (!this.isRunning) return;

        const now = Date.now();
        const deltaTime = (now - this.lastUpdateTime) / 1000; // in seconds
        this.lastUpdateTime = now;

        // Update simulation time
        this.simulationTime += deltaTime * this.simulationSpeed;

        // Update all trains
        this.railwayManager.trains.forEach(train => {
            train.update(deltaTime, this.simulationSpeed);
        });

        // Phase 3: Update economic system (costs every second)
        if (this.simulationTime - this.lastCostUpdate >= 1) {
            this.railwayManager.updateEconomics(this.simulationTime - this.lastCostUpdate);
            this.lastCostUpdate = this.simulationTime;
        }

        // Phase 3: Generate passengers periodically
        this.railwayManager.updatePassengerGeneration(deltaTime);

        // Phase 3: Handle boarding/alighting at stops
        this.railwayManager.updatePassengerBoarding();

        // Update UI
        this.railwayManager.updateSimulationUI();

        // Schedule next update
        this.animationFrameId = requestAnimationFrame(() => this.update());
    }

    setSpeed(speed) {
        this.simulationSpeed = speed;
    }

    reset() {
        this.pause();
        this.simulationTime = 0;
        this.lastCostUpdate = 0;
        this.railwayManager.updateSimulationUI();
    }
}

// ==================== Railway Manager ====================
class RailwayManager {
    constructor() {
        this.map = null;
        this.drawnItems = null;
        this.lines = [];
        this.stops = [];
        this.trains = [];
        this.currentMode = null;
        this.editMode = false;
        this.editHandler = null;
        this.lineColors = ['#FF0000', '#0000FF', '#00FF00', '#FF00FF', '#FFA500', '#00FFFF'];
        this.colorIndex = 0;
        this.simulationEngine = null;

        // Phase 3: Economic system
        this.economicSystem = new EconomicSystem(50000);
        this.passengers = [];
        this.nextPassengerId = 1;
        this.passengerGenerationRate = 2; // seconds between passenger spawns per stop

        this.init();
    }

    init() {
        this.initMap();
        this.setupDrawControls();
        this.setupEventListeners();
        this.simulationEngine = new SimulationEngine(this);
        this.updateUI();
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

        // Simulation controls
        document.getElementById('playPauseBtn').addEventListener('click', () => this.toggleSimulation());
        document.getElementById('addTrainBtn').addEventListener('click', () => this.addTrain());
        document.getElementById('scheduleTrainBtn').addEventListener('click', () => this.scheduleTrain());

        // Speed controls
        document.querySelectorAll('.btn-speed').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const speed = parseInt(e.target.dataset.speed);
                this.setSimulationSpeed(speed);

                // Update active state
                document.querySelectorAll('.btn-speed').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
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

        // Update UI to show/hide delete buttons
        this.updateUI();
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
            coordinates: layer.getLatLng(),
            waitingPassengers: [], // Phase 3: passengers waiting at this stop
            lastPassengerSpawn: 0
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
        this.updateTrainsList();
        this.updateLinesList();
        this.updateStopsList();
        this.updateBudgetDisplay(); // Phase 3
    }

    updateSimulationUI() {
        // Update time display
        const hours = Math.floor(this.simulationEngine.simulationTime / 3600);
        const minutes = Math.floor((this.simulationEngine.simulationTime % 3600) / 60);
        document.getElementById('simTime').textContent =
            `Time: ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

        // Update trains list
        this.updateTrainsList();

        // Phase 3: Update budget display
        this.updateBudgetDisplay();

        // Phase 3: Update stop passenger counts
        this.updateStopPassengerCounts();
    }

    updateTrainsList() {
        const trainsList = document.getElementById('trainsList');

        if (this.trains.length === 0) {
            trainsList.innerHTML = '<div class="empty-state">No trains yet. Add a train to start simulation.</div>';
            return;
        }

        trainsList.innerHTML = this.trains.map(train => {
            const scheduleInfo = train.schedule
                ? `${train.schedule.stops.length} stops`
                : 'No schedule';
            const progressDisplay = train.status !== 'unscheduled'
                ? `<p>Progress: ${(train.progress * 100).toFixed(0)}%</p>`
                : '';

            // Phase 3: Show passenger count
            const passengerInfo = train.status !== 'unscheduled'
                ? `<p>Passengers: ${train.getOccupancy()}/${train.capacity} (${train.getOccupancyPercent().toFixed(0)}%)</p>`
                : '';

            return `
                <div class="train-item" data-id="${train.id}">
                    <div class="train-item-content">
                        <h3>${train.name}</h3>
                        <p>Line: ${train.line ? train.line.name : 'Not assigned'}</p>
                        <p>Schedule: ${scheduleInfo}</p>
                        ${progressDisplay}
                        ${passengerInfo}
                        <span class="status ${train.status}">${train.status}</span>
                    </div>
                    ${this.editMode ? '<button class="delete-train-btn">×</button>' : ''}
                </div>
            `;
        }).join('');

        // Add click handlers to zoom to trains
        document.querySelectorAll('.train-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't zoom if clicking delete button
                if (e.target.classList.contains('delete-train-btn')) {
                    return;
                }

                const trainId = parseInt(e.currentTarget.dataset.id);
                const train = this.trains.find(t => t.id === trainId);
                if (train && train.currentPosition) {
                    this.map.setView(train.currentPosition, 15);
                    if (train.marker) {
                        train.marker.openPopup();
                    }
                }
            });
        });

        // Add delete button handlers
        if (this.editMode) {
            document.querySelectorAll('.delete-train-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const trainId = parseInt(e.target.closest('.train-item').dataset.id);
                    this.deleteTrain(trainId);
                });
            });
        }
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
                <p class="passenger-count">Waiting: ${stop.waitingPassengers.length}</p>
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

    // Phase 3: Budget display
    updateBudgetDisplay() {
        const moneyEl = document.getElementById('money');
        const revenueEl = document.getElementById('totalRevenue');
        const costsEl = document.getElementById('totalCosts');
        const profitEl = document.getElementById('profit');

        if (moneyEl) {
            const money = this.economicSystem.getBalance();
            moneyEl.textContent = `$${money.toFixed(2)}`;
            moneyEl.className = money >= 0 ? 'positive' : 'negative';
        }

        if (revenueEl) revenueEl.textContent = `$${this.economicSystem.totalRevenue.toFixed(2)}`;
        if (costsEl) costsEl.textContent = `$${this.economicSystem.totalCosts.toFixed(2)}`;
        if (profitEl) {
            const profit = this.economicSystem.getProfit();
            profitEl.textContent = `$${profit.toFixed(2)}`;
            profitEl.className = profit >= 0 ? 'positive' : 'negative';
        }
    }

    // Phase 3: Update passenger counts on stop popups
    updateStopPassengerCounts() {
        this.stops.forEach(stop => {
            const count = stop.waitingPassengers.length;
            stop.layer.setPopupContent(`<b>${stop.name}</b><br>Waiting: ${count} passengers`);
        });
    }

    // Phase 3: Passenger generation
    updatePassengerGeneration(deltaTime) {
        if (this.stops.length < 2) return; // Need at least 2 stops

        this.stops.forEach(stop => {
            stop.lastPassengerSpawn += deltaTime;

            if (stop.lastPassengerSpawn >= this.passengerGenerationRate) {
                // Generate a passenger
                const destination = this.getRandomStop(stop);
                if (destination) {
                    const passenger = new Passenger(this.nextPassengerId++, stop, destination);
                    stop.waitingPassengers.push(passenger);
                    this.passengers.push(passenger);
                }
                stop.lastPassengerSpawn = 0;
            }
        });
    }

    getRandomStop(excludeStop) {
        const availableStops = this.stops.filter(s => s.id !== excludeStop.id);
        if (availableStops.length === 0) return null;
        return availableStops[Math.floor(Math.random() * availableStops.length)];
    }

    // Phase 3: Boarding/alighting logic
    updatePassengerBoarding() {
        this.trains.forEach(train => {
            if (train.status !== 'running' || !train.schedule) return;

            // Check if train is near any stop (not just scheduled stops)
            this.stops.forEach(stop => {
                const distanceToStop = train.distance(train.currentPosition, stop.coordinates);

                // If within 50 meters of stop
                if (distanceToStop < 50) {
                    // Alight passengers
                    const alighted = train.alightPassengers(stop);
                    alighted.forEach(passenger => {
                        // Calculate fare based on distance
                        const tripDistance = train.distance(passenger.origin.coordinates, passenger.destination.coordinates);
                        const fare = this.economicSystem.calculatePassengerFare(tripDistance);
                        this.economicSystem.earnRevenue(fare, 'passenger');
                    });

                    // Board waiting passengers
                    const boarded = train.boardPassengers(stop.waitingPassengers);
                    stop.waitingPassengers = stop.waitingPassengers.filter(p => !boarded.includes(p));
                }
            });
        });
    }

    // Phase 3: Economic updates
    updateEconomics(deltaSeconds) {
        // Operating costs for running trains
        const runningTrains = this.trains.filter(t => t.status === 'running');
        const trainCosts = runningTrains.length * this.economicSystem.trainOperatingCostPerSec * deltaSeconds;

        // Line maintenance costs
        const lineCosts = this.lines.length * this.economicSystem.lineMaintenanceCostPerSec * deltaSeconds;

        const totalCosts = trainCosts + lineCosts;
        this.economicSystem.spendMoney(totalCosts, 'operating');
    }

    toggleSimulation() {
        const btn = document.getElementById('playPauseBtn');

        if (this.simulationEngine.isRunning) {
            this.simulationEngine.pause();
            btn.innerHTML = '▶ Play';
            btn.classList.remove('paused');

            // Stop all scheduled trains
            this.trains.forEach(train => {
                if (train.status !== 'unscheduled') {
                    train.stop();
                }
            });
        } else {
            this.simulationEngine.start();
            btn.innerHTML = '⏸ Pause';
            btn.classList.add('paused');

            // Start only scheduled trains (those with lines and schedules)
            this.trains.forEach(train => {
                if (train.line && train.status !== 'unscheduled') {
                    train.start();
                }
            });
        }
    }

    addTrain() {
        const trainNumber = this.trains.length + 1;
        const trainName = prompt('Enter train name:', `Train ${trainNumber}`);

        if (!trainName) return;

        // Create train without line assignment
        const train = new Train(Date.now(), trainName);
        train.status = 'unscheduled';

        this.trains.push(train);
        this.updateUI();
    }

    scheduleTrain() {
        // Check if there are trains to schedule
        if (this.trains.length === 0) {
            alert('Please add a train first!');
            return;
        }

        // Check if there are lines
        if (this.lines.length === 0) {
            alert('Please create at least one railway line first!');
            return;
        }

        // Step 1: Select train
        const trainNames = this.trains.map((train, index) =>
            `${index + 1}. ${train.name} ${train.status === 'unscheduled' ? '(Unscheduled)' : ''}`
        ).join('\n');
        const trainIndex = prompt(`Select a train to schedule:\n${trainNames}\n\nEnter train number:`);

        if (!trainIndex) return;

        const selectedTrain = this.trains[parseInt(trainIndex) - 1];
        if (!selectedTrain) {
            alert('Invalid train selection!');
            return;
        }

        // Step 2: Select line
        const lineNames = this.lines.map((line, index) => `${index + 1}. ${line.name}`).join('\n');
        const lineIndex = prompt(`Select a line for ${selectedTrain.name}:\n${lineNames}\n\nEnter line number:`);

        if (!lineIndex) return;

        const selectedLine = this.lines[parseInt(lineIndex) - 1];
        if (!selectedLine) {
            alert('Invalid line selection!');
            return;
        }

        // Step 3: Select stops (optional)
        let selectedStops = [];
        if (this.stops.length > 0) {
            // Filter stops that are near the selected line
            const availableStops = this.stops; // In future, could filter by proximity to line

            if (availableStops.length > 0) {
                const stopNames = availableStops.map((stop, index) =>
                    `${index + 1}. ${stop.name}`
                ).join('\n');
                const stopIndices = prompt(
                    `Select stops for ${selectedTrain.name} (comma-separated numbers, or leave empty for no stops):\n${stopNames}\n\nExample: 1,3,5`
                );

                if (stopIndices && stopIndices.trim()) {
                    const indices = stopIndices.split(',').map(s => parseInt(s.trim()) - 1);
                    selectedStops = indices
                        .filter(i => i >= 0 && i < availableStops.length)
                        .map(i => availableStops[i]);
                }
            }
        }

        // Create schedule
        const schedule = new Schedule(selectedLine, selectedStops);
        selectedTrain.schedule = schedule;
        selectedTrain.line = selectedLine;
        selectedTrain.status = 'stopped';

        // Create visual marker for train
        if (!selectedTrain.marker) {
            selectedTrain.marker = this.createTrainMarker(selectedTrain);
            selectedTrain.marker.addTo(this.map);
        }

        // Initialize position
        selectedTrain.updatePosition();

        // If simulation is running, start the train
        if (this.simulationEngine.isRunning) {
            selectedTrain.start();
        }

        this.updateUI();
        alert(`${selectedTrain.name} scheduled on ${selectedLine.name}${selectedStops.length > 0 ? ` with ${selectedStops.length} stops` : ''}!`);
    }

    createTrainMarker(train) {
        // Create a custom icon for the train
        const trainIcon = L.divIcon({
            className: 'train-marker',
            html: `<div style="background-color: ${train.line.color}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });

        const marker = L.marker([0, 0], { icon: trainIcon });
        marker.bindPopup(`<b>${train.name}</b><br>Line: ${train.line.name}`);

        return marker;
    }

    setSimulationSpeed(speed) {
        this.simulationEngine.setSpeed(speed);
    }

    deleteTrain(trainId) {
        const train = this.trains.find(t => t.id === trainId);
        if (!train) return;

        if (confirm(`Delete ${train.name}?`)) {
            // Remove marker from map
            if (train.marker) {
                this.map.removeLayer(train.marker);
            }

            // Remove from trains array
            this.trains = this.trains.filter(t => t.id !== trainId);

            this.updateUI();
        }
    }

    clearAll() {
        if (confirm('Are you sure you want to clear all lines, stops, and trains?')) {
            // Stop simulation
            this.simulationEngine.pause();

            // Remove all train markers
            this.trains.forEach(train => {
                if (train.marker) {
                    this.map.removeLayer(train.marker);
                }
            });

            this.drawnItems.clearLayers();
            this.lines = [];
            this.stops = [];
            this.trains = [];
            this.passengers = [];
            this.colorIndex = 0;

            // Reset simulation
            this.simulationEngine.reset();

            // Phase 3: Reset economic system
            this.economicSystem = new EconomicSystem(50000);

            // Reset play button
            const btn = document.getElementById('playPauseBtn');
            btn.innerHTML = '▶ Play';
            btn.classList.remove('paused');

            this.updateUI();
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.railwayManager = new RailwayManager();
});
