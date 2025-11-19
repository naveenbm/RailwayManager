/**
 * @jest-environment jsdom
 */

describe('Schedule Class', () => {
    let mockLine;
    let mockStops;

    beforeEach(() => {
        mockLine = {
            id: 1,
            name: 'Line A',
            color: '#FF0000',
            coordinates: [
                { lat: 40.7128, lng: -74.0060 },
                { lat: 40.7580, lng: -73.9855 }
            ]
        };

        mockStops = [
            { id: 1, name: 'Station A', coordinates: { lat: 40.7128, lng: -74.0060 } },
            { id: 2, name: 'Station B', coordinates: { lat: 40.7400, lng: -73.9950 } },
            { id: 3, name: 'Station C', coordinates: { lat: 40.7580, lng: -73.9855 } }
        ];
    });

    describe('Constructor', () => {
        test('should create a schedule with line and no stops', () => {
            const schedule = new Schedule(mockLine);

            expect(schedule.line).toBe(mockLine);
            expect(schedule.stops).toEqual([]);
            expect(schedule.departureTime).toBeNull();
            expect(schedule.frequency).toBeNull();
        });

        test('should create a schedule with line and stops', () => {
            const schedule = new Schedule(mockLine, mockStops);

            expect(schedule.line).toBe(mockLine);
            expect(schedule.stops).toEqual(mockStops);
            expect(schedule.stops.length).toBe(3);
        });

        test('should store stop references correctly', () => {
            const schedule = new Schedule(mockLine, [mockStops[0], mockStops[2]]);

            expect(schedule.stops).toHaveLength(2);
            expect(schedule.stops[0].name).toBe('Station A');
            expect(schedule.stops[1].name).toBe('Station C');
        });
    });

    describe('hasStop Method', () => {
        test('should return true if stop exists in schedule', () => {
            const schedule = new Schedule(mockLine, mockStops);

            expect(schedule.hasStop(1)).toBe(true);
            expect(schedule.hasStop(2)).toBe(true);
            expect(schedule.hasStop(3)).toBe(true);
        });

        test('should return false if stop does not exist in schedule', () => {
            const schedule = new Schedule(mockLine, [mockStops[0]]);

            expect(schedule.hasStop(2)).toBe(false);
            expect(schedule.hasStop(3)).toBe(false);
            expect(schedule.hasStop(999)).toBe(false);
        });

        test('should return false for empty stops array', () => {
            const schedule = new Schedule(mockLine, []);

            expect(schedule.hasStop(1)).toBe(false);
        });

        test('should handle partial stop selection', () => {
            const selectedStops = [mockStops[0], mockStops[2]]; // Skip middle stop
            const schedule = new Schedule(mockLine, selectedStops);

            expect(schedule.hasStop(1)).toBe(true);
            expect(schedule.hasStop(2)).toBe(false);
            expect(schedule.hasStop(3)).toBe(true);
        });
    });

    describe('Schedule Properties', () => {
        test('should allow setting departure time', () => {
            const schedule = new Schedule(mockLine, mockStops);
            schedule.departureTime = '08:00';

            expect(schedule.departureTime).toBe('08:00');
        });

        test('should allow setting frequency', () => {
            const schedule = new Schedule(mockLine, mockStops);
            schedule.frequency = 15; // Every 15 minutes

            expect(schedule.frequency).toBe(15);
        });

        test('should maintain line reference', () => {
            const schedule = new Schedule(mockLine, mockStops);

            expect(schedule.line.id).toBe(1);
            expect(schedule.line.name).toBe('Line A');
            expect(schedule.line.color).toBe('#FF0000');
        });
    });
});
