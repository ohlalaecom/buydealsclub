import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, AlertCircle, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PricingData {
  category: string;
  demandCount: number;
  avgPriceMentioned: number;
  minPrice: number;
  maxPrice: number;
  recommendedPrice: number;
}

export function VendorPricingRecommendations() {
  const { user } = useAuth();
  const [pricingData, setPricingData] = useState<PricingData[]>([]);
  const [vendorCategory, setVendorCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPricingData();
    }
  }, [user]);

  const loadPricingData = async () => {
    if (!user) return;

    try {
      const { data: vendorDeals } = await supabase
        .from('deals')
        .select('category_id')
        .eq('vendor_id', user.id)
        .limit(1)
        .single();

      let categoryName = 'general';
      if (vendorDeals?.category_id) {
        categoryName = getCategoryName(vendorDeals.category_id);
        setVendorCategory(categoryName);
      }

      const { data: marketData } = await supabase
        .from('market_demand')
        .select('*')
        .eq('category', categoryName)
        .order('demand_count', { ascending: false });

      if (marketData && marketData.length > 0) {
        const formatted: PricingData[] = marketData.map(item => ({
          category: item.category,
          demandCount: item.demand_count || 0,
          avgPriceMentioned: item.avg_price_mentioned || 0,
          minPrice: item.min_price_mentioned || 0,
          maxPrice: item.max_price_mentioned || 0,
          recommendedPrice: calculateRecommendedPrice(item)
        }));
        setPricingData(formatted);
      } else {
        const defaultPricing = getDefaultPricing(categoryName);
        setPricingData([defaultPricing]);
      }
    } catch (error) {
      console.error('Error loading pricing data:', error);
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

  const calculateRecommendedPrice = (item: any): number => {
    if (item.avg_price_mentioned > 0) {
      return Math.round(item.avg_price_mentioned * 0.7);
    }
    if (item.min_price_mentioned > 0 && item.max_price_mentioned > 0) {
      return Math.round((item.min_price_mentioned + item.max_price_mentioned) / 2 * 0.7);
    }
    return 0;
  };

  const getDefaultPricing = (category: string): PricingData => {
    const defaults: { [key: string]: PricingData } = {
      hotels: {
        category: 'hotels',
        demandCount: 0,
        avgPriceMentioned: 120,
        minPrice: 60,
        maxPrice: 200,
        recommendedPrice: 84
      },
      spa_wellness: {
        category: 'spa_wellness',
        demandCount: 0,
        avgPriceMentioned: 80,
        minPrice: 40,
        maxPrice: 150,
        recommendedPrice: 56
      },
      experiences: {
        category: 'experiences',
        demandCount: 0,
        avgPriceMentioned: 100,
        minPrice: 50,
        maxPrice: 180,
        recommendedPrice: 70
      },
      dining: {
        category: 'dining',
        demandCount: 0,
        avgPriceMentioned: 60,
        minPrice: 25,
        maxPrice: 120,
        recommendedPrice: 42
      },
      retail: {
        category: 'retail',
        demandCount: 0,
        avgPriceMentioned: 50,
        minPrice: 20,
        maxPrice: 100,
        recommendedPrice: 35
      }
    };
    return defaults[category] || defaults.retail;
  };

  const getDemandLevel = (count: number): { label: string; color: string } => {
    if (count >= 20) return { label: 'Very High', color: 'text-red-600 bg-red-100' };
    if (count >= 10) return { label: 'High', color: 'text-orange-600 bg-orange-100' };
    if (count >= 5) return { label: 'Medium', color: 'text-yellow-600 bg-yellow-100' };
    return { label: 'Low', color: 'text-gray-600 bg-gray-100' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading pricing recommendations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pricing Recommendations</h2>
        <p className="text-gray-600">
          Data-driven pricing insights based on customer demand
        </p>
      </div>

      {pricingData.map((data, index) => {
        const demandLevel = getDemandLevel(data.demandCount);

        return (
          <div key={index} className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold capitalize mb-1">
                    {data.category.replace('_', ' & ')}
                  </h3>
                  <p className="text-blue-100">Your category pricing insights</p>
                </div>
                <div className="text-right">
                  <div className={`inline-block px-4 py-2 rounded-lg font-semibold ${demandLevel.color}`}>
                    {demandLevel.label} Demand
                  </div>
                  {data.demandCount > 0 && (
                    <div className="text-sm text-blue-100 mt-2">
                      {data.demandCount} customer searches
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2">Min Price Range</div>
                  <div className="text-3xl font-bold text-gray-900">
                    €{data.minPrice > 0 ? data.minPrice.toFixed(0) : '25'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Lower bound</div>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-green-600" />
                    <div className="text-sm font-semibold text-green-900">Recommended Deal Price</div>
                  </div>
                  <div className="text-4xl font-bold text-green-600">
                    €{data.recommendedPrice > 0 ? data.recommendedPrice.toFixed(0) : '35'}
                  </div>
                  <div className="text-xs text-green-700 mt-1">30% off market average</div>
                </div>

                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2">Max Price Range</div>
                  <div className="text-3xl font-bold text-gray-900">
                    €{data.maxPrice > 0 ? data.maxPrice.toFixed(0) : '100'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Upper bound</div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-2">Pricing Strategy Insights</p>
                    <ul className="space-y-1 ml-4 list-disc">
                      <li>
                        Customers typically search for deals between €{data.minPrice > 0 ? data.minPrice : 25} - €{data.maxPrice > 0 ? data.maxPrice : 100}
                      </li>
                      <li>
                        Average customer budget: €{data.avgPriceMentioned > 0 ? data.avgPriceMentioned.toFixed(0) : '50'}
                      </li>
                      <li>
                        Sweet spot for conversions: €{data.recommendedPrice > 0 ? data.recommendedPrice : 35} (30% discount)
                      </li>
                      <li>
                        Price below €{data.recommendedPrice > 0 ? (data.recommendedPrice * 1.2).toFixed(0) : 42} to maximize sales volume
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {data.demandCount > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-900">
                      <p className="font-semibold mb-1">Market Opportunity</p>
                      <p>
                        {data.demandCount} customers are actively searching in your category.
                        Price competitively within the recommended range to capture this demand.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2">Pricing Best Practices</h3>
            <ul className="space-y-2 text-purple-100">
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Start with our recommended price and adjust based on your actual costs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Offer at least 30% discount from regular price to attract deal seekers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Monitor your conversion rate and adjust pricing if below 3%</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Test different price points over multiple deals to find your sweet spot</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Consider bundling products/services to justify higher price points</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
