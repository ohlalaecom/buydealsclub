import { useState, useEffect } from 'react';
import { Flame, Trophy, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function DealStreak() {
  const { user } = useAuth();
  const [streak, setStreak] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadStreak();
    }
  }, [user]);

  const loadStreak = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('deal_streaks')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setStreak(data);
    } else {
      const { data: newStreak } = await supabase
        .from('deal_streaks')
        .insert({
          user_id: user.id,
          current_streak: 0,
          longest_streak: 0,
        })
        .select()
        .single();

      if (newStreak) {
        setStreak(newStreak);
      }
    }
  };

  if (!user || !streak) return null;

  const getStreakReward = () => {
    if (streak.current_streak >= 7) return 'Unlock Secret Deals!';
    if (streak.current_streak >= 5) return '20% off next purchase';
    if (streak.current_streak >= 3) return '10% off next purchase';
    return 'Keep shopping to unlock rewards!';
  };

  return (
    <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 text-white shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Flame className="w-8 h-8 animate-pulse" />
          <div>
            <h3 className="text-2xl font-bold">{streak.current_streak} Day Streak</h3>
            <p className="text-sm opacity-90">Keep it going!</p>
          </div>
        </div>
        <div className="text-center">
          <Trophy className="w-8 h-8 mx-auto mb-1" />
          <p className="text-xs">Best: {streak.longest_streak}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-2 rounded-full ${
              i < streak.current_streak ? 'bg-white' : 'bg-white bg-opacity-30'
            }`}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 bg-white bg-opacity-20 rounded-lg p-3">
        <Star className="w-5 h-5" />
        <span className="text-sm font-semibold">{getStreakReward()}</span>
      </div>
    </div>
  );
}
