import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { db, StrengthLevelSnapshot } from '../db/db';

interface ChartDataPoint {
  workoutNumber: number;
  abs: number;
  glutes: number;
  lowerBack: number;
  date: string;
}

export default function Progress() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    setIsLoading(true);
    try {
      // Load all strength level snapshots from the database
      const snapshots = await db.strengthHistory
        .orderBy('timestamp')
        .toArray();

      // Transform data for the chart
      const data: ChartDataPoint[] = snapshots.map((snapshot: StrengthLevelSnapshot) => ({
        workoutNumber: snapshot.workoutNumber,
        abs: snapshot.abs,
        glutes: snapshot.glutes,
        lowerBack: snapshot.lowerBack,
        date: new Date(snapshot.timestamp).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        }),
      }));

      setChartData(data);
    } catch (error) {
      console.error('Failed to load progress data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-background-lighter rounded-lg p-3 shadow-lg">
          <p className="text-text font-semibold mb-2">
            {payload[0].payload.workoutNumber === 0
              ? 'Calibration'
              : `Workout #${payload[0].payload.workoutNumber}`}
          </p>
          <p className="text-sm text-text-muted mb-2">{payload[0].payload.date}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <div className="text-text-muted">Loading progress data...</div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-background min-h-screen">
        <div className="p-4">
          <h1 className="text-2xl font-bold text-text mb-6">Progress</h1>
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">📈</div>
            <h2 className="text-xl font-semibold text-text mb-2">
              No progress data yet
            </h2>
            <p className="text-text-muted">
              Complete workouts to see your strength progression over time.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (chartData.length === 1) {
    return (
      <div className="bg-background min-h-screen">
        <div className="p-4">
          <h1 className="text-2xl font-bold text-text mb-6">Progress</h1>
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-xl font-semibold text-text mb-2">
              Keep going!
            </h2>
            <p className="text-text-muted mb-4">
              You've completed your calibration. Complete at least one workout to see your progress chart.
            </p>

            {/* Show current strength levels */}
            <div className="bg-background-light rounded-lg p-4 mt-6 max-w-sm mx-auto">
              <h3 className="text-lg font-semibold text-text mb-3">Current Strength Levels</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-text">Abs</span>
                  <span className="text-primary font-bold">{chartData[0].abs}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text">Glutes</span>
                  <span className="text-secondary font-bold">{chartData[0].glutes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text">Lower Back</span>
                  <span className="text-accent font-bold">{chartData[0].lowerBack}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate overall stats
  const latestData = chartData[chartData.length - 1];
  const initialData = chartData[0];
  const absGain = latestData.abs - initialData.abs;
  const glutesGain = latestData.glutes - initialData.glutes;
  const lowerBackGain = latestData.lowerBack - initialData.lowerBack;

  return (
    <div className="bg-background min-h-screen">
      <div className="p-4 space-y-6">
        <h1 className="text-2xl font-bold text-text">Progress</h1>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-background-light rounded-lg p-3">
            <div className="text-xs text-text-muted mb-1">Abs</div>
            <div className="text-2xl font-bold text-primary">{latestData.abs}</div>
            <div className="text-xs text-text-muted mt-1">
              {absGain > 0 ? '+' : ''}{absGain} since start
            </div>
          </div>
          <div className="bg-background-light rounded-lg p-3">
            <div className="text-xs text-text-muted mb-1">Glutes</div>
            <div className="text-2xl font-bold text-secondary">{latestData.glutes}</div>
            <div className="text-xs text-text-muted mt-1">
              {glutesGain > 0 ? '+' : ''}{glutesGain} since start
            </div>
          </div>
          <div className="bg-background-light rounded-lg p-3">
            <div className="text-xs text-text-muted mb-1">Lower Back</div>
            <div className="text-2xl font-bold text-accent">{latestData.lowerBack}</div>
            <div className="text-xs text-text-muted mt-1">
              {lowerBackGain > 0 ? '+' : ''}{lowerBackGain} since start
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-background-light rounded-lg p-4">
          <h2 className="text-lg font-semibold text-text mb-4">Strength Level Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="workoutNumber"
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickFormatter={(value) => value === 0 ? 'Cal' : `#${value}`}
              />
              <YAxis
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                domain={[0, 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey="abs"
                name="Abs"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: '#3B82F6', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="glutes"
                name="Glutes"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={{ fill: '#8B5CF6', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="lowerBack"
                name="Lower Back"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ fill: '#10B981', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Insight Text */}
        <div className="bg-background-light rounded-lg p-4">
          <h3 className="text-lg font-semibold text-text mb-2">Your Progress</h3>
          <p className="text-sm text-text-muted">
            You've completed {chartData.length - 1} workout{chartData.length - 1 !== 1 ? 's' : ''} since calibration.
            {' '}
            {absGain > 0 || glutesGain > 0 || lowerBackGain > 0 ? (
              <>Keep up the great work! Your strength levels are improving.</>
            ) : (
              <>Keep working out consistently to see your strength levels improve.</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
