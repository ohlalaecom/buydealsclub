import { X, ShoppingCart, MessageCircle, Heart, ThumbsUp, Smile, Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import { CountdownTimer } from './CountdownTimer';
import { PriceTransparency } from './PriceTransparency';
import { ReserveDealButton } from './ReserveDealButton';
import { ProductReviews } from './ProductReviews';
import { GroupPurchase } from './GroupPurchase';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslatedDeal, DealTranslation } from '../lib/dealTranslations';

interface DealModalProps {
  dealId: string;
  onClose: () => void;
  onAddToCart: (dealId: string) => void;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_profiles: {
    username: string;
    avatar_url: string | null;
  };
}

export function DealModal({ dealId, onClose, onAddToCart }: DealModalProps) {
  const [deal, setDeal] = useState<any>(null);
  const [dealTranslations, setDealTranslations] = useState<DealTranslation[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const { user } = useAuth();
  const { language } = useLanguage();

  useEffect(() => {
    loadDeal();
    loadDealTranslations();
    loadComments();
  }, [dealId]);

  const loadDeal = async () => {
    const { data } = await supabase
      .from('deals')
      .select('*, categories(*)')
      .eq('id', dealId)
      .single();

    if (data) {
      setDeal(data);
    }
  };

  const loadDealTranslations = async () => {
    const { data } = await supabase
      .from('deal_translations')
      .select('*')
      .eq('deal_id', dealId);

    if (data) {
      setDealTranslations(data);
    }
  };

  const loadComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, user_profiles(username, avatar_url)')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false });

    if (data) {
      setComments(data as any);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    const { error } = await supabase.from('comments').insert({
      deal_id: dealId,
      user_id: user.id,
      content: newComment.trim(),
    });

    if (!error) {
      setNewComment('');
      loadComments();
    }
  };

  if (!deal) return null;

  const translatedDeal = getTranslatedDeal(deal, dealTranslations, language);

  const images = [deal.image_url, ...(deal.gallery_images || [])].filter(Boolean);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto my-8">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <span
              className="px-3 py-1 rounded-full text-white text-sm font-semibold"
              style={{ backgroundColor: deal.categories?.color || '#3B82F6' }}
            >
              {deal.categories?.name || 'Deal'}
            </span>
            <CountdownTimer endTime={deal.end_time} />
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-8 p-6">
          <div>
            <div className="relative mb-4">
              <img
                src={images[selectedImage] || 'https://images.pexels.com/photos/6214476/pexels-photo-6214476.jpeg'}
                alt={translatedDeal.title}
                className="w-full h-96 object-cover rounded-lg"
              />
              <div className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-full font-bold text-xl shadow-lg">
                -{deal.discount_percentage}%
              </div>
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`${translatedDeal.title} ${idx + 1}`}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-20 h-20 object-cover rounded-lg cursor-pointer transition-all ${
                      selectedImage === idx ? 'ring-2 ring-blue-500' : 'opacity-60 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{translatedDeal.title}</h2>

            <div className="flex items-end gap-4 mb-6">
              <span className="text-4xl font-bold text-gray-900">
                €{deal.deal_price.toFixed(2)}
              </span>
              <span className="text-xl text-gray-400 line-through mb-1">
                €{deal.original_price.toFixed(2)}
              </span>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>{deal.sold_quantity} sold</span>
                <span>{deal.stock_quantity} remaining</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-full transition-all duration-500"
                  style={{
                    width: `${(deal.sold_quantity / (deal.stock_quantity + deal.sold_quantity)) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="prose prose-sm max-w-none mb-6">
              <p className="text-gray-700 whitespace-pre-wrap">{translatedDeal.description}</p>
            </div>

            <div className="mb-6">
              <PriceTransparency
                msrpPrice={deal.msrp_price}
                marketPrice={deal.market_price}
                dealPrice={deal.deal_price}
                discountPercentage={deal.discount_percentage}
              />
            </div>

            <div className="space-y-3">
              <ReserveDealButton dealId={deal.id} />
              <button
                onClick={() => onAddToCart(deal.id)}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl text-lg"
              >
                <ShoppingCart className="w-6 h-6" />
                Add to Cart
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 p-6">
          <div className="mb-6">
            <GroupPurchase
              dealId={deal.id}
              dealPrice={deal.deal_price}
              dealTitle={deal.title}
            />
          </div>

          <div className="mb-6">
            <ProductReviews dealId={deal.id} />
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MessageCircle className="w-6 h-6" />
            Community Comments ({comments.length})
          </h3>

          {user && (
            <form onSubmit={handleAddComment} className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts with the Kokaa community..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
              <button
                type="submit"
                className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Post Comment
              </button>
            </form>
          )}

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 bg-gray-50 rounded-lg p-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                  {comment.user_profiles.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">
                      {comment.user_profiles.username || 'Anonymous'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
