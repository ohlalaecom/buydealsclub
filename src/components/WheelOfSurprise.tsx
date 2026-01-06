import { useState, useEffect } from 'react';
import { Gift, X, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface WheelOfSurpriseProps {
  onClose: () => void;
}

const prizes = [
  { label: '5% OFF', discount: 5, color: 'bg-red-500' },
  { label: '10% OFF', discount: 10, color: 'bg-blue-500' },
  { label: '15% OFF', discount: 15, color: 'bg-green-500' },
  { label: '20% OFF', discount: 20, color: 'bg-yellow-500' },
  { label: '25% OFF', discount: 25, color: 'bg-purple-500' },
  { label: '50% OFF', discount: 50, color: 'bg-orange-500' },
];

export function WheelOfSurprise({ onClose }: WheelOfSurpriseProps) {
  const { user } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [hasSpunToday, setHasSpunToday] = useState(false);
  const [wonPrize, setWonPrize] = useState<typeof prizes[0] | null>(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    checkTodaySpin();
  }, [user]);

  const checkTodaySpin = async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('wheel_spins')
      .select('*')
      .eq('user_id', user.id)
      .eq('spin_date', today)
      .maybeSingle();

    if (data) {
      setHasSpunToday(true);
      const prize = prizes.find((p) => p.discount === data.discount_percentage);
      if (prize) {
        setWonPrize(prize);
      }
    }
  };

  const handleSpin = async () => {
    if (!user || spinning || hasSpunToday) return;

    setSpinning(true);
    const prizeIndex = Math.floor(Math.random() * prizes.length);
    const prize = prizes[prizeIndex];

    const spinsNeeded = 5 + prizeIndex;
    const newRotation = rotation + 360 * spinsNeeded + (360 / prizes.length) * prizeIndex;
    setRotation(newRotation);

    setTimeout(async () => {
      setWonPrize(prize);
      setHasSpunToday(true);
      setSpinning(false);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await supabase.from('wheel_spins').insert({
        user_id: user.id,
        spin_date: new Date().toISOString().split('T')[0],
        prize_won: prize.label,
        discount_percentage: prize.discount,
        is_redeemed: false,
        expires_at: expiresAt.toISOString(),
      });
    }, 4000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-8 h-8 text-yellow-500" />
            <h2 className="text-3xl font-bold text-gray-900">Wheel of Surprise</h2>
            <Sparkles className="w-8 h-8 text-yellow-500" />
          </div>
          <p className="text-gray-600">Spin once per day for exclusive discounts!</p>
        </div>

        <div className="relative w-72 h-72 mx-auto mb-6">
          <div
            className="absolute inset-0 rounded-full border-8 border-gray-800 overflow-hidden transition-transform duration-4000 ease-out"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            {prizes.map((prize, index) => (
              <div
                key={index}
                className={`absolute inset-0 ${prize.color}`}
                style={{
                  transform: `rotate(${(360 / prizes.length) * index}deg)`,
                  clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%)',
                  transformOrigin: 'center',
                }}
              >
                <div
                  className="absolute top-8 left-1/2 transform -translate-x-1/2 text-white font-bold text-lg"
                  style={{ transform: 'rotate(30deg)' }}
                >
                  {prize.label}
                </div>
              </div>
            ))}
          </div>

          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-4 z-10">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-16 border-l-transparent border-r-transparent border-t-red-600"></div>
          </div>

          <button
            onClick={handleSpin}
            disabled={spinning || hasSpunToday}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-yellow-400 rounded-full font-bold text-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg z-20 flex items-center justify-center border-4 border-white"
          >
            <Gift className="w-8 h-8 text-white" />
          </button>
        </div>

        {wonPrize && (
          <div className="text-center p-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg">
            <p className="text-2xl font-bold text-white mb-2">Congratulations!</p>
            <p className="text-xl text-white">
              You won <span className="font-black">{wonPrize.label}</span> discount!
            </p>
            <p className="text-sm text-white mt-2 opacity-90">
              Apply this discount on your next purchase
            </p>
          </div>
        )}

        {hasSpunToday && !wonPrize && (
          <div className="text-center p-4 bg-gray-100 rounded-lg">
            <p className="text-gray-700 font-semibold">
              You've already spun today! Come back tomorrow for another chance.
            </p>
          </div>
        )}

        {!hasSpunToday && !wonPrize && (
          <button
            onClick={handleSpin}
            disabled={spinning}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {spinning ? 'Spinning...' : 'SPIN NOW!'}
          </button>
        )}
      </div>
    </div>
  );
}
