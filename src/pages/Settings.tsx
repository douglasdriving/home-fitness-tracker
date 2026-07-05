import CalibrationResults from '../components/settings/CalibrationResults';
import ExcludedExercisesSection from '../components/settings/ExcludedExercisesSection';
import InstallAppSection from '../components/settings/InstallAppSection';
import DeveloperTools from '../components/settings/DeveloperTools';
import BackupRestoreSection from '../components/settings/BackupRestoreSection';
import DangerZoneSection from '../components/settings/DangerZoneSection';

export default function Settings() {
  return (
    <div className="bg-background min-h-screen">
      <div className="p-4 space-y-6">
        <CalibrationResults />
        <ExcludedExercisesSection />
        <InstallAppSection />
        <DeveloperTools />
        <BackupRestoreSection />
        <DangerZoneSection />
      </div>
    </div>
  );
}
