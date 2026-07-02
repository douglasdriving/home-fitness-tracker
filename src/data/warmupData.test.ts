import { describe, it, expect } from 'vitest';
import {
  getWarmupForMuscleGroup,
  warmupRoutine,
  muscleGroupWarmups,
  genericWarmup,
} from './warmupData';
import { MuscleGroup } from '../types/exercise';

describe('muscleGroupWarmups', () => {
  it('maps every muscle group to warmup IDs that exist in the routine', () => {
    const validIds = new Set(warmupRoutine.map(w => w.id));
    (Object.keys(muscleGroupWarmups) as MuscleGroup[]).forEach(group => {
      muscleGroupWarmups[group].forEach(id => {
        expect(validIds.has(id)).toBe(true);
      });
    });
  });

  it('has at least one move for every muscle group (no empty routine)', () => {
    (Object.keys(muscleGroupWarmups) as MuscleGroup[]).forEach(group => {
      expect(muscleGroupWarmups[group].length).toBeGreaterThan(0);
    });
  });
});

describe('genericWarmup', () => {
  it('maps to warmup IDs that exist in the routine', () => {
    const validIds = new Set(warmupRoutine.map(w => w.id));
    genericWarmup.forEach(id => {
      expect(validIds.has(id)).toBe(true);
    });
  });

  it('is non-empty', () => {
    expect(genericWarmup.length).toBeGreaterThan(0);
  });
});

describe('warmupRoutine entries', () => {
  it('every move has a positive duration and instructions', () => {
    warmupRoutine.forEach(move => {
      expect(move.duration).toBeGreaterThan(0);
      expect(move.instructions.length).toBeGreaterThan(0);
      expect(move.targetMuscles.length).toBeGreaterThan(0);
    });
  });

  it('Cat-Cow is a flowing movement (~60s), not a static hold', () => {
    const catCow = warmupRoutine.find(w => w.id === 'warmup-cat-cow');
    expect(catCow).toBeDefined();
    expect(catCow?.duration).toBe(60);
    // "flow" or "movement" should be present so it reads as dynamic, not a hold
    const text = catCow?.instructions.join(' ').toLowerCase() ?? '';
    expect(text).toMatch(/flow|movement|not a static hold/);
  });

  it('rep-based moves carry a reps count for display', () => {
    const birdDogs = warmupRoutine.find(w => w.id === 'warmup-bird-dogs');
    expect(birdDogs?.reps).toBeGreaterThan(0);
  });
});

describe('getWarmupForMuscleGroup', () => {
  it('returns abs warmup moves in declared order', () => {
    const ids = getWarmupForMuscleGroup('abs').map(w => w.id);
    expect(ids).toEqual([
      'warmup-cat-cow',
      'warmup-trunk-rotations',
      'warmup-hip-circles',
      'warmup-bird-dogs',
    ]);
  });

  it('returns glutes warmup moves with hinge pattern rehearsal', () => {
    const ids = getWarmupForMuscleGroup('glutes').map(w => w.id);
    expect(ids).toEqual([
      'warmup-leg-swings',
      'warmup-hip-circles',
      'warmup-glute-bridges',
      'warmup-hinges',
    ]);
  });

  it('returns lower back warmup moves (subset of posterior chain)', () => {
    const ids = getWarmupForMuscleGroup('lowerBack').map(w => w.id);
    expect(ids).toEqual(['warmup-cat-cow', 'warmup-hip-circles', 'warmup-hinges']);
  });

  it('returns only tested upper body warmup moves (coaching 2026-07-01)', () => {
    const ids = getWarmupForMuscleGroup('upperBody').map(w => w.id);
    expect(ids).toEqual(['warmup-arm-circles', 'warmup-incline-pushups']);
  });

  it('excludes untested moves: band pull-aparts and scapular push-ups', () => {
    // Removed pending a live test — band pull-aparts share the short-loop-band
    // failure mode that rejected band rows; scapular push-ups need teaching first.
    const allIds = warmupRoutine.map(w => w.id);
    expect(allIds).not.toContain('warmup-band-pull-aparts');
    expect(allIds).not.toContain('warmup-scap-pushups');
  });

  it('returns muscle-group-specific moves that differ between groups', () => {
    const absIds = getWarmupForMuscleGroup('abs').map(w => w.id);
    const upperIds = getWarmupForMuscleGroup('upperBody').map(w => w.id);
    expect(absIds).not.toEqual(upperIds);
  });

  it('returns the generic warmup when called with undefined (full-body mode)', () => {
    const ids = getWarmupForMuscleGroup(undefined).map(w => w.id);
    expect(ids).toEqual(genericWarmup);
    expect(ids.length).toBeGreaterThan(0);
  });

  it('preserves the order declared in muscleGroupWarmups', () => {
    (Object.keys(muscleGroupWarmups) as MuscleGroup[]).forEach(group => {
      const ids = getWarmupForMuscleGroup(group).map(w => w.id);
      expect(ids).toEqual(muscleGroupWarmups[group]);
    });
  });
});
