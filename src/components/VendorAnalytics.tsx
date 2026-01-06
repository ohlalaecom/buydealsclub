import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, DollarSign, Eye, ShoppingCart, Target, MapPin } from 'lucide-react';

interface VendorMetrics {
  totalSales: number;
  totalRevenue: number;
  conversionRate: number;
  totalViews: number;
  totalClicks: number;
}

interface DealPerformance {
  id: string;
  title: string;
  sales: number;
  revenue: number;
  views: number;
  conversionRate: number;
}

interface SearchInsight {
  query: string;
  count: number;
  category: string;
}

interface PricingRecommendation {
  category: string;
  minPrice: number;
  maxPrice: number;
  demandCount: number;
}

export function VendorAnalytics() {
  const [metrics, setMetrics] = useState<VendorMetrics | null>(null);
  const [dealPerformance, setDealPerformance] = useState<DealPerformance[]>([]);
  const [searchInsights, setSearchInsights] = useState<SearchInsight[]>([]);
  const [pricingRecs, setPricingRecs] = useState<PricingRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVendorData();
  }, []);

  const loadVendorData = async () => {
    try {
      const { data: deals } = await supabase
        .from('deals')
        .select('id, title, sold_quantity, deal_price')
        .eq('is_active', true);

      const { data: metrics } = await supabase
        .from('deal_metrics')
        .select('deal_id, view_count, click_count, purchase_count');

      const metricsMap = new Map(
        metrics?.map(m => [m.deal_id, m]) || []
      );

      let totalSales = 0;
      let totalRevenue = 0;
      let totalViews = 0;
      let totalClicks = 0;

      const performance: DealPerformance[] = deals?.map(deal => {
        const metric = metricsMap.get(deal.id);
        const views = metric?.view_count || 0;
        const sales = metric?.purchase_count || 0;
        const revenue = sales * deal.deal_price;

        totalSales += sales;
        totalRevenue += revenue;
        totalViews += views;
        totalClicks += metric?.click_count || 0;

        return {
          id: deal.id,
          title: deal.title,
          sales,
          revenue,
          views,
          conversionRate: views > 0 ? (sales / views) * 100 : 0
        };
      }) || [];

      performance.sort((a, b) => b.sales - a.sales);

      setMetrics({
        totalSales,
        totalRevenue,
        conversionRate: totalViews > 0 ? (totalSales / totalViews) * 100 : 0,
        totalViews,
        totalClicks
      });

      setDealPerformance(performance.slice(0, 5));

      const { data: unmetRequests } = await supabase
        .from('unmet_requests')
        .select('message, category_suggested')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .limit(50);

      const queryMap = new Map<string, { count: number; category: string }>();
      unmetRequests?.forEach(req => {
        const query = req.message.toLowerCase();
        const existing = queryMap.get(query);
        if (existing) {
          existing.count++;
        } else {
          queryMap.set(query, {
            count: 1,
            category: req.category_suggested || 'general'
          });
        }
      });

      const insights: SearchInsight[] = Array.from(queryMap.entries())
        .map(([query, data]) => ({ query, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setSearchInsights(insights);

      const { data: marketDemand } = await supabase
        .from('market_demand')
        .select('category, demand_count, avg_price_min, avg_price_max')
        .order('demand_count', { ascending: false });

      const recommendations: PricingRecommendation[] = marketDemand?.map(demand => ({
        category: demand.category,
        minPrice: demand.avg_price_min || 20,
        maxPrice: demand.avg_price_max || 100,
        demandCount: demand.demand_count
      })) || [];

      setPricingRecs(recommendations);

    } catch (error) {
      console.error('Failed to load vendor data:', error);
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
        <h2 className="text-2xl font-bold">Vendor Performance Dashboard</h2>
        <button
          onClick={loadVendorData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={ShoppingCart}
          label="Total Sales"
          value={metrics.totalSales}
          color="blue"
        />
        <MetricCard
          icon={DollarSign}
          label="Total Revenue"
          value={`€${metrics.totalRevenue.toFixed(2)}`}
          color="green"
        />
        <MetricCard
          icon={Eye}
          label="Total Views"
          value={metrics.totalViews}
          color="purple"
        />
        <MetricCard
          icon={Target}
          label="Conversion Rate"
          value={`${metrics.conversionRate.toFixed(2)}%`}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Top Performing Deals</h3>
          <div className="space-y-3">
            {dealPerformance.map((deal, index) => (
              <div
                key={deal.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                  <div>
                    <p className="font-medium">{deal.title}</p>
                    <p className="text-sm text-gray-600">
                      {deal.sales} sales • {deal.views} views
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">
                    €{deal.revenue.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {deal.conversionRate.toFixed(1)}% CVR
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            What Customers Are Searching For
          </h3>
          <div className="space-y-2">
            {searchInsights.map((insight, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 capitalize">
                    {insight.query}
                  </p>
                  <p className="text-xs text-gray-600 capitalize">
                    {insight.category.replace('_', ' ')}
                  </p>
                </div>
                <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-semibold">
                  {insight.count}x
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold">Recommended Pricing Based on Demand</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pricingRecs.map((rec, index) => (
            <div
              key={index}
              className="bg-white rounded-lg p-4 border-2 border-green-200"
            >
              <p className="font-semibold text-gray-900 capitalize mb-2">
                {rec.category.replace('_', ' & ')}
              </p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-green-600">
                  €{rec.minPrice}
                </span>
                <span className="text-gray-600">-</span>
                <span className="text-2xl font-bold text-green-600">
                  €{rec.maxPrice}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {rec.demandCount} customers interested
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-900 font-medium">
            💡 Pro Tip: Price your deals within these ranges to maximize conversion based on real customer demand data
          </p>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className={`w-12 h-12 rounded-lg ${colorClasses[color as keyof typeof colorClasses]} flex items-center justify-center mb-3`}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
