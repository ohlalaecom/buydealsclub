import { useState, useEffect } from 'react';
import { Lock, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ReserveDealButtonProps {
  dealId: string;
  onReserved?: () => void;
}

export function ReserveDealButton({ dealId, onReserved }: ReserveDealButtonProps) {
  const { user } = useAuth();
  const [isReserved, setIsReserved] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      checkExistingReservation();
    }
  }, [user, dealId]);

  useEffect(() => {
    if (timeLeft && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev && prev > 0) {
            return prev - 1;
          }
          setIsReserved(false);
          return null;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  const checkExistingReservation = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('deal_reservations')
      .select('expires_at')
      .eq('deal_id', dealId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (data) {
      const expiresAt = new Date(data.expires_at);
      const now = new Date();
      const secondsLeft = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);

      if (secondsLeft > 0) {
        setIsReserved(true);
        setTimeLeft(secondsLeft);
      }
    }
  };

  const handleReserve = async () => {
    if (!user) return;

    setLoading(true);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    const { error } = await supabase.from('deal_reservations').insert({
      deal_id: dealId,
      user_id: user.id,
      reserved_quantity: 1,
      status: 'active',
      expires_at: expiresAt.toISOString(),
    });

    if (!error) {
      setIsReserved(true);
      setTimeLeft(600);
      onReserved?.();
    }

    setLoading(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isReserved && timeLeft) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg border-2 border-green-300">
        <Lock className="w-5 h-5" />
        <span className="font-semibold">Reserved for {formatTime(timeLeft)}</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleReserve}
      disabled={loading || !user}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Clock className="w-5 h-5" />
      <span className="font-semibold">Reserve for 10 min</span>
    </button>
  );
}
