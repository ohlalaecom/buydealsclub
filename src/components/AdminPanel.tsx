import { X, Plus, Edit, Trash2, Save, BarChart3, Store, Tag } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DealTranslationManager } from './DealTranslationManager';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { VendorManagement } from './VendorManagement';
import { PromoCodeManager } from './PromoCodeManager';

interface AdminPanelProps {
  onClose: () => void;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export function AdminPanel({ onClose }: AdminPanelProps) {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'deals' | 'analytics' | 'vendors' | 'promos'>('deals');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    short_description: '',
    category_id: '',
    original_price: '',
    deal_price: '',
    stock_quantity: '',
    image_url: '',
    start_time: '',
    end_time: '',
  });

  useEffect(() => {
    checkAdminRole();
  }, [user]);

  useEffect(() => {
    if (userRole === 'admin') {
      loadCategories();
      loadDeals();
    }
  }, [userRole]);

  const checkAdminRole = async () => {
    if (!user) {
      onClose();
      return;
    }

    const { data } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (data?.role !== 'admin') {
      onClose();
      return;
    }

    setUserRole(data.role);
  };

  const loadCategories = async () => {
    const { data } = await supabase.from('categories').select('*');
    if (data) {
      setCategories(data);
    }
  };

  const loadDeals = async () => {
    const { data } = await supabase
      .from('deals')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) {
      setDeals(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const startTime = formData.start_time || new Date().toISOString();
    const endTime = formData.end_time || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from('deals').insert({
      title: formData.title,
      description: formData.description,
      short_description: formData.short_description,
      category_id: formData.category_id,
      original_price: parseFloat(formData.original_price),
      deal_price: parseFloat(formData.deal_price),
      stock_quantity: parseInt(formData.stock_quantity),
      sold_quantity: 0,
      image_url: formData.image_url || 'https://images.pexels.com/photos/6214476/pexels-photo-6214476.jpeg',
      start_time: startTime,
      end_time: endTime,
      is_active: true,
      featured: true,
    });

    if (!error) {
      setShowForm(false);
      setFormData({
        title: '',
        description: '',
        short_description: '',
        category_id: '',
        original_price: '',
        deal_price: '',
        stock_quantity: '',
        image_url: '',
        start_time: '',
        end_time: '',
      });
      loadDeals();
    }
  };

  if (!userRole || userRole !== 'admin') {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Admin Panel</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('deals')}
              className={`px-4 py-3 font-semibold transition-colors border-b-2 ${
                activeTab === 'deals'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Deals Management
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-3 font-semibold transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'analytics'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('vendors')}
              className={`px-4 py-3 font-semibold transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'vendors'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Store className="w-4 h-4" />
              Vendor Management
            </button>
            <button
              onClick={() => setActiveTab('promos')}
              className={`px-4 py-3 font-semibold transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'promos'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Tag className="w-4 h-4" />
              Promo Codes
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'analytics' ? (
            <AnalyticsDashboard />
          ) : activeTab === 'vendors' ? (
            <VendorManagement />
          ) : activeTab === 'promos' ? (
            <PromoCodeManager />
          ) : (
          <>
            <div className="mb-6">
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {showForm ? 'Cancel' : 'Create New Deal'}
              </button>
            </div>

            {showForm && (
            <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Short Description
                  </label>
                  <input
                    type="text"
                    value={formData.short_description}
                    onChange={(e) =>
                      setFormData({ ...formData, short_description: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Original Price (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.original_price}
                    onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Deal Price (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.deal_price}
                    onChange={(e) => setFormData({ ...formData, deal_price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    min="0"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Image URL (optional - uses default if empty)
                  </label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://images.pexels.com/..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Time (optional - defaults to now)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Time (optional - defaults to 24h from start)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                <Save className="w-5 h-5" />
                Create Deal
              </button>
            </form>
          )}

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Deals</h3>
            <div className="space-y-3">
              {deals.map((deal) => (
                <div
                  key={deal.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{deal.title}</h4>
                    <p className="text-sm text-gray-600">€{deal.deal_price.toFixed(2)}</p>
                  </div>
                  <DealTranslationManager dealId={deal.id} dealTitle={deal.title} />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Quick Guide</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Create deals with 24-hour time limits</li>
              <li>• Choose from 6 categories: Ksport, Kwine, Kooking, Kids, Ktech, Ktravel</li>
              <li>• Set original and discounted prices</li>
              <li>• Use Pexels images for product photos</li>
              <li>• Deals automatically calculate discount percentages</li>
            </ul>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
