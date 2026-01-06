/*
  # Analytics Tracking System for Smart Commerce

  1. New Tables
    - `events`
      - Tracks all 7 essential user behaviors (view_deal, click_buy_now, checkout_start, etc.)
      - Links to deals, users, and sessions
      - Stores metadata for flexible analysis
    
    - `unmet_requests`
      - Captures user searches and requests that don't match existing deals
      - Used for vendor demand intelligence
      - Auto-categorizes for market insights
    
    - `deal_metrics`
      - Pre-calculated metrics per deal for performance
      - Stores view rate, click rate, purchase rate
      - Enables Smart Deal Score sorting
  
  2. Security
    - Enable RLS on all tables
    - Authenticated users can insert their own events
    - Admin can view all analytics data
    - Public can insert anonymous events (for non-logged in tracking)
  
  3. Performance
    - Indexes on deal_id, user_id, session_id, timestamp
    - Materialized view for real-time metrics
    - Efficient querying for vendor dashboards
*/

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('view_deal', 'click_buy_now', 'checkout_start', 'complete_purchase', 'add_to_wishlist', 'notify_me', 'conversation_query')),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS unmet_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  category text DEFAULT 'general',
  session_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deal_matched uuid REFERENCES deals(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deal_metrics (
  deal_id uuid PRIMARY KEY REFERENCES deals(id) ON DELETE CASCADE,
  view_count int DEFAULT 0,
  click_count int DEFAULT 0,
  purchase_count int DEFAULT 0,
  wishlist_count int DEFAULT 0,
  notify_count int DEFAULT 0,
  view_rate decimal(5,2) DEFAULT 0,
  click_rate decimal(5,2) DEFAULT 0,
  purchase_rate decimal(5,2) DEFAULT 0,
  smart_score decimal(8,2) DEFAULT 0,
  last_calculated timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_deal_id ON events(deal_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);

CREATE INDEX IF NOT EXISTS idx_unmet_requests_category ON unmet_requests(category);
CREATE INDEX IF NOT EXISTS idx_unmet_requests_created ON unmet_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deal_metrics_smart_score ON deal_metrics(smart_score DESC);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE unmet_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert events"
  ON events FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can view own events"
  ON events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR auth.jwt()->>'role' = 'admin');

CREATE POLICY "Anyone can insert unmet requests"
  ON unmet_requests FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view unmet requests"
  ON unmet_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR auth.jwt()->>'role' = 'admin');

CREATE POLICY "Anyone can view deal metrics"
  ON deal_metrics FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can update deal metrics"
  ON deal_metrics FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' = 'admin');

CREATE OR REPLACE FUNCTION update_deal_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO deal_metrics (deal_id, view_count, click_count, purchase_count, wishlist_count, notify_count)
  SELECT 
    d.id,
    COALESCE(SUM(CASE WHEN e.event_type = 'view_deal' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.event_type = 'click_buy_now' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.event_type = 'complete_purchase' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.event_type = 'add_to_wishlist' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.event_type = 'notify_me' THEN 1 ELSE 0 END), 0)
  FROM deals d
  LEFT JOIN events e ON d.id = e.deal_id
  WHERE d.created_at > NOW() - INTERVAL '30 days'
  GROUP BY d.id
  ON CONFLICT (deal_id) 
  DO UPDATE SET
    view_count = EXCLUDED.view_count,
    click_count = EXCLUDED.click_count,
    purchase_count = EXCLUDED.purchase_count,
    wishlist_count = EXCLUDED.wishlist_count,
    notify_count = EXCLUDED.notify_count,
    view_rate = CASE WHEN EXCLUDED.view_count > 0 THEN (EXCLUDED.click_count::decimal / EXCLUDED.view_count * 100) ELSE 0 END,
    click_rate = CASE WHEN EXCLUDED.click_count > 0 THEN (EXCLUDED.purchase_count::decimal / EXCLUDED.click_count * 100) ELSE 0 END,
    purchase_rate = CASE WHEN EXCLUDED.view_count > 0 THEN (EXCLUDED.purchase_count::decimal / EXCLUDED.view_count * 100) ELSE 0 END,
    smart_score = (
      CASE WHEN EXCLUDED.view_count > 0 THEN (EXCLUDED.click_count::decimal / EXCLUDED.view_count * 100) ELSE 0 END +
      CASE WHEN EXCLUDED.click_count > 0 THEN (EXCLUDED.purchase_count::decimal / EXCLUDED.click_count * 100) ELSE 0 END +
      CASE WHEN EXCLUDED.view_count > 0 THEN (EXCLUDED.purchase_count::decimal / EXCLUDED.view_count * 100) ELSE 0 END
    ),
    last_calculated = NOW(),
    updated_at = NOW();
END;
$$;
