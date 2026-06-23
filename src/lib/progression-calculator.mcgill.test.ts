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

  describe('configurable holdCeiling (ceiling-based interval protocol)', () => {
    it('defaults to a 30s ceiling when not provided (Side Plank behaviour)', () => {
      // At 25s the default ceiling (30) is not yet reached, so add seconds
      expect(calculateMcgillProgression([3, 2, 1], 25, 1)).toEqual({
        rounds: [3, 2, 1],
        holdDuration: 30,
      });
      // At 30s the default ceiling is reached, so add a rep instead
      expect(calculateMcgillProgression([3, 2, 1], 30, 1)).toEqual({
        rounds: [4, 2, 1],
        holdDuration: 30,
      });
    });

    it('adds a rep instead of seconds once a custom ceiling is reached (too easy)', () => {
      // Ceiling 25: at 25s "too easy" should add a rep, not seconds
      const result = calculateMcgillProgression([3, 2, 1], 25, 1, 25);
      expect(result).toEqual({
        rounds: [4, 2, 1],
        holdDuration: 25,
      });
    });

    it('still adds seconds below a custom ceiling (too easy)', () => {
      const result = calculateMcgillProgression([3, 2, 1], 15, 2, 25);
      expect(result).toEqual({
        rounds: [3, 2, 1],
        holdDuration: 20, // 15 + 5, still below ceiling 25
      });
    });

    it('holds at ceiling when feedback is "just right" (custom ceiling)', () => {
      // Ceiling 25: "just right" increases only while below ceiling - 5 (i.e. < 20)
      expect(calculateMcgillProgression([3, 2, 1], 20, 3, 25)).toEqual({
        rounds: [3, 2, 1],
        holdDuration: 20, // 20 is not < 20, so hold
      });
      expect(calculateMcgillProgression([3, 2, 1], 15, 3, 25)).toEqual({
        rounds: [3, 2, 1],
        holdDuration: 20, // 15 < 20, so increase
      });
    });

    it('decreases reps under "too hard" feedback regardless of ceiling', () => {
      // At 5s with a custom ceiling, "too hard" still drops a rep
      const result = calculateMcgillProgression([3, 2, 1], 5, 5, 40);
      expect(result).toEqual({
        rounds: [2, 2, 1],
        holdDuration: 5,
      });
    });

    it('decreases seconds first under "too hard" before touching reps', () => {
      const result = calculateMcgillProgression([3, 2, 1], 20, 4, 40);
      expect(result).toEqual({
        rounds: [3, 2, 1],
        holdDuration: 15, // 20 - 5
      });
    });
  });
});

describe('convertLegacyToMcgill with configurable holdCeiling', () => {
  it('defaults to clamping at 30s when no ceiling is passed', () => {
    const result = convertLegacyToMcgill(240); // 240 / 6 = 40
    expect(result).toEqual({ rounds: [3, 2, 1], holdDuration: 30 });
  });

  it('clamps to a custom ceiling for Plank-style conversions', () => {
    // 240 / 6 = 40, clamped to ceiling 30
    expect(convertLegacyToMcgill(240, 30)).toEqual({
      rounds: [3, 2, 1],
      holdDuration: 30,
    });
  });

  it('clamps a long legacy plank hold (75s) below the 30s ceiling', () => {
    // 75 / 6 = 12.5 → rounds to 15 (under ceiling, no clamp needed)
    expect(convertLegacyToMcgill(75, 30)).toEqual({
      rounds: [3, 2, 1],
      holdDuration: 15,
    });
  });

  it('respects a lower custom ceiling', () => {
    // 90 / 6 = 15, clamped down to ceiling 10
    expect(convertLegacyToMcgill(90, 10)).toEqual({
      rounds: [3, 2, 1],
      holdDuration: 10,
    });
  });
});
