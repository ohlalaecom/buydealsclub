import { useState, useEffect } from 'react';
import { Search, TrendingUp, MapPin, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SearchInsight {
  query: string;
  count: number;
  category: string;
  avgPrice: number;
  location: string;
}

export function VendorSearchInsights() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<SearchInsight[]>([]);
  const [vendorCategory, setVendorCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSearchInsights();
    }
  }, [user]);

  const loadSearchInsights = async () => {
    if (!user) return;

    try {
      const { data: vendorDeals } = await supabase
        .from('deals')
        .select('category_id')
        .eq('vendor_id', user.id)
        .limit(1)
        .single();

      let category = 'all';
      if (vendorDeals?.category_id) {
        setVendorCategory(vendorDeals.category_id);
        category = getCategoryName(vendorDeals.category_id);
      }

      const { data: searchData } = await supabase
        .from('vendor_search_insights')
        .select('*')
        .eq('vendor_id', user.id)
        .order('search_count', { ascending: false })
        .limit(20);

      if (searchData) {
        const formatted = searchData.map(item => ({
          query: item.search_query,
          count: item.search_count,
          category: item.category || 'general',
          avgPrice: item.avg_price_mentioned || 0,
          location: item.location || 'Cyprus'
        }));
        setInsights(formatted);
      }

      if (searchData?.length === 0) {
        const { data: unmetRequests } = await supabase
          .from('unmet_requests')
          .select('search_query, category_suggested, location')
          .eq('category_suggested', category)
          .order('created_at', { ascending: false })
          .limit(20);

        if (unmetRequests) {
          const grouped = unmetRequests.reduce((acc: any, req) => {
            const key = req.search_query.toLowerCase();
            if (!acc[key]) {
              acc[key] = {
                query: req.search_query,
                count: 0,
                category: req.category_suggested || 'general',
                avgPrice: 0,
                location: req.location || 'Cyprus'
              };
            }
            acc[key].count++;
            return acc;
          }, {});

          const formatted = Object.values(grouped) as SearchInsight[];
          formatted.sort((a, b) => b.count - a.count);
          setInsights(formatted);
        }
      }
    } catch (error) {
      console.error('Error loading search insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (categoryId: number): string => {
    const categories: { [key: number]: string } = {
      1: 'hotels',
      2: 'spa_wellness',
      3: 'experiences',
      4: 'dining',
      5: 'retail'
    };
    return categories[categoryId] || 'general';
  };

  const getCategoryColor = (category: string): string => {
    const colors: { [key: string]: string } = {
      hotels: 'bg-blue-100 text-blue-800',
      spa_wellness: 'bg-purple-100 text-purple-800',
      experiences: 'bg-orange-100 text-orange-800',
      dining: 'bg-red-100 text-red-800',
      retail: 'bg-green-100 text-green-800',
      general: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.general;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading search insights...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Search Insights</h2>
        <p className="text-gray-600">
          What customers are searching for in your category
        </p>
      </div>

      {insights.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No search data yet</h3>
          <p className="text-gray-600">
            Search insights will appear here once customers start searching for deals in your category.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <TrendingUp className="w-4 h-4" />
              <span>Showing top {insights.length} searches related to your business</span>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {insights.map((insight, index) => (
              <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                        {index + 1}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {insight.query}
                      </h3>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Search className="w-4 h-4" />
                        <span>{insight.count} {insight.count === 1 ? 'search' : 'searches'}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Tag className="w-4 h-4 text-gray-400" />
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getCategoryColor(insight.category)}`}>
                          {insight.category.replace('_', ' ')}
                        </span>
                      </div>

                      {insight.location && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>{insight.location}</span>
                        </div>
                      )}

                      {insight.avgPrice > 0 && (
                        <div className="text-sm font-semibold text-green-600">
                          ~€{insight.avgPrice.toFixed(0)} avg. budget
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                      insight.count > 10 ? 'bg-red-100' :
                      insight.count > 5 ? 'bg-orange-100' :
                      'bg-yellow-100'
                    }`}>
                      <div className="text-center">
                        <div className={`text-xs font-semibold ${
                          insight.count > 10 ? 'text-red-600' :
                          insight.count > 5 ? 'text-orange-600' :
                          'text-yellow-600'
                        }`}>
                          {insight.count > 10 ? 'HIGH' :
                           insight.count > 5 ? 'MED' :
                           'LOW'}
                        </div>
                        <div className="text-xs text-gray-500">demand</div>
                      </div>
                    </div>
                  </div>
                </div>

                {insight.count >= 5 && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-900">
                      <span className="font-semibold">💡 Opportunity:</span> High demand for this search term. Consider creating a deal that matches this customer need.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-bold text-blue-900 mb-2">How to use these insights</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="font-bold">1.</span>
            <span>Look for high-demand searches (5+ searches) in your category</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">2.</span>
            <span>Check the average budget customers are mentioning</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">3.</span>
            <span>Create deals that match these search terms and price points</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">4.</span>
            <span>Use location data to target specific areas</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
