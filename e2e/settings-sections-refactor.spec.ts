import { test, expect } from '@playwright/test';

// Issue #37: Settings.tsx was split into single-responsibility section
// components. This guards that the refactor preserved the rendered sections
// and their core interactions (no behavior change).
test.describe('Settings Page - Section Components', () => {
  test('renders the persistent Backup & Restore and Danger Zone sections', async ({ page }) => {
    await page.goto('/settings');

    // Backup & Restore section (BackupRestoreSection)
    await expect(page.getByText('Backup & Restore')).toBeVisible();
    await expect(page.getByRole('button', { name: /export data/i })).toBeVisible();
    await expect(page.getByText('Import Data')).toBeVisible();

    // Danger Zone section (DangerZoneSection)
    await expect(page.getByText('Danger Zone')).toBeVisible();
    await expect(page.getByRole('button', { name: /reset fitness levels/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /clear all data/i })).toBeVisible();
  });

  test('Reset Fitness Levels prompts for confirmation before acting', async ({ page }) => {
    await page.goto('/settings');

    // Dismiss the confirm dialog → no navigation should occur
    let dialogSeen = false;
    page.once('dialog', async (dialog) => {
      dialogSeen = true;
      expect(dialog.type()).toBe('confirm');
      await dialog.dismiss();
    });

    await page.getByRole('button', { name: /reset fitness levels/i }).click();

    // The confirmation dialog fired and we stayed on the settings page
    expect(dialogSeen).toBe(true);
    await expect(page.getByText('Danger Zone')).toBeVisible();
  });
});
