import { ShoppingCart, TrendingUp, Users } from 'lucide-react';
import { CountdownTimer } from './CountdownTimer';
import { ReserveDealButton } from './ReserveDealButton';
import { trackEvent } from '../services/analytics';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';

interface DealCardProps {
  deal: {
    id: string;
    title: string;
    short_description: string | null;
    original_price: number;
    deal_price: number;
    discount_percentage: number;
    stock_quantity: number;
    sold_quantity: number;
    image_url: string | null;
    end_time: string;
    category?: {
      name: string;
      color: string;
    };
  };
  onAddToCart: (dealId: string) => void;
  onViewDetails: (dealId: string) => void;
}

export function DealCard({ deal, onAddToCart, onViewDetails }: DealCardProps) {
  const { user } = useAuth();
  const stockPercentage = (deal.sold_quantity / (deal.stock_quantity + deal.sold_quantity)) * 100;

  useEffect(() => {
    trackEvent({
      eventType: 'view_deal',
      dealId: deal.id,
      userId: user?.id
    });
  }, [deal.id, user?.id]);

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <div className="relative">
        <img
          src={deal.image_url || 'https://images.pexels.com/photos/6214476/pexels-photo-6214476.jpeg'}
          alt={deal.title}
          className="w-full h-64 object-cover cursor-pointer"
          onClick={() => onViewDetails(deal.id)}
        />
        <div className="absolute top-4 left-4">
          <span
            className="px-3 py-1 rounded-full text-white text-sm font-semibold shadow-lg"
            style={{ backgroundColor: deal.category?.color || '#3B82F6' }}
          >
            {deal.category?.name || 'Deal'}
          </span>
        </div>
        <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-2 rounded-full font-bold text-lg shadow-lg">
          -{deal.discount_percentage}%
        </div>
      </div>

      <div className="p-6">
        <h3
          className="text-2xl font-bold text-gray-900 mb-2 cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => onViewDetails(deal.id)}
        >
          {deal.title}
        </h3>

        {deal.short_description && (
          <p className="text-gray-600 mb-4 line-clamp-2">{deal.short_description}</p>
        )}

        <div className="flex items-end gap-3 mb-4">
          <span className="text-3xl font-bold text-gray-900">
            €{deal.deal_price.toFixed(2)}
          </span>
          <span className="text-lg text-gray-400 line-through mb-1">
            €{deal.original_price.toFixed(2)}
          </span>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {deal.sold_quantity} sold
            </span>
            <span>{deal.stock_quantity} left</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-green-500 to-blue-500 h-full transition-all duration-500"
              style={{ width: `${stockPercentage}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <CountdownTimer endTime={deal.end_time} />
          <div className="flex items-center gap-1 text-green-600">
            <TrendingUp className="w-5 h-5" />
            <span className="font-semibold">Hot Deal</span>
          </div>
        </div>

        <div className="space-y-2">
          <ReserveDealButton dealId={deal.id} />
          <button
            onClick={() => {
              trackEvent({
                eventType: 'click_buy_now',
                dealId: deal.id,
                userId: user?.id
              });
              onAddToCart(deal.id);
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            <ShoppingCart className="w-5 h-5" />
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
