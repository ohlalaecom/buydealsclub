import { useState, useEffect } from 'react';
import { Star, MessageSquare, Send, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Review {
  id: string;
  deal_id: string;
  rating: number;
  title: string;
  content: string;
  vendor_response: string | null;
  vendor_response_date: string | null;
  verified_purchase: boolean;
  created_at: string;
  user_profiles: {
    username: string;
  };
  deals: {
    title: string;
  };
}

export function VendorReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadReviews();
    }
  }, [user]);

  const loadReviews = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('product_reviews')
      .select(`
        *,
        user_profiles(username),
        deals!inner(title, vendor_id)
      `)
      .eq('deals.vendor_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setReviews(data as any);
    }
  };

  const handleSubmitResponse = async (reviewId: string) => {
    if (!user || !response.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('product_reviews')
        .update({
          vendor_response: response.trim(),
          vendor_response_date: new Date().toISOString(),
          vendor_response_by: user.id
        })
        .eq('id', reviewId);

      if (error) throw error;

      await loadReviews();
      setSelectedReview(null);
      setResponse('');
      alert('Response posted successfully!');
    } catch (error: any) {
      alert('Error posting response: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getAverageRating = () => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
    return (total / reviews.length).toFixed(1);
  };

  const getResponseRate = () => {
    if (reviews.length === 0) return 0;
    const responded = reviews.filter(r => r.vendor_response).length;
    return Math.round((responded / reviews.length) * 100);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Customer Reviews</h2>
        <p className="text-gray-600">Respond to customer feedback and build trust</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Average Rating</span>
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{getAverageRating()}</div>
          <p className="text-sm text-gray-600 mt-1">out of 5.0</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Reviews</span>
            <MessageSquare className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{reviews.length}</div>
          <p className="text-sm text-gray-600 mt-1">from customers</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Response Rate</span>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{getResponseRate()}%</div>
          <p className="text-sm text-gray-600 mt-1">reviews responded</p>
        </div>
      </div>

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No reviews yet</p>
            <p className="text-sm text-gray-400 mt-2">
              Reviews will appear here once customers purchase and rate your deals
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-bold">
                        {review.user_profiles?.username?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {review.user_profiles?.username || 'Anonymous'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="mb-2">{renderStars(review.rating)}</div>
                  <div className="text-sm text-gray-600 mb-2">
                    Deal: <span className="font-semibold">{review.deals?.title}</span>
                  </div>
                </div>
                {review.verified_purchase && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                    Verified Purchase
                  </span>
                )}
              </div>

              <div className="mb-4">
                <h4 className="font-bold text-gray-900 mb-2">{review.title}</h4>
                <p className="text-gray-700">{review.content}</p>
              </div>

              {review.vendor_response ? (
                <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-900">Vendor Response</span>
                    <span className="text-xs text-blue-600">
                      {new Date(review.vendor_response_date!).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-900">{review.vendor_response}</p>
                </div>
              ) : selectedReview?.id === review.id ? (
                <div className="bg-gray-50 border border-gray-200 p-4 rounded">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Your Response
                  </label>
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Thank you for your feedback! We appreciate..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSubmitResponse(review.id)}
                      disabled={loading || !response.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      {loading ? 'Posting...' : 'Post Response'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedReview(null);
                        setResponse('');
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setSelectedReview(review)}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-semibold"
                >
                  <MessageSquare className="w-4 h-4" />
                  Respond to Review
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-bold text-blue-900 mb-2">Response Best Practices</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="font-bold">✓</span>
            <span>Thank customers for their feedback, both positive and negative</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">✓</span>
            <span>Address specific concerns mentioned in the review</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">✓</span>
            <span>Keep responses professional and courteous</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">✓</span>
            <span>Offer solutions or explain how you'll improve</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">✓</span>
            <span>Respond within 24-48 hours for best customer satisfaction</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
