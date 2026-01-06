import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Language = 'en' | 'el' | 'ru' | 'de' | 'fr';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  en: {
    siteName: 'Buy Deals Club',
    todaysDeals: "Today's Exclusive Deals",
    joinCommunity: 'Join thousands of savvy shoppers enjoying incredible flash sales on unique products every day',
    twentyFourHourDeals: '24-Hour Deals',
    secureCheckout: 'Secure Checkout',
    adminPanel: 'Admin Panel',
    loadingDeals: 'Loading amazing deals...',
    noDealsInCategory: 'No deals available in this category',
    viewAllDeals: 'View All Deals',
    joinKokaa: 'Join Buy Deals Club',
    joinDescription: "Be part of the most exciting deals community. Discover unique deals, share experiences, and enjoy exclusive member benefits.",
    joinNow: "Join Now - It's Free!",
    dailyDeals: 'Your daily dose of amazing deals and community-driven shopping',
    discussionGroups: 'Discussion Groups',
    cart: 'Cart',
    profile: 'Profile',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    spinTheWheel: 'Spin the Wheel!',
  },
  el: {
    siteName: 'Buy Deals Club',
    todaysDeals: 'Αποκλειστικές Προσφορές Σήμερα',
    joinCommunity: 'Ενωθείτε με χιλιάδες έξυπνους αγοραστές που απολαμβάνουν απίστευτες flash sales σε μοναδικά προϊόντα κάθε μέρα',
    twentyFourHourDeals: 'Προσφορές 24 Ωρών',
    secureCheckout: 'Ασφαλής Πληρωμή',
    adminPanel: 'Πίνακας Διαχείρισης',
    loadingDeals: 'Φόρτωση καταπληκτικών προσφορών...',
    noDealsInCategory: 'Δεν υπάρχουν διαθέσιμες προσφορές σε αυτήν την κατηγορία',
    viewAllDeals: 'Προβολή Όλων των Προσφορών',
    joinKokaa: 'Γίνετε Μέλος του Buy Deals Club',
    joinDescription: 'Γίνετε μέρος της πιο συναρπαστικής κοινότητας προσφορών. Ανακαλύψτε μοναδικές προσφορές, μοιραστείτε εμπειρίες και απολαύστε αποκλειστικά προνόμια μελών.',
    joinNow: 'Εγγραφείτε Τώρα - Είναι Δωρεάν!',
    dailyDeals: 'Η καθημερινή σας δόση καταπληκτικών προσφορών και κοινοτικών αγορών',
    discussionGroups: 'Ομάδες Συζήτησης',
    cart: 'Καλάθι',
    profile: 'Προφίλ',
    signIn: 'Σύνδεση',
    signOut: 'Αποσύνδεση',
    spinTheWheel: 'Γυρίστε τον Τροχό!',
  },
  ru: {
    siteName: 'Buy Deals Club',
    todaysDeals: 'Эксклюзивные Предложения Сегодня',
    joinCommunity: 'Присоединяйтесь к тысячам умных покупателей, наслаждающихся невероятными флэш-распродажами уникальных товаров каждый день',
    twentyFourHourDeals: 'Предложения 24 Часа',
    secureCheckout: 'Безопасная Оплата',
    adminPanel: 'Панель Администратора',
    loadingDeals: 'Загрузка удивительных предложений...',
    noDealsInCategory: 'Нет доступных предложений в этой категории',
    viewAllDeals: 'Показать Все Предложения',
    joinKokaa: 'Присоединяйтесь к Buy Deals Club',
    joinDescription: 'Станьте частью самого захватывающего сообщества предложений. Откройте для себя уникальные предложения, делитесь опытом и наслаждайтесь эксклюзивными привилегиями для участников.',
    joinNow: 'Присоединиться Сейчас - Бесплатно!',
    dailyDeals: 'Ваша ежедневная доза удивительных предложений и покупок в сообществе',
    discussionGroups: 'Группы Обсуждений',
    cart: 'Корзина',
    profile: 'Профиль',
    signIn: 'Войти',
    signOut: 'Выйти',
    spinTheWheel: 'Крутите Колесо!',
  },
  de: {
    siteName: 'Buy Deals Club',
    todaysDeals: 'Heutige Exklusive Angebote',
    joinCommunity: 'Schließen Sie sich Tausenden von klugen Käufern an, die jeden Tag unglaubliche Flash-Sales auf einzigartige Produkte genießen',
    twentyFourHourDeals: '24-Stunden-Angebote',
    secureCheckout: 'Sichere Bezahlung',
    adminPanel: 'Admin-Panel',
    loadingDeals: 'Lade fantastische Angebote...',
    noDealsInCategory: 'Keine Angebote in dieser Kategorie verfügbar',
    viewAllDeals: 'Alle Angebote Anzeigen',
    joinKokaa: 'Treten Sie Buy Deals Club Bei',
    joinDescription: 'Werden Sie Teil der aufregendsten Angebots-Community. Entdecken Sie einzigartige Angebote, teilen Sie Erfahrungen und genießen Sie exklusive Mitgliedervorteile.',
    joinNow: 'Jetzt Beitreten - Kostenlos!',
    dailyDeals: 'Ihre tägliche Dosis fantastischer Angebote und gemeinschaftsorientiertes Einkaufen',
    discussionGroups: 'Diskussionsgruppen',
    cart: 'Warenkorb',
    profile: 'Profil',
    signIn: 'Anmelden',
    signOut: 'Abmelden',
    spinTheWheel: 'Drehen Sie das Rad!',
  },
  fr: {
    siteName: 'Buy Deals Club',
    todaysDeals: "Offres Exclusives d'Aujourd'hui",
    joinCommunity: 'Rejoignez des milliers d\'acheteurs avisés profitant d\'incroyables ventes flash sur des produits uniques chaque jour',
    twentyFourHourDeals: 'Offres 24 Heures',
    secureCheckout: 'Paiement Sécurisé',
    adminPanel: 'Panneau d\'Administration',
    loadingDeals: 'Chargement des offres incroyables...',
    noDealsInCategory: 'Aucune offre disponible dans cette catégorie',
    viewAllDeals: 'Voir Toutes les Offres',
    joinKokaa: 'Rejoignez Buy Deals Club',
    joinDescription: 'Faites partie de la communauté d\'offres la plus passionnante. Découvrez des offres uniques, partagez des expériences et profitez d\'avantages exclusifs pour les membres.',
    joinNow: 'Rejoignez Maintenant - C\'est Gratuit!',
    dailyDeals: 'Votre dose quotidienne d\'offres incroyables et d\'achats communautaires',
    discussionGroups: 'Groupes de Discussion',
    cart: 'Panier',
    profile: 'Profil',
    signIn: 'Se Connecter',
    signOut: 'Se Déconnecter',
    spinTheWheel: 'Tournez la Roue!',
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('buydealsclub-language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('buydealsclub-language', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
