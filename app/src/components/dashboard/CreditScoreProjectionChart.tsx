import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, Calendar, Info } from 'lucide-react';
import type { CreditScoreProjection } from '@/lib/credit-improvement-engine';

interface CreditScoreProjectionChartProps {
  projections: CreditScoreProjection[];
  currentScore: number;
  targetScore: number;
  className?: string;
}

export const CreditScoreProjectionChart: React.FC<CreditScoreProjectionChartProps> = ({
  projections,
  currentScore,
  targetScore,
  className = ''
}) => {
  // Prepare data for the chart
  const chartData = [
    {
      days: 0,
      score: currentScore,
      lowerBound: currentScore,
      upperBound: currentScore,
      label: 'Current'
    },
    ...projections.map(projection => ({
      days: projection.timeframe_days,
      score: projection.projected_score,
      lowerBound: projection.confidence_interval[0],
      upperBound: projection.confidence_interval[1],
      label: `${projection.timeframe_days}d`
    }))
  ];

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-semibold">{`Day ${label}`}</p>
          <p className="text-blue-600">
            <span className="font-medium">Projected Score: </span>
            {data.score}
          </p>
          <p className="text-gray-600 text-sm">
            <span className="font-medium">Range: </span>
            {data.lowerBound} - {data.upperBound}
          </p>
          <p className="text-green-600 text-sm">
            <span className="font-medium">Improvement: </span>
            +{data.score - currentScore} points
          </p>
        </div>
      );
    }
    return null;
  };

  // Calculate final projection stats
  const finalProjection = projections[projections.length - 1];
  const totalImprovement = finalProjection ? finalProjection.projected_score - currentScore : 0;
  const improvementPercentage = ((totalImprovement / currentScore) * 100).toFixed(1);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span>Credit Score Projections</span>
            </CardTitle>
            <CardDescription>
              ML-powered predictions based on your improvement plan
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              +{totalImprovement}
            </div>
            <div className="text-sm text-gray-600">
              {improvementPercentage}% improvement
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{currentScore}</div>
              <div className="text-sm text-gray-600">Current Score</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {finalProjection?.projected_score || currentScore}
              </div>
              <div className="text-sm text-gray-600">Projected Score</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{targetScore}</div>
              <div className="text-sm text-gray-600">Target Score</div>
            </div>
          </div>

          {/* Main Chart */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="days" 
                  stroke="#6B7280"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}d`}
                />
                <YAxis 
                  domain={[Math.max(300, currentScore - 50), Math.min(850, targetScore + 50)]}
                  stroke="#6B7280"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {/* Confidence interval area */}
                <Area
                  type="monotone"
                  dataKey="upperBound"
                  stroke="none"
                  fill="url(#confidenceGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="lowerBound"
                  stroke="none"
                  fill="#ffffff"
                />
                
                {/* Main projection line */}
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8, stroke: '#3B82F6', strokeWidth: 2 }}
                />
                
                {/* Target score reference line */}
                <ReferenceLine 
                  y={targetScore} 
                  stroke="#10B981" 
                  strokeDasharray="5 5"
                  label={{ value: `Target: ${targetScore}`, position: "topRight" }}
                />
                
                {/* Current score reference line */}
                <ReferenceLine 
                  y={currentScore} 
                  stroke="#6B7280" 
                  strokeDasharray="3 3"
                  label={{ value: `Current: ${currentScore}`, position: "bottomRight" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Timeline Milestones */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Key Milestones</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {projections.slice(0, 4).map((projection, index) => {
                const improvement = projection.projected_score - currentScore;
                const timeLabel = projection.timeframe_days === 30 ? '1 Month' :
                                projection.timeframe_days === 60 ? '2 Months' :
                                projection.timeframe_days === 90 ? '3 Months' :
                                projection.timeframe_days === 180 ? '6 Months' :
                                `${projection.timeframe_days} Days`;
                
                return (
                  <div key={index} className="p-3 border rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="w-3 h-3 mr-1" />
                        {timeLabel}
                      </Badge>
                      <span className="text-lg font-bold text-blue-600">
                        {projection.projected_score}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="text-green-600 font-medium">+{improvement}</span> points
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Range: {projection.confidence_interval[0]}-{projection.confidence_interval[1]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contributing Factors for Final Projection */}
          {finalProjection && finalProjection.contributing_factors && (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center">
                <Info className="w-4 h-4 mr-2" />
                Top Contributing Factors
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {finalProjection.contributing_factors
                  .sort((a, b) => b.impact - a.impact)
                  .slice(0, 4)
                  .map((factor, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">
                          {factor.factor}
                        </div>
                        <div className="text-xs text-gray-600">
                          {Math.round(factor.confidence * 100)}% confidence
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">
                          +{factor.impact}
                        </div>
                        <div className="text-xs text-gray-600">points</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Chart Legend */}
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-0.5 bg-blue-600"></div>
              <span>Projected Score</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-0.5 bg-green-500 opacity-50"></div>
              <span>Confidence Range</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-0.5 bg-green-600 border-dashed border-t-2 border-green-600"></div>
              <span>Target Score</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreditScoreProjectionChart;

