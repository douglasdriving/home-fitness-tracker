import { test, expect } from '@playwright/test';

test.describe('Plank Shoulder Taps Reps-Based Exercise', () => {
  test.beforeEach(async ({ page }) => {
    // Clear IndexedDB before each test
    await page.goto('/');
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('FitnessTrackerDB');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    });
    // Clear localStorage
    await page.evaluate(() => localStorage.clear());
    // Reload to apply changes
    await page.reload();
  });

  test('shoulder taps shows as reps-based exercise in workout', async ({ page }) => {
    // Set up a calibrated user with high enough strength to unlock shoulder taps
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('fitness-tracker-user-profile', JSON.stringify({
        userId: 'test-user',
        createdDate: Date.now(),
        calibrationCompleted: true,
        strengthLevels: {
          abs: 60,
          glutes: 60,
          lowerBack: 60,
          lastUpdated: Date.now(),
        },
        exerciseAchievements: {
          unlockedExercises: ['plank-shoulder-taps-001'],
          retiredExercises: [],
        },
      }));
    });

    // Add workout history with plank at 50s to meet unlock requirement
    await page.evaluate(async () => {
      const { db } = await import('../src/db/db.js');
      await db.history.add({
        id: 'test-history-1',
        workoutNumber: 1,
        completedDate: Date.now() - 86400000,
        totalDuration: 300,
        exercises: [
          {
            exerciseId: 'plank-001',
            exerciseName: 'Plank',
            muscleGroups: ['abs', 'lowerBack'],
            completedSets: [
              { setNumber: 1, targetDuration: 30, actualDuration: 50 },
            ],
          },
        ],
      });
    });

    await page.reload();

    // Start a workout
    await page.click('text=Start Workout');
    await page.waitForURL('/workout');

    // Wait for workout to load
    await page.waitForSelector('text=/Set \\d+ of \\d+/', { timeout: 10000 });

    // Try to find shoulder taps exercise if it's in the workout
    const exercises = await page.evaluate(async () => {
      const { db } = await import('../src/db/db.js');
      const workout = await db.workouts.toArray();
      return workout[0]?.exercises.map(ex => ex.exerciseId) || [];
    });

    if (exercises.includes('plank-shoulder-taps-001')) {
      // Navigate through exercises until we find shoulder taps
      while (true) {
        const exerciseName = await page.textContent('h2');
        if (exerciseName?.includes('Plank Shoulder Taps')) {
          // Should show reps input, not duration
          await expect(page.locator('input[type="number"]')).toBeVisible();
          await expect(page.locator('text=/Target: \\d+ reps/')).toBeVisible();

          // Should NOT show duration-related text
          await expect(page.locator('text=/seconds/')).not.toBeVisible();

          break;
        }

        // Move to next exercise if available
        const nextButton = page.locator('button:has-text("Next")');
        if (await nextButton.isVisible()) {
          await nextButton.click();
          await page.waitForTimeout(500);
        } else {
          break;
        }
      }
    }
  });

  test('shoulder taps appears in locked exercises with correct unlock requirement', async ({ page }) => {
    // Set up a calibrated user who has not yet unlocked shoulder taps
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('fitness-tracker-user-profile', JSON.stringify({
        userId: 'test-user',
        createdDate: Date.now(),
        calibrationCompleted: true,
        strengthLevels: {
          abs: 30,
          glutes: 30,
          lowerBack: 30,
          lastUpdated: Date.now(),
        },
      }));
    });
    await page.reload();

    // Navigate to Exercises tab
    await page.click('text=Exercises');
    await page.waitForURL('/exercises');

    // Click on Locked tab
    await page.click('text=/Locked/');

    // Find Plank Shoulder Taps in the locked exercises
    const shoulderTapsCard = page.locator('.bg-background-light').filter({ hasText: 'Plank Shoulder Taps' });
    await expect(shoulderTapsCard).toBeVisible({ timeout: 5000 });

    // Check that it shows the unlock requirement: 30s plank (the McGill hold ceiling).
    // ExerciseStatus renders this as "{current}/30 s Plank".
    await expect(shoulderTapsCard.locator('text=/\\/\\s*30\\s*s\\s*Plank/i')).toBeVisible();
  });

  test('shoulder taps can be completed with reps in workout', async ({ page }) => {
    // Set up a calibrated user with shoulder taps unlocked
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('fitness-tracker-user-profile', JSON.stringify({
        userId: 'test-user',
        createdDate: Date.now(),
        calibrationCompleted: true,
        strengthLevels: {
          abs: 60,
          glutes: 60,
          lowerBack: 60,
          lastUpdated: Date.now(),
        },
        exerciseAchievements: {
          unlockedExercises: ['plank-shoulder-taps-001'],
          retiredExercises: [],
        },
      }));
    });

    // Create a workout with only shoulder taps for easy testing
    await page.evaluate(async () => {
      const { db } = await import('../src/db/db.js');
      await db.workouts.add({
        id: 'test-workout-1',
        date: new Date(),
        status: 'in-progress',
        currentExerciseIndex: 0,
        exercises: [
          {
            exerciseId: 'plank-shoulder-taps-001',
            sets: [
              { setNumber: 1, targetReps: 12, completed: false },
              { setNumber: 2, targetReps: 12, completed: false },
              { setNumber: 3, targetReps: 12, completed: false },
            ],
          },
        ],
      });
    });

    await page.reload();
    await page.goto('/workout');

    // Wait for exercise to load
    await expect(page.locator('h2:has-text("Plank Shoulder Taps")')).toBeVisible({ timeout: 10000 });

    // Should show reps target
    await expect(page.locator('text=/Target: 12 reps/')).toBeVisible();

    // Complete the set with 15 reps
    await page.fill('input[type="number"]', '15');
    await page.click('text=Complete Set');

    // Should move to set 2
    await expect(page.locator('text=/Set 2 of 3/')).toBeVisible();

    // Complete set 2
    await page.fill('input[type="number"]', '14');
    await page.click('text=Complete Set');

    // Should move to set 3
    await expect(page.locator('text=/Set 3 of 3/')).toBeVisible();

    // Complete set 3
    await page.fill('input[type="number"]', '16');
    await page.click('text=Complete Set');

    // Should show feedback form
    await expect(page.locator('text=/How did that feel/')).toBeVisible({ timeout: 5000 });
  });

  test('historical shoulder taps data migrates from duration to reps', async ({ page }) => {
    // Set up a calibrated user
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('fitness-tracker-user-profile', JSON.stringify({
        userId: 'test-user',
        createdDate: Date.now(),
        calibrationCompleted: true,
        strengthLevels: {
          abs: 60,
          glutes: 60,
          lowerBack: 60,
          lastUpdated: Date.now(),
        },
        exerciseAchievements: {
          unlockedExercises: ['plank-shoulder-taps-001'],
          retiredExercises: [],
        },
        // Migration not yet completed
        hasMigratedShoulderTaps: false,
      }));
    });

    // Add historical shoulder taps data with duration (pre-migration format)
    await page.evaluate(async () => {
      const { db } = await import('../src/db/db.js');
      await db.history.add({
        id: 'test-history-1',
        workoutNumber: 1,
        completedDate: Date.now() - 86400000,
        totalDuration: 600,
        exercises: [
          {
            exerciseId: 'plank-shoulder-taps-001',
            exerciseName: 'Plank Shoulder Taps',
            muscleGroups: ['abs', 'lowerBack'],
            completedSets: [
              { setNumber: 1, targetDuration: 30, actualDuration: 45 },
              { setNumber: 2, targetDuration: 30, actualDuration: 42 },
              { setNumber: 3, targetDuration: 30, actualDuration: 48 },
            ],
          },
        ],
      });
    });

    // Reload to trigger migration
    await page.reload();

    // Wait for migration to complete
    await page.waitForTimeout(2000);

    // Check that historical data was migrated
    const migratedData = await page.evaluate(async () => {
      const { db } = await import('../src/db/db.js');
      const history = await db.history.get('test-history-1');
      return history?.exercises[0]?.completedSets;
    });

    // Should have actualReps instead of actualDuration
    expect(migratedData).toBeTruthy();
    expect(migratedData![0].actualReps).toBe(15); // 45s / 3 = 15 reps
    expect(migratedData![0].actualDuration).toBeUndefined();
    expect(migratedData![1].actualReps).toBe(14); // 42s / 3 = 14 reps
    expect(migratedData![2].actualReps).toBe(16); // 48s / 3 = 16 reps

    // Check that migration flag was set
    const profile = await page.evaluate(() => {
      const stored = localStorage.getItem('fitness-tracker-user-profile');
      return stored ? JSON.parse(stored) : null;
    });
    expect(profile?.hasMigratedShoulderTaps).toBe(true);

    // Navigate to history and verify display shows reps
    await page.click('text=History');
    await page.waitForURL('/history');

    // Click on the workout card to view details
    const workoutCard = page.locator('.bg-background-light').first();
    await workoutCard.click();

    // Modal should show reps, not seconds
    await expect(page.locator('text=/15 reps/')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/14 reps/')).toBeVisible();
    await expect(page.locator('text=/16 reps/')).toBeVisible();
  });
});
