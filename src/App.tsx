import { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { supabase } from './lib/supabase';
import { Header } from './components/Header';
import { DealCard } from './components/DealCard';
import { Footer } from './components/Footer';
import { Sparkles, TrendingUp, Shield, Gift, X } from 'lucide-react';
import { emailService } from './services/emailService';
import { getTranslatedDeal, DealTranslation } from './lib/dealTranslations';
import { trackEvent, initializeSession } from './services/analytics';

const AuthModal = lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const CartModal = lazy(() => import('./components/CartModal').then(m => ({ default: m.CartModal })));
const DealModal = lazy(() => import('./components/DealModal').then(m => ({ default: m.DealModal })));
const CheckoutModal = lazy(() => import('./components/CheckoutModal').then(m => ({ default: m.CheckoutModal })));
const ProfileModal = lazy(() => import('./components/ProfileModal').then(m => ({ default: m.ProfileModal })));
const AdminPanel = lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));
const VendorPortal = lazy(() => import('./components/VendorPortal').then(m => ({ default: m.VendorPortal })));
const ResetPasswordForm = lazy(() => import('./components/ResetPasswordForm').then(m => ({ default: m.ResetPasswordForm })));
const ChatBot = lazy(() => import('./components/ChatBot').then(m => ({ default: m.ChatBot })));
const WheelOfSurprise = lazy(() => import('./components/WheelOfSurprise').then(m => ({ default: m.WheelOfSurprise })));
const DealStreak = lazy(() => import('./components/DealStreak').then(m => ({ default: m.DealStreak })));
const DiscussionGroups = lazy(() =>
  import('./components/DiscussionGroups')
    .then(m => ({ default: m.DiscussionGroups }))
    .catch(err => {
      console.error('Failed to load DiscussionGroups:', err);
      return { default: () => <div className="p-6 text-center text-red-600">Failed to load component. Please refresh the page.</div> };
    })
);
const DealRequestBrowser = lazy(() =>
  import('./components/DealRequestBrowser')
    .then(m => ({ default: m.DealRequestBrowser }))
    .catch(err => {
      console.error('Failed to load DealRequestBrowser:', err);
      return { default: () => <div className="p-6 text-center text-red-600">Failed to load component. Please refresh the page.</div> };
    })
);
const WhatsAppButton = lazy(() => import('./components/WhatsAppButton'));

