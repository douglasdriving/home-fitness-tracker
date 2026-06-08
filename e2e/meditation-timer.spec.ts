import { test, expect } from '@playwright/test';

test.describe('Meditation Timer', () => {
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

  async function setupCalibratedUser(page: import('@playwright/test').Page, options?: {
    autoShowStretching?: boolean;
    autoShowMeditation?: boolean;
    meditationState?: { completionCount: number; currentDurationSeconds: number };
  }) {
    await page.evaluate((opts) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profile: any = {
        userId: 'test-user',
        createdDate: Date.now(),
        calibrationCompleted: true,
        strengthLevels: {
          abs: 30,
          glutes: 30,
          lowerBack: 30,
          lastUpdated: Date.now(),
        },
        preferences: {
          autoShowStretching: opts?.autoShowStretching ?? true,
          autoShowMeditation: opts?.autoShowMeditation ?? true,
        },
      };

      if (opts?.meditationState) {
        profile.meditationState = opts.meditationState;
      }

      localStorage.setItem('fitness-tracker-user-profile', JSON.stringify(profile));
    }, options);
    await page.reload();
  }

  async function completeWorkout(page: import('@playwright/test').Page) {
    // Generate and start workout
    await page.getByRole('button', { name: /generate|new workout/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /start workout/i }).click();

    // Complete all exercises
    let maxIterations = 100;
    while (maxIterations-- > 0) {
      // Check if we've left the workout execution page
      const isStretching = await page.getByText(/stretching/i).isVisible({ timeout: 500 }).catch(() => false);
      const isMeditation = await page.getByText(/meditation/i).isVisible({ timeout: 500 }).catch(() => false);
      const isComplete = await page.getByText(/workout complete/i).isVisible({ timeout: 500 }).catch(() => false);
      if (isStretching || isMeditation || isComplete) break;

      // Try to complete a set
      const completeButton = page.getByRole('button', { name: /complete set/i });
      if (await completeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await completeButton.click();

        // Check for intensity feedback
        const feedbackVisible = await page.getByText(/how did that feel/i).isVisible({ timeout: 1000 }).catch(() => false);
        if (feedbackVisible) {
          await page.getByText(/just right/i).click();
          await page.getByRole('button', { name: /continue/i }).click();
        }
        continue;
      }

      // Try to skip rest
      const skipRest = page.getByRole('button', { name: /skip/i });
      if (await skipRest.isVisible({ timeout: 1000 }).catch(() => false)) {
        await skipRest.click();
        continue;
      }

      break;
    }
  }

  test('meditation appears after stretching when both enabled (default)', async ({ page }) => {
    await setupCalibratedUser(page);
    await completeWorkout(page);

    // Should be on stretching page first
    await expect(page.getByText(/stretching/i).first()).toBeVisible({ timeout: 10000 });

    // Skip stretching
    page.on('dialog', dialog => dialog.accept());
    await page.getByText(/skip all/i).click();

    // Should now be on meditation page
    await expect(page.locator('h1').filter({ hasText: /meditation/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/session #1/i)).toBeVisible();
  });

  test('meditation shows correct initial duration (1 minute)', async ({ page }) => {
    await setupCalibratedUser(page);
    await completeWorkout(page);

    // Skip stretching to get to meditation
    page.on('dialog', dialog => dialog.accept());
    await page.getByText(/skip all/i).click();

    // Should show 1 minute duration
    await expect(page.getByText(/1 minute/i)).toBeVisible();
  });

  test('skipping meditation navigates to workout complete without incrementing count', async ({ page }) => {
    await setupCalibratedUser(page);
    await completeWorkout(page);

    // Skip stretching
    page.on('dialog', dialog => dialog.accept());
    await page.getByText(/skip all/i).click();

    // Should be on meditation page
    await expect(page.locator('h1').filter({ hasText: /meditation/i })).toBeVisible({ timeout: 10000 });

    // Click Skip button (in header, not the timer skip)
    await page.locator('button:has-text("Skip")').first().click();

    // Should now be on workout complete
    await expect(page.getByText(/workout complete/i)).toBeVisible({ timeout: 10000 });

    // Check that meditation state was NOT incremented
    const profile = await page.evaluate(() => {
      const data = localStorage.getItem('fitness-tracker-user-profile');
      return data ? JSON.parse(data) : null;
    });

    // Should still be undefined or have completionCount of 0
    expect(profile.meditationState?.completionCount || 0).toBe(0);
  });

  test('meditation disabled skips directly to workout complete from stretching', async ({ page }) => {
    await setupCalibratedUser(page, { autoShowMeditation: false });
    await completeWorkout(page);

    // Skip stretching
    page.on('dialog', dialog => dialog.accept());
    await page.getByText(/skip all/i).click();

    // Should go directly to workout complete (no meditation)
    await expect(page.getByText(/workout complete/i)).toBeVisible({ timeout: 10000 });
  });

  test('both stretching and meditation disabled skips to workout complete', async ({ page }) => {
    await setupCalibratedUser(page, {
      autoShowStretching: false,
      autoShowMeditation: false,
    });
    await completeWorkout(page);

    // Should go directly to workout complete
    await expect(page.getByText(/workout complete/i)).toBeVisible({ timeout: 10000 });
  });

  test('stretching disabled but meditation enabled shows meditation', async ({ page }) => {
    await setupCalibratedUser(page, { autoShowStretching: false });
    await completeWorkout(page);

    // Should go directly to meditation (skipping stretching)
    await expect(page.locator('h1').filter({ hasText: /meditation/i })).toBeVisible({ timeout: 10000 });
  });

  test('meditation shows progressive session numbers', async ({ page }) => {
    // Start with 4 completions
    await setupCalibratedUser(page, {
      meditationState: { completionCount: 4, currentDurationSeconds: 60 },
    });
    await completeWorkout(page);

    // Skip stretching
    page.on('dialog', dialog => dialog.accept());
    await page.getByText(/skip all/i).click();

    // Should show session #5
    await expect(page.getByText(/session #5/i)).toBeVisible();
  });

  test('meditation shows increased duration after milestone', async ({ page }) => {
    // Start with 5 completions (should be at 2 minutes now)
    await setupCalibratedUser(page, {
      meditationState: { completionCount: 5, currentDurationSeconds: 120 },
    });
    await completeWorkout(page);

    // Skip stretching
    page.on('dialog', dialog => dialog.accept());
    await page.getByText(/skip all/i).click();

    // Should show 2 minutes duration
    await expect(page.getByText(/2 minutes/i)).toBeVisible();
    await expect(page.getByText(/session #6/i)).toBeVisible();
  });

  test('meditation timer shows tips and has skip button', async ({ page }) => {
    await setupCalibratedUser(page);
    await completeWorkout(page);

    // Skip stretching
    page.on('dialog', dialog => dialog.accept());
    await page.getByText(/skip all/i).click();

    // Should show meditation tips
    await expect(page.getByText(/meditation tips/i)).toBeVisible();
    await expect(page.getByText(/find a comfortable seated position/i)).toBeVisible();

    // Should have Skip button in header
    await expect(page.locator('button:has-text("Skip")').first()).toBeVisible();
  });

  test('Settings page has meditation toggle', async ({ page }) => {
    await setupCalibratedUser(page);

    // Navigate to settings
    await page.goto('/settings');

    // Should see meditation checkbox
    await expect(page.getByText(/post-workout meditation/i)).toBeVisible();

    // Check that checkbox is checked by default
    const meditationCheckbox = page.locator('input[type="checkbox"]').nth(1); // Second checkbox (first is stretching)
    await expect(meditationCheckbox).toBeChecked();

    // Uncheck it
    await meditationCheckbox.uncheck();

    // Reload and verify it persisted
    await page.reload();
    await expect(page.locator('input[type="checkbox"]').nth(1)).not.toBeChecked();
  });

  test('direct URL access to /meditation redirects to home', async ({ page }) => {
    await setupCalibratedUser(page);

    // Navigate directly to meditation without completion state
    await page.goto('/meditation');

    // Should redirect to home
    await expect(page).toHaveURL('/');
  });

  test('meditation shows milestone message at count divisible by 5', async ({ page }) => {
    // Start with 4 completions (next one will be 5th, a milestone)
    await setupCalibratedUser(page, {
      meditationState: { completionCount: 4, currentDurationSeconds: 60 },
    });
    await completeWorkout(page);

    // Skip stretching
    page.on('dialog', dialog => dialog.accept());
    await page.getByText(/skip all/i).click();

    // Should show milestone message
    await expect(page.getByText(/next session your meditation time will increase/i)).toBeVisible();
  });

  test('meditation shows cap reached message at 30 completions', async ({ page }) => {
    // Start with 29 completions
    await setupCalibratedUser(page, {
      meditationState: { completionCount: 29, currentDurationSeconds: 600 },
    });
    await completeWorkout(page);

    // Skip stretching
    page.on('dialog', dialog => dialog.accept());
    await page.getByText(/skip all/i).click();

    // Should show cap reached message
    await expect(page.getByText(/you've reached the maximum meditation duration/i)).toBeVisible();
  });
});
