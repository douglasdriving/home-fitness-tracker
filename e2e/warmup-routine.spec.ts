import { test, expect, Page } from '@playwright/test';

// Issue #29: A pre-workout dynamic warmup screen runs before each session,
// parameterized by muscle group. Starting a fresh daily-rotation abs session
// (with autoShowWarmup on) lands on /warmup showing abs-specific moves
// (Cat-Cow Flow first). Skip All goes straight to the workout. With the
// preference off, Start goes directly to the workout.

test.describe('Pre-Workout Warmup', () => {
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

  async function setupCalibratedUser(page: Page, autoShowWarmup: boolean) {
    await page.evaluate((warmup) => {
      localStorage.setItem('fitness-tracker-user-profile', JSON.stringify({
        userId: 'test-user',
        createdDate: Date.now(),
        calibrationCompleted: true,
        hasElasticBands: true,
        strengthLevels: {
          abs: 30,
          glutes: 30,
          lowerBack: 30,
          upperBody: 30,
          lastUpdated: Date.now(),
        },
        exerciseAchievements: { unlockedExercises: [], retiredExercises: [] },
        preferences: { autoShowWarmup: warmup, autoShowStretching: true, autoShowMeditation: false },
      }));
    }, autoShowWarmup);
    await page.reload();
  }

  async function startDailyRotation(page: Page) {
    await page.getByRole('button', { name: /generate daily focus/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /start workout/i }).click();
  }

  test('fresh abs session lands on the warmup with abs-specific moves', async ({ page }) => {
    await setupCalibratedUser(page, true);
    await startDailyRotation(page);

    // Warmup screen, first abs move is the Cat-Cow Flow (dynamic, not a hold)
    await expect(page.getByRole('heading', { name: '🔥 Warmup' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Cat-Cow Flow' })).toBeVisible();
    await expect(page.getByText(/Move 1 of/i)).toBeVisible();

    // Step to the second abs move: Trunk Rotations
    await page.getByRole('button', { name: /skip this exercise/i }).click();
    await expect(page.getByText(/Move 2 of/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Trunk Rotations' })).toBeVisible();
  });

  test('Skip All exits the warmup and enters the workout', async ({ page }) => {
    await setupCalibratedUser(page, true);
    await startDailyRotation(page);

    await expect(page.getByRole('heading', { name: '🔥 Warmup' })).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /skip all/i }).click();

    // Should now be in the workout (warmup header gone)
    await expect(page.getByRole('heading', { name: '🔥 Warmup' })).not.toBeVisible();
    await expect(page).toHaveURL(/\/workout$/);
  });

  test('warmup is skipped entirely when the preference is off', async ({ page }) => {
    await setupCalibratedUser(page, false);
    await startDailyRotation(page);

    // No warmup screen — go straight to the workout
    await expect(page.getByRole('heading', { name: '🔥 Warmup' })).not.toBeVisible();
    await expect(page).toHaveURL(/\/workout$/);
  });
});
