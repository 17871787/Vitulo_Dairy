'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  LineChart, 
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell 
} from 'recharts';
import { 
  TrendingUp, 
  Award, 
  Scale, 
  Loader2,
  Info
} from 'lucide-react';
import { formatCurrency, formatBreed } from '@/lib/utils';

interface PerformanceMetrics {
  totalSlaughtered: number;
  averageDeadweight: number;
  averageCarcassValue: number;
  gradeDistribution: Record<string, number>;
  conformationDistribution: Record<string, number>;
  fatClassDistribution: Record<string, number>;
  breedPerformance: Record<string, any>;
  monthlyTrends: any[];
}

interface Benchmarks {
  deadweight: number;
  topGradePercentage: number;
  averageCarcassValue: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function PerformancePage() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [benchmarks, setBenchmarks] = useState<Benchmarks | null>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformance();
  }, []);

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dairy/performance');
      if (!response.ok) throw new Error('Failed to fetch performance');
      const data = await response.json();
      setMetrics(data.metrics);
      setBenchmarks(data.benchmarks);
      setComparison(data.comparison);
    } catch (error) {
      console.error('Error fetching performance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!metrics || metrics.totalSlaughtered === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Performance Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Track how your calves perform at slaughter
          </p>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <Info className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">
              No slaughter data available yet. Performance metrics will appear here once your calves have been processed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prepare data for charts
  const gradeData = Object.entries(metrics.gradeDistribution).map(([grade, count]) => ({
    name: grade,
    value: count,
  }));

  const conformationData = Object.entries(metrics.conformationDistribution).map(([grade, count]) => ({
    name: grade,
    value: count,
  }));

  const breedData = Object.entries(metrics.breedPerformance).map(([breed, data]) => ({
    breed: formatBreed(breed),
    deadweight: data.averageDeadweight.toFixed(1),
    value: data.averageCarcassValue.toFixed(0),
    count: data.count,
  }));

  const getComparisonColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Performance Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Track how your calves perform at slaughter
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Scale className="h-4 w-4 text-blue-600" />
              <div className="text-sm font-medium text-gray-600">Calves Slaughtered</div>
            </div>
            <div className="text-2xl font-bold mt-2">{metrics.totalSlaughtered}</div>
            <p className="text-xs text-gray-500 mt-1">Last 12 months</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div className="text-sm font-medium text-gray-600">Avg Deadweight</div>
            </div>
            <div className="text-2xl font-bold mt-2">
              {metrics.averageDeadweight.toFixed(1)}kg
            </div>
            {comparison && (
              <p className={`text-xs mt-1 ${getComparisonColor(comparison.deadweightPercent)}`}>
                {comparison.deadweightPercent > 0 ? '+' : ''}{comparison.deadweightPercent.toFixed(1)}% vs benchmark
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Award className="h-4 w-4 text-purple-600" />
              <div className="text-sm font-medium text-gray-600">Avg Carcass Value</div>
            </div>
            <div className="text-2xl font-bold mt-2">
              {formatCurrency(metrics.averageCarcassValue)}
            </div>
            {comparison && (
              <p className={`text-xs mt-1 ${getComparisonColor(comparison.carcassValuePercent)}`}>
                {comparison.carcassValuePercent > 0 ? '+' : ''}{comparison.carcassValuePercent.toFixed(1)}% vs benchmark
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Award className="h-4 w-4 text-yellow-600" />
              <div className="text-sm font-medium text-gray-600">Top Grades</div>
            </div>
            <div className="text-2xl font-bold mt-2">
              {Object.entries(metrics.gradeDistribution)
                .filter(([grade]) => ['R3', 'R4', 'U3', 'U4', 'E3', 'E4'].includes(grade))
                .reduce((sum, [, count]) => sum + count, 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">R3+ or U3+</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Grade Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Grade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={gradeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {gradeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conformation Classes */}
        <Card>
          <CardHeader>
            <CardTitle>Conformation Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conformationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Breed Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Breed</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={breedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="breed" />
              <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
              <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="deadweight" fill="#3b82f6" name="Avg Deadweight (kg)" />
              <Bar yAxisId="right" dataKey="value" fill="#10b981" name="Avg Value (£)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Trends */}
      {metrics.monthlyTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="averageDeadweight" 
                  stroke="#3b82f6" 
                  name="Avg Deadweight (kg)"
                />
                <Line 
                  type="monotone" 
                  dataKey="averageCarcassValue" 
                  stroke="#10b981" 
                  name="Avg Value (£)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Benchmark Comparison */}
      {benchmarks && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Info className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-blue-900">Industry Benchmarks</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-blue-700 font-medium">Target Deadweight</p>
                <p className="text-xl font-bold text-blue-900">{benchmarks.deadweight}kg</p>
                <p className="text-sm text-blue-600">
                  Your avg: {metrics.averageDeadweight.toFixed(1)}kg
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-700 font-medium">Target Carcass Value</p>
                <p className="text-xl font-bold text-blue-900">
                  {formatCurrency(benchmarks.averageCarcassValue)}
                </p>
                <p className="text-sm text-blue-600">
                  Your avg: {formatCurrency(metrics.averageCarcassValue)}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-700 font-medium">Top Grade Target</p>
                <p className="text-xl font-bold text-blue-900">{benchmarks.topGradePercentage}%</p>
                <p className="text-sm text-blue-600">
                  Achieve R3 or better
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
