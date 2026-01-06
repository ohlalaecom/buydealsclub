import { Mail, Phone, Send } from 'lucide-react';
import { useState } from 'react';
import { emailService } from '../services/emailService';
import { useAuth } from '../contexts/AuthContext';

export function Footer() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setMessage('');

    try {
      const result = await emailService.subscribeToNewsletter(
        email,
        user?.id,
        'footer'
      );

      if (result.success) {
        setMessage('Successfully subscribed! Check your inbox for confirmation.');
        setEmail('');
      } else {
        setMessage(result.error || 'Subscription failed. Please try again.');
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setMessage('Network error. Please check your connection.');
    }

    setLoading(false);
    setTimeout(() => setMessage(''), 5000);
  };

  return (
    <footer className="bg-gray-900 text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-4">
              Buy Deals Club
            </h3>
            <p className="text-gray-400 mb-4">
              Your daily destination for incredible flash sales on unique products.
            </p>
            <p className="text-sm text-gray-500">
              © 2025 Buy Deals Club Ltd. All rights reserved.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-4">Contact Us</h4>
            <div className="space-y-3">
              <a
                href="tel:94601515"
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <Phone className="w-4 h-4" />
                94 60 15 15
              </a>
              <a
                href="mailto:contact@buydealsclub.com"
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <Mail className="w-4 h-4" />
                contact@buydealsclub.com
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-4">Categories</h4>
            <div className="space-y-2 text-gray-400">
              <p>Sport</p>
              <p>Wine</p>
              <p>Cooking</p>
              <p>Kids</p>
              <p>Travel</p>
              <p>Tech</p>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-4">Newsletter</h4>
            <p className="text-gray-400 mb-4 text-sm">
              Get daily deals and exclusive offers delivered to your inbox
            </p>
            <form onSubmit={handleSubscribe} className="space-y-3">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                <Send className="w-4 h-4" />
                {loading ? 'Subscribing...' : 'Subscribe'}
              </button>
              {message && (
                <p className={`text-sm ${message.includes('Success') ? 'text-green-400' : 'text-red-400'}`}>
                  {message}
                </p>
              )}
            </form>
            <p className="text-xs text-gray-500 mt-3">
              We respect your privacy. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
