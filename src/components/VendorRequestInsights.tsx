import { useState, useEffect } from 'react';
import { TrendingUp, Users, DollarSign, MapPin, Package, Send, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface DealRequest {
  id: string;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  preferred_location: string | null;
  urgency: string;
  quantity_needed: number;
  vote_count: number;
  offer_count: number;
  created_at: string;
  user_has_offered?: boolean;
  categories?: {
    name: string;
  };
}

export function VendorRequestInsights() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<DealRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<DealRequest | null>(null);
  const [offerForm, setOfferForm] = useState({
    price: '',
    description: '',
    quantity: '',
    validDays: '7'
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      loadRequests();
    }
  }, [user]);

  const loadRequests = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('customer_deal_requests')
      .select(`
        *,
        categories(name)
      `)
      .in('status', ['pending', 'in_progress'])
      .order('vote_count', { ascending: false })
      .limit(50);

    if (data) {
      const requestIds = data.map(r => r.id);
      const { data: offers } = await supabase
        .from('deal_request_offers')
        .select('request_id')
        .eq('vendor_id', user.id)
        .in('request_id', requestIds);

      const offeredIds = new Set(offers?.map(o => o.request_id) || []);

      const requestsWithOffers = data.map(r => ({
        ...r,
        user_has_offered: offeredIds.has(r.id)
      }));

      setRequests(requestsWithOffers);
    }

    setLoading(false);
  };

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !selectedRequest) return;

    setSubmitting(true);
    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + parseInt(offerForm.validDays));

      const { error } = await supabase
        .from('deal_request_offers')
        .insert({
          request_id: selectedRequest.id,
          vendor_id: user.id,
          offer_price: parseFloat(offerForm.price),
          offer_description: offerForm.description,
          available_quantity: parseInt(offerForm.quantity),
          valid_until: validUntil.toISOString()
        });

      if (error) throw error;

      setSelectedRequest(null);
      setOfferForm({ price: '', description: '', quantity: '', validDays: '7' });
      await loadRequests();
      alert('Offer submitted successfully! The customer will be notified.');
    } catch (error: any) {
      alert('Error submitting offer: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    const labels = {
      low: 'Low Priority',
      normal: 'Normal',
      high: 'High Priority',
      urgent: 'Urgent'
    };
    return labels[urgency as keyof typeof labels] || 'Normal';
  };

  const getUrgencyColor = (urgency: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-700',
      normal: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700'
    };
    return colors[urgency as keyof typeof colors] || colors.normal;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading customer requests...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Customer Deal Requests</h2>
        <p className="text-gray-600">
          See what customers are asking for and submit offers to win their business
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-blue-900 mb-2">How It Works</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="font-bold">1.</span>
                <span>Customers post requests for products/services they want</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                <span>Other customers vote on requests they also want</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                <span>You submit offers for requests that match your business</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">4.</span>
                <span>Win the customer and create a deal they'll love</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No customer requests yet</p>
          <p className="text-sm text-gray-400 mt-2">
            When customers request deals, they'll appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{request.title}</h3>
                    {request.user_has_offered && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Offer Submitted
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    {request.categories && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                        {request.categories.name}
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getUrgencyColor(request.urgency)}`}>
                      {getUrgencyLabel(request.urgency)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-blue-600 font-semibold">
                    <Users className="w-4 h-4" />
                    <span>{request.vote_count} {request.vote_count === 1 ? 'vote' : 'votes'}</span>
                  </div>
                  {request.offer_count > 0 && (
                    <div className="text-orange-600 font-semibold">
                      {request.offer_count} {request.offer_count === 1 ? 'offer' : 'offers'}
                    </div>
                  )}
                </div>
              </div>

              <p className="text-gray-700 mb-4">{request.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                {(request.budget_min || request.budget_max) && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-600" />
                    <div>
                      <div className="text-xs text-gray-600">Budget</div>
                      <div className="text-sm font-semibold text-gray-900">
                        €{request.budget_min || '0'} - €{request.budget_max || 'Any'}
                      </div>
                    </div>
                  </div>
                )}
                {request.preferred_location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-600" />
                    <div>
                      <div className="text-xs text-gray-600">Location</div>
                      <div className="text-sm font-semibold text-gray-900">
                        {request.preferred_location}
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-600" />
                  <div>
                    <div className="text-xs text-gray-600">Quantity</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {request.quantity_needed}
                    </div>
                  </div>
                </div>
              </div>

              {selectedRequest?.id === request.id ? (
                <form onSubmit={handleSubmitOffer} className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                  <h4 className="font-bold text-blue-900">Submit Your Offer</h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Your Price (€) *
                      </label>
                      <input
                        type="number"
                        value={offerForm.price}
                        onChange={(e) => setOfferForm({ ...offerForm, price: e.target.value })}
                        placeholder="49.99"
                        step="0.01"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Quantity Available *
                      </label>
                      <input
                        type="number"
                        value={offerForm.quantity}
                        onChange={(e) => setOfferForm({ ...offerForm, quantity: e.target.value })}
                        placeholder={request.quantity_needed.toString()}
                        min="1"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Offer Valid For
                      </label>
                      <select
                        value={offerForm.validDays}
                        onChange={(e) => setOfferForm({ ...offerForm, validDays: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="3">3 days</option>
                        <option value="7">7 days</option>
                        <option value="14">14 days</option>
                        <option value="30">30 days</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Offer Description *
                    </label>
                    <textarea
                      value={offerForm.description}
                      onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })}
                      placeholder="Describe what you're offering, what's included, any special features..."
                      required
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedRequest(null)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      {submitting ? 'Submitting...' : 'Submit Offer'}
                    </button>
                  </div>
                </form>
              ) : !request.user_has_offered ? (
                <button
                  onClick={() => setSelectedRequest(request)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  <Send className="w-5 h-5" />
                  Submit Offer
                </button>
              ) : (
                <div className="text-center py-3 bg-green-50 rounded-lg text-green-700 font-semibold">
                  You've already submitted an offer for this request
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
