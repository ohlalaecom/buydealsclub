/*
  # Fix Security and Performance Issues

  1. Add Missing Indexes
    - Add indexes for all unindexed foreign keys
    - Improves query performance on joins and lookups

  2. Fix Policy Issues
    - Remove duplicate permissive policies
    - Consolidate policies for better security management

  3. Notes
    - Unused indexes are kept as they'll be used as features are adopted
    - All foreign keys should have covering indexes for optimal performance
*/

-- Add missing indexes for foreign keys

-- Comments table
CREATE INDEX IF NOT EXISTS idx_comments_deal_id ON comments(deal_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- Deal notifications table
CREATE INDEX IF NOT EXISTS idx_deal_notifications_deal_id ON deal_notifications(deal_id);

-- Loyalty transactions table
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_account_id ON loyalty_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_order_id ON loyalty_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_id ON loyalty_transactions(user_id);

-- Newsletter subscribers table
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_user_id ON newsletter_subscribers(user_id);

-- Orders table
CREATE INDEX IF NOT EXISTS idx_orders_deal_id ON orders(deal_id);

-- Wheel spins table
CREATE INDEX IF NOT EXISTS idx_wheel_spins_deal_id ON wheel_spins(deal_id);

-- Fix duplicate permissive policies on user_preferences
-- Drop the redundant "Users can view own preferences" policy since
-- "Users can manage own preferences" already covers SELECT operations

DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;

-- Verify the remaining policy covers all operations correctly
-- The "Users can manage own preferences" policy should handle:
-- SELECT, INSERT, UPDATE, DELETE for the user's own preferences
