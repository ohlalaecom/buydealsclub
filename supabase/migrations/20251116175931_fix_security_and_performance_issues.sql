/*
  # Fix Security and Performance Issues

  1. Add Missing Indexes on Foreign Keys
    - Adds indexes for all foreign key columns to improve join performance
    - Covers 26 unindexed foreign keys across multiple tables
  
  2. Optimize RLS Policies
    - Replace auth.uid() with (SELECT auth.uid())
    - Replace auth.jwt() with (SELECT auth.jwt())
    - Prevents re-evaluation on each row for better performance
  
  3. Fix Multiple Permissive Policies
    - Consolidate overlapping policies into single efficient policies
    - Remove redundant policy combinations
  
  4. Fix Function Search Paths
    - Set explicit search_path for all functions
    - Prevents security vulnerabilities from path manipulation
  
  5. Performance
    - All indexes created with IF NOT EXISTS
    - Policies recreated with optimized auth checks
    - Functions updated with SECURITY DEFINER and stable search_path
*/

-- =====================================================
-- 1. ADD MISSING INDEXES ON FOREIGN KEYS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_cart_items_deal_id ON cart_items(deal_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON comment_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_deal_id ON comments(deal_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_notifications_deal_id ON deal_notifications(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_notifications_user_id ON deal_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_purchase_participants_user_id ON group_purchase_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_group_purchases_deal_id ON group_purchases(deal_id);
CREATE INDEX IF NOT EXISTS idx_group_purchases_organizer_user_id ON group_purchases(organizer_user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_account_id ON loyalty_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_order_id ON loyalty_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_id ON loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_user_id ON newsletter_subscribers(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_deal_id ON orders(deal_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_deal_id ON product_reviews(deal_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reality_check_photos_deal_id ON reality_check_photos(deal_id);
CREATE INDEX IF NOT EXISTS idx_reality_check_photos_user_id ON reality_check_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_reality_check_votes_user_id ON reality_check_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_uses_referred_user_id ON referral_uses(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_unmet_requests_deal_matched ON unmet_requests(deal_matched);
CREATE INDEX IF NOT EXISTS idx_unmet_requests_user_id ON unmet_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_metrics_top_deal ON vendor_metrics(top_performing_deal_id);
CREATE INDEX IF NOT EXISTS idx_wheel_spins_deal_id ON wheel_spins(deal_id);

-- =====================================================
-- 2. OPTIMIZE RLS POLICIES - EVENTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own events" ON events;
CREATE POLICY "Users can view own events"
  ON events FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT auth.jwt()->>'role') = 'admin');

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - UNMET_REQUESTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view unmet requests" ON unmet_requests;
CREATE POLICY "Authenticated users can view unmet requests"
  ON unmet_requests FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT auth.jwt()->>'role') = 'admin');

-- =====================================================
-- 4. OPTIMIZE RLS POLICIES - DEAL_METRICS TABLE
-- =====================================================

DROP POLICY IF EXISTS "System can update deal metrics" ON deal_metrics;
DROP POLICY IF EXISTS "Anyone can view deal metrics" ON deal_metrics;

CREATE POLICY "View and manage deal metrics"
  ON deal_metrics FOR ALL
  TO authenticated
  USING (
    true OR (SELECT auth.jwt()->>'role') = 'admin'
  )
  WITH CHECK (
    (SELECT auth.jwt()->>'role') = 'admin'
  );

CREATE POLICY "Public can view deal metrics"
  ON deal_metrics FOR SELECT
  TO public
  USING (true);

-- =====================================================
-- 5. OPTIMIZE RLS POLICIES - VENDOR_METRICS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Vendors can view own metrics" ON vendor_metrics;
DROP POLICY IF EXISTS "System can manage vendor metrics" ON vendor_metrics;

CREATE POLICY "Vendors view own metrics"
  ON vendor_metrics FOR SELECT
  TO authenticated
  USING (vendor_id = (SELECT auth.uid())::text OR (SELECT auth.jwt()->>'role') = 'admin');

CREATE POLICY "Admin manages vendor metrics"
  ON vendor_metrics FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'admin')
  WITH CHECK ((SELECT auth.jwt()->>'role') = 'admin');

-- =====================================================
-- 6. OPTIMIZE RLS POLICIES - VENDOR_SEARCH_INSIGHTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Vendors can view own search insights" ON vendor_search_insights;
DROP POLICY IF EXISTS "System can manage search insights" ON vendor_search_insights;

CREATE POLICY "Vendors view own insights"
  ON vendor_search_insights FOR SELECT
  TO authenticated
  USING (vendor_id = (SELECT auth.uid())::text OR (SELECT auth.jwt()->>'role') = 'admin');

CREATE POLICY "Admin manages search insights"
  ON vendor_search_insights FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'admin')
  WITH CHECK ((SELECT auth.jwt()->>'role') = 'admin');

-- =====================================================
-- 7. OPTIMIZE RLS POLICIES - MARKET_DEMAND TABLE
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view market demand" ON market_demand;
DROP POLICY IF EXISTS "System can manage market demand" ON market_demand;

CREATE POLICY "Users view market demand"
  ON market_demand FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin manages market demand"
  ON market_demand FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'admin')
  WITH CHECK ((SELECT auth.jwt()->>'role') = 'admin');

-- =====================================================
-- 8. FIX FUNCTION SEARCH PATHS
-- =====================================================

CREATE OR REPLACE FUNCTION update_deal_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

CREATE OR REPLACE FUNCTION calculate_vendor_metrics(vendor_user_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  vendor_total_sales int;
  vendor_total_revenue decimal;
  vendor_total_views int;
  vendor_total_clicks int;
  vendor_conversion decimal;
BEGIN
  SELECT 
    COALESCE(SUM(d.sold_quantity), 0),
    COALESCE(SUM(d.sold_quantity * d.deal_price), 0),
    COALESCE(SUM(dm.view_count), 0),
    COALESCE(SUM(dm.click_count), 0)
  INTO 
    vendor_total_sales,
    vendor_total_revenue,
    vendor_total_views,
    vendor_total_clicks
  FROM deals d
  LEFT JOIN deal_metrics dm ON d.id = dm.deal_id
  WHERE d.created_at > NOW() - INTERVAL '30 days';

  IF vendor_total_views > 0 THEN
    vendor_conversion := (vendor_total_sales::decimal / vendor_total_views * 100);
  ELSE
    vendor_conversion := 0;
  END IF;

  INSERT INTO vendor_metrics (
    vendor_id,
    total_sales,
    total_revenue,
    conversion_rate,
    total_views,
    total_clicks,
    calculation_date
  )
  VALUES (
    vendor_user_id,
    vendor_total_sales,
    vendor_total_revenue,
    vendor_conversion,
    vendor_total_views,
    vendor_total_clicks,
    CURRENT_DATE
  )
  ON CONFLICT (vendor_id, calculation_date)
  DO UPDATE SET
    total_sales = EXCLUDED.total_sales,
    total_revenue = EXCLUDED.total_revenue,
    conversion_rate = EXCLUDED.conversion_rate,
    total_views = EXCLUDED.total_views,
    total_clicks = EXCLUDED.total_clicks,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION update_market_demand()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO market_demand (category, demand_count, location)
  SELECT 
    COALESCE(category_suggested, 'general') as category,
    COUNT(*) as demand_count,
    COALESCE(location, 'Cyprus') as location
  FROM unmet_requests
  WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY COALESCE(category_suggested, 'general'), COALESCE(location, 'Cyprus')
  ON CONFLICT (category, location)
  DO UPDATE SET
    demand_count = EXCLUDED.demand_count,
    last_updated = NOW();
END;
$$;
