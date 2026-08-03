import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store/user-store';
import { db } from '../../db/db';
import { saveUserProfile } from '../../utils/userProfile';
import Button from '../common/Button';

/**
 * Destructive account actions: reset strength levels back to the default
 * starting point, or permanently clear all stored data.
 */
export default function DangerZoneSection() {
  const navigate = useNavigate();
  const { profile, initializeUser } = useUserStore();

  const handleResetFitnessLevels = () => {
    if (
      !confirm(
        'This will reset your strength levels to the default starting point. The app will re-adapt to your fitness level based on your next workouts. Continue?'
      )
    ) {
      return;
    }

    if (profile) {
      const DEFAULT_STRENGTH_LEVEL = 25;
      const updatedProfile: typeof profile = {
        ...profile,
        calibrationCompleted: true,
        calibrationData: undefined,
        strengthLevels: {
          abs: DEFAULT_STRENGTH_LEVEL,
          glutes: DEFAULT_STRENGTH_LEVEL,
          lowerBack: DEFAULT_STRENGTH_LEVEL,
          upperBody: DEFAULT_STRENGTH_LEVEL,
          lastUpdated: Date.now(),
        },
      };
      saveUserProfile(updatedProfile);
      initializeUser();
      alert('Your fitness levels have been reset. Start a new workout to re-establish your baseline.');
      navigate('/');
    }
  };

  const handleClearAllData = async () => {
    if (
      !confirm(
        'This will permanently delete ALL your data including workouts, history, and calibration. This action cannot be undone. Are you sure?'
      )
    ) {
      return;
    }

    if (!confirm('Are you ABSOLUTELY sure? This will delete everything!')) {
      return;
    }

    try {
      // Clear database
      await db.workouts.clear();
      await db.history.clear();
      await db.strengthHistory.clear();
      await db.exerciseNotes.clear();

      // Clear user profile
      localStorage.clear();

      alert('All data has been cleared.');
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to clear data:', error);
      alert('Failed to clear data. Please try again.');
    }
  };

  return (
    <div className="border-2 border-red-400/30 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>
      <p className="text-sm text-text-muted mb-4">
        These actions cannot be undone. Use with caution.
      </p>

      <div className="space-y-3">
        <Button onClick={handleResetFitnessLevels} variant="outline" fullWidth>
          Reset Fitness Levels
        </Button>

        <button
          onClick={handleClearAllData}
          className="w-full px-6 py-3 rounded-lg font-medium transition-colors bg-red-600 text-white hover:bg-red-700"
        >
          Clear All Data
        </button>
      </div>
    </div>
  );
}
