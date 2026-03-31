import { test, expect } from '@playwright/test';

test.describe('Diet Tips Feature Removed', () => {
  test.beforeEach(async ({ page }) => {
    // Clean state
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('FitnessTrackerDB');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    });
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('dashboard should not show post-workout nutrition card after completing a workout', async ({ page }) => {
    // Set up a calibrated user profile
    await page.evaluate(() => {
      localStorage.setItem('fitness-user-profile', JSON.stringify({
        state: {
          profile: {
            userId: 'test-user',
            createdAt: Date.now() - 86400000,
            calibrationCompleted: true,
            strengthLevels: { abs: 30, glutes: 30, lowerBack: 30 },
            equipment: [],
            preferences: { workoutDuration: 15, excludedExercises: [] },
          },
          isLoading: false,
        },
        version: 0,
      }));
    });

    // Add a completed workout to history (today)
    await page.evaluate(() => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('FitnessTrackerDB');
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('history')) {
            db.createObjectStore('history', { keyPath: 'id' });
          }
        };
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('history')) {
            db.close();
            resolve();
            return;
          }
          const tx = db.transaction(['history'], 'readwrite');
          const store = tx.objectStore('history');
          store.add({
            id: 'test-workout-today',
            completedDate: Date.now(),
            workoutNumber: 1,
            duration: 600,
            exercises: [
              {
                exerciseId: 'crunches',
                exerciseName: 'Crunches',
                muscleGroups: ['abs'],
                sets: [{ targetReps: 15, achievedReps: 15 }],
              },
            ],
          });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
      });
    });

    // Navigate to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The post-workout nutrition card should NOT be visible
    await expect(page.getByText('Post-Workout Nutrition')).not.toBeVisible();
    await expect(page.getByText('View Diet Tips')).not.toBeVisible();

    // The DietTipsModal content should not be present
    await expect(page.getByText('Fuel your fitness journey')).not.toBeVisible();
  });

  test('dashboard should not contain any diet tips references', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // No diet-related UI should exist on the dashboard
    await expect(page.getByText('Post-Workout Nutrition')).not.toBeVisible();
    await expect(page.getByText('View Diet Tips')).not.toBeVisible();
  });
});
