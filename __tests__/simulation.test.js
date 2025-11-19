/**
 * @jest-environment jsdom
 */

describe('SimulationEngine Class', () => {
    let mockRailwayManager;
    let simulationEngine;
    let mockTrain;

    beforeEach(() => {
        // Mock railway manager with trains array
        mockTrain = new Train(1, 'Test Train');
        mockTrain.line = {
            coordinates: [
                { lat: 40.7128, lng: -74.0060 },
                { lat: 40.7580, lng: -73.9855 }
            ]
        };

        mockRailwayManager = {
            trains: [mockTrain],
            updateSimulationUI: jest.fn()
        };

        simulationEngine = new SimulationEngine(mockRailwayManager);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should create a simulation engine with correct initial state', () => {
            expect(simulationEngine.railwayManager).toBe(mockRailwayManager);
            expect(simulationEngine.isRunning).toBe(false);
            expect(simulationEngine.simulationSpeed).toBe(1);
            expect(simulationEngine.simulationTime).toBe(0);
            expect(simulationEngine.lastUpdateTime).toBe(0);
            expect(simulationEngine.animationFrameId).toBeNull();
        });
    });

    describe('Start/Pause Functionality', () => {
        test('should start the simulation', () => {
            simulationEngine.start();

            expect(simulationEngine.isRunning).toBe(true);
            expect(simulationEngine.lastUpdateTime).toBeGreaterThan(0);
        });

        test('should not start if already running', () => {
            simulationEngine.start();
            const firstUpdateTime = simulationEngine.lastUpdateTime;

            // Try to start again
            simulationEngine.start();

            expect(simulationEngine.lastUpdateTime).toBe(firstUpdateTime);
        });

        test('should pause the simulation', () => {
            simulationEngine.start();
            simulationEngine.pause();

            expect(simulationEngine.isRunning).toBe(false);
        });

        test('should cancel animation frame on pause', () => {
            simulationEngine.animationFrameId = 123;
            simulationEngine.pause();

            expect(global.cancelAnimationFrame).toHaveBeenCalledWith(123);
            expect(simulationEngine.animationFrameId).toBeNull();
        });
    });

    describe('Speed Control', () => {
        test('should set simulation speed to 1x', () => {
            simulationEngine.setSpeed(1);
            expect(simulationEngine.simulationSpeed).toBe(1);
        });

        test('should set simulation speed to 2x', () => {
            simulationEngine.setSpeed(2);
            expect(simulationEngine.simulationSpeed).toBe(2);
        });

        test('should set simulation speed to 5x', () => {
            simulationEngine.setSpeed(5);
            expect(simulationEngine.simulationSpeed).toBe(5);
        });

        test('should accept custom speed values', () => {
            simulationEngine.setSpeed(10);
            expect(simulationEngine.simulationSpeed).toBe(10);
        });
    });

    describe('Reset Functionality', () => {
        test('should reset simulation to initial state', () => {
            simulationEngine.start();
            simulationEngine.simulationTime = 100;

            simulationEngine.reset();

            expect(simulationEngine.isRunning).toBe(false);
            expect(simulationEngine.simulationTime).toBe(0);
        });

        test('should call updateSimulationUI on reset', () => {
            simulationEngine.reset();

            expect(mockRailwayManager.updateSimulationUI).toHaveBeenCalled();
        });
    });

    describe('Update Loop', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            // Re-mock after jest.useFakeTimers()
            global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
            global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should not update when paused', () => {
            simulationEngine.isRunning = false;
            const initialTime = simulationEngine.simulationTime;

            simulationEngine.update();

            expect(simulationEngine.simulationTime).toBe(initialTime);
            expect(global.requestAnimationFrame).not.toHaveBeenCalled();
        });

        test('should update simulation time when running', () => {
            simulationEngine.isRunning = true;
            simulationEngine.lastUpdateTime = Date.now() - 1000; // 1 second ago

            simulationEngine.update();

            expect(simulationEngine.simulationTime).toBeGreaterThan(0);
        });

        test('should call train update method', () => {
            mockTrain.update = jest.fn();
            simulationEngine.isRunning = true;
            simulationEngine.lastUpdateTime = Date.now() - 1000;

            simulationEngine.update();

            expect(mockTrain.update).toHaveBeenCalled();
        });

        test('should update UI during simulation', () => {
            simulationEngine.isRunning = true;
            simulationEngine.lastUpdateTime = Date.now() - 1000;

            simulationEngine.update();

            expect(mockRailwayManager.updateSimulationUI).toHaveBeenCalled();
        });

        test('should schedule next update frame', () => {
            simulationEngine.isRunning = true;
            simulationEngine.lastUpdateTime = Date.now();

            simulationEngine.update();

            expect(global.requestAnimationFrame).toHaveBeenCalled();
        });

        test('should respect simulation speed in time calculation', () => {
            simulationEngine.isRunning = true;
            simulationEngine.simulationSpeed = 2;
            simulationEngine.lastUpdateTime = Date.now() - 1000; // 1 second ago

            simulationEngine.update();

            // With 2x speed, 1 second should advance simulation by 2 seconds
            expect(simulationEngine.simulationTime).toBeCloseTo(2, 0);
        });
    });

    describe('Multiple Trains', () => {
        beforeEach(() => {
            // Re-mock for this test
            global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
        });

        test('should update all trains in the system', () => {
            const train2 = new Train(2, 'Train 2');
            train2.line = mockTrain.line;
            train2.update = jest.fn();

            mockRailwayManager.trains.push(train2);
            mockTrain.update = jest.fn();

            simulationEngine.isRunning = true;
            simulationEngine.lastUpdateTime = Date.now();

            simulationEngine.update();

            expect(mockTrain.update).toHaveBeenCalled();
            expect(train2.update).toHaveBeenCalled();
        });
    });
});
