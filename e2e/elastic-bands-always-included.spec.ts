import { test, expect } from '@playwright/test';

// Issue #36: the elastic-bands equipment setting was removed. Band exercises are
// now always available regardless of any profile flag, and the Settings
// "Equipment" section is gone.
test.describe('Elastic bands always included', () => {
  // A calibrated user with NO equipment field at all — the pre-#36 gate would
  // have locked band exercises for this profile.
  const seedProfile = () => {
    localStorage.setItem('fitness-tracker-user-profile', JSON.stringify({
      userId: 'test-user',
      createdDate: Date.now(),
      calibrationCompleted: true,
      strengthLevels: {
        abs: 30,
        glutes: 30,
        lowerBack: 30,
        upperBody: 30,
        lastUpdated: Date.now(),
      },
      exerciseAchievements: {
        unlockedExercises: [],
        retiredExercises: [],
      },
    }));
  };

  test('band exercise with no unlock requirement is Active (not gated by equipment)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(seedProfile);
    await page.reload();

    // Exercise status page, Active tab (default)
    await page.goto('/exercises');
    await page.waitForLoadState('networkidle');

    // Resistance Band Clamshells has no unlock requirement, so it is Active now
    // that the equipment gate is removed.
    await expect(page.getByText('Resistance Band Clamshells')).toBeVisible();

    // The old "Requires resistance band" hint must be gone entirely.
    await expect(page.getByText(/Requires resistance band/i)).not.toBeVisible();
  });

  test('Settings no longer shows the Equipment section', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(seedProfile);
    await page.reload();

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Elastic Loop Bands')).not.toBeVisible();
  });
});
