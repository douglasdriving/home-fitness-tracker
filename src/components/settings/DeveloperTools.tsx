import { useState } from 'react';
import { seedWorkoutHistory, clearWorkoutHistory } from '../../utils/seedData';
import Button from '../common/Button';
import CustomWorkoutBuilder from './CustomWorkoutBuilder';

/**
 * Development-only tools for populating and clearing test data. The whole
 * section renders only in development mode. Hosts the custom workout builder
 * plus seed/clear-history shortcuts.
 */
export default function DeveloperTools() {
  const [isSeeding, setIsSeeding] = useState(false);

  if (import.meta.env.MODE !== 'development') {
    return null;
  }

  const handleSeedWorkoutHistory = async () => {
    try {
      setIsSeeding(true);
      await seedWorkoutHistory();
      alert('Successfully seeded 15 workout history entries! Navigate to History or Progress tabs to see the data.');
    } catch (error) {
      if (error instanceof Error && error.message.includes('cancelled')) {
        // User cancelled - do nothing
        return;
      }
      console.error('Failed to seed workout history:', error);
      alert('Failed to seed workout history. Please try again.');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearWorkoutHistory = async () => {
    try {
      await clearWorkoutHistory();
      alert('Workout history cleared successfully.');
    } catch (error) {
      if (error instanceof Error && error.message.includes('cancelled')) {
        // User cancelled - do nothing
        return;
      }
      console.error('Failed to clear workout history:', error);
      alert('Failed to clear workout history. Please try again.');
    }
  };

  return (
    <div className="border-b border-background-lighter pb-6">
      <h2 className="text-lg font-semibold text-text mb-4">Development Tools</h2>
      <p className="text-sm text-text-muted mb-4">
        These tools are only available in development mode. Use them to quickly populate test data.
      </p>

      <div className="space-y-6">
        <CustomWorkoutBuilder />

        {/* Seed/Clear History Tools */}
        <div className="space-y-3 pt-3 border-t border-background-lighter">
          <Button onClick={handleSeedWorkoutHistory} fullWidth disabled={isSeeding}>
            {isSeeding ? 'Seeding...' : 'Seed Workout History (15 workouts)'}
          </Button>

          <button
            onClick={handleClearWorkoutHistory}
            className="w-full px-6 py-3 rounded-lg font-medium transition-colors bg-background-lighter text-text hover:bg-background-lighter/80"
          >
            Clear Workout History
          </button>
        </div>
      </div>

      <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <p className="text-xs text-yellow-200">
          <strong>Note:</strong> Seed data will create 15 realistic workouts spanning 6 weeks with progressive performance improvements.
          This is helpful for testing features like history display, progress tracking, and progressive overload.
        </p>
      </div>
    </div>
  );
}
