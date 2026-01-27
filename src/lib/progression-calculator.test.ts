import { describe, it, expect } from 'vitest';
import { calculateProgressionWithFeedback } from './progression-calculator';

describe('calculateProgressionWithFeedback', () => {
  describe('for reps exercises', () => {
    it('increases by ~20% when feedback is 1 (way too easy)', () => {
      // 20 reps * 1.20 = 24 reps
      const result = calculateProgressionWithFeedback(20, 'reps', 1);
      expect(result).toBe(24);
    });

    it('increases by ~10% when feedback is 2 (a bit too easy)', () => {
      // 20 reps * 1.10 = 22 reps
      const result = calculateProgressionWithFeedback(20, 'reps', 2);
      expect(result).toBe(22);
    });

    it('increases by ~5% when feedback is 3 (just right)', () => {
      // 20 reps * 1.05 = 21 reps
      const result = calculateProgressionWithFeedback(20, 'reps', 3);
      expect(result).toBe(21);
    });

    it('decreases by ~10% when feedback is 4 (a bit too hard)', () => {
      // 20 reps * 0.90 = 18 reps
      const result = calculateProgressionWithFeedback(20, 'reps', 4);
      expect(result).toBe(18);
    });

    it('decreases by ~20% when feedback is 5 (way too hard)', () => {
      // 20 reps * 0.80 = 16 reps
      const result = calculateProgressionWithFeedback(20, 'reps', 5);
      expect(result).toBe(16);
    });

    it('ensures minimum +1 rep increase for positive feedback', () => {
      // Small values should still increase by at least 1
      const result = calculateProgressionWithFeedback(5, 'reps', 1);
      expect(result).toBeGreaterThanOrEqual(6);
    });

    it('ensures minimum -1 rep decrease for negative feedback', () => {
      // Small values should still decrease by at least 1
      const result = calculateProgressionWithFeedback(10, 'reps', 4);
      expect(result).toBeLessThanOrEqual(9);
    });

    it('never goes below 5 reps even with harsh negative feedback', () => {
      const result = calculateProgressionWithFeedback(6, 'reps', 5);
      expect(result).toBeGreaterThanOrEqual(5);
    });

    it('defaults to feedback 3 when no feedback provided', () => {
      const withDefault = calculateProgressionWithFeedback(20, 'reps');
      const withExplicit3 = calculateProgressionWithFeedback(20, 'reps', 3);
      expect(withDefault).toBe(withExplicit3);
    });
  });

  describe('for timed exercises', () => {
    it('increases by ~20% when feedback is 1 (way too easy)', () => {
      // 30s * 1.20 = 36s, rounded to 35s (nearest 5)
      const result = calculateProgressionWithFeedback(30, 'timed', 1);
      expect(result).toBe(35);
    });

    it('increases by ~10% when feedback is 2 (a bit too easy)', () => {
      // 30s * 1.10 = 33s, but minimum +5s means 35s
      const result = calculateProgressionWithFeedback(30, 'timed', 2);
      expect(result).toBe(35);
    });

    it('increases by ~5% when feedback is 3 (just right)', () => {
      // 30s * 1.05 = 31.5s, rounds to 30s but must be >= 30
      const result = calculateProgressionWithFeedback(30, 'timed', 3);
      expect(result).toBeGreaterThanOrEqual(30);
    });

    it('decreases by ~10% when feedback is 4 (a bit too hard)', () => {
      // 40s * 0.90 = 36s, minimum -5s means <= 35s
      const result = calculateProgressionWithFeedback(40, 'timed', 4);
      expect(result).toBeLessThanOrEqual(35);
    });

    it('decreases by ~20% when feedback is 5 (way too hard)', () => {
      // 40s * 0.80 = 32s, rounds to 30s
      const result = calculateProgressionWithFeedback(40, 'timed', 5);
      expect(result).toBe(30);
    });

    it('ensures minimum +5 seconds increase for positive feedback', () => {
      const result = calculateProgressionWithFeedback(20, 'timed', 1);
      expect(result).toBeGreaterThanOrEqual(25);
    });

    it('never goes below 10 seconds even with harsh negative feedback', () => {
      const result = calculateProgressionWithFeedback(15, 'timed', 5);
      expect(result).toBeGreaterThanOrEqual(10);
    });

    it('rounds to nearest 5 seconds', () => {
      const result = calculateProgressionWithFeedback(43, 'timed', 3);
      expect(result % 5).toBe(0);
    });
  });

  describe('progression scenarios', () => {
    it('allows reps to decrease when exercise is too hard', () => {
      // User does 30 reps, rates as "way too hard" (5)
      // Next workout should have fewer reps
      const result = calculateProgressionWithFeedback(30, 'reps', 5);
      expect(result).toBeLessThan(30);
    });

    it('increases reps more aggressively when exercise is way too easy', () => {
      // User does 10 reps, rates as "way too easy" (1)
      // Next workout should increase significantly
      const tooEasyResult = calculateProgressionWithFeedback(10, 'reps', 1);
      const justRightResult = calculateProgressionWithFeedback(10, 'reps', 3);
      expect(tooEasyResult).toBeGreaterThan(justRightResult);
    });

    it('maintains similar targets when exercise is just right', () => {
      // Feedback 3 should only increase slightly (5%)
      const result = calculateProgressionWithFeedback(100, 'reps', 3);
      // Should be around 105 (100 * 1.05)
      expect(result).toBeGreaterThanOrEqual(100);
      expect(result).toBeLessThanOrEqual(110);
    });
  });
});
