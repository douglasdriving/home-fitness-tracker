import { test, expect } from '@playwright/test';

test.describe('History page - intensity score removed', () => {
  test.beforeEach(async ({ page }) => {
    // Clean state
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

  test('workout cards on History page do not show intensity score', async ({ page }) => {
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

    // Add a completed workout with an intensity score to IndexedDB
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
            id: 'test-workout-1',
            workoutId: 'w1',
            completedDate: Date.now(),
            workoutNumber: 1,
            totalDuration: 20,
            intensityScore: 72,
            exercises: [
              {
                exerciseId: 'crunches',
                exerciseName: 'Crunches',
                muscleGroups: ['abs'],
                completedSets: [
                  { setNumber: 1, actualReps: 15 },
                  { setNumber: 2, actualReps: 14 },
                ],
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

    // Navigate to History page
    await page.goto('/history');
    await page.waitForLoadState('networkidle');

    // The workout card should be visible
    await expect(page.getByText('Workout #1')).toBeVisible();

    // Duration should still be displayed
    await expect(page.getByText('20')).toBeVisible();
    await expect(page.getByText('minutes')).toBeVisible();

    // Exercise count and set count should still be displayed
    await expect(page.getByText('1 exercises')).toBeVisible();
    await expect(page.getByText('2 sets')).toBeVisible();

    // The intensity score should NOT be displayed
    await expect(page.getByText('72')).not.toBeVisible();
    await expect(page.getByText('intensity')).not.toBeVisible();
  });
});
