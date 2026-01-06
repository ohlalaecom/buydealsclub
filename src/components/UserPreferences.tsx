import { useState, useEffect } from 'react';
import { Bell, Mail, Shield, Eye, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function UserPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState({
    email_notifications: true,
    push_notifications: false,
    deal_alerts: true,
    newsletter: true,
    price_drop_alerts: true,
    order_updates: true,
    marketing_emails: false,
    privacy_mode: false,
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setPreferences({
        email_notifications: data.email_notifications ?? true,
        push_notifications: data.push_notifications ?? false,
        deal_alerts: data.deal_alerts ?? true,
        newsletter: data.newsletter ?? true,
        price_drop_alerts: data.price_drop_alerts ?? true,
        order_updates: data.order_updates ?? true,
        marketing_emails: data.marketing_emails ?? false,
        privacy_mode: data.privacy_mode ?? false,
      });
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setSaveMessage('');

    const { data: existing } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let error;
    if (existing) {
      const result = await supabase
        .from('user_preferences')
        .update(preferences)
        .eq('user_id', user.id);
      error = result.error;
    } else {
      const result = await supabase.from('user_preferences').insert({
        user_id: user.id,
        ...preferences,
      });
      error = result.error;
    }

    if (!error) {
      setSaveMessage('Preferences saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } else {
      setSaveMessage('Error saving preferences');
    }

    setSaving(false);
  };

  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const PreferenceToggle = ({
    label,
    description,
    value,
    onChange,
    icon: Icon,
  }: {
    label: string;
    description: string;
    value: boolean;
    onChange: () => void;
    icon: any;
  }) => (
    <div className="flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
      <div className="mt-1">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-gray-900 mb-1">{label}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          value ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please sign in to manage your preferences</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
        <h2 className="text-3xl font-bold mb-2">Your Preferences</h2>
        <p className="opacity-90">Customize your Kokaa experience</p>
      </div>

      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Bell className="w-6 h-6 text-blue-600" />
          Notifications
        </h3>
        <div className="space-y-3">
          <PreferenceToggle
            icon={Mail}
            label="Email Notifications"
            description="Receive notifications via email"
            value={preferences.email_notifications}
            onChange={() => handleToggle('email_notifications')}
          />
          <PreferenceToggle
            icon={Bell}
            label="Deal Alerts"
            description="Get notified when new deals match your interests"
            value={preferences.deal_alerts}
            onChange={() => handleToggle('deal_alerts')}
          />
          <PreferenceToggle
            icon={Bell}
            label="Price Drop Alerts"
            description="Notify me when prices drop on saved items"
            value={preferences.price_drop_alerts}
            onChange={() => handleToggle('price_drop_alerts')}
          />
          <PreferenceToggle
            icon={Bell}
            label="Order Updates"
            description="Get updates about your orders and deliveries"
            value={preferences.order_updates}
            onChange={() => handleToggle('order_updates')}
          />
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Mail className="w-6 h-6 text-blue-600" />
          Email Preferences
        </h3>
        <div className="space-y-3">
          <PreferenceToggle
            icon={Mail}
            label="Newsletter"
            description="Receive our weekly newsletter with curated deals"
            value={preferences.newsletter}
            onChange={() => handleToggle('newsletter')}
          />
          <PreferenceToggle
            icon={Mail}
            label="Marketing Emails"
            description="Receive promotional offers and special deals"
            value={preferences.marketing_emails}
            onChange={() => handleToggle('marketing_emails')}
          />
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-600" />
          Privacy
        </h3>
        <div className="space-y-3">
          <PreferenceToggle
            icon={Eye}
            label="Privacy Mode"
            description="Hide your activity from other users"
            value={preferences.privacy_mode}
            onChange={() => handleToggle('privacy_mode')}
          />
        </div>
      </div>

      <div className="flex items-center justify-between bg-white rounded-xl p-6 border-2 border-gray-200">
        <div>
          {saveMessage && (
            <p
              className={`text-sm font-semibold ${
                saveMessage.includes('success') ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {saveMessage}
            </p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
