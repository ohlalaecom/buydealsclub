import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  Search,
  DollarSign,
  Store,
  LogOut,
  User,
  MessageSquare,
  Send
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { VendorDashboard } from './VendorDashboard';
import { VendorDealManager } from './VendorDealManager';
import { VendorSearchInsights } from './VendorSearchInsights';
import { VendorPricingRecommendations } from './VendorPricingRecommendations';
import { VendorReviews } from './VendorReviews';
import { VendorSuccessMetrics } from './VendorSuccessMetrics';
import { VendorRequestInsights } from './VendorRequestInsights';
import { VendorApplication } from './VendorApplication';

type VendorTab = 'dashboard' | 'deals' | 'insights' | 'pricing' | 'reviews' | 'requests';

export function VendorPortal() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<VendorTab>('dashboard');
  const [vendorProfile, setVendorProfile] = useState<any>(null);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkVendorStatus();
    }
  }, [user]);

  const checkVendorStatus = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('vendor_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profile && profile.is_verified) {
        setVendorProfile(profile);
      } else {
        const { data: application } = await supabase
          .from('vendor_applications')
          .select('status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        setApplicationStatus(application?.status || null);
      }
    } catch (error) {
      console.error('Error checking vendor status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!vendorProfile?.is_verified) {
    if (applicationStatus === 'pending') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Store className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Application Under Review</h2>
            <p className="text-gray-600 mb-6">
              Thank you for applying to become a Kokaa vendor. Our team is reviewing your application and will get back to you within 2-3 business days.
            </p>
            <button
              onClick={() => signOut()}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Sign Out
            </button>
          </div>
        </div>
      );
    }

    if (applicationStatus === 'rejected') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Store className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Application Not Approved</h2>
            <p className="text-gray-600 mb-6">
              Unfortunately, your vendor application was not approved at this time. Please contact support for more information.
            </p>
            <button
              onClick={() => signOut()}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Sign Out
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <VendorApplication onSuccess={() => checkVendorStatus()} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <Store className="w-8 h-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">Kokaa Vendor</span>
              </div>

              <div className="hidden md:flex items-center gap-1">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                    activeTab === 'dashboard'
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </button>

                <button
                  onClick={() => setActiveTab('deals')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                    activeTab === 'deals'
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  My Deals
                </button>

                <button
                  onClick={() => setActiveTab('insights')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                    activeTab === 'insights'
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  Search Insights
                </button>

                <button
                  onClick={() => setActiveTab('pricing')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                    activeTab === 'pricing'
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  Pricing
                </button>

                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                    activeTab === 'reviews'
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Reviews
                </button>

                <button
                  onClick={() => setActiveTab('requests')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                    activeTab === 'requests'
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  Requests
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-gray-900">
                  {vendorProfile.business_name}
                </div>
                <div className="text-xs text-gray-500">{user?.email}</div>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="md:hidden bg-white border-b border-gray-200">
        <div className="flex overflow-x-auto">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'deals', icon: Package, label: 'Deals' },
            { id: 'insights', icon: Search, label: 'Insights' },
            { id: 'pricing', icon: DollarSign, label: 'Pricing' },
            { id: 'reviews', icon: MessageSquare, label: 'Reviews' },
            { id: 'requests', icon: Send, label: 'Requests' }
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as VendorTab)}
              className={`flex items-center gap-2 px-6 py-4 font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <VendorDashboard />}
        {activeTab === 'deals' && <VendorDealManager />}
        {activeTab === 'insights' && <VendorSearchInsights />}
        {activeTab === 'pricing' && <VendorPricingRecommendations />}
        {activeTab === 'reviews' && <VendorReviews />}
        {activeTab === 'requests' && <VendorRequestInsights />}
      </main>
    </div>
  );
}
