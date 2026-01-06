import { supabase } from '../lib/supabase';
import { trackUnmetRequest } from './analytics';

type Category = 'hotels' | 'spa_wellness' | 'experiences' | 'dining' | 'retail' | 'general';

interface CategoryKeywords {
  category: Category;
  keywords: string[];
  pricePatterns: RegExp[];
}

const CATEGORY_MAP: CategoryKeywords[] = [
  {
    category: 'hotels',
    keywords: ['hotel', 'accommodation', 'stay', 'room', 'suite', 'resort', 'booking', 'night', 'bed', 'lodge'],
    pricePatterns: [/(\d+)\s*(euro|eur|€)\s*per\s*night/i, /night.*(\d+)/i]
  },
  {
    category: 'spa_wellness',
    keywords: ['spa', 'massage', 'wellness', 'sauna', 'facial', 'beauty', 'relax', 'treatment', 'therapy', 'hamam'],
    pricePatterns: [/massage.*(\d+)/i, /spa.*(\d+)/i]
  },
  {
    category: 'experiences',
    keywords: ['tour', 'adventure', 'activity', 'experience', 'excursion', 'trip', 'safari', 'diving', 'boat', 'event'],
    pricePatterns: [/tour.*(\d+)/i, /activity.*(\d+)/i]
  },
  {
    category: 'dining',
    keywords: ['restaurant', 'dinner', 'lunch', 'food', 'meal', 'dining', 'cuisine', 'eat', 'cafe', 'bar'],
    pricePatterns: [/meal.*(\d+)/i, /dinner.*(\d+)/i]
  },
  {
    category: 'retail',
    keywords: ['buy', 'shop', 'product', 'item', 'clothing', 'electronics', 'gift', 'store', 'purchase', 'online'],
    pricePatterns: [/under.*(\d+)/i, /less.*than.*(\d+)/i]
  }
];

function extractPriceRange(text: string): { min: number; max: number } | null {
  const lowerText = text.toLowerCase();

  const rangeMatch = lowerText.match(/(\d+)\s*-\s*(\d+)\s*(euro|eur|€)?/i);
  if (rangeMatch) {
    return {
      min: parseInt(rangeMatch[1]),
      max: parseInt(rangeMatch[2])
    };
  }

  const underMatch = lowerText.match(/under\s*(\d+)|less\s*than\s*(\d+)|below\s*(\d+)/i);
  if (underMatch) {
    const price = parseInt(underMatch[1] || underMatch[2] || underMatch[3]);
    return { min: 0, max: price };
  }

  const overMatch = lowerText.match(/over\s*(\d+)|more\s*than\s*(\d+)|above\s*(\d+)/i);
  if (overMatch) {
    const price = parseInt(overMatch[1] || overMatch[2] || overMatch[3]);
    return { min: price, max: price * 2 };
  }

  const singleMatch = lowerText.match(/(\d+)\s*(euro|eur|€)/i);
  if (singleMatch) {
    const price = parseInt(singleMatch[1]);
    return { min: Math.max(0, price - 20), max: price + 20 };
  }

  return null;
}

function extractLocation(text: string): string | null {
  const cities = [
    'limassol', 'nicosia', 'larnaca', 'paphos', 'ayia napa',
    'protaras', 'kyrenia', 'famagusta', 'troodos', 'polis'
  ];

  const lowerText = text.toLowerCase();
  for (const city of cities) {
    if (lowerText.includes(city)) {
      return city.charAt(0).toUpperCase() + city.slice(1);
    }
  }

  return null;
}

export function categorizeQuery(query: string): {
  category: Category;
  priceRange: string | null;
  location: string | null;
} {
  const lowerQuery = query.toLowerCase();

  let bestMatch: Category = 'general';
  let maxScore = 0;

  for (const { category, keywords } of CATEGORY_MAP) {
    const score = keywords.filter(keyword =>
      lowerQuery.includes(keyword)
    ).length;

    if (score > maxScore) {
      maxScore = score;
      bestMatch = category;
    }
  }

  const priceData = extractPriceRange(query);
  const priceRange = priceData
    ? `€${priceData.min}-${priceData.max}`
    : null;

  const location = extractLocation(query);

  return {
    category: bestMatch,
    priceRange,
    location
  };
}

export async function storeQueryWithCategory(
  query: string,
  userId?: string
): Promise<void> {
  const { category, priceRange, location } = categorizeQuery(query);

  try {
    await supabase.from('unmet_requests').insert({
      message: query,
      category: category,
      category_suggested: category,
      price_range: priceRange,
      location: location,
      user_id: userId || null
    });

    await trackUnmetRequest(query, category);

    const priceData = extractPriceRange(query);
    if (priceData) {
      await supabase
        .from('market_demand')
        .upsert({
          category,
          location: location || 'Cyprus',
          demand_count: 1,
          avg_price_min: priceData.min,
          avg_price_max: priceData.max
        }, {
          onConflict: 'category,location',
          ignoreDuplicates: false
        });
    }

  } catch (error) {
    console.error('Failed to store categorized query:', error);
  }
}

export function generateDemandInsights(queries: Array<{
  message: string;
  category: string;
  price_range: string | null;
  location: string | null;
}>): {
  topCategories: Array<{ category: string; count: number }>;
  avgPriceByCategory: Map<string, { min: number; max: number }>;
  locationDemand: Map<string, number>;
} {
  const categoryCount = new Map<string, number>();
  const pricesByCategory = new Map<string, number[]>();
  const locationCount = new Map<string, number>();

  queries.forEach(query => {
    categoryCount.set(
      query.category,
      (categoryCount.get(query.category) || 0) + 1
    );

    if (query.location) {
      locationCount.set(
        query.location,
        (locationCount.get(query.location) || 0) + 1
      );
    }

    if (query.price_range) {
      const prices = query.price_range
        .replace('€', '')
        .split('-')
        .map(p => parseInt(p.trim()));

      if (!pricesByCategory.has(query.category)) {
        pricesByCategory.set(query.category, []);
      }
      pricesByCategory.get(query.category)!.push(...prices);
    }
  });

  const topCategories = Array.from(categoryCount.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const avgPriceByCategory = new Map<string, { min: number; max: number }>();
  pricesByCategory.forEach((prices, category) => {
    if (prices.length > 0) {
      avgPriceByCategory.set(category, {
        min: Math.min(...prices),
        max: Math.max(...prices)
      });
    }
  });

  return {
    topCategories,
    avgPriceByCategory,
    locationDemand: locationCount
  };
}
