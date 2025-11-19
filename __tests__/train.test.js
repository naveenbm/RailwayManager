/**
 * @jest-environment jsdom
 */

describe('Train Class', () => {
    let mockLine;
    let train;

    beforeEach(() => {
        mockLine = {
            id: 1,
            name: 'Line A',
            color: '#FF0000',
            coordinates: [
                { lat: 40.7128, lng: -74.0060 },
                { lat: 40.7580, lng: -73.9855 }
            ],
            layer: {}
        };

        train = new Train(1, 'Express 1');
    });

    describe('Constructor', () => {
        test('should create a train with correct initial properties', () => {
            expect(train.id).toBe(1);
            expect(train.name).toBe('Express 1');
            expect(train.line).toBeNull();
            expect(train.schedule).toBeNull();
            expect(train.progress).toBe(0);
            expect(train.speed).toBe(0.01);
            expect(train.direction).toBe(1);
            expect(train.status).toBe('stopped');
            expect(train.marker).toBeNull();
            expect(train.currentPosition).toBeNull();
        });

        test('should accept optional line parameter', () => {
            const trainWithLine = new Train(2, 'Local 1', mockLine);
            expect(trainWithLine.line).toBe(mockLine);
        });
    });

    describe('Status Management', () => {
        test('should start the train', () => {
            train.start();
            expect(train.status).toBe('running');
        });

        test('should stop the train', () => {
            train.start();
            train.stop();
            expect(train.status).toBe('stopped');
        });
    });

    describe('Distance Calculation', () => {
        test('should calculate distance between two points', () => {
            const point1 = { lat: 40.7128, lng: -74.0060 };
            const point2 = { lat: 40.7580, lng: -73.9855 };
            const distance = train.distance(point1, point2);

            expect(distance).toBeGreaterThan(0);
            expect(distance).toBeCloseTo(5315, -2); // Approximately 5.3km
        });

        test('should return 0 for same points', () => {
            const point = { lat: 40.7128, lng: -74.0060 };
            const distance = train.distance(point, point);
            expect(distance).toBeCloseTo(0, 5);
        });
    });

    describe('Interpolation', () => {
        test('should interpolate between two points at 0 progress', () => {
            const point1 = { lat: 40.0, lng: -74.0 };
            const point2 = { lat: 41.0, lng: -73.0 };
            const result = train.interpolate(point1, point2, 0);

            expect(result.lat).toBeCloseTo(40.0);
            expect(result.lng).toBeCloseTo(-74.0);
        });

        test('should interpolate between two points at 1 progress', () => {
            const point1 = { lat: 40.0, lng: -74.0 };
            const point2 = { lat: 41.0, lng: -73.0 };
            const result = train.interpolate(point1, point2, 1);

            expect(result.lat).toBeCloseTo(41.0);
            expect(result.lng).toBeCloseTo(-73.0);
        });

        test('should interpolate between two points at 0.5 progress', () => {
            const point1 = { lat: 40.0, lng: -74.0 };
            const point2 = { lat: 42.0, lng: -72.0 };
            const result = train.interpolate(point1, point2, 0.5);

            expect(result.lat).toBeCloseTo(41.0);
            expect(result.lng).toBeCloseTo(-73.0);
        });
    });

    describe('Position Along Line', () => {
        test('should return first point at 0 progress', () => {
            train.line = mockLine;
            const position = train.getPositionAlongLine(mockLine.coordinates, 0);

            expect(position.lat).toBeCloseTo(mockLine.coordinates[0].lat);
            expect(position.lng).toBeCloseTo(mockLine.coordinates[0].lng);
        });

        test('should return last point at 1 progress', () => {
            train.line = mockLine;
            const position = train.getPositionAlongLine(mockLine.coordinates, 1);

            expect(position.lat).toBeCloseTo(mockLine.coordinates[1].lat);
            expect(position.lng).toBeCloseTo(mockLine.coordinates[1].lng);
        });

        test('should return interpolated point at 0.5 progress', () => {
            train.line = mockLine;
            const position = train.getPositionAlongLine(mockLine.coordinates, 0.5);

            const expectedLat = (mockLine.coordinates[0].lat + mockLine.coordinates[1].lat) / 2;
            const expectedLng = (mockLine.coordinates[0].lng + mockLine.coordinates[1].lng) / 2;

            expect(position.lat).toBeCloseTo(expectedLat, 4);
            expect(position.lng).toBeCloseTo(expectedLng, 4);
        });
    });

    describe('Train Update', () => {
        beforeEach(() => {
            train.line = mockLine;
            train.status = 'running';
        });

        test('should not update if train is stopped', () => {
            train.status = 'stopped';
            const initialProgress = train.progress;

            train.update(1, 1);

            expect(train.progress).toBe(initialProgress);
        });

        test('should not update if train has no line', () => {
            train.line = null;
            const initialProgress = train.progress;

            train.update(1, 1);

            expect(train.progress).toBe(initialProgress);
        });

        test('should increase progress when moving forward', () => {
            const initialProgress = train.progress;
            train.direction = 1;

            train.update(1, 1);

            expect(train.progress).toBeGreaterThan(initialProgress);
        });

        test('should reverse direction at end of line', () => {
            train.progress = 0.99;
            train.direction = 1;

            train.update(1, 1);

            expect(train.progress).toBe(1);
            expect(train.direction).toBe(-1);
        });

        test('should reverse direction at start of line', () => {
            train.progress = 0.01;
            train.direction = -1;

            train.update(1, 1);

            expect(train.progress).toBe(0);
            expect(train.direction).toBe(1);
        });

        test('should respect simulation speed', () => {
            const baseSpeed = train.speed;
            train.progress = 0;
            train.direction = 1;

            train.update(1, 2); // 2x speed

            const expectedProgress = baseSpeed * 1 * 2;
            expect(train.progress).toBeCloseTo(expectedProgress);
        });
    });
});