function AppContent() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const isResetPassword = window.location.pathname === '/reset-password';
  const [deals, setDeals] = useState<any[]>([]);
  const [dealTranslations, setDealTranslations] = useState<DealTranslation[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showWheelModal, setShowWheelModal] = useState(false);
  const [showDiscussionGroups, setShowDiscussionGroups] = useState(false);
  const [showDealRequests, setShowDealRequests] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');

    if (status === 'success') {
      setPaymentStatus('success');
      window.history.replaceState({}, '', window.location.pathname);
      if (user) {
        loadCart();
        loadDeals();
      }
    } else if (status === 'failed') {
      setPaymentStatus('failed');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadUserRole();
    } else {
      setUserRole(null);
      setRoleLoading(false);
    }
  }, [user]);

  const loadUserRole = async () => {
    if (!user) return;

    setRoleLoading(true);
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      setUserRole(data?.role || 'customer');
    } catch (error) {
      setUserRole('customer');
    } finally {
      setRoleLoading(false);
    }
  };

  useEffect(() => {
    initializeSession();
    loadCategories();
    loadDeals();
    loadDealTranslations();
    if (user) {
      loadCart();
    }
  }, [user, selectedCategory]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        if (userRole === 'admin') {
          setShowAdminPanel(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [userRole]);

  const loadCategories = async () => {
    const { data } = await supabase.from('categories').select('*');
    if (data) {
      setCategories(data);
    }
  };

  const loadDeals = async () => {
    setLoading(true);

    const { data: metrics } = await supabase
      .from('deal_metrics')
      .select('deal_id, smart_score');

    const metricsMap = new Map(metrics?.map(m => [m.deal_id, m.smart_score]) || []);

    let query = supabase
      .from('deals')
      .select('*, categories(*)')
      .eq('is_active', true);

    if (selectedCategory !== 'all') {
      const category = categories.find((c) => c.slug === selectedCategory);
      if (category) {
        query = query.eq('category_id', category.id);
      }
    }

    const { data } = await query;
    if (data) {
      const sortedDeals = data.sort((a, b) => {
        const scoreA = metricsMap.get(a.id) || 0;
        const scoreB = metricsMap.get(b.id) || 0;
        return scoreB - scoreA;
      });
      setDeals(sortedDeals);
    }
    setLoading(false);
  };

  const loadDealTranslations = async () => {
    const { data } = await supabase
      .from('deal_translations')
      .select('*');

    if (data) {
      setDealTranslations(data);
    }
  };

  const loadCart = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('cart_items')
      .select('*, deals(title, deal_price, image_url, stock_quantity)')
      .eq('user_id', user.id);

    if (data) {
      setCartItems(data);
    }
  };

  const handleAddToCart = async (dealId: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const existingItem = cartItems.find((item) => item.deal_id === dealId);

    if (existingItem) {
      await supabase
        .from('cart_items')
        .update({ quantity: existingItem.quantity + 1 })
        .eq('id', existingItem.id);
    } else {
      await supabase.from('cart_items').insert({
        user_id: user.id,
        deal_id: dealId,
        quantity: 1,
      });
    }

    loadCart();
  };

  const handleUpdateCartQuantity = async (itemId: string, quantity: number) => {
    await supabase.from('cart_items').update({ quantity }).eq('id', itemId);
    loadCart();
  };

  const handleRemoveFromCart = async (itemId: string) => {
    await supabase.from('cart_items').delete().eq('id', itemId);
    loadCart();
  };

  const handleCheckout = async (checkoutData: any) => {
    if (!user) return;

    trackEvent({
      eventType: 'checkout_start',
      userId: user.id
    });

    const { shippingAddress, pointsRedeemed, paymentCurrency, totalInEur } = checkoutData;
    let totalSpent = 0;
    let pointsEarned = 0;
    let newBalance = 0;

    for (const item of cartItems) {
      const { data: currentDeal } = await supabase
        .from('deals')
        .select('sold_quantity, stock_quantity')
        .eq('id', item.deal_id)
        .single();

      if (!item.deals) continue;

      const itemTotal = item.deals.deal_price * item.quantity;
      totalSpent += itemTotal;

      await supabase.from('orders').insert({
        user_id: user.id,
        deal_id: item.deal_id,
        quantity: item.quantity,
        unit_price: item.deals.deal_price,
        total_price: itemTotal,
        status: 'confirmed',
        shipping_address: shippingAddress,
      });

      if (currentDeal) {
        await supabase
          .from('deals')
          .update({
            sold_quantity: currentDeal.sold_quantity + item.quantity,
            stock_quantity: currentDeal.stock_quantity - item.quantity,
          })
          .eq('id', item.deal_id);
      }
    }

    const { data: loyaltyAccount } = await supabase
      .from('loyalty_accounts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (loyaltyAccount) {
      const { data: settings } = await supabase
        .from('loyalty_settings')
        .select('points_per_euro')
        .limit(1)
        .maybeSingle();

      const pointsPerEuro = settings?.points_per_euro || 10;
      pointsEarned = Math.floor(totalInEur * pointsPerEuro);

      newBalance = loyaltyAccount.points_balance + pointsEarned - pointsRedeemed;

      await supabase
        .from('loyalty_accounts')
        .update({
          points_balance: newBalance,
          lifetime_points_earned: loyaltyAccount.lifetime_points_earned + pointsEarned,
          lifetime_points_spent: loyaltyAccount.lifetime_points_spent + pointsRedeemed,
        })
        .eq('user_id', user.id);

      if (pointsEarned > 0) {
        await supabase.from('loyalty_transactions').insert({
          user_id: user.id,
          account_id: loyaltyAccount.id,
          transaction_type: 'earn',
          points_amount: pointsEarned,
          description: `Earned ${pointsEarned} points from purchase of €${totalInEur.toFixed(2)}`,
        });
      }

      if (pointsRedeemed > 0) {
        await supabase.from('loyalty_transactions').insert({
          user_id: user.id,
          account_id: loyaltyAccount.id,
          transaction_type: 'redeem',
          points_amount: -pointsRedeemed,
          description: `Redeemed ${pointsRedeemed} points for €${(pointsRedeemed * 0.01).toFixed(2)} discount`,
        });
      }
    }

    await supabase.from('cart_items').delete().eq('user_id', user.id);

    for (const item of cartItems) {
      trackEvent({
        eventType: 'complete_purchase',
        dealId: item.deal_id,
        userId: user.id,
        metadata: {
          quantity: item.quantity,
          price: item.deals?.deal_price
        }
      });
    }

    if (user.email && pointsEarned > 0) {
      emailService.sendLoyaltyPointsEarned(
        user.id,
        user.email,
        pointsEarned,
        newBalance
      );
    }

    if (user.email && pointsRedeemed > 0) {
      emailService.sendLoyaltyPointsRedeemed(
        user.id,
        user.email,
        pointsRedeemed,
        pointsRedeemed * 0.01
      );
    }

    if (user.email) {
      emailService.sendOrderConfirmation(
        cartItems[0]?.id || 'order',
        user.id,
        {
          items: cartItems,
          total: totalInEur,
          shippingAddress,
        }
      );
    }

    setCartItems([]);
    setShowCheckoutModal(false);
    setShowCartModal(false);
    loadDeals();
  };

  const handleViewDeal = (dealId: string) => {
    setSelectedDealId(dealId);
    setShowDealModal(true);
  };

  if (isResetPassword) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    );
  }

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (userRole === 'vendor') {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      }>
        <VendorPortal />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header
        cartCount={cartItems.length}
        onCartClick={() => setShowCartModal(true)}
        onAuthClick={() => (user ? setShowProfileModal(true) : setShowAuthModal(true))}
        onCategoryClick={(slug) => setSelectedCategory(slug)}
        onDiscussionClick={() => setShowDiscussionGroups(true)}
        onRequestDealClick={() => setShowDealRequests(true)}
        categories={categories}
      />

      {user && (
        <div className="fixed top-20 right-6 z-40">
          <button
            onClick={() => setShowWheelModal(true)}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full p-3 shadow-2xl hover:scale-110 transition-transform animate-bounce"
            title={t('spinTheWheel')}
          >
            <Gift className="w-6 h-6" />
          </button>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-black text-gray-900 mb-4 flex items-center justify-center gap-3">
            <Sparkles className="w-12 h-12 text-yellow-500" />
            {t('todaysDeals')}
            <Sparkles className="w-12 h-12 text-yellow-500" />
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('joinCommunity')}
          </p>

          <div className="flex items-center justify-center gap-8 mt-6">
            <div className="flex items-center gap-2 text-gray-700">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="font-semibold">{t('twentyFourHourDeals')}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Shield className="w-5 h-5 text-blue-600" />
              <span className="font-semibold">{t('secureCheckout')}</span>
            </div>
          </div>
        </div>

        {user && (
          <Suspense fallback={<div className="mb-6 h-32 bg-gray-100 animate-pulse rounded-lg"></div>}>
            <div className="mb-6">
              <DealStreak />
            </div>
          </Suspense>
        )}

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">{t('loadingDeals')}</p>
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-lg">
            <p className="text-gray-500 text-xl mb-4">{t('noDealsInCategory')}</p>
            <button
              onClick={() => setSelectedCategory('all')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              {t('viewAllDeals')}
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {deals.map((deal) => {
              const translatedDeal = getTranslatedDeal(deal, dealTranslations, language);
              return (
                <DealCard
                  key={deal.id}
                  deal={translatedDeal}
                  onAddToCart={handleAddToCart}
                  onViewDetails={handleViewDeal}
                />
              );
            })}
          </div>
        )}

        <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-2xl">
          <div className="max-w-3xl mx-auto text-center">
            <h3 className="text-3xl font-bold mb-4">{t('joinKokaa')}</h3>
            <p className="text-lg mb-6 opacity-90">
              {t('joinDescription')}
            </p>
            {!user && (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-bold text-lg shadow-lg"
              >
                {t('joinNow')}
              </button>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {paymentStatus === 'success' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Payment Successful!</h3>
            <p className="text-gray-600 mb-6">
              Thank you for your purchase. Your order has been confirmed and you'll receive a confirmation email shortly.
            </p>
            <button
              onClick={() => setPaymentStatus(null)}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}

      {paymentStatus === 'failed' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Payment Failed</h3>
            <p className="text-gray-600 mb-6">
              Your payment could not be processed. Please try again or contact support if the problem persists.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPaymentStatus(null);
                  setShowCartModal(true);
                }}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all"
              >
                Try Again
              </button>
              <button
                onClick={() => setPaymentStatus(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <Suspense fallback={null}>
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
        {showCartModal && (
          <CartModal
            items={cartItems}
            onClose={() => setShowCartModal(false)}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveFromCart}
            onCheckout={() => {
              setShowCartModal(false);
              setShowCheckoutModal(true);
            }}
          />
        )}
        {showDealModal && selectedDealId && (
          <DealModal
            dealId={selectedDealId}
            onClose={() => {
              setShowDealModal(false);
              setSelectedDealId(null);
            }}
            onAddToCart={handleAddToCart}
          />
        )}
        {showCheckoutModal && (
          <CheckoutModal
            total={cartItems.reduce((sum, item) => sum + (item.deals?.deal_price || 0) * item.quantity, 0)}
            cartItems={cartItems}
            onClose={() => setShowCheckoutModal(false)}
          />
        )}
        {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}
        {showAdminPanel && <AdminPanel onClose={() => setShowAdminPanel(false)} />}
        {showWheelModal && <WheelOfSurprise onClose={() => setShowWheelModal(false)} />}
      </Suspense>
      {showDiscussionGroups && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-gray-900">{t('discussionGroups')}</h2>
              <button
                onClick={() => setShowDiscussionGroups(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <Suspense fallback={
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                </div>
              }>
                <DiscussionGroups />
              </Suspense>
            </div>
          </div>
        </div>
      )}
      {showDealRequests && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-gray-900">Deal Requests</h2>
              <button
                onClick={() => setShowDealRequests(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <Suspense fallback={
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                </div>
              }>
                <DealRequestBrowser />
              </Suspense>
            </div>
          </div>
        </div>
      )}
      <Suspense fallback={null}>
        <ChatBot />
        <WhatsAppButton />
      </Suspense>
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
