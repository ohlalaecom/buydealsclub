-- =====================================================

-- Add missing indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_comments_deal_id ON comments(deal_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_notifications_deal_id ON deal_notifications(deal_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_account_id ON loyalty_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_order_id ON loyalty_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_id ON loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_user_id ON newsletter_subscribers(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_deal_id ON orders(deal_id);
CREATE INDEX IF NOT EXISTS idx_wheel_spins_deal_id ON wheel_spins(deal_id);

-- Fix duplicate permissive policies on user_preferences
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;


