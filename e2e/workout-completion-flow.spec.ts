import { test, expect } from '@playwright/test';

test.describe('Workout Completion Flow', () => {
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
      const isComplete = await page.getByText(/workout complete/i).isVisible({ timeout: 500 }).catch(() => false);
      if (isStretching || isComplete) break;

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

  test('completing a workout navigates to stretching first, then workout complete', async ({ page }) => {
    await setupCalibratedUser(page);
    await completeWorkout(page);

    // Should be on the stretching page after workout completion
    await expect(page.getByText(/stretching/i)).toBeVisible({ timeout: 10000 });

    // Should see Skip All button on stretching page
    await expect(page.getByText(/skip all/i)).toBeVisible();

    // Skip stretching to get to workout complete
    // Use page.on('dialog') to auto-accept the confirm dialog
    page.on('dialog', dialog => dialog.accept());
    await page.getByText(/skip all/i).click();

    // Should now be on workout complete page
    await expect(page.getByText(/workout complete/i)).toBeVisible({ timeout: 10000 });
  });

  test('workout complete page shows exercise performance, not aggregate stats', async ({ page }) => {
    await setupCalibratedUser(page);
    await completeWorkout(page);

    // Skip stretching
    page.on('dialog', dialog => dialog.accept());
    await page.getByText(/skip all/i).click();

    // Should see workout complete
    await expect(page.getByText(/workout complete/i)).toBeVisible({ timeout: 10000 });

    // Should show "Exercise Performance" section
    await expect(page.getByText(/exercise performance/i)).toBeVisible();

    // First workout ever - should show "first time completing this exercise" for exercises
    await expect(page.getByText(/first time completing this exercise/i).first()).toBeVisible();

    // Should NOT show old aggregate stats
    await expect(page.getByText('total reps')).not.toBeVisible();
    await expect(page.getByText('time under tension')).not.toBeVisible();

    // Should show a Done button
    await expect(page.getByRole('button', { name: /done/i })).toBeVisible();
  });

  test('Done button on workout complete navigates to dashboard', async ({ page }) => {
    await setupCalibratedUser(page);
    await completeWorkout(page);

    // Skip stretching
    page.on('dialog', dialog => dialog.accept());
    await page.getByText(/skip all/i).click();

    // Wait for workout complete
    await expect(page.getByText(/workout complete/i)).toBeVisible({ timeout: 10000 });

    // Click Done
    await page.getByRole('button', { name: /done/i }).click();

    // Should be back on dashboard
    await expect(page).toHaveURL('/');
  });

  test('workout complete with stretching disabled skips stretching page', async ({ page }) => {
    // Setup user with stretching disabled
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
        preferences: { autoShowStretching: false },
      }));
    });
    await page.reload();

    await completeWorkout(page);

    // Should go directly to workout complete (no stretching page)
    await expect(page.getByText(/workout complete/i)).toBeVisible({ timeout: 10000 });

    // Should show exercise performance
    await expect(page.getByText(/exercise performance/i)).toBeVisible();
  });

  test('milestones route redirects to home (removed page)', async ({ page }) => {
    await setupCalibratedUser(page);

    // Navigate directly to /milestones
    await page.goto('/milestones');

    // Should redirect to home since the route no longer exists
    await page.waitForTimeout(1000);
    // The page should not show "Milestones" heading
    await expect(page.locator('h1:has-text("Milestones")')).not.toBeVisible();
  });
});
