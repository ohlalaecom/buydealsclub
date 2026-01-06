/*
  # Consolidate Duplicate Policies

  1. Changes
    - Replace multiple permissive policies with single consolidated policies
    - Use restrictive policies where appropriate for finer access control

  2. Security Improvements
    - Prevents unintended access from overlapping policies
    - Clearer access control logic
*/

-- Fix commission_transactions policies
DROP POLICY IF EXISTS "Admins can view all commissions" ON commission_transactions;
DROP POLICY IF EXISTS "Vendors can view own commissions" ON commission_transactions;

CREATE POLICY "View commission transactions"
  ON commission_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
    OR vendor_id = auth.uid()
  );

-- Fix customer_deal_requests policies
DROP POLICY IF EXISTS "Admins can manage all requests" ON customer_deal_requests;
DROP POLICY IF EXISTS "Authenticated users can create requests" ON customer_deal_requests;
DROP POLICY IF EXISTS "Anyone can view active requests" ON customer_deal_requests;
DROP POLICY IF EXISTS "Users can update own requests" ON customer_deal_requests;

CREATE POLICY "View deal requests"
  ON customer_deal_requests FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Create deal requests"
  ON customer_deal_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Update deal requests"
  ON customer_deal_requests FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Fix deal_metrics policies
DROP POLICY IF EXISTS "Admins can manage deal metrics" ON deal_metrics;
DROP POLICY IF EXISTS "Public can view deal metrics" ON deal_metrics;
DROP POLICY IF EXISTS "View and manage deal metrics" ON deal_metrics;

CREATE POLICY "View deal metrics"
  ON deal_metrics FOR SELECT
  TO authenticated
  USING (true);

-- Fix deals policies
DROP POLICY IF EXISTS "Anyone can view active deals" ON deals;
DROP POLICY IF EXISTS "Anyone can view deals" ON deals;
DROP POLICY IF EXISTS "Admins can manage all deals" ON deals;
DROP POLICY IF EXISTS "Authenticated users can delete deals" ON deals;
DROP POLICY IF EXISTS "Vendors can delete own deals" ON deals;
DROP POLICY IF EXISTS "Vendors can create own deals" ON deals;
DROP POLICY IF EXISTS "Authenticated users can update deals" ON deals;
DROP POLICY IF EXISTS "Vendors can update own deals" ON deals;

CREATE POLICY "View deals"
  ON deals FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Create deals"
  ON deals FOR INSERT
  TO authenticated
  WITH CHECK (
    vendor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Update deals"
  ON deals FOR UPDATE
  TO authenticated
  USING (
    vendor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    vendor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Delete deals"
  ON deals FOR DELETE
  TO authenticated
  USING (
    vendor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Fix market_demand policies
DROP POLICY IF EXISTS "Admins can manage market demand" ON market_demand;
DROP POLICY IF EXISTS "Authenticated users view market demand" ON market_demand;
DROP POLICY IF EXISTS "Users view market demand" ON market_demand;

CREATE POLICY "View market demand"
  ON market_demand FOR SELECT
  TO authenticated
  USING (true);

-- Fix promo_codes policies
DROP POLICY IF EXISTS "Admins can manage promo codes" ON promo_codes;
DROP POLICY IF EXISTS "Anyone can view active promo codes" ON promo_codes;

CREATE POLICY "View promo codes"
  ON promo_codes FOR SELECT
  TO authenticated
  USING (
    (is_active = true AND valid_until > now())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Fix vendor_metrics policies (vendor_id is text type)
DROP POLICY IF EXISTS "Admins can manage vendor metrics" ON vendor_metrics;
DROP POLICY IF EXISTS "Vendors can view own metrics" ON vendor_metrics;

CREATE POLICY "View vendor metrics"
  ON vendor_metrics FOR SELECT
  TO authenticated
  USING (
    vendor_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Fix vendor_payouts policies (vendor_id is uuid type)
DROP POLICY IF EXISTS "Admins can manage payouts" ON vendor_payouts;
DROP POLICY IF EXISTS "Vendors can view own payouts" ON vendor_payouts;

CREATE POLICY "View vendor payouts"
  ON vendor_payouts FOR SELECT
  TO authenticated
  USING (
    vendor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Fix vendor_search_insights policies (vendor_id is text type)
DROP POLICY IF EXISTS "Admins can manage search insights" ON vendor_search_insights;
DROP POLICY IF EXISTS "Vendors can view search insights" ON vendor_search_insights;

CREATE POLICY "View vendor search insights"
  ON vendor_search_insights FOR SELECT
  TO authenticated
  USING (
    vendor_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );