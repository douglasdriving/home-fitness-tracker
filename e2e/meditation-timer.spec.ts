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
  });

  test('meditation timer shows countdown with progress bar', async ({ page }) => {
    await setupCalibratedUser(page);
    await completeWorkout(page);

    // Skip stretching to get to meditation
    page.on('dialog', dialog => dialog.accept());
    await page.getByText(/skip all/i).click();

    // Should show the timer with countdown display (1:00 for 60 seconds)
    await expect(page.getByText('1:00')).toBeVisible();

    // Should have a Start button (countdown timer, not auto-started)
    await expect(page.getByRole('button', { name: /start/i })).toBeVisible();
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

  test('meditation has skip button in header', async ({ page }) => {
    await setupCalibratedUser(page);
    await completeWorkout(page);

    // Skip stretching
    page.on('dialog', dialog => dialog.accept());
    await page.getByText(/skip all/i).click();

    // Should have Skip button in header
    await expect(page.locator('button:has-text("Skip")').first()).toBeVisible();
  });

  test('completing meditation lands on workout complete after the bell delay and increments count', async ({ page }) => {
    // Use a short meditation duration so the countdown finishes quickly.
    await setupCalibratedUser(page, {
      meditationState: { completionCount: 0, currentDurationSeconds: 2 },
    });
    await completeWorkout(page);

    // Skip stretching to reach meditation
    page.on('dialog', dialog => dialog.accept());
    await page.getByText(/skip all/i).click();

    // On the meditation page
    await expect(page.locator('h1').filter({ hasText: /meditation/i })).toBeVisible({ timeout: 10000 });

    // Start the (2s) countdown
    await page.getByRole('button', { name: /start/i }).click();

    // The timer should reach completion before navigating away. After the
    // ~1s post-completion delay the screen transitions to workout complete.
    await expect(page.getByText(/workout complete/i)).toBeVisible({ timeout: 10000 });

    // Completing (not skipping) increments the meditation completion count.
    const profile = await page.evaluate(() => {
      const data = localStorage.getItem('fitness-tracker-user-profile');
      return data ? JSON.parse(data) : null;
    });
    expect(profile.meditationState?.completionCount).toBe(1);
  });

  test('direct URL access to /meditation redirects to home', async ({ page }) => {
    await setupCalibratedUser(page);

    // Navigate directly to meditation without completion state
    await page.goto('/meditation');

    // Should redirect to home
    await expect(page).toHaveURL('/');
  });
});
