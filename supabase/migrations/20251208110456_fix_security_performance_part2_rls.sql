/*
  # Fix Security and Performance Issues - Part 2
  
  Fix RLS policies to use SELECT wrapper for auth.uid()
  This improves performance by preventing re-evaluation for each row
*/

-- ==================================
-- Payment Orders
-- ==================================

DROP POLICY IF EXISTS "Users can read own payment orders" ON payment_orders;
DROP POLICY IF EXISTS "Users can create own payment orders" ON payment_orders;

CREATE POLICY "Users can read own payment orders"
  ON payment_orders FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own payment orders"
  ON payment_orders FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- ==================================
-- Purchases
-- ==================================

DROP POLICY IF EXISTS "Users can read own purchases" ON purchases;

CREATE POLICY "Users can read own purchases"
  ON purchases FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ==================================
-- Promo Codes
-- ==================================

DROP POLICY IF EXISTS "Admins can manage promo codes" ON promo_codes;

CREATE POLICY "Admins can manage promo codes"
  ON promo_codes
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

-- ==================================
-- Commission Transactions
-- ==================================

DROP POLICY IF EXISTS "Admins can view all commissions" ON commission_transactions;

CREATE POLICY "Admins can view all commissions"
  ON commission_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.role = 'admin'
    )
  );

-- ==================================
-- Vendor Payouts
-- ==================================

DROP POLICY IF EXISTS "Admins can manage payouts" ON vendor_payouts;

CREATE POLICY "Admins can manage payouts"
  ON vendor_payouts
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

-- ==================================
-- Deals
-- ==================================

DROP POLICY IF EXISTS "Admins can manage all deals" ON deals;
DROP POLICY IF EXISTS "Vendors can delete own deals" ON deals;
DROP POLICY IF EXISTS "Vendors can update own deals" ON deals;

CREATE POLICY "Admins can manage all deals"
  ON deals
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

CREATE POLICY "Vendors can delete own deals"
  ON deals FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = vendor_id);

CREATE POLICY "Vendors can update own deals"
  ON deals FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = vendor_id)
  WITH CHECK ((select auth.uid()) = vendor_id);

-- ==================================
-- Events
-- ==================================

DROP POLICY IF EXISTS "Users can view own events" ON events;

CREATE POLICY "Users can view own events"
  ON events FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ==================================
-- 2FA Logs
-- ==================================

DROP POLICY IF EXISTS "Users can view own 2FA logs" ON user_2fa_logs;

CREATE POLICY "Users can view own 2FA logs"
  ON user_2fa_logs FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);