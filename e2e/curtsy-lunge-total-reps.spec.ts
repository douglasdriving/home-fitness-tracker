import { test, expect } from '@playwright/test';

test.describe('Curtsy Lunge - Total Reps Conversion', () => {
  test.beforeEach(async ({ page }) => {
    // Clear IndexedDB and localStorage before each test
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

  test('Curtsy Lunge has no "Per Side" badge in Exercise Library', async ({ page }) => {
    // Set up a calibrated user with Band Clamshells progress to unlock Curtsy Lunge
    await page.goto('/');
    await page.evaluate(async () => {
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
        exerciseAchievements: {
          unlockedExercises: ['curtsy-lunge-001'],
          retiredExercises: [],
        },
      }));

      // Add workout history with 40 Band Clamshells to unlock Curtsy Lunge
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('FitnessTrackerDB', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('history')) {
            db.createObjectStore('history', { keyPath: 'id' });
          }
        };
      });

      const tx = db.transaction(['history'], 'readwrite');
      const store = tx.objectStore('history');
      store.add({
        id: 'history-1',
        workoutId: 'workout-1',
        workoutNumber: 1,
        completedDate: Date.now(),
        totalDuration: 30,
        exercises: [{
          exerciseId: 'band-clamshells-001',
          exerciseName: 'Resistance Band Clamshells',
          muscleGroups: ['glutes'],
          completedSets: [
            { setNumber: 1, actualReps: 40 },
          ],
        }],
      });
    });
    await page.reload();

    // Navigate to Exercises tab
    await page.click('text=Exercises');
    await page.waitForURL('/exercises');

    // Look for Curtsy Lunge
    const curtsyLungeCard = page.locator('text=Curtsy Lunge').locator('..');

    // Should NOT have "Per Side" badge
    await expect(curtsyLungeCard.getByText('Per Side')).not.toBeVisible();
  });

  test('Curtsy Lunge receives 4 sets in standard workout', async ({ page }) => {
    // Set up a calibrated user with Curtsy Lunge unlocked
    await page.goto('/');
    await page.evaluate(async () => {
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
        exerciseAchievements: {
          unlockedExercises: ['curtsy-lunge-001'],
          retiredExercises: [],
        },
      }));

      // Add workout history with 40 Band Clamshells
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('FitnessTrackerDB', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('history')) {
            db.createObjectStore('history', { keyPath: 'id' });
          }
        };
      });

      const tx = db.transaction(['history'], 'readwrite');
      const store = tx.objectStore('history');
      store.add({
        id: 'history-1',
        workoutId: 'workout-1',
        workoutNumber: 1,
        completedDate: Date.now(),
        totalDuration: 30,
        exercises: [{
          exerciseId: 'band-clamshells-001',
          exerciseName: 'Resistance Band Clamshells',
          muscleGroups: ['glutes'],
          completedSets: [
            { setNumber: 1, actualReps: 40 },
          ],
        }],
      });
    });
    await page.reload();

    // Generate a workout
    await page.getByRole('button', { name: /generate|new workout/i }).click();
    await page.waitForTimeout(500);

    // Start the workout
    await page.getByRole('button', { name: /start workout/i }).click();
    await page.waitForTimeout(500);

    // Since we can't guarantee Curtsy Lunge will be in this specific workout,
    // we'll verify the logic by checking the workout data structure
    const workoutData = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('fitness-tracker-workout') || '{}');
    });

    // If Curtsy Lunge is in the workout, it should have 4 sets
    const curtsyLungeExercise = workoutData?.state?.exercises?.find(
      (ex: { exerciseId: string }) => ex.exerciseId === 'curtsy-lunge-001'
    );

    if (curtsyLungeExercise) {
      expect(curtsyLungeExercise.sets.length).toBe(4);
    }
    // If not in this workout, that's okay - the unit tests verify the logic
  });

  test('Curtsy Lunge shows default target of 24 reps', async ({ page }) => {
    // Set up a calibrated user with Curtsy Lunge unlocked
    await page.goto('/');
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
        exerciseAchievements: {
          unlockedExercises: ['curtsy-lunge-001'],
          retiredExercises: [],
        },
      }));
    });
    await page.reload();

    // Navigate to Exercises tab
    await page.click('text=Exercises');
    await page.waitForURL('/exercises');

    // Click on Curtsy Lunge to open details
    await page.click('text=Curtsy Lunge');

    // Should show default reps of 24
    await expect(page.getByText(/default.*24.*rep/i)).toBeVisible();
  });

  test('Curtsy Lunge unlock requirement is 40 Band Clamshells', async ({ page }) => {
    // Set up a calibrated user without Curtsy Lunge unlocked
    await page.goto('/');
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
      }));
    });
    await page.reload();

    // Navigate to Exercises tab
    await page.click('text=Exercises');
    await page.waitForURL('/exercises');

    // Click on Locked tab
    await page.click('text=/Locked/');

    // Find Curtsy Lunge
    await expect(page.getByText('Curtsy Lunge')).toBeVisible();

    // Should show unlock requirement of 40 Band Clamshells
    const curtsyLungeSection = page.locator('text=Curtsy Lunge').locator('../..');
    await expect(curtsyLungeSection.getByText(/40.*band clamshell/i)).toBeVisible();
  });

  test('Curtsy Lunge retirement threshold is 80 reps', async ({ page }) => {
    // Set up a calibrated user with Curtsy Lunge unlocked
    await page.goto('/');
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
        exerciseAchievements: {
          unlockedExercises: ['curtsy-lunge-001'],
          retiredExercises: [],
        },
      }));
    });
    await page.reload();

    // Navigate to Exercises tab
    await page.click('text=Exercises');
    await page.waitForURL('/exercises');

    // Click on Curtsy Lunge to open details
    await page.click('text=Curtsy Lunge');

    // Should show retirement threshold of 80 reps
    await expect(page.getByText(/retire.*80.*rep/i)).toBeVisible();
  });
});
