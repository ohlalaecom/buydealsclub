import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Globe } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { storeQueryWithCategory } from '../services/aiCategorizer';
import { trackEvent } from '../services/analytics';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

const LANGUAGES = {
  en: { name: 'English', flag: '🇬🇧' },
  el: { name: 'Ελληνικά', flag: '🇬🇷' },
  ru: { name: 'Русский', flag: '🇷🇺' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  fr: { name: 'Français', flag: '🇫🇷' },
};

const WELCOME_MESSAGES = {
  en: "Hi! I'm your Kokaa shopping assistant. How can I help you today?",
  el: 'Γεια σας! Είμαι ο βοηθός αγορών Kokaa. Πώς μπορώ να σας βοηθήσω σήμερα;',
  ru: 'Привет! Я ваш помощник по покупкам Kokaa. Как я могу вам помочь сегодня?',
  de: 'Hallo! Ich bin Ihr Kokaa Einkaufsassistent. Wie kann ich Ihnen heute helfen?',
  fr: 'Bonjour! Je suis votre assistant shopping Kokaa. Comment puis-je vous aider aujourd’hui?',
};

const TYPING_MESSAGES = {
  en: 'Typing...',
  el: 'Γράφει...',
  ru: 'Печатает...',
  de: 'Schreibt...',
  fr: 'Tape...',
};

export function ChatBot() {
  const { user } = useAuth();
  const { language: siteLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState<'en' | 'el' | 'ru' | 'de' | 'fr'>('en');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: WELCOME_MESSAGES.en,
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setLanguage(siteLanguage as 'en' | 'el' | 'ru' | 'de' | 'fr');
  }, [siteLanguage]);

  useEffect(() => {
    setMessages([
      {
        id: '1',
        text: WELCOME_MESSAGES[language],
        sender: 'bot',
        timestamp: new Date(),
      },
    ]);
    setConversationHistory([]);
  }, [language]);

  const handleLanguageChange = (lang: 'en' | 'el' | 'ru' | 'de' | 'fr') => {
    setLanguage(lang);
    setShowLanguageMenu(false);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);

    await storeQueryWithCategory(currentInput, user?.id);

    trackEvent({
      eventType: 'conversation_query',
      userId: user?.id,
      metadata: { query: currentInput }
    });

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          language: language,
          conversationHistory: conversationHistory,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
      setConversationHistory(data.conversationHistory || []);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessages = {
        en: 'Sorry, I encountered an error. Please try again.',
        el: 'Συγγνώμη, αντιμετώπισα ένα σφάλμα. Παρακαλώ δοκιμάστε ξανά.',
        ru: 'Извините, произошла ошибка. Пожалуйста, попробуйте еще раз.',
        de: 'Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.',
        fr: 'Désolé, j’ai rencontré une erreur. Veuillez réessayer.',
      };

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: errorMessages[language],
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 left-4 md:bottom-6 md:left-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full p-4 shadow-2xl hover:scale-110 transition-transform z-50"
        aria-label="Open AI Chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 left-4 right-4 md:bottom-6 md:left-6 md:right-auto w-auto md:w-96 h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col z-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-full p-2">
            <Bot className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold">Kokaa AI Assistant</h3>
            <p className="text-xs opacity-90">{LANGUAGES[language].name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
              aria-label="Change language"
            >
              <Globe className="w-5 h-5" />
            </button>
            {showLanguageMenu && (
              <div className="absolute right-0 top-12 bg-white rounded-lg shadow-xl py-2 min-w-[140px] z-10">
                {Object.entries(LANGUAGES).map(([code, { name, flag }]) => (
                  <button
                    key={code}
                    onClick={() => handleLanguageChange(code as 'en' | 'el' | 'ru' | 'de' | 'fr')}
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
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-2 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.sender === 'bot' ? 'bg-blue-100' : 'bg-purple-100'
              }`}
            >
              {message.sender === 'bot' ? (
                <Bot className="w-5 h-5 text-blue-600" />
              ) : (
                <User className="w-5 h-5 text-purple-600" />
              )}
            </div>
            <div
              className={`max-w-[70%] rounded-2xl p-3 ${
                message.sender === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.text}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-600" />
            </div>
            <div className="bg-gray-100 rounded-2xl p-3">
              <p className="text-sm text-gray-600">{TYPING_MESSAGES[language]}</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isTyping && handleSend()}
            placeholder={
              language === 'en'
                ? 'Type your message...'
                : language === 'el'
                ? 'Γράψτε το μήνυμά σας...'
                : language === 'ru'
                ? 'Введите ваше сообщение...'
                : language === 'de'
                ? 'Geben Sie Ihre Nachricht ein...'
                : 'Tapez votre message...'
            }
            disabled={isTyping}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full p-2 hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
