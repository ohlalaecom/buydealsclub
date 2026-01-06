import { useState, useEffect } from 'react';
import { Mail, Save, CheckCircle, Bell, ShoppingBag, Coins, Newspaper } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function EmailPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState({
    marketing_emails: false,
    deal_notifications: true,
    loyalty_notifications: true,
    order_updates: true,
    newsletter_subscribed: false,
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('email_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setPreferences({
          marketing_emails: data.marketing_emails,
          deal_notifications: data.deal_notifications,
          loyalty_notifications: data.loyalty_notifications,
          order_updates: data.order_updates,
          newsletter_subscribed: data.newsletter_subscribed,
        });
      }
    } catch (error) {
      console.error('Load preferences error:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    setSaved(false);

    try {
      const { error } = await supabase
        .from('email_preferences')
        .update({
          ...preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (!error) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Update preferences error:', error);
    }

    setLoading(false);
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8">
      <div className="flex items-center gap-3 mb-6">
        <Mail className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Email Preferences</h2>
      </div>

      <p className="text-gray-600 mb-6">
        Control which emails you receive from Kokaa. You can always unsubscribe at any time.
      </p>

      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-blue-600" />
            <div>
              <label className="block font-semibold text-gray-900">
                Marketing Emails
              </label>
              <p className="text-sm text-gray-600">
                Promotional offers and special deals
              </p>
            </div>
          </div>
          <button
            onClick={() => setPreferences({ ...preferences, marketing_emails: !preferences.marketing_emails })}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              preferences.marketing_emails ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                preferences.marketing_emails ? 'transform translate-x-7' : ''
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-5 h-5 text-blue-600" />
            <div>
              <label className="block font-semibold text-gray-900">
                Deal Notifications
              </label>
              <p className="text-sm text-gray-600">
                Daily deal alerts and flash sales
              </p>
            </div>
          </div>
          <button
            onClick={() => setPreferences({ ...preferences, deal_notifications: !preferences.deal_notifications })}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              preferences.deal_notifications ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                preferences.deal_notifications ? 'transform translate-x-7' : ''
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          <div className="flex items-center gap-3">
            <Coins className="w-5 h-5 text-yellow-600" />
            <div>
              <label className="block font-semibold text-gray-900">
                Loyalty Notifications
              </label>
              <p className="text-sm text-gray-600">
                Points earned, redeemed, and tier upgrades
              </p>
            </div>
          </div>
          <button
            onClick={() => setPreferences({ ...preferences, loyalty_notifications: !preferences.loyalty_notifications })}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              preferences.loyalty_notifications ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                preferences.loyalty_notifications ? 'transform translate-x-7' : ''
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-5 h-5 text-green-600" />
            <div>
              <label className="block font-semibold text-gray-900">
                Order Updates
              </label>
              <p className="text-sm text-gray-600">
                Confirmations, shipping, and delivery notifications
              </p>
            </div>
          </div>
          <button
            onClick={() => setPreferences({ ...preferences, order_updates: !preferences.order_updates })}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              preferences.order_updates ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                preferences.order_updates ? 'transform translate-x-7' : ''
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          <div className="flex items-center gap-3">
            <Newspaper className="w-5 h-5 text-purple-600" />
            <div>
              <label className="block font-semibold text-gray-900">
                Newsletter
              </label>
              <p className="text-sm text-gray-600">
                Weekly roundup of best deals and platform news
              </p>
            </div>
          </div>
          <button
            onClick={() => setPreferences({ ...preferences, newsletter_subscribed: !preferences.newsletter_subscribed })}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              preferences.newsletter_subscribed ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                preferences.newsletter_subscribed ? 'transform translate-x-7' : ''
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-blue-900 mb-2">Important</h4>
        <p className="text-sm text-blue-800">
          Transactional emails (order confirmations, password resets) cannot be disabled as they are essential for your account security and order tracking.
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
      >
        {saved ? (
          <>
            <CheckCircle className="w-5 h-5" />
            Saved Successfully!
          </>
        ) : (
          <>
            <Save className="w-5 h-5" />
            {loading ? 'Saving...' : 'Save Preferences'}
          </>
        )}
      </button>
    </div>
  );
}
