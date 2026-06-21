import { describe, it, expect } from 'vitest';
import { getStretchesForMuscleGroup, stretchingRoutine, muscleGroupStretches } from './stretchingData';
import { MuscleGroup } from '../types/exercise';

describe('muscleGroupStretches', () => {
  it('maps every muscle group to stretch IDs that exist in the routine', () => {
    const validIds = new Set(stretchingRoutine.map(s => s.id));
    (Object.keys(muscleGroupStretches) as MuscleGroup[]).forEach(group => {
      muscleGroupStretches[group].forEach(id => {
        expect(validIds.has(id)).toBe(true);
      });
    });
  });
});

describe('getStretchesForMuscleGroup', () => {
  it('returns the three upper body stretches for upperBody', () => {
    const stretches = getStretchesForMuscleGroup('upperBody');
    const ids = stretches.map(s => s.id);
    expect(ids).toEqual([
      'stretch-doorway-pec',
      'stretch-overhead-lat',
      'stretch-overhead-triceps',
    ]);
  });

  it('upper body stretches are all bilateral, 30s holds', () => {
    getStretchesForMuscleGroup('upperBody').forEach(stretch => {
      expect(stretch.duration).toBe(30);
      expect(stretch.bilateral).toBe(true);
      expect(stretch.instructions.length).toBeGreaterThan(0);
    });
  });

  it('does not include the old lower back stretches for upperBody', () => {
    const ids = getStretchesForMuscleGroup('upperBody').map(s => s.id);
    expect(ids).not.toContain('stretch-child-pose');
    expect(ids).not.toContain('stretch-cat-cow');
    expect(ids).not.toContain('stretch-cobra');
  });
});
