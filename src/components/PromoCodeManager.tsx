import { useState, useEffect } from 'react';
import { Tag, Plus, Edit, Trash2, Save, X, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PromoCode {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  min_purchase_amount: number;
  max_discount_amount: number | null;
  usage_limit: number | null;
  usage_count: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  applies_to: string;
}

export function PromoCodeManager() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed_amount',
    discount_value: '',
    min_purchase_amount: '0',
    max_discount_amount: '',
    usage_limit: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    is_active: true
  });

  useEffect(() => {
    loadPromoCodes();
  }, []);

  const loadPromoCodes = async () => {
    const { data } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setPromoCodes(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const promoData = {
      code: formData.code.toUpperCase().trim(),
      description: formData.description.trim(),
      discount_type: formData.discount_type,
      discount_value: parseFloat(formData.discount_value),
      min_purchase_amount: parseFloat(formData.min_purchase_amount),
      max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
      usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
      valid_from: new Date(formData.valid_from).toISOString(),
      valid_until: new Date(formData.valid_until + 'T23:59:59').toISOString(),
      is_active: formData.is_active,
      applies_to: 'all'
    };

    if (editingId) {
      await supabase
        .from('promo_codes')
        .update(promoData)
        .eq('id', editingId);
    } else {
      await supabase
        .from('promo_codes')
        .insert(promoData);
    }

    setShowForm(false);
    setEditingId(null);
    setFormData({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      min_purchase_amount: '0',
      max_discount_amount: '',
      usage_limit: '',
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      is_active: true
    });
    await loadPromoCodes();
  };

  const handleEdit = (promo: PromoCode) => {
    setEditingId(promo.id);
    setFormData({
      code: promo.code,
      description: promo.description || '',
      discount_type: promo.discount_type,
      discount_value: promo.discount_value.toString(),
      min_purchase_amount: promo.min_purchase_amount.toString(),
      max_discount_amount: promo.max_discount_amount?.toString() || '',
      usage_limit: promo.usage_limit?.toString() || '',
      valid_from: promo.valid_from.split('T')[0],
      valid_until: promo.valid_until.split('T')[0],
      is_active: promo.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;

    await supabase
      .from('promo_codes')
      .delete()
      .eq('id', id);

    await loadPromoCodes();
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    await supabase
      .from('promo_codes')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    await loadPromoCodes();
  };

  const getStatusBadge = (promo: PromoCode) => {
    const now = new Date();
    const validFrom = new Date(promo.valid_from);
    const validUntil = new Date(promo.valid_until);

    if (!promo.is_active) {
      return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">Inactive</span>;
    }
    if (now < validFrom) {
      return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">Scheduled</span>;
    }
    if (now > validUntil) {
      return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">Expired</span>;
    }
    if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
      return <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded">Limit Reached</span>;
    }
    return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">Active</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Promo Codes</h2>
          <p className="text-gray-600 mt-1">Manage discount codes and promotions</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
        >
          <Plus className="w-5 h-5" />
          Create Promo Code
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            {editingId ? 'Edit Promo Code' : 'Create New Promo Code'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Code *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="SUMMER2024"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Discount Type *
              </label>
              <select
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed_amount">Fixed Amount (€)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Summer sale - 20% off all deals"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Discount Value * {formData.discount_type === 'percentage' ? '(%)' : '(€)'}
              </label>
              <input
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                placeholder={formData.discount_type === 'percentage' ? '20' : '10'}
                step="0.01"
                min="0"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Min Purchase Amount (€)
              </label>
              <input
                type="number"
                value={formData.min_purchase_amount}
                onChange={(e) => setFormData({ ...formData, min_purchase_amount: e.target.value })}
                step="0.01"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {formData.discount_type === 'percentage' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Max Discount Amount (€)
                </label>
                <input
                  type="number"
                  value={formData.max_discount_amount}
                  onChange={(e) => setFormData({ ...formData, max_discount_amount: e.target.value })}
                  placeholder="Optional"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Usage Limit
              </label>
              <input
                type="number"
                value={formData.usage_limit}
                onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                placeholder="Unlimited"
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Valid From *
              </label>
              <input
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Valid Until *
              </label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-gray-700">Active</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              <Save className="w-5 h-5" />
              {editingId ? 'Update' : 'Create'} Promo Code
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Discount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Usage</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Valid Period</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {promoCodes.map((promo) => (
                <tr key={promo.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-gray-400" />
                      <span className="font-mono font-bold text-gray-900">{promo.code}</span>
                    </div>
                    {promo.description && (
                      <div className="text-xs text-gray-500 mt-1">{promo.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-gray-900">
                      {promo.discount_type === 'percentage'
                        ? `${promo.discount_value}%`
                        : `€${promo.discount_value}`
                      }
                    </div>
                    {promo.min_purchase_amount > 0 && (
                      <div className="text-xs text-gray-500">Min: €{promo.min_purchase_amount}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {promo.usage_count} {promo.usage_limit ? `/ ${promo.usage_limit}` : ''}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-gray-600">
                      {new Date(promo.valid_from).toLocaleDateString()} -<br />
                      {new Date(promo.valid_until).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(promo)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleActive(promo.id, promo.is_active)}
                        className={`px-3 py-1 text-xs font-semibold rounded ${
                          promo.is_active
                            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {promo.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleEdit(promo)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(promo.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {promoCodes.length === 0 && (
          <div className="p-12 text-center">
            <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No promo codes yet</p>
            <p className="text-sm text-gray-400 mt-2">Create your first promo code to start offering discounts</p>
          </div>
        )}
      </div>
    </div>
  );
}
