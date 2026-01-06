import { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Package,
  Eye,
  MousePointer,
  ShoppingCart,
  BarChart3,
  Plus
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface VendorStats {
  totalDeals: number;
  totalSales: number;
  totalRevenue: number;
  totalViews: number;
  totalClicks: number;
  conversionRate: number;
}

interface DealPerformance {
  id: string;
  title: string;
  sold_quantity: number;
  stock_quantity: number;
  deal_price: number;
  revenue: number;
  views: number;
  clicks: number;
  conversion: number;
}

export function VendorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<VendorStats>({
    totalDeals: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalViews: 0,
    totalClicks: 0,
    conversionRate: 0
  });
  const [deals, setDeals] = useState<DealPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadVendorData();
    }
  }, [user]);

  const loadVendorData = async () => {
    if (!user) return;

    try {
      const { data: vendorProfile } = await supabase
        .from('vendor_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const { data: vendorDeals } = await supabase
        .from('deals')
        .select(`
          id,
          title,
          sold_quantity,
          stock_quantity,
          deal_price,
          created_at
        `)
        .eq('vendor_id', user.id)
        .order('created_at', { ascending: false });

      if (vendorDeals) {
        const dealIds = vendorDeals.map(d => d.id);

        const { data: metricsData } = await supabase
          .from('deal_metrics')
          .select('*')
          .in('deal_id', dealIds);

        const metricsMap = new Map(
          metricsData?.map(m => [m.deal_id, m]) || []
        );

        let totalViews = 0;
        let totalClicks = 0;

        const dealsWithMetrics = vendorDeals.map(deal => {
          const metrics = metricsMap.get(deal.id);
          const views = metrics?.view_count || 0;
          const clicks = metrics?.click_count || 0;
          const revenue = deal.sold_quantity * deal.deal_price;
          const conversion = views > 0 ? (deal.sold_quantity / views * 100) : 0;

          totalViews += views;
          totalClicks += clicks;

          return {
            id: deal.id,
            title: deal.title,
            sold_quantity: deal.sold_quantity,
            stock_quantity: deal.stock_quantity,
            deal_price: deal.deal_price,
            revenue,
            views,
            clicks,
            conversion
          };
        });

        const conversionRate = totalViews > 0
          ? (vendorProfile?.total_sales || 0) / totalViews * 100
          : 0;

        setStats({
          totalDeals: vendorDeals.length,
          totalSales: vendorProfile?.total_sales || 0,
          totalRevenue: vendorProfile?.total_revenue || 0,
          totalViews,
          totalClicks,
          conversionRate
        });

        setDeals(dealsWithMetrics);
      }
    } catch (error) {
      console.error('Error loading vendor data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendor Dashboard</h1>
          <p className="text-gray-600 mt-1">Track your performance and insights</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold">
          <Plus className="w-5 h-5" />
          Create Deal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Total Deals</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalDeals}</div>
          <p className="text-sm text-gray-600 mt-1">Active listings</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Total Sales</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalSales}</div>
          <p className="text-sm text-gray-600 mt-1">Units sold</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">Total Revenue</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            €{stats.totalRevenue.toFixed(2)}
          </div>
          <p className="text-sm text-gray-600 mt-1">All-time earnings</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-yellow-600" />
            </div>
            <span className="text-sm text-gray-500">Total Views</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {stats.totalViews.toLocaleString()}
          </div>
          <p className="text-sm text-gray-600 mt-1">Deal page views</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <MousePointer className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-sm text-gray-500">Total Clicks</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {stats.totalClicks.toLocaleString()}
          </div>
          <p className="text-sm text-gray-600 mt-1">Buy button clicks</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-sm text-gray-500">Conversion Rate</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {stats.conversionRate.toFixed(2)}%
          </div>
          <p className="text-sm text-gray-600 mt-1">Views to sales</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-6 h-6 text-gray-700" />
          <h2 className="text-xl font-bold text-gray-900">Deal Performance</h2>
        </div>

        {deals.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No deals yet</p>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              Create Your First Deal
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Deal</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Sold</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Stock</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Price</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Revenue</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Views</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Clicks</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Conv %</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => (
                  <tr key={deal.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900">{deal.title}</div>
                    </td>
                    <td className="py-4 px-4 text-right text-gray-900">
                      {deal.sold_quantity}
                    </td>
                    <td className="py-4 px-4 text-right text-gray-600">
                      {deal.stock_quantity}
                    </td>
                    <td className="py-4 px-4 text-right text-gray-900">
                      €{deal.deal_price.toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-green-600">
                      €{deal.revenue.toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-right text-gray-600">
                      {deal.views.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right text-gray-600">
                      {deal.clicks.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={`font-semibold ${
                        deal.conversion > 5 ? 'text-green-600' :
                        deal.conversion > 2 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {deal.conversion.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
