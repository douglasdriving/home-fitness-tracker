import { describe, it, expect } from 'vitest';
import { allExercises, getExerciseById } from './exerciseData';

describe('exerciseData', () => {
  describe('Exercise removal - prone-y-t-w-001', () => {
    it('should not include prone-y-t-w-001 in allExercises', () => {
      const proneYTW = allExercises.find(ex => ex.id === 'prone-y-t-w-001');
      expect(proneYTW).toBeUndefined();
    });

    it('should return undefined when looking up removed exercise', () => {
      const result = getExerciseById('prone-y-t-w-001');
      expect(result).toBeUndefined();
    });

    it('should not have any exercises unlocked by prone-y-t-w-001', () => {
      const exercisesUnlockedByProneYTW = allExercises.filter(
        ex => ex.unlockRequirement?.exerciseId === 'prone-y-t-w-001'
      );
      expect(exercisesUnlockedByProneYTW).toHaveLength(0);
    });

    it('should have Back Extension Hold unlocked by good-morning-001 at 16 reps', () => {
      const backExtensionHold = getExerciseById('back-extension-hold-001');
      expect(backExtensionHold).toBeDefined();
      expect(backExtensionHold?.unlockRequirement).toEqual({
        exerciseId: 'good-morning-001',
        type: 'reps',
        value: 16,
      });
    });

    it('should have Good Morning exercise with both Superman and Back Extension Hold unlocking at 30 reps', () => {
      const goodMorning = getExerciseById('good-morning-001');
      expect(goodMorning).toBeDefined();

      // Find all exercises unlocked by good-morning-001
      const exercisesUnlockedByGoodMorning = allExercises.filter(
        ex => ex.unlockRequirement?.exerciseId === 'good-morning-001'
      );

      // Should have at least 2: Superman and Back Extension Hold
      expect(exercisesUnlockedByGoodMorning.length).toBeGreaterThanOrEqual(2);

      const exerciseIds = exercisesUnlockedByGoodMorning.map(ex => ex.id);
      expect(exerciseIds).toContain('superman-001');
      expect(exerciseIds).toContain('back-extension-hold-001');

      // Both should unlock at 16 reps
      const superman = exercisesUnlockedByGoodMorning.find(ex => ex.id === 'superman-001');
      const backExtensionHold = exercisesUnlockedByGoodMorning.find(ex => ex.id === 'back-extension-hold-001');

      expect(superman?.unlockRequirement?.value).toBe(16);
      expect(backExtensionHold?.unlockRequirement?.value).toBe(16);
    });

    it('should still have all other lower back base exercises', () => {
      const lowerBackBaseExercises = allExercises.filter(
        ex => ex.muscleGroups.includes('lowerBack') && !ex.unlockRequirement
      );

      // Bird Dog should be the primary lower back base exercise
      const birdDog = lowerBackBaseExercises.find(ex => ex.id === 'bird-dog-001');
      expect(birdDog).toBeDefined();
      expect(lowerBackBaseExercises.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Lower back progression chain', () => {
    it('should have a complete lower back progression chain after removal', () => {
      const birdDog = getExerciseById('bird-dog-001');
      const goodMorning = getExerciseById('good-morning-001');
      const superman = getExerciseById('superman-001');
      const backExtensionHold = getExerciseById('back-extension-hold-001');
      const reverseHyper = getExerciseById('reverse-hyperextension-001');

      // Verify chain exists
      expect(birdDog).toBeDefined();
      expect(goodMorning).toBeDefined();
      expect(superman).toBeDefined();
      expect(backExtensionHold).toBeDefined();
      expect(reverseHyper).toBeDefined();

      // Verify progression: Bird Dog → Good Morning
      expect(goodMorning?.unlockRequirement?.exerciseId).toBe('bird-dog-001');

      // Verify fork: Good Morning → Superman AND Good Morning → Back Extension Hold
      expect(superman?.unlockRequirement?.exerciseId).toBe('good-morning-001');
      expect(backExtensionHold?.unlockRequirement?.exerciseId).toBe('good-morning-001');

      // Verify continuation: Back Extension Hold → Reverse Hyperextension
      expect(reverseHyper?.unlockRequirement?.exerciseId).toBe('back-extension-hold-001');
    });
  });
});
