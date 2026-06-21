import { test, expect } from '@playwright/test';

/**
 * Plank uses the ceiling-based McGill short-hold protocol (issue #24).
 * Unlike Side Plank it is NOT per-side, so the timer must run a single
 * continuous sequence of short holds with no Left/Right transition.
 */
test.describe('Plank McGill interval protocol (single-sided)', () => {
  test.beforeEach(async ({ page }) => {
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

  test('shows interval target and single-sided timer (no Left/Right)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('fitness-tracker-user-profile', JSON.stringify({
        userId: 'test-user',
        createdDate: Date.now(),
        calibrationCompleted: true,
        strengthLevels: {
          abs: 40,
          glutes: 40,
          lowerBack: 40,
          lastUpdated: Date.now(),
        },
      }));
    });

    // Create an in-progress workout containing only a McGill-format plank
    await page.evaluate(async () => {
      const { db } = await import('../src/db/db.js');
      await db.workouts.add({
        id: 'test-plank-workout',
        status: 'in-progress',
        currentExerciseIndex: 0,
        exercises: [
          {
            exerciseId: 'plank-001',
            exerciseName: 'Plank',
            muscleGroups: ['abs', 'lowerBack'],
            restTime: 45,
            sets: [
              { setNumber: 1, targetDuration: 45, mcgillRounds: 3, mcgillHoldDuration: 15, completed: false },
              { setNumber: 2, targetDuration: 30, mcgillRounds: 2, mcgillHoldDuration: 15, completed: false },
              { setNumber: 3, targetDuration: 15, mcgillRounds: 1, mcgillHoldDuration: 15, completed: false },
            ],
          },
        ],
      });
    });

    await page.reload();
    await page.goto('/workout');

    // Plank exercise should load
    await expect(page.locator('h2:has-text("Plank")')).toBeVisible({ timeout: 10000 });

    // Target should display as the interval format "3×15s" WITHOUT "per side"
    await expect(page.locator('text=3×15s')).toBeVisible();
    await expect(page.locator('text=/per side/')).not.toBeVisible();

    // Start the McGill timer
    await page.click('button:has-text("Start")');

    // Single-sided: status reads "Hold 1 of 3" with no Left/Right labels
    await expect(page.locator('text=/Hold 1 of 3/')).toBeVisible();
    await expect(page.locator('text=/Left Side/')).not.toBeVisible();
    await expect(page.locator('text=/Right Side/')).not.toBeVisible();
    await expect(page.locator('text=/Switch to Right Side/')).not.toBeVisible();
  });
});
