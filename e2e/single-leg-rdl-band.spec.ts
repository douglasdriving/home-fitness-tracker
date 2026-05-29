import { test, expect } from '@playwright/test';

test.describe('Single-Leg RDL Resistance Band', () => {
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

  test('displays Band badge in Exercise Library', async ({ page }) => {
    // Set up a calibrated user with unlocked Single-Leg RDL
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
          unlockedExercises: ['single-leg-rdl-001'],
          retiredExercises: [],
        },
      }));
    });
    await page.reload();

    // Navigate to Exercises page
    await page.click('text=Exercises');
    await page.waitForURL('/exercises');

    // Search for Single-Leg RDL or scroll to find it
    const singleLegRDLCard = page.locator('.bg-background-light:has-text("Single-Leg Romanian Deadlift")');
    await expect(singleLegRDLCard).toBeVisible();

    // Verify Band badge is present
    const bandBadge = singleLegRDLCard.locator('text=Band');
    await expect(bandBadge).toBeVisible();

    // Verify Per Side badge is also present
    const perSideBadge = singleLegRDLCard.locator('text=Per Side');
    await expect(perSideBadge).toBeVisible();
  });

  test('displays equipment input field during workout execution', async ({ page }) => {
    // Set up a user with high glute strength to unlock Single-Leg RDL
    await page.goto('/');
    await page.evaluate(async () => {
      localStorage.setItem('fitness-tracker-user-profile', JSON.stringify({
        userId: 'test-user',
        createdDate: Date.now(),
        calibrationCompleted: true,
        strengthLevels: {
          abs: 30,
          glutes: 60, // High glute strength to ensure Single-Leg RDL is unlocked
          lowerBack: 30,
          lastUpdated: Date.now(),
        },
        exerciseAchievements: {
          unlockedExercises: ['single-leg-rdl-001'],
          retiredExercises: [],
        },
      }));

      // Add workout history to unlock Single-Leg RDL (needs 25 Band Lateral Walk)
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
          exerciseId: 'band-lateral-walk-001',
          exerciseName: 'Resistance Band Lateral Walk',
          muscleGroups: ['glutes'],
          completedSets: [{ setNumber: 1, actualReps: 25 }],
        }],
      });
    });
    await page.reload();

    // Generate a workout that will include Single-Leg RDL
    // We'll need to generate multiple workouts until we get one with Single-Leg RDL
    let foundSingleLegRDL = false;
    let attempts = 0;
    const maxAttempts = 20;

    while (!foundSingleLegRDL && attempts < maxAttempts) {
      await page.getByRole('button', { name: /generate|new workout/i }).click();
      await page.waitForTimeout(500);

      // Check if Single-Leg RDL is in the workout preview
      const workoutPreview = await page.locator('.bg-background-light').allTextContents();
      foundSingleLegRDL = workoutPreview.some(text => text.includes('Single-Leg Romanian Deadlift'));

      if (!foundSingleLegRDL) {
        // Discard this workout and try again
        await page.evaluate(() => {
          localStorage.removeItem('fitness-tracker-current-workout');
        });
        await page.reload();
        attempts++;
      }
    }

    // Skip test if we couldn't generate a workout with Single-Leg RDL
    test.skip(!foundSingleLegRDL, 'Could not generate workout with Single-Leg RDL');

    // Start the workout
    await page.getByRole('button', { name: /start workout/i }).click();
    await page.waitForTimeout(500);

    // Navigate through exercises until we find Single-Leg RDL
    let currentExercise = await page.locator('h2').first().textContent();
    const maxNavigation = 10;
    let navigationAttempts = 0;

    while (currentExercise !== 'Single-Leg Romanian Deadlift' && navigationAttempts < maxNavigation) {
      // Complete the current exercise to move to the next
      await page.getByRole('button', { name: /set complete|next set/i }).click();
      await page.waitForTimeout(300);
      currentExercise = await page.locator('h2').first().textContent();
      navigationAttempts++;
    }

    // Verify we're on Single-Leg RDL
    await expect(page.locator('h2:has-text("Single-Leg Romanian Deadlift")')).toBeVisible();

    // Verify the equipment input field is present
    const equipmentLabel = page.getByText('Equipment used');
    await expect(equipmentLabel).toBeVisible();

    // Verify there's a text input for equipment
    const equipmentInput = page.locator('input[type="text"]').filter({ hasText: '' });
    await expect(equipmentInput.first()).toBeVisible();
  });

  test('updated description mentions band setup', async ({ page }) => {
    // Set up a calibrated user with unlocked Single-Leg RDL
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
          unlockedExercises: ['single-leg-rdl-001'],
          retiredExercises: [],
        },
      }));
    });
    await page.reload();

    // Navigate to Exercises page
    await page.click('text=Exercises');
    await page.waitForURL('/exercises');

    // Find and click on Single-Leg RDL to expand details
    const singleLegRDLCard = page.locator('.bg-background-light:has-text("Single-Leg Romanian Deadlift")');
    await expect(singleLegRDLCard).toBeVisible();

    // The description should be visible in the card
    // Check for key terms from the new description
    await expect(singleLegRDLCard).toContainText(/resistance.*band|band/i);
    await expect(singleLegRDLCard).toContainText(/foot/i);
  });
});
