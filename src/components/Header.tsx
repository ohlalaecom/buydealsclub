import { useState } from 'react';
import { ShoppingCart, User, Menu, X, LogIn, LogOut, MessageSquare, Globe, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface HeaderProps {
  cartCount: number;
  onCartClick: () => void;
  onAuthClick: () => void;
  onCategoryClick: (slug: string) => void;
  onDiscussionClick?: () => void;
  onRequestDealClick?: () => void;
  categories: Array<{ slug: string; name: string; color: string }>;
}

const LANGUAGES = {
  en: { name: 'English', flag: '🇬🇧' },
  el: { name: 'Ελληνικά', flag: '🇬🇷' },
  ru: { name: 'Русский', flag: '🇷🇺' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  fr: { name: 'Français', flag: '🇫🇷' },
};

export function Header({ cartCount, onCartClick, onAuthClick, onCategoryClick, onDiscussionClick, onRequestDealClick, categories }: HeaderProps) {
  const { user, userProfile, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 cursor-pointer"
                onClick={() => onCategoryClick('all')}>
              Buy Deals Club
            </h1>

            <nav className="hidden md:flex items-center gap-1">
              {categories.map((category) => (
                <button
                  key={category.slug}
                  onClick={() => onCategoryClick(category.slug)}
                  className="px-3 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-sm"
                  style={{ color: category.color }}
                >
                  {category.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Change Language"
              >
                <Globe className="w-6 h-6 text-gray-700" />
              </button>
              {showLanguageMenu && (
                <div className="absolute right-0 top-12 bg-white rounded-lg shadow-xl py-2 min-w-[140px] z-50 border border-gray-200">
                  {Object.entries(LANGUAGES).map(([code, { name, flag }]) => (
                    <button
                      key={code}
                      onClick={() => {
                        setLanguage(code as any);
                        setShowLanguageMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center gap-2 ${
                        language === code ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
                      }`}
                    >
                      <span className="text-xl">{flag}</span>
                      <span className="text-sm">{name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {onRequestDealClick && (
              <button
                onClick={onRequestDealClick}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-semibold text-sm flex items-center gap-2 shadow-md"
                title="Request a Deal"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Request Deal</span>
              </button>
            )}
            {onDiscussionClick && (
              <button
                onClick={onDiscussionClick}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title={t('discussionGroups')}
              >
                <MessageSquare className="w-6 h-6 text-gray-700" />
              </button>
            )}
            <button
              onClick={onCartClick}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ShoppingCart className="w-6 h-6 text-gray-700" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={onAuthClick}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <User className="w-6 h-6 text-gray-700" />
                  </button>
                  {userProfile && (
                    <span className={`absolute -bottom-1 -right-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      userProfile.isVendor
                        ? 'bg-blue-600 text-white'
                        : 'bg-green-600 text-white'
                    }`}>
                      {userProfile.isVendor ? 'V' : 'C'}
                    </span>
                  )}
                </div>
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  {t('signOut')}
                </button>
              </div>
            ) : (
              <button
                onClick={onAuthClick}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                {t('signIn')}
              </button>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="px-4 py-3 space-y-2">
            {categories.map((category) => (
              <button
                key={category.slug}
                onClick={() => {
                  onCategoryClick(category.slug);
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                style={{ color: category.color }}
              >
                {category.name}
              </button>
            ))}

            {/* Request Deal and Discussion buttons for mobile */}
            <div className="pt-2 border-t border-gray-200 space-y-2">
              {onRequestDealClick && (
                <button
                  onClick={() => {
                    onRequestDealClick();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold"
                >
                  <Send className="w-5 h-5" />
                  Request Deal
                </button>
              )}
              {onDiscussionClick && (
                <button
                  onClick={() => {
                    onDiscussionClick();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 rounded-lg font-semibold"
                >
                  <MessageSquare className="w-5 h-5" />
                  {t('discussionGroups')}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
              <button
                onClick={() => {
                  onCartClick();
                  setMobileMenuOpen(false);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 rounded-lg"
              >
                <ShoppingCart className="w-5 h-5" />
                {t('cart')} ({cartCount})
              </button>
              {user ? (
                <>
                  <button
                    onClick={() => {
                      onAuthClick();
                      setMobileMenuOpen(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 rounded-lg relative"
                  >
                    <User className="w-5 h-5" />
                    {t('profile')}
                    {userProfile && (
                      <span className={`ml-1 text-xs font-bold px-2 py-0.5 rounded ${
                        userProfile.isVendor
                          ? 'bg-blue-600 text-white'
                          : 'bg-green-600 text-white'
                      }`}>
                        {userProfile.isVendor ? 'Vendor' : 'Consumer'}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    onAuthClick();
                    setMobileMenuOpen(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  <LogIn className="w-5 h-5" />
                  {t('signIn')}
                </button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
