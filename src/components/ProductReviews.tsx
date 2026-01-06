import { useState, useEffect } from 'react';
import { Star, ThumbsUp, ShieldCheck, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ProductReviewsProps {
  dealId: string;
}

interface Review {
  id: string;
  rating: number;
  title: string;
  content: string;
  verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  user_profiles: {
    username: string;
  };
}

export function ProductReviews({ dealId }: ProductReviewsProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [averageRating, setAverageRating] = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState<number[]>([0, 0, 0, 0, 0]);

  useEffect(() => {
    loadReviews();
    if (user) {
      checkUserReview();
    }
  }, [dealId, user]);

  const loadReviews = async () => {
    const { data } = await supabase
      .from('product_reviews')
      .select('*, user_profiles(username)')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false });

    if (data) {
      setReviews(data as any);
      calculateRatingStats(data);
    }
  };

  const calculateRatingStats = (reviewData: any[]) => {
    if (reviewData.length === 0) return;

    const total = reviewData.reduce((sum, r) => sum + r.rating, 0);
    setAverageRating(total / reviewData.length);

    const dist = [0, 0, 0, 0, 0];
    reviewData.forEach((r) => {
      dist[r.rating - 1]++;
    });
    setRatingDistribution(dist);
  };

  const checkUserReview = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('product_reviews')
      .select('*, user_profiles(username)')
      .eq('deal_id', dealId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setUserReview(data as any);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !content.trim()) return;

    const { data: order } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', user.id)
      .eq('deal_id', dealId)
      .maybeSingle();

    const { error } = await supabase.from('product_reviews').insert({
      deal_id: dealId,
      user_id: user.id,
      rating,
      title: title.trim(),
      content: content.trim(),
      verified_purchase: !!order,
    });

    if (!error) {
      setShowReviewForm(false);
      setTitle('');
      setContent('');
      setRating(5);
      loadReviews();
      checkUserReview();
    }
  };

  const handleHelpful = async (reviewId: string) => {
    if (!user) return;

    const review = reviews.find((r) => r.id === reviewId);
    if (!review) return;

    await supabase
      .from('product_reviews')
      .update({ helpful_count: review.helpful_count + 1 })
      .eq('id', reviewId);

    loadReviews();
  };

  const StarRating = ({ rating: r, interactive = false, onRate }: any) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => interactive && onRate?.(star)}
          disabled={!interactive}
          className={`${interactive ? 'cursor-pointer hover:scale-110' : ''} transition-transform`}
        >
          <Star
            className={`w-5 h-5 ${
              star <= r ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Customer Reviews</h3>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="text-center">
            <div className="text-5xl font-black text-gray-900 mb-2">
              {averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}
            </div>
            <StarRating rating={Math.round(averageRating)} />
            <p className="text-gray-600 mt-2">Based on {reviews.length} reviews</p>
          </div>

          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingDistribution[star - 1] || 0;
              const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-sm font-semibold w-12">{star} star</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-yellow-400 h-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-8">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {user && !userReview && !showReviewForm && (
          <button
            onClick={() => setShowReviewForm(true)}
            className="w-full mt-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            Write a Review
          </button>
        )}

        {showReviewForm && (
          <form onSubmit={handleSubmitReview} className="mt-6 space-y-4 bg-white rounded-lg p-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your Rating
              </label>
              <StarRating rating={rating} interactive onRate={setRating} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Review Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sum up your experience"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your Review
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your experience with this product"
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Submit Review
              </button>
              <button
                type="button"
                onClick={() => setShowReviewForm(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <StarRating rating={review.rating} />
                  {review.verified_purchase && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                      <ShieldCheck className="w-3 h-3" />
                      Verified Purchase
                    </div>
                  )}
                </div>
                <h4 className="font-bold text-gray-900">{review.title}</h4>
              </div>
              <span className="text-sm text-gray-500">
                {new Date(review.created_at).toLocaleDateString()}
              </span>
            </div>

            <p className="text-gray-700 mb-3">{review.content}</p>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <span className="text-sm font-semibold text-gray-600">
                {review.user_profiles.username || 'Anonymous'}
              </span>
              <button
                onClick={() => handleHelpful(review.id)}
                disabled={!user}
                className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ThumbsUp className="w-4 h-4" />
                Helpful ({review.helpful_count})
              </button>
            </div>
          </div>
        ))}

        {reviews.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 text-lg font-semibold">No reviews yet</p>
            <p className="text-gray-500">Be the first to review this product!</p>
          </div>
        )}
      </div>
    </div>
  );
}
