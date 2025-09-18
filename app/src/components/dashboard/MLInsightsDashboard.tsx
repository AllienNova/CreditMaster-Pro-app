import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  Zap,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Info,
  CheckCircle,
  XCircle
} from 'lucide-react';
import type { MLImprovementAnalysis, ImprovementOpportunity } from '@/lib/credit-improvement-engine';

interface MLInsightsDashboardProps {
  mlAnalysis: MLImprovementAnalysis;
  currentScore: number;
  className?: string;
}

export const MLInsightsDashboard: React.FC<MLInsightsDashboardProps> = ({
  mlAnalysis,
  currentScore,
  className = ''
}) => {
  // Prepare feature importance data for radar chart
  const featureImportanceData = Object.entries(mlAnalysis.feature_importance).map(([feature, importance]) => ({
    feature: feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    importance: importance * 100,
    current: mlAnalysis.current_features[feature] || 0,
    fullName: feature
  }));

  // Prepare current features data for comparison
  const currentFeaturesData = Object.entries(mlAnalysis.current_features).map(([feature, value]) => {
    const importance = mlAnalysis.feature_importance[feature] || 0;
    const normalizedValue = this.normalizeFeatureValue(feature, value);
    
    return {
      feature: feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: normalizedValue,
      importance: importance * 100,
      rawValue: value,
      fullName: feature
    };
  });

  // Prepare opportunities data
  const opportunitiesData = mlAnalysis.improvement_opportunities
    .sort((a, b) => b.expected_score_increase - a.expected_score_increase)
    .map((opp, index) => ({
      ...opp,
      feature_display: opp.feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      roi: opp.expected_score_increase / (opp.difficulty_score || 0.5), // Return on Investment
      color: this.getOpportunityColor(index)
    }));

  // Color schemes
  const FEATURE_COLORS = [
    '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', 
    '#EF4444', '#06B6D4', '#84CC16', '#F97316'
  ];

  const OPPORTUNITY_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

  // Helper function to normalize feature values for visualization
  function normalizeFeatureValue(feature: string, value: number): number {
    switch (feature) {
      case 'Outstanding_Debt':
      case 'Monthly_Balance':
        return Math.min(100, (value / 50000) * 100); // Normalize to 0-100 scale
      case 'Annual_Income':
        return Math.min(100, (value / 100000) * 100); // Normalize to 0-100 scale
      case 'Payment_Behaviour':
        return value; // Already 0-100
      case 'Credit_History_Age':
        return Math.min(100, (value / 120) * 100); // 120 months = 10 years = 100%
      case 'Credit_Mix':
        return (value / 2) * 100; // 0-2 scale to 0-100
      case 'Num_of_Delayed_Payment':
        return Math.max(0, 100 - (value * 10)); // Inverse scale, fewer is better
      default:
        return value;
    }
  }

  function getOpportunityColor(index: number): string {
    return OPPORTUNITY_COLORS[index % OPPORTUNITY_COLORS.length];
  }

  // Custom tooltip components
  const CustomRadarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{data.feature}</p>
          <p className="text-blue-600">
            <span className="font-medium">ML Importance: </span>
            {data.importance.toFixed(1)}%
          </p>
          <p className="text-green-600">
            <span className="font-medium">Current Level: </span>
            {data.current}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{label}</p>
          <p className="text-blue-600">
            <span className="font-medium">Expected Impact: </span>
            +{data.expected_score_increase} points
          </p>
          <p className="text-purple-600">
            <span className="font-medium">ML Impact: </span>
            {data.impact_percentage.toFixed(1)}%
          </p>
          <p className="text-orange-600">
            <span className="font-medium">Difficulty: </span>
            {((data.difficulty_score || 0.5) * 100).toFixed(0)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="w-6 h-6 text-purple-600" />
            <span>ML-Powered Credit Analysis</span>
          </CardTitle>
          <CardDescription>
            Advanced insights from our trained RandomForest model
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Brain className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(mlAnalysis.model_confidence * 100)}%
              </div>
              <div className="text-sm text-gray-600">Model Confidence</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">
                {Math.round(mlAnalysis.success_probability * 100)}%
              </div>
              <div className="text-sm text-gray-600">Success Probability</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">
                {mlAnalysis.improvement_opportunities.length}
              </div>
              <div className="text-sm text-gray-600">Opportunities</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <AlertTriangle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-600">
                {mlAnalysis.risk_factors.length}
              </div>
              <div className="text-sm text-gray-600">Risk Factors</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Importance Radar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <span>ML Feature Importance Analysis</span>
          </CardTitle>
          <CardDescription>
            How much each factor impacts your credit score according to our trained model
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={featureImportanceData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="feature" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 25]} 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Radar
                  name="ML Importance"
                  dataKey="importance"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip content={<CustomRadarTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Feature Importance Legend */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {featureImportanceData
              .sort((a, b) => b.importance - a.importance)
              .map((feature, index) => (
                <div key={feature.fullName} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">{feature.feature}</span>
                  <Badge variant="outline">{feature.importance.toFixed(1)}%</Badge>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Profile vs Optimal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            <span>Your Current Credit Profile</span>
          </CardTitle>
          <CardDescription>
            How your current features compare to optimal levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {currentFeaturesData
              .sort((a, b) => b.importance - a.importance)
              .map((feature, index) => {
                const isGood = feature.fullName === 'Payment_Behaviour' ? feature.value >= 90 :
                              feature.fullName === 'Credit_Mix' ? feature.value >= 80 :
                              feature.fullName === 'Credit_History_Age' ? feature.value >= 60 :
                              feature.fullName === 'Annual_Income' ? feature.value >= 50 :
                              feature.fullName === 'Outstanding_Debt' ? feature.value <= 30 :
                              feature.fullName === 'Num_of_Delayed_Payment' ? feature.value >= 80 :
                              feature.value >= 70;
                
                return (
                  <div key={feature.fullName} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{feature.feature}</span>
                        <Badge variant="outline">{feature.importance.toFixed(1)}% impact</Badge>
                        {isGood ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <span className="text-sm text-gray-600">
                        {feature.fullName.includes('Income') || feature.fullName.includes('Debt') || feature.fullName.includes('Balance') ?
                          `$${feature.rawValue.toLocaleString()}` :
                          feature.fullName === 'Credit_History_Age' ?
                          `${Math.round(feature.rawValue)} months` :
                          `${Math.round(feature.rawValue)}`
                        }
                      </span>
                    </div>
                    <Progress 
                      value={feature.value} 
                      className={`h-3 ${isGood ? 'bg-green-100' : 'bg-red-100'}`}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Needs Improvement</span>
                      <span>Optimal</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Top Improvement Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-yellow-600" />
            <span>Top Improvement Opportunities</span>
          </CardTitle>
          <CardDescription>
            ML-identified opportunities ranked by expected impact
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Opportunities Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={opportunitiesData.slice(0, 5)} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="feature_display" type="category" width={120} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="expected_score_increase" radius={[0, 4, 4, 0]}>
                    {opportunitiesData.slice(0, 5).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Opportunities Details */}
            <div className="space-y-3">
              {opportunitiesData.slice(0, 4).map((opp, index) => (
                <div key={opp.feature} className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: opp.color }}
                      />
                      <h4 className="font-semibold">{opp.feature_display}</h4>
                      <Badge variant="outline">{opp.impact_percentage.toFixed(1)}% ML Impact</Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-600">
                        +{opp.expected_score_increase}
                      </div>
                      <div className="text-xs text-gray-600">points</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Current:</span>
                      <div className="font-medium">
                        {opp.feature.includes('Income') || opp.feature.includes('Debt') ?
                          `$${opp.current_value.toLocaleString()}` :
                          Math.round(opp.current_value)
                        }
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Target:</span>
                      <div className="font-medium">
                        {opp.feature.includes('Income') || opp.feature.includes('Debt') ?
                          `$${opp.target_value.toLocaleString()}` :
                          Math.round(opp.target_value)
                        }
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Difficulty:</span>
                      <div className="font-medium">
                        {((opp.difficulty_score || 0.5) * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Time to Impact:</span>
                      <div className="font-medium">
                        {opp.time_to_impact || 60} days
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Progress to Target</span>
                      <span>
                        {Math.round(((opp.current_value - Math.min(opp.current_value, opp.target_value)) / 
                          Math.abs(opp.target_value - opp.current_value)) * 100)}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.round(((opp.current_value - Math.min(opp.current_value, opp.target_value)) / 
                        Math.abs(opp.target_value - opp.current_value)) * 100)}
                      className="h-2"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Factors */}
      {mlAnalysis.risk_factors.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Risk Factors Identified by ML Analysis</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-2">
              {mlAnalysis.risk_factors.map((risk, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm">{risk}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Info className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900">ML Recommendation</span>
              </div>
              <p className="text-sm text-blue-800">
                Focus on the highest-impact opportunities first. The ML model shows that addressing 
                <strong> {mlAnalysis.improvement_opportunities[0]?.feature.replace('_', ' ').toLowerCase()}</strong> 
                {' '}could provide the biggest score improvement with your current profile.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Model Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="w-5 h-5 text-gray-600" />
            <span>About This Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">ML Model Details</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• <strong>Algorithm:</strong> RandomForest Classifier</li>
                <li>• <strong>Training Data:</strong> 50,000+ credit profiles</li>
                <li>• <strong>Model Accuracy:</strong> 87% on validation set</li>
                <li>• <strong>Source:</strong> Hugging Face (roseyshi/creditscore)</li>
                <li>• <strong>Features:</strong> 7 key credit factors</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Analysis Confidence</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Model Confidence:</span>
                  <span className="font-medium">{Math.round(mlAnalysis.model_confidence * 100)}%</span>
                </div>
                <Progress value={mlAnalysis.model_confidence * 100} />
                
                <div className="flex justify-between">
                  <span className="text-sm">Success Probability:</span>
                  <span className="font-medium">{Math.round(mlAnalysis.success_probability * 100)}%</span>
                </div>
                <Progress value={mlAnalysis.success_probability * 100} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MLInsightsDashboard;

