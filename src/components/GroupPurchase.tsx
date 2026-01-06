import { useState, useEffect } from 'react';
import { Users, Clock, TrendingDown, Share2, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface GroupPurchaseProps {
  dealId: string;
  dealPrice: number;
  dealTitle: string;
}

interface GroupPurchaseData {
  id: string;
  min_participants: number;
  current_participants: number;
  discount_percentage: number;
  expires_at: string;
  status: string;
  organizer_user_id: string;
  participants?: any[];
}

export function GroupPurchase({ dealId, dealPrice, dealTitle }: GroupPurchaseProps) {
  const { user } = useAuth();
  const [groupPurchase, setGroupPurchase] = useState<GroupPurchaseData | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    loadGroupPurchase();
  }, [dealId, user]);

  useEffect(() => {
    if (groupPurchase?.expires_at) {
      const timer = setInterval(() => {
        const now = new Date();
        const expires = new Date(groupPurchase.expires_at);
        const diff = expires.getTime() - now.getTime();

        if (diff <= 0) {
          setTimeLeft('Expired');
          clearInterval(timer);
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          setTimeLeft(`${hours}h ${minutes}m`);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [groupPurchase]);

  const loadGroupPurchase = async () => {
    const { data } = await supabase
      .from('group_purchases')
      .select(`
        *,
        group_purchase_participants(*)
      `)
      .eq('deal_id', dealId)
      .eq('status', 'active')
      .maybeSingle();

    if (data) {
      const participants = data.group_purchase_participants || [];
      setGroupPurchase({
        ...data,
        participants,
        current_participants: participants.length,
      });

      if (user) {
        const userParticipant = participants.find((p: any) => p.user_id === user.id);
        setHasJoined(!!userParticipant);
      }
    }
  };

  const handleCreateGroup = async () => {
    if (!user || loading) return;

    setLoading(true);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { data: newGroup, error } = await supabase
      .from('group_purchases')
      .insert({
        deal_id: dealId,
        organizer_user_id: user.id,
        min_participants: 5,
        discount_percentage: 15,
        status: 'active',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (!error && newGroup) {
      await supabase.from('group_purchase_participants').insert({
        group_purchase_id: newGroup.id,
        user_id: user.id,
      });

      await loadGroupPurchase();
    }

    setLoading(false);
  };

  const handleJoinGroup = async () => {
    if (!user || !groupPurchase || loading || hasJoined) return;

    setLoading(true);

    const { error } = await supabase.from('group_purchase_participants').insert({
      group_purchase_id: groupPurchase.id,
      user_id: user.id,
    });

    if (!error) {
      await loadGroupPurchase();
    }

    setLoading(false);
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}?group=${groupPurchase?.id}`;
    const shareText = `Join my group purchase for ${dealTitle} and save ${groupPurchase?.discount_percentage}%!`;

    if (navigator.share) {
      try {
        await navigator.share({ title: dealTitle, text: shareText, url: shareUrl });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

  if (!groupPurchase) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6 border-2 border-green-200">
        <div className="flex items-start gap-4">
          <div className="bg-green-500 rounded-full p-3">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Group Purchase</h3>
            <p className="text-gray-700 mb-4">
              Team up with others to unlock an extra 15% discount! Start a group and invite friends.
            </p>
            {user ? (
              <button
                onClick={handleCreateGroup}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:from-green-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Start a Group'}
              </button>
            ) : (
              <p className="text-sm text-gray-600 italic">Sign in to start a group purchase</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const progress = (groupPurchase.current_participants / groupPurchase.min_participants) * 100;
  const discountedPrice = dealPrice * (1 - groupPurchase.discount_percentage / 100);
  const isComplete = groupPurchase.current_participants >= groupPurchase.min_participants;

  return (
    <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6 border-2 border-green-300 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-green-500 rounded-full p-2">
            <Users className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Group Purchase Active</h3>
        </div>
        {isComplete && (
          <div className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-full text-sm font-semibold">
            <Check className="w-4 h-4" />
            Goal Reached!
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Participants</span>
            <span className="font-bold text-gray-900">
              {groupPurchase.current_participants} / {groupPurchase.min_participants}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-green-500 to-blue-500 h-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-600 block">Group Price</span>
              <span className="text-2xl font-black text-green-600">
                €{discountedPrice.toFixed(2)}
              </span>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-red-500 font-bold">
                <TrendingDown className="w-5 h-5" />
                {groupPurchase.discount_percentage}% OFF
              </div>
              <span className="text-sm text-gray-500 line-through">€{dealPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 bg-white rounded-lg p-3">
        <div className="flex items-center gap-2 text-gray-700">
          <Clock className="w-5 h-5" />
          <span className="font-semibold">Time Left: {timeLeft}</span>
        </div>
      </div>

      {groupPurchase.participants && groupPurchase.participants.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Participants:</p>
          <div className="flex flex-wrap gap-2">
            {groupPurchase.participants.map((participant: any, idx: number) => (
              <div
                key={participant.id}
                className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm"
                title={`Participant ${idx + 1}`}
              >
                {idx + 1}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {!hasJoined && user && (
          <button
            onClick={handleJoinGroup}
            disabled={loading || groupPurchase.status !== 'active'}
            className="flex-1 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:from-green-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Joining...' : 'Join Group'}
          </button>
        )}

        {hasJoined && (
          <div className="flex-1 py-3 bg-green-100 text-green-800 rounded-lg font-semibold text-center border-2 border-green-300">
            You've Joined!
          </div>
        )}

        <button
          onClick={handleShare}
          className="px-4 py-3 bg-white text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors border-2 border-gray-200 flex items-center gap-2"
        >
          <Share2 className="w-5 h-5" />
          Share
        </button>
      </div>

      {!user && (
        <p className="mt-3 text-sm text-gray-600 text-center italic">
          Sign in to join this group purchase
        </p>
      )}
    </div>
  );
}
