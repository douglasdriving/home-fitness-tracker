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

    it('should have Back Extension Hold as a starter exercise (no unlock requirement)', () => {
      const backExtensionHold = getExerciseById('back-extension-hold-001');
      expect(backExtensionHold).toBeDefined();
      expect(backExtensionHold?.unlockRequirement).toBeUndefined();
    });

    it('should have Superman unlocked by good-morning-001 at 16 reps', () => {
      const goodMorning = getExerciseById('good-morning-001');
      expect(goodMorning).toBeDefined();

      // Find all exercises unlocked by good-morning-001
      const exercisesUnlockedByGoodMorning = allExercises.filter(
        ex => ex.unlockRequirement?.exerciseId === 'good-morning-001'
      );

      // Should have Superman
      expect(exercisesUnlockedByGoodMorning.length).toBeGreaterThanOrEqual(1);

      const exerciseIds = exercisesUnlockedByGoodMorning.map(ex => ex.id);
      expect(exerciseIds).toContain('superman-001');

      const superman = exercisesUnlockedByGoodMorning.find(ex => ex.id === 'superman-001');
      expect(superman?.unlockRequirement?.value).toBe(16);
    });

    it('should still have all other lower back base exercises', () => {
      const lowerBackBaseExercises = allExercises.filter(
        ex => ex.primaryMuscleGroup === 'lowerBack' && !ex.unlockRequirement
      );

      // Bird Dog, Good Morning, and Back Extension Hold should be lower back starters
      const birdDog = lowerBackBaseExercises.find(ex => ex.id === 'bird-dog-001');
      const goodMorning = lowerBackBaseExercises.find(ex => ex.id === 'good-morning-001');
      const backExtensionHold = lowerBackBaseExercises.find(ex => ex.id === 'back-extension-hold-001');
      expect(birdDog).toBeDefined();
      expect(goodMorning).toBeDefined();
      expect(backExtensionHold).toBeDefined();
      expect(lowerBackBaseExercises.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('primaryMuscleGroup field', () => {
    it('should have primaryMuscleGroup set on every exercise', () => {
      allExercises.forEach(exercise => {
        expect(exercise.primaryMuscleGroup).toBeDefined();
        expect(['abs', 'glutes', 'lowerBack']).toContain(exercise.primaryMuscleGroup);
      });
    });

    it('primaryMuscleGroup should always be included in muscleGroups array', () => {
      allExercises.forEach(exercise => {
        expect(exercise.muscleGroups).toContain(exercise.primaryMuscleGroup);
      });
    });

    it('primaryMuscleGroup should match the first entry in muscleGroups', () => {
      allExercises.forEach(exercise => {
        expect(exercise.primaryMuscleGroup).toBe(exercise.muscleGroups[0]);
      });
    });
  });

  describe('Lower back progression chain', () => {
    it('should have a complete lower back progression chain', () => {
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

      // Bird Dog, Good Morning, and Back Extension Hold are starters (no unlock requirement)
      expect(birdDog?.unlockRequirement).toBeUndefined();
      expect(goodMorning?.unlockRequirement).toBeUndefined();
      expect(backExtensionHold?.unlockRequirement).toBeUndefined();

      // Verify locked exercises: Good Morning → Superman
      expect(superman?.unlockRequirement?.exerciseId).toBe('good-morning-001');

      // Verify continuation: Back Extension Hold → Reverse Hyperextension
      expect(reverseHyper?.unlockRequirement?.exerciseId).toBe('back-extension-hold-001');
    });
  });

  describe('Starter exercises per muscle group', () => {
    it('should have at least 3 starter exercises per primary muscle group (without bands)', () => {
      const muscleGroups = ['abs', 'glutes', 'lowerBack'] as const;

      muscleGroups.forEach(group => {
        const starters = allExercises.filter(
          ex => ex.primaryMuscleGroup === group
            && !ex.unlockRequirement
            && ex.equipment !== 'elastic-band'
        );
        expect(starters.length).toBeGreaterThanOrEqual(3);
      });
    });
  });

  describe('Single-Leg RDL resistance band update', () => {
    it('should have elastic-band equipment', () => {
      const singleLegRDL = getExerciseById('single-leg-rdl-001');
      expect(singleLegRDL).toBeDefined();
      expect(singleLegRDL?.equipment).toBe('elastic-band');
    });

    it('should have description mentioning band setup', () => {
      const singleLegRDL = getExerciseById('single-leg-rdl-001');
      expect(singleLegRDL).toBeDefined();
      expect(singleLegRDL?.description).toBeDefined();

      const description = singleLegRDL?.description.toLowerCase();
      expect(description).toContain('band');
      expect(description).toContain('foot');
    });

    it('should have a coaching tip reminding about the elastic loop band', () => {
      const singleLegRDL = getExerciseById('single-leg-rdl-001');
      expect(singleLegRDL).toBeDefined();
      expect(singleLegRDL?.coachingTip).toBeDefined();
      expect(singleLegRDL?.coachingTip?.toLowerCase()).toContain('elastic loop band');
    });

    it('should maintain its existing fields', () => {
      const singleLegRDL = getExerciseById('single-leg-rdl-001');
      expect(singleLegRDL).toBeDefined();

      // Should maintain key properties
      expect(singleLegRDL?.name).toBe('Single-Leg Romanian Deadlift');
      expect(singleLegRDL?.type).toBe('reps');
      expect(singleLegRDL?.defaultReps).toBe(10);
      expect(singleLegRDL?.countingMethod).toBe('per-side');
      expect(singleLegRDL?.heavinessScore).toEqual({ abs: 0, glutes: 7, lowerBack: 5 });
      expect(singleLegRDL?.primaryMuscleGroup).toBe('glutes');
    });
  });

  describe('Curtsy Lunge conversion to total reps', () => {
    it('should not have per-side counting method', () => {
      const curtsyLunge = getExerciseById('curtsy-lunge-001');
      expect(curtsyLunge).toBeDefined();
      // Should be undefined (default is 'total') or explicitly 'total'
      expect(curtsyLunge?.countingMethod).not.toBe('per-side');
    });

    it('should have defaultReps of 24 (doubled from original 12)', () => {
      const curtsyLunge = getExerciseById('curtsy-lunge-001');
      expect(curtsyLunge).toBeDefined();
      expect(curtsyLunge?.defaultReps).toBe(24);
    });

    it('should have unlock requirement of 40 Band Clamshells (doubled from 20)', () => {
      const curtsyLunge = getExerciseById('curtsy-lunge-001');
      expect(curtsyLunge).toBeDefined();
      expect(curtsyLunge?.unlockRequirement).toBeDefined();
      expect(curtsyLunge?.unlockRequirement?.exerciseId).toBe('band-clamshells-001');
      expect(curtsyLunge?.unlockRequirement?.value).toBe(40);
    });

    it('should have retirement threshold of 80 reps (doubled from 40)', () => {
      const curtsyLunge = getExerciseById('curtsy-lunge-001');
      expect(curtsyLunge).toBeDefined();
      expect(curtsyLunge?.retirementThreshold).toBeDefined();
      expect(curtsyLunge?.retirementThreshold?.value).toBe(80);
    });

    it('should maintain unchanged properties', () => {
      const curtsyLunge = getExerciseById('curtsy-lunge-001');
      expect(curtsyLunge).toBeDefined();

      // These should NOT be doubled
      expect(curtsyLunge?.name).toBe('Curtsy Lunge');
      expect(curtsyLunge?.primaryMuscleGroup).toBe('glutes');
      expect(curtsyLunge?.type).toBe('reps');
      expect(curtsyLunge?.heavinessScore).toEqual({ abs: 0, glutes: 6, lowerBack: 0 });
    });
  });
});
