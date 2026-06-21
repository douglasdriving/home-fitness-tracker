import { test, expect } from '@playwright/test';

// Issue #26: upper body exercises were added to the exercise library as the
// data foundation for the upcoming Upper Body rotation day. This verifies the
// new exercises and the Upper Body filter render in the Exercise Library.
test.describe('Upper Body Exercises', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear IndexedDB
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('FitnessTrackerDB');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    });
    await page.evaluate(() => localStorage.clear());
    // Seed a calibrated profile so the app skips onboarding and shows the nav
    await page.evaluate(() => {
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
      }));
    });
    await page.reload();
  });

  test('Upper Body filter shows all 11 new exercises', async ({ page }) => {
    await page.click('text=Exercises');
    await page.waitForURL('/exercises');

    // Activate the Upper Body filter chip
    await page.getByRole('button', { name: 'Upper Body', exact: true }).click();

    // Exactly the 11 upper body exercises should be listed
    await expect(page.getByText(/11 exercises found/)).toBeVisible();

    // Spot-check one uniquely-named exercise from each of the four slots
    await expect(page.getByRole('heading', { name: /Doorway Rows/ })).toBeVisible(); // horizontal-pull
    await expect(page.getByRole('heading', { name: /Chair Dips/ })).toBeVisible();   // horizontal-push
    await expect(page.getByRole('heading', { name: /Band Lat Pulldown/ })).toBeVisible(); // vertical-pull
    await expect(page.getByRole('heading', { name: /Pike Push-Ups/ })).toBeVisible(); // vertical-push
  });

  test('starter upper body exercises appear under the All filter', async ({ page }) => {
    await page.click('text=Exercises');
    await page.waitForURL('/exercises');

    // Default filter is "All" — the no-unlock starters must be present
    const incline = page.locator('.bg-background-light:has-text("Incline Push-Ups")');
    await expect(incline).toBeVisible();
    await expect(incline).toContainText(/upperBody/i);
  });
});
