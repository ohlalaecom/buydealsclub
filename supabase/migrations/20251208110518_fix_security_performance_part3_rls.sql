/*
  # Fix Security and Performance Issues - Part 3
  
  Continue fixing RLS policies for vendor and admin tables
*/

-- ==================================
-- Deal Metrics
-- ==================================

DROP POLICY IF EXISTS "Admins can manage deal metrics" ON deal_metrics;
DROP POLICY IF EXISTS "View and manage deal metrics" ON deal_metrics;

CREATE POLICY "Admins can manage deal metrics"
  ON deal_metrics
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "View and manage deal metrics"
  ON deal_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND (user_profiles.role = 'admin' OR user_profiles.role = 'vendor')
    )
  );

-- ==================================
-- Unmet Requests
-- ==================================

DROP POLICY IF EXISTS "Authenticated users can view unmet requests" ON unmet_requests;

CREATE POLICY "Authenticated users can view unmet requests"
  ON unmet_requests FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- ==================================
-- Vendor Metrics
-- ==================================

DROP POLICY IF EXISTS "Admin manages vendor metrics" ON vendor_metrics;
DROP POLICY IF EXISTS "Admins can delete vendor metrics" ON vendor_metrics;
DROP POLICY IF EXISTS "Admins can insert vendor metrics" ON vendor_metrics;
DROP POLICY IF EXISTS "Admins can update vendor metrics" ON vendor_metrics;
DROP POLICY IF EXISTS "Vendors and admins can view metrics" ON vendor_metrics;
DROP POLICY IF EXISTS "Vendors view own metrics" ON vendor_metrics;

CREATE POLICY "Admins can manage vendor metrics"
  ON vendor_metrics
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Vendors can view own metrics"
  ON vendor_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND (user_profiles.role = 'vendor' OR user_profiles.role = 'admin')
    )
  );

-- ==================================
-- Vendor Search Insights
-- ==================================

DROP POLICY IF EXISTS "Admin manages search insights" ON vendor_search_insights;
DROP POLICY IF EXISTS "Admins can delete search insights" ON vendor_search_insights;
DROP POLICY IF EXISTS "Admins can insert search insights" ON vendor_search_insights;
DROP POLICY IF EXISTS "Admins can update search insights" ON vendor_search_insights;
DROP POLICY IF EXISTS "Vendors and admins can view search insights" ON vendor_search_insights;
DROP POLICY IF EXISTS "Vendors view own insights" ON vendor_search_insights;

CREATE POLICY "Admins can manage search insights"
  ON vendor_search_insights
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Vendors can view search insights"
  ON vendor_search_insights FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND (user_profiles.role = 'vendor' OR user_profiles.role = 'admin')
    )
  );

-- ==================================
-- Market Demand
-- ==================================

DROP POLICY IF EXISTS "Admin manages market demand" ON market_demand;
DROP POLICY IF EXISTS "Admins can delete market demand" ON market_demand;
DROP POLICY IF EXISTS "Admins can insert market demand" ON market_demand;
DROP POLICY IF EXISTS "Admins can update market demand" ON market_demand;

CREATE POLICY "Admins can manage market demand"
  ON market_demand
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.role = 'admin'
    )
  );