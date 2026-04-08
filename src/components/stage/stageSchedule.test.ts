import test from 'node:test';
import assert from 'node:assert/strict';

import { buildFiringSchedule } from './stageSchedule.ts';
import type { Project } from '../../types/domain.ts';

function createProject(): Project {
  return {
    id: 'project-1',
    name: 'test',
    positions: [
      {
        id: 'pos-1',
        name: 'A',
        coordinate: { x: 0, y: 0, z: 0 },
        racks: [
          {
            id: 'rack-1',
            name: 'R1',
            type: 'straight',
            tubeCount: 3,
            rotation: 0,
            config: { type: 'straight', tilt: 90 },
            tubes: [0, 1, 2].map((index) => ({
              id: `tube-${index}`,
              index,
              angle: 0,
              tilt: 90,
              loaded: true,
              isFired: false,
              effect: {
                id: `fx-${index}`,
                name: 'fx',
                type: 'burst',
                color: '#fff',
                height: 80,
                duration: 1.8,
                intensity: 1,
                particleCount: 100,
                spread: 360,
                trailLength: 0.5,
              },
            })),
          },
        ],
      },
    ],
    events: [
      {
        id: 'event-1',
        name: 'seq',
        startTime: 10,
        positionId: 'pos-1',
        rackId: 'rack-1',
        tubeIndices: [0, 1, 2],
        pattern: 'sequential',
        interval: 200,
        track: 'track-1',
      },
    ],
    duration: 60,
    createdAt: new Date('2026-04-08T00:00:00Z'),
    updatedAt: new Date('2026-04-08T00:00:00Z'),
  };
}

test('buildFiringSchedule expands sequential events with interval offsets', () => {
  const schedule = buildFiringSchedule(createProject());

  assert.equal(schedule.length, 3);
  assert.equal(schedule[0]?.time, 10);
  assert.equal(schedule[1]?.time, 10.2);
  assert.equal(schedule[2]?.time, 10.4);
});
