import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Lightbulb, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SuccessMetrics {
  conversionRate: number;
  averageRating: number;
  responseRate: number;
  stockHealth: number;
  priceCompetitiveness: number;
  overallScore: number;
}

interface Recommendation {
  type: 'critical' | 'warning' | 'success' | 'tip';
  title: string;
  description: string;
  action: string;
}

export function VendorSuccessMetrics() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<SuccessMetrics>({
    conversionRate: 0,
    averageRating: 0,
    responseRate: 0,
    stockHealth: 0,
    priceCompetitiveness: 0,
    overallScore: 0
  });
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      calculateMetrics();
    }
  }, [user]);

  const calculateMetrics = async () => {
    if (!user) return;

    try {
      const { data: deals } = await supabase
        .from('deals')
        .select('*')
        .eq('vendor_id', user.id);

      const { data: reviews } = await supabase
        .from('product_reviews')
        .select('rating, vendor_response, deals!inner(vendor_id)')
        .eq('deals.vendor_id', user.id);

      const dealIds = deals?.map(d => d.id) || [];
      const { data: metricsData } = await supabase
        .from('deal_metrics')
        .select('*')
        .in('deal_id', dealIds);

      let conversionRate = 0;
      let averageRating = 0;
      let responseRate = 0;
      let stockHealth = 0;
      let priceCompetitiveness = 70;

      if (metricsData && deals) {
        const totalViews = metricsData.reduce((sum, m) => sum + (m.view_count || 0), 0);
        const totalSold = deals.reduce((sum, d) => sum + d.sold_quantity, 0);
        conversionRate = totalViews > 0 ? (totalSold / totalViews) * 100 : 0;

        const stockUtilization = deals.map(d =>
          d.stock_quantity > 0 ? (d.sold_quantity / d.stock_quantity) * 100 : 0
        );
        stockHealth = stockUtilization.length > 0
          ? stockUtilization.reduce((a, b) => a + b, 0) / stockUtilization.length
          : 0;
      }

      if (reviews) {
        averageRating = reviews.length > 0
          ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 20
          : 0;

        const responded = reviews.filter(r => r.vendor_response).length;
        responseRate = reviews.length > 0 ? (responded / reviews.length) * 100 : 0;
      }

      const overallScore = (
        (conversionRate * 0.3) +
        (averageRating * 0.25) +
        (responseRate * 0.15) +
        (stockHealth * 0.15) +
        (priceCompetitiveness * 0.15)
      );

      setMetrics({
        conversionRate,
        averageRating,
        responseRate,
        stockHealth,
        priceCompetitiveness,
        overallScore
      });

      generateRecommendations({
        conversionRate,
        averageRating,
        responseRate,
        stockHealth,
        priceCompetitiveness
      });
    } catch (error) {
      console.error('Error calculating metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = (m: Omit<SuccessMetrics, 'overallScore'>) => {
    const recs: Recommendation[] = [];

    if (m.conversionRate < 2) {
      recs.push({
        type: 'critical',
        title: 'Low Conversion Rate',
        description: `Your conversion rate is ${m.conversionRate.toFixed(2)}%, which is below the 3% target. This means customers are viewing but not buying.`,
        action: 'Review your pricing, improve product descriptions, and add better images.'
      });
    } else if (m.conversionRate < 3) {
      recs.push({
        type: 'warning',
        title: 'Conversion Rate Needs Improvement',
        description: 'You\'re getting close to the 3% target, but there\'s still room for improvement.',
        action: 'Test different price points and enhance your deal descriptions.'
      });
    }

    if (m.averageRating < 60) {
      recs.push({
        type: 'critical',
        title: 'Low Customer Ratings',
        description: 'Your average rating is below 3 stars. This severely impacts trust and sales.',
        action: 'Focus on product quality, customer service, and addressing negative reviews.'
      });
    } else if (m.averageRating < 80) {
      recs.push({
        type: 'warning',
        title: 'Rating Could Be Higher',
        description: 'Aim for 4+ stars to build strong customer trust.',
        action: 'Follow up with customers and ensure product quality matches expectations.'
      });
    }

    if (m.responseRate < 50) {
      recs.push({
        type: 'warning',
        title: 'Low Review Response Rate',
        description: 'Responding to reviews shows customers you care and builds trust.',
        action: 'Aim to respond to 80%+ of reviews within 24-48 hours.'
      });
    }

    if (m.stockHealth < 30) {
      recs.push({
        type: 'warning',
        title: 'Underutilized Stock',
        description: 'You\'re not selling through your inventory efficiently.',
        action: 'Consider reducing stock quantities or improving marketing.'
      });
    } else if (m.stockHealth > 90) {
      recs.push({
        type: 'tip',
        title: 'High Stock Turnover',
        description: 'Your deals are selling out quickly!',
        action: 'Consider increasing stock quantities to capture more sales.'
      });
    }

    if (m.conversionRate >= 3 && m.averageRating >= 80 && m.responseRate >= 80) {
      recs.push({
        type: 'success',
        title: 'Excellent Performance!',
        description: 'You\'re hitting all the key metrics. Keep up the great work!',
        action: 'Continue monitoring your metrics and maintaining quality standards.'
      });
    }

    recs.push({
      type: 'tip',
      title: 'Use Search Insights',
      description: 'Check what customers are searching for in your category.',
      action: 'Visit the Search Insights tab to create deals matching customer demand.'
    });

    setRecommendations(recs);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Work';
    return 'Critical';
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <Lightbulb className="w-5 h-5 text-blue-600" />;
    }
  };

  const getRecommendationColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Analyzing your performance...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Success Metrics</h2>
        <p className="text-gray-600">Track your performance and get personalized recommendations</p>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold mb-1">Overall Success Score</h3>
            <p className="text-blue-100">Based on 5 key performance indicators</p>
          </div>
          <Target className="w-12 h-12 text-blue-200" />
        </div>
        <div className="flex items-end gap-4">
          <div className="text-6xl font-bold">{metrics.overallScore.toFixed(0)}</div>
          <div className="text-2xl font-semibold mb-2">/100</div>
          <div className="mb-2 ml-4">
            <div className={`inline-block px-4 py-2 rounded-lg font-bold bg-white ${getScoreColor(metrics.overallScore)}`}>
              {getScoreLabel(metrics.overallScore)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Conversion Rate"
          value={`${metrics.conversionRate.toFixed(2)}%`}
          target="Target: 3%+"
          score={metrics.conversionRate}
          benchmark={3}
        />
        <MetricCard
          title="Average Rating"
          value={`${(metrics.averageRating / 20).toFixed(1)}/5.0`}
          target="Target: 4.0+"
          score={metrics.averageRating}
          benchmark={80}
        />
        <MetricCard
          title="Review Response"
          value={`${metrics.responseRate.toFixed(0)}%`}
          target="Target: 80%+"
          score={metrics.responseRate}
          benchmark={80}
        />
        <MetricCard
          title="Stock Health"
          value={`${metrics.stockHealth.toFixed(0)}%`}
          target="Target: 60-90%"
          score={metrics.stockHealth}
          benchmark={60}
        />
        <MetricCard
          title="Price Competitiveness"
          value={`${metrics.priceCompetitiveness.toFixed(0)}%`}
          target="Market aligned"
          score={metrics.priceCompetitiveness}
          benchmark={70}
        />
      </div>

      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Personalized Recommendations</h3>
        <div className="space-y-4">
          {recommendations.map((rec, index) => (
            <div key={index} className={`border rounded-xl p-6 ${getRecommendationColor(rec.type)}`}>
              <div className="flex items-start gap-4">
                {getRecommendationIcon(rec.type)}
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 mb-2">{rec.title}</h4>
                  <p className="text-gray-700 mb-3">{rec.description}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold">💡 Action:</span>
                    <span className="text-gray-800">{rec.action}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, target, score, benchmark }: {
  title: string;
  value: string;
  target: string;
  score: number;
  benchmark: number;
}) {
  const isAboveBenchmark = score >= benchmark;
  const Icon = isAboveBenchmark ? TrendingUp : TrendingDown;
  const iconColor = isAboveBenchmark ? 'text-green-600' : 'text-red-600';

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-600">{title}</h4>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-2">{value}</div>
      <div className="text-xs text-gray-500">{target}</div>
      <div className="mt-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${isAboveBenchmark ? 'bg-green-600' : 'bg-red-600'}`}
            style={{ width: `${Math.min(score, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
