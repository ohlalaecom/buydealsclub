import { useState, useEffect } from 'react';
import { ThumbsUp, MessageSquare, Clock, MapPin, DollarSign, Package, TrendingUp, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DealRequestForm } from './DealRequestForm';

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
  status: string;
  created_at: string;
  user_has_voted?: boolean;
  categories?: {
    name: string;
    color: string;
  };
}

export function DealRequestBrowser() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<DealRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'popular' | 'recent' | 'urgent'>('popular');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, [filter, user]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('customer_deal_requests')
        .select(`
          *,
          categories(name, color)
        `)
        .in('status', ['pending', 'in_progress']);

      if (filter === 'popular') {
        query = query.order('vote_count', { ascending: false });
      } else if (filter === 'recent') {
        query = query.order('created_at', { ascending: false });
      } else if (filter === 'urgent') {
        query = query.eq('urgency', 'urgent').order('created_at', { ascending: false });
      } else {
        query = query.order('vote_count', { ascending: false });
      }

      const { data, error } = await query.limit(20);

      if (error) {
        console.error('Error loading requests:', error);
        setRequests([]);
        setLoading(false);
        return;
      }

      if (data && user) {
        const requestIds = data.map(r => r.id);
        if (requestIds.length > 0) {
          const { data: votes } = await supabase
            .from('deal_request_votes')
            .select('request_id')
            .eq('user_id', user.id)
            .in('request_id', requestIds);

          const votedIds = new Set(votes?.map(v => v.request_id) || []);

          const requestsWithVotes = data.map(r => ({
            ...r,
            user_has_voted: votedIds.has(r.id)
          }));

          setRequests(requestsWithVotes);
        } else {
          setRequests(data);
        }
      } else if (data) {
        setRequests(data);
      }
    } catch (error) {
      console.error('Error in loadRequests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (requestId: string) => {
    if (!user) {
      alert('Please log in to vote');
      return;
    }

    const request = requests.find(r => r.id === requestId);
    if (!request) return;

    try {
      if (request.user_has_voted) {
        await supabase
          .from('deal_request_votes')
          .delete()
          .eq('request_id', requestId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('deal_request_votes')
          .insert({
            request_id: requestId,
            user_id: user.id
          });
      }

      await loadRequests();
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    const styles = {
      low: 'bg-gray-100 text-gray-700',
      normal: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700'
    };
    const labels = {
      low: 'Low Priority',
      normal: 'Normal',
      high: 'High Priority',
      urgent: 'Urgent'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[urgency as keyof typeof styles]}`}>
        {labels[urgency as keyof typeof labels]}
      </span>
    );
  };

  const getStatusBadge = (status: string, offerCount: number) => {
    if (status === 'in_progress' && offerCount > 0) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
          {offerCount} {offerCount === 1 ? 'Offer' : 'Offers'}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Deal Requests</h2>
          <p className="text-gray-600 mt-1">Request deals or support requests from other customers</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
        >
          <Plus className="w-5 h-5" />
          Request a Deal
        </button>
      </div>

      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {[
          { id: 'popular', label: 'Most Popular', icon: TrendingUp },
          { id: 'recent', label: 'Recent', icon: Clock },
          { id: 'urgent', label: 'Urgent', icon: Clock },
          { id: 'all', label: 'All Requests', icon: Package }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setFilter(id as any)}
            className={`flex items-center gap-2 px-4 py-3 font-semibold whitespace-nowrap border-b-2 transition-colors ${
              filter === id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading requests...</div>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No requests yet</h3>
          <p className="text-gray-600 mb-6">Be the first to request a deal!</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-semibold inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Submit Request
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {requests.map((request) => (
            <div key={request.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{request.title}</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {request.categories && (
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold`} style={{
                        backgroundColor: `${request.categories.color}20`,
                        color: request.categories.color
                      }}>
                        {request.categories.name}
                      </span>
                    )}
                    {getUrgencyBadge(request.urgency)}
                    {getStatusBadge(request.status, request.offer_count)}
                  </div>
                </div>
              </div>

              <p className="text-gray-700 mb-4 line-clamp-3">{request.description}</p>

              <div className="space-y-2 mb-4">
                {(request.budget_min || request.budget_max) && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="w-4 h-4" />
                    <span>
                      Budget: {request.budget_min ? `€${request.budget_min}` : 'Any'} - {request.budget_max ? `€${request.budget_max}` : 'Any'}
                    </span>
                  </div>
                )}
                {request.preferred_location && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{request.preferred_location}</span>
                  </div>
                )}
                {request.quantity_needed > 1 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Package className="w-4 h-4" />
                    <span>Quantity: {request.quantity_needed}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(request.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleVote(request.id)}
                  disabled={!user}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                    request.user_has_voted
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <ThumbsUp className={`w-4 h-4 ${request.user_has_voted ? 'fill-white' : ''}`} />
                  <span>{request.vote_count}</span>
                  <span className="hidden sm:inline">{request.user_has_voted ? 'Voted' : 'Vote'}</span>
                </button>

                {request.offer_count > 0 && (
                  <div className="flex items-center gap-2 text-green-600 font-semibold">
                    <MessageSquare className="w-4 h-4" />
                    <span>{request.offer_count} vendor {request.offer_count === 1 ? 'offer' : 'offers'}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <DealRequestForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            loadRequests();
            alert('Your request has been submitted! Vendors will be notified.');
          }}
        />
      )}
    </div>
  );
}
