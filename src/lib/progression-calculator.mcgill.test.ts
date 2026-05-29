import { describe, it, expect } from 'vitest';
import { calculateMcgillProgression, convertLegacyToMcgill } from './progression-calculator';

describe('convertLegacyToMcgill', () => {
  it('converts 20s single hold to McGill protocol', () => {
    const result = convertLegacyToMcgill(20);
    expect(result).toEqual({
      rounds: [3, 2, 1],
      holdDuration: 10, // 20 / 6 ≈ 3.33, rounds to 5, clamped to min 10
    });
  });

  it('converts 45s single hold to McGill protocol', () => {
    const result = convertLegacyToMcgill(45);
    expect(result).toEqual({
      rounds: [3, 2, 1],
      holdDuration: 10, // 45 / 6 ≈ 7.5, rounds to 10
    });
  });

  it('converts 60s single hold to McGill protocol', () => {
    const result = convertLegacyToMcgill(60);
    expect(result).toEqual({
      rounds: [3, 2, 1],
      holdDuration: 10, // 60 / 6 = 10
    });
  });

  it('converts 90s single hold to McGill protocol', () => {
    const result = convertLegacyToMcgill(90);
    expect(result).toEqual({
      rounds: [3, 2, 1],
      holdDuration: 15, // 90 / 6 = 15
    });
  });

  it('converts 180s single hold to McGill protocol at max', () => {
    const result = convertLegacyToMcgill(180);
    expect(result).toEqual({
      rounds: [3, 2, 1],
      holdDuration: 30, // 180 / 6 = 30, clamped to max 30
    });
  });

  it('converts 240s single hold to McGill protocol clamped at max', () => {
    const result = convertLegacyToMcgill(240);
    expect(result).toEqual({
      rounds: [3, 2, 1],
      holdDuration: 30, // 240 / 6 = 40, clamped to max 30
    });
  });
});

describe('calculateMcgillProgression', () => {
  describe('intensity feedback 1-2 (too easy)', () => {
    it('increases hold duration when below 30s', () => {
      const result = calculateMcgillProgression([3, 2, 1], 10, 1);
      expect(result).toEqual({
        rounds: [3, 2, 1],
        holdDuration: 15, // 10 + 5
      });
    });

    it('increases hold duration when at 25s', () => {
      const result = calculateMcgillProgression([3, 2, 1], 25, 2);
      expect(result).toEqual({
        rounds: [3, 2, 1],
        holdDuration: 30, // 25 + 5
      });
    });

    it('increases first set round count when at 30s', () => {
      const result = calculateMcgillProgression([3, 2, 1], 30, 1);
      expect(result).toEqual({
        rounds: [4, 2, 1], // 3 + 1
        holdDuration: 30,
      });
    });

    it('increases duration when first set round count at 6 and duration at 30s', () => {
      const result = calculateMcgillProgression([6, 2, 1], 30, 1);
      expect(result).toEqual({
        rounds: [6, 2, 1], // Already at max rounds
        holdDuration: 35, // Continue increasing duration
      });
    });

    it('increases duration when at 30s but first set already maxed', () => {
      const result = calculateMcgillProgression([6, 2, 1], 30, 2);
      expect(result).toEqual({
        rounds: [6, 2, 1],
        holdDuration: 35, // Continue increasing duration
      });
    });
  });

  describe('intensity feedback 3 (just right)', () => {
    it('increases hold duration when below 25s', () => {
      const result = calculateMcgillProgression([3, 2, 1], 10, 3);
      expect(result).toEqual({
        rounds: [3, 2, 1],
        holdDuration: 15, // 10 + 5
      });
    });

    it('increases hold duration when at 20s', () => {
      const result = calculateMcgillProgression([3, 2, 1], 20, 3);
      expect(result).toEqual({
        rounds: [3, 2, 1],
        holdDuration: 25, // 20 + 5
      });
    });

    it('keeps same when at 25s or above', () => {
      const result = calculateMcgillProgression([3, 2, 1], 25, 3);
      expect(result).toEqual({
        rounds: [3, 2, 1],
        holdDuration: 25, // No change
      });
    });

    it('keeps same when at 30s', () => {
      const result = calculateMcgillProgression([3, 2, 1], 30, 3);
      expect(result).toEqual({
        rounds: [3, 2, 1],
        holdDuration: 30,
      });
    });
  });

  describe('intensity feedback 4-5 (too hard)', () => {
    it('decreases hold duration when above 5s', () => {
      const result = calculateMcgillProgression([3, 2, 1], 15, 4);
      expect(result).toEqual({
        rounds: [3, 2, 1],
        holdDuration: 10, // 15 - 5
      });
    });

    it('decreases hold duration when at 10s', () => {
      const result = calculateMcgillProgression([3, 2, 1], 10, 5);
      expect(result).toEqual({
        rounds: [3, 2, 1],
        holdDuration: 5, // 10 - 5
      });
    });

    it('decreases first set round count when at 5s', () => {
      const result = calculateMcgillProgression([3, 2, 1], 5, 4);
      expect(result).toEqual({
        rounds: [2, 2, 1], // 3 - 1
        holdDuration: 5,
      });
    });

    it('floors first set round count at 1', () => {
      const result = calculateMcgillProgression([1, 2, 1], 5, 5);
      expect(result).toEqual({
        rounds: [1, 2, 1], // Already at min
        holdDuration: 5,
      });
    });

    it('decreases duration when at 5s but first set already at 1', () => {
      const result = calculateMcgillProgression([1, 2, 1], 5, 4);
      expect(result).toEqual({
        rounds: [1, 2, 1],
        holdDuration: 5, // Can't go lower
      });
    });
  });

  describe('edge cases', () => {
    it('handles different round structures', () => {
      const result = calculateMcgillProgression([5, 3, 2], 15, 1);
      expect(result).toEqual({
        rounds: [5, 3, 2],
        holdDuration: 20, // 15 + 5
      });
    });

    it('handles progression with modified round counts', () => {
      const result = calculateMcgillProgression([4, 2, 1], 30, 1);
      expect(result).toEqual({
        rounds: [5, 2, 1], // 4 + 1
        holdDuration: 30,
      });
    });
  });
});
