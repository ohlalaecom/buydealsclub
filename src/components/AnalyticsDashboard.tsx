import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, Eye, ShoppingCart, Heart, Bell, MessageSquare } from 'lucide-react';

interface DashboardMetrics {
  totalViews: number;
  totalClicks: number;
  totalPurchases: number;
  totalWishlists: number;
  conversionRate: number;
  topDeals: Array<{
    id: string;
    title: string;
    smart_score: number;
    view_count: number;
    purchase_count: number;
  }>;
  unmetRequests: Array<{
    category: string;
    count: number;
  }>;
}

export function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const { data: events } = await supabase
        .from('events')
        .select('event_type')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const { data: topDeals } = await supabase
        .from('deal_metrics')
        .select('deal_id, view_count, purchase_count, smart_score')
        .order('smart_score', { ascending: false })
        .limit(5);

      const { data: deals } = await supabase
        .from('deals')
        .select('id, title')
        .in('id', topDeals?.map(d => d.deal_id) || []);

      const { data: requests } = await supabase
        .from('unmet_requests')
        .select('category')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const viewCount = events?.filter(e => e.event_type === 'view_deal').length || 0;
      const clickCount = events?.filter(e => e.event_type === 'click_buy_now').length || 0;
      const purchaseCount = events?.filter(e => e.event_type === 'complete_purchase').length || 0;
      const wishlistCount = events?.filter(e => e.event_type === 'add_to_wishlist').length || 0;

      const requestsByCategory = requests?.reduce((acc: Record<string, number>, req) => {
        acc[req.category] = (acc[req.category] || 0) + 1;
        return acc;
      }, {}) || {};

      const enrichedTopDeals = topDeals?.map(metric => {
        const deal = deals?.find(d => d.id === metric.deal_id);
        return {
          id: metric.deal_id,
          title: deal?.title || 'Unknown',
          smart_score: metric.smart_score,
          view_count: metric.view_count,
          purchase_count: metric.purchase_count
        };
      }) || [];

      setMetrics({
        totalViews: viewCount,
        totalClicks: clickCount,
        totalPurchases: purchaseCount,
        totalWishlists: wishlistCount,
        conversionRate: viewCount > 0 ? (purchaseCount / viewCount) * 100 : 0,
        topDeals: enrichedTopDeals,
        unmetRequests: Object.entries(requestsByCategory).map(([category, count]) => ({
          category,
          count
        }))
      });
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <button
          onClick={loadMetrics}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Eye}
          label="Total Views"
          value={metrics.totalViews}
          color="blue"
        />
        <MetricCard
          icon={ShoppingCart}
          label="Clicks"
          value={metrics.totalClicks}
          color="green"
        />
        <MetricCard
          icon={TrendingUp}
          label="Purchases"
          value={metrics.totalPurchases}
          color="purple"
        />
        <MetricCard
          icon={Heart}
          label="Wishlists"
          value={metrics.totalWishlists}
          color="red"
        />
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Conversion Rate</h3>
          <span className="text-3xl font-bold text-green-600">
            {metrics.conversionRate.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Top Performing Deals</h3>
        <div className="space-y-3">
          {metrics.topDeals.map((deal, index) => (
            <div
              key={deal.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                <div>
                  <p className="font-medium">{deal.title}</p>
                  <p className="text-sm text-gray-600">
                    {deal.view_count} views • {deal.purchase_count} purchases
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Smart Score</p>
                <p className="text-xl font-bold text-blue-600">{deal.smart_score.toFixed(1)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Unmet Customer Requests (Last 7 Days)
        </h3>
        <div className="space-y-2">
          {metrics.unmetRequests.map(req => (
            <div
              key={req.category}
              className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg"
            >
              <span className="font-medium capitalize">{req.category}</span>
              <span className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded-full text-sm font-semibold">
                {req.count} requests
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }: {
  icon: any;
  label: string;
  value: number;
  color: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600'
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className={`w-12 h-12 rounded-lg ${colorClasses[color as keyof typeof colorClasses]} flex items-center justify-center mb-3`}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-3xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}
