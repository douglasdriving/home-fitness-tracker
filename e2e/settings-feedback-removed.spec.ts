import { test, expect } from '@playwright/test';

test.describe('Settings Page - Feedback Section Removed', () => {
  test('settings page should not have feedback and bug reports section', async ({ page }) => {
    // Navigate to settings page
    await page.goto('/settings');

    // Verify we're on the settings page by checking for known sections
    await expect(page.getByText('Equipment')).toBeVisible();
    await expect(page.getByText('Backup & Restore')).toBeVisible();
    await expect(page.getByText('Danger Zone')).toBeVisible();

    // Verify the feedback section is NOT present
    await expect(page.getByText('Feedback & Bug Reports')).not.toBeVisible();
    await expect(page.getByRole('button', { name: /submit feedback/i })).not.toBeVisible();
  });

  test('settings page should not have feedback form modal', async ({ page }) => {
    await page.goto('/settings');

    // The feedback form text should not be anywhere on the page
    await expect(page.getByText(/found a bug or have a suggestion/i)).not.toBeVisible();
  });
});
