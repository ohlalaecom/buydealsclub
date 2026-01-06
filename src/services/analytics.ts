import { supabase } from '../lib/supabase';

export type EventType =
  | 'view_deal'
  | 'click_buy_now'
  | 'checkout_start'
  | 'complete_purchase'
  | 'add_to_wishlist'
  | 'notify_me'
  | 'conversation_query';

interface TrackEventParams {
  eventType: EventType;
  dealId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('kokaa_session_id', sessionId);
  }
  return sessionId;
}

export async function trackEvent({
  eventType,
  dealId,
  userId,
  metadata = {}
}: TrackEventParams): Promise<void> {
  try {
    const { error } = await supabase.from('events').insert({
      event_type: eventType,
      deal_id: dealId || null,
      user_id: userId || null,
      session_id: getSessionId(),
      metadata,
      timestamp: new Date().toISOString()
    });

    if (error) {
      console.error('Analytics tracking error:', error);
    }
  } catch (err) {
    console.error('Failed to track event:', err);
  }
}

export async function trackUnmetRequest(
  message: string,
  category?: string
): Promise<void> {
  try {
    const { error } = await supabase.from('unmet_requests').insert({
      message,
      category: category || 'general',
      session_id: getSessionId()
    });

    if (error) {
      console.error('Failed to track unmet request:', error);
    }
  } catch (err) {
    console.error('Failed to track unmet request:', err);
  }
}

export function initializeSession(): void {
  getSessionId();
}
