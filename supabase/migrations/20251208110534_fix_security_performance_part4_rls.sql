/*
  # Fix Security and Performance Issues - Part 4
  
  Final RLS policy fixes for vendor profiles and applications
*/

-- ==================================
-- Vendor Profiles
-- ==================================

DROP POLICY IF EXISTS "Admins can delete vendor profiles" ON vendor_profiles;
DROP POLICY IF EXISTS "Vendors can update own profile" ON vendor_profiles;
DROP POLICY IF EXISTS "Vendors can view own profile" ON vendor_profiles;

CREATE POLICY "Admins can delete vendor profiles"
  ON vendor_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Vendors can update own profile"
  ON vendor_profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Vendors can view own profile"
  ON vendor_profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ==================================
-- Vendor Applications
-- ==================================

DROP POLICY IF EXISTS "Admins can update applications" ON vendor_applications;
DROP POLICY IF EXISTS "Users can view own applications" ON vendor_applications;

CREATE POLICY "Admins can update applications"
  ON vendor_applications FOR UPDATE
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

CREATE POLICY "Users can view own applications"
  ON vendor_applications FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ==================================
-- Customer Deal Requests
-- ==================================

DROP POLICY IF EXISTS "Admins can manage all requests" ON customer_deal_requests;

CREATE POLICY "Admins can manage all requests"
  ON customer_deal_requests
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