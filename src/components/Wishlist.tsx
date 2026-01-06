import { useState, useEffect } from 'react';
import { Heart, Trash2, ShoppingCart, X, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface WishlistItem {
  id: string;
  deal_id: string;
  created_at: string;
  deals: {
    id: string;
    title: string;
    description: string;
    deal_price: number;
    original_price: number;
    image_url: string;
    stock_quantity: number;
    is_active: boolean;
  };
}

interface WishlistProps {
  onClose: () => void;
  onAddToCart: (dealId: string) => void;
}

export function Wishlist({ onClose, onAddToCart }: WishlistProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadWishlist();
    }
  }, [user]);

  const loadWishlist = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('wishlists')
      .select(`
        *,
        deals(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setItems(data as any);
    }
    setLoading(false);
  };

  const handleRemove = async (wishlistId: string) => {
    await supabase
      .from('wishlists')
      .delete()
      .eq('id', wishlistId);

    await loadWishlist();
  };

  const handleAddToCart = (dealId: string) => {
    onAddToCart(dealId);
  };

  if (!user) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <Heart className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h2>
          <p className="text-gray-600 mb-6">Please sign in to view your wishlist</p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="w-8 h-8 text-red-500 fill-red-500" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">My Wishlist</h2>
              <p className="text-sm text-gray-600">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading wishlist...</div>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="w-24 h-24 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Your wishlist is empty</h3>
              <p className="text-gray-600 mb-6">
                Start adding deals you love to your wishlist!
              </p>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                Browse Deals
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex gap-4">
                    <img
                      src={item.deals.image_url}
                      alt={item.deals.title}
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                        {item.deals.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {item.deals.description}
                      </p>

                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl font-bold text-green-600">
                          €{item.deals.deal_price.toFixed(2)}
                        </span>
                        {item.deals.original_price > item.deals.deal_price && (
                          <>
                            <span className="text-lg text-gray-400 line-through">
                              €{item.deals.original_price.toFixed(2)}
                            </span>
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">
                              SAVE {Math.round((1 - item.deals.deal_price / item.deals.original_price) * 100)}%
                            </span>
                          </>
                        )}
                      </div>

                      {!item.deals.is_active ? (
                        <div className="flex items-center gap-2 text-red-600 text-sm font-semibold mb-3">
                          <AlertCircle className="w-4 h-4" />
                          Deal expired
                        </div>
                      ) : item.deals.stock_quantity === 0 ? (
                        <div className="flex items-center gap-2 text-orange-600 text-sm font-semibold mb-3">
                          <AlertCircle className="w-4 h-4" />
                          Out of stock
                        </div>
                      ) : item.deals.stock_quantity < 10 ? (
                        <div className="text-sm text-orange-600 font-semibold mb-3">
                          Only {item.deals.stock_quantity} left!
                        </div>
                      ) : null}

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAddToCart(item.deals.id)}
                          disabled={!item.deals.is_active || item.deals.stock_quantity === 0}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          Add to Cart
                        </button>
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove from wishlist"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export async function toggleWishlist(userId: string, dealId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', userId)
    .eq('deal_id', dealId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('wishlists')
      .delete()
      .eq('id', existing.id);
    return false;
  } else {
    await supabase
      .from('wishlists')
      .insert({ user_id: userId, deal_id: dealId });
    return true;
  }
}

export async function isInWishlist(userId: string, dealId: string): Promise<boolean> {
  const { data } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', userId)
    .eq('deal_id', dealId)
    .maybeSingle();

  return !!data;
}
