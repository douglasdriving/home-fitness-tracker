import { useState, useEffect } from 'react';
import { useUserStore } from '../store/user-store';
import { useWorkoutStore } from '../store/workout-store';
import { saveUserProfile } from '../utils/userProfile';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

export default function DietTips() {
  const { profile, initializeUser } = useUserStore();
  const { workoutHistory } = useWorkoutStore();

  const [weight, setWeight] = useState(profile?.weight?.toString() || '');
  const [height, setHeight] = useState(profile?.height?.toString() || '');
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    setHasData(!!profile?.weight && !!profile?.height);
  }, [profile]);

  const handleSaveData = () => {
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);

    if (!weightNum || weightNum <= 0) {
      alert('Please enter a valid weight');
      return;
    }

    if (!heightNum || heightNum <= 0) {
      alert('Please enter a valid height');
      return;
    }

    if (profile) {
      const updatedProfile = {
        ...profile,
        weight: weightNum,
        height: heightNum,
      };
      saveUserProfile(updatedProfile);
      initializeUser();
      setHasData(true);
    }
  };

  // Calculate workout intensity based on recent history
  const getWorkoutIntensity = () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentWorkouts = workoutHistory.filter(
      (workout) => new Date(workout.completedDate) >= oneWeekAgo
    );

    const workoutsPerWeek = recentWorkouts.length;
    const avgDuration = recentWorkouts.length > 0
      ? recentWorkouts.reduce((sum, w) => sum + w.totalDuration, 0) / recentWorkouts.length
      : 0;

    const totalSets = recentWorkouts.reduce(
      (sum, w) => sum + w.exercises.reduce((exSum, ex) => exSum + ex.completedSets.length, 0),
      0
    );

    return {
      workoutsPerWeek,
      avgDuration,
      totalSets,
      intensity: workoutsPerWeek >= 4 ? 'high' : workoutsPerWeek >= 2 ? 'moderate' : 'low'
    };
  };

  const intensity = getWorkoutIntensity();

  // Calculate protein needs (1.6-2.2g per kg for muscle building)
  const calculateProtein = () => {
    if (!profile?.weight) return null;

    const baseProtein = profile.weight * 1.8; // g per day (middle of range)

    // Adjust based on workout intensity
    let proteinMultiplier = 1.0;
    if (intensity.intensity === 'high') {
      proteinMultiplier = 1.2; // More protein for intense training
    } else if (intensity.intensity === 'low') {
      proteinMultiplier = 0.9; // Slightly less for light training
    }

    const recommendedProtein = Math.round(baseProtein * proteinMultiplier);
    const perMeal = Math.round(recommendedProtein / 4); // Assuming 4 meals/day

    return {
      daily: recommendedProtein,
      perMeal,
    };
  };

  const protein = calculateProtein();

  // Generate dynamic diet tips based on workout data
  const getDietTips = () => {
    const tips = [];

    // Protein tip
    if (protein) {
      const dailyProtein = protein.daily;

      // Calculate amounts needed for each food type to hit daily target
      const proteinFoods = [
        {
          name: 'Chicken breast',
          perServing: 31, // g per 100g
          servingSize: 100,
          unit: 'g',
          pieceWeight: 150, // typical breast weight
          pieceUnit: 'breast'
        },
        {
          name: 'Chicken thighs',
          perServing: 26,
          servingSize: 100,
          unit: 'g',
          pieceWeight: 100,
          pieceUnit: 'thigh'
        },
        {
          name: 'Salmon',
          perServing: 25,
          servingSize: 100,
          unit: 'g',
          pieceWeight: 150,
          pieceUnit: 'fillet'
        },
        {
          name: 'Tuna',
          perServing: 26,
          servingSize: 100,
          unit: 'g',
          pieceWeight: 120,
          pieceUnit: 'can'
        },
        {
          name: 'Eggs',
          perServing: 13,
          servingSize: 2,
          unit: 'large eggs',
          pieceWeight: 1,
          pieceUnit: 'egg'
        },
        {
          name: 'Tofu',
          perServing: 8,
          servingSize: 100,
          unit: 'g',
          pieceWeight: 200,
          pieceUnit: 'block'
        },
        {
          name: 'Beans',
          perServing: 9,
          servingSize: 100,
          unit: 'g cooked',
          pieceWeight: 150,
          pieceUnit: 'cup'
        },
        {
          name: 'Whey protein',
          perServing: 22.5, // average of 20-25
          servingSize: 1,
          unit: 'scoop',
          pieceWeight: 1,
          pieceUnit: 'scoop'
        }
      ];

      const proteinExamples = proteinFoods.map(food => {
        const amountNeeded = (dailyProtein / food.perServing) * food.servingSize;

        if (food.unit === 'large eggs') {
          const eggsNeeded = Math.round((dailyProtein / food.perServing) * food.servingSize);
          return `${food.name}: ${eggsNeeded} eggs`;
        } else if (food.unit === 'scoop') {
          const scoopsNeeded = Math.round((dailyProtein / food.perServing) * 10) / 10;
          return `${food.name}: ${scoopsNeeded} scoops`;
        } else {
          const grams = Math.round(amountNeeded);
          const pieces = Math.round((grams / food.pieceWeight) * 10) / 10;
          return `${food.name}: ${grams}g (~${pieces} ${food.pieceUnit}${pieces !== 1 ? 's' : ''})`;
        }
      });

      tips.push({
        icon: '🥩',
        title: 'Protein Intake',
        tip: `Aim for ${protein.daily}g of protein daily (${protein.perMeal}g per meal).\n\nWhy? Protein provides amino acids needed to repair and build muscle tissue after training.\n\nTo hit your daily target, you'd need approximately:\n• ${proteinExamples.join('\n• ')}`
      });
    }

    // Workout frequency based tips
    const carbExamples = 'rice, oats, quinoa, sweet potatoes, whole grain bread';
    if (intensity.workoutsPerWeek >= 3) {
      tips.push({
        icon: '🍚',
        title: 'Carbohydrates',
        tip: `With your training frequency (${intensity.workoutsPerWeek}x/week), prioritize complex carbs 1-2 hours before workouts.\n\nWhy? Complex carbs (slow-digesting carbs like ${carbExamples}) provide sustained energy for your workouts and help replenish glycogen stores.\n\nOn rest days, slightly reduce carb intake since you need less energy.`
      });
    } else {
      tips.push({
        icon: '🍚',
        title: 'Carbohydrates',
        tip: `Focus complex carbs (slow-digesting carbs like ${carbExamples}) around workout times.\n\nWhy? They provide sustained energy for training.\n\nOn rest days, reduce carb intake since you need less energy for recovery.`
      });
    }

    // Post-workout nutrition
    if (intensity.avgDuration > 20) {
      tips.push({
        icon: '⏰',
        title: 'Post-Workout Window',
        tip: 'Consume protein + carbs within 1-2 hours after training.\n\nWhy? This timing maximizes muscle protein synthesis and replenishes glycogen stores when your muscles are most receptive to nutrients.'
      });
    }

    // Hydration - calculate based on workout history
    const baseWater = Math.round((profile?.weight || 70) * 0.033 * 10) / 10; // L/day based on body weight
    const workoutWater = intensity.workoutsPerWeek * 0.5; // 500ml per workout
    const totalWater = Math.round((baseWater + workoutWater) * 10) / 10;

    tips.push({
      icon: '💧',
      title: 'Hydration',
      tip: `Drink at least ${totalWater}L of water daily based on your weight and current training frequency (${intensity.workoutsPerWeek}x/week).\n\nWhy? Proper hydration supports muscle function, nutrient transport, and recovery. Even 2% dehydration can reduce performance.`
    });

    // Recovery based on intensity
    if (intensity.intensity === 'high') {
      tips.push({
        icon: '😴',
        title: 'Recovery & Sleep',
        tip: 'With high training volume, prioritize 7-9 hours of sleep.\n\nWhy? Muscle growth and repair happen during sleep when growth hormone levels peak. Poor sleep impairs recovery and muscle building.'
      });
    }

    // Meal timing
    tips.push({
      icon: '🍽️',
      title: 'Meal Frequency',
      tip: 'Spread protein intake across 3-4 meals.\n\nWhy? Distributing protein throughout the day maintains elevated muscle protein synthesis, maximizing muscle growth compared to eating all protein in 1-2 meals.'
    });

    // Caloric surplus for muscle building
    if (intensity.workoutsPerWeek >= 2) {
      tips.push({
        icon: '📈',
        title: 'Caloric Surplus',
        tip: 'For muscle growth, aim for a slight caloric surplus (200-300 calories above maintenance).\n\nWhy? Building new muscle tissue requires extra energy. Too small = minimal growth. Too large = excess fat gain. Track your weight weekly to ensure you\'re gaining 0.25-0.5kg per month.'
      });
    }

    // Micronutrients
    const veggieExamples = 'spinach, broccoli, bell peppers, carrots, tomatoes';
    const fruitExamples = 'berries, oranges, apples, bananas';

    tips.push({
      icon: '🥗',
      title: 'Micronutrients & Vegetables',
      tip: `Include colorful vegetables (${veggieExamples}) and fruits (${fruitExamples}) daily.\n\nWhy? Different colors provide different vitamins and minerals. Magnesium aids muscle relaxation, zinc supports testosterone and recovery, vitamin D helps muscle function and strength.`
    });

    return tips;
  };

  const tips = hasData ? getDietTips() : [];

  return (
    <div className="bg-background min-h-screen">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-display font-bold text-text mb-2">Diet</h1>
        </div>

        {/* User Data Input */}
        <div className="bg-background-light rounded-lg shadow-lg p-6 border border-background-lighter">
          <h2 className="text-lg font-semibold text-text mb-4">Your Stats</h2>

          <div className="space-y-4">
            <Input
              type="number"
              label="Weight (kg)"
              placeholder="e.g., 70"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              min="1"
              step="0.1"
            />

            <Input
              type="number"
              label="Height (cm)"
              placeholder="e.g., 175"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              min="1"
              step="1"
            />

            <Button onClick={handleSaveData} fullWidth>
              {hasData ? 'Update Stats' : 'Save Stats'}
            </Button>
          </div>
        </div>

        {/* Diet Tips */}
        {hasData ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-text">Your Personalized Tips</h2>
            {tips.map((tip, index) => (
              <div
                key={index}
                className="bg-background-light rounded-lg shadow-lg p-4 border border-background-lighter"
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl flex-shrink-0">{tip.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-md font-semibold text-text mb-1">{tip.title}</h3>
                    <div className="text-sm text-text leading-relaxed whitespace-pre-line">
                      {tip.tip.split('Why?').map((part, i) => (
                        i === 0 ? part : <span key={i}><strong>Why?</strong>{part}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-text-muted">Enter your stats above to see personalized diet tips!</p>
          </div>
        )}
      </div>
    </div>
  );
}
