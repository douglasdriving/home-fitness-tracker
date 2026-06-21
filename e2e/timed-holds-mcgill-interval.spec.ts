import { test, expect } from '@playwright/test';

/**
 * Hollow Body Hold and Back Extension Hold use the same ceiling-based McGill
 * short-hold protocol as Plank (issue #25). Neither is per-side, so each must
 * render the single-sided interval target ("3×10s") and a continuous timer with
 * no Left/Right transition.
 */
const cases = [
  {
    label: 'Hollow Body Hold',
    exerciseId: 'hollow-body-hold-001',
    muscleGroups: ['abs'],
  },
  {
    label: 'Back Extension Hold',
    exerciseId: 'back-extension-hold-001',
    muscleGroups: ['lowerBack', 'glutes'],
  },
];

test.describe('Timed holds McGill interval protocol (single-sided)', () => {
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

  for (const c of cases) {
    test(`${c.label} shows interval target and single-sided timer (no Left/Right)`, async ({ page }) => {
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

      // Create an in-progress workout containing only this McGill-format hold
      await page.evaluate(async (data) => {
        const { db } = await import('../src/db/db.js');
        await db.workouts.add({
          id: 'test-mcgill-hold-workout',
          status: 'in-progress',
          currentExerciseIndex: 0,
          exercises: [
            {
              exerciseId: data.exerciseId,
              exerciseName: data.label,
              muscleGroups: data.muscleGroups,
              restTime: 45,
              sets: [
                { setNumber: 1, targetDuration: 30, mcgillRounds: 3, mcgillHoldDuration: 10, completed: false },
                { setNumber: 2, targetDuration: 20, mcgillRounds: 2, mcgillHoldDuration: 10, completed: false },
                { setNumber: 3, targetDuration: 10, mcgillRounds: 1, mcgillHoldDuration: 10, completed: false },
              ],
            },
          ],
        });
      }, c);

      await page.reload();
      await page.goto('/workout');

      // Exercise should load
      await expect(page.locator(`h2:has-text("${c.label}")`)).toBeVisible({ timeout: 10000 });

      // Target should display as the interval format "3×10s" WITHOUT "per side"
      await expect(page.locator('text=3×10s')).toBeVisible();
      await expect(page.locator('text=/per side/')).not.toBeVisible();

      // Start the McGill timer
      await page.click('button:has-text("Start")');

      // Single-sided: status reads "Hold 1 of 3" with no Left/Right labels
      await expect(page.locator('text=/Hold 1 of 3/')).toBeVisible();
      await expect(page.locator('text=/Left Side/')).not.toBeVisible();
      await expect(page.locator('text=/Right Side/')).not.toBeVisible();
      await expect(page.locator('text=/Switch to Right Side/')).not.toBeVisible();
    });
  }
});
