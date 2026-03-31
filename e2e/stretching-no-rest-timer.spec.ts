import { test, expect } from '@playwright/test';

test.describe('Stretching Routine - No Rest Timer Between Stretches', () => {
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

  async function setupCalibratedUser(page: import('@playwright/test').Page) {
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
        preferences: { autoShowStretching: true },
      }));
    });
    await page.reload();
  }

  async function navigateToStretching(page: import('@playwright/test').Page) {
    await setupCalibratedUser(page);

    // Generate and start workout
    await page.getByRole('button', { name: /generate|new workout/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /start workout/i }).click();

    // Complete all exercises to reach stretching
    let maxIterations = 100;
    while (maxIterations-- > 0) {
      const isStretching = await page.getByText(/stretching/i).isVisible({ timeout: 500 }).catch(() => false);
      if (isStretching) break;

      const completeButton = page.getByRole('button', { name: /complete set/i });
      if (await completeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await completeButton.click();

        const feedbackVisible = await page.getByText(/how did that feel/i).isVisible({ timeout: 1000 }).catch(() => false);
        if (feedbackVisible) {
          await page.getByText(/just right/i).click();
          await page.getByRole('button', { name: /continue/i }).click();
        }
        continue;
      }

      const skipRest = page.getByRole('button', { name: /skip/i });
      if (await skipRest.isVisible({ timeout: 1000 }).catch(() => false)) {
        await skipRest.click();
        continue;
      }

      break;
    }

    // Should now be on stretching page
    await expect(page.getByText(/stretching/i)).toBeVisible({ timeout: 10000 });
  }

  test('skipping a stretch does not show Quick Break screen', async ({ page }) => {
    await navigateToStretching(page);

    // Should see first stretch
    await expect(page.getByText(/Stretch 1 of/)).toBeVisible();

    // Skip the first stretch
    await page.getByRole('button', { name: /skip this stretch/i }).click();

    // Should immediately show stretch 2, NOT the Quick Break screen
    await expect(page.getByText(/Stretch 2 of/)).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Quick Break')).not.toBeVisible();
  });

  test('no Quick Break or rest timer UI is visible on the stretching page', async ({ page }) => {
    await navigateToStretching(page);

    // The stretching page should never show "Quick Break"
    await expect(page.getByText('Quick Break')).not.toBeVisible();
    await expect(page.getByText('Relax for a moment before the next stretch')).not.toBeVisible();
  });
});
