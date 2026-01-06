import { X, CreditCard, MapPin, DollarSign, Gift } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CheckoutModalProps {
  total: number;
  cartItems: any[];
  onClose: () => void;
}

const EXCHANGE_RATES = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.86,
  CHF: 0.94
};

export function CheckoutModal({ total, cartItems, onClose }: CheckoutModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentCurrency, setPaymentCurrency] = useState<'EUR' | 'USD' | 'GBP' | 'CHF'>('EUR');
  const [wheelDiscounts, setWheelDiscounts] = useState<any[]>([]);
  const [selectedWheelDiscount, setSelectedWheelDiscount] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    address: '',
    city: '',
    postalCode: '',
    phone: '',
  });

  useEffect(() => {
    if (user) {
      loadWheelDiscounts();
    }
  }, [user]);

  const loadWheelDiscounts = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('wheel_spins')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_redeemed', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (data) {
      setWheelDiscounts(data);
    }
  };

  const selectedDiscount = wheelDiscounts.find(d => d.id === selectedWheelDiscount);
  const wheelDiscountAmount = selectedDiscount ? (total * selectedDiscount.discount_percentage / 100) : 0;
  const subtotalAfterWheel = Math.max(0, total - wheelDiscountAmount);
  const finalTotal = subtotalAfterWheel * EXCHANGE_RATES[paymentCurrency];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (selectedWheelDiscount) {
        await supabase
          .from('wheel_spins')
          .update({ is_redeemed: true })
          .eq('id', selectedWheelDiscount);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const orderId = `KOKAA${Date.now()}${Math.random().toString(36).substring(7)}`;
      const returnUrl = `${window.location.origin}`;

      const [firstName, ...lastNameParts] = formData.fullName.split(' ');
      const lastName = lastNameParts.join(' ') || firstName;

      const orderItems = cartItems.map((item) => ({
        dealId: item.deal_id,
        name: item.deals?.title || 'Product',
        quantity: item.quantity,
        price: item.deals?.deal_price || 0,
      }));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/viva-wallet-initiate-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            orderId,
            amount: subtotalAfterWheel,
            currency: 'EUR',
            orderItems,
            customerInfo: {
              firstName,
              lastName,
              email: user?.email || '',
              phone: formData.phone,
              address: formData.address,
              city: formData.city,
              zipCode: formData.postalCode,
              country: 'CY',
              returnUrl,
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment initiation failed');
      }

      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('Invalid payment response');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert(`Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLoading(false);
    }
  };

  const getCurrencySymbol = (currency: string) => {
    switch(currency) {
      case 'EUR': return '€';
      case 'USD': return '$';
      case 'GBP': return '£';
      case 'CHF': return 'CHF ';
      default: return '€';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-gray-900">Checkout</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6"
          onInvalid={(e) => {
            console.log('=== FORM VALIDATION FAILED ===');
            console.log('Invalid field:', e.target);
          }}
        >
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Shipping Address
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          {user && wheelDiscounts.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Gift className="w-5 h-5 text-purple-600" />
                Wheel of Surprise Discount
              </h3>
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                <p className="text-sm text-gray-700 mb-3">You have {wheelDiscounts.length} available discount(s)!</p>
                <div className="space-y-2">
                  {wheelDiscounts.map((discount) => (
                    <button
                      key={discount.id}
                      type="button"
                      onClick={() => setSelectedWheelDiscount(discount.id === selectedWheelDiscount ? null : discount.id)}
                      className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                        selectedWheelDiscount === discount.id
                          ? 'border-purple-500 bg-purple-100'
                          : 'border-purple-200 bg-white hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-purple-700 text-lg">{discount.prize_won}</span>
                          <p className="text-xs text-gray-600 mt-1">
                            Expires: {new Date(discount.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                        {selectedWheelDiscount === discount.id && (
                          <span className="text-green-600 font-semibold text-sm">Applied</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                {selectedDiscount && (
                  <div className="mt-3 text-sm text-green-700 font-semibold">
                    You'll save €{wheelDiscountAmount.toFixed(2)} with this discount!
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Payment Currency
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {(Object.keys(EXCHANGE_RATES) as Array<keyof typeof EXCHANGE_RATES>).map((currency) => (
                <button
                  key={currency}
                  type="button"
                  onClick={() => setPaymentCurrency(currency)}
                  className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                    paymentCurrency === currency
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {currency}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">€{total.toFixed(2)}</span>
              </div>
              {wheelDiscountAmount > 0 && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Wheel Discount ({selectedDiscount?.discount_percentage}%)</span>
                  <span className="font-semibold text-purple-600">-€{wheelDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Shipping</span>
                <span className="font-semibold text-green-600">Free</span>
              </div>
              {paymentCurrency !== 'EUR' && (
                <div className="flex justify-between items-center mb-2 text-sm">
                  <span className="text-gray-500">Exchange Rate</span>
                  <span className="text-gray-600">1 EUR = {EXCHANGE_RATES[paymentCurrency].toFixed(2)} {paymentCurrency}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-blue-600">
                      {getCurrencySymbol(paymentCurrency)}{finalTotal.toFixed(2)}
                    </span>
                    {paymentCurrency !== 'EUR' && (
                      <div className="text-sm text-gray-500">
                        (€{subtotalAfterWheel.toFixed(2)})
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              onClick={(e) => {
                console.log('=== BUTTON CLICKED ===');
                console.log('Button disabled?', loading);
                const form = e.currentTarget.form;
                console.log('Form element:', form);
                console.log('Form valid?', form?.checkValidity());

                if (form && !form.checkValidity()) {
                  console.log('=== FORM IS INVALID - CHECKING FIELDS ===');
                  const inputs = form.querySelectorAll('input[required]');
                  inputs.forEach((input: any) => {
                    if (!input.validity.valid) {
                      console.log('Invalid field:', input.name || input.type, 'Value:', input.value);
                    }
                  });
                  form.reportValidity();
                }
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              {loading ? 'Processing...' : 'Complete Order'}
            </button>

            <p className="text-sm text-gray-500 text-center mt-4">
              Your payment information is secure and encrypted
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
