import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../store/user-store';
import { Challenge } from '../types/challenge';
import { getChallengesByLevel } from '../data/challengeData';
import Timer from '../components/workout/Timer';
import Button from '../components/common/Button';

export default function ChallengeAttempt() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, completeChallenge, updateChallengeLevel, updateStrengthLevels } = useUserStore();

  const challenge = location.state?.challenge as Challenge | undefined;

  const [phase, setPhase] = useState<'ready' | 'active' | 'complete'>('ready');
  const [achievedValue, setAchievedValue] = useState<number>(0);
  const [timerComplete, setTimerComplete] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    // Request wake lock when challenge starts
    let wakeLock: WakeLockSentinel | null = null;

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
        } catch (err) {
          console.log('Wake lock failed:', err);
        }
      }
    };

    if (phase === 'active') {
      requestWakeLock();
    }

    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, [phase]);

  if (!challenge) {
    navigate('/challenges');
    return null;
  }

  const handleStart = () => {
    setPhase('active');
    setAchievedValue(0);
    setTimerComplete(false);
  };

  const handleComplete = () => {
    if (challenge.type === 'timed' && !timerComplete) {
      alert('Complete the full duration first!');
      return;
    }

    if ((challenge.type === 'reps' || challenge.type === 'reps-per-side') && achievedValue === 0) {
      alert('Enter your rep count first!');
      return;
    }

    const success = challenge.type === 'timed' || achievedValue >= challenge.targetValue;

    if (success) {
      // Complete the challenge
      completeChallenge(challenge.id, challenge.type === 'timed' ? challenge.targetValue : achievedValue);

      // Update strength levels based on challenge completion
      const strengthBoost = challenge.strengthMultiplier * 2; // Small boost per challenge
      const updates: Partial<{ abs: number; glutes: number; lowerBack: number }> = {};

      challenge.muscleGroups.forEach((muscle) => {
        if (muscle === 'abs') {
          updates.abs = (profile?.strengthLevels.abs || 0) + strengthBoost;
        } else if (muscle === 'glutes') {
          updates.glutes = (profile?.strengthLevels.glutes || 0) + strengthBoost;
        } else if (muscle === 'lowerBack') {
          updates.lowerBack = (profile?.strengthLevels.lowerBack || 0) + strengthBoost;
        }
      });

      updateStrengthLevels(updates);

      // Check if user should unlock next level
      if (profile?.challengeState) {
        const currentLevel = challenge.level;
        const levelChallenges = getChallengesByLevel(currentLevel);
        const completedInLevel = profile.challengeState.completedChallenges.filter(
          (p) => p.completed && levelChallenges.some((lc) => lc.id === p.challengeId)
        ).length;

        // If all challenges in current level are complete, unlock next level
        if (completedInLevel + 1 >= levelChallenges.length && currentLevel < 7) {
          updateChallengeLevel(currentLevel + 1);
          setShowCelebration(true);
        }
      }

      setPhase('complete');
    } else {
      alert(`Not quite there! Target: ${challenge.targetValue} reps. You got ${achievedValue}.`);
    }
  };

  const handleRetry = () => {
    setPhase('ready');
    setAchievedValue(0);
    setTimerComplete(false);
    setShowCelebration(false);
  };

  const handleExit = () => {
    navigate('/challenges');
  };

  const renderPhaseContent = () => {
    if (phase === 'ready') {
      return (
        <div className="text-center">
          <div className="text-6xl mb-6">💪</div>
          <h2 className="text-2xl font-bold text-text mb-4">{challenge.name}</h2>
          <p className="text-text-muted mb-6 max-w-md mx-auto">{challenge.description}</p>

          <div className="bg-background-light rounded-lg p-6 mb-6 max-w-md mx-auto">
            <div className="text-4xl font-bold text-primary mb-2">
              {challenge.type === 'timed'
                ? `${challenge.targetValue}s`
                : `${challenge.targetValue} reps`}
            </div>
            <div className="text-sm text-text-muted">
              {challenge.type === 'reps-per-side' ? 'Per Side' : 'Target'}
            </div>
          </div>

          <div className="mb-6 max-w-md mx-auto">
            <h4 className="font-bold text-text mb-2 text-left">Quick Tips:</h4>
            <ul className="text-left list-disc list-inside space-y-1 text-sm text-text-muted">
              {challenge.tips.slice(0, 3).map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3 max-w-md mx-auto">
            <Button onClick={handleStart} className="flex-1">
              Start Challenge
            </Button>
            <Button onClick={handleExit} variant="secondary" className="flex-1">
              Back
            </Button>
          </div>
        </div>
      );
    }

    if (phase === 'active') {
      return (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text mb-6">{challenge.name}</h2>

          {challenge.type === 'timed' ? (
            <div className="mb-8">
              <Timer
                duration={challenge.targetValue}
                autoStart={true}
                onComplete={() => setTimerComplete(true)}
                showSecondsOnly={true}
              />
              {timerComplete && (
                <div className="mt-4 text-green-500 font-bold text-xl">✓ Time Complete!</div>
              )}
            </div>
          ) : (
            <div className="mb-8">
              <label className="block mb-2 text-text-muted">
                Enter reps {challenge.type === 'reps-per-side' ? '(per side)' : ''} achieved:
              </label>
              <input
                type="number"
                value={achievedValue || ''}
                onChange={(e) => setAchievedValue(Number(e.target.value))}
                className="w-32 text-center text-4xl font-bold p-4 rounded-lg border-2 border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0"
                autoFocus
              />
              <div className="mt-2 text-sm text-text-muted">
                Target: {challenge.targetValue}
              </div>
            </div>
          )}

          <div className="flex gap-3 max-w-md mx-auto">
            <Button
              onClick={handleComplete}
              className="flex-1"
              disabled={challenge.type === 'timed' && !timerComplete}
            >
              Complete Challenge
            </Button>
            <Button onClick={handleRetry} variant="secondary" className="flex-1">
              Restart
            </Button>
          </div>
        </div>
      );
    }

    if (phase === 'complete') {
      const success = challenge.type === 'timed' || achievedValue >= challenge.targetValue;

      return (
        <div className="text-center">
          <div className="text-8xl mb-6">{success ? '🎉' : '💪'}</div>
          <h2 className="text-3xl font-bold text-text mb-4">
            {success ? 'Challenge Completed!' : 'Keep Training!'}
          </h2>
          <p className="text-text-muted mb-6 max-w-md mx-auto">
            {success
              ? `You crushed the ${challenge.name} challenge! Your strength levels have increased.`
              : `You gave it a great effort! Try again to beat the challenge.`}
          </p>

          {showCelebration && (
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg p-6 mb-6 max-w-md mx-auto">
              <div className="text-4xl mb-2">🏆</div>
              <div className="font-bold text-xl">Level Unlocked!</div>
              <div className="text-sm opacity-90">You've unlocked the next level!</div>
            </div>
          )}

          <div className="flex gap-3 max-w-md mx-auto">
            <Button onClick={handleRetry} className="flex-1">
              Try Again
            </Button>
            <Button onClick={handleExit} variant="secondary" className="flex-1">
              Back to Journey
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-background min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">{renderPhaseContent()}</div>
    </div>
  );
}
