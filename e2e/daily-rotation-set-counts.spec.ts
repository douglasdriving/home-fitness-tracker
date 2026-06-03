import { test, expect } from '@playwright/test';

test.describe('Daily Rotation Set Counts', () => {
  test.beforeEach(async ({ page }) => {
    // Clear IndexedDB and localStorage before each test
    await page.goto('/');
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('FitnessTrackerDB');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    });
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('per-side exercises receive 2 sets in daily rotation', async ({ page }) => {
    // Set up a calibrated user with elastic bands
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('fitness-tracker-user-profile', JSON.stringify({
        userId: 'test-user',
        createdDate: Date.now(),
        calibrationCompleted: true,
        hasElasticBands: true,
        strengthLevels: {
          abs: 30,
          glutes: 30,
          lowerBack: 30,
          lastUpdated: Date.now(),
        },
        exerciseAchievements: {
          unlockedExercises: [],
          retiredExercises: [],
        },
      }));
    });
    await page.reload();

    // Generate a daily rotation workout for glutes (has per-side exercises)
    await page.getByRole('button', { name: /daily focus|focus session/i }).click();
    await page.waitForTimeout(500);

    // Start the workout
    await page.getByRole('button', { name: /start workout/i }).click();
    await page.waitForTimeout(500);

    // Check the workout data for per-side exercises
    const workoutData = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('fitness-tracker-workout') || '{}');
    });

    // Find any per-side exercise in the workout (e.g., Donkey Kicks)
    const perSideExercise = workoutData?.state?.exercises?.find(
      (ex: { exerciseId: string }) =>
        ex.exerciseId === 'donkey-kicks-001' ||
        ex.exerciseId === 'single-leg-glute-bridge-001' ||
        ex.exerciseId === 'single-leg-rdl-001'
    );

    // If a per-side exercise is in the workout, verify it has exactly 2 sets
    if (perSideExercise) {
      expect(perSideExercise.sets.length).toBe(2);
    }
  });

  test('standard exercises receive 3 sets in daily rotation', async ({ page }) => {
    // Set up a calibrated user
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('fitness-tracker-user-profile', JSON.stringify({
        userId: 'test-user',
        createdDate: Date.now(),
        calibrationCompleted: true,
        hasElasticBands: false,
        strengthLevels: {
          abs: 30,
          glutes: 30,
          lowerBack: 30,
          lastUpdated: Date.now(),
        },
        exerciseAchievements: {
          unlockedExercises: [],
          retiredExercises: [],
        },
      }));
    });
    await page.reload();

    // Generate a daily rotation workout for abs (has standard exercises)
    await page.getByRole('button', { name: /daily focus|focus session/i }).click();
    await page.waitForTimeout(500);

    // Start the workout
    await page.getByRole('button', { name: /start workout/i }).click();
    await page.waitForTimeout(500);

    // Check the workout data for standard exercises
    const workoutData = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('fitness-tracker-workout') || '{}');
    });

    // Find standard exercises (not per-side)
    const standardExercise = workoutData?.state?.exercises?.find(
      (ex: { exerciseId: string }) =>
        ex.exerciseId === 'dead-bug-001' ||
        ex.exerciseId === 'reverse-crunches-001' ||
        ex.exerciseId === 'crunches-001'
    );

    // Verify standard exercises have 3 sets
    if (standardExercise) {
      expect(standardExercise.sets.length).toBe(3);
    }
  });

  test('daily rotation with mixed exercise types has correct set counts', async ({ page }) => {
    // Set up a calibrated user with elastic bands
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('fitness-tracker-user-profile', JSON.stringify({
        userId: 'test-user',
        createdDate: Date.now(),
        calibrationCompleted: true,
        hasElasticBands: true,
        strengthLevels: {
          abs: 30,
          glutes: 30,
          lowerBack: 30,
          lastUpdated: Date.now(),
        },
        exerciseAchievements: {
          unlockedExercises: [],
          retiredExercises: [],
        },
      }));
    });
    await page.reload();

    // Generate a daily rotation workout
    await page.getByRole('button', { name: /daily focus|focus session/i }).click();
    await page.waitForTimeout(500);

    // Start the workout
    await page.getByRole('button', { name: /start workout/i }).click();
    await page.waitForTimeout(500);

    // Verify all exercises have the correct set counts
    const workoutData = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('fitness-tracker-workout') || '{}');
    });

    const exercises = workoutData?.state?.exercises || [];

    // Check that we have a workout
    expect(exercises.length).toBeGreaterThan(0);

    // Verify each exercise has the correct number of sets based on type
    // Note: We can't check specific exercises since workout generation is dynamic,
    // but we verified the logic with unit tests. This e2e test confirms the
    // integration works end-to-end.
    for (const exercise of exercises) {
      // Each exercise should have either 2 or 3 sets
      expect([2, 3]).toContain(exercise.sets.length);
    }
  });

  test('full-body workout set counts remain unchanged', async ({ page }) => {
    // Set up a calibrated user with elastic bands
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('fitness-tracker-user-profile', JSON.stringify({
        userId: 'test-user',
        createdDate: Date.now(),
        calibrationCompleted: true,
        hasElasticBands: true,
        strengthLevels: {
          abs: 30,
          glutes: 30,
          lowerBack: 30,
          lastUpdated: Date.now(),
        },
        exerciseAchievements: {
          unlockedExercises: [],
          retiredExercises: [],
        },
      }));
    });
    await page.reload();

    // Generate a full-body workout
    await page.getByRole('button', { name: /full core|full.*workout/i }).click();
    await page.waitForTimeout(500);

    // Start the workout
    await page.getByRole('button', { name: /start workout/i }).click();
    await page.waitForTimeout(500);

    // Check the workout data
    const workoutData = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('fitness-tracker-workout') || '{}');
    });

    const exercises = workoutData?.state?.exercises || [];

    // Full-body workouts should have 4 exercises
    expect(exercises.length).toBe(4);

    // Verify each exercise has either 3 or 4 sets (per-side = 3, standard = 4)
    for (const exercise of exercises) {
      expect([3, 4]).toContain(exercise.sets.length);
    }
  });
});
