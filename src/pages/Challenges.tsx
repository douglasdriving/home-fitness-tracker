import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/user-store';
import {
  getChallengesByLevel,
} from '../data/challengeData';
import {
  LEVEL_NAMES,
  LEVEL_DESCRIPTIONS,
  LEVEL_EMOJIS,
  Challenge,
  ChallengeLevel,
} from '../types/challenge';
import Button from '../components/common/Button';

export default function Challenges() {
  const navigate = useNavigate();
  const { profile, initializeChallengeState } = useUserStore();
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [showLevelCalibration, setShowLevelCalibration] = useState(false);

  // Check if user needs to set starting level
  useEffect(() => {
    if (profile?.calibrationCompleted && !profile.challengeState) {
      setShowLevelCalibration(true);
    }
  }, [profile]);

  if (!profile || !profile.calibrationCompleted) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold text-text mb-2">Complete Calibration First</h2>
          <p className="text-text-muted mb-6">
            You need to complete the calibration to unlock the Challenge Journey.
          </p>
          <Button onClick={() => navigate('/calibration')}>Go to Calibration</Button>
        </div>
      </div>
    );
  }

  const challengeState = profile.challengeState;

  // Calculate level completion
  const getLevelProgress = (level: ChallengeLevel) => {
    if (!challengeState) return { completed: 0, total: 0 };

    const levelChallenges = getChallengesByLevel(level);
    const completed = levelChallenges.filter((c) =>
      challengeState.completedChallenges.some((p) => p.challengeId === c.id && p.completed)
    ).length;

    return { completed, total: levelChallenges.length };
  };

  const isLevelUnlocked = (level: ChallengeLevel): boolean => {
    if (!challengeState) return false;
    return level <= challengeState.currentLevel;
  };

  const isChallengeCompleted = (challengeId: string): boolean => {
    if (!challengeState) return false;
    return challengeState.completedChallenges.some(
      (p) => p.challengeId === challengeId && p.completed
    );
  };

  const getChallengeProgress = (challengeId: string) => {
    if (!challengeState) return null;
    return challengeState.completedChallenges.find((p) => p.challengeId === challengeId);
  };

  const handleStartChallenge = (challenge: Challenge) => {
    navigate('/challenge-attempt', { state: { challenge } });
  };

  const handleStartingLevelSelect = (level: number) => {
    initializeChallengeState(level);
    setShowLevelCalibration(false);
  };

  // Starting level calibration modal
  if (showLevelCalibration) {
    const avgStrength =
      (profile.strengthLevels.abs +
        profile.strengthLevels.glutes +
        profile.strengthLevels.lowerBack) /
      3;

    const recommendedLevel = Math.min(
      7,
      Math.max(1, Math.floor(avgStrength / 20) + 1)
    );

    return (
      <div className="bg-background min-h-screen flex items-center justify-center p-4">
        <div className="bg-background-light rounded-lg shadow-xl p-6 max-w-lg w-full">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-text mb-2">Choose Your Starting Level</h2>
            <p className="text-text-muted">
              Based on your strength levels, we recommend starting at Level {recommendedLevel}.
              You can choose any level below.
            </p>
          </div>

          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7].map((level) => {
              const isRecommended = level === recommendedLevel;
              return (
                <button
                  key={level}
                  onClick={() => handleStartingLevelSelect(level)}
                  className={`w-full p-4 rounded-lg text-left transition-all ${
                    isRecommended
                      ? 'bg-primary text-background border-2 border-primary shadow-lg'
                      : 'bg-background border border-background-lighter hover:border-primary'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{LEVEL_EMOJIS[level as ChallengeLevel]}</span>
                      <div>
                        <div
                          className={`font-bold ${
                            isRecommended ? 'text-background' : 'text-text'
                          }`}
                        >
                          Level {level}: {LEVEL_NAMES[level as ChallengeLevel]}
                        </div>
                        <div
                          className={`text-sm ${
                            isRecommended ? 'text-background/80' : 'text-text-muted'
                          }`}
                        >
                          {LEVEL_DESCRIPTIONS[level as ChallengeLevel]}
                        </div>
                      </div>
                    </div>
                    {isRecommended && (
                      <span className="text-xs font-bold bg-background text-primary px-2 py-1 rounded">
                        RECOMMENDED
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (!challengeState) {
    return null;
  }

  return (
    <div className="bg-background min-h-screen pb-20">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-lg p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">Challenge Journey</h1>
          <p className="text-white/90 mb-4">
            Climb the ladder of core mastery. Complete challenges to unlock new levels.
          </p>
          <div className="flex items-center gap-6">
            <div>
              <div className="text-3xl font-bold">{challengeState.totalChallengesCompleted}</div>
              <div className="text-sm text-white/80">Challenges Completed</div>
            </div>
            <div>
              <div className="text-3xl font-bold">
                {challengeState.currentLevel} / 7
              </div>
              <div className="text-sm text-white/80">Current Level</div>
            </div>
          </div>
        </div>

        {/* Challenge Ladder */}
        <div className="space-y-4">
          {[7, 6, 5, 4, 3, 2, 1].map((level) => {
            const typedLevel = level as ChallengeLevel;
            const unlocked = isLevelUnlocked(typedLevel);
            const progress = getLevelProgress(typedLevel);
            const allCompleted = progress.completed === progress.total;
            const levelChallenges = getChallengesByLevel(typedLevel);

            return (
              <div
                key={level}
                className={`rounded-lg overflow-hidden transition-all ${
                  unlocked
                    ? 'bg-background-light shadow-lg'
                    : 'bg-background-lighter opacity-60'
                }`}
              >
                {/* Level Header */}
                <div
                  className={`p-4 ${
                    allCompleted && unlocked
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                      : unlocked
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                      : 'bg-background text-text-muted'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{LEVEL_EMOJIS[typedLevel]}</span>
                      <div>
                        <h3 className="text-xl font-bold">
                          Level {level}: {LEVEL_NAMES[typedLevel]}
                        </h3>
                        <p className="text-sm opacity-90">{LEVEL_DESCRIPTIONS[typedLevel]}</p>
                      </div>
                    </div>
                    {!unlocked && (
                      <div className="text-2xl">🔒</div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {unlocked && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span className="font-bold">
                          {progress.completed} / {progress.total}
                        </span>
                      </div>
                      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white transition-all duration-500"
                          style={{
                            width: `${(progress.completed / progress.total) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Challenges in Level */}
                {unlocked && (
                  <div className="p-4 space-y-3">
                    {levelChallenges.map((challenge) => {
                      const completed = isChallengeCompleted(challenge.id);
                      const progress = getChallengeProgress(challenge.id);

                      return (
                        <div
                          key={challenge.id}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            completed
                              ? 'bg-green-50 border-green-500'
                              : 'bg-background border-background-lighter hover:border-primary'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-bold text-text flex items-center gap-2">
                                {challenge.name}
                                {completed && <span className="text-green-500">✓</span>}
                              </h4>
                              <p className="text-sm text-text-muted mt-1">
                                {challenge.description}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                                <span className="font-bold text-primary">
                                  Target:{' '}
                                  {challenge.type === 'timed'
                                    ? `${challenge.targetValue}s`
                                    : `${challenge.targetValue} reps${
                                        challenge.type === 'reps-per-side' ? ' per side' : ''
                                      }`}
                                </span>
                                {progress && progress.bestValue && (
                                  <span>
                                    Best:{' '}
                                    {challenge.type === 'timed'
                                      ? `${progress.bestValue}s`
                                      : `${progress.bestValue} reps`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleStartChallenge(challenge)}
                              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                                completed
                                  ? 'bg-green-500 text-white hover:bg-green-600'
                                  : 'bg-primary text-background hover:bg-primary-light'
                              }`}
                            >
                              {completed ? 'Retry Challenge' : 'Start Challenge'}
                            </button>
                            <button
                              onClick={() => setSelectedChallenge(challenge)}
                              className="py-2 px-4 rounded-lg font-medium bg-background-lighter text-text hover:bg-background-light transition-colors"
                            >
                              Info
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Challenge Info Modal */}
      {selectedChallenge && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedChallenge(null)}
        >
          <div
            className="bg-background-light rounded-lg shadow-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-text mb-4">{selectedChallenge.name}</h3>
            <p className="text-text-muted mb-4">{selectedChallenge.description}</p>

            <div className="mb-4">
              <h4 className="font-bold text-text mb-2">Tips for Success:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-text-muted">
                {selectedChallenge.tips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>

            {selectedChallenge.videoUrl && (
              <a
                href={selectedChallenge.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 px-4 bg-red-500 text-white rounded-lg text-center font-medium hover:bg-red-600 transition-colors mb-3"
              >
                📹 Watch Tutorial Video
              </a>
            )}

            <button
              onClick={() => setSelectedChallenge(null)}
              className="w-full py-3 px-4 bg-background-lighter text-text rounded-lg font-medium hover:bg-background transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
