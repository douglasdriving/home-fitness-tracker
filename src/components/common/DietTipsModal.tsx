/**
 * DietTipsModal Component
 * Modal displaying diet tips after workout completion
 * Replaced the dedicated diet tab for more contextual presentation
 */

import { useState } from 'react';

interface DietTipsModalProps {
  onClose: () => void;
}

export default function DietTipsModal({ onClose }: DietTipsModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'protein' | 'hydration'>('general');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">🥗 Diet Tips</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl leading-none"
            >
              ×
            </button>
          </div>
          <p className="text-sm mt-1 opacity-90">Fuel your fitness journey</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-background-lighter bg-background-light">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'general'
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-muted hover:text-text'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('protein')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'protein'
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Protein
          </button>
          <button
            onClick={() => setActiveTab('hydration')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'hydration'
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Hydration
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                <h3 className="font-semibold text-green-900 mb-2">🥑 Eat Whole Foods</h3>
                <p className="text-sm text-green-800">
                  Focus on vegetables, fruits, lean proteins, and whole grains. These provide essential nutrients for muscle recovery and energy.
                </p>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <h3 className="font-semibold text-blue-900 mb-2">⏰ Post-Workout Nutrition</h3>
                <p className="text-sm text-blue-800">
                  Eat within 1-2 hours after your workout. Combine protein and carbs to optimize muscle recovery and replenish energy stores.
                </p>
              </div>

              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
                <h3 className="font-semibold text-purple-900 mb-2">🍽️ Balanced Meals</h3>
                <p className="text-sm text-purple-800">
                  Include protein, healthy fats, and complex carbs in each meal. This keeps you satiated and provides steady energy throughout the day.
                </p>
              </div>

              <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                <h3 className="font-semibold text-orange-900 mb-2">🚫 Limit Processed Foods</h3>
                <p className="text-sm text-orange-800">
                  Minimize intake of processed foods, added sugars, and unhealthy fats. These can hinder your fitness progress and recovery.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'protein' && (
            <div className="space-y-4">
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <h3 className="font-semibold text-red-900 mb-2">🥩 Protein Importance</h3>
                <p className="text-sm text-red-800">
                  Protein is essential for muscle repair and growth. Aim for 1.6-2.2g per kg of body weight daily if you're training regularly.
                </p>
              </div>

              <div className="bg-background-light border border-background-lighter p-4 rounded">
                <h3 className="font-semibold text-text mb-3">Top Protein Sources:</h3>
                <ul className="space-y-2 text-sm text-text">
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    <span><strong>Chicken breast:</strong> ~31g per 100g</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    <span><strong>Eggs:</strong> ~13g per 2 eggs</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    <span><strong>Greek yogurt:</strong> ~10g per 100g</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    <span><strong>Lentils:</strong> ~9g per 100g cooked</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    <span><strong>Tofu:</strong> ~8g per 100g</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    <span><strong>Quinoa:</strong> ~4g per 100g cooked</span>
                  </li>
                </ul>
              </div>

              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                <h3 className="font-semibold text-green-900 mb-2">🌱 Plant-Based Options</h3>
                <p className="text-sm text-green-800">
                  Combine different plant proteins (beans, lentils, nuts, seeds) to get all essential amino acids.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'hydration' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <h3 className="font-semibold text-blue-900 mb-2">💧 Daily Water Intake</h3>
                <p className="text-sm text-blue-800">
                  Aim for 2-3 liters per day, more if you're exercising intensely or in hot weather. Dehydration can severely impact performance and recovery.
                </p>
              </div>

              <div className="bg-cyan-50 border-l-4 border-cyan-500 p-4 rounded">
                <h3 className="font-semibold text-cyan-900 mb-2">🏃 During Exercise</h3>
                <p className="text-sm text-cyan-800">
                  Drink water before, during, and after workouts. For sessions over 60 minutes, consider electrolyte drinks.
                </p>
              </div>

              <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded">
                <h3 className="font-semibold text-indigo-900 mb-2">☕ Limit Dehydrating Drinks</h3>
                <p className="text-sm text-indigo-800">
                  Caffeine and alcohol can contribute to dehydration. Balance these with extra water intake.
                </p>
              </div>

              <div className="bg-teal-50 border-l-4 border-teal-500 p-4 rounded">
                <h3 className="font-semibold text-teal-900 mb-2">🎯 Hydration Check</h3>
                <p className="text-sm text-teal-800">
                  Monitor urine color: pale yellow indicates good hydration, while dark yellow suggests you need more water.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-background-lighter bg-background-light">
          <p className="text-xs text-text-muted text-center">
            💡 Consult a nutritionist for personalized dietary advice
          </p>
        </div>
      </div>
    </div>
  );
}
