import { test, expect, Page } from '@playwright/test';

// Issue #28: Post-workout stretch sets must match the trained muscle group,
// stretching each muscle by moving opposite to its action. For a daily-rotation
// abs session the stretch screen should show: Cobra -> Lying Spinal Twist ->
// Side-Bend (and NOT Cat-Cow, which contracts rather than releases the abs).

test.describe('Daily Rotation Stretch Sets', () => {
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

  async function setupCalibratedUser(page: Page) {
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
          upperBody: 30,
          lastUpdated: Date.now(),
        },
        exerciseAchievements: { unlockedExercises: [], retiredExercises: [] },
      }));
    });
    await page.reload();
  }

  // Drives the workout through exercise completion until the stretching screen.
  async function completeWorkoutToStretching(page: Page) {
    await page.getByRole('button', { name: /generate daily focus/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /start workout/i }).click();

    let maxIterations = 150;
    while (maxIterations-- > 0) {
      const isStretching = await page
        .getByText(/Stretch 1 of/i)
        .isVisible({ timeout: 300 })
        .catch(() => false);
      if (isStretching) break;

      const completeButton = page.getByRole('button', { name: /complete set/i });
      if (await completeButton.isVisible({ timeout: 800 }).catch(() => false)) {
        await completeButton.click();

        const feedbackVisible = await page
          .getByText(/how did that feel/i)
          .isVisible({ timeout: 800 })
          .catch(() => false);
        if (feedbackVisible) {
          await page.getByText(/just right/i).click();
          await page.getByRole('button', { name: /continue/i }).click();
        }
        continue;
      }

      const skipRest = page.getByRole('button', { name: /^skip$/i });
      if (await skipRest.isVisible({ timeout: 800 }).catch(() => false)) {
        await skipRest.click();
        continue;
      }

      break;
    }

    await expect(page.getByText(/Stretch 1 of/i)).toBeVisible({ timeout: 10000 });
  }

  test('abs daily-rotation session shows cobra -> twist -> side-bend (no cat-cow)', async ({ page }) => {
    // A fresh calibrated user with no history starts on the abs rotation slot.
    await setupCalibratedUser(page);
    await completeWorkoutToStretching(page);

    // Stretch 1: Cobra Stretch
    await expect(page.getByRole('heading', { name: 'Cobra Stretch' })).toBeVisible();

    // Cat-Cow must never appear in the abs stretch set.
    await expect(page.getByRole('heading', { name: 'Cat-Cow Stretch' })).not.toBeVisible();

    // Step to stretch 2: Lying Spinal Twist
    await page.getByRole('button', { name: /skip this stretch/i }).click();
    await expect(page.getByText(/Stretch 2 of/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Lying Spinal Twist' })).toBeVisible();

    // Step to stretch 3: Side-Bend Stretch
    await page.getByRole('button', { name: /skip this stretch/i }).click();
    await expect(page.getByText(/Stretch 3 of/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Side-Bend Stretch' })).toBeVisible();

    // Confirm Cat-Cow never appeared at any step.
    await expect(page.getByRole('heading', { name: 'Cat-Cow Stretch' })).not.toBeVisible();
  });
});
