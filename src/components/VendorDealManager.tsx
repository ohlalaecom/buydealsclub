import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Deal {
  id: string;
  title: string;
  deal_price: number;
  original_price: number;
  discount_percentage: number;
  stock_quantity: number;
  sold_quantity: number;
  is_active: boolean;
  start_time: string;
  end_time: string;
}

export function VendorDealManager() {
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (user) {
      loadDeals();
    }
  }, [user]);

  const loadDeals = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('deals')
        .select('*')
        .eq('vendor_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setDeals(data);
      }
    } catch (error) {
      console.error('Error loading deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDealStatus = async (dealId: string, currentStatus: boolean) => {
    try {
      await supabase
        .from('deals')
        .update({ is_active: !currentStatus })
        .eq('id', dealId);

      setDeals(deals.map(deal =>
        deal.id === dealId ? { ...deal, is_active: !currentStatus } : deal
      ));
    } catch (error) {
      console.error('Error updating deal status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading your deals...</div>
      </div>
    );
  }

  if (showCreateForm) {
    return <DealCreateForm onClose={() => {
      setShowCreateForm(false);
      loadDeals();
    }} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Deals</h2>
          <p className="text-gray-600 mt-1">Manage your active and past deals</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
        >
          <Plus className="w-5 h-5" />
          Create New Deal
        </button>
      </div>

      {deals.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No deals yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first deal to start selling on Kokaa
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-semibold inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Your First Deal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {deals.map((deal) => (
            <div
              key={deal.id}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {deal.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          deal.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {deal.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {deal.sold_quantity} / {deal.stock_quantity} sold
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-600">Deal Price</div>
                    <div className="text-2xl font-bold text-green-600">
                      €{deal.deal_price.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Original Price</div>
                    <div className="text-lg font-semibold text-gray-400 line-through">
                      €{deal.original_price.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(deal.sold_quantity / deal.stock_quantity) * 100}%`
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-600">
                    {Math.round((deal.sold_quantity / deal.stock_quantity) * 100)}%
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleDealStatus(deal.id, deal.is_active)}
                    className={`flex-1 py-2 rounded-lg font-semibold ${
                      deal.is_active
                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                  >
                    {deal.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <Eye className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <Edit2 className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DealCreateForm({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    shortDescription: '',
    categoryId: '1',
    originalPrice: '',
    dealPrice: '',
    stockQuantity: '',
    imageUrl: '',
    startTime: '',
    endTime: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('You must be logged in');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const originalPrice = parseFloat(formData.originalPrice);
      const dealPrice = parseFloat(formData.dealPrice);
      const discountPercentage = Math.round(
        ((originalPrice - dealPrice) / originalPrice) * 100
      );

      const { error: insertError } = await supabase.from('deals').insert({
        vendor_id: user.id,
        title: formData.title,
        description: formData.description,
        short_description: formData.shortDescription,
        category_id: parseInt(formData.categoryId),
        original_price: originalPrice,
        deal_price: dealPrice,
        discount_percentage: discountPercentage,
        stock_quantity: parseInt(formData.stockQuantity),
        sold_quantity: 0,
        image_url: formData.imageUrl || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
        start_time: formData.startTime || new Date().toISOString(),
        end_time: formData.endTime || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true
      });

      if (insertError) throw insertError;

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create deal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Create New Deal</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Deal Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Luxury Spa Day Package"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Short Description *
          </label>
          <input
            type="text"
            value={formData.shortDescription}
            onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
            placeholder="One line summary (max 100 chars)"
            required
            maxLength={100}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Full Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Detailed description of your deal..."
            required
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Original Price (€) *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.originalPrice}
              onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
              placeholder="100.00"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Deal Price (€) *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.dealPrice}
              onChange={(e) => setFormData({ ...formData, dealPrice: e.target.value })}
              placeholder="70.00"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Stock Quantity *
            </label>
            <input
              type="number"
              value={formData.stockQuantity}
              onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
              placeholder="50"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Category *
            </label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="1">Hotels & Stays</option>
              <option value="2">Spa & Wellness</option>
              <option value="3">Experiences</option>
              <option value="4">Dining</option>
              <option value="5">Retail</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Deal'}
          </button>
        </div>
      </form>
    </div>
  );
}
