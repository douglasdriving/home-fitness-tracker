import { test, expect } from '@playwright/test';

test.describe('Week-Based Streak System', () => {
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

  test('user with no workouts shows 0 weeks streak', async ({ page }) => {
    await page.goto('/');

    // Set up calibrated user (streak only shows after calibration)
    await page.evaluate(() => {
      localStorage.setItem('fitness-user-profile', JSON.stringify({
        userId: 'test-user',
        createdDate: Date.now(),
        calibrationCompleted: true,
        strengthLevels: {
          abs: 30,
          glutes: 30,
          lowerBack: 30,
          lastUpdated: Date.now(),
        },
      }));
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should see 0 weeks streak
    await expect(page.getByText(/0/)).toBeVisible();
    await expect(page.getByText(/weeks? streak/)).toBeVisible();

    // Should see "Start your first workout!" message
    await expect(page.getByText(/Start your first workout/i)).toBeVisible();
  });

  test('user who worked out this week shows 1 week streak with checkmark', async ({ page }) => {
    await page.goto('/');

    // Set up calibrated user
    await page.evaluate(() => {
      localStorage.setItem('fitness-user-profile', JSON.stringify({
        userId: 'test-user',
        createdDate: Date.now(),
        calibrationCompleted: true,
        strengthLevels: {
          abs: 30,
          glutes: 30,
          lowerBack: 30,
          lastUpdated: Date.now(),
        },
      }));
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Add a workout from today using the app's DB (Dexie)
    await page.evaluate(() => {
      return new Promise<void>((resolve, reject) => {
        // Open the database without specifying version to get current version
        const request = indexedDB.open('FitnessTrackerDB');

        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['history'], 'readwrite');
          const store = transaction.objectStore('history');

          // Add workout from today
          store.add({
            id: 'test-workout-1',
            workoutId: 'workout-1',
            workoutNumber: 1,
            completedDate: Date.now(),
            totalDuration: 25,
            exercises: [],
          });

          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };

        request.onerror = () => reject(request.error);
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should see 1 week streak
    await expect(page.getByText(/1/).first()).toBeVisible();
    await expect(page.getByText(/week streak/)).toBeVisible();

    // Should see checkmark indicating worked out this week
    await expect(page.locator('text=✓')).toBeVisible();

    // Should see "Worked out this week!" message
    await expect(page.getByText(/Worked out this week/i)).toBeVisible();
  });

  test('user with 2 consecutive weeks shows 2 week streak', async ({ page }) => {
    await page.goto('/');

    // Set up calibrated user
    await page.evaluate(() => {
      localStorage.setItem('fitness-user-profile', JSON.stringify({
        userId: 'test-user',
        createdDate: Date.now(),
        calibrationCompleted: true,
        strengthLevels: {
          abs: 30,
          glutes: 30,
          lowerBack: 30,
          lastUpdated: Date.now(),
        },
      }));
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Add workouts from this week and last week
    await page.evaluate(() => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('FitnessTrackerDB');

        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['history'], 'readwrite');
          const store = transaction.objectStore('history');

          const now = Date.now();
          const oneWeek = 7 * 24 * 60 * 60 * 1000;

          // Add workout from today
          store.add({
            id: 'test-workout-1',
            workoutId: 'workout-1',
            workoutNumber: 1,
            completedDate: now,
            totalDuration: 25,
            exercises: [],
          });

          // Add workout from last week
          store.add({
            id: 'test-workout-2',
            workoutId: 'workout-2',
            workoutNumber: 2,
            completedDate: now - oneWeek,
            totalDuration: 25,
            exercises: [],
          });

          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };

        request.onerror = () => reject(request.error);
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should see 2 weeks streak
    await expect(page.getByText(/2/).first()).toBeVisible();
    await expect(page.getByText(/weeks streak/)).toBeVisible();
  });

  test('user with broken streak shows 0 and "Start a new streak"', async ({ page }) => {
    await page.goto('/');

    // Set up calibrated user
    await page.evaluate(() => {
      localStorage.setItem('fitness-user-profile', JSON.stringify({
        userId: 'test-user',
        createdDate: Date.now(),
        calibrationCompleted: true,
        strengthLevels: {
          abs: 30,
          glutes: 30,
          lowerBack: 30,
          lastUpdated: Date.now(),
        },
      }));
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Add workout from 3 weeks ago (broken streak - missed last 2 weeks)
    await page.evaluate(() => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('FitnessTrackerDB');

        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['history'], 'readwrite');
          const store = transaction.objectStore('history');

          const now = Date.now();
          const threeWeeks = 3 * 7 * 24 * 60 * 60 * 1000;

          // Add workout from 3 weeks ago
          store.add({
            id: 'test-workout-1',
            workoutId: 'workout-1',
            workoutNumber: 1,
            completedDate: now - threeWeeks,
            totalDuration: 25,
            exercises: [],
          });

          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };

        request.onerror = () => reject(request.error);
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should see 0 streak (streak is broken)
    await expect(page.getByText(/0/).first()).toBeVisible();
    await expect(page.getByText(/weeks streak/)).toBeVisible();

    // Should see "Start a new streak!" message
    await expect(page.getByText(/Start a new streak/i)).toBeVisible();
  });

  test('streak at risk shows warning when worked out last week but not this week', async ({ page }) => {
    await page.goto('/');

    // Set up calibrated user
    await page.evaluate(() => {
      localStorage.setItem('fitness-user-profile', JSON.stringify({
        userId: 'test-user',
        createdDate: Date.now(),
        calibrationCompleted: true,
        strengthLevels: {
          abs: 30,
          glutes: 30,
          lowerBack: 30,
          lastUpdated: Date.now(),
        },
      }));
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Add workout from last week only
    await page.evaluate(() => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('FitnessTrackerDB');

        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['history'], 'readwrite');
          const store = transaction.objectStore('history');

          const now = Date.now();
          const oneWeek = 7 * 24 * 60 * 60 * 1000;

          // Add workout from last week
          store.add({
            id: 'test-workout-1',
            workoutId: 'workout-1',
            workoutNumber: 1,
            completedDate: now - oneWeek,
            totalDuration: 25,
            exercises: [],
          });

          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };

        request.onerror = () => reject(request.error);
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should see 1 week streak (still counting last week)
    await expect(page.getByText(/1/).first()).toBeVisible();
    await expect(page.getByText(/week streak/)).toBeVisible();

    // Should NOT see checkmark (haven't worked out this week)
    await expect(page.locator('text=✓')).not.toBeVisible();

    // Should see "Work out this week to keep your streak!" message
    await expect(page.getByText(/Work out this week to keep your streak/i)).toBeVisible();
  });

  test('workout frequency setting is removed from Settings page', async ({ page }) => {
    await page.goto('/');

    // Set up calibrated user
    await page.evaluate(() => {
      localStorage.setItem('fitness-user-profile', JSON.stringify({
        userId: 'test-user',
        createdDate: Date.now(),
        calibrationCompleted: true,
        strengthLevels: {
          abs: 30,
          glutes: 30,
          lowerBack: 30,
          lastUpdated: Date.now(),
        },
      }));
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Navigate to settings
    await page.click('a[href="/settings"]');
    await page.waitForLoadState('networkidle');

    // Should NOT see workout frequency setting
    await expect(page.getByText('Workout Frequency')).not.toBeVisible();
    await expect(page.getByText(/Work out every\.\.\./i)).not.toBeVisible();

    // Other settings should still be visible
    await expect(page.getByText('Backup & Restore')).toBeVisible();
  });

  test('best streak is shown when higher than current streak', async ({ page }) => {
    await page.goto('/');

    // Set up calibrated user
    await page.evaluate(() => {
      localStorage.setItem('fitness-user-profile', JSON.stringify({
        userId: 'test-user',
        createdDate: Date.now(),
        calibrationCompleted: true,
        strengthLevels: {
          abs: 30,
          glutes: 30,
          lowerBack: 30,
          lastUpdated: Date.now(),
        },
      }));
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Add workouts: 3 consecutive weeks in the past, then a gap, then 1 week now
    await page.evaluate(() => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('FitnessTrackerDB');

        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['history'], 'readwrite');
          const store = transaction.objectStore('history');

          const now = Date.now();
          const oneWeek = 7 * 24 * 60 * 60 * 1000;

          // Add workout from today (current week)
          store.add({
            id: 'test-workout-1',
            workoutId: 'workout-1',
            workoutNumber: 1,
            completedDate: now,
            totalDuration: 25,
            exercises: [],
          });

          // Add 3 consecutive weeks from 6, 7, 8 weeks ago
          store.add({
            id: 'test-workout-2',
            workoutId: 'workout-2',
            workoutNumber: 2,
            completedDate: now - (6 * oneWeek),
            totalDuration: 25,
            exercises: [],
          });

          store.add({
            id: 'test-workout-3',
            workoutId: 'workout-3',
            workoutNumber: 3,
            completedDate: now - (7 * oneWeek),
            totalDuration: 25,
            exercises: [],
          });

          store.add({
            id: 'test-workout-4',
            workoutId: 'workout-4',
            workoutNumber: 4,
            completedDate: now - (8 * oneWeek),
            totalDuration: 25,
            exercises: [],
          });

          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };

        request.onerror = () => reject(request.error);
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should see current streak of 1
    await expect(page.getByText(/1/).first()).toBeVisible();
    await expect(page.getByText(/week streak/)).toBeVisible();

    // Should see best streak of 3
    await expect(page.getByText(/3/)).toBeVisible();
    await expect(page.getByText(/best/i)).toBeVisible();
  });
});
