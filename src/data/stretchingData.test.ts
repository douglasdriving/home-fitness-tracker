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

describe('stretch-side-bend entry', () => {
  it('exists in the routine with bilateral holds and abs target', () => {
    const sideBend = stretchingRoutine.find(s => s.id === 'stretch-side-bend');
    expect(sideBend).toBeDefined();
    expect(sideBend?.name).toBe('Side-Bend Stretch');
    expect(sideBend?.duration).toBe(30);
    expect(sideBend?.bilateral).toBe(true);
    expect(sideBend?.targetMuscles).toEqual(['Abs']);
    expect(sideBend?.instructions.length).toBeGreaterThan(0);
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

  it('returns abs stretches in cobra → twist → side-bend order', () => {
    const ids = getStretchesForMuscleGroup('abs').map(s => s.id);
    expect(ids).toEqual([
      'stretch-cobra',
      'stretch-lying-twist',
      'stretch-side-bend',
    ]);
    expect(ids).not.toContain('stretch-cat-cow');
  });

  it('returns glutes stretches in figure-four → twist → hip-flexor order', () => {
    const ids = getStretchesForMuscleGroup('glutes').map(s => s.id);
    expect(ids).toEqual([
      'stretch-figure-four',
      'stretch-lying-twist',
      'stretch-hip-flexor',
    ]);
  });

  it('returns lower back stretches in child-pose → twist → figure-four order', () => {
    const ids = getStretchesForMuscleGroup('lowerBack').map(s => s.id);
    expect(ids).toEqual([
      'stretch-child-pose',
      'stretch-lying-twist',
      'stretch-figure-four',
    ]);
    expect(ids).not.toContain('stretch-cobra');
    expect(ids).not.toContain('stretch-cat-cow');
  });

  it('preserves the order declared in muscleGroupStretches, not array order', () => {
    (Object.keys(muscleGroupStretches) as MuscleGroup[]).forEach(group => {
      const ids = getStretchesForMuscleGroup(group).map(s => s.id);
      expect(ids).toEqual(muscleGroupStretches[group]);
    });
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
